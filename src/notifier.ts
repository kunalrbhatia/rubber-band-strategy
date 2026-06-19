import axios from 'axios';
import { bot } from './telegramBot.js';
import { config } from './config/env.js';
import { logger } from './helpers/logger.js';

export const sendSlack = async (message: string): Promise<void> => {
  if (!config.notifications.slack.webhookUrl) {
    logger.warn('Slack webhook URL not configured, skipping Slack notification');
    return;
  }

  try {
    const slackMessage = toSlackMrkdwn(message);
    await axios.post(config.notifications.slack.webhookUrl, {
      text: slackMessage,
    });
  } catch (error: any) {
    logger.error(`Failed to send Slack notification: ${error.message}`);
  }
};

export const sendTelegram = async (message: string): Promise<void> => {
  if (!config.telegramBotToken || !config.telegramChatId) {
    logger.warn('Telegram bot token or chat ID not configured, skipping Telegram notification');
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

export const sendNotification = async (message: string): Promise<void> => {
  if (config.notifications.telegram.enabled) {
    return sendTelegram(message);
  }
  if (config.notifications.slack.enabled) {
    return sendSlack(message);
  }
  logger.warn('No notification channel enabled, message not sent.');
};

function toSlackMrkdwn(html: string): string {
  return html
    .replace(/<b>(.*?)<\/b>/gi, '*$1*')
    .replace(/<i>(.*?)<\/i>/gi, '_$1_')
    .replace(/<code>(.*?)<\/code>/gi, '`$1`')
    .replace(/<pre>(.*?)<\/pre>/gi, '```$1```')
    .replace(/<[^>]*>/g, '');
}
