import axios from 'axios';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

async function sendTestMessage() {
  const apiKey = process.env.SOLAPI_API_KEY;
  const apiSecret = process.env.SOLAPI_API_SECRET;
  const pfId = process.env.SOLAPI_PFID;
  const senderPhone = process.env.SENDER_PHONE;
  const receiverPhone = process.env.RECEIVER_PHONE;

  if (!apiKey || !apiSecret) {
    console.error('API 키가 설정되지 않았습니다. .env 파일을 확인해주세요.');
    return;
  }

  const date = new Date().toISOString();
  const salt = crypto.randomBytes(16).toString('hex');
  const signature = crypto
    .createHmac('sha256', apiSecret)
    .update(date + salt)
    .digest('hex');

  const authorization = `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;

  const message = '더원에셋 Intelligence Tracker 연동 성공! 이제부터 90% 매칭 매물을 추적합니다.';

  console.log('메시지 발송 시도 중...');
  console.log(`수신번호: ${receiverPhone}`);

  try {
    const response = await axios.post(
      'https://api.solapi.com/messages/v4/send',
      {
        message: {
          to: receiverPhone,
          from: senderPhone,
          text: message,
          type: 'SMS'
        },
      },
      {
        headers: {
          Authorization: authorization,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('발송 결과:', JSON.stringify(response.data, null, 2));
    if (response.data.messageId) {
      console.log('✅ 테스트 메시지 발송 성공!');
    }
  } catch (error) {
    console.error('❌ 발송 실패:', error.response?.data || error.message);
  }
}

sendTestMessage();
