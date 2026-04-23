import Airtable from 'airtable';

const base = new Airtable({ apiKey: import.meta.env.VITE_AIRTABLE_API_KEY }).base(
  import.meta.env.VITE_AIRTABLE_BASE_ID
);

export const airtableService = {
  async getMasterBuildings() {
    try {
      const records = await base('BUILDINGS').select({
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
      // 기존 캐시 삭제 로직 (선택 사항: 업데이트 대신 새로 생성)
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
  }
};
