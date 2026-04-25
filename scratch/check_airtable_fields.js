import Airtable from 'airtable';
import dotenv from 'dotenv';
dotenv.config();

const base = new Airtable({ apiKey: process.env.VITE_AIRTABLE_API_KEY }).base(process.env.VITE_AIRTABLE_BASE_ID);
const tableId = process.env.VITE_AIRTABLE_TABLE_ID;

async function checkFields() {
  try {
    const records = await base(tableId).select({ maxRecords: 1 }).firstPage();
    if (records.length > 0) {
      console.log('Available fields in first record:', Object.keys(records[0].fields));
    } else {
      console.log('No records found to check fields.');
    }
  } catch (error) {
    console.error('Error checking fields:', error.message);
  }
}

checkFields();
