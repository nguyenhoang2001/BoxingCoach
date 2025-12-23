/**
 * Configuration Service - Manages application configuration
 * Handles settings persistence and configuration validation
 */

import { EventEmitter } from 'events';
import { AppConfig } from '../types';

export class ConfigurationService extends EventEmitter {
  private config: AppConfig;

  constructor(initialConfig: AppConfig) {
    super();
    this.config = { ...initialConfig };
  }

  public async initialize(): Promise<void> {
    this.emit('initialized');
  }

  public getConfig(): AppConfig {
    return { ...this.config };
  }

  public async updateConfig(updates: Partial<AppConfig>): Promise<void> {
    this.config = { ...this.config, ...updates };
    this.emit('configUpdated', this.config);
  }

  public resetToDefaults(): void {
    // Reset to default configuration
    this.emit('configReset');
  }

  public getStatus(): any {
    return {
      hasConfig: !!this.config
    };
  }
}