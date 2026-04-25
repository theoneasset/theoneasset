import Airtable from 'airtable';

const airtableKey = import.meta.env.VITE_AIRTABLE_API_KEY || '';
const apiKey = airtableKey.trim();

const base = new Airtable({ apiKey }).base(
  import.meta.env.VITE_AIRTABLE_BASE_ID
);

// [중요] 테이블 역할 분리
const MASTER_TABLE = '부동산 매물 관리';    // 건축물대장 마스터 데이터
const LISTING_TABLE = '온라인매물_수집';   // 수집된 매물 결과 저장

export const airtableService = {
  // 마스터(건축물대장) 정보 로드
  async getMasterBuildings() {
    try {
      const records = await base(MASTER_TABLE).select({
        view: 'Grid view' 
      }).all();
      return records.map(record => ({
        id: record.id,
        주소: record.fields['지번주소'], 
        도로명주소: record.fields['도로명주소'],
        건물명: record.fields['건물명'] || '',
        연면적: record.fields['연면적(㎡)'] || 0,
        ...record.fields
      }));
    } catch (error) {
      console.error('Airtable Master Load Error:', error);
      return [];
    }
  },

  // 매칭 결과를 수집 테이블에 저장
  async saveMatchResult(data) {
    try {
      return await base(LISTING_TABLE).create([
        {
          fields: {
            '주소': data.주소,
            'AI점수': data.matchRate || 0,
            'AI분석': data.summary || '',
            '원문링크': data.link || '',
            '상태': '새롭게',
            '수정일': new Date().toISOString().split('T')[0],
            '지역': data.주소?.split(' ')?.[2] || '' // '역삼동' 등 자동 추출
          }
        }
      ]);
    } catch (error) {
      console.error('Airtable Listing Save Error:', error);
    }
  },

  async getPriceHistory(address) {
    try {
      const records = await base(LISTING_TABLE).select({
        filterByFormula: `{주소} = '${address}'`,
        sort: [{ field: '수정일', direction: 'asc' }]
      }).all();
      return records.map(record => ({
        date: record.fields['수정일'],
        price: record.fields['임대'] || 0
      }));
    } catch (error) {
      console.error('Airtable History Error:', error);
      return [];
    }
  },

  // 건물 상세 정보 캐싱 조회
  async getBuildingCache(address, ignoreExpiration = false) {
    try {
      const records = await base(LISTING_TABLE).select({
        filterByFormula: `{주소} = '${address}'`,
        maxRecords: 1
      }).firstPage();

      if (records.length > 0) {
        const data = records[0].fields;
        if (!data['AI분석']) return null; 

        const lastUpdated = new Date(data['수정일'] || new Date());
        const now = new Date();
        const diffDays = Math.ceil(Math.abs(now - lastUpdated) / (1000 * 60 * 60 * 24));
        
        if (ignoreExpiration || diffDays <= 7) {
          try {
            return JSON.parse(data['상세데이터'] || '{}');
          } catch(e) {
            return { analysisReport: data['AI분석'] };
          }
        }
      }
      return null;
    } catch (error) {
      console.error('Cache Retrieval Error:', error);
      return null;
    }
  },

  // 건물 상세 정보 캐싱 저장
  async saveBuildingCache(address, detailData) {
    try {
      await base(LISTING_TABLE).create([
        {
          fields: {
            '주소': address,
            '상세데이터': JSON.stringify(detailData),
            'AI분석': detailData.analysisReport || '',
            '수정일': new Date().toISOString().split('T')[0],
            '상태': '분석완료'
          }
        }
      ]);
    } catch (error) {
      console.error('Cache Save Error:', error);
    }
  },

  // 건물 마스터 DB 동기화 (마스터 테이블에 직접 기록)
  async syncBuildingToMaster(address, specs) {
    try {
      const existing = await base(MASTER_TABLE).select({
        filterByFormula: `OR({지번주소} = '${address}', {도로명주소} = '${address}')`,
        maxRecords: 1
      }).firstPage();

      if (existing.length > 0) {
        return existing[0].id;
      }

      const record = await base(MASTER_TABLE).create([
        {
          fields: {
            '지번주소': address,
            '건물명': specs.건물명 || '',
            '연면적(㎡)': specs.연면적 || 0
          }
        }
      ]);
      return record[0].id;
    } catch (error) {
      console.error('Airtable Master Sync Error:', error);
    }
  }
};
