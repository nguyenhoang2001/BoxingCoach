/**
 * Pose data smoothing utilities for reducing noise and improving tracking stability
 */

import { Point2D, Point3D } from '../types/gait';
import { EnhancedKeypoint, KeypointName } from '../types/pose';
import { Skeleton, TemporalSkeleton } from '../types/skeleton';

/**
 * Smoothing algorithm types
 */
export enum SmoothingAlgorithm {
  EXPONENTIAL = 'exponential',
  MOVING_AVERAGE = 'moving_average',
  KALMAN = 'kalman',
  BUTTERWORTH = 'butterworth',
  SAVGOL = 'savgol'
}

/**
 * Smoothing configuration
 */
export interface SmoothingConfig {
  /** Smoothing algorithm to use */
  algorithm: SmoothingAlgorithm;
  /** Smoothing factor (0-1, higher = more smoothing) */
  factor: number;
  /** Window size for moving average/filter */
  windowSize: number;
  /** Minimum confidence threshold for smoothing */
  minConfidence: number;
  /** Maximum allowed movement per frame (outlier detection) */
  maxMovement: number;
  /** Enable velocity-based smoothing */
  enableVelocitySmoothing: boolean;
  /** Velocity smoothing factor */
  velocityFactor: number;
}

/**
 * Default smoothing configuration
 */
export const DEFAULT_SMOOTHING_CONFIG: SmoothingConfig = {
  algorithm: SmoothingAlgorithm.EXPONENTIAL,
  factor: 0.7,
  windowSize: 5,
  minConfidence: 0.3,
  maxMovement: 50, // pixels
  enableVelocitySmoothing: true,
  velocityFactor: 0.5
};

/**
 * Historical data for smoothing
 */
interface HistoricalData {
  positions: Point2D[];
  confidences: number[];
  timestamps: number[];
  velocities: Point2D[];
  accelerations: Point2D[];
}

/**
 * Keypoint smoothing tracker
 */
export class KeypointSmoother {
  private history: Map<KeypointName, HistoricalData> = new Map();
  private config: SmoothingConfig;
  private maxHistorySize: number = 30;

  constructor(config: Partial<SmoothingConfig> = {}) {
    this.config = { ...DEFAULT_SMOOTHING_CONFIG, ...config };
  }

  /**
   * Smooth a single keypoint
   */
  smoothKeypoint(
    keypoint: EnhancedKeypoint,
    previousKeypoint?: EnhancedKeypoint
  ): EnhancedKeypoint {
    const history = this.getOrCreateHistory(keypoint.name);
    const currentPos = { x: keypoint.x, y: keypoint.y };
    const currentTime = keypoint.timestamp;

    // Add current position to history
    history.positions.push(currentPos);
    history.confidences.push(keypoint.score);
    history.timestamps.push(currentTime);

    // Calculate velocity
    if (history.positions.length > 1) {
      const prevPos = history.positions[history.positions.length - 2];
      const prevTime = history.timestamps[history.timestamps.length - 2];
      const timeDelta = (currentTime - prevTime) / 1000; // Convert to seconds
      
      if (timeDelta > 0) {
        const velocity = {
          x: (currentPos.x - prevPos.x) / timeDelta,
          y: (currentPos.y - prevPos.y) / timeDelta
        };
        history.velocities.push(velocity);

        // Calculate acceleration
        if (history.velocities.length > 1) {
          const prevVel = history.velocities[history.velocities.length - 2];
          const acceleration = {
            x: (velocity.x - prevVel.x) / timeDelta,
            y: (velocity.y - prevVel.y) / timeDelta
          };
          history.accelerations.push(acceleration);
        }
      }
    }

    // Trim history to max size
    this.trimHistory(history);

    // Apply smoothing based on algorithm
    const smoothedPos = this.applySmoothing(history, keypoint);

    // Return smoothed keypoint
    return {
      ...keypoint,
      x: smoothedPos.x,
      y: smoothedPos.y
    };
  }

