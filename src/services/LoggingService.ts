/**
 * Logging Service - Centralized logging system
 * Provides structured logging with different levels and persistence
 */

import { EventEmitter } from 'events';

export interface LogEntry {
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
  data?: any;
  timestamp: number;
  source?: string;
}

export class LoggingService extends EventEmitter {
  private logs: LogEntry[] = [];
  private maxLogSize = 1000;

  constructor() {
    super();
  }

  public async initialize(): Promise<void> {
    this.emit('initialized');
  }

  public error(message: string, data?: any): void {
    this.log('error', message, data);
  }

  public warn(message: string, data?: any): void {
    this.log('warn', message, data);
  }

  public info(message: string, data?: any): void {
    this.log('info', message, data);
  }

  public debug(message: string, data?: any): void {
    this.log('debug', message, data);
  }

  private log(level: LogEntry['level'], message: string, data?: any): void {
    const entry: LogEntry = {
      level,
      message,
      data,
      timestamp: Date.now(),
      source: 'LoggingService'
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogSize) {
      this.logs.shift();
    }

    // Console output
    const timestamp = new Date(entry.timestamp).toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    switch (level) {
      case 'error':
        console.error(logMessage, data);
        break;
      case 'warn':
        console.warn(logMessage, data);
        break;
      case 'info':
        console.info(logMessage, data);
        break;
      case 'debug':
        console.debug(logMessage, data);
        break;
    }

    this.emit('logEntry', entry);
  }

  public getLogs(): LogEntry[] {
    return [...this.logs];
  }

  public getLogsByLevel(level: LogEntry['level']): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  public clearLogs(): void {
    this.logs = [];
    this.emit('logsCleared');
  }

  public getStatus(): any {
    return {
      logCount: this.logs.length,
      errorCount: this.logs.filter(l => l.level === 'error').length,
      warnCount: this.logs.filter(l => l.level === 'warn').length
    };
  }
}