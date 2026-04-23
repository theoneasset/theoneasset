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
   * Browserless API를 통한 고도화 수집 (Selenium 대체)
   */
  async scrapeFullContent(url) {
    try {
      // 랜덤 딜레이 시뮬레이션
      const delay = Math.floor(Math.random() * 2000) + 1000;
      await new Promise(resolve => setTimeout(resolve, delay));

      const response = await axios.post('/api/scrape-naver', { url });
      return response.data.html;
    } catch (error) {
      console.error('Advanced Scrape Error:', error);
      return null;
    }
  }
};
