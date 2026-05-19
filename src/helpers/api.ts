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

export const api = {
  async get<T>(url: string, params?: any): Promise<T> {
    try {
      const response = await client.get<T>(url, { params });
      return response.data;
    } catch (error: any) {
      logger.error(`API GET Error: ${url} - ${error.message}`);
      throw error;
    }
  },

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await client.post<T>(url, data, config);
      return response.data;
    } catch (error: any) {
      logger.error(`API POST Error: ${url} - ${error.message}`);
      throw error;
    }
  },
};
