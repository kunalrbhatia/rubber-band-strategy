import { api } from './api.js';
import { ANGEL_ONE_URLS, STRATEGY_CONSTANTS } from './constants.js';
import { logger } from './logger.js';

export const getUsedMargin = async (): Promise<number> => {
  try {
    const response = await api.post<any>(ANGEL_ONE_URLS.RMS);
    if (response.status === true) {
      // utilisedAmount is the total margin blocked
      return parseFloat(response.data.utilisedAmount);
    }
    throw new Error(response.message || 'Failed to fetch RMS margin');
  } catch (error: any) {
    logger.error(`Failed to get used margin: ${error.message}`);
    throw error;
  }
};

export const computeThresholds = (usedMargin: number): { targetPnl: number; slPnl: number } => {
  const targetPnl = usedMargin * STRATEGY_CONSTANTS.TARGET_PERCENT;
  const slPnl = -(usedMargin * STRATEGY_CONSTANTS.SL_PERCENT);
  return { targetPnl, slPnl };
};
