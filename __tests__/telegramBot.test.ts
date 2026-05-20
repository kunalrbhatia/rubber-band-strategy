import { startBot, bot } from '../src/telegramBot.js';
import { config } from '../src/config/env.js';
import { logger } from '../src/helpers/logger.js';

jest.mock('../src/config/env.js', () => ({
  config: {
    telegramBotToken: 'test_token',
    telegramChatId: 'test_chat'
  }
}));
jest.mock('../src/helpers/logger.js');
jest.mock('telegraf', () => {
  return {
    Telegraf: jest.fn().mockImplementation(() => ({
      launch: jest.fn(),
      stop: jest.fn(),
      use: jest.fn(),
      command: jest.fn(),
      on: jest.fn(),
      telegram: { sendMessage: jest.fn() }
    }))
  };
});

describe('Telegram Bot startBot', () => {
  it('should launch the bot if token is present', async () => {
    await startBot();
    expect(bot.launch).toHaveBeenCalled();
  });

  it('should not launch if token is missing', async () => {
    config.telegramBotToken = '';
    (bot.launch as jest.Mock).mockClear();
    await startBot();
    expect(bot.launch).not.toHaveBeenCalled();
  });
});
