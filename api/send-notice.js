import axios from 'axios';
import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { message, type = 'ATA' } = req.body; // ATA is Alimtalk

  const apiKey = process.env.SOLAPI_API_KEY;
  const apiSecret = process.env.SOLAPI_API_SECRET;
  const pfId = process.env.SOLAPI_PFID;
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

  try {
    const response = await axios.post(
      'https://api.solapi.com/messages/v4/send',
      {
        message: {
          to: receiverPhone,
          from: senderPhone,
          text: message,
          type: type,
          kakaoOptions: {
            pfId: pfId,
            // templateId: 'notice_template', // 알림톡 사용 시 필요
          },
        },
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
