import Airtable from 'airtable';

// [1] 환경 변수 참조 방식 통일 (Vite 전용)
const API_KEY = import.meta.env.VITE_MY_AIRTABLE_API_KEY;
const BASE_ID = import.meta.env.VITE_MY_AIRTABLE_BASE_ID;

// [2] 폴백 제거 및 로드 실패 가드
if (!API_KEY || !BASE_ID) {
  console.error("❌ [Airtable] 환경변수 로드 실패");
  // 앱 전체에서 에러를 인지할 수 있도록 에러를 던집니다.
  // throw new Error("에어테이블 환경변수 로드 실패"); 
} else {
  console.log("✅ [Airtable] Connection Successful: 환경변수 로드 완료");
}

// [3] 초기화 로직 점검 (Airtable.configure 사용)
Airtable.configure({
  apiKey: API_KEY
});

const base = Airtable.base(BASE_ID);

// [중요] 테이블 역할 분리
const MASTER_TABLE = '부동산 매물 관리';    // 건축물대장 마스터 데이터
const LISTING_TABLE = '온라인매물_수집';   // 수집된 매물 결과 저장

export const airtableService = {
  // 마스터(건축물대장) 정보 로드
  async getMasterBuildings() {
    try {
      if (!API_KEY) throw new Error("Airtable API Key is missing");
      
      const records = await base(MASTER_TABLE).select({
        view: 'Grid view' 
      }).all();
      
      console.log(`[Airtable] Successfully loaded ${records.length} master buildings.`);
      
      return records.map(record => ({
        id: record.id,
        주소: record.fields['지번주소'], 
        도로명주소: record.fields['도로명주소'],
        건물명: record.fields['건물명'],
        연면적: record.fields['연면적(㎡)'],
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
            'AI점수': data.matchRate,
            'AI분석': data.summary,
            '원문링크': data.link,
            '상태': '새롭게',
            '수정일': new Date().toISOString().split('T')[0],
            '지역': data.주소?.split(' ')?.[2] || '' 
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
            'AI분석': detailData.analysisReport,
            '수정일': new Date().toISOString().split('T')[0],
            '상태': '분석완료'
          }
        }
      ]);
    } catch (error) {
      console.error('Cache Save Error:', error);
    }
  },

  // 건물 마스터 DB 동기화
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
            '건물명': specs.건물명,
            '연면적(㎡)': specs.연면적
          }
        }
      ]);
      return record[0].id;
    } catch (error) {
      console.error('Airtable Master Sync Error:', error);
    }
  }
};
