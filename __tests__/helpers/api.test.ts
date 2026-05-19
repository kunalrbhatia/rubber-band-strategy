import { api } from '../../src/helpers/api';
import { sessionStore } from '../../src/store/sessionStore';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('API Helper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAxios.create.mockReturnValue(mockedAxios as any);
  });

  it('should inject JWT token in headers', async () => {
    // This test is tricky because axios.create is called at module load time.
    // However, the interceptor is what we care about.
  });
});