  /**
   * Smooth an entire skeleton
   */
  smoothSkeleton(skeleton: Skeleton, previousSkeleton?: Skeleton): Skeleton {
    const smoothedKeypoints = skeleton.keypoints.map(keypoint => {
      const prevKeypoint = previousSkeleton?.keypoints.find(
        kp => kp.name === keypoint.name
      );
      return this.smoothKeypoint(keypoint, prevKeypoint);
    });

    return {
      ...skeleton,
      keypoints: smoothedKeypoints
    };
  }

  /**
   * Reset smoothing history
   */
  reset(keypointName?: KeypointName): void {
    if (keypointName) {
      this.history.delete(keypointName);
    } else {
      this.history.clear();
    }
  }

  /**
   * Update smoothing configuration
   */
  updateConfig(config: Partial<SmoothingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get or create history for a keypoint
   */
  private getOrCreateHistory(keypointName: KeypointName): HistoricalData {
    if (!this.history.has(keypointName)) {
      this.history.set(keypointName, {
        positions: [],
        confidences: [],
        timestamps: [],
        velocities: [],
        accelerations: []
      });
    }
    return this.history.get(keypointName)!;
  }

  /**
   * Trim history to maximum size
   */
  private trimHistory(history: HistoricalData): void {
    const maxSize = this.maxHistorySize;
    
    if (history.positions.length > maxSize) {
      history.positions = history.positions.slice(-maxSize);
      history.confidences = history.confidences.slice(-maxSize);
      history.timestamps = history.timestamps.slice(-maxSize);
    }
    
    if (history.velocities.length > maxSize) {
      history.velocities = history.velocities.slice(-maxSize);
    }
    
    if (history.accelerations.length > maxSize) {
      history.accelerations = history.accelerations.slice(-maxSize);
    }
  }

  /**
   * Apply smoothing algorithm
   */
  private applySmoothing(history: HistoricalData, keypoint: EnhancedKeypoint): Point2D {
    const currentPos = { x: keypoint.x, y: keypoint.y };
    
    // Check for outliers
    if (this.isOutlier(history, currentPos)) {
      // Use predicted position instead of current position for outliers
      const predicted = this.predictPosition(history);
      if (predicted) {
        return predicted;
      }
    }

    switch (this.config.algorithm) {
      case SmoothingAlgorithm.EXPONENTIAL:
        return this.exponentialSmoothing(history, currentPos, keypoint.score);
      
      case SmoothingAlgorithm.MOVING_AVERAGE:
        return this.movingAverageSmoothing(history, currentPos);
      
      case SmoothingAlgorithm.KALMAN:
        return this.kalmanSmoothing(history, currentPos, keypoint.score);
      
      case SmoothingAlgorithm.BUTTERWORTH:
        return this.butterworthSmoothing(history, currentPos);
      
      case SmoothingAlgorithm.SAVGOL:
        return this.savgolSmoothing(history, currentPos);
      
      default:
        return currentPos;
    }
  }

  /**
   * Exponential smoothing
   */
  private exponentialSmoothing(
    history: HistoricalData,
    currentPos: Point2D,
    confidence: number
  ): Point2D {
    if (history.positions.length < 2) {
      return currentPos;
    }

    const prevPos = history.positions[history.positions.length - 2];
    const alpha = Math.min(1, this.config.factor * confidence);

    return {
      x: alpha * currentPos.x + (1 - alpha) * prevPos.x,
      y: alpha * currentPos.y + (1 - alpha) * prevPos.y
    };
  }

  /**
   * Moving average smoothing
   */
  private movingAverageSmoothing(history: HistoricalData, currentPos: Point2D): Point2D {
    const windowSize = Math.min(this.config.windowSize, history.positions.length);
    const recentPositions = history.positions.slice(-windowSize);
    recentPositions.push(currentPos);

    const sumX = recentPositions.reduce((sum, pos) => sum + pos.x, 0);
    const sumY = recentPositions.reduce((sum, pos) => sum + pos.y, 0);

    return {
      x: sumX / recentPositions.length,
      y: sumY / recentPositions.length
    };
  }

  /**
   * Simplified Kalman filtering
   */
  private kalmanSmoothing(
    history: HistoricalData,
    currentPos: Point2D,
    confidence: number
  ): Point2D {
    if (history.positions.length < 2) {
      return currentPos;
    }

    const prevPos = history.positions[history.positions.length - 2];
    const processNoise = 0.1; // Process noise covariance
    const measurementNoise = 1 - confidence; // Measurement noise based on confidence
    
    // Simplified Kalman gain
    const kalmanGain = processNoise / (processNoise + measurementNoise);

    return {
      x: prevPos.x + kalmanGain * (currentPos.x - prevPos.x),
      y: prevPos.y + kalmanGain * (currentPos.y - prevPos.y)
    };
  }

  /**
   * Butterworth low-pass filter (simplified)
   */
  private butterworthSmoothing(history: HistoricalData, currentPos: Point2D): Point2D {
    if (history.positions.length < 3) {
      return this.exponentialSmoothing(history, currentPos, 1.0);
    }

    // Simple second-order Butterworth filter
    const cutoffFreq = 0.1; // Normalized cutoff frequency
    const a = Math.exp(-2 * Math.PI * cutoffFreq);
    
    const prevPos = history.positions[history.positions.length - 2];
    const prevPrevPos = history.positions[history.positions.length - 3];

    return {
      x: (1 - a) * currentPos.x + a * prevPos.x,
      y: (1 - a) * currentPos.y + a * prevPos.y
    };
  }

  /**
   * Savitzky-Golay smoothing (simplified)
   */
  private savgolSmoothing(history: HistoricalData, currentPos: Point2D): Point2D {
    const windowSize = Math.min(5, history.positions.length + 1);
    
    if (windowSize < 3) {
      return this.movingAverageSmoothing(history, currentPos);
    }

    // Simplified Savitzky-Golay coefficients for polynomial order 2
    const coefficients = this.getSavgolCoefficients(windowSize);
    const positions = [...history.positions.slice(-(windowSize - 1)), currentPos];

    let sumX = 0;
    let sumY = 0;
    
    for (let i = 0; i < positions.length; i++) {
      sumX += coefficients[i] * positions[i].x;
      sumY += coefficients[i] * positions[i].y;
    }

    return { x: sumX, y: sumY };
  }

  /**
   * Get Savitzky-Golay coefficients (simplified)
   */
  private getSavgolCoefficients(windowSize: number): number[] {
    // Simplified coefficients for common window sizes
    const coeffs: { [key: number]: number[] } = {
      3: [-0.083, 0.667, 0.417],
      5: [-0.086, 0.343, 0.486, 0.343, -0.086],
      7: [-0.095, 0.143, 0.286, 0.333, 0.286, 0.143, -0.095]
    };

    return coeffs[windowSize] || new Array(windowSize).fill(1 / windowSize);
  }

  /**
   * Check if current position is an outlier
   */
  private isOutlier(history: HistoricalData, currentPos: Point2D): boolean {
    if (history.positions.length === 0) {
      return false;
    }

    const lastPos = history.positions[history.positions.length - 1];
    const distance = Math.sqrt(
      Math.pow(currentPos.x - lastPos.x, 2) + Math.pow(currentPos.y - lastPos.y, 2)
    );

    return distance > this.config.maxMovement;
  }

  /**
   * Predict next position based on velocity
   */
  private predictPosition(history: HistoricalData): Point2D | null {
    if (history.positions.length < 2 || history.velocities.length === 0) {
      return null;
    }

    const lastPos = history.positions[history.positions.length - 1];
    const lastVel = history.velocities[history.velocities.length - 1];
    const timeDelta = 1 / 30; // Assume 30 FPS

    return {
      x: lastPos.x + lastVel.x * timeDelta,
      y: lastPos.y + lastVel.y * timeDelta
    };
  }
}

/**
 * Pose trajectory smoothing
 */
export class TrajectorySmooth {
  private smoothers: Map<string, KeypointSmoother> = new Map();

