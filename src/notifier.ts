import { bot } from './telegramBot.js';
import { config } from './config/env.js';
import { logger } from './helpers/logger.js';

export const sendNotification = async (message: string): Promise<void> => {
  if (!config.telegramBotToken || !config.telegramChatId) {
    logger.warn('Telegram bot token or chat ID not configured, skipping notification');
    return;
  }

  try {
    await bot.telegram.sendMessage(config.telegramChatId, message, {
      parse_mode: 'HTML',
    });
  } catch (error: any) {
    logger.error(`Failed to send Telegram notification: ${error.message}`);
  }
};
