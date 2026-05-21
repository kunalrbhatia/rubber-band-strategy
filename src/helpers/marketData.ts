import { api } from './api.js';
import { ANGEL_ONE_URLS, NIFTY_CONSTANTS } from './constants.js';

export interface Candle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export const getNiftySpot = async (): Promise<number> => {
  const response = await api.post<any>(ANGEL_ONE_URLS.QUOTE, {
    mode: 'LTP',
    exchangeTokens: {
      [NIFTY_CONSTANTS.EXCHANGE]: [NIFTY_CONSTANTS.TOKEN],
    },
  });

  if (response.status === true && response.data.fetched && response.data.fetched.length > 0) {
    return response.data.fetched[0].ltp;
  }
  throw new Error('Failed to fetch Nifty spot LTP');
};

export const getLtp = async (symbolToken: string, exchange: string): Promise<number> => {
  const response = await api.post<any>(ANGEL_ONE_URLS.QUOTE, {
    mode: 'LTP',
    exchangeTokens: {
      [exchange]: [symbolToken],
    },
  });

  if (response.status === true && response.data.fetched && response.data.fetched.length > 0) {
    return response.data.fetched[0].ltp;
  }
  throw new Error(`Failed to fetch LTP for token ${symbolToken}`);
};

export const getCandles = async (
  token: string,
  exchange: string,
  interval: string,
  fromDate: string,
  toDate: string,
): Promise<Candle[]> => {
  const response = await api.post<any>(ANGEL_ONE_URLS.CANDLES, {
    exchange,
    symboltoken: token,
    interval,
    fromdate: fromDate,
    todate: toDate,
  });

  if (response.status === true && Array.isArray(response.data)) {
    return response.data.map((c: any) => ({
      timestamp: c[0],
      open: c[1],
      high: c[2],
      low: c[3],
      close: c[4],
      volume: c[5],
    }));
  }
  throw new Error('Failed to fetch candle data');
};
