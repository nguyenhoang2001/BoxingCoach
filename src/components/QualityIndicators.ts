/**
 * QualityIndicators - Real-time quality and confidence metrics display
 * Monitors pose estimation quality, tracking stability, and system performance
 * Provides visual feedback for gait analysis reliability
 */

import { 
  QualityMetrics, 
  PerformanceMetrics, 
  Pose, 
  VisualizationSettings,
  ValidationResult
} from '../types/gait';

export interface QualityIndicatorConfig {
  container: HTMLElement;
  showDetailedMetrics: boolean;
  showPerformanceMetrics: boolean;
  updateInterval: number;
  alertThresholds: {
    overallQuality: number;
    trackingStability: number;
    keypointVisibility: number;
    frameRate: number;
    memoryUsage: number;
  };
}

export class QualityIndicators {
  private container: HTMLElement;
  private config: QualityIndicatorConfig;
  private settings: VisualizationSettings;
  private currentMetrics: QualityMetrics | null = null;
  private performanceMetrics: PerformanceMetrics | null = null;
  private updateTimer: number | null = null;
  private alertsContainer: HTMLElement | null = null;

  // Quality thresholds for different levels
  private readonly qualityThresholds = {
    excellent: 0.9,
    good: 0.7,
    fair: 0.5,
    poor: 0.3
  };

  constructor(config: QualityIndicatorConfig, settings: VisualizationSettings) {
    this.config = config;
    this.settings = settings;
    this.container = config.container;
    this.initializeUI();
    this.startUpdateTimer();
  }

  private initializeUI(): void {
    this.container.innerHTML = `
      <div class="quality-indicators">
        <div class="quality-header">
          <h3>System Quality</h3>
          <div class="overall-status">
            <div class="status-indicator" id="overall-status"></div>
            <span class="status-text">Initializing...</span>
          </div>
        </div>

        <div class="quality-metrics">
          <div class="metric-card" data-metric="overallQuality">
            <div class="metric-icon">
              <svg width="24" height="24" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <div class="metric-info">
              <div class="metric-label">Overall Quality</div>
              <div class="metric-value">--%</div>
            </div>
            <div class="metric-bar">
              <div class="metric-fill"></div>
            </div>
          </div>

          <div class="metric-card" data-metric="trackingStability">
            <div class="metric-icon">
              <svg width="24" height="24" viewBox="0 0 24 24">
                <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
              </svg>
            </div>
            <div class="metric-info">
              <div class="metric-label">Tracking Stability</div>
              <div class="metric-value">--%</div>
            </div>
            <div class="metric-bar">
              <div class="metric-fill"></div>
            </div>
          </div>

          <div class="metric-card" data-metric="keypointVisibility">
            <div class="metric-icon">
              <svg width="24" height="24" viewBox="0 0 24 24">
                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
              </svg>
            </div>
            <div class="metric-info">
              <div class="metric-label">Keypoint Visibility</div>
              <div class="metric-value">--%</div>
            </div>
            <div class="metric-bar">
              <div class="metric-fill"></div>
            </div>
          </div>

          <div class="metric-card" data-metric="temporalConsistency">
            <div class="metric-icon">
              <svg width="24" height="24" viewBox="0 0 24 24">
                <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
              </svg>
            </div>
            <div class="metric-info">
              <div class="metric-label">Temporal Consistency</div>
              <div class="metric-value">--%</div>
            </div>
            <div class="metric-bar">
              <div class="metric-fill"></div>
            </div>
          </div>
        </div>

        <div class="detailed-metrics" style="display: ${this.config.showDetailedMetrics ? 'block' : 'none'}">
          <div class="metrics-section">
            <h4>Detailed Analysis</h4>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">Calibration Accuracy:</span>
                <span class="detail-value" id="calibration-accuracy">--%</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Pose Confidence:</span>
                <span class="detail-value" id="pose-confidence">--%</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Joint Tracking:</span>
                <span class="detail-value" id="joint-tracking">--%</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Motion Smoothness:</span>
                <span class="detail-value" id="motion-smoothness">--%</span>
              </div>
            </div>
          </div>
        </div>

        <div class="performance-metrics" style="display: ${this.config.showPerformanceMetrics ? 'block' : 'none'}">
          <div class="metrics-section">
            <h4>Performance</h4>
            <div class="performance-grid">
              <div class="performance-item">
                <div class="performance-icon">⚡</div>
                <div class="performance-info">
                  <div class="performance-label">Frame Rate</div>
                  <div class="performance-value" id="frame-rate">-- FPS</div>
                </div>
              </div>
              <div class="performance-item">
                <div class="performance-icon">🧠</div>
                <div class="performance-info">
                  <div class="performance-label">Memory Usage</div>
                  <div class="performance-value" id="memory-usage">-- MB</div>
                </div>
              </div>
              <div class="performance-item">
                <div class="performance-icon">⏱️</div>
                <div class="performance-info">
                  <div class="performance-label">Latency</div>
                  <div class="performance-value" id="processing-latency">-- ms</div>
                </div>
              </div>
              <div class="performance-item">
                <div class="performance-icon">📊</div>
                <div class="performance-info">
                  <div class="performance-label">Dropped Frames</div>
                  <div class="performance-value" id="dropped-frames">--</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="alerts-container" id="alerts-container">
          <!-- Alerts will be dynamically added here -->
        </div>
      </div>
    `;

    this.alertsContainer = this.container.querySelector('#alerts-container');
  }

