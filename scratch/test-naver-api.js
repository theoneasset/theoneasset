import axios from 'axios';

async function testNaverSearch() {
  const clientId = 'f5CnEQLzg4LYE_Y51Abm';
  const clientSecret = 'ekdhtzvBCf';
  const query = '역삼동 부동산';

  try {
    console.log('Testing Naver Search API...');
    const response = await axios.get('https://openapi.naver.com/v1/search/blog.json', {
      params: {
        query: query,
        display: 1
      },
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret
      }
    });

    if (response.data && response.data.items) {
      console.log('✅ Naver Search API is working correctly!');
      console.log('First result title:', response.data.items[0].title);
    } else {
      console.log('❌ Naver Search API returned unexpected response:', response.data);
    }
  } catch (error) {
    console.error('❌ Naver Search API Error:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Data:', error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

testNaverSearch();
