import { api } from '../../src/helpers/api';
import { getNiftySpot, getLtp, getCandles } from '../../src/helpers/marketData';

jest.mock('../../src/helpers/api');
const mockedApi = api as jest.Mocked<typeof api>;

describe('Market Data Helper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch Nifty spot LTP', async () => {
    mockedApi.post.mockResolvedValue({
      status: true,
      data: {
        fetched: [{ ltp: 24000 }],
      },
    });

    const ltp = await getNiftySpot();
    expect(ltp).toBe(24000);
    expect(mockedApi.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        mode: 'LTP',
      }),
    );
  });

  it('should fetch LTP for a token', async () => {
    mockedApi.post.mockResolvedValue({
      status: true,
      data: {
        fetched: [{ ltp: 150.5 }],
      },
    });

    const ltp = await getLtp('123', 'NFO');
    expect(ltp).toBe(150.5);
  });

  it('should fetch candles', async () => {
    const mockCandles = [['2025-05-22T09:15:00', 24000, 24010, 23990, 24005, 1000]];
    mockedApi.post.mockResolvedValue({
      status: true,
      data: mockCandles,
    });

    const candles = await getCandles(
      '99926000',
      'NSE',
      'FIVE_MINUTE',
      '2025-05-22 09:15',
      '2025-05-22 15:30',
    );

    expect(candles).toHaveLength(1);
    expect(candles[0].close).toBe(24005);
    expect(candles[0].timestamp).toBe('2025-05-22T09:15:00');
  });

  it('should throw error if API fails', async () => {
    mockedApi.post.mockResolvedValue({ status: false, message: 'Invalid token' });
    await expect(getNiftySpot()).rejects.toThrow('Failed to fetch Nifty spot LTP');
  });
});
