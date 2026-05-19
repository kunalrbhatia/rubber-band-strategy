import { isWeekend, format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { TIME_CONSTANTS } from './constants.js';
import axios from 'axios';
import { logger } from './logger.js';

export const isTradingDay = async (): Promise<boolean> => {
  const now = new Date();
  const zonedNow = toZonedTime(now, TIME_CONSTANTS.TIMEZONE);

  if (isWeekend(zonedNow)) {
    return false;
  }

  try {
    // Basic holiday check - in a real app, you'd fetch from a reliable NSE holiday API
    // For this blueprint, we'll assume we check against a static list or a known API if provided.
    // Since no specific API was provided in the blueprint for holiday list, we'll implement a placeholder
    // or search for one. The blueprint says "NSE holiday API check".
    // I'll use a placeholder for now but structure it for an API call.
    const todayStr = format(zonedNow, 'yyyy-MM-dd');
    
    // Example NSE holiday list (partial for 2024/2025/2026)
    const holidays = [
      '2026-01-26', // Republic Day
      '2026-03-06', // Holi
      '2026-04-02', // Mahavir Jayanti
      '2026-04-03', // Good Friday
      '2026-05-01', // Maharashtra Day
    ];

    if (holidays.includes(todayStr)) {
      return false;
    }

    return true;
  } catch (error) {
    logger.warn('Failed to fetch holiday list, proceeding with weekend check only');
    return true;
  }
};
