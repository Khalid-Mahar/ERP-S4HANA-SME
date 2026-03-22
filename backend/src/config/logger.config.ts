import * as winston from 'winston';

export function createWinstonConfig(): winston.LoggerOptions {
  const logLevel = process.env.LOG_LEVEL || 'debug';
  const logDir = process.env.LOG_DIR || 'logs';

  return {
    level: logLevel,
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
    ),
    transports: [
      // Console transport with color
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
            const ctx = context ? `[${context}]` : '';
            const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
            return `${timestamp} ${level} ${ctx} ${message} ${metaStr}`;
          }),
        ),
      }),
      // File transport - errors only
      new winston.transports.File({
        filename: `${logDir}/error.log`,
        level: 'error',
        format: winston.format.json(),
      }),
      // File transport - all logs
      new winston.transports.File({
        filename: `${logDir}/combined.log`,
        format: winston.format.json(),
      }),
    ],
  };
}
