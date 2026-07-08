import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export interface Config {
  port: number;
  nodeEnv: string;
  apiKey: string;
  clientCode: string;
  clientPin: string;
  clientTotpPin: string;
  paperTrading: boolean;
  telegramBotToken: string;
  telegramChatId: string;
  slackSigningSecret: string;
  notifications: {
    telegram: {
      enabled: boolean;
      token: string;
      chatId: string;
    };
    slack: {
      enabled: boolean;
      webhookUrl: string;
    };
  };
}

const getEnv = (key: string, defaultValue?: string): string => {
  const value = process.env[key] || defaultValue;
  if (!value && defaultValue === undefined) {
    throw new Error(`Environment variable ${key} is required`);
  }
  return value || '';
};

const useTelegram = getEnv('USE_TELEGRAM', 'false') === 'true';
const useSlack = getEnv('USE_SLACK', 'false') === 'true';

// Priority enforcement: Disable Slack if Telegram is enabled
const telegramEnabled = useTelegram;
const slackEnabled = telegramEnabled ? false : useSlack;

const telegramBotToken = getEnv('TELEGRAM_BOT_TOKEN', telegramEnabled ? undefined : '');
const telegramChatId = getEnv('TELEGRAM_CHAT_ID', telegramEnabled ? undefined : '');
const slackWebhookUrl = getEnv('SLACK_WEBHOOK_URL', slackEnabled ? undefined : '');
const slackSigningSecret = getEnv('SLACK_SIGNING_SECRET', '');

export const config: Config = {
  port: parseInt(getEnv('PORT', '3000'), 10),
  nodeEnv: getEnv('NODE_ENV', 'development'),
  apiKey: getEnv('API_KEY'),
  clientCode: getEnv('CLIENT_CODE'),
  clientPin: getEnv('CLIENT_PIN'),
  clientTotpPin: getEnv('CLIENT_TOTP_PIN'),
  paperTrading: fs.existsSync(path.join(process.cwd(), '.paper')),
  telegramBotToken,
  telegramChatId,
  slackSigningSecret,
  notifications: {
    telegram: {
      enabled: telegramEnabled,
      token: telegramBotToken,
      chatId: telegramChatId,
    },
    slack: {
      enabled: slackEnabled,
      webhookUrl: slackWebhookUrl,
    },
  },
};
