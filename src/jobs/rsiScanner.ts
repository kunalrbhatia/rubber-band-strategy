import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { tradeStore, ActiveTrade } from '../store/tradeStore.js';
import { appStateStore } from '../store/appStateStore.js';
import { getNiftySpot, getCandles, getLtp } from '../helpers/marketData.js';
import { calculateRsi } from '../helpers/rsi.js';
import {
  getSellStrike,
  getFarOtmStrike,
  getNearestExpiry,
  findOptionToken,
} from '../helpers/optionChain.js';
import { placeSpread } from '../helpers/orders.js';
import { getUsedMargin, computeThresholds } from '../helpers/marginCalc.js';
import { subscribe } from '../helpers/slMonitor.js';
import { logger } from '../helpers/logger.js';
import { sendNotification } from '../notifier.js';
import { STRATEGY_CONSTANTS, NIFTY_CONSTANTS, TIME_CONSTANTS } from '../helpers/constants.js';
import { config } from '../config/env.js';

export const rsiScannerJob = async (): Promise<void> => {
  if (appStateStore.isKillSwitchActive) {
    logger.info('RSI Scanner: Kill switch is active, skipping scan.');
    return;
  }

  if (tradeStore.hasActiveTrade()) {
    return;
  }

  if (tradeStore.dailySLHit) {
    return;
  }

  try {
    const now = new Date();
    const nowIST = toZonedTime(now, TIME_CONSTANTS.TIMEZONE);
    const todayStart = format(nowIST, 'yyyy-MM-dd 09:15');
    const nowStr = format(nowIST, 'yyyy-MM-dd HH:mm');

    const candles = await getCandles(
      NIFTY_CONSTANTS.TOKEN,
      NIFTY_CONSTANTS.EXCHANGE,
      'FIVE_MINUTE',
      todayStart,
      nowStr,
    );

    const rsi = calculateRsi(candles, STRATEGY_CONSTANTS.RSI_LENGTH);
    if (rsi === null) {
      logger.info(`RSI Scanner: Not enough candles yet (${candles.length}/28)`);
      return;
    }

    logger.info(`Current RSI: ${rsi.toFixed(2)}`);

    let signal: 'OVERSOLD' | 'OVERBOUGHT' | 'NEUTRAL' = 'NEUTRAL';
    if (rsi <= STRATEGY_CONSTANTS.OVERSOLD_THRESHOLD) signal = 'OVERSOLD';
    else if (rsi >= STRATEGY_CONSTANTS.OVERBOUGHT_THRESHOLD) signal = 'OVERBOUGHT';

    if (signal !== 'NEUTRAL') {
      if (appStateStore.isManualMode) {
        const pending = appStateStore.pendingTrade;
        if (pending && pending.approved && pending.signal === signal) {
          logger.info(`RSI Scanner: Executing APPROVED manual trade for ${signal}`);
          await executeEntry(signal, rsi);
          appStateStore.clearPendingTrade();
        } else if (!pending || pending.signal !== signal) {
          logger.info(`RSI Scanner: Signal detected in MANUAL mode. Asking for permission.`);
          appStateStore.setPendingTrade({ signal, rsi, timestamp: Date.now(), approved: false });
          await sendNotification(
            `⚠️ <b>SIGNAL DETECTED [${signal}]</b>\nNifty RSI is ${rsi.toFixed(2)}. Would you like me to take a trade? (Reply <b>Y</b> or <b>Yes</b> to proceed)`,
          );
        }
      } else {
        await executeEntry(signal, rsi);
      }
    } else {
      // Clear pending if neutral to avoid stale approvals
      appStateStore.clearPendingTrade();
    }
  } catch (error: any) {
    logger.error(`RSI Scanner Job Error: ${error.message}`);
  }
};

const executeEntry = async (signal: 'OVERSOLD' | 'OVERBOUGHT', rsi: number): Promise<void> => {
  const optionType = signal === 'OVERSOLD' ? 'PE' : 'CE';
  const spot = await getNiftySpot();
  const sellStrike = getSellStrike(spot, optionType);
  const hedgeStrike = getFarOtmStrike(sellStrike, optionType);
  const expiry = getNearestExpiry();

  const sellLegInfo = findOptionToken(sellStrike, expiry, optionType);
  const buyLegInfo = findOptionToken(hedgeStrike, expiry, optionType);

  const sellLtp = await getLtp(sellLegInfo.symbolToken, 'NFO');
  const buyLtp = await getLtp(buyLegInfo.symbolToken, 'NFO');

  const trade: ActiveTrade = {
    id: uuidv4(),
    entryTime: new Date().toISOString(),
    underlying: 'NIFTY',
    optionType,
    expiry,
    lotSize: sellLegInfo.lotSize,
    quantity: sellLegInfo.lotSize, // 1 lot
    sellLeg: {
      tradingSymbol: sellLegInfo.tradingSymbol,
      symbolToken: sellLegInfo.symbolToken,
      action: 'SELL',
      strike: sellStrike,
      entryPremium: sellLtp,
      currentPremium: sellLtp,
    },
    buyLeg: {
      tradingSymbol: buyLegInfo.tradingSymbol,
      symbolToken: buyLegInfo.symbolToken,
      action: 'BUY',
      strike: hedgeStrike,
      entryPremium: buyLtp,
      currentPremium: buyLtp,
    },
    netCreditAtEntry: sellLtp - buyLtp,
    usedMargin: 0,
    targetPnl: 0,
    slPnl: 0,
    rsiAtEntry: rsi,
    mode: config.paperTrading ? 'PAPER' : 'LIVE',
  };

  await placeSpread(trade);

  if (!config.paperTrading) {
    trade.usedMargin = await getUsedMargin();
    const thresholds = computeThresholds(trade.usedMargin);
    trade.targetPnl = thresholds.targetPnl;
    trade.slPnl = thresholds.slPnl;
  }

  tradeStore.setActiveTrade(trade);
  subscribe(trade.sellLeg.symbolToken, trade.buyLeg.symbolToken);

  const emoji = optionType === 'PE' ? '📉' : '📈';
  const msg = `${emoji} SPREAD ENTRY [${optionType}] — Sell ${trade.sellLeg.tradingSymbol} @ ₹${sellLtp.toFixed(2)} / Buy ${trade.buyLeg.tradingSymbol} @ ₹${buyLtp.toFixed(2)} | Net credit: ₹${trade.netCreditAtEntry.toFixed(2)} | RSI: ${rsi.toFixed(2)} | Margin: ₹${trade.usedMargin} | Target: +₹${trade.targetPnl.toFixed(2)} | SL: -₹${Math.abs(trade.slPnl).toFixed(2)}`;

  await sendNotification(msg);
};
