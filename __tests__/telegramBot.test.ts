import { startBot, bot } from '../src/telegramBot.js';
import { config } from '../src/config/env.js';
import { appStateStore } from '../src/store/appStateStore.js';
import { tradeStore } from '../src/store/tradeStore.js';
import { loadScripMaster } from '../src/helpers/scripMasterCache.js';
import { getCandles } from '../src/helpers/marketData.js';
import { calculateRsi } from '../src/helpers/rsi.js';
import fs from 'fs/promises';

const mockCommands: Record<string, any> = ((global as any).__mockCommands = (global as any).__mockCommands || {});
const getMockOnHandler = (): any => (global as any).__mockOnHandler;
const getMockMiddleware = (): any => (global as any).__mockMiddleware;

jest.mock('../src/config/env.js', () => ({
  config: {
    telegramBotToken: 'test_token',
    telegramChatId: 'test_chat',
  },
}));

jest.mock('../src/helpers/logger.js');
jest.mock('../src/store/appStateStore.js', () => ({
  appStateStore: {
    isKillSwitchActive: false,
    setKillSwitch: jest.fn(),
    isManualMode: false,
    setManualMode: jest.fn(),
    isPaperTrading: false,
    setPaperTrading: jest.fn(),
    pendingTrade: null,
    setPendingTrade: jest.fn(),
    clearPendingTrade: jest.fn(),
  },
}));

jest.mock('../src/store/tradeStore.js', () => ({
  tradeStore: {
    activeTrade: null,
    dailySLHit: false,
    getMtm: jest.fn().mockReturnValue(0),
    hasActiveTrade: jest.fn().mockReturnValue(false),
    setActiveTrade: jest.fn(),
  },
}));

jest.mock('../src/helpers/scripMasterCache.js', () => ({
  loadScripMaster: jest.fn(),
}));

jest.mock('../src/helpers/marketData.js', () => ({
  getCandles: jest.fn(),
}));

jest.mock('../src/helpers/rsi.js', () => ({
  calculateRsi: jest.fn(),
}));

jest.mock('fs/promises', () => ({
  default: {
    readFile: jest.fn(),
  },
  readFile: jest.fn(),
}));

