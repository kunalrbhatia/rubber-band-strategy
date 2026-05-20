import { api } from './api.js';
import { ANGEL_ONE_URLS, STRATEGY_CONSTANTS } from './constants.js';
import { logger } from './logger.js';

export const getUsedMargin = async (): Promise<number> => {
  try {
    const response = await api.get<any>(ANGEL_ONE_URLS.RMS);
    if (response && response.status === true) {
      // In current Angel One API, 'utiliseddebits' contains the total margin/blocked amount
      const utilised = response.data.utiliseddebits || response.data.utilisedAmount || '0';
      const margin = parseFloat(utilised);
      return isNaN(margin) ? 0 : margin;
    }
    throw new Error(response?.message || 'Failed to fetch RMS margin');
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
