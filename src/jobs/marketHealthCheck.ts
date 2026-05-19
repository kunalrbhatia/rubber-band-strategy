import winston from 'winston';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { TIME_CONSTANTS } from '../helpers/constants.js';
import { runDiagnostics } from '../scripts/market-diagnostics.js';

const { combine, timestamp, printf } = winston.format;

const logFormat = printf(({ level, message, timestamp }) => {
  const zonedDate = toZonedTime(new Date(timestamp as any), TIME_CONSTANTS.TIMEZONE);
  const formattedDate = format(zonedDate, 'yyyy-MM-dd HH:mm:ss');
  return `[${formattedDate}] ${level}: ${message}`;
});

export const marketHealthLogger = winston.createLogger({
  level: 'info',
  format: combine(timestamp(), logFormat),
  transports: [
    new winston.transports.File({
      filename: 'logs/market-health.log',
    }),
  ],
});

export async function marketHealthCheckJob() {
  marketHealthLogger.info('--- Starting Daily Market Health Check ---');
  await runDiagnostics(marketHealthLogger);
  marketHealthLogger.info('--- Market Health Check Finished ---');
}
