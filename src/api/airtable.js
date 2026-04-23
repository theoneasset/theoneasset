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
  }
};
