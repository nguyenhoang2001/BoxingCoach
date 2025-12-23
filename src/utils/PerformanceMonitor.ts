/**
 * Performance monitoring utility for pose detection
 */

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  cpuUsage: number;
  memoryUsage: number;
  gpuUsage?: number;
  detectionTime: number;
  smoothingTime: number;
  validationTime: number;
  renderTime: number;
  totalFrames: number;
  droppedFrames: number;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics;
  private frameStartTime: number = 0;
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private droppedFrames: number = 0;
  private fpsHistory: number[] = [];
  private maxHistorySize: number = 60; // 1 second at 60fps
  
  private timers: Map<string, number> = new Map();
  private durations: Map<string, number[]> = new Map();

  constructor() {
    this.metrics = {
      fps: 0,
      frameTime: 0,
      cpuUsage: 0,
      memoryUsage: 0,
      detectionTime: 0,
      smoothingTime: 0,
      validationTime: 0,
      renderTime: 0,
      totalFrames: 0,
      droppedFrames: 0
    };
  }

  /**
   * Start timing a specific operation
   */
  startTimer(operation: string): void {
    this.timers.set(operation, performance.now());
  }

  /**
   * End timing and record duration
   */
  endTimer(operation: string): number {
    const startTime = this.timers.get(operation);
    if (!startTime) {
      console.warn(`Timer for operation '${operation}' was not started`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.timers.delete(operation);

    // Store duration in history
    if (!this.durations.has(operation)) {
      this.durations.set(operation, []);
    }
    
    const history = this.durations.get(operation)!;
    history.push(duration);
    
    // Keep only recent history
    if (history.length > this.maxHistorySize) {
      history.shift();
    }

    return duration;
  }

  /**
   * Get average duration for an operation
   */
  getAverageDuration(operation: string): number {
    const history = this.durations.get(operation);
    if (!history || history.length === 0) {
      return 0;
    }

    return history.reduce((sum, duration) => sum + duration, 0) / history.length;
  }

  /**
   * Start frame timing
   */
  startFrame(): void {
    this.frameStartTime = performance.now();
    this.frameCount++;
  }

  /**
   * End frame timing and update metrics
   */
  endFrame(): void {
    const currentTime = performance.now();
    const frameTime = currentTime - this.frameStartTime;
    
    // Update frame time
    this.metrics.frameTime = frameTime;
    this.metrics.totalFrames = this.frameCount;
    this.metrics.droppedFrames = this.droppedFrames;

    // Calculate FPS
    if (this.lastFrameTime > 0) {
      const fps = 1000 / (currentTime - this.lastFrameTime);
      this.fpsHistory.push(fps);
      
      // Keep only recent FPS history
      if (this.fpsHistory.length > this.maxHistorySize) {
        this.fpsHistory.shift();
      }
      
      // Calculate average FPS
      this.metrics.fps = this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length;
    }
    
    this.lastFrameTime = currentTime;

    // Update timing metrics
    this.metrics.detectionTime = this.getAverageDuration('detection');
    this.metrics.smoothingTime = this.getAverageDuration('smoothing');
    this.metrics.validationTime = this.getAverageDuration('validation');
    this.metrics.renderTime = this.getAverageDuration('render');

    // Update memory usage
    this.updateMemoryUsage();

    // Check for dropped frames
    this.checkDroppedFrames();
  }

  /**
   * Record a dropped frame
   */
  recordDroppedFrame(): void {
    this.droppedFrames++;
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics = {
      fps: 0,
      frameTime: 0,
      cpuUsage: 0,
      memoryUsage: 0,
      detectionTime: 0,
      smoothingTime: 0,
      validationTime: 0,
      renderTime: 0,
      totalFrames: 0,
      droppedFrames: 0
    };
    
    this.frameCount = 0;
    this.droppedFrames = 0;
    this.fpsHistory = [];
    this.timers.clear();
    this.durations.clear();
  }

  /**
   * Update memory usage metrics
   */
  private updateMemoryUsage(): void {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const memory = (performance as any).memory;
      this.metrics.memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // MB
    }
  }

  /**
   * Check for dropped frames based on target FPS
   */
  private checkDroppedFrames(targetFPS: number = 30): void {
    const expectedFrameTime = 1000 / targetFPS;
    
    if (this.metrics.frameTime > expectedFrameTime * 1.5) {
      this.recordDroppedFrame();
    }
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): string {
    const metrics = this.getMetrics();
    
    return `
Performance Summary:
- FPS: ${metrics.fps.toFixed(1)}
- Frame Time: ${metrics.frameTime.toFixed(2)}ms
- Memory Usage: ${metrics.memoryUsage.toFixed(1)}MB
- Detection Time: ${metrics.detectionTime.toFixed(2)}ms
- Smoothing Time: ${metrics.smoothingTime.toFixed(2)}ms
- Validation Time: ${metrics.validationTime.toFixed(2)}ms
- Render Time: ${metrics.renderTime.toFixed(2)}ms
- Total Frames: ${metrics.totalFrames}
- Dropped Frames: ${metrics.droppedFrames} (${((metrics.droppedFrames / metrics.totalFrames) * 100).toFixed(1)}%)
    `.trim();
  }

  /**
   * Log performance metrics to console
   */
  logMetrics(): void {
    console.log(this.getPerformanceSummary());
  }

  /**
   * Check if performance is optimal
   */
  isPerformanceOptimal(targetFPS: number = 30): boolean {
    const metrics = this.getMetrics();
    
    return (
      metrics.fps >= targetFPS * 0.9 && // Within 10% of target FPS
      metrics.frameTime <= (1000 / targetFPS) * 1.2 && // Frame time not too high
      metrics.memoryUsage < 500 && // Less than 500MB
      (metrics.droppedFrames / metrics.totalFrames) < 0.05 // Less than 5% dropped frames
    );
  }

  /**
   * Get performance warnings
   */
  getPerformanceWarnings(targetFPS: number = 30): string[] {
    const warnings: string[] = [];
    const metrics = this.getMetrics();
    
    if (metrics.fps < targetFPS * 0.8) {
      warnings.push(`Low FPS: ${metrics.fps.toFixed(1)} (target: ${targetFPS})`);
    }
    
    if (metrics.frameTime > (1000 / targetFPS) * 1.5) {
      warnings.push(`High frame time: ${metrics.frameTime.toFixed(2)}ms`);
    }
    
    if (metrics.memoryUsage > 1000) {
      warnings.push(`High memory usage: ${metrics.memoryUsage.toFixed(1)}MB`);
    }
    
    if (metrics.detectionTime > 20) {
      warnings.push(`Slow detection: ${metrics.detectionTime.toFixed(2)}ms`);
    }
    
    if ((metrics.droppedFrames / metrics.totalFrames) > 0.1) {
      warnings.push(`High dropped frames: ${((metrics.droppedFrames / metrics.totalFrames) * 100).toFixed(1)}%`);
    }
    
    return warnings;
  }

  /**
   * Export metrics to JSON
   */
  exportMetrics(): string {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      metrics: this.getMetrics(),
      averageDurations: Object.fromEntries(
        Array.from(this.durations.entries()).map(([op, durations]) => [
          op,
          durations.reduce((sum, d) => sum + d, 0) / durations.length
        ])
      )
    }, null, 2);
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();