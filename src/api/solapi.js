import axios from 'axios';

export const solapiService = {
  /**
   * 알림톡 또는 SMS 발송
   * @param {Object} data - 발송 데이터 (message, matchRate, address, price 등)
   */
  async sendNotice(data) {
    const { message, matchRate, address, price, type = 'SMS' } = data;
    
    let text = message;
    if (!text && address) {
      text = `[더원에셋 A급 매물 발견]\n매칭률: ${matchRate}%\n주소: ${address}\n예상가: ${price}만원`;
    }

    console.log(`[SOLAPI] 메시지 발송 요청: ${text}`);
    
    try {
      const response = await axios.post('/api/send-notice', {
        message: text,
        type: type // SMS, ATA (알림톡) 등
      });
      console.log('[SOLAPI] 발송 성공:', response.data);
      return response.data;
    } catch (e) {
      console.error('[SOLAPI] 발송 실패:', e.response?.data || e.message);
      throw e;
    }
  },

  // 기존 호환성을 위한 래퍼
  async sendAlimtalk(data) {
    return this.sendNotice({ ...data, type: 'ATA' });
  }
};
