export const ANGEL_ONE_URLS = {
  BASE: 'https://apiconnect.angelone.in',
  LOGIN: '/rest/auth/angelbroking/user/v1/loginByPassword',
  CANDLES: '/rest/secure/angelbroking/historical/v1/getCandleData',
  QUOTE: '/rest/secure/angelbroking/market/v1/quote',
  RMS: '/rest/secure/angelbroking/user/v1/getRMS',
  PLACE_ORDER: '/rest/secure/angelbroking/order/v1/placeOrder',
  SCRIP_MASTER:
    'https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json',
};

export const NIFTY_CONSTANTS = {
  TOKEN: '99926000',
  EXCHANGE: 'NSE',
  SYMBOL: 'NIFTY',
};

export const STRATEGY_CONSTANTS = {
  RSI_LENGTH: 14,
  OVERSOLD_THRESHOLD: 20,
  OVERBOUGHT_THRESHOLD: 80,
  SELL_OFFSET: 200,
  HEDGE_OFFSET: 400,
  TARGET_PERCENT: 0.015,
  SL_PERCENT: 0.015,
  PAPER_MARGIN_ESTIMATE: 45000,
};

export const TIME_CONSTANTS = {
  TIMEZONE: 'Asia/Kolkata',
  MARKET_OPEN: '09:15',
  MARKET_CLOSE: '15:30',
  SQUARE_OFF_TIME: '15:25',
};
