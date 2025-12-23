/**
 * PoseSmoothingService - Smooths pose detection results for stable tracking
 */

import {
  IPoseSmoothingService,
  PoseDetectionResult,
  PoseSmoothingConfig,
  EnhancedKeypoint,
  KeypointName
} from '../types/pose';

interface KeypointHistory {
  [keypointName: string]: {
    positions: { x: number; y: number; timestamp: number }[];
    velocity: { x: number; y: number };
    lastSmoothed: { x: number; y: number };
  };
}

export class PoseSmoothingService implements IPoseSmoothingService {
  private config: PoseSmoothingConfig;
  private history: KeypointHistory = {};
  private poseHistory: PoseDetectionResult[] = [];

  constructor(config: PoseSmoothingConfig) {
    this.config = config;
  }

  /**
   * Apply smoothing to pose detection results
   */
  smooth(poses: PoseDetectionResult[]): PoseDetectionResult[] {
    if (poses.length === 0) {
      return [];
    }

    const smoothedPoses: PoseDetectionResult[] = [];

    for (const pose of poses) {
      const smoothedKeypoints = this.smoothKeypoints(pose.keypoints);
      const smoothedPose: PoseDetectionResult = {
        ...pose,
        keypoints: smoothedKeypoints,
        boundingBox: this.calculateBoundingBox(smoothedKeypoints)
      };

      smoothedPoses.push(smoothedPose);
    }

    // Update pose history
    this.updatePoseHistory(smoothedPoses);

    return smoothedPoses;
  }

  /**
   * Reset smoothing history
   */
  reset(): void {
    this.history = {};
    this.poseHistory = [];
  }

  /**
   * Update smoothing configuration
   */
  updateConfig(config: PoseSmoothingConfig): void {
    this.validateConfig(config);
    this.config = config;
  }

  /**
   * Get history size for debugging
   */
  getHistorySize(): number {
    return this.poseHistory.length;
  }

  /**
   * Smooth keypoints using temporal filtering
   */
  private smoothKeypoints(keypoints: EnhancedKeypoint[]): EnhancedKeypoint[] {
    const smoothedKeypoints: EnhancedKeypoint[] = [];

    for (const keypoint of keypoints) {
      // Filter out low confidence keypoints
      if (keypoint.score < this.config.minConfidence) {
        continue;
      }

      const smoothedKeypoint = this.smoothSingleKeypoint(keypoint);
      if (smoothedKeypoint) {
        smoothedKeypoints.push(smoothedKeypoint);
      }
    }

    return smoothedKeypoints;
  }

  /**
   * Smooth a single keypoint
   */
  private smoothSingleKeypoint(keypoint: EnhancedKeypoint): EnhancedKeypoint | null {
    const keypointName = keypoint.name;
    
    // Initialize history for this keypoint if it doesn't exist
    if (!this.history[keypointName]) {
      this.history[keypointName] = {
        positions: [],
        velocity: { x: 0, y: 0 },
        lastSmoothed: { x: keypoint.x, y: keypoint.y }
      };
    }

    const keypointHistory = this.history[keypointName];
    
    // Add current position to history
    keypointHistory.positions.push({
      x: keypoint.x,
      y: keypoint.y,
      timestamp: keypoint.timestamp
    });

    // Limit history size
    if (keypointHistory.positions.length > this.config.historySize) {
      keypointHistory.positions = keypointHistory.positions.slice(-this.config.historySize);
    }

    // Check if keypoint moved too far (outlier detection)
    if (keypointHistory.positions.length > 1) {
      const lastPosition = keypointHistory.lastSmoothed;
      const distance = this.calculateDistance(
        { x: keypoint.x, y: keypoint.y },
        lastPosition
      );

      if (distance > this.config.maxDistance) {
        // Use previous position if movement is too large
        return {
          ...keypoint,
          x: lastPosition.x,
          y: lastPosition.y
        };
      }
    }

    // Calculate smoothed position
    const smoothedPosition = this.calculateSmoothedPosition(keypointName, keypoint);
    
    // Update velocity if enabled
    if (this.config.enableVelocitySmoothing) {
      this.updateVelocity(keypointName, smoothedPosition);
    }

    // Update last smoothed position
    keypointHistory.lastSmoothed = smoothedPosition;

    return {
      ...keypoint,
      x: smoothedPosition.x,
      y: smoothedPosition.y
    };
  }

