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
  }
};
