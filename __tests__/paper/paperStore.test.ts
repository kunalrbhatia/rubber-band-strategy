import { paperStore, PaperTrade } from '../../src/paper/paperStore';
import fs from 'fs/promises';
import path from 'path';

jest.mock('fs/promises');
jest.mock('../../src/helpers/logger');

const mockedFs = fs as jest.Mocked<typeof fs>;

describe('Paper Store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with existing file', async () => {
    mockedFs.access.mockResolvedValue(undefined);
    mockedFs.readFile.mockResolvedValue(JSON.stringify({ trades: [] }));
    await paperStore.init();
    expect(mockedFs.readFile).toHaveBeenCalled();
  });

  it('should initialize with new file if none exists', async () => {
    mockedFs.access.mockRejectedValue(new Error('no file'));
    mockedFs.writeFile.mockResolvedValue(undefined);
    mockedFs.rename.mockResolvedValue(undefined);
    await paperStore.init();
    expect(mockedFs.writeFile).toHaveBeenCalled();
  });

  it('should add a trade', async () => {
    const trade: PaperTrade = {
      id: '1',
      date: '2026-05-20',
      entryTime: '10:00',
      exitTime: null,
      underlying: 'NIFTY',
      optionType: 'CE',
      expiry: '2026-05-26',
      lotSize: 75,
      quantity: 75,
      sellSymbol: 'S1',
      sellStrike: 23600,
      sellEntryPremium: 100,
      sellExitPremium: null,
      buySymbol: 'B1',
      buyStrike: 24000,
      buyEntryPremium: 20,
      buyExitPremium: null,
      netCreditAtEntry: 80,
      netCreditAtExit: null,
      usedMargin: 50000,
      targetPnl: 1000,
      slPnl: -1000,
      rsiAtEntry: 80,
      status: 'OPEN',
      exitReason: null,
      pnl: null,
    };
    await paperStore.addTrade(trade);
    expect(paperStore.getAllTrades()).toContain(trade);
  });

  it('should update a trade', async () => {
    await paperStore.updateTrade('1', { status: 'CLOSED', pnl: 500 });
    const trades = paperStore.getAllTrades();
    const trade = trades.find(t => t.id === '1');
    expect(trade?.status).toBe('CLOSED');
    expect(trade?.pnl).toBe(500);
  });

  it('should get summary', () => {
    const summary = paperStore.getSummary();
    expect(summary.totalTrades).toBe(1);
    expect(summary.totalPnl).toBe(500);
  });
});
