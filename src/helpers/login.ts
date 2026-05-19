import { generate, createGuardrails } from 'otplib';
import { api } from './api.js';
import { ANGEL_ONE_URLS } from './constants.js';
import { config } from '../config/env.js';
import { sessionStore } from '../store/sessionStore.js';
import { logger } from './logger.js';

export const login = async (): Promise<void> => {
  try {
    const totp = await generate({
      secret: config.clientTotpPin,
      guardrails: {
        ...createGuardrails(),
        MIN_SECRET_BYTES: 0,
      } as any,
    });

    const response = await api.post<any>(ANGEL_ONE_URLS.LOGIN, {
      clientcode: config.clientCode,
      password: config.clientPin,
      totp: totp,
    });

    if (response.status === true) {
      sessionStore.setSession({
        jwtToken: response.data.jwtToken,
        refreshToken: response.data.refreshToken,
        feedToken: response.data.feedToken,
      });
      logger.info('Logged in to SmartAPI successfully');
    } else {
      throw new Error(response.message || 'Login failed');
    }
  } catch (error: any) {
    logger.error(`Login failed: ${error.message}`);
    throw error;
  }
};
