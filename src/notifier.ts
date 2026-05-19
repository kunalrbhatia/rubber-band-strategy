import axios from 'axios';
import { config } from './config/env.js';
import { logger } from './helpers/logger.js';

export const sendNotification = async (message: string): Promise<void> => {
  if (!config.telegramBotToken || !config.telegramChatId) {
    logger.warn('Telegram bot token or chat ID not configured, skipping notification');
    return;
  }

  const url = `https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`;
  try {
    await axios.post(url, {
      chat_id: config.telegramChatId,
      text: message,
      parse_mode: 'HTML',
    });
  } catch (error: any) {
    logger.error(`Failed to send Telegram notification: ${error.message}`);
  }
};
