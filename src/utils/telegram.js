import axios from 'axios';

const TELEGRAM_BOT_TOKEN = '8358628620:AAHJgdrn2ZDEdOijz1QDAP3c6SfBBIXLYUI';
const TELEGRAM_CHAT_ID = '1848849300';

export const sendTelegramAlert = async (message) => {
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    await axios.post(url, {
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: 'HTML'
    });
    console.log('Telegram alert sent successfully');
  } catch (error) {
    console.error('Failed to send Telegram alert:', error);
  }
};
