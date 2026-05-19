import { api } from '../../src/helpers/api';
import { placeSpread, exitSpread } from '../../src/helpers/orders';
import { config } from '../../src/config/env';
import { paperPlaceSpread, paperExitSpread } from '../../src/paper/paperTrader';
import { ActiveTrade } from '../../src/store/tradeStore';

jest.mock('../../src/helpers/api');
jest.mock('../../src/paper/paperTrader');
jest.mock('../../src/notifier');
jest.mock('../../src/helpers/logger');

const mockedApi = api as jest.Mocked<typeof api>;
const mockedPaperPlace = paperPlaceSpread as jest.MockedFunction<typeof paperPlaceSpread>;
const mockedPaperExit = paperExitSpread as jest.MockedFunction<typeof paperExitSpread>;

describe('Orders Helper', () => {
  const mockTrade: ActiveTrade = {
    id: '1',
    sellLeg: { tradingSymbol: 'NIFTY_SELL', symbolToken: 'S1' },
    buyLeg: { tradingSymbol: 'NIFTY_BUY', symbolToken: 'B1' },
    quantity: 75,
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should route to paper trader if paperTrading is true', async () => {
    config.paperTrading = true;
    await placeSpread(mockTrade);
    expect(mockedPaperPlace).toHaveBeenCalledWith(mockTrade);
    expect(mockedApi.post).not.toHaveBeenCalled();

    await exitSpread(mockTrade, 'TARGET');
    expect(mockedPaperExit).toHaveBeenCalledWith(mockTrade, 'TARGET');
  });

  it('should place live orders if paperTrading is false', async () => {
    config.paperTrading = false;
    mockedApi.post.mockResolvedValue({ status: true });

    await placeSpread(mockTrade);

    expect(mockedApi.post).toHaveBeenCalledTimes(2);
    expect(mockedApi.post).toHaveBeenNthCalledWith(1, expect.any(String), expect.objectContaining({
      transactiontype: 'SELL',
      symboltoken: 'S1'
    }));
    expect(mockedApi.post).toHaveBeenNthCalledWith(2, expect.any(String), expect.objectContaining({
      transactiontype: 'BUY',
      symboltoken: 'B1'
    }));
  });

  it('should throw error if first leg fails in live mode', async () => {
    config.paperTrading = false;
    mockedApi.post.mockResolvedValueOnce({ status: false, message: 'Insufficient funds' });

    await expect(placeSpread(mockTrade)).rejects.toThrow('Sell leg order failed: Insufficient funds');
  });
});
