import axios, { AxiosRequestConfig } from 'axios';
import { ANGEL_ONE_URLS } from './constants.js';
import { config } from '../config/env.js';
import { sessionStore } from '../store/sessionStore.js';
import { logger } from './logger.js';

const client = axios.create({
  baseURL: ANGEL_ONE_URLS.BASE,
});

client.interceptors.request.use((req) => {
  const jwtToken = sessionStore.jwtToken;
  if (jwtToken) {
    req.headers['Authorization'] = `Bearer ${jwtToken}`;
  }
  req.headers['Content-Type'] = 'application/json';
  req.headers['Accept'] = 'application/json';
  req.headers['X-UserType'] = 'USER';
  req.headers['X-SourceID'] = 'WEB';
  req.headers['X-ClientLocalIP'] = '127.0.0.1';
  req.headers['X-ClientPublicIP'] = '127.0.0.1';
  req.headers['X-MACAddress'] = '00-00-00-00-00-00';
  req.headers['X-PrivateKey'] = config.apiKey;
  return req;
});

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function requestWithRetry<T>(
  method: 'GET' | 'POST',
  url: string,
  fn: () => Promise<any>,
  retries = 3,
  delay = 1000,
): Promise<T> {
  try {
    const response = await fn();
    return response.data;
  } catch (error: any) {
    const status = error.response?.status;
    const isRetriable = status === 403 || status >= 500;
    if (retries > 0 && isRetriable) {
      logger.warn(
        `API ${method} to ${url} failed with status ${status}. Retrying in ${delay}ms... (${retries} attempts left)`,
      );
      await wait(delay);
      return requestWithRetry<T>(method, url, fn, retries - 1, delay * 1.5);
    }
    logger.error(`API ${method} Error: ${url} - ${error.message}`);
    throw error;
  }
}

export const api = {
  async get<T>(url: string, params?: any): Promise<T> {
    return requestWithRetry<T>('GET', url, () => client.get<T>(url, { params }));
  },

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return requestWithRetry<T>('POST', url, () => client.post<T>(url, data, config));
  },
};
