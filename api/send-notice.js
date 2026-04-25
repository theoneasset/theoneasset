import axios from 'axios';
import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { message, type = 'ATA', isCard = false, items = [] } = req.body; 

  const apiKey = process.env.SOLAPI_API_KEY;
  const apiSecret = process.env.SOLAPI_API_SECRET;
  const pfId = process.env.VITE_SOLAPI_PFID;
  const senderPhone = process.env.SENDER_PHONE;
  const receiverPhone = process.env.RECEIVER_PHONE;

  if (!apiKey || !apiSecret) {
    return res.status(500).json({ message: 'API Configuration missing' });
  }

  const date = new Date().toISOString();
  const salt = crypto.randomBytes(16).toString('hex');
  const signature = crypto
    .createHmac('sha256', apiSecret)
    .update(date + salt)
    .digest('hex');

  const authorization = `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;

  // 메시지 구성 (카드형일 경우와 아닐 경우 구분)
  const messageObj = {
    to: receiverPhone,
    from: senderPhone,
    type: type,
    kakaoOptions: {
      pfId: pfId
    }
  };

  if (isCard && items.length > 0) {
    // 카드형 친구톡 구성
    messageObj.text = '대표님을 위한 추천 매물 리스트입니다.';
    messageObj.kakaoOptions.carousel = {
      type: 'ITEM_LIST',
      items: items.map(item => ({
        header: item.title,
        message: item.description,
        buttonList: [{
          link: { mobile: item.link, pc: item.link },
          name: '매물 상세보기',
          type: 'WL' // Web Link
        }]
      }))
    };
  } else {
    messageObj.text = message;
  }

  try {
    const response = await axios.post(
      'https://api.solapi.com/messages/v4/send',
      {
        message: messageObj
      },
      {
        headers: {
          Authorization: authorization,
          'Content-Type': 'application/json',
        },
      }
    );

    res.status(200).json(response.data);
  } catch (error) {
    console.error('Solapi Error:', error.response?.data || error.message);
    res.status(500).json({ 
      message: 'Failed to send message', 
      error: error.response?.data || error.message 
    });
  }
}
