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
  },

  /**
   * 웰컴 메시지: 상위 3개 매물을 카드 형태로 발송
   * @param {Array} topMatches - 카드에 담을 매물 데이터 리스트
   */
  async sendWelcomePropertyCards(topMatches) {
    if (!topMatches || topMatches.length === 0) return;

    console.log(`[SOLAPI] 웰컴 카드 메시지 발송 준비 (매물 ${topMatches.length}개)`);
    
    try {
      const response = await axios.post('/api/send-notice', {
        type: 'FT', // 친구톡
        isCard: true,
        items: topMatches.slice(0, 3).map(m => ({
          title: m.건물명 || '추천 매물',
          description: `${m.주소}\n가격: ${m.가격}만원 / 면적: ${m.전용면적}m²`,
          link: `${window.location.origin}/detail/${m.id}`
        }))
      });
      console.log('[SOLAPI] 카드 메시지 발송 성공');
      return response.data;
    } catch (e) {
      console.error('[SOLAPI] 카드 메시지 발송 실패:', e.message);
      throw e;
    }
  }
};
