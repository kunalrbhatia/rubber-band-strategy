import {
  handleSlackStatus,
  handleSlackKill,
  handleSlackManual,
  handleSlackPaper,
  handleSlackUpdate,
  handleSlackRsi,
  handleSlackLogs,
} from '../../src/helpers/slackCommands.js';
import { appStateStore } from '../../src/store/appStateStore.js';
import { tradeStore } from '../../src/store/tradeStore.js';
import { loadScripMaster } from '../../src/helpers/scripMasterCache.js';
import { getCandles } from '../../src/helpers/marketData.js';
import { calculateRsi } from '../../src/helpers/rsi.js';
import { login } from '../../src/helpers/login.js';
import { sessionStore } from '../../src/store/sessionStore.js';
import fs from 'fs/promises';

jest.mock('../../src/store/appStateStore.js', () => ({
  appStateStore: {
    isPaperTrading: false,
    setPaperTrading: jest.fn(),
    isManualMode: false,
    setManualMode: jest.fn(),
    isKillSwitchActive: false,
    setKillSwitch: jest.fn(),
  },
}));

jest.mock('../../src/store/tradeStore.js', () => ({
  tradeStore: {
    activeTrade: null,
    dailySLHit: false,
    getMtm: jest.fn().mockReturnValue(0),
  },
}));

jest.mock('../../src/helpers/scripMasterCache.js', () => ({
  loadScripMaster: jest.fn(),
}));

jest.mock('../../src/helpers/marketData.js', () => ({
  getCandles: jest.fn(),
}));

jest.mock('../../src/helpers/rsi.js', () => ({
  calculateRsi: jest.fn(),
}));

jest.mock('../../src/helpers/login.js', () => ({
  login: jest.fn(),
}));

jest.mock('../../src/store/sessionStore.js', () => ({
  sessionStore: {
    jwtToken: 'token',
  },
}));

jest.mock('fs/promises', () => ({
  default: {
    access: jest.fn(),
    readdir: jest.fn(),
    readFile: jest.fn(),
  },
  access: jest.fn(),
  readdir: jest.fn(),
  readFile: jest.fn(),
}));

describe('Slack Slash Commands Helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handleSlackStatus', () => {
    it('should return status message without active position', async () => {
      const status = await handleSlackStatus();
      expect(status).toContain('Algo Status');
      expect(status).toContain('Active Position*\nNone');
    });

    it('should return status message with active position', async () => {
      (tradeStore as any).activeTrade = {
        underlying: 'NIFTY',
        optionType: 'CE',
        netCreditAtEntry: 10,
        targetPnl: 100,
        slPnl: -100,
      } as any;
      const status = await handleSlackStatus();
      expect(status).toContain('Active Position');
      expect(status).toContain('CE Spread');
      (tradeStore as any).activeTrade = null;
    });
  });

  describe('handleSlackKill', () => {
    it('should toggle and return message', async () => {
      (appStateStore as any).isKillSwitchActive = false;
      const res = await handleSlackKill();
      expect(appStateStore.setKillSwitch).toHaveBeenCalledWith(true);
      expect(res).toContain('Kill Switch ACTIVATED');
    });
  });

  describe('handleSlackManual', () => {
    it('should toggle and return message', async () => {
      (appStateStore as any).isManualMode = false;
      const res = await handleSlackManual();
      expect(appStateStore.setManualMode).toHaveBeenCalledWith(true);
      expect(res).toContain('Manual Mode ENABLED');
    });
  });

  describe('handleSlackPaper', () => {
    it('should toggle and return message', async () => {
      (appStateStore as any).isPaperTrading = false;
      const res = await handleSlackPaper();
      expect(appStateStore.setPaperTrading).toHaveBeenCalledWith(true);
      expect(res).toContain('Paper Trading ENABLED');
    });
  });

  describe('handleSlackUpdate', () => {
    it('should return success message', async () => {
      (loadScripMaster as jest.Mock).mockResolvedValue(undefined);
      const res = await handleSlackUpdate();
      expect(res).toContain('Scrip master updated successfully');
    });

    it('should return error message on failure', async () => {
      (loadScripMaster as jest.Mock).mockRejectedValue(new Error('Update failed'));
      const res = await handleSlackUpdate();
      expect(res).toContain('Update failed: Update failed');
    });
  });

  describe('handleSlackRsi', () => {
    it('should return current RSI', async () => {
      (getCandles as jest.Mock).mockResolvedValue([]);
      (calculateRsi as jest.Mock).mockReturnValue(65.5);
      const res = await handleSlackRsi();
      expect(res).toContain('Current Nifty RSI:* 65.50');
    });

    it('should call login if token is missing', async () => {
      (sessionStore as any).jwtToken = '';
      (getCandles as jest.Mock).mockResolvedValue([]);
      (calculateRsi as jest.Mock).mockReturnValue(65.5);
      await handleSlackRsi();
      expect(login).toHaveBeenCalled();
      (sessionStore as any).jwtToken = 'token';
    });

    it('should return error message on failure', async () => {
      (getCandles as jest.Mock).mockRejectedValue(new Error('Market error'));
      const res = await handleSlackRsi();
      expect(res).toContain('Failed to fetch RSI: Market error');
    });
  });

  describe('handleSlackLogs', () => {
    it('should return last 10 log lines', async () => {
      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (fs.readFile as jest.Mock).mockResolvedValue('line1\nline2\n');
      const res = await handleSlackLogs();
      expect(res).toContain('line1\nline2');
    });

    it('should return error message on failure', async () => {
      (fs.access as jest.Mock).mockRejectedValue(new Error('Read error'));
      (fs.readdir as jest.Mock).mockRejectedValue(new Error('Read error'));
      const res = await handleSlackLogs();
      expect(res).toContain('Could not read log file: Read error');
    });
  });
});
