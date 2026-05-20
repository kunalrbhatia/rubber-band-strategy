import { sendNotification } from '../src/notifier.js';
import { bot } from '../src/telegramBot.js';
import { logger } from '../src/helpers/logger.js';

jest.mock('../src/telegramBot', () => ({
  bot: {
    telegram: {
      sendMessage: jest.fn(),
    },
  },
}));
jest.mock('../src/helpers/logger');

describe('Notifier', () => {
  it('should send notification via Telegram bot', async () => {
    (bot.telegram.sendMessage as jest.Mock).mockResolvedValueOnce({});
    await sendNotification('test message');
    expect(bot.telegram.sendMessage).toHaveBeenCalledWith(
      expect.any(String),
      'test message',
      expect.any(Object)
    );
  });

  it('should log error on failure', async () => {
    (bot.telegram.sendMessage as jest.Mock).mockRejectedValueOnce(new Error('api error'));
    await sendNotification('test message');
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('api error'));
  });
});
