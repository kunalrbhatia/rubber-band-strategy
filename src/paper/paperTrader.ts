import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { ActiveTrade } from '../store/tradeStore.js';
import { paperStore, PaperTrade } from './paperStore.js';
import { getLtp } from '../helpers/marketData.js';
import { STRATEGY_CONSTANTS, TIME_CONSTANTS, NIFTY_CONSTANTS } from '../helpers/constants.js';
import { logger } from '../helpers/logger.js';

export const paperPlaceSpread = async (trade: ActiveTrade): Promise<void> => {
  const sellLtp = await getLtp(trade.sellLeg.symbolToken, 'NFO');
  const buyLtp = await getLtp(trade.buyLeg.symbolToken, 'NFO');

  trade.sellLeg.entryPremium = sellLtp;
  trade.sellLeg.currentPremium = sellLtp;
  trade.buyLeg.entryPremium = buyLtp;
  trade.buyLeg.currentPremium = buyLtp;

  trade.netCreditAtEntry = sellLtp - buyLtp;
  trade.usedMargin = STRATEGY_CONSTANTS.PAPER_MARGIN_ESTIMATE;
  trade.targetPnl = trade.usedMargin * STRATEGY_CONSTANTS.TARGET_PERCENT;
  trade.slPnl = -(trade.usedMargin * STRATEGY_CONSTANTS.SL_PERCENT);

  const now = new Date();
  const todayIST = format(toZonedTime(now, TIME_CONSTANTS.TIMEZONE), 'yyyy-MM-dd');

  const paperRecord: PaperTrade = {
    id: trade.id,
    date: todayIST,
    entryTime: trade.entryTime,
    exitTime: null,
    underlying: trade.underlying,
    optionType: trade.optionType,
    expiry: trade.expiry,
    lotSize: trade.lotSize,
    quantity: trade.quantity,
    sellSymbol: trade.sellLeg.tradingSymbol,
    sellStrike: trade.sellLeg.strike,
    sellEntryPremium: sellLtp,
    sellExitPremium: null,
    buySymbol: trade.buyLeg.tradingSymbol,
    buyStrike: trade.buyLeg.strike,
    buyEntryPremium: buyLtp,
    buyExitPremium: null,
    netCreditAtEntry: trade.netCreditAtEntry,
    netCreditAtExit: null,
    usedMargin: trade.usedMargin,
    targetPnl: trade.targetPnl,
    slPnl: trade.slPnl,
    rsiAtEntry: trade.rsiAtEntry,
    status: 'OPEN',
    exitReason: null,
    pnl: null,
  };

  await paperStore.addTrade(paperRecord);
  logger.info(
    `[PAPER] SPREAD SELL ${trade.sellLeg.tradingSymbol} / BUY ${trade.buyLeg.tradingSymbol} | Net credit: ₹${trade.netCreditAtEntry.toFixed(2)}`,
  );
};

export const paperExitSpread = async (
  trade: ActiveTrade,
  reason: 'TARGET' | 'SL_HIT' | 'EOD',
): Promise<void> => {
  const sellExitLtp = await getLtp(trade.sellLeg.symbolToken, 'NFO');
  const buyExitLtp = await getLtp(trade.buyLeg.symbolToken, 'NFO');

  const exitNetCredit = sellExitLtp - buyExitLtp;
  const pnl = (trade.netCreditAtEntry - exitNetCredit) * trade.lotSize;

  await paperStore.updateTrade(trade.id, {
    exitTime: new Date().toISOString(),
    sellExitPremium: sellExitLtp,
    buyExitPremium: buyExitLtp,
    netCreditAtExit: exitNetCredit,
    status: 'CLOSED',
    exitReason: reason,
    pnl: pnl,
  });

  logger.info(`[PAPER] EXIT spread | P&L: ₹${pnl.toFixed(2)} | Reason: ${reason}`);
};
