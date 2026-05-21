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

async function main() {
  try {
    // 0. Initialize app state (Kill, Manual, Paper)
    await appStateStore.init();

    logger.info(`Starting RSI Algo — Mode: ${appStateStore.isPaperTrading ? 'PAPER' : 'LIVE'}`);

    // 1. Check if today is a trading day
    const tradingDay = await isTradingDay();
    if (!tradingDay) {
      const msg = '🚫 RSI Algo — Today is NSE holiday or weekend. Not running.';
      logger.info(msg);
      await sendNotification(msg);
      process.exit(0);
    }

    // 2. Initialize paper store if in paper mode
    if (appStateStore.isPaperTrading) {
      await paperStore.init();
    }

    // 3. Login to SmartAPI
    await login();

    // 4. Load scrip master
    await loadScripMaster();

    // 5. Connect WebSocket
    await connectWebSocket();

    // 6. Start Express server
    startServer(config.port);

    // 7. Start Telegram Bot
    await startBot();

    // 8. Register cron jobs
    // Daily Market Health Check: 09:00 AM IST (Mon-Fri)
    // This includes Scrip Master update, connectivity test, and simulated trade
    cron.schedule(
      '0 9 * * 1-5',
      async () => {
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
        const now = new Date();
        const hour = now.getHours();
        const minute = now.getMinutes();

        // IST 09:20 to 15:20
        // Note: Node.js server time should be IST or we need to adjust cron.
        // Assuming server runs in IST or we adjust. Blueprint says 'every 5 mins from 09:20 AM to 03:20 PM IST'
        // We can use the 'timezone' option in node-cron if supported, or check manually.
        // node-cron v3+ supports timezone.

        // For simplicity in this implementation, we'll check the time inside the job or use the cron expression carefully.
        // '*/5 9-15 * * 1-5' covers 09:00 to 15:55.
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
        await eodSquareOffJob();
      },
      {
        timezone: 'Asia/Kolkata',
      },
    );

    const startMsg = `✅ RSI Algo started — Paper: ${config.paperTrading} — ${new Date().toLocaleDateString()}`;
    await sendNotification(startMsg);
    logger.info('Algo initialized and jobs scheduled');
  } catch (error: any) {
    logger.error(`Startup Error: ${error.message}`);
    await sendNotification(`⚠️ RSI Algo Startup ERROR — ${error.message}`);
    process.exit(1);
  }
}

main();
