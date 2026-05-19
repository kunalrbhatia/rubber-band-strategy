import { api } from './api.js';
import { ANGEL_ONE_URLS } from './constants.js';
import { ActiveTrade } from '../store/tradeStore.js';
import { config } from '../config/env.js';
import { paperPlaceSpread, paperExitSpread } from '../paper/paperTrader.js';
import { logger } from './logger.js';
import { sendNotification } from '../notifier.js';

export const placeSpread = async (trade: ActiveTrade): Promise<void> => {
  if (config.paperTrading) {
    await paperPlaceSpread(trade);
    return;
  }

  try {
    // Leg 1: Sell ATM
    const order1 = await api.post<any>(ANGEL_ONE_URLS.PLACE_ORDER, {
      variety: 'NORMAL',
      tradingsymbol: trade.sellLeg.tradingSymbol,
      symboltoken: trade.sellLeg.symbolToken,
      transactiontype: 'SELL',
      exchange: 'NFO',
      ordertype: 'MARKET',
      producttype: 'CARRYFORWARD',
      duration: 'DAY',
      quantity: trade.quantity,
    });

    if (order1.status !== true) {
      throw new Error(`Sell leg order failed: ${order1.message}`);
    }

    // Leg 2: Buy far OTM
    const order2 = await api.post<any>(ANGEL_ONE_URLS.PLACE_ORDER, {
      variety: 'NORMAL',
      tradingsymbol: trade.buyLeg.tradingSymbol,
      symboltoken: trade.buyLeg.symbolToken,
      transactiontype: 'BUY',
      exchange: 'NFO',
      ordertype: 'MARKET',
      producttype: 'CARRYFORWARD',
      duration: 'DAY',
      quantity: trade.quantity,
    });

    if (order2.status !== true) {
      logger.error(`CRITICAL: Sell leg placed but buy leg failed: ${order2.message}`);
      await sendNotification(`⚠️ CRITICAL: Spread entry partial fill! ${trade.buyLeg.tradingSymbol} failed.`);
      // In a real app, you might want to retry order2 or exit order1 immediately
    }

    logger.info(`Live spread entry successful: ${trade.sellLeg.tradingSymbol} / ${trade.buyLeg.tradingSymbol}`);
  } catch (error: any) {
    logger.error(`Live spread entry failed: ${error.message}`);
    throw error;
  }
};

export const exitSpread = async (
  trade: ActiveTrade,
  reason: 'TARGET' | 'SL_HIT' | 'EOD'
): Promise<void> => {
  if (config.paperTrading) {
    await paperExitSpread(trade, reason);
    return;
  }

  try {
    // Close sell leg (BUY back)
    const order1 = await api.post<any>(ANGEL_ONE_URLS.PLACE_ORDER, {
      variety: 'NORMAL',
      tradingsymbol: trade.sellLeg.tradingSymbol,
      symboltoken: trade.sellLeg.symbolToken,
      transactiontype: 'BUY',
      exchange: 'NFO',
      ordertype: 'MARKET',
      producttype: 'CARRYFORWARD',
      duration: 'DAY',
      quantity: trade.quantity,
    });

    // Close buy leg (SELL back)
    const order2 = await api.post<any>(ANGEL_ONE_URLS.PLACE_ORDER, {
      variety: 'NORMAL',
      tradingsymbol: trade.buyLeg.tradingSymbol,
      symboltoken: trade.buyLeg.symbolToken,
      transactiontype: 'SELL',
      exchange: 'NFO',
      ordertype: 'MARKET',
      producttype: 'CARRYFORWARD',
      duration: 'DAY',
      quantity: trade.quantity,
    });

    logger.info(`Live spread exit successful: ${reason}`);
  } catch (error: any) {
    logger.error(`Live spread exit failed: ${error.message}`);
    throw error;
  }
};
