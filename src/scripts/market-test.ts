import { config } from '../config/env.js';
import { logger } from '../helpers/logger.js';
import { login } from '../helpers/login.js';
import { loadScripMaster } from '../helpers/scripMasterCache.js';
import { getNiftySpot, getCandles, getLtp } from '../helpers/marketData.js';
import { calculateRsi } from '../helpers/rsi.js';
import {
  getNearestExpiry,
  getAtmStrike,
  getSellStrike,
  getFarOtmStrike,
  findOptionToken,
} from '../helpers/optionChain.js';
import { connectWebSocket, subscribe, unsubscribe } from '../helpers/slMonitor.js';
import { tradeStore, ActiveTrade } from '../store/tradeStore.js';
import { paperStore } from '../paper/paperStore.js';
import { placeSpread, exitSpread } from '../helpers/orders.js';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

async function runMarketTest() {
  try {
    logger.info('--- Starting Market-Related Test Script ---');

    // 1. Login
    logger.info('1. Logging in to SmartAPI...');
    await login();
    logger.info('Login successful.');

    // 2. Load Scrip Master
    logger.info('2. Loading Scrip Master...');
    await loadScripMaster();
    logger.info('Scrip Master loaded.');

    // 3. Fetch Nifty Spot
    logger.info('3. Fetching Nifty Spot...');
    const spot = await getNiftySpot();
    logger.info(`Nifty Spot: ${spot}`);

    // 4. Fetch Candles and Calculate RSI
    logger.info('4. Fetching Candles and Calculating RSI...');
    const now = new Date();
    const fromDate = format(new Date(now.getTime() - 24 * 60 * 60 * 1000), 'yyyy-MM-dd HH:mm'); // 24h ago
    const toDate = format(now, 'yyyy-MM-dd HH:mm');

    // Nifty token: 99926000
    const candles = await getCandles('99926000', 'NSE', 'FIVE_MINUTE', fromDate, toDate);
    logger.info(`Fetched ${candles.length} candles.`);

    const rsi = calculateRsi(candles);
    logger.info(`Current RSI-14: ${rsi !== null ? rsi.toFixed(2) : 'Insufficient data'}`);

    // 5. Test Strike Selection
    logger.info('5. Testing Strike Selection...');
    const expiry = getNearestExpiry();
    const atm = getAtmStrike(spot);
    logger.info(`Nearest Expiry: ${expiry}`);
    logger.info(`ATM Strike: ${atm}`);

    const optionType = rsi && rsi >= 80 ? 'CE' : 'PE'; // Default to PE if no RSI signal for testing
    const sellStrike = getSellStrike(spot, optionType);
    const hedgeStrike = getFarOtmStrike(sellStrike, optionType);

    logger.info(`Target Sell Strike (${optionType}): ${sellStrike}`);
    logger.info(`Target Hedge Strike (${optionType}): ${hedgeStrike}`);

    const sellLeg = findOptionToken(sellStrike, expiry, optionType);
    const buyLeg = findOptionToken(hedgeStrike, expiry, optionType);

    logger.info(`Sell Leg: ${sellLeg.tradingSymbol} (Token: ${sellLeg.symbolToken})`);
    logger.info(`Buy Leg: ${buyLeg.tradingSymbol} (Token: ${buyLeg.symbolToken})`);

    // 6. Test Placing an Order (Paper Mode)
    logger.info('6. Placing a Paper Spread...');
    await paperStore.init();

    const trade: ActiveTrade = {
      id: uuidv4(),
      entryTime: new Date().toISOString(),
      underlying: 'NIFTY',
      optionType,
      expiry,
      lotSize: sellLeg.lotSize,
      quantity: sellLeg.lotSize, // 1 lot
      sellLeg: {
        tradingSymbol: sellLeg.tradingSymbol,
        symbolToken: sellLeg.symbolToken,
        action: 'SELL',
        strike: sellStrike,
        entryPremium: 0,
        currentPremium: 0,
      },
      buyLeg: {
        tradingSymbol: buyLeg.tradingSymbol,
        symbolToken: buyLeg.symbolToken,
        action: 'BUY',
        strike: hedgeStrike,
        entryPremium: 0,
        currentPremium: 0,
      },
      netCreditAtEntry: 0,
      usedMargin: 0,
      targetPnl: 0,
      slPnl: 0,
      rsiAtEntry: rsi || 0,
      mode: 'PAPER',
    };

    tradeStore.setActiveTrade(trade);

    // We'll use placeSpread which handles PAPER/LIVE
    // Ensure PAPER_TRADING is true in env or override it for this test
    if (!config.paperTrading) {
      logger.warn(
        'WARNING: config.paperTrading is FALSE. This test will use LIVE API if you proceed.',
      );
      // Forcing paper for safety in test script unless specifically wanted
      logger.info('Forcing paper mode for this test...');
      config.paperTrading = true;
    }

    await placeSpread(trade);
    logger.info('Spread placed successfully.');

    // 7. Test Stop Loss Monitoring (WebSocket)
    logger.info('7. Starting WebSocket Monitoring for 30 seconds...');
    await connectWebSocket();
    subscribe(trade.sellLeg.symbolToken, trade.buyLeg.symbolToken);

    logger.info('Subscribed to tokens. Waiting for LTP updates...');

    // Wait for 30 seconds to show updates
    for (let i = 0; i < 6; i++) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      const activeTrade = tradeStore.activeTrade;
      if (activeTrade) {
        const currentNetCredit =
          activeTrade.sellLeg.currentPremium - activeTrade.buyLeg.currentPremium;
        const mtm = (activeTrade.netCreditAtEntry - currentNetCredit) * activeTrade.lotSize;
        logger.info(
          `Tick ${i + 1}: Sell LTP: ${activeTrade.sellLeg.currentPremium}, Buy LTP: ${activeTrade.buyLeg.currentPremium}, MTM: ₹${mtm.toFixed(2)}`,
        );
      } else {
        logger.info('Trade exited (Target or SL hit during monitoring).');
        break;
      }
    }

    // 8. Exit Spread
    if (tradeStore.activeTrade) {
      logger.info('8. Manually Exiting Spread...');
      await exitSpread(tradeStore.activeTrade, 'EOD');
      tradeStore.clearActiveTrade();
      logger.info('Spread exited.');
    }

    unsubscribe();
    logger.info('--- Market Test Completed Successfully ---');
    process.exit(0);
  } catch (error: any) {
    logger.error(`Market Test Failed: ${error.message}`);
    process.exit(1);
  }
}

runMarketTest();