  /**
   * Update quality metrics display
   */
  public updateQualityMetrics(metrics: QualityMetrics): void {
    this.currentMetrics = metrics;
    
    // Update overall status
    this.updateOverallStatus(metrics.overallQuality);
    
    // Update individual metrics
    this.updateMetric('overallQuality', metrics.overallQuality);
    this.updateMetric('trackingStability', metrics.trackingStability);
    this.updateMetric('keypointVisibility', metrics.keypointVisibility);
    this.updateMetric('temporalConsistency', metrics.temporalConsistency);
    
    // Update detailed metrics
    if (this.config.showDetailedMetrics) {
      this.updateDetailedMetrics(metrics);
    }
    
    // Check for alerts
    this.checkQualityAlerts(metrics);
  }

  private updateOverallStatus(overallQuality: number): void {
    const statusIndicator = this.container.querySelector('#overall-status') as HTMLElement;
    const statusText = this.container.querySelector('.status-text') as HTMLElement;
    
    if (statusIndicator && statusText) {
      const { color, text } = this.getQualityStatus(overallQuality);
      statusIndicator.style.backgroundColor = color;
      statusText.textContent = text;
    }
  }

  private updateMetric(metricName: string, value: number): void {
    const card = this.container.querySelector(`[data-metric="${metricName}"]`) as HTMLElement;
    if (!card) return;

    const valueElement = card.querySelector('.metric-value') as HTMLElement;
    const fillElement = card.querySelector('.metric-fill') as HTMLElement;
    
    if (valueElement) {
      valueElement.textContent = `${(value * 100).toFixed(0)}%`;
    }
    
    if (fillElement) {
      fillElement.style.width = `${value * 100}%`;
      fillElement.style.backgroundColor = this.getMetricColor(value);
    }
  }

  private updateDetailedMetrics(metrics: QualityMetrics): void {
    const calibrationElement = this.container.querySelector('#calibration-accuracy') as HTMLElement;
    const poseConfidenceElement = this.container.querySelector('#pose-confidence') as HTMLElement;
    const jointTrackingElement = this.container.querySelector('#joint-tracking') as HTMLElement;
    const motionSmoothnessElement = this.container.querySelector('#motion-smoothness') as HTMLElement;
    
    if (calibrationElement) {
      calibrationElement.textContent = `${(metrics.calibrationAccuracy * 100).toFixed(1)}%`;
    }
    
    if (poseConfidenceElement) {
      poseConfidenceElement.textContent = `${(metrics.overallQuality * 100).toFixed(1)}%`;
    }
    
    if (jointTrackingElement) {
      jointTrackingElement.textContent = `${(metrics.keypointVisibility * 100).toFixed(1)}%`;
    }
    
    if (motionSmoothnessElement) {
      motionSmoothnessElement.textContent = `${(metrics.temporalConsistency * 100).toFixed(1)}%`;
    }
  }

