import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, unlinkSync } from 'fs';
import { join } from 'path';

/**
 * 日志级别
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * 日志服务名称
 */
export const LOG_SERVICE = 'php-flow-agent';

// ============================================================
// 日志配置相关
// ============================================================

/** 默认日志配置 */
const DEFAULT_LOG_CONFIG = {
  console: false,
  file: false,
  level: 'info' as LogLevel,
};

/** 当前生效的日志配置 */
let logConfig = { ...DEFAULT_LOG_CONFIG };

/** 日志级别顺序，用于级别过滤 */
const LOG_LEVELS: LogLevel[] = ['debug', 'info', 'warn', 'error'];

/**
 * 加载用户日志配置
 * 从 ~/.config/opencode/php-flow-agent.json 读取 logging 配置
 */
function loadLogConfig(): void {
  try {
    const configPath = join(
      process.env.USERPROFILE || process.env.HOME || '~',
      '.config',
      'opencode',
      'php-flow-agent.json'
    );
    if (!existsSync(configPath)) return;

    const content = readFileSync(configPath, 'utf-8');
    const config = JSON.parse(content);
    if (config.logging) {
      logConfig = { ...DEFAULT_LOG_CONFIG, ...config.logging };
    }
  } catch {
    // 配置文件不存在或解析失败，使用默认配置
  }
}

// 模块加载时同步读取配置
loadLogConfig();

/**
 * 获取当前日志配置（只读）
 */
export function getLogConfig(): Readonly<typeof logConfig> {
  return { ...logConfig };
}

/**
 * 重新加载日志配置（用于运行时配置变更）
 */
export function reloadLogConfig(): void {
  loadLogConfig();
}

// ============================================================
// 文件日志相关
// ============================================================

/** 日志文件目录 */
const LOG_DIR = join(process.env.USERPROFILE || process.env.HOME || '~', '.config', 'opencode', 'logs', 'php-flow-agent');
/** 最大保留日志文件数 */
const MAX_LOG_FILES = 5;

/**
 * 获取当天日志文件路径
 */
function getLogFilePath(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return join(LOG_DIR, `${year}-${month}-${day}.log`);
}

/**
 * 清理超过 MAX_LOG_FILES 的最老日志文件
 */
function cleanupOldLogs(): void {
  if (!existsSync(LOG_DIR)) return;

  try {
    const files = readdirSync(LOG_DIR)
      .filter(f => f.endsWith('.log'))
      .map(f => ({
        name: f,
        path: join(LOG_DIR, f),
        time: statSync(join(LOG_DIR, f)).mtime.getTime(),
      }))
      .sort((a, b) => a.time - b.time);

    while (files.length > MAX_LOG_FILES) {
      const oldest = files.shift();
      if (oldest) {
        unlinkSync(oldest.path);
      }
    }
  } catch {
    // 清理失败不影响日志写入
  }
}

/**
 * 确保日志目录存在
 */
function ensureLogDir(): void {
  if (!existsSync(LOG_DIR)) {
    mkdirSync(LOG_DIR, { recursive: true });
  }
}

/**
 * 写入文件日志（无 ANSI 颜色码）
 */
function writeToFile(level: LogLevel, message: string, extra?: Record<string, unknown>): void {
  ensureLogDir();
  cleanupOldLogs();
  const logFile = getLogFilePath();
  const timestamp = new Date().toISOString();
  const extraStr = extra ? ` ${JSON.stringify(extra)}` : '';
  const logLine = `[${timestamp}] [${level.toUpperCase()}] ${message}${extraStr}\n`;
  try {
    appendFileSync(logFile, logLine, 'utf-8');
  } catch {
    // 文件写入失败不影响控制台输出
  }
}

/**
 * 去除字符串中的 ANSI 转义序列
 */
function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * 简单日志函数（兼容 OpenCode client.app.log）
 */
export function log(
  level: LogLevel,
  message: string,
  extra?: Record<string, unknown>
): void {
  // 级别过滤：低于配置级别的消息不输出
  const currentLevelIndex = LOG_LEVELS.indexOf(logConfig.level);
  const msgLevelIndex = LOG_LEVELS.indexOf(level);
  if (msgLevelIndex < currentLevelIndex) return;

  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${LOG_SERVICE}] [${level.toUpperCase()}]`;

  const logMessage = extra
    ? `${prefix} ${message} ${JSON.stringify(extra)}`
    : `${prefix} ${message}`;

  // console 输出（可配置关闭）
  if (logConfig.console) {
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

  // 文件输出（可配置关闭）
  if (logConfig.file) {
    writeToFile(level, message, extra);
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

// ============================================================
// ANSI 颜色常量（与 index.ts 中使用的颜色码一致）
// ============================================================

/** ANSI 颜色码常量 */
export const ANSI_COLORS = {
  red: '\x1b[31m',    // 红色：权限拦截
  green: '\x1b[32m',  // 绿色：权限通过
  yellow: '\x1b[33m', // 黄色：插件启动
  cyan: '\x1b[36m',   // 青色：调用链追踪
  reset: '\x1b[0m',   // 重置
} as const;

// ============================================================
// Hook 专用日志函数（带颜色）
// ============================================================

/** Hook 状态类型 */
export type HookStatus = 'ok' | 'error' | 'info' | 'warn';

/** Hook 日志类别 */
export type HookCategory = 'HOOK' | 'TRACE' | 'PLUGIN';

/**
 * Hook 专用日志函数（带颜色标记）
 * @param category 日志类别：'HOOK' | 'TRACE' | 'PLUGIN'
 * @param message 日志消息内容
 * @param status 状态标记，决定输出颜色：'ok' | 'error' | 'info' | 'warn'
 */
export function hookLog(
  category: HookCategory,
  message: string,
  status?: HookStatus
): void {
  // 根据 status 映射日志级别
  const fileLevel: LogLevel = status === 'error' ? 'error' : status === 'warn' ? 'warn' : 'info';

  // 级别过滤
  const currentLevelIndex = LOG_LEVELS.indexOf(logConfig.level);
  const msgLevelIndex = LOG_LEVELS.indexOf(fileLevel);
  if (msgLevelIndex < currentLevelIndex) return;

  const colors: Record<string, string> = {
    ok: ANSI_COLORS.green,    // 绿色
    error: ANSI_COLORS.red,   // 红色
    info: ANSI_COLORS.cyan,   // 青色
    warn: ANSI_COLORS.yellow, // 黄色
  };

  const color = status ? (colors[status] || '') : '';
  const fullMsg = `${color}[php-flow-agent][${category}] ${message}${ANSI_COLORS.reset}`;

  // console 输出（可配置关闭）
  if (logConfig.console) {
    console.log(fullMsg);
  }

  // 文件输出（去除 ANSI 颜色码，可配置关闭）
  if (logConfig.file) {
    const plainMsg = stripAnsi(fullMsg);
    writeToFile(fileLevel, plainMsg);
  }
}