jest.mock('telegraf', () => {
  return {
    Telegraf: jest.fn().mockImplementation(() => ({
      launch: jest.fn(),
      stop: jest.fn(),
      use: jest.fn().mockImplementation((cb) => {
        (global as any).__mockMiddleware = cb;
      }),
      command: jest.fn().mockImplementation((cmd, cb) => {
        (global as any).__mockCommands = (global as any).__mockCommands || {};
        (global as any).__mockCommands[cmd] = cb;
      }),
      on: jest.fn().mockImplementation((event, cb) => {
        if (event === 'text') {
          (global as any).__mockOnHandler = cb;
        }
      }),
      telegram: { sendMessage: jest.fn() },
    })),
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

describe('Telegram Bot Commands', () => {
  let mockCtx: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCtx = {
      chat: { id: 'test_chat' },
      reply: jest.fn(),
      replyWithHTML: jest.fn(),
      message: { text: '' },
    };
  });

  describe('Middleware', () => {
    it('should allow access if chat ID matches', async () => {
      const next = jest.fn();
      await getMockMiddleware()(mockCtx, next);
      expect(next).toHaveBeenCalled();
      expect(mockCtx.reply).not.toHaveBeenCalled();
    });

    it('should block access if chat ID does not match', async () => {
      const next = jest.fn();
      mockCtx.chat.id = 'unauthorized_chat';
      await getMockMiddleware()(mockCtx, next);
      expect(next).not.toHaveBeenCalled();
      expect(mockCtx.reply).toHaveBeenCalledWith('Unauthorized.');
    });
  });

  describe('/kill command', () => {
    it('should toggle kill switch active state to true', async () => {
      (appStateStore as any).isKillSwitchActive = false;
      await mockCommands.kill(mockCtx);
      expect(appStateStore.setKillSwitch).toHaveBeenCalledWith(true);
      expect(mockCtx.reply).toHaveBeenCalledWith('💀 Kill Switch ACTIVATED. Algo stopped.');
    });

    it('should toggle kill switch active state to false', async () => {
      (appStateStore as any).isKillSwitchActive = true;
      await mockCommands.kill(mockCtx);
      expect(appStateStore.setKillSwitch).toHaveBeenCalledWith(false);
      expect(mockCtx.reply).toHaveBeenCalledWith('💀 Kill Switch DEACTIVATED. Algo resumed.');
    });
  });

  describe('/manual command', () => {
    it('should toggle manual mode to true', async () => {
      (appStateStore as any).isManualMode = false;
      await mockCommands.manual(mockCtx);
      expect(appStateStore.setManualMode).toHaveBeenCalledWith(true);
      expect(mockCtx.reply).toHaveBeenCalledWith(
        '🛠️ Manual Mode ENABLED. Confirmation required for trades.',
      );
    });

    it('should toggle manual mode to false', async () => {
      (appStateStore as any).isManualMode = true;
      await mockCommands.manual(mockCtx);
      expect(appStateStore.setManualMode).toHaveBeenCalledWith(false);
      expect(mockCtx.reply).toHaveBeenCalledWith('🛠️ Manual Mode DISABLED. Auto-trading active.');
    });
  });

  describe('/paper command', () => {
    it('should toggle paper trading to true', async () => {
      (appStateStore as any).isPaperTrading = false;
      await mockCommands.paper(mockCtx);
      expect(appStateStore.setPaperTrading).toHaveBeenCalledWith(true);
      expect(mockCtx.reply).toHaveBeenCalledWith('📝 Paper Trading ENABLED.');
    });

    it('should toggle paper trading to false', async () => {
      (appStateStore as any).isPaperTrading = true;
      await mockCommands.paper(mockCtx);
      expect(appStateStore.setPaperTrading).toHaveBeenCalledWith(false);
      expect(mockCtx.reply).toHaveBeenCalledWith('📝 Paper Trading DISABLED. LIVE trading active.');
    });
  });

  describe('/status command', () => {
    it('should return status with no active position', async () => {
      (tradeStore as any).activeTrade = null;
      (tradeStore as any).dailySLHit = false;
      (appStateStore as any).isPaperTrading = false;
      (appStateStore as any).isManualMode = false;
      (appStateStore as any).isKillSwitchActive = false;

      await mockCommands.status(mockCtx);
      expect(mockCtx.replyWithHTML).toHaveBeenCalledWith(
        expect.stringContaining('Active Position</b>\nNone'),
      );
    });

    it('should return status with an active position', async () => {
      (tradeStore as any).activeTrade = {
        underlying: 'NIFTY',
        optionType: 'PE',
        netCreditAtEntry: 15.5,
        targetPnl: 1500,
        slPnl: -1500,
        sellLeg: { tradingSymbol: 'NIFTY26MAY21500PE' },
        buyLeg: { tradingSymbol: 'NIFTY26MAY21100PE' },
      } as any;

      await mockCommands.status(mockCtx);
      expect(mockCtx.replyWithHTML).toHaveBeenCalledWith(expect.stringContaining('PE Spread'));
    });
  });

  describe('/update command', () => {
    it('should load scrip master successfully', async () => {
      (loadScripMaster as jest.Mock).mockResolvedValue(undefined);
      await mockCommands.update(mockCtx);
      expect(mockCtx.reply).toHaveBeenCalledWith('✅ Scrip master updated successfully.');
    });

    it('should handle scrip master update failure', async () => {
      (loadScripMaster as jest.Mock).mockRejectedValue(new Error('Network error'));
      await mockCommands.update(mockCtx);
      expect(mockCtx.reply).toHaveBeenCalledWith('❌ Update failed: Network error');
    });
  });

  describe('/logs command', () => {
    it('should return last 10 logs', async () => {
      (fs.readFile as jest.Mock).mockResolvedValue('log1\nlog2\n');
      await mockCommands.logs(mockCtx);
      expect(mockCtx.replyWithHTML).toHaveBeenCalledWith(expect.stringContaining('log1\nlog2'));
    });

    it('should handle log read error', async () => {
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));
      await mockCommands.logs(mockCtx);
      expect(mockCtx.reply).toHaveBeenCalledWith('❌ Could not read log file.');
    });
  });

  describe('/rsi command', () => {
    it('should return the current RSI successfully', async () => {
      (getCandles as jest.Mock).mockResolvedValue([{}]);
      (calculateRsi as jest.Mock).mockReturnValue(55.5);
      await mockCommands.rsi(mockCtx);
      expect(mockCtx.replyWithHTML).toHaveBeenCalledWith('📊 <b>Current Nifty RSI:</b> 55.50');
    });

    it('should handle insufficient data for RSI calculation', async () => {
      (getCandles as jest.Mock).mockResolvedValue([]);
      (calculateRsi as jest.Mock).mockReturnValue(null);
      await mockCommands.rsi(mockCtx);
      expect(mockCtx.reply).toHaveBeenCalledWith('📉 Nifty RSI: Insufficient data (0/28 candles).');
    });

    it('should handle errors during RSI fetch/calculation', async () => {
      (getCandles as jest.Mock).mockRejectedValue(new Error('API error'));
      await mockCommands.rsi(mockCtx);
      expect(mockCtx.reply).toHaveBeenCalledWith('❌ Failed to fetch RSI: API error');
    });
  });

  describe('Text response handler', () => {
    it('should approve pending trade on Y/Yes', async () => {
      mockCtx.message.text = 'Yes';
      (appStateStore as any).pendingTrade = { signal: 'OVERSOLD', rsi: 15 } as any;
      await getMockOnHandler()(mockCtx);
      expect(appStateStore.setPendingTrade).toHaveBeenCalledWith(
        expect.objectContaining({ approved: true }),
      );
    });

    it('should reply if no pending trade is present on Y/Yes', async () => {
      mockCtx.message.text = 'y';
      (appStateStore as any).pendingTrade = null;
      await getMockOnHandler()(mockCtx);
      expect(mockCtx.reply).toHaveBeenCalledWith('No pending trade to approve.');
    });

    it('should ignore other texts', async () => {
      mockCtx.message.text = 'no';
      await getMockOnHandler()(mockCtx);
      expect(appStateStore.setPendingTrade).not.toHaveBeenCalled();
    });
  });
});