  /**
   * Update performance metrics display
   */
  public updatePerformanceMetrics(metrics: PerformanceMetrics): void {
    this.performanceMetrics = metrics;
    
    if (!this.config.showPerformanceMetrics) return;
    
    const frameRateElement = this.container.querySelector('#frame-rate') as HTMLElement;
    const memoryElement = this.container.querySelector('#memory-usage') as HTMLElement;
    const latencyElement = this.container.querySelector('#processing-latency') as HTMLElement;
    const droppedFramesElement = this.container.querySelector('#dropped-frames') as HTMLElement;
    
    if (frameRateElement) {
      frameRateElement.textContent = `${metrics.frameRate.toFixed(1)} FPS`;
      frameRateElement.style.color = this.getFrameRateColor(metrics.frameRate);
    }
    
    if (memoryElement) {
      memoryElement.textContent = `${metrics.memoryUsage.toFixed(1)} MB`;
      memoryElement.style.color = this.getMemoryColor(metrics.memoryUsage);
    }
    
    if (latencyElement) {
      latencyElement.textContent = `${metrics.processingLatency.toFixed(1)} ms`;
      latencyElement.style.color = this.getLatencyColor(metrics.processingLatency);
    }
    
    if (droppedFramesElement) {
      droppedFramesElement.textContent = `${metrics.droppedFrames}`;
      droppedFramesElement.style.color = this.getDroppedFramesColor(metrics.droppedFrames);
    }
    
    // Check for performance alerts
    this.checkPerformanceAlerts(metrics);
  }

  private getQualityStatus(quality: number): { color: string, text: string } {
    if (quality >= this.qualityThresholds.excellent) {
      return { color: '#4CAF50', text: 'Excellent' };
    } else if (quality >= this.qualityThresholds.good) {
      return { color: '#8BC34A', text: 'Good' };
    } else if (quality >= this.qualityThresholds.fair) {
      return { color: '#FFC107', text: 'Fair' };
    } else if (quality >= this.qualityThresholds.poor) {
      return { color: '#FF9800', text: 'Poor' };
    } else {
      return { color: '#F44336', text: 'Critical' };
    }
  }

  private getMetricColor(value: number): string {
    if (value >= 0.8) return '#4CAF50';  // Green
    if (value >= 0.6) return '#8BC34A';  // Light green
    if (value >= 0.4) return '#FFC107';  // Yellow
    if (value >= 0.2) return '#FF9800';  // Orange
    return '#F44336';                    // Red
  }

  private getFrameRateColor(fps: number): string {
    if (fps >= 30) return '#4CAF50';
    if (fps >= 20) return '#FFC107';
    if (fps >= 15) return '#FF9800';
    return '#F44336';
  }

  private getMemoryColor(memoryMB: number): string {
    if (memoryMB < 100) return '#4CAF50';
    if (memoryMB < 200) return '#FFC107';
    if (memoryMB < 500) return '#FF9800';
    return '#F44336';
  }

  private getLatencyColor(latency: number): string {
    if (latency < 50) return '#4CAF50';
    if (latency < 100) return '#FFC107';
    if (latency < 200) return '#FF9800';
    return '#F44336';
  }

  private getDroppedFramesColor(droppedFrames: number): string {
    if (droppedFrames === 0) return '#4CAF50';
    if (droppedFrames < 5) return '#FFC107';
    if (droppedFrames < 10) return '#FF9800';
    return '#F44336';
  }

  private checkQualityAlerts(metrics: QualityMetrics): void {
    const alerts = [];
    
    if (metrics.overallQuality < this.config.alertThresholds.overallQuality) {
      alerts.push({
        type: 'warning',
        message: 'Overall quality is below threshold',
        severity: 'medium'
      });
    }
    
    if (metrics.trackingStability < this.config.alertThresholds.trackingStability) {
      alerts.push({
        type: 'error',
        message: 'Tracking stability is unstable',
        severity: 'high'
      });
    }
    
    if (metrics.keypointVisibility < this.config.alertThresholds.keypointVisibility) {
      alerts.push({
        type: 'warning',
        message: 'Poor keypoint visibility detected',
        severity: 'medium'
      });
    }
    
    this.displayAlerts(alerts);
  }

  private checkPerformanceAlerts(metrics: PerformanceMetrics): void {
    const alerts = [];
    
    if (metrics.frameRate < this.config.alertThresholds.frameRate) {
      alerts.push({
        type: 'warning',
        message: `Frame rate is low (${metrics.frameRate.toFixed(1)} FPS)`,
        severity: 'medium'
      });
    }
    
    if (metrics.memoryUsage > this.config.alertThresholds.memoryUsage) {
      alerts.push({
        type: 'error',
        message: `High memory usage (${metrics.memoryUsage.toFixed(1)} MB)`,
        severity: 'high'
      });
    }
    
    this.displayAlerts(alerts);
  }

