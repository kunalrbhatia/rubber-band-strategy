import cron from 'node-cron';
import { config } from './config/env.js';
import { logger } from './helpers/logger.js';
import { login } from './helpers/login.js';
import { isTradingDay } from './helpers/holidayCheck.js';
import { loadScripMaster } from './helpers/scripMasterCache.js';
import { connectWebSocket } from './helpers/slMonitor.js';
import { rsiScannerJob } from './jobs/rsiScanner.js';
import { eodSquareOffJob } from './jobs/eodSquareOff.js';
import { marketHealthCheckJob } from './jobs/marketHealthCheck.js';
import { startServer } from './server.js';
import { paperStore } from './paper/paperStore.js';
import { sendNotification } from './notifier.js';

import { startBot } from './telegramBot.js';
import { appStateStore } from './store/appStateStore.js';

let isInitializedForToday = false;
let currentInitializedDateStr = '';

async function initializeTradingServices() {
  const todayStr = new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata' });
  if (isInitializedForToday && currentInitializedDateStr === todayStr) {
    logger.info('Trading services already initialized for today.');
    return;
  }

  logger.info('Initializing daily trading services...');

  // 1. Initialize paper store if in paper mode
  if (appStateStore.isPaperTrading) {
    await paperStore.init();
  }

  // 2. Login to SmartAPI
  await login();

  // 3. Load scrip master
  await loadScripMaster();

  // 4. Connect WebSocket
  await connectWebSocket();

  isInitializedForToday = true;
  currentInitializedDateStr = todayStr;

  const startMsg = `✅ RSI Algo trading services initialized — Paper: ${appStateStore.isPaperTrading} — ${new Date().toLocaleDateString()}`;
  await sendNotification(startMsg);
  logger.info('Daily trading services initialized successfully');
}

async function main() {
  try {
    // 0. Initialize app state (Kill, Manual, Paper)
    await appStateStore.init();

    logger.info(`Starting RSI Algo — Mode: ${appStateStore.isPaperTrading ? 'PAPER' : 'LIVE'}`);

    // 1. Always start Express server to remain online 24/7
    startServer(config.port);

    // 2. Always start Telegram Bot to remain online 24/7
    await startBot();

    // 3. Check if today is a trading day
    const tradingDay = await isTradingDay();
    if (!tradingDay) {
      const msg = '🚫 RSI Algo — Today is NSE holiday or weekend. Trading services will not be initialized.';
      logger.info(msg);
      await sendNotification(msg);
    } else {
      // Initialize immediately if started/restarted on a trading day
      try {
        await initializeTradingServices();
      } catch (error: any) {
        logger.error(`Initial Trading Service Initialization Failed: ${error.message}`);
        await sendNotification(`⚠️ RSI Algo Initial Initialization Failed — ${error.message}`);
      }
    }

    // 4. Register cron jobs

    // Daily Trading Initialization: 08:30 AM IST (Mon-Fri)
    cron.schedule(
      '30 8 * * 1-5',
      async () => {
        try {
          const isTodayTrading = await isTradingDay();
          if (isTodayTrading) {
            await initializeTradingServices();
          } else {
            logger.info('🚫 Daily Init — Today is NSE holiday. Skipping trading initialization.');
          }
        } catch (error: any) {
          logger.error(`Daily Initialization Failed: ${error.message}`);
          await sendNotification(`⚠️ Daily Initialization Failed — ${error.message}`);
        }
      },
      {
        timezone: 'Asia/Kolkata',
      },
    );

    // Daily Market Health Check: 09:00 AM IST (Mon-Fri)
    cron.schedule(
      '0 9 * * 1-5',
      async () => {
        if (!isInitializedForToday) {
          logger.warn('Skipping Daily Market Health Check: Trading services not initialized.');
          return;
        }
        logger.info('Running daily market health check...');
        await marketHealthCheckJob();
      },
      {
        timezone: 'Asia/Kolkata',
      },
    );

    // RSI Scanner: Every 5 mins from 09:20 AM to 03:20 PM IST (Mon-Fri)
    cron.schedule(
      '*/5 9-15 * * 1-5',
      async () => {
        if (!isInitializedForToday) {
          // Attempt lazy initialization if it's a trading day
          const isTodayTrading = await isTradingDay();
          if (isTodayTrading) {
            try {
              await initializeTradingServices();
            } catch (error) {
              logger.error(`Lazy Initialization Failed inside RSI Scanner: ${error}`);
              return;
            }
          } else {
            return;
          }
        }

        const now = new Date();
        const hour = now.getHours();
        const minute = now.getMinutes();

        if (
          (hour === 9 && minute >= 20) ||
          (hour > 9 && hour < 15) ||
          (hour === 15 && minute <= 20)
        ) {
          await rsiScannerJob();
        }
      },
      {
        timezone: 'Asia/Kolkata',
      },
    );

    // EOD Square-off: 3:25 PM IST (Mon-Fri)
    cron.schedule(
      '25 15 * * 1-5',
      async () => {
        if (!isInitializedForToday) {
          logger.warn('Skipping EOD Square-off: Trading services not initialized.');
          return;
        }
        await eodSquareOffJob();
      },
      {
        timezone: 'Asia/Kolkata',
      },
    );

    logger.info('Algo initialized and jobs scheduled');
  } catch (error: any) {
    logger.error(`Startup Error: ${error.message}`);
    await sendNotification(`⚠️ RSI Algo Startup ERROR — ${error.message}`);
    process.exit(1);
  }
}

main();

