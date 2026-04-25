import axios from 'axios';

export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // URL에서 /api/naver-search/ 이후의 경로 추출 및 쿼리 스트링 제거
  // 예: /api/naver-search/v1/search/blog.json?query=... -> v1/search/blog.json
  const urlWithoutQuery = req.url.split('?')[0];
  const path = urlWithoutQuery.replace(/^\/api\/naver-search/, '').replace(/^\//, '');
  const naverUrl = `https://openapi.naver.com/${path}`;

  try {
    const response = await axios({
      method: req.method,
      url: naverUrl,
      params: req.query,
      data: req.body,
      headers: {
        'X-Naver-Client-Id': process.env.VITE_NAVER_SEARCH_CLIENT_ID,
        'X-Naver-Client-Secret': process.env.VITE_NAVER_SEARCH_CLIENT_SECRET,
      },
    });

    res.status(200).json(response.data);
  } catch (error) {
    console.error('Naver API Proxy Error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json(error.response?.data || { message: 'Internal Server Error' });
  }
}
