import axios from 'axios';

export const naverService = {
  async searchBlogs(query) {
    try {
      const response = await axios.get('/naver-api/v1/search/blog.json', {
        params: {
          query: query,
          display: 10,
          sort: 'sim'
        }
      });
      return response.data.items;
    } catch (error) {
      console.error('Naver Search Error:', error);
      return [];
    }
  },

  /**
   * Browserless API를 통한 고도화 수집 (Anti-Blocking 적용)
   */
  async scrapeFullContent(url) {
    try {
      // [Anti-Blocking] 지능형 요청 지연: 1.5초 ~ 3초 사이 랜덤 딜레이
      const delay = Math.floor(Math.random() * 1500) + 1500;
      console.log(`[Anti-Blocking] ${delay}ms 대기 중...`);
      await new Promise(resolve => setTimeout(resolve, delay));

      // [Security] 서버 사이드 API(/api/scrape-naver)를 호출하여 프록시 및 API 키 보안 유지
      const response = await axios.post('/api/scrape-naver', { url });
      
      if (!response.data || !response.data.html) {
        throw new Error('파싱된 데이터가 비어있습니다.');
      }
      
      return response.data.html;
    } catch (error) {
      console.error('[Safe-Fall Indicator] 실시간 데이터 수집 실패:', error.response?.data || error.message);
      // 에러를 던져서 UI에서 Safe-Fall(캐시 로드)이 작동하도록 함
      throw error;
    }
  }
};
