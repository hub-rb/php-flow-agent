/**
 * 日志级别
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * 日志服务名称
 */
export const LOG_SERVICE = 'build-max-plugin';

/**
 * 简单日志函数（兼容 OpenCode client.app.log）
 */
export function log(
  level: LogLevel,
  message: string,
  extra?: Record<string, unknown>
): void {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${LOG_SERVICE}] [${level.toUpperCase()}]`;
  
  const logMessage = extra 
    ? `${prefix} ${message} ${JSON.stringify(extra)}`
    : `${prefix} ${message}`;
  
  // 根据级别输出到不同 console 方法
  switch (level) {
    case 'debug':
      console.debug(logMessage);
      break;
    case 'info':
      console.info(logMessage);
      break;
    case 'warn':
      console.warn(logMessage);
      break;
    case 'error':
      console.error(logMessage);
      break;
  }
}

/**
 * 日志辅助函数
 */
export const logger = {
  debug: (message: string, extra?: Record<string, unknown>) => log('debug', message, extra),
  info: (message: string, extra?: Record<string, unknown>) => log('info', message, extra),
  warn: (message: string, extra?: Record<string, unknown>) => log('warn', message, extra),
  error: (message: string, extra?: Record<string, unknown>) => log('error', message, extra),
};
