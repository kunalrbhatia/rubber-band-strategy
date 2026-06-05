import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { TIME_CONSTANTS } from './constants.js';

const { combine, timestamp, printf, colorize } = winston.format;

const logFormat = printf(({ level, message, timestamp }) => {
  const zonedDate = toZonedTime(new Date(timestamp as any), TIME_CONSTANTS.TIMEZONE);
  const formattedDate = format(zonedDate, 'yyyy-MM-dd HH:mm:ss');
  return `[${formattedDate}] ${level}: ${message}`;
});

export const logger = winston.createLogger({
  level: 'info',
  format: combine(timestamp(), logFormat),
  transports: [
    new winston.transports.Console({
      format: combine(colorize(), logFormat),
    }),
    new DailyRotateFile({
      filename: 'logs/rsi-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
    }),
  ],
});
