import Airtable from 'airtable';
import dotenv from 'dotenv';
dotenv.config();

// Note: Airtable Metadata API requires a different token or setup, but I can try to guess by listing records from different table names
const base = new Airtable({ apiKey: process.env.VITE_AIRTABLE_API_KEY }).base(process.env.VITE_AIRTABLE_BASE_ID);

async function guessTables() {
  const tables = ['부동산 매물 관리', '온라인매물_수집', '강남구 매물_DB'];
  for (const t of tables) {
    try {
      const records = await base(t).select({ maxRecords: 1 }).firstPage();
      console.log(`Table "${t}" exists. Fields:`, Object.keys(records[0].fields));
    } catch (e) {
      console.log(`Table "${t}" not found or error:`, e.message);
    }
  }
}

guessTables();
