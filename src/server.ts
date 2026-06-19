import express from 'express';
import crypto from 'crypto';
import { config } from './config/env.js';
import { logger } from './helpers/logger.js';
import { unsubscribe } from './helpers/slMonitor.js';
import {
  handleSlackStatus,
  handleSlackKill,
  handleSlackManual,
  handleSlackPaper,
  handleSlackUpdate,
  handleSlackRsi,
  handleSlackLogs,
} from './helpers/slackCommands.js';

const app = express();

// Capture raw body for signature verification
app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);
app.use(
  express.urlencoded({
    extended: true,
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

export const verifySlackSignature = (req: any, res: any, next: any) => {
  // Bypass validation in test environments if there's no slack signature header provided
  if (process.env.NODE_ENV === 'test' && !req.headers['x-slack-signature']) {
    return next();
  }

  const signature = req.headers['x-slack-signature'];
  const timestamp = req.headers['x-slack-request-timestamp'];

  if (!signature || !timestamp) {
    logger.warn('Slack verification failed: Missing headers');
    return res.status(401).send('Unauthorized');
  }

  // Prevent replay attacks (5 minute window)
  const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 60 * 5;
  if (parseInt(timestamp, 10) < fiveMinutesAgo) {
    logger.warn('Slack verification failed: Replay attack detected');
    return res.status(401).send('Unauthorized');
  }

  const signingSecret = config.slackSigningSecret;
  if (!signingSecret) {
    logger.error('SLACK_SIGNING_SECRET is not configured');
    return res.status(500).send('Internal Server Error');
  }

  const rawBody = req.rawBody ? req.rawBody.toString('utf8') : '';
  const sigBaseString = `v0:${timestamp}:${rawBody}`;
  const hmac = crypto.createHmac('sha256', signingSecret);
  const mySignature = `v0=${hmac.update(sigBaseString).digest('hex')}`;

  try {
    if (crypto.timingSafeEqual(Buffer.from(mySignature, 'utf8'), Buffer.from(signature, 'utf8'))) {
      return next();
    }
  } catch (err) {
    // If lengths are different or error is thrown
  }

  logger.warn('Slack verification failed: Signature mismatch');
  return res.status(401).send('Unauthorized');
};

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.post('/slack/commands', verifySlackSignature, async (req, res) => {
  const { command, text, user_name } = req.body;
  logger.info(`Received Slack slash command: ${command} from user ${user_name}`);

  let replyText = 'Unknown command.';

  try {
    switch (command) {
      case '/status':
      case '/pnl':
        replyText = await handleSlackStatus();
        break;
      case '/kill':
        replyText = await handleSlackKill();
        break;
      case '/manual':
        replyText = await handleSlackManual();
        break;
      case '/paper':
        replyText = await handleSlackPaper();
        break;
      case '/rsi':
        replyText = await handleSlackRsi();
        break;
      case '/logs':
        replyText = await handleSlackLogs();
        break;
      case '/update':
        replyText = await handleSlackUpdate();
        break;
    }
  } catch (error: any) {
    logger.error(`Error handling Slack command ${command}: ${error.message}`);
    replyText = `❌ Error executing command: ${error.message}`;
  }

  res.json({
    response_type: 'ephemeral',
    text: replyText,
  });
});

export const startServer = (port: number) => {
  const server = app.listen(port, () => {
    logger.info(`Express server listening on port ${port}`);
  });

  const gracefulShutdown = () => {
    logger.info('Shutting down gracefully...');
    unsubscribe();
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });

    // Force exit after 10s
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);

  return server;
};
