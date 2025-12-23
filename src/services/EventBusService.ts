/**
 * Event Bus Service - Central event management system
 * Provides decoupled communication between services
 */

import { EventEmitter } from 'events';
import { AppEvent } from '../types';

export class EventBusService extends EventEmitter {
  private eventHistory: AppEvent[] = [];
  private maxHistorySize = 1000;

  constructor() {
    super();
  }

  public async initialize(): Promise<void> {
    this.emit('initialized');
  }

  public emit(event: string, payload?: any): boolean {
    const appEvent: AppEvent = {
      type: event,
      payload,
      timestamp: Date.now(),
      source: 'EventBusService'
    };

    this.eventHistory.push(appEvent);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    return super.emit(event, payload);
  }

  public getEventHistory(): AppEvent[] {
    return [...this.eventHistory];
  }

  public getRecentEvents(count: number = 10): AppEvent[] {
    return this.eventHistory.slice(-count);
  }

  public clearHistory(): void {
    this.eventHistory = [];
  }

  public getStatus(): any {
    return {
      eventHistorySize: this.eventHistory.length,
      listenerCount: this.eventNames().length
    };
  }
}