  private displayAlerts(alerts: any[]): void {
    if (!this.alertsContainer) return;
    
    // Clear existing alerts
    this.alertsContainer.innerHTML = '';
    
    alerts.forEach(alert => {
      const alertElement = document.createElement('div');
      alertElement.className = `alert alert-${alert.type} severity-${alert.severity}`;
      alertElement.innerHTML = `
        <div class="alert-icon">
          ${alert.type === 'error' ? '⚠️' : '⚠️'}
        </div>
        <div class="alert-message">${alert.message}</div>
        <div class="alert-close" onclick="this.parentElement.remove()">×</div>
      `;
      
      this.alertsContainer.appendChild(alertElement);
      
      // Auto-remove after 5 seconds
      setTimeout(() => {
        if (alertElement.parentNode) {
          alertElement.parentNode.removeChild(alertElement);
        }
      }, 5000);
    });
  }

  /**
   * Calculate quality metrics from pose data
   */
  public calculateQualityMetrics(poses: Pose[]): QualityMetrics {
    if (poses.length === 0) {
      return {
        overallQuality: 0,
        trackingStability: 0,
        keypointVisibility: 0,
        temporalConsistency: 0,
        calibrationAccuracy: 0
      };
    }

    const pose = poses[0];
    
    // Calculate keypoint visibility
    const visibleKeypoints = pose.keypoints.filter(kp => kp.score > 0.5);
    const keypointVisibility = visibleKeypoints.length / pose.keypoints.length;
    
    // Calculate average confidence
    const avgConfidence = pose.keypoints.reduce((sum, kp) => sum + kp.score, 0) / pose.keypoints.length;
    
    // Calculate tracking stability (simplified)
    const trackingStability = this.calculateTrackingStability(pose);
    
    // Calculate temporal consistency (simplified)
    const temporalConsistency = this.calculateTemporalConsistency(pose);
    
    // Overall quality is a weighted average
    const overallQuality = (
      keypointVisibility * 0.3 +
      avgConfidence * 0.3 +
      trackingStability * 0.2 +
      temporalConsistency * 0.2
    );
    
    return {
      overallQuality,
      trackingStability,
      keypointVisibility,
      temporalConsistency,
      calibrationAccuracy: 0.8 // Placeholder - would need actual calibration data
    };
  }

  private calculateTrackingStability(pose: Pose): number {
    // Simplified stability calculation based on keypoint confidence variance
    const confidences = pose.keypoints.map(kp => kp.score);
    const mean = confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;
    const variance = confidences.reduce((sum, conf) => sum + Math.pow(conf - mean, 2), 0) / confidences.length;
    const stability = Math.max(0, 1 - variance);
    return stability;
  }

  private calculateTemporalConsistency(pose: Pose): number {
    // Placeholder for temporal consistency calculation
    // In real implementation, this would compare with previous frames
    return 0.8;
  }

  /**
   * Generate validation report
   */
  public generateValidationReport(): ValidationResult {
    const errors = [];
    const warnings = [];
    
    if (!this.currentMetrics) {
      errors.push('No quality metrics available');
      return { isValid: false, errors, warnings, confidence: 0 };
    }
    
    // Check quality thresholds
    if (this.currentMetrics.overallQuality < 0.5) {
      errors.push('Overall quality is below acceptable threshold');
    }
    
    if (this.currentMetrics.trackingStability < 0.6) {
      warnings.push('Tracking stability is suboptimal');
    }
    
    if (this.currentMetrics.keypointVisibility < 0.7) {
      warnings.push('Low keypoint visibility detected');
    }
    
    // Check performance metrics
    if (this.performanceMetrics) {
      if (this.performanceMetrics.frameRate < 20) {
        warnings.push('Frame rate is below optimal range');
      }
      
      if (this.performanceMetrics.memoryUsage > 200) {
        warnings.push('High memory usage detected');
      }
    }
    
    const isValid = errors.length === 0;
    const confidence = isValid ? this.currentMetrics.overallQuality : 0;
    
    return { isValid, errors, warnings, confidence };
  }

  private startUpdateTimer(): void {
    this.updateTimer = window.setInterval(() => {
      this.updateRealTimeIndicators();
    }, this.config.updateInterval);
  }

  private updateRealTimeIndicators(): void {
    // Update any real-time indicators that don't depend on external data
    // This could include animations, time-based calculations, etc.
  }

  /**
   * Update settings
   */
  public updateSettings(newSettings: Partial<VisualizationSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
  }

  /**
   * Export quality data
   */
  public exportQualityData(): { quality: QualityMetrics | null, performance: PerformanceMetrics | null } {
    return {
      quality: this.currentMetrics,
      performance: this.performanceMetrics
    };
  }

  /**
   * Cleanup resources
   */
  public dispose(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }
  }
}