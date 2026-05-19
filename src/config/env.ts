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
}

const getEnv = (key: string, defaultValue?: string): string => {
  const value = process.env[key] || defaultValue;
  if (!value && defaultValue === undefined) {
    throw new Error(`Environment variable ${key} is required`);
  }
  return value || '';
};

export const config: Config = {
  port: parseInt(getEnv('PORT', '3000'), 10),
  nodeEnv: getEnv('NODE_ENV', 'development'),
  apiKey: getEnv('API_KEY'),
  clientCode: getEnv('CLIENT_CODE'),
  clientPin: getEnv('CLIENT_PIN'),
  clientTotpPin: getEnv('CLIENT_TOTP_PIN'),
  paperTrading: getEnv('PAPER_TRADING', 'true') === 'true',
  telegramBotToken: getEnv('TELEGRAM_BOT_TOKEN'),
  telegramChatId: getEnv('TELEGRAM_CHAT_ID'),
};
