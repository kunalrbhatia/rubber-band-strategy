import { api } from '../../src/helpers/api';
import axios from 'axios';
import { sessionStore } from '../../src/store/sessionStore';

jest.mock('axios', () => {
  const mAxios: any = {
    get: jest.fn(),
    post: jest.fn(),
    create: jest.fn(() => mAxios),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  };
  return mAxios;
});

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('API Helper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStore.setSession({ jwtToken: 'test_jwt', feedToken: 'f', refreshToken: 'r' });
  });

  it('should perform GET request', async () => {
    mockedAxios.get.mockResolvedValue({ data: { status: true } });
    const result = await api.get('/test');
    expect(result).toEqual({ status: true });
  });

  it('should perform POST request', async () => {
    mockedAxios.post.mockResolvedValue({ data: { status: true } });
    const result = await api.post('/test', { key: 'val' });
    expect(result).toEqual({ status: true });
  });

  it('should throw and log on error', async () => {
    mockedAxios.get.mockRejectedValue(new Error('Network Error'));
    await expect(api.get('/error')).rejects.toThrow('Network Error');
  });
});