  /**
   * Smooth trajectory points
   */
  smoothTrajectory(
    points: Array<{ position: Point2D; timestamp: number; confidence: number }>,
    config?: Partial<SmoothingConfig>
  ): Array<{ position: Point2D; timestamp: number; confidence: number }> {
    if (points.length < 2) {
      return points;
    }

    const smoother = new KeypointSmoother(config);
    const smoothedPoints: Array<{ position: Point2D; timestamp: number; confidence: number }> = [];

    points.forEach((point, index) => {
      const keypoint: EnhancedKeypoint = {
        x: point.position.x,
        y: point.position.y,
        score: point.confidence,
        name: KeypointName.NOSE, // Dummy name for trajectory smoothing
        timestamp: point.timestamp
      };

      const smoothed = smoother.smoothKeypoint(keypoint);
      smoothedPoints.push({
        position: { x: smoothed.x, y: smoothed.y },
        timestamp: point.timestamp,
        confidence: point.confidence
      });
    });

    return smoothedPoints;
  }

  /**
   * Smooth multiple trajectories
   */
  smoothMultipleTrajectories(
    trajectories: Map<string, Array<{ position: Point2D; timestamp: number; confidence: number }>>,
    config?: Partial<SmoothingConfig>
  ): Map<string, Array<{ position: Point2D; timestamp: number; confidence: number }>> {
    const smoothedTrajectories = new Map();

    trajectories.forEach((trajectory, key) => {
      smoothedTrajectories.set(key, this.smoothTrajectory(trajectory, config));
    });

    return smoothedTrajectories;
  }
}

/**
 * Temporal skeleton smoothing
 */
export class TemporalSkeletonSmoother {
  private keypoint: KeypointSmoother;
  
