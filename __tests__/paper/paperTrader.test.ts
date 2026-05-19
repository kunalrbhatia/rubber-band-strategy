import { paperPlaceSpread, paperExitSpread } from '../../src/paper/paperTrader';
import { paperStore } from '../../src/paper/paperStore';
import { getLtp } from '../../src/helpers/marketData';
import { ActiveTrade } from '../../src/store/tradeStore';

jest.mock('../../src/paper/paperStore');
jest.mock('../../src/helpers/marketData');
jest.mock('../../src/helpers/logger');

const mockedGetLtp = getLtp as jest.MockedFunction<typeof getLtp>;
const mockedPaperStore = paperStore as jest.Mocked<typeof paperStore>;

describe('Paper Trader', () => {
  const trade: ActiveTrade = {
    id: '1',
    entryTime: '2026-05-20T10:00:00Z',
    underlying: 'NIFTY',
    optionType: 'PE',
    expiry: '2026-05-26',
    lotSize: 75,
    quantity: 75,
    sellLeg: {
      tradingSymbol: 'SELL_SYM',
      symbolToken: 'SELL_TOKEN',
      action: 'SELL',
      strike: 23400,
      entryPremium: 0,
      currentPremium: 0,
    },
    buyLeg: {
      tradingSymbol: 'BUY_SYM',
      symbolToken: 'BUY_TOKEN',
      action: 'BUY',
      strike: 23000,
      entryPremium: 0,
      currentPremium: 0,
    },
    netCreditAtEntry: 0,
    usedMargin: 0,
    targetPnl: 0,
    slPnl: 0,
    rsiAtEntry: 30,
    mode: 'PAPER',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should place a paper spread', async () => {
    mockedGetLtp.mockResolvedValueOnce(100); // sell
    mockedGetLtp.mockResolvedValueOnce(20);  // buy
    mockedPaperStore.addTrade.mockResolvedValue(undefined);

    await paperPlaceSpread(trade);

    expect(trade.netCreditAtEntry).toBe(80);
    expect(mockedPaperStore.addTrade).toHaveBeenCalled();
  });

  it('should exit a paper spread', async () => {
    mockedGetLtp.mockResolvedValueOnce(110); // sell exit
    mockedGetLtp.mockResolvedValueOnce(25);  // buy exit
    mockedPaperStore.updateTrade.mockResolvedValue(undefined);

    await paperExitSpread(trade, 'TARGET');

    expect(mockedPaperStore.updateTrade).toHaveBeenCalledWith('1', expect.objectContaining({
      exitReason: 'TARGET',
      pnl: expect.any(Number),
    }));
  });
});
