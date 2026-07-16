import { config } from '../config/env.js';
import { logger } from '../helpers/logger.js';
import { login } from '../helpers/login.js';
import { loadScripMaster } from '../helpers/scripMasterCache.js';
import { getNiftySpot, getCandles, getLtp } from '../helpers/marketData.js';
import { getUsedMargin } from '../helpers/marginCalc.js';
import { calculateRsi } from '../helpers/rsi.js';
import { isTradingDay } from '../helpers/holidayCheck.js';
import fs from 'fs/promises';
import path from 'path';
import {
  getNearestExpiry,
  getAtmStrike,
  getSellStrike,
  getFarOtmStrike,
  findOptionToken,
} from '../helpers/optionChain.js';
import { connectWebSocket, subscribe, unsubscribe } from '../helpers/slMonitor.js';
import { tradeStore, ActiveTrade } from '../store/tradeStore.js';
import { appStateStore } from '../store/appStateStore.js';
import { paperStore } from '../paper/paperStore.js';
import { placeSpread, exitSpread } from '../helpers/orders.js';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { STRATEGY_CONSTANTS } from '../helpers/constants.js';

export async function runDiagnostics(customLogger?: any) {
  const l = customLogger || logger;
  try {
    l.info('=== MARKET DIAGNOSTICS START ===');

    // 0. Holiday & Schedule Check
    l.info('--- 0. Checking Trading Day Status ---');
    const tradingDay = await isTradingDay();
    l.info(`Is Today a Trading Day? ${tradingDay ? 'YES' : 'NO'}`);

    // 1. Connectivity & Login
    l.info('--- 1. Testing Connectivity & Login ---');
    await login();
    l.info('SUCCESS: Logged in to SmartAPI.');

    // 2. Scrip Master & Freshness
    l.info('--- 2. Loading Scrip Master & Freshness Check ---');
    const CACHE_FILE = path.join(process.cwd(), 'data', 'scrip-master-cache.json');

    // Explicit Verification: Check if loadScripMaster logic handles daily updates
    l.info('Verifying logic: loadScripMaster handles daily updates by date comparison.');
    await loadScripMaster();

    try {
      const content = await fs.readFile(CACHE_FILE, 'utf-8');
      const cache = JSON.parse(content);
      const today = format(new Date(), 'yyyy-MM-dd');
      if (cache.cachedDate === today) {
        l.info(`SUCCESS: Scrip Master is UP TO DATE (Date: ${cache.cachedDate})`);
      } else {
        l.warn(
          `WARNING: Scrip Master cache date (${cache.cachedDate}) does not match today (${today})`,
        );
      }
    } catch (e) {
      l.error('Could not verify Scrip Master file on disk.');
    }

    // Explicit Verification: Verify Cron Scheduling (Structural Check)
    l.info('Verifying scheduling: main.ts contains cron job for 09:00 AM IST update.');
    const mainContent = await fs.readFile(path.join(process.cwd(), 'src', 'main.ts'), 'utf-8');
    if (
      mainContent.includes("cron.schedule('0 9 * * 1-5'") ||
      mainContent.includes('09:00 AM IST')
    ) {
      l.info('SUCCESS: 9:00 AM daily scrip update job is scheduled in main.ts');
    } else {
      l.error('FAILURE: 9:00 AM daily scrip update job NOT found in main.ts');
    }

    // 3. RSI Calculation (Market Related)
    l.info('--- 3. Testing RSI Calculation ---');
    const spot = await getNiftySpot();
    l.info(`Current Nifty Spot: ${spot}`);

    const now = new Date();
    const fromDate = format(new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd HH:mm'); // 48h ago to ensure enough candles
    const toDate = format(now, 'yyyy-MM-dd HH:mm');

    const candles = await getCandles('99926000', 'NSE', 'FIVE_MINUTE', fromDate, toDate);
    l.info(`Fetched ${candles.length} candles for Nifty.`);

    const rsi = calculateRsi(candles);
    if (rsi === null) {
      l.warn('WARNING: RSI calculation returned null (insufficient data).');
    } else {
      l.info(`Current RSI-14: ${rsi.toFixed(2)}`);
    }

    // 4. Strike Selection
    l.info('--- 4. Testing Strike Selection & Margin ---');
    const expiry = getNearestExpiry();
    const atm = getAtmStrike(spot);
    l.info(`Nearest Expiry: ${expiry}`);
    l.info(`ATM Strike: ${atm}`);

    try {
      const realMargin = await getUsedMargin();
      l.info(`Real RMS Margin: ₹${realMargin}`);
    } catch (e: any) {
      l.warn(`Could not fetch RMS margin: ${e.message}`);
    }

    const optionType = rsi && rsi >= 80 ? 'CE' : 'PE';
    const sellStrike = getSellStrike(spot, optionType);
    const hedgeStrike = getFarOtmStrike(sellStrike, optionType);

    l.info(`Selected Strategy: ${optionType} Spread`);
    l.info(`Sell Strike: ${sellStrike}`);
    l.info(`Hedge Strike: ${hedgeStrike}`);

    const sellLeg = findOptionToken(sellStrike, expiry, optionType);
    const buyLeg = findOptionToken(hedgeStrike, expiry, optionType);

    l.info(`Sell Leg: ${sellLeg.tradingSymbol} (Token: ${sellLeg.symbolToken})`);
    l.info(`Buy Leg: ${buyLeg.tradingSymbol} (Token: ${buyLeg.symbolToken})`);

    const sellLtp = await getLtp(sellLeg.symbolToken, 'NFO');
    const buyLtp = await getLtp(buyLeg.symbolToken, 'NFO');
    l.info(`LTP - Sell Leg: ₹${sellLtp}, Buy Leg: ₹${buyLtp}`);

    // 5. Order Placement (Paper/Live)
    l.info('--- 5. Testing Order Placement ---');
    const isLive = process.argv.includes('--live');
    if (isLive) {
      l.info('!!! LIVE MODE DETECTED !!!');
      config.paperTrading = false;
    } else if (
      process.argv[1] &&
      process.argv[1] !== path.join(process.cwd(), 'src', 'scripts', 'market-diagnostics.ts')
    ) {
      // Called from cron job — respect existing app state, don't override
      config.paperTrading = appStateStore.isPaperTrading;
      l.info(`Running in ${config.paperTrading ? 'PAPER' : 'LIVE'} mode (from app state).`);
    } else {
      l.info('Running in PAPER mode (default). Use --live for real trades.');
      config.paperTrading = true;
      await paperStore.init();
    }

    const tradeId = uuidv4();
    const trade: ActiveTrade = {
      id: tradeId,
      entryTime: new Date().toISOString(),
      underlying: 'NIFTY',
      optionType,
      expiry,
      lotSize: sellLeg.lotSize,
      quantity: sellLeg.lotSize,
      sellLeg: {
        tradingSymbol: sellLeg.tradingSymbol,
        symbolToken: sellLeg.symbolToken,
        action: 'SELL',
        strike: sellStrike,
        entryPremium: sellLtp,
        currentPremium: sellLtp,
      },
      buyLeg: {
        tradingSymbol: buyLeg.tradingSymbol,
        symbolToken: buyLeg.symbolToken,
        action: 'BUY',
        strike: hedgeStrike,
        entryPremium: buyLtp,
        currentPremium: buyLtp,
      },
      netCreditAtEntry: sellLtp - buyLtp,
      usedMargin: STRATEGY_CONSTANTS.PAPER_MARGIN_ESTIMATE, // Mock or real margin
      targetPnl: 1000, // Tight target for testing
      slPnl: -500, // Tight SL for testing
      rsiAtEntry: rsi || 0,
      mode: config.paperTrading ? 'PAPER' : 'LIVE',
    };

    tradeStore.setActiveTrade(trade);
    await placeSpread(trade);
    l.info(`SUCCESS: Order placed (${trade.mode}).`);

    // 6. Stop Loss Monitoring
    l.info('--- 6. Testing Stop Loss Monitoring ---');
    l.info('Connecting WebSocket and monitoring for 20 seconds...');
    await connectWebSocket();
    subscribe(trade.sellLeg.symbolToken, trade.buyLeg.symbolToken);

    // Monitor for a bit
    for (let i = 0; i < 4; i++) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      const activeTrade = tradeStore.activeTrade;
      if (activeTrade) {
        const currentNetCredit =
          activeTrade.sellLeg.currentPremium - activeTrade.buyLeg.currentPremium;
        const mtm = (activeTrade.netCreditAtEntry - currentNetCredit) * activeTrade.lotSize;
        l.info(
          `Update ${i + 1}: MTM: ₹${mtm.toFixed(2)} (Sell LTP: ${activeTrade.sellLeg.currentPremium}, Buy LTP: ${activeTrade.buyLeg.currentPremium})`,
        );

        // Artificial SL trigger for testing if market is closed
        if (i === 2 && !isLive) {
          l.info('Simulating SL hit for diagnostic purposes...');
          tradeStore.activeTrade!.sellLeg.currentPremium += 20; // Increase sell premium to cause loss
        }
      } else {
        l.info('Trade closed by Monitor (Target/SL reached).');
        break;
      }
    }

    // Cleanup
    if (tradeStore.activeTrade) {
      l.info('Manually exiting trade...');
      await exitSpread(tradeStore.activeTrade, 'EOD');
      tradeStore.clearActiveTrade();
    }

    unsubscribe();
    l.info('=== MARKET DIAGNOSTICS COMPLETED ===');
  } catch (error: any) {
    l.error(`DIAGNOSTICS FAILED: ${error.message}`);
  }
}

if (
  process.argv[1] &&
  (process.argv[1] === path.join(process.cwd(), 'src', 'scripts', 'market-diagnostics.ts') ||
    process.argv[1].endsWith('market-diagnostics.ts'))
) {
  runDiagnostics()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
