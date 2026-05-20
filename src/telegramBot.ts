import { Telegraf } from 'telegraf';
import { config } from './config/env.js';
import { logger } from './helpers/logger.js';
import { appStateStore } from './store/appStateStore.js';
import { tradeStore } from './store/tradeStore.js';
import { loadScripMaster } from './helpers/scripMasterCache.js';
import fs from 'fs/promises';
import path from 'path';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { TIME_CONSTANTS } from './helpers/constants.js';

if (!config.telegramBotToken) {
  logger.warn('TELEGRAM_BOT_TOKEN not found, bot features will be disabled.');
}

export const bot = new Telegraf(config.telegramBotToken || '');

// Middleware to restrict access to the configured Chat ID
bot.use(async (ctx, next) => {
  if (ctx.chat?.id.toString() !== config.telegramChatId) {
    logger.warn(`Unauthorized access attempt from chat ID: ${ctx.chat?.id}`);
    return ctx.reply('Unauthorized.');
  }
  return next();
});

// /kill command
bot.command('kill', async (ctx) => {
  const active = !appStateStore.isKillSwitchActive;
  await appStateStore.setKillSwitch(active);
  ctx.reply(`💀 Kill Switch ${active ? 'ACTIVATED. Algo stopped.' : 'DEACTIVATED. Algo resumed.'}`);
});

// /manual command
bot.command('manual', async (ctx) => {
  const active = !appStateStore.isManualMode;
  await appStateStore.setManualMode(active);
  ctx.reply(`🛠️ Manual Mode ${active ? 'ENABLED. Confirmation required for trades.' : 'DISABLED. Auto-trading active.'}`);
});

// /paper command
bot.command('paper', async (ctx) => {
  const active = !appStateStore.isPaperTrading;
  await appStateStore.setPaperTrading(active);
  ctx.reply(`📝 Paper Trading ${active ? 'ENABLED.' : 'DISABLED. LIVE trading active.'}`);
});

// /status command
bot.command('status', async (ctx) => {
  const activeTrade = tradeStore.activeTrade;
  const status = [
    '📊 <b>Algo Status</b>',
    `Mode: ${appStateStore.isPaperTrading ? '📝 PAPER' : '🔥 LIVE'}`,
    `Strategy: ${appStateStore.isManualMode ? '🛠️ MANUAL' : '🤖 AUTO'}`,
    `Kill Switch: ${appStateStore.isKillSwitchActive ? '💀 ON' : '✅ OFF'}`,
    `Daily SL Hit: ${tradeStore.dailySLHit ? '🛑 YES' : '✅ NO'}`,
    '',
    '💼 <b>Active Position</b>',
    activeTrade ? [
      `Symbol: ${activeTrade.underlying}`,
      `Type: ${activeTrade.optionType} Spread`,
      `Entry: ₹${activeTrade.netCreditAtEntry.toFixed(2)}`,
      `Current MTM: ₹${tradeStore.getMtm().toFixed(2)}`,
      `Target/SL: +₹${activeTrade.targetPnl.toFixed(2)} / -₹${Math.abs(activeTrade.slPnl).toFixed(2)}`
    ].join('\n') : 'None',
  ].join('\n');
  
  ctx.replyWithHTML(status);
});

// /update command
bot.command('update', async (ctx) => {
  ctx.reply('⬇️ Updating scrip master...');
  try {
    await loadScripMaster();
    ctx.reply('✅ Scrip master updated successfully.');
  } catch (error: any) {
    ctx.reply(`❌ Update failed: ${error.message}`);
  }
});

// /logs command
bot.command('logs', async (ctx) => {
  const today = format(toZonedTime(new Date(), TIME_CONSTANTS.TIMEZONE), 'yyyy-MM-dd');
  const logFile = path.join(process.cwd(), 'logs', `rsi-${today}.log`);
  
  try {
    const content = await fs.readFile(logFile, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim()).slice(-10);
    ctx.replyWithHTML(`📋 <b>Last 10 Logs:</b>\n<pre>${lines.join('\n')}</pre>`);
  } catch (error) {
    ctx.reply('❌ Could not read log file.');
  }
});

// Handle "Y/Yes" responses for manual trades
bot.on('text', async (ctx) => {
  const text = ctx.message.text.toLowerCase();
  if (['y', 'yes'].includes(text)) {
    const pendingTrade = appStateStore.pendingTrade;
    if (pendingTrade) {
      ctx.reply('🚀 Executing trade as requested...');
      // Signal to the scanner to proceed
      appStateStore.setPendingTrade({ ...pendingTrade, approved: true });
    } else {
      ctx.reply('No pending trade to approve.');
    }
  }
});

export const startBot = async () => {
  if (!config.telegramBotToken) return;
  
  bot.launch();
  logger.info('Telegram Bot listener started');
  
  // Enable graceful stop
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
};
