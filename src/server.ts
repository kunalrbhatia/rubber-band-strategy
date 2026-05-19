import express from 'express';
import { logger } from './helpers/logger.js';
import { unsubscribe } from './helpers/slMonitor.js';

const app = express();

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
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
