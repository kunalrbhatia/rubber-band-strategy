import { format, nextThursday, isThursday, parse, setHours, setMinutes, isAfter } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { TIME_CONSTANTS, STRATEGY_CONSTANTS, NIFTY_CONSTANTS } from './constants.js';
import { scripMasterStore } from '../store/scripMasterStore.js';

export const getNearestExpiry = (): string => {
  const now = new Date();
  const zonedNow = toZonedTime(now, TIME_CONSTANTS.TIMEZONE);
  let expiryDate: Date;

  if (isThursday(zonedNow)) {
    const cutoff = setMinutes(setHours(zonedNow, 15), 30);
    if (isAfter(zonedNow, cutoff)) {
      expiryDate = nextThursday(zonedNow);
    } else {
      expiryDate = zonedNow;
    }
  } else {
    expiryDate = nextThursday(zonedNow);
  }

  return format(expiryDate, 'ddMMMyyyy').toUpperCase();
};

export const getAtmStrike = (spot: number): number => {
  return Math.round(spot / 100) * 100;
};

export const getSellStrike = (spot: number, optionType: 'CE' | 'PE'): number => {
  const atm = getAtmStrike(spot);
  const offset = STRATEGY_CONSTANTS.SELL_OFFSET;
  return optionType === 'CE' ? atm + offset : atm - offset;
};

export const getFarOtmStrike = (sellStrike: number, optionType: 'CE' | 'PE'): number => {
  const offset = STRATEGY_CONSTANTS.HEDGE_OFFSET;
  return optionType === 'CE' ? sellStrike + offset : sellStrike - offset;
};

export const findOptionToken = (
  strike: number,
  expiry: string,
  optionType: 'CE' | 'PE'
): { symbolToken: string; tradingSymbol: string; lotSize: number } => {
  const pattern = `${NIFTY_CONSTANTS.SYMBOL}${expiry}${strike}${optionType}`;
  const record = scripMasterStore.findRecord(
    (r) => r.symbol === pattern && r.instrumenttype === 'OPTIDX'
  );

  if (!record) {
    throw new Error(`Option token not found for ${pattern}`);
  }

  return {
    symbolToken: record.token,
    tradingSymbol: record.symbol,
    lotSize: parseInt(record.lotsize, 10),
  };
};
