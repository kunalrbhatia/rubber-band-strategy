import { api } from '../../src/helpers/api';
import { getUsedMargin, computeThresholds } from '../../src/helpers/marginCalc';

jest.mock('../../src/helpers/api');
jest.mock('../../src/helpers/logger');

const mockedApi = api as jest.Mocked<typeof api>;

describe('Margin Calculator Helper', () => {
  it('should fetch used margin from RMS', async () => {
    mockedApi.get.mockResolvedValue({
      status: true,
      data: { utiliseddebits: '50000.50' }
    });

    const margin = await getUsedMargin();
    expect(margin).toBe(50000.50);
    expect(mockedApi.get).toHaveBeenCalled();
  });

  it('should compute thresholds correctly', () => {
    const { targetPnl, slPnl } = computeThresholds(100000);
    // 1.5% of 100000 = 1500
    expect(targetPnl).toBe(1500);
    expect(slPnl).toBe(-1500);
  });

  it('should throw error if API fails', async () => {
    mockedApi.get.mockResolvedValue({ status: false, message: 'API Error' });
    await expect(getUsedMargin()).rejects.toThrow('API Error');
  });
});
