import { tradeStore } from '../store/tradeStore.js';
import { getLtp } from '../helpers/marketData.js';
import { exitSpread } from '../helpers/orders.js';
import { unsubscribe } from '../helpers/slMonitor.js';
import { logger } from '../helpers/logger.js';
import { sendNotification } from '../notifier.js';

import { appStateStore } from '../store/appStateStore.js';

export const eodSquareOffJob = async (): Promise<void> => {
  if (appStateStore.isKillSwitchActive) {
    logger.info('EOD: Kill switch is active, skipping square-off.');
    return;
  }

  if (!tradeStore.hasActiveTrade()) {
    logger.info('EOD — No open position today.');
    await sendNotification('💤 EOD — No open position today.');
    return;
  }

  const trade = tradeStore.activeTrade!;
  unsubscribe();

  try {
    const sellExitLtp = await getLtp(trade.sellLeg.symbolToken, 'NFO');
    const buyExitLtp = await getLtp(trade.buyLeg.symbolToken, 'NFO');

    trade.sellLeg.currentPremium = sellExitLtp;
    trade.buyLeg.currentPremium = buyExitLtp;

    await exitSpread(trade, 'EOD');

    const exitNetCredit = sellExitLtp - buyExitLtp;
    const pnl = (trade.netCreditAtEntry - exitNetCredit) * trade.lotSize;

    const emoji = pnl >= 0 ? '✅' : '❌';
    const status = pnl >= 0 ? 'profit' : 'loss';
    const message = `${emoji} EOD EXIT — ${trade.sellLeg.tradingSymbol} spread | P&L: ${pnl >= 0 ? '+' : ''}₹${pnl.toFixed(2)}`;

    await sendNotification(message);
    logger.info(`EOD Square-off completed with ${status}: ₹${pnl.toFixed(2)}`);

    tradeStore.clearActiveTrade();
  } catch (error: any) {
    logger.error(`EOD Square-off failed: ${error.message}`);
    await sendNotification(
      `⚠️ EOD EXIT FAILED — ${trade.sellLeg.tradingSymbol} — ${error.message}`,
    );
  }
};