  /**
   * Calculate smoothed position using exponential moving average
   */
  private calculateSmoothedPosition(
    keypointName: string,
    currentKeypoint: EnhancedKeypoint
  ): { x: number; y: number } {
    const keypointHistory = this.history[keypointName];
    
    if (keypointHistory.positions.length === 1) {
      // First position, no smoothing needed
      return { x: currentKeypoint.x, y: currentKeypoint.y };
    }

    const lastSmoothed = keypointHistory.lastSmoothed;
    const alpha = 1 - this.config.smoothingFactor;

    let smoothedX = alpha * currentKeypoint.x + this.config.smoothingFactor * lastSmoothed.x;
    let smoothedY = alpha * currentKeypoint.y + this.config.smoothingFactor * lastSmoothed.y;

    // Apply velocity-based prediction if enabled
    if (this.config.enableVelocitySmoothing && keypointHistory.positions.length > 2) {
      const velocity = keypointHistory.velocity;
      const timeDelta = this.calculateTimeDelta(keypointHistory.positions);
      
      smoothedX += velocity.x * timeDelta * 0.1; // Velocity influence factor
      smoothedY += velocity.y * timeDelta * 0.1;
    }

    return { x: smoothedX, y: smoothedY };
  }

  /**
   * Update velocity for keypoint
   */
  private updateVelocity(keypointName: string, currentPosition: { x: number; y: number }): void {
    const keypointHistory = this.history[keypointName];
    
    if (keypointHistory.positions.length < 2) {
      return;
    }

    const positions = keypointHistory.positions;
    const current = positions[positions.length - 1];
    const previous = positions[positions.length - 2];
    
    const timeDelta = current.timestamp - previous.timestamp;
    
    if (timeDelta > 0) {
      const velocityX = (current.x - previous.x) / timeDelta;
      const velocityY = (current.y - previous.y) / timeDelta;
      
      // Smooth velocity using exponential moving average
      const velocityAlpha = 0.3;
      keypointHistory.velocity.x = velocityAlpha * velocityX + (1 - velocityAlpha) * keypointHistory.velocity.x;
      keypointHistory.velocity.y = velocityAlpha * velocityY + (1 - velocityAlpha) * keypointHistory.velocity.y;
    }
  }

  /**
   * Calculate distance between two points
   */
  private calculateDistance(point1: { x: number; y: number }, point2: { x: number; y: number }): number {
    const dx = point1.x - point2.x;
    const dy = point1.y - point2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Calculate time delta from position history
   */
  private calculateTimeDelta(positions: { x: number; y: number; timestamp: number }[]): number {
    if (positions.length < 2) {
      return 0;
    }

    const latest = positions[positions.length - 1];
    const previous = positions[positions.length - 2];
    
    return (latest.timestamp - previous.timestamp) / 1000; // Convert to seconds
  }

  /**
   * Update pose history
   */
  private updatePoseHistory(poses: PoseDetectionResult[]): void {
    this.poseHistory.push(...poses);
    
    // Limit history size
    if (this.poseHistory.length > this.config.historySize * 2) {
      this.poseHistory = this.poseHistory.slice(-this.config.historySize);
    }
  }

  /**
   * Calculate bounding box for smoothed keypoints
   */
  private calculateBoundingBox(keypoints: EnhancedKeypoint[]): { x: number; y: number; width: number; height: number } {
    if (keypoints.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    const xs = keypoints.map(kp => kp.x);
    const ys = keypoints.map(kp => kp.y);
    
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  /**
   * Validate configuration
   */
  private validateConfig(config: PoseSmoothingConfig): void {
    if (config.smoothingFactor < 0 || config.smoothingFactor > 1) {
      throw new Error('smoothingFactor must be between 0 and 1');
    }
    
    if (config.minConfidence < 0 || config.minConfidence > 1) {
      throw new Error('minConfidence must be between 0 and 1');
    }
    
    if (config.maxDistance < 0) {
      throw new Error('maxDistance must be greater than or equal to 0');
    }
    
    if (config.historySize < 1) {
      throw new Error('historySize must be greater than 0');
    }
  }

  /**
   * Get velocity for a specific keypoint (for debugging)
   */
  getKeypointVelocity(keypointName: KeypointName): { x: number; y: number } | null {
    const keypointHistory = this.history[keypointName];
    if (!keypointHistory) {
      return null;
    }
    
    return { ...keypointHistory.velocity };
  }

  /**
   * Get keypoint position history (for debugging)
   */
  getKeypointHistory(keypointName: KeypointName): { x: number; y: number; timestamp: number }[] {
    const keypointHistory = this.history[keypointName];
    if (!keypointHistory) {
      return [];
    }
    
    return [...keypointHistory.positions];
  }
}