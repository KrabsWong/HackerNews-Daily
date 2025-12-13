/**
 * CLI Logger Utility
 * 
 * Provides logging capabilities for CLI mode with both console and file output.
 * Logs are written to the logs/ directory with timestamps.
 */

import * as fs from 'fs';
import * as path from 'path';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
}

class CliLogger {
  private logDir: string = 'logs';
  private logFile: string | null = null;
  private fileEnabled: boolean = false;
  private consoleEnabled: boolean = true;
  private minLevel: LogLevel = 'info';

  private readonly levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  private readonly levelIcons: Record<LogLevel, string> = {
    debug: '🔍',
    info: 'ℹ️',
    warn: '⚠️',
    error: '❌',
  };

  /**
   * Initialize file logging
   * Creates logs/ directory and a timestamped log file
   */
  initFileLogging(): void {
    try {
      // Create logs directory if it doesn't exist
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }

      // Generate log filename with timestamp
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
      const timeStr = now.toISOString().split('T')[1].replace(/:/g, '-').split('.')[0]; // HH-MM-SS
      const filename = `${dateStr}_${timeStr}.log`;
      this.logFile = path.join(this.logDir, filename);
      
      // Write initial log header
      const header = `=== HackerNews Daily CLI Log ===\nStarted: ${now.toISOString()}\n${'='.repeat(40)}\n\n`;
      fs.writeFileSync(this.logFile, header);
      
      this.fileEnabled = true;
      this.info('File logging initialized', { logFile: this.logFile });
    } catch (error) {
      console.error('Failed to initialize file logging:', error);
      this.fileEnabled = false;
    }
  }

  /**
   * Set minimum log level
   */
  setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  /**
   * Enable/disable console output
   */
  setConsoleEnabled(enabled: boolean): void {
    this.consoleEnabled = enabled;
  }

  /**
   * Check if a log level should be output
   */
  private shouldLog(level: LogLevel): boolean {
    return this.levelPriority[level] >= this.levelPriority[this.minLevel];
  }

  /**
   * Format log entry for file output
   */
  private formatForFile(entry: LogEntry): string {
    let line = `[${entry.timestamp}] [${entry.level.toUpperCase().padEnd(5)}] ${entry.message}`;
    if (entry.context && Object.keys(entry.context).length > 0) {
      line += `\n    Context: ${JSON.stringify(entry.context, null, 2).replace(/\n/g, '\n    ')}`;
    }
    return line + '\n';
  }

  /**
   * Format log entry for console output
   */
  private formatForConsole(entry: LogEntry): string {
    const icon = this.levelIcons[entry.level];
    let line = `${icon} ${entry.message}`;
    if (entry.context && Object.keys(entry.context).length > 0 && entry.level === 'debug') {
      line += ` ${JSON.stringify(entry.context)}`;
    }
    return line;
  }

  /**
   * Write log entry to file
   */
  private writeToFile(entry: LogEntry): void {
    if (!this.fileEnabled || !this.logFile) return;
    
    try {
      const formatted = this.formatForFile(entry);
      fs.appendFileSync(this.logFile, formatted);
    } catch (error) {
      // Silently fail file writes to not interrupt CLI
    }
  }

  /**
   * Write log entry to console
   */
  private writeToConsole(entry: LogEntry): void {
    if (!this.consoleEnabled) return;
    
    const formatted = this.formatForConsole(entry);
    
    switch (entry.level) {
      case 'error':
        console.error(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      default:
        console.log(formatted);
    }
  }

  /**
   * Log a message at the specified level
   */
  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog(level)) return;
    
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
    };
    
    this.writeToFile(entry);
    this.writeToConsole(entry);
  }

  /**
   * Log debug message (only written to file by default)
   */
  debug(message: string, context?: Record<string, unknown>): void {
    this.log('debug', message, context);
  }

  /**
   * Log info message
   */
  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, context);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, context);
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error | unknown, context?: Record<string, unknown>): void {
    const errorContext: Record<string, unknown> = { ...context };
    
    if (error instanceof Error) {
      errorContext.errorName = error.name;
      errorContext.errorMessage = error.message;
      errorContext.errorStack = error.stack;
    } else if (error !== undefined) {
      errorContext.error = String(error);
    }
    
    this.log('error', message, errorContext);
  }

  /**
   * Log API call details
   */
  apiCall(provider: string, endpoint: string, status: 'start' | 'success' | 'error', details?: Record<string, unknown>): void {
    const message = `API [${provider}] ${endpoint} - ${status.toUpperCase()}`;
    this.debug(message, details);
  }

  /**
   * Log processing step
   */
  step(stepName: string, details?: Record<string, unknown>): void {
    this.info(`Step: ${stepName}`, details);
  }

  /**
   * Log processing progress
   */
  progress(current: number, total: number, label: string): void {
    const percentage = Math.round((current / total) * 100);
    this.debug(`Progress: ${label} - ${current}/${total} (${percentage}%)`, { current, total, percentage });
  }

  /**
   * Get the current log file path
   */
  getLogFilePath(): string | null {
    return this.logFile;
  }

  /**
   * Write a summary at the end of the log
   */
  summary(metrics: Record<string, unknown>): void {
    if (!this.fileEnabled || !this.logFile) return;
    
    try {
      const summary = `\n${'='.repeat(40)}\n=== Summary ===\nCompleted: ${new Date().toISOString()}\n${JSON.stringify(metrics, null, 2)}\n`;
      fs.appendFileSync(this.logFile, summary);
    } catch {
      // Silently fail
    }
  }
}

// Export singleton instance
export const logger = new CliLogger();

// Export types for external use
export type { LogLevel, LogEntry };
