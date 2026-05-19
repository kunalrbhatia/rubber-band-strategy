import axios from 'axios';
import { downloadScripMaster } from '../../src/helpers/scripMaster';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Scrip Master Helper', () => {
  it('should download and filter NFO records', async () => {
    const mockData = [
      { symbol: 'SBIN-EQ', exch_seg: 'NSE' },
      { symbol: 'NIFTY22MAY2624000CE', exch_seg: 'NFO' },
      { symbol: 'BANKNIFTY22MAY2648000PE', exch_seg: 'NFO' },
    ];

    mockedAxios.get.mockResolvedValue({ data: mockData });

    const result = await downloadScripMaster();

    expect(result).toHaveLength(2);
    expect(result[0].symbol).toBe('NIFTY22MAY2624000CE');
    expect(result[1].symbol).toBe('BANKNIFTY22MAY2648000PE');
  });

  it('should throw error if download fails', async () => {
    mockedAxios.get.mockRejectedValue(new Error('Network Error'));

    await expect(downloadScripMaster()).rejects.toThrow('Network Error');
  });
});
