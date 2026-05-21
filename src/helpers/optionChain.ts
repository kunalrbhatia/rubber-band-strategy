import { format, nextThursday, isThursday, parse, setHours, setMinutes, isAfter } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { TIME_CONSTANTS, STRATEGY_CONSTANTS, NIFTY_CONSTANTS } from './constants.js';
import { scripMasterStore } from '../store/scripMasterStore.js';

export const getNearestExpiry = (): string => {
  const records = scripMasterStore.getRecords();
  const niftyExpiries = [
    ...new Set(
      records
        .filter((r) => r.name === NIFTY_CONSTANTS.SYMBOL && r.instrumenttype === 'OPTIDX')
        .map((r) => r.expiry),
    ),
  ];

  if (niftyExpiries.length === 0) {
    throw new Error('No Nifty expiries found in scrip master');
  }

  const now = toZonedTime(new Date(), TIME_CONSTANTS.TIMEZONE);
  const todayStr = format(now, 'yyyy-MM-dd');

  // Parse and sort expiries
  const sortedExpiries = niftyExpiries
    .map((e) => ({
      original: e,
      date: parse(e, 'ddMMMyyyy', new Date()),
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  // Find the first expiry that is today or in the future
  for (const exp of sortedExpiries) {
    const expDateStr = format(exp.date, 'yyyy-MM-dd');
    if (expDateStr >= todayStr) {
      // If today is expiry, check if it's past 3:30 PM
      if (expDateStr === todayStr) {
        const cutoff = setMinutes(setHours(now, 15), 30);
        if (isAfter(now, cutoff)) {
          continue; // Move to next expiry
        }
      }
      return exp.original;
    }
  }

  return sortedExpiries[0].original;
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
  optionType: 'CE' | 'PE',
): { symbolToken: string; tradingSymbol: string; lotSize: number } => {
  // Expiry in symbol uses 2-digit year, e.g., 19MAY26 instead of 19MAY2026
  const expiryDate = parse(expiry, 'ddMMMyyyy', new Date());
  const expiryShort = format(expiryDate, 'ddMMMyy').toUpperCase();

  const pattern = `${NIFTY_CONSTANTS.SYMBOL}${expiryShort}${strike}${optionType}`;
  const record = scripMasterStore.findRecord(
    (r) => r.symbol === pattern && r.instrumenttype === 'OPTIDX',
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
