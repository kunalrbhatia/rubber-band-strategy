import { appStateStore } from '../store/appStateStore.js';
import { tradeStore } from '../store/tradeStore.js';
import { loadScripMaster } from './scripMasterCache.js';
import { getCandles } from './marketData.js';
import { calculateRsi } from './rsi.js';
import { login } from './login.js';
import { sessionStore } from '../store/sessionStore.js';
import { TIME_CONSTANTS, STRATEGY_CONSTANTS, NIFTY_CONSTANTS } from './constants.js';
import { toZonedTime } from 'date-fns-tz';
import { format } from 'date-fns';
import fs from 'fs/promises';
import path from 'path';

export const handleSlackStatus = async (): Promise<string> => {
  const activeTrade = tradeStore.activeTrade;
  const status = [
    '📊 *Algo Status*',
    `Mode: ${appStateStore.isPaperTrading ? '📝 PAPER' : '🔥 LIVE'}`,
    `Strategy: ${appStateStore.isManualMode ? '🛠️ MANUAL' : '🤖 AUTO'}`,
    `Kill Switch: ${appStateStore.isKillSwitchActive ? '💀 ON' : '✅ OFF'}`,
    `Daily SL Hit: ${tradeStore.dailySLHit ? '🛑 YES' : '✅ NO'}`,
    '',
    '💼 *Active Position*',
    activeTrade
      ? [
          `Symbol: ${activeTrade.underlying}`,
          `Type: ${activeTrade.optionType} Spread`,
          `Entry: ₹${activeTrade.netCreditAtEntry.toFixed(2)}`,
          `Current MTM: ₹${tradeStore.getMtm().toFixed(2)}`,
          `Target/SL: +₹${activeTrade.targetPnl.toFixed(2)} / -₹${Math.abs(activeTrade.slPnl).toFixed(2)}`,
        ].join('\n')
      : 'None',
  ].join('\n');
  return status;
};

export const handleSlackKill = async (): Promise<string> => {
  const active = !appStateStore.isKillSwitchActive;
  await appStateStore.setKillSwitch(active);
  return `💀 Kill Switch ${active ? 'ACTIVATED. Algo stopped.' : 'DEACTIVATED. Algo resumed.'}`;
};

export const handleSlackManual = async (): Promise<string> => {
  const active = !appStateStore.isManualMode;
  await appStateStore.setManualMode(active);
  return `🛠️ Manual Mode ${active ? 'ENABLED. Confirmation required for trades.' : 'DISABLED. Auto-trading active.'}`;
};

export const handleSlackPaper = async (): Promise<string> => {
  const active = !appStateStore.isPaperTrading;
  await appStateStore.setPaperTrading(active);
  return `📝 Paper Trading ${active ? 'ENABLED.' : 'DISABLED. LIVE trading active.'}`;
};

export const handleSlackUpdate = async (): Promise<string> => {
  try {
    await loadScripMaster();
    return '✅ Scrip master updated successfully.';
  } catch (error: any) {
    return `❌ Update failed: ${error.message}`;
  }
};

export const handleSlackRsi = async (): Promise<string> => {
  try {
    if (!sessionStore.jwtToken) {
      await login();
    }
    const now = new Date();
    const nowIST = toZonedTime(now, TIME_CONSTANTS.TIMEZONE);
    const fromDate = format(new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd 09:15');
    const nowStr = format(nowIST, 'yyyy-MM-dd HH:mm');

    const candles = await getCandles(
      NIFTY_CONSTANTS.TOKEN,
      NIFTY_CONSTANTS.EXCHANGE,
      'FIVE_MINUTE',
      fromDate,
      nowStr,
    );

    const rsi = calculateRsi(candles, STRATEGY_CONSTANTS.RSI_LENGTH);
    if (rsi === null) {
      return `📉 Nifty RSI: Insufficient data (${candles.length}/28 candles).`;
    }
    return `📊 *Current Nifty RSI:* ${rsi.toFixed(2)}`;
  } catch (error: any) {
    return `❌ Failed to fetch RSI: ${error.message}`;
  }
};

export const handleSlackLogs = async (): Promise<string> => {
  const today = format(toZonedTime(new Date(), TIME_CONSTANTS.TIMEZONE), 'yyyy-MM-dd');
  const logsDir = path.join(process.cwd(), 'logs');
  let logFile = path.join(logsDir, `rsi-${today}.log`);

  try {
    try {
      await fs.access(logFile);
    } catch {
      const files = await fs.readdir(logsDir);
      const logFiles = files
        .filter((f) => f.startsWith('rsi-') && f.endsWith('.log'))
        .sort()
        .reverse();

      if (logFiles.length > 0) {
        logFile = path.join(logsDir, logFiles[0]);
      } else {
        throw new Error('No log files found.');
      }
    }

    const content = await fs.readFile(logFile, 'utf-8');
    const lines = content
      .split('\n')
      .filter((l) => l.trim())
      .slice(-10);

    if (lines.length === 0) {
      return `📋 Log file found (${path.basename(logFile)}), but it is empty.`;
    }

    return `📋 *Last 10 Logs (${path.basename(logFile)}):*\n\`\`\`${lines.join('\n')}\`\`\``;
  } catch (error: any) {
    return `❌ Could not read log file: ${error.message}`;
  }
};
