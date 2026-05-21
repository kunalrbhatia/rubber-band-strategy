import fs from 'fs/promises';
import { appStateStore } from '../../src/store/appStateStore.js';
import { config } from '../../src/config/env.js';

jest.mock('fs/promises');
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('AppStateStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (appStateStore as any)._isKillSwitchActive = false;
    (appStateStore as any)._isManualMode = false;
    (appStateStore as any)._isPaperTrading = true;

    mockedFs.writeFile.mockResolvedValue(undefined);
    mockedFs.unlink.mockResolvedValue(undefined);
    mockedFs.mkdir.mockResolvedValue(undefined);
  });

  it('should initialize states from files', async () => {
    mockedFs.access.mockResolvedValue(undefined); // File exists
    mockedFs.readFile.mockResolvedValue('{}');

    await appStateStore.init();

    expect(appStateStore.isKillSwitchActive).toBe(true);
    expect(appStateStore.isManualMode).toBe(true);
    expect(appStateStore.isPaperTrading).toBe(true);
  });

  it('should handle missing files during init', async () => {
    mockedFs.access.mockRejectedValue(new Error('not found'));
    config.paperTrading = false;

    await appStateStore.init();

    expect(appStateStore.isKillSwitchActive).toBe(false);
    expect(appStateStore.isManualMode).toBe(false);
    expect(appStateStore.isPaperTrading).toBe(false);
  });

  it('should set kill switch and create file', async () => {
    await appStateStore.setKillSwitch(true);
    expect(appStateStore.isKillSwitchActive).toBe(true);
    expect(mockedFs.writeFile).toHaveBeenCalledWith(expect.stringContaining('.kill'), '', 'utf-8');
  });

  it('should remove kill switch file when deactivated', async () => {
    await appStateStore.setKillSwitch(false);
    expect(appStateStore.isKillSwitchActive).toBe(false);
    expect(mockedFs.unlink).toHaveBeenCalledWith(expect.stringContaining('.kill'));
  });

  it('should set manual mode and create file', async () => {
    await appStateStore.setManualMode(true);
    expect(appStateStore.isManualMode).toBe(true);
    expect(mockedFs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('.manual'),
      '',
      'utf-8',
    );
  });

  it('should toggle paper trading and update config', async () => {
    await appStateStore.setPaperTrading(false);
    expect(appStateStore.isPaperTrading).toBe(false);
    expect(config.paperTrading).toBe(false);
    expect(mockedFs.unlink).toHaveBeenCalledWith(expect.stringContaining('.paper'));
  });

  it('should manage pending trades', () => {
    const trade = { signal: 'OVERSOLD', rsi: 20 };
    appStateStore.setPendingTrade(trade);
    expect(appStateStore.pendingTrade).toEqual(trade);

    appStateStore.clearPendingTrade();
    expect(appStateStore.pendingTrade).toBeNull();
  });
});
