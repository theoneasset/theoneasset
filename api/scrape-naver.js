import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { url } = req.body;
  const browserlessKey = process.env.BROWSERLESS_API_KEY;
  const proxyUrl = process.env.PROXY_URL;

  if (!url) {
    return res.status(400).json({ message: 'URL is required' });
  }

  try {
    // Browserless.io /content API call
    // 이 API는 브라우저를 실행하고 페이지의 HTML 내용을 반환합니다.
    const response = await axios.post(`https://chrome.browserless.io/content?token=${browserlessKey}`, {
      url: url,
      // 차단을 피하기 위한 헤드리스 설정 및 랜덤 딜레이 시뮬레이션
      config: {
        proxy: proxyUrl,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        headless: true
      },
      // 셀레니움/플레이라이트처럼 실제 브라우저 동작 모사 (Wait for selector)
      waitFor: '.content_area', // 네이버 블로그 본문 영역 등
      timeout: 30000
    });

    res.status(200).json({ html: response.data });
  } catch (error) {
    console.error('Scraping Error:', error.response?.data || error.message);
    res.status(500).json({ message: 'Scraping failed', error: error.message });
  }
}
