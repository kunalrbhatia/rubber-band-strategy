import { sendNotification } from '../src/notifier';
import axios from 'axios';
import { logger } from '../src/helpers/logger';

jest.mock('axios');
jest.mock('../src/helpers/logger');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Notifier', () => {
  it('should send notification', async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: {} });
    await sendNotification('test message');
    expect(mockedAxios.post).toHaveBeenCalled();
  });

  it('should log error on failure', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('api error'));
    await sendNotification('test message');
    expect(logger.error).toHaveBeenCalled();
  });
});