  constructor(config?: Partial<SmoothingConfig>) {
    this.keypoint = new KeypointSmoother(config);
  }

  /**
   * Smooth temporal skeleton data
   */
  smoothTemporalSkeleton(temporal: TemporalSkeleton): TemporalSkeleton {
    const smoothedCurrent = this.keypoint.smoothSkeleton(
      temporal.current,
      temporal.previous
    );

    return {
      ...temporal,
      current: smoothedCurrent
    };
  }

  /**
   * Reset smoothing state
   */
  reset(): void {
    this.keypoint.reset();
  }
}

/**
 * Global smoothing utilities
 */

/**
 * Simple exponential smoothing for scalar values
 */
export function exponentialSmoothScalar(
  currentValue: number,
  previousValue: number,
  factor: number
): number {
  return factor * currentValue + (1 - factor) * previousValue;
}

/**
 * Simple moving average for scalar values
 */
export function movingAverageScalar(values: number[], windowSize: number): number {
  const window = values.slice(-windowSize);
  return window.reduce((sum, val) => sum + val, 0) / window.length;
}

/**
 * Remove outliers from array of values
 */
export function removeOutliers(values: number[], threshold: number = 2): number[] {
  if (values.length < 3) {
    return values;
  }

  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const stdDev = Math.sqrt(
    values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
  );

  return values.filter(val => Math.abs(val - mean) <= threshold * stdDev);
}

/**
 * Interpolate missing values in a sequence
 */
export function interpolateValues(values: (number | null)[]): number[] {
  const result = [...values];
  
  for (let i = 0; i < result.length; i++) {
    if (result[i] === null) {
      // Find previous and next valid values
      let prevIndex = i - 1;
      let nextIndex = i + 1;
      
      while (prevIndex >= 0 && result[prevIndex] === null) {
        prevIndex--;
      }
      
      while (nextIndex < result.length && result[nextIndex] === null) {
        nextIndex++;
      }
      
      if (prevIndex >= 0 && nextIndex < result.length) {
        // Linear interpolation
        const prevValue = result[prevIndex] as number;
        const nextValue = result[nextIndex] as number;
        const ratio = (i - prevIndex) / (nextIndex - prevIndex);
        result[i] = prevValue + ratio * (nextValue - prevValue);
      } else if (prevIndex >= 0) {
        // Use previous value
        result[i] = result[prevIndex] as number;
      } else if (nextIndex < result.length) {
        // Use next value
        result[i] = result[nextIndex] as number;
      } else {
        // Default to 0
        result[i] = 0;
      }
    }
  }
  
  return result as number[];
}