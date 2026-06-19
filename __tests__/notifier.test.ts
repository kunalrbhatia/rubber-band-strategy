import { sendNotification } from '../src/notifier.js';
import { bot } from '../src/telegramBot.js';
import { logger } from '../src/helpers/logger.js';
import { config } from '../src/config/env.js';
import axios from 'axios';

jest.mock('../src/telegramBot', () => ({
  bot: {
    telegram: {
      sendMessage: jest.fn(),
    },
  },
}));
jest.mock('../src/helpers/logger');
jest.mock('axios');

describe('Notifier', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Telegram enabled', () => {
    beforeEach(() => {
      config.notifications.telegram.enabled = true;
      config.notifications.slack.enabled = false;
    });

    it('should send notification via Telegram bot', async () => {
      (bot.telegram.sendMessage as jest.Mock).mockResolvedValueOnce({});
      await sendNotification('test message');
      expect(bot.telegram.sendMessage).toHaveBeenCalledWith(
        expect.any(String),
        'test message',
        expect.any(Object),
      );
      expect(axios.post).not.toHaveBeenCalled();
    });

    it('should log error on Telegram failure', async () => {
      (bot.telegram.sendMessage as jest.Mock).mockRejectedValueOnce(new Error('api error'));
      await sendNotification('test message');
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('api error'));
    });

    it('should not send if Telegram bot token or chat ID is missing', async () => {
      const originalToken = config.telegramBotToken;
      (config as any).telegramBotToken = '';
      await sendNotification('test message');
      expect(bot.telegram.sendMessage).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Telegram bot token or chat ID not configured'),
      );
      (config as any).telegramBotToken = originalToken;
    });
  });

  describe('Slack enabled', () => {
    beforeEach(() => {
      config.notifications.telegram.enabled = false;
      config.notifications.slack.enabled = true;
      config.notifications.slack.webhookUrl = 'https://hooks.slack.com/services/test';
    });

    it('should send notification via Slack webhooks and format HTML to markdown', async () => {
      (axios.post as jest.Mock).mockResolvedValueOnce({});
      await sendNotification('<b>Bold</b> and <i>Italic</i> and <pre>code</pre>');
      expect(axios.post).toHaveBeenCalledWith('https://hooks.slack.com/services/test', {
        text: '*Bold* and _Italic_ and ```code```',
      });
      expect(bot.telegram.sendMessage).not.toHaveBeenCalled();
    });

    it('should log error on Slack failure', async () => {
      (axios.post as jest.Mock).mockRejectedValueOnce(new Error('slack api error'));
      await sendNotification('test message');
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('slack api error'));
    });

    it('should not send if webhook url is missing', async () => {
      config.notifications.slack.webhookUrl = '';
      await sendNotification('test message');
      expect(axios.post).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Slack webhook URL not configured'),
      );
    });
  });

  describe('No notification channel enabled', () => {
    beforeEach(() => {
      config.notifications.telegram.enabled = false;
      config.notifications.slack.enabled = false;
    });

    it('should log a warning and send nothing', async () => {
      await sendNotification('test message');
      expect(bot.telegram.sendMessage).not.toHaveBeenCalled();
      expect(axios.post).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('No notification channel enabled'),
      );
    });
  });
});
