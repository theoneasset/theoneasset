import Airtable from 'airtable';
import dotenv from 'dotenv';
dotenv.config();

const base = new Airtable({ apiKey: process.env.VITE_AIRTABLE_API_KEY }).base(process.env.VITE_AIRTABLE_BASE_ID);
const tableId = process.env.VITE_AIRTABLE_TABLE_ID;

async function testSave() {
  console.log('Testing save to table:', tableId);
  try {
    const record = await base(tableId).create([
      {
        fields: {
          '지번주소': '서울특별시 강남구 역삼동 테스트-123',
          '건물명': '안티그라비티 테스트 빌딩',
          '임대': 50000000,
          '월세': 3500000,
          'AI점수': 99,
          'AI분석': '시스템 연결 테스트 성공. 필드가 정확히 일치합니다.',
          '원문': 'https://google.com',
          '수정일': new Date().toISOString().split('T')[0]
        }
      }
    ]);
    console.log('Save successful! Record ID:', record[0].id);
  } catch (error) {
    console.error('Save failed. Check field names:', error.message);
  }
}

testSave();
