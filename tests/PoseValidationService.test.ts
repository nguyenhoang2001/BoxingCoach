/**
 * Tests for PoseValidationService
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PoseValidationService } from '../src/services/PoseValidationService';
import { 
  PoseDetectionResult, 
  PoseValidationConfig,
  PoseDetectionError,
  KeypointName,
  EnhancedKeypoint
} from '../src/types/pose';

describe('PoseValidationService', () => {
  let service: PoseValidationService;
  let mockConfig: PoseValidationConfig;

  beforeEach(() => {
    mockConfig = {
      minPoseConfidence: 0.5,
      minVisibleKeypoints: 5,
      requiredKeypoints: [
        KeypointName.LEFT_HIP,
        KeypointName.RIGHT_HIP,
        KeypointName.LEFT_KNEE,
        KeypointName.RIGHT_KNEE,
        KeypointName.LEFT_ANKLE,
        KeypointName.RIGHT_ANKLE
      ],
      maxKeypointDistance: 100,
      enableAnatomicalValidation: true
    };
    service = new PoseValidationService(mockConfig);
  });

  const createMockKeypoint = (x: number, y: number, score: number, name: KeypointName): EnhancedKeypoint => ({
    x,
    y,
    score,
    name,
    timestamp: Date.now()
  });

  const createMockPose = (keypoints: EnhancedKeypoint[], confidence: number = 0.8): PoseDetectionResult => ({
    keypoints,
    confidence,
    timestamp: Date.now(),
    id: Math.random().toString(36),
    boundingBox: { x: 0, y: 0, width: 100, height: 100 }
  });

  describe('confidence validation', () => {
    it('should accept poses with confidence above threshold', () => {
      const keypoints = [
        createMockKeypoint(100, 200, 0.8, KeypointName.LEFT_HIP),
        createMockKeypoint(120, 200, 0.8, KeypointName.RIGHT_HIP),
        createMockKeypoint(100, 250, 0.8, KeypointName.LEFT_KNEE),
        createMockKeypoint(120, 250, 0.8, KeypointName.RIGHT_KNEE),
        createMockKeypoint(100, 300, 0.8, KeypointName.LEFT_ANKLE),
        createMockKeypoint(120, 300, 0.8, KeypointName.RIGHT_ANKLE)
      ];
      const pose = createMockPose(keypoints, 0.7);
      
      const isValid = service.validate(pose);
      expect(isValid).toBe(true);
    });

    it('should reject poses with confidence below threshold', () => {
      const keypoints = [
        createMockKeypoint(100, 200, 0.8, KeypointName.LEFT_HIP),
        createMockKeypoint(120, 200, 0.8, KeypointName.RIGHT_HIP),
        createMockKeypoint(100, 250, 0.8, KeypointName.LEFT_KNEE),
        createMockKeypoint(120, 250, 0.8, KeypointName.RIGHT_KNEE),
        createMockKeypoint(100, 300, 0.8, KeypointName.LEFT_ANKLE),
        createMockKeypoint(120, 300, 0.8, KeypointName.RIGHT_ANKLE)
      ];
      const pose = createMockPose(keypoints, 0.3);
      
      const isValid = service.validate(pose);
      expect(isValid).toBe(false);
      
      const errors = service.getValidationErrors(pose);
      expect(errors).toContain(PoseDetectionError.LOW_CONFIDENCE);
    });
  });

  describe('keypoint count validation', () => {
    it('should accept poses with sufficient visible keypoints', () => {
      const keypoints = [
        createMockKeypoint(100, 200, 0.8, KeypointName.LEFT_HIP),
        createMockKeypoint(120, 200, 0.8, KeypointName.RIGHT_HIP),
        createMockKeypoint(100, 250, 0.8, KeypointName.LEFT_KNEE),
        createMockKeypoint(120, 250, 0.8, KeypointName.RIGHT_KNEE),
        createMockKeypoint(100, 300, 0.8, KeypointName.LEFT_ANKLE),
        createMockKeypoint(120, 300, 0.8, KeypointName.RIGHT_ANKLE)
      ];
      const pose = createMockPose(keypoints);
      
      const isValid = service.validate(pose);
      expect(isValid).toBe(true);
    });

    it('should reject poses with insufficient visible keypoints', () => {
      const keypoints = [
        createMockKeypoint(100, 200, 0.8, KeypointName.LEFT_HIP),
        createMockKeypoint(120, 200, 0.8, KeypointName.RIGHT_HIP),
        createMockKeypoint(100, 250, 0.2, KeypointName.LEFT_KNEE), // Low confidence
        createMockKeypoint(120, 250, 0.2, KeypointName.RIGHT_KNEE) // Low confidence
      ];
      const pose = createMockPose(keypoints);
      
      const isValid = service.validate(pose);
      expect(isValid).toBe(false);
      
      const errors = service.getValidationErrors(pose);
      expect(errors).toContain(PoseDetectionError.INSUFFICIENT_KEYPOINTS);
    });
  });

  describe('required keypoints validation', () => {
    it('should accept poses with all required keypoints', () => {
      const keypoints = [
        createMockKeypoint(100, 200, 0.8, KeypointName.LEFT_HIP),
        createMockKeypoint(120, 200, 0.8, KeypointName.RIGHT_HIP),
        createMockKeypoint(100, 250, 0.8, KeypointName.LEFT_KNEE),
        createMockKeypoint(120, 250, 0.8, KeypointName.RIGHT_KNEE),
        createMockKeypoint(100, 300, 0.8, KeypointName.LEFT_ANKLE),
        createMockKeypoint(120, 300, 0.8, KeypointName.RIGHT_ANKLE)
      ];
      const pose = createMockPose(keypoints);
      
      const isValid = service.validate(pose);
      expect(isValid).toBe(true);
    });

    it('should reject poses missing required keypoints', () => {
      const keypoints = [
        createMockKeypoint(100, 200, 0.8, KeypointName.LEFT_HIP),
        createMockKeypoint(120, 200, 0.8, KeypointName.RIGHT_HIP),
        createMockKeypoint(100, 250, 0.8, KeypointName.LEFT_KNEE),
        createMockKeypoint(120, 250, 0.8, KeypointName.RIGHT_KNEE)
        // Missing ankle keypoints
      ];
      const pose = createMockPose(keypoints);
      
      const isValid = service.validate(pose);
      expect(isValid).toBe(false);
      
      const errors = service.getValidationErrors(pose);
      expect(errors).toContain(PoseDetectionError.INSUFFICIENT_KEYPOINTS);
    });
  });

  describe('anatomical validation', () => {
    it('should accept anatomically plausible poses', () => {
      const keypoints = [
        createMockKeypoint(100, 200, 0.8, KeypointName.LEFT_HIP),
        createMockKeypoint(120, 200, 0.8, KeypointName.RIGHT_HIP),
        createMockKeypoint(100, 250, 0.8, KeypointName.LEFT_KNEE),
        createMockKeypoint(120, 250, 0.8, KeypointName.RIGHT_KNEE),
        createMockKeypoint(100, 300, 0.8, KeypointName.LEFT_ANKLE),
        createMockKeypoint(120, 300, 0.8, KeypointName.RIGHT_ANKLE)
      ];
      const pose = createMockPose(keypoints);
      
      const isValid = service.validate(pose);
      expect(isValid).toBe(true);
    });

    it('should reject anatomically implausible poses', () => {
      const keypoints = [
        createMockKeypoint(100, 200, 0.8, KeypointName.LEFT_HIP),
        createMockKeypoint(120, 200, 0.8, KeypointName.RIGHT_HIP),
        createMockKeypoint(100, 150, 0.8, KeypointName.LEFT_KNEE), // Knee above hip
        createMockKeypoint(120, 150, 0.8, KeypointName.RIGHT_KNEE), // Knee above hip
        createMockKeypoint(100, 100, 0.8, KeypointName.LEFT_ANKLE), // Ankle above knee
        createMockKeypoint(120, 100, 0.8, KeypointName.RIGHT_ANKLE) // Ankle above knee
      ];
      const pose = createMockPose(keypoints);
      
      const isValid = service.validate(pose);
      expect(isValid).toBe(false);
    });

    it('should skip anatomical validation when disabled', () => {
      const config = { ...mockConfig, enableAnatomicalValidation: false };
      service = new PoseValidationService(config);
      
      const keypoints = [
        createMockKeypoint(100, 200, 0.8, KeypointName.LEFT_HIP),
        createMockKeypoint(120, 200, 0.8, KeypointName.RIGHT_HIP),
        createMockKeypoint(100, 150, 0.8, KeypointName.LEFT_KNEE), // Anatomically implausible
        createMockKeypoint(120, 150, 0.8, KeypointName.RIGHT_KNEE),
        createMockKeypoint(100, 100, 0.8, KeypointName.LEFT_ANKLE),
        createMockKeypoint(120, 100, 0.8, KeypointName.RIGHT_ANKLE)
      ];
      const pose = createMockPose(keypoints);
      
      const isValid = service.validate(pose);
      expect(isValid).toBe(true);
    });
  });

  describe('keypoint distance validation', () => {
    it('should accept poses with reasonable keypoint distances', () => {
      const keypoints = [
        createMockKeypoint(100, 200, 0.8, KeypointName.LEFT_HIP),
        createMockKeypoint(120, 200, 0.8, KeypointName.RIGHT_HIP),
        createMockKeypoint(100, 250, 0.8, KeypointName.LEFT_KNEE),
        createMockKeypoint(120, 250, 0.8, KeypointName.RIGHT_KNEE),
        createMockKeypoint(100, 300, 0.8, KeypointName.LEFT_ANKLE),
        createMockKeypoint(120, 300, 0.8, KeypointName.RIGHT_ANKLE)
      ];
      const pose = createMockPose(keypoints);
      
      const isValid = service.validate(pose);
      expect(isValid).toBe(true);
    });

    it('should reject poses with unreasonable keypoint distances', () => {
      const keypoints = [
        createMockKeypoint(100, 200, 0.8, KeypointName.LEFT_HIP),
        createMockKeypoint(500, 200, 0.8, KeypointName.RIGHT_HIP), // Too far apart
        createMockKeypoint(100, 250, 0.8, KeypointName.LEFT_KNEE),
        createMockKeypoint(120, 250, 0.8, KeypointName.RIGHT_KNEE),
        createMockKeypoint(100, 300, 0.8, KeypointName.LEFT_ANKLE),
        createMockKeypoint(120, 300, 0.8, KeypointName.RIGHT_ANKLE)
      ];
      const pose = createMockPose(keypoints);
      
      const isValid = service.validate(pose);
      expect(isValid).toBe(false);
    });
  });

  describe('configuration updates', () => {
    it('should update configuration at runtime', () => {
      const newConfig = {
        ...mockConfig,
        minPoseConfidence: 0.8,
        minVisibleKeypoints: 8
      };
      
      service.updateConfig(newConfig);
      
      const keypoints = [
        createMockKeypoint(100, 200, 0.8, KeypointName.LEFT_HIP),
        createMockKeypoint(120, 200, 0.8, KeypointName.RIGHT_HIP),
        createMockKeypoint(100, 250, 0.8, KeypointName.LEFT_KNEE),
        createMockKeypoint(120, 250, 0.8, KeypointName.RIGHT_KNEE),
        createMockKeypoint(100, 300, 0.8, KeypointName.LEFT_ANKLE),
        createMockKeypoint(120, 300, 0.8, KeypointName.RIGHT_ANKLE)
      ];
      const pose = createMockPose(keypoints, 0.6); // Below new threshold
      
      const isValid = service.validate(pose);
      expect(isValid).toBe(false);
    });

    it('should validate configuration values', () => {
      const invalidConfig = {
        ...mockConfig,
        minPoseConfidence: 1.5 // Invalid value
      };
      
      expect(() => service.updateConfig(invalidConfig)).toThrow();
    });
  });

  describe('error reporting', () => {
    it('should report multiple validation errors', () => {
      const keypoints = [
        createMockKeypoint(100, 200, 0.2, KeypointName.LEFT_HIP) // Low confidence
      ];
      const pose = createMockPose(keypoints, 0.3); // Low confidence
      
      const errors = service.getValidationErrors(pose);
      expect(errors).toContain(PoseDetectionError.LOW_CONFIDENCE);
      expect(errors).toContain(PoseDetectionError.INSUFFICIENT_KEYPOINTS);
      expect(errors.length).toBeGreaterThan(1);
    });

    it('should return no errors for valid poses', () => {
      const keypoints = [
        createMockKeypoint(100, 200, 0.8, KeypointName.LEFT_HIP),
        createMockKeypoint(120, 200, 0.8, KeypointName.RIGHT_HIP),
        createMockKeypoint(100, 250, 0.8, KeypointName.LEFT_KNEE),
        createMockKeypoint(120, 250, 0.8, KeypointName.RIGHT_KNEE),
        createMockKeypoint(100, 300, 0.8, KeypointName.LEFT_ANKLE),
        createMockKeypoint(120, 300, 0.8, KeypointName.RIGHT_ANKLE)
      ];
      const pose = createMockPose(keypoints);
      
      const errors = service.getValidationErrors(pose);
      expect(errors).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('should handle poses with no keypoints', () => {
      const pose = createMockPose([]);
      
      const isValid = service.validate(pose);
      expect(isValid).toBe(false);
      
      const errors = service.getValidationErrors(pose);
      expect(errors).toContain(PoseDetectionError.INSUFFICIENT_KEYPOINTS);
    });

    it('should handle poses with duplicate keypoints', () => {
      const keypoints = [
        createMockKeypoint(100, 200, 0.8, KeypointName.LEFT_HIP),
        createMockKeypoint(100, 200, 0.8, KeypointName.LEFT_HIP), // Duplicate
        createMockKeypoint(120, 200, 0.8, KeypointName.RIGHT_HIP),
        createMockKeypoint(100, 250, 0.8, KeypointName.LEFT_KNEE),
        createMockKeypoint(120, 250, 0.8, KeypointName.RIGHT_KNEE),
        createMockKeypoint(100, 300, 0.8, KeypointName.LEFT_ANKLE),
        createMockKeypoint(120, 300, 0.8, KeypointName.RIGHT_ANKLE)
      ];
      const pose = createMockPose(keypoints);
      
      const isValid = service.validate(pose);
      expect(isValid).toBe(true); // Should handle duplicates gracefully
    });

    it('should handle poses with undefined keypoint properties', () => {
      const keypoints = [
        { x: 100, y: 200, score: 0.8, name: KeypointName.LEFT_HIP, timestamp: Date.now() },
        { x: undefined, y: 200, score: 0.8, name: KeypointName.RIGHT_HIP, timestamp: Date.now() } as any
      ];
      const pose = createMockPose(keypoints);
      
      const isValid = service.validate(pose);
      expect(isValid).toBe(false);
    });
  });

  describe('performance', () => {
    it('should validate poses efficiently', () => {
      const keypoints = [
        createMockKeypoint(100, 200, 0.8, KeypointName.LEFT_HIP),
        createMockKeypoint(120, 200, 0.8, KeypointName.RIGHT_HIP),
        createMockKeypoint(100, 250, 0.8, KeypointName.LEFT_KNEE),
        createMockKeypoint(120, 250, 0.8, KeypointName.RIGHT_KNEE),
        createMockKeypoint(100, 300, 0.8, KeypointName.LEFT_ANKLE),
        createMockKeypoint(120, 300, 0.8, KeypointName.RIGHT_ANKLE)
      ];
      const pose = createMockPose(keypoints);
      
      const startTime = performance.now();
      for (let i = 0; i < 1000; i++) {
        service.validate(pose);
      }
      const endTime = performance.now();
      
      const avgTime = (endTime - startTime) / 1000;
      expect(avgTime).toBeLessThan(1); // Should be very fast
    });
  });
});