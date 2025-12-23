/**
 * Tests for PoseSmoothingService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PoseSmoothingService } from '../src/services/PoseSmoothingService';
import { 
  PoseDetectionResult, 
  PoseSmoothingConfig,
  KeypointName,
  EnhancedKeypoint
} from '../src/types/pose';

describe('PoseSmoothingService', () => {
  let service: PoseSmoothingService;
  let mockConfig: PoseSmoothingConfig;

  beforeEach(() => {
    mockConfig = {
      smoothingFactor: 0.7,
      minConfidence: 0.3,
      maxDistance: 50,
      enableVelocitySmoothing: true,
      historySize: 5
    };
    service = new PoseSmoothingService(mockConfig);
  });

  const createMockKeypoint = (x: number, y: number, score: number, name: KeypointName): EnhancedKeypoint => ({
    x,
    y,
    score,
    name,
    timestamp: Date.now()
  });

  const createMockPose = (keypoints: EnhancedKeypoint[]): PoseDetectionResult => ({
    keypoints,
    confidence: 0.8,
    timestamp: Date.now(),
    id: Math.random().toString(36),
    boundingBox: { x: 0, y: 0, width: 100, height: 100 }
  });

  describe('basic smoothing', () => {
    it('should return original pose when no history exists', () => {
      const keypoints = [
        createMockKeypoint(100, 200, 0.8, KeypointName.NOSE),
        createMockKeypoint(120, 180, 0.7, KeypointName.LEFT_EYE)
      ];
      const pose = createMockPose(keypoints);
      
      const smoothed = service.smooth([pose]);
      
      expect(smoothed).toHaveLength(1);
      expect(smoothed[0].keypoints[0].x).toBe(100);
      expect(smoothed[0].keypoints[0].y).toBe(200);
    });

    it('should apply smoothing factor to keypoint positions', () => {
      const keypoints1 = [createMockKeypoint(100, 200, 0.8, KeypointName.NOSE)];
      const keypoints2 = [createMockKeypoint(120, 220, 0.8, KeypointName.NOSE)];
      
      const pose1 = createMockPose(keypoints1);
      const pose2 = createMockPose(keypoints2);
      
      // First pose establishes baseline
      service.smooth([pose1]);
      
      // Second pose should be smoothed
      const smoothed = service.smooth([pose2]);
      
      expect(smoothed[0].keypoints[0].x).toBeGreaterThan(100);
      expect(smoothed[0].keypoints[0].x).toBeLessThan(120);
      expect(smoothed[0].keypoints[0].y).toBeGreaterThan(200);
      expect(smoothed[0].keypoints[0].y).toBeLessThan(220);
    });

    it('should filter out low confidence keypoints', () => {
      const keypoints = [
        createMockKeypoint(100, 200, 0.8, KeypointName.NOSE),
        createMockKeypoint(120, 180, 0.2, KeypointName.LEFT_EYE) // Low confidence
      ];
      const pose = createMockPose(keypoints);
      
      const smoothed = service.smooth([pose]);
      
      expect(smoothed[0].keypoints).toHaveLength(1);
      expect(smoothed[0].keypoints[0].name).toBe(KeypointName.NOSE);
    });

    it('should handle empty pose arrays', () => {
      const smoothed = service.smooth([]);
      expect(smoothed).toHaveLength(0);
    });
  });

  describe('velocity-based smoothing', () => {
    it('should apply velocity smoothing when enabled', () => {
      const config = { ...mockConfig, enableVelocitySmoothing: true };
      service = new PoseSmoothingService(config);
      
      const keypoints1 = [createMockKeypoint(100, 200, 0.8, KeypointName.NOSE)];
      const keypoints2 = [createMockKeypoint(110, 210, 0.8, KeypointName.NOSE)];
      const keypoints3 = [createMockKeypoint(120, 220, 0.8, KeypointName.NOSE)];
      
      const pose1 = createMockPose(keypoints1);
      const pose2 = createMockPose(keypoints2);
      const pose3 = createMockPose(keypoints3);
      
      service.smooth([pose1]);
      service.smooth([pose2]);
      const smoothed = service.smooth([pose3]);
      
      // Should predict based on velocity
      expect(smoothed[0].keypoints[0].x).toBeCloseTo(120, 0);
      expect(smoothed[0].keypoints[0].y).toBeCloseTo(220, 0);
    });

    it('should not apply velocity smoothing when disabled', () => {
      const config = { ...mockConfig, enableVelocitySmoothing: false };
      service = new PoseSmoothingService(config);
      
      const keypoints1 = [createMockKeypoint(100, 200, 0.8, KeypointName.NOSE)];
      const keypoints2 = [createMockKeypoint(200, 300, 0.8, KeypointName.NOSE)]; // Large jump
      
      const pose1 = createMockPose(keypoints1);
      const pose2 = createMockPose(keypoints2);
      
      service.smooth([pose1]);
      const smoothed = service.smooth([pose2]);
      
      // Should still smooth but without velocity prediction
      expect(smoothed[0].keypoints[0].x).toBeGreaterThan(100);
      expect(smoothed[0].keypoints[0].x).toBeLessThan(200);
    });
  });

  describe('distance-based filtering', () => {
    it('should reject keypoints that move too far', () => {
      const keypoints1 = [createMockKeypoint(100, 200, 0.8, KeypointName.NOSE)];
      const keypoints2 = [createMockKeypoint(200, 300, 0.8, KeypointName.NOSE)]; // Too far
      
      const pose1 = createMockPose(keypoints1);
      const pose2 = createMockPose(keypoints2);
      
      service.smooth([pose1]);
      const smoothed = service.smooth([pose2]);
      
      // Should use previous position due to distance constraint
      expect(smoothed[0].keypoints[0].x).toBeCloseTo(100, 10);
      expect(smoothed[0].keypoints[0].y).toBeCloseTo(200, 10);
    });

    it('should accept keypoints within distance threshold', () => {
      const keypoints1 = [createMockKeypoint(100, 200, 0.8, KeypointName.NOSE)];
      const keypoints2 = [createMockKeypoint(110, 210, 0.8, KeypointName.NOSE)]; // Within threshold
      
      const pose1 = createMockPose(keypoints1);
      const pose2 = createMockPose(keypoints2);
      
      service.smooth([pose1]);
      const smoothed = service.smooth([pose2]);
      
      // Should smooth toward new position
      expect(smoothed[0].keypoints[0].x).toBeGreaterThan(100);
      expect(smoothed[0].keypoints[0].x).toBeLessThan(110);
    });
  });

  describe('history management', () => {
    it('should maintain history up to specified size', () => {
      const config = { ...mockConfig, historySize: 3 };
      service = new PoseSmoothingService(config);
      
      for (let i = 0; i < 5; i++) {
        const keypoints = [createMockKeypoint(100 + i * 10, 200, 0.8, KeypointName.NOSE)];
        const pose = createMockPose(keypoints);
        service.smooth([pose]);
      }
      
      // History should be limited to 3 entries
      expect(service.getHistorySize()).toBe(3);
    });

    it('should reset history when requested', () => {
      const keypoints = [createMockKeypoint(100, 200, 0.8, KeypointName.NOSE)];
      const pose = createMockPose(keypoints);
      
      service.smooth([pose]);
      expect(service.getHistorySize()).toBe(1);
      
      service.reset();
      expect(service.getHistorySize()).toBe(0);
    });
  });

  describe('configuration updates', () => {
    it('should update configuration at runtime', () => {
      const newConfig = {
        ...mockConfig,
        smoothingFactor: 0.5,
        minConfidence: 0.6
      };
      
      service.updateConfig(newConfig);
      
      const keypoints = [createMockKeypoint(100, 200, 0.4, KeypointName.NOSE)]; // Below new threshold
      const pose = createMockPose(keypoints);
      
      const smoothed = service.smooth([pose]);
      expect(smoothed[0].keypoints).toHaveLength(0); // Should be filtered out
    });

    it('should validate configuration values', () => {
      const invalidConfig = {
        ...mockConfig,
        smoothingFactor: 1.5 // Invalid value
      };
      
      expect(() => service.updateConfig(invalidConfig)).toThrow();
    });
  });

  describe('multi-keypoint smoothing', () => {
    it('should smooth multiple keypoints independently', () => {
      const keypoints1 = [
        createMockKeypoint(100, 200, 0.8, KeypointName.NOSE),
        createMockKeypoint(150, 250, 0.8, KeypointName.LEFT_EYE)
      ];
      const keypoints2 = [
        createMockKeypoint(110, 210, 0.8, KeypointName.NOSE),
        createMockKeypoint(160, 260, 0.8, KeypointName.LEFT_EYE)
      ];
      
      const pose1 = createMockPose(keypoints1);
      const pose2 = createMockPose(keypoints2);
      
      service.smooth([pose1]);
      const smoothed = service.smooth([pose2]);
      
      expect(smoothed[0].keypoints).toHaveLength(2);
      expect(smoothed[0].keypoints[0].x).toBeGreaterThan(100);
      expect(smoothed[0].keypoints[0].x).toBeLessThan(110);
      expect(smoothed[0].keypoints[1].x).toBeGreaterThan(150);
      expect(smoothed[0].keypoints[1].x).toBeLessThan(160);
    });

    it('should handle missing keypoints gracefully', () => {
      const keypoints1 = [
        createMockKeypoint(100, 200, 0.8, KeypointName.NOSE),
        createMockKeypoint(150, 250, 0.8, KeypointName.LEFT_EYE)
      ];
      const keypoints2 = [
        createMockKeypoint(110, 210, 0.8, KeypointName.NOSE)
        // Missing LEFT_EYE keypoint
      ];
      
      const pose1 = createMockPose(keypoints1);
      const pose2 = createMockPose(keypoints2);
      
      service.smooth([pose1]);
      const smoothed = service.smooth([pose2]);
      
      expect(smoothed[0].keypoints).toHaveLength(1);
      expect(smoothed[0].keypoints[0].name).toBe(KeypointName.NOSE);
    });
  });

  describe('edge cases', () => {
    it('should handle poses with no keypoints', () => {
      const pose = createMockPose([]);
      const smoothed = service.smooth([pose]);
      
      expect(smoothed).toHaveLength(1);
      expect(smoothed[0].keypoints).toHaveLength(0);
    });

    it('should handle multiple poses simultaneously', () => {
      const keypoints1 = [createMockKeypoint(100, 200, 0.8, KeypointName.NOSE)];
      const keypoints2 = [createMockKeypoint(200, 300, 0.8, KeypointName.NOSE)];
      
      const pose1 = createMockPose(keypoints1);
      const pose2 = createMockPose(keypoints2);
      
      const smoothed = service.smooth([pose1, pose2]);
      
      expect(smoothed).toHaveLength(2);
      expect(smoothed[0].keypoints).toHaveLength(1);
      expect(smoothed[1].keypoints).toHaveLength(1);
    });

    it('should handle zero smoothing factor', () => {
      const config = { ...mockConfig, smoothingFactor: 0 };
      service = new PoseSmoothingService(config);
      
      const keypoints1 = [createMockKeypoint(100, 200, 0.8, KeypointName.NOSE)];
      const keypoints2 = [createMockKeypoint(110, 210, 0.8, KeypointName.NOSE)];
      
      const pose1 = createMockPose(keypoints1);
      const pose2 = createMockPose(keypoints2);
      
      service.smooth([pose1]);
      const smoothed = service.smooth([pose2]);
      
      // Should return original position (no smoothing)
      expect(smoothed[0].keypoints[0].x).toBe(110);
      expect(smoothed[0].keypoints[0].y).toBe(210);
    });

    it('should handle maximum smoothing factor', () => {
      const config = { ...mockConfig, smoothingFactor: 1.0 };
      service = new PoseSmoothingService(config);
      
      const keypoints1 = [createMockKeypoint(100, 200, 0.8, KeypointName.NOSE)];
      const keypoints2 = [createMockKeypoint(110, 210, 0.8, KeypointName.NOSE)];
      
      const pose1 = createMockPose(keypoints1);
      const pose2 = createMockPose(keypoints2);
      
      service.smooth([pose1]);
      const smoothed = service.smooth([pose2]);
      
      // Should keep previous position (maximum smoothing)
      expect(smoothed[0].keypoints[0].x).toBe(100);
      expect(smoothed[0].keypoints[0].y).toBe(200);
    });
  });
});