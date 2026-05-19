import { login } from '../../src/helpers/login';
import { api } from '../../src/helpers/api';
import { sessionStore } from '../../src/store/sessionStore';
import { generate } from 'otplib';

jest.mock('../../src/helpers/api');
jest.mock('otplib');
jest.mock('../../src/helpers/logger');

const mockedApi = api as jest.Mocked<typeof api>;
const mockedGenerate = generate as jest.MockedFunction<typeof generate>;

describe('Login Helper', () => {
  it('should login and store session tokens', async () => {
    mockedGenerate.mockResolvedValue('123456');
    mockedApi.post.mockResolvedValue({
      status: true,
      data: {
        jwtToken: 'jwt',
        refreshToken: 'refresh',
        feedToken: 'feed'
      }
    });

    await login();

    expect(sessionStore.jwtToken).toBe('jwt');
    expect(sessionStore.feedToken).toBe('feed');
  });

  it('should throw error if login fails', async () => {
    mockedGenerate.mockResolvedValue('123456');
    mockedApi.post.mockResolvedValue({ status: false, message: 'Invalid credentials' });

    await expect(login()).rejects.toThrow('Invalid credentials');
  });
});
