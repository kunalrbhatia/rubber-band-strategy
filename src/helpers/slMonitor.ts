import WebSocket from 'ws';
import { tradeStore, ActiveTrade } from '../store/tradeStore.js';
import { sessionStore } from '../store/sessionStore.js';
import { config } from '../config/env.js';
import { exitSpread } from './orders.js';
import { logger } from './logger.js';
import { sendNotification } from '../notifier.js';

let ws: WebSocket | null = null;
let heartbeatInterval: NodeJS.Timeout | null = null;
let isConnecting = false;

export const connectWebSocket = async (): Promise<void> => {
  if (ws || isConnecting) return;
  isConnecting = true;

  return new Promise((resolve, reject) => {
    const url = 'wss://smartapisocket.angelone.in/smart-stream';
    ws = new WebSocket(url, {
      headers: {
        'Authorization': `Bearer ${sessionStore.jwtToken}`,
        'x-api-key': config.apiKey,
        'x-client-code': config.clientCode,
        'x-feed-token': sessionStore.feedToken,
      },
    });

    ws.on('open', () => {
      logger.info('WebSocket connected for SL monitoring');
      isConnecting = false;
      
      heartbeatInterval = setInterval(() => {
        ws?.ping();
      }, 30000);
      resolve();
    });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.ltp) {
          updateMtm(msg.token, parseFloat(msg.ltp));
        }
      } catch (e) {}
    });

    ws.on('error', (error) => {
      logger.error(`WebSocket error: ${error.message}`);
      isConnecting = false;
      reject(error);
    });

    ws.on('close', () => {
      logger.info('WebSocket connection closed');
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      ws = null;
      isConnecting = false;
      // Attempt reconnect if needed
      setTimeout(connectWebSocket, 5000);
    });
  });
};

export const subscribe = (sellToken: string, buyToken: string): void => {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    logger.error('Cannot subscribe: WebSocket not connected');
    return;
  }

  const subscribeMsg = {
    correlationId: 'rsi-algo-monitor',
    action: 1, // 1 = Subscribe
    params: {
      mode: 1, // 1 = LTP
      tokenList: [
        { exchangeType: 2, tokens: [sellToken, buyToken] }, // 2 = NFO
      ],
    },
  };
  ws.send(JSON.stringify(subscribeMsg));
};

export const unsubscribe = (): void => {
  if (ws) {
    ws.close();
    ws = null;
  }
};

const updateMtm = (token: string, ltp: number): void => {
  const trade = tradeStore.activeTrade;
  if (!trade) return;

  if (token === trade.sellLeg.symbolToken) {
    trade.sellLeg.currentPremium = ltp;
  } else if (token === trade.buyLeg.symbolToken) {
    trade.buyLeg.currentPremium = ltp;
  }

  const currentNetCredit = trade.sellLeg.currentPremium - trade.buyLeg.currentPremium;
  const spreadMtm = (trade.netCreditAtEntry - currentNetCredit) * trade.lotSize;

  if (spreadMtm >= trade.targetPnl) {
    triggerExit(trade, 'TARGET', spreadMtm);
  } else if (spreadMtm <= trade.slPnl) {
    triggerExit(trade, 'SL_HIT', spreadMtm);
  }
};

const triggerExit = async (trade: ActiveTrade, reason: 'TARGET' | 'SL_HIT', mtm: number): Promise<void> => {
  unsubscribe();
  try {
    const exitCredit = trade.sellLeg.currentPremium - trade.buyLeg.currentPremium;
    await exitSpread(trade, reason);
    
    const message = reason === 'TARGET' 
      ? `🎯 TARGET HIT — ${trade.sellLeg.tradingSymbol} spread | P&L: +₹${mtm.toFixed(2)} | Exit net credit: ₹${exitCredit.toFixed(2)}`
      : `🛑 SL HIT — ${trade.sellLeg.tradingSymbol} spread | P&L: -₹${Math.abs(mtm).toFixed(2)} | Exit net credit: ₹${exitCredit.toFixed(2)}`;
    
    await sendNotification(message);
    if (reason === 'SL_HIT') {
      tradeStore.setDailySLHit(true);
    }
    tradeStore.clearActiveTrade();
  } catch (error: any) {
    logger.error(`Failed to execute ${reason} exit: ${error.message}`);
  }
};
