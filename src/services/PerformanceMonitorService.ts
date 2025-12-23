/**
 * Performance Monitor Service - Tracks and optimizes application performance
 * Monitors FPS, processing time, memory usage, and provides optimization recommendations
 */

import { EventEmitter } from 'events';
import { PerformanceMetrics, AppError } from '../types';

export class PerformanceMonitorService extends EventEmitter {
  private metrics: PerformanceMetrics;
  private frameHistory: Array<{
    timestamp: number;
    processingTime: number;
    memoryUsage: number;
  }> = [];
  private observer: PerformanceObserver | null = null;
  private isMonitoring = false;
  private frameStartTime = 0;
  private measurementBuffer = new Map<string, number>();

  constructor() {
    super();
    this.metrics = {
      frameRate: 0,
      averageProcessingTime: 0,
      memoryUsage: 0,
      droppedFrames: 0,
      modelInferenceTime: 0,
      renderingTime: 0,
      overallHealth: 'poor'
    };

    this.initializePerformanceObserver();
  }

  private initializePerformanceObserver(): void {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      try {
        this.observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.entryType === 'measure') {
              this.updateMetrics(entry);
            }
          });
        });

        this.observer.observe({ entryTypes: ['measure', 'navigation'] });
      } catch (error) {
        console.warn('PerformanceObserver not supported or failed to initialize:', error);
      }
    }
  }

  public async initialize(): Promise<void> {
    this.isMonitoring = true;
    this.emit('initialized');
  }

  public startFrameProcessing(): void {
    if (!this.isMonitoring) return;
    
    this.frameStartTime = performance.now();
    performance.mark('frame-start');
  }

  public endFrameProcessing(): void {
    if (!this.isMonitoring || this.frameStartTime === 0) return;

    const endTime = performance.now();
    const processingTime = endTime - this.frameStartTime;
    
    performance.mark('frame-end');
    performance.measure('frame-processing', 'frame-start', 'frame-end');
    
    this.frameHistory.push({
      timestamp: endTime,
      processingTime,
      memoryUsage: this.getMemoryUsage()
    });

    // Keep only last 100 frames
    if (this.frameHistory.length > 100) {
      this.frameHistory.shift();
    }

    this.calculateMetrics();
    this.frameStartTime = 0;
  }

  private updateMetrics(entry: PerformanceEntry): void {
    switch (entry.name) {
      case 'model-inference':
        this.metrics.modelInferenceTime = entry.duration;
        break;
      case 'rendering':
        this.metrics.renderingTime = entry.duration;
        break;
      case 'frame-processing':
        // Frame processing time is handled in endFrameProcessing
        break;
    }
  }

  private calculateMetrics(): void {
    if (this.frameHistory.length < 2) return;

    // Calculate frame rate
    const recentFrames = this.frameHistory.slice(-30); // Last 30 frames
    if (recentFrames.length > 1) {
      const timeSpan = recentFrames[recentFrames.length - 1].timestamp - recentFrames[0].timestamp;
      this.metrics.frameRate = Math.round(((recentFrames.length - 1) / (timeSpan / 1000)) * 10) / 10;
    }

    // Calculate average processing time
    const processingTimes = recentFrames.map(f => f.processingTime);
    this.metrics.averageProcessingTime = Math.round(
      (processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length) * 10
    ) / 10;

    // Calculate memory usage
    this.metrics.memoryUsage = this.getMemoryUsage();

    // Calculate dropped frames (frames that took longer than 16.67ms for 60 FPS)
    const targetFrameTime = 1000 / 60;
    this.metrics.droppedFrames = this.frameHistory.filter(f => f.processingTime > targetFrameTime).length;

    // Calculate overall health
    this.metrics.overallHealth = this.calculateOverallHealth();

    // Emit metrics update
    this.emit('metrics', this.metrics);
  }

  private calculateOverallHealth(): 'excellent' | 'good' | 'fair' | 'poor' {
    const { frameRate, averageProcessingTime, memoryUsage, droppedFrames } = this.metrics;
    
    let score = 100;
    
    // Frame rate impact (40% weight)
    if (frameRate >= 30) score -= 0;
    else if (frameRate >= 25) score -= 10;
    else if (frameRate >= 20) score -= 25;
    else if (frameRate >= 15) score -= 40;
    else score -= 60;
    
    // Processing time impact (30% weight)
    if (averageProcessingTime <= 16.67) score -= 0;
    else if (averageProcessingTime <= 33.33) score -= 15;
    else if (averageProcessingTime <= 50) score -= 25;
    else score -= 35;
    
    // Memory usage impact (20% weight)
    if (memoryUsage <= 256) score -= 0;
    else if (memoryUsage <= 512) score -= 10;
    else if (memoryUsage <= 1024) score -= 15;
    else score -= 20;
    
    // Dropped frames impact (10% weight)
    if (droppedFrames <= 2) score -= 0;
    else if (droppedFrames <= 5) score -= 5;
    else if (droppedFrames <= 10) score -= 8;
    else score -= 10;
    
    if (score >= 85) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'fair';
    return 'poor';
  }

  private getMemoryUsage(): number {
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in (performance as any)) {
      return Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024); // MB
    }
    return 0;
  }

  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  public startMeasurement(name: string): void {
    if (!this.isMonitoring) return;
    
    const startTime = performance.now();
    this.measurementBuffer.set(name, startTime);
    performance.mark(`${name}-start`);
  }

  public endMeasurement(name: string): number {
    if (!this.isMonitoring) return 0;
    
    const startTime = this.measurementBuffer.get(name);
    if (!startTime) return 0;
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);
    
    this.measurementBuffer.delete(name);
    return duration;
  }

  public getOptimizationRecommendations(): string[] {
    const recommendations: string[] = [];

    if (this.metrics.frameRate < 25) {
      recommendations.push('Consider reducing video resolution or frame rate');
    }

    if (this.metrics.averageProcessingTime > 33) {
      recommendations.push('Processing time is high - consider using MoveNet Lightning model');
    }

    if (this.metrics.memoryUsage > 500) {
      recommendations.push('Memory usage is high - check for memory leaks');
    }

    if (this.metrics.droppedFrames > 5) {
      recommendations.push('Too many dropped frames - optimize rendering pipeline');
    }

    if (this.metrics.modelInferenceTime > 20) {
      recommendations.push('Model inference is slow - consider WebGL backend or quantized models');
    }

    if (this.metrics.renderingTime > 16) {
      recommendations.push('Rendering is slow - consider reducing overlay complexity');
    }

    if (recommendations.length === 0) {
      recommendations.push('Performance is optimal');
    }

    return recommendations;
  }

  public getPerformanceReport(): {
    metrics: PerformanceMetrics;
    recommendations: string[];
    history: Array<{ timestamp: number; frameRate: number; processingTime: number; memoryUsage: number }>;
  } {
    const history = this.frameHistory.slice(-50).map(frame => ({
      timestamp: frame.timestamp,
      frameRate: this.metrics.frameRate,
      processingTime: frame.processingTime,
      memoryUsage: frame.memoryUsage
    }));

    return {
      metrics: this.getMetrics(),
      recommendations: this.getOptimizationRecommendations(),
      history
    };
  }

  public reset(): void {
    this.frameHistory = [];
    this.measurementBuffer.clear();
    this.metrics = {
      frameRate: 0,
      averageProcessingTime: 0,
      memoryUsage: 0,
      droppedFrames: 0,
      modelInferenceTime: 0,
      renderingTime: 0,
      overallHealth: 'poor'
    };

    this.emit('reset');
  }

  public getStatus(): {
    isMonitoring: boolean;
    frameHistoryLength: number;
    activeMeasurements: number;
    health: string;
  } {
    return {
      isMonitoring: this.isMonitoring,
      frameHistoryLength: this.frameHistory.length,
      activeMeasurements: this.measurementBuffer.size,
      health: this.metrics.overallHealth
    };
  }

  public async stop(): Promise<void> {
    this.isMonitoring = false;
    this.emit('stopped');
  }

  public dispose(): void {
    this.isMonitoring = false;
    
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    
    this.reset();
    this.removeAllListeners();
  }

  // Utility methods for external performance tracking
  public trackAsyncOperation<T>(name: string, operation: () => Promise<T>): Promise<T> {
    return new Promise(async (resolve, reject) => {
      this.startMeasurement(name);
      try {
        const result = await operation();
        this.endMeasurement(name);
        resolve(result);
      } catch (error) {
        this.endMeasurement(name);
        reject(error);
      }
    });
  }

  public trackSyncOperation<T>(name: string, operation: () => T): T {
    this.startMeasurement(name);
    try {
      const result = operation();
      this.endMeasurement(name);
      return result;
    } catch (error) {
      this.endMeasurement(name);
      throw error;
    }
  }

  // Performance warning system
  public enablePerformanceWarnings(thresholds: {
    frameRate?: number;
    processingTime?: number;
    memoryUsage?: number;
  } = {}): void {
    const defaultThresholds = {
      frameRate: 20,
      processingTime: 50,
      memoryUsage: 512
    };

    const finalThresholds = { ...defaultThresholds, ...thresholds };

    this.on('metrics', (metrics: PerformanceMetrics) => {
      if (metrics.frameRate < finalThresholds.frameRate) {
        this.emit('performanceWarning', {
          type: 'lowFrameRate',
          value: metrics.frameRate,
          threshold: finalThresholds.frameRate,
          message: `Frame rate dropped to ${metrics.frameRate} FPS`
        });
      }

      if (metrics.averageProcessingTime > finalThresholds.processingTime) {
        this.emit('performanceWarning', {
          type: 'highProcessingTime',
          value: metrics.averageProcessingTime,
          threshold: finalThresholds.processingTime,
          message: `Processing time increased to ${metrics.averageProcessingTime}ms`
        });
      }

      if (metrics.memoryUsage > finalThresholds.memoryUsage) {
        this.emit('performanceWarning', {
          type: 'highMemoryUsage',
          value: metrics.memoryUsage,
          threshold: finalThresholds.memoryUsage,
          message: `Memory usage increased to ${metrics.memoryUsage}MB`
        });
      }
    });
  }
}