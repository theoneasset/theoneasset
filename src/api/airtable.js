import Airtable from 'airtable';

const airtableKey = import.meta.env.VITE_AIRTABLE_API_KEY || '';
const apiKey = airtableKey.trim();

const base = new Airtable({ apiKey }).base(
  import.meta.env.VITE_AIRTABLE_BASE_ID
);

export const airtableService = {
  async getMasterBuildings() {
    try {
      // 사용자가 지정한 테이블 ID (강남구 매물_DB 등) 사용
      const tableId = import.meta.env.VITE_AIRTABLE_TABLE_ID || 'BUILDINGS';
      const records = await base(tableId).select({
        view: 'Grid view'
      }).all();
      return records.map(record => ({
        id: record.id,
        ...record.fields
      }));
    } catch (error) {
      console.error('Airtable Error:', error);
      return [];
    }
  },

  async saveMatchResult(data) {
    try {
      return await base('MATCH_RESULTS').create([
        {
          fields: {
            ...data,
            '수집일자': new Date().toISOString().split('T')[0]
          }
        }
      ]);
    } catch (error) {
      console.error('Airtable Save Error:', error);
    }
  },

  async getPriceHistory(address) {
    try {
      const records = await base('PRICE_HISTORY').select({
        filterByFormula: `{주소} = '${address}'`,
        sort: [{ field: '날짜', direction: 'asc' }]
      }).all();
      return records.map(record => ({
        date: record.fields.날짜,
        price: record.fields.가격
      }));
    } catch (error) {
      console.error('Airtable History Error:', error);
      return [];
    }
  },

  // 건물 상세 정보 캐싱 조회 (Safe-Fall 지원)
  async getBuildingCache(address, ignoreExpiration = false) {
    try {
      const records = await base('BUILDING_CACHE').select({
        filterByFormula: `{주소} = '${address}'`,
        maxRecords: 1
      }).firstPage();

      if (records.length > 0) {
        const data = records[0].fields;
        const lastUpdated = new Date(data.수집일자);
        const now = new Date();
        const diffDays = Math.ceil(Math.abs(now - lastUpdated) / (1000 * 60 * 60 * 24));
        
        // ignoreExpiration이 true면 날짜 상관없이 반환 (파싱 실패 시 백업용)
        if (ignoreExpiration || diffDays <= 7) {
          return JSON.parse(data.상세데이터);
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
      await base('BUILDING_CACHE').create([
        {
          fields: {
            '주소': address,
            '상세데이터': JSON.stringify(detailData),
            '수집일자': new Date().toISOString()
          }
        }
      ]);
    } catch (error) {
      console.error('Cache Save Error:', error);
    }
  },

  // 건물 마스터 DB 동기화 (중복 방지)
  async syncBuildingToMaster(address, specs) {
    try {
      const existing = await base('BUILDINGS').select({
        filterByFormula: `{주소} = '${address}'`,
        maxRecords: 1
      }).firstPage();

      if (existing.length > 0) {
        return existing[0].id;
      }

      const record = await base('BUILDINGS').create([
        {
          fields: {
            '주소': address,
            '건물명': specs.건물명 || '',
            '연면적': specs.연면적 || '',
            '주차': specs.주차 || '',
            '승강기': specs.승강기 || '',
            '등록일자': new Date().toISOString().split('T')[0]
          }
        }
      ]);
      return record[0].id;
    } catch (error) {
      console.error('Airtable Sync Error:', error);
    }
  }
};
