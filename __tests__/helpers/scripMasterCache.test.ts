import fs from 'fs/promises';
import { loadScripMaster } from '../../src/helpers/scripMasterCache';
import { downloadScripMaster } from '../../src/helpers/scripMaster';
import { scripMasterStore } from '../../src/store/scripMasterStore';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { TIME_CONSTANTS } from '../../src/helpers/constants';

jest.mock('fs/promises');
jest.mock('../../src/helpers/scripMaster');
jest.mock('../../src/helpers/logger');

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedDownload = downloadScripMaster as jest.MockedFunction<typeof downloadScripMaster>;

describe('Scrip Master Cache', () => {
  const today = format(toZonedTime(new Date(), TIME_CONSTANTS.TIMEZONE), 'yyyy-MM-dd');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should load from cache if valid', async () => {
    const mockCache = {
      cachedDate: today,
      records: [{ symbol: 'NIFTY22MAY2624000CE' }],
    };

    mockedFs.access.mockResolvedValue(undefined);
    mockedFs.readFile.mockResolvedValue(JSON.stringify(mockCache));

    const result = await loadScripMaster();

    expect(result).toHaveLength(1);
    expect(result[0].symbol).toBe('NIFTY22MAY2624000CE');
    expect(mockedDownload).not.toHaveBeenCalled();
    expect(scripMasterStore.getRecords()).toEqual(mockCache.records);
  });

  it('should download and cache if cache is stale', async () => {
    const staleCache = {
      cachedDate: '2000-01-01',
      records: [{ symbol: 'OLD' }],
    };

    const freshRecords = [{ symbol: 'NEW' }];

    mockedFs.access.mockResolvedValue(undefined);
    mockedFs.readFile.mockResolvedValue(JSON.stringify(staleCache));
    mockedDownload.mockResolvedValue(freshRecords as any);
    mockedFs.writeFile.mockResolvedValue(undefined);

    const result = await loadScripMaster();

    expect(result).toHaveLength(1);
    expect(result[0].symbol).toBe('NEW');
    expect(mockedDownload).toHaveBeenCalled();
    expect(mockedFs.writeFile).toHaveBeenCalled();
    expect(scripMasterStore.getRecords()).toEqual(freshRecords);
  });

  it('should download and cache if cache file does not exist', async () => {
    mockedFs.access.mockRejectedValue(new Error('Not found'));
    mockedDownload.mockResolvedValue([{ symbol: 'NEW' }] as any);

    await loadScripMaster();

    expect(mockedDownload).toHaveBeenCalled();
    expect(mockedFs.writeFile).toHaveBeenCalled();
  });
});
