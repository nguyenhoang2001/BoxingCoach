/**
 * Tests for GaitPoseDetectionService
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GaitPoseDetectionService } from '../src/services/GaitPoseDetectionService';
import { 
  DEFAULT_POSE_CONFIG,
  KeypointName,
  PoseDetectionError
} from '../src/types/pose';

// Mock the individual services
vi.mock('../src/services/PoseDetectionService', () => ({
  PoseDetectionService: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    detectPoses: vi.fn().mockResolvedValue([
      {
        keypoints: [
          { x: 100, y: 200, score: 0.8, name: KeypointName.LEFT_HIP, timestamp: Date.now() },
          { x: 120, y: 200, score: 0.8, name: KeypointName.RIGHT_HIP, timestamp: Date.now() },
          { x: 100, y: 250, score: 0.8, name: KeypointName.LEFT_KNEE, timestamp: Date.now() },
          { x: 120, y: 250, score: 0.8, name: KeypointName.RIGHT_KNEE, timestamp: Date.now() },
          { x: 100, y: 300, score: 0.8, name: KeypointName.LEFT_ANKLE, timestamp: Date.now() },
          { x: 120, y: 300, score: 0.8, name: KeypointName.RIGHT_ANKLE, timestamp: Date.now() }
        ],
        confidence: 0.8,
        timestamp: Date.now(),
        id: 'test-pose-1',
        boundingBox: { x: 100, y: 200, width: 20, height: 100 }
      }
    ]),
    getStats: vi.fn().mockReturnValue({
      totalPoses: 1,
      averageConfidence: 0.8,
      currentFPS: 30,
      avgProcessingTime: 16.7,
      droppedFrames: 0,
      memoryUsage: 50,
      modelLoadTime: 1000
    }),
    updateConfig: vi.fn(),
    dispose: vi.fn(),
    isReady: vi.fn().mockReturnValue(true)
  }))
}));

vi.mock('../src/services/PoseSmoothingService', () => ({
  PoseSmoothingService: vi.fn().mockImplementation(() => ({
    smooth: vi.fn().mockImplementation((poses) => poses), // Pass through
    reset: vi.fn(),
    updateConfig: vi.fn(),
    getHistorySize: vi.fn().mockReturnValue(5)
  }))
}));

vi.mock('../src/services/PoseValidationService', () => ({
  PoseValidationService: vi.fn().mockImplementation(() => ({
    validate: vi.fn().mockReturnValue(true),
    getValidationErrors: vi.fn().mockReturnValue([]),
    updateConfig: vi.fn()
  }))
}));

describe('GaitPoseDetectionService', () => {
  let service: GaitPoseDetectionService;

  beforeEach(() => {
    service = new GaitPoseDetectionService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (service) {
      service.dispose();
    }
  });

  describe('initialization', () => {
    it('should initialize with default configuration', async () => {
      await service.initialize(DEFAULT_POSE_CONFIG);
      expect(service.isReady()).toBe(true);
    });

    it('should initialize all sub-services', async () => {
      await service.initialize(DEFAULT_POSE_CONFIG);
      
      // Import mocks to verify they were called
      const { PoseDetectionService } = await import('../src/services/PoseDetectionService');
      const { PoseSmoothingService } = await import('../src/services/PoseSmoothingService');
      const { PoseValidationService } = await import('../src/services/PoseValidationService');
      
      expect(PoseDetectionService).toHaveBeenCalled();
      expect(PoseSmoothingService).toHaveBeenCalled();
      expect(PoseValidationService).toHaveBeenCalled();
    });

    it('should configure custom settings', async () => {
      const customConfig = {
        ...DEFAULT_POSE_CONFIG,
        modelType: 'thunder' as const,
        enableGPU: false
      };

      await service.initialize(customConfig);
      expect(service.isReady()).toBe(true);
    });
  });

  describe('pose detection pipeline', () => {
    beforeEach(async () => {
      await service.initialize(DEFAULT_POSE_CONFIG);
    });

    it('should detect poses through complete pipeline', async () => {
      const mockVideo = document.createElement('video');
      const results = await service.detectPoses(mockVideo);
      
      expect(results).toHaveLength(1);
      expect(results[0]).toHaveProperty('keypoints');
      expect(results[0]).toHaveProperty('confidence');
      expect(results[0]).toHaveProperty('timestamp');
      expect(results[0]).toHaveProperty('id');
      expect(results[0]).toHaveProperty('boundingBox');
    });

    it('should validate poses before smoothing', async () => {
      const { PoseValidationService } = await import('../src/services/PoseValidationService');
      const mockValidationService = vi.mocked(PoseValidationService).mock.instances[0];
      
      // Mock validation to reject poses
      vi.mocked(mockValidationService.validate).mockReturnValue(false);
      
      const mockVideo = document.createElement('video');
      const results = await service.detectPoses(mockVideo);
      
      expect(results).toHaveLength(0); // Should be filtered out
    });

    it('should apply smoothing to valid poses', async () => {
      const { PoseSmoothingService } = await import('../src/services/PoseSmoothingService');
      const mockSmoothingService = vi.mocked(PoseSmoothingService).mock.instances[0];
      
      const mockVideo = document.createElement('video');
      await service.detectPoses(mockVideo);
      
      expect(mockSmoothingService.smooth).toHaveBeenCalled();
    });

    it('should perform final validation after smoothing', async () => {
      const { PoseValidationService } = await import('../src/services/PoseValidationService');
      const mockValidationService = vi.mocked(PoseValidationService).mock.instances[0];
      
      const mockVideo = document.createElement('video');
      await service.detectPoses(mockVideo);
      
      // Should be called twice: before and after smoothing
      expect(mockValidationService.validate).toHaveBeenCalledTimes(2);
    });

    it('should handle detection errors gracefully', async () => {
      const { PoseDetectionService } = await import('../src/services/PoseDetectionService');
      const mockDetectionService = vi.mocked(PoseDetectionService).mock.instances[0];
      
      vi.mocked(mockDetectionService.detectPoses).mockRejectedValue(new Error('Detection failed'));
      
      const mockVideo = document.createElement('video');
      await expect(service.detectPoses(mockVideo)).rejects.toThrow('Detection failed');
    });
  });

  describe('statistics and monitoring', () => {
    beforeEach(async () => {
      await service.initialize(DEFAULT_POSE_CONFIG);
    });

    it('should return detection statistics', () => {
      const stats = service.getStats();
      
      expect(stats).toHaveProperty('totalPoses');
      expect(stats).toHaveProperty('averageConfidence');
      expect(stats).toHaveProperty('currentFPS');
      expect(stats).toHaveProperty('avgProcessingTime');
      expect(stats).toHaveProperty('droppedFrames');
      expect(stats).toHaveProperty('memoryUsage');
      expect(stats).toHaveProperty('modelLoadTime');
    });

    it('should provide smoothing history size', () => {
      const historySize = service.getSmoothingHistorySize();
      expect(typeof historySize).toBe('number');
      expect(historySize).toBeGreaterThanOrEqual(0);
    });
  });

  describe('configuration management', () => {
    beforeEach(async () => {
      await service.initialize(DEFAULT_POSE_CONFIG);
    });

    it('should update configuration for all sub-services', () => {
      const { PoseDetectionService } = require('../src/services/PoseDetectionService');
      const { PoseSmoothingService } = require('../src/services/PoseSmoothingService');
      const { PoseValidationService } = require('../src/services/PoseValidationService');
      
      const mockDetectionService = vi.mocked(PoseDetectionService).mock.instances[0];
      const mockSmoothingService = vi.mocked(PoseSmoothingService).mock.instances[0];
      const mockValidationService = vi.mocked(PoseValidationService).mock.instances[0];
      
      const partialConfig = {
        validation: {
          minPoseConfidence: 0.8
        },
        smoothing: {
          smoothingFactor: 0.5
        }
      };
      
      service.updateConfig(partialConfig);
      
      expect(mockDetectionService.updateConfig).toHaveBeenCalledWith(partialConfig);
      expect(mockSmoothingService.updateConfig).toHaveBeenCalledWith(partialConfig.smoothing);
      expect(mockValidationService.updateConfig).toHaveBeenCalledWith(partialConfig.validation);
    });

    it('should handle partial configuration updates', () => {
      const partialConfig = {
        validation: {
          minPoseConfidence: 0.7
        }
      };
      
      expect(() => service.updateConfig(partialConfig)).not.toThrow();
    });
  });

  describe('resource management', () => {
    beforeEach(async () => {
      await service.initialize(DEFAULT_POSE_CONFIG);
    });

    it('should dispose all resources', () => {
      const { PoseDetectionService } = require('../src/services/PoseDetectionService');
      const { PoseSmoothingService } = require('../src/services/PoseSmoothingService');
      
      const mockDetectionService = vi.mocked(PoseDetectionService).mock.instances[0];
      const mockSmoothingService = vi.mocked(PoseSmoothingService).mock.instances[0];
      
      service.dispose();
      
      expect(mockDetectionService.dispose).toHaveBeenCalled();
      expect(mockSmoothingService.reset).toHaveBeenCalled();
    });

    it('should reset smoothing history', () => {
      const { PoseSmoothingService } = require('../src/services/PoseSmoothingService');
      const mockSmoothingService = vi.mocked(PoseSmoothingService).mock.instances[0];
      
      service.resetSmoothing();
      
      expect(mockSmoothingService.reset).toHaveBeenCalled();
    });
  });

  describe('validation integration', () => {
    beforeEach(async () => {
      await service.initialize(DEFAULT_POSE_CONFIG);
    });

    it('should provide validation errors', () => {
      const mockPose = {
        keypoints: [
          { x: 100, y: 200, score: 0.8, name: KeypointName.LEFT_HIP, timestamp: Date.now() }
        ],
        confidence: 0.8,
        timestamp: Date.now(),
        id: 'test-pose',
        boundingBox: { x: 100, y: 200, width: 20, height: 100 }
      };
      
      const errors = service.getValidationErrors(mockPose);
      expect(Array.isArray(errors)).toBe(true);
    });

    it('should handle low confidence poses', async () => {
      const { PoseValidationService } = await import('../src/services/PoseValidationService');
      const mockValidationService = vi.mocked(PoseValidationService).mock.instances[0];
      
      vi.mocked(mockValidationService.validate).mockReturnValue(false);
      vi.mocked(mockValidationService.getValidationErrors).mockReturnValue([PoseDetectionError.LOW_CONFIDENCE]);
      
      const mockVideo = document.createElement('video');
      const results = await service.detectPoses(mockVideo);
      
      expect(results).toHaveLength(0);
    });
  });

  describe('performance optimizations', () => {
    beforeEach(async () => {
      await service.initialize(DEFAULT_POSE_CONFIG);
    });

    it('should handle high-frequency detection calls', async () => {
      const mockVideo = document.createElement('video');
      
      // Simulate rapid detection calls
      const promises = Array(10).fill(0).map(() => service.detectPoses(mockVideo));
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(Array.isArray(result)).toBe(true);
      });
    });

    it('should maintain consistent performance metrics', async () => {
      const mockVideo = document.createElement('video');
      
      // Perform multiple detections
      for (let i = 0; i < 5; i++) {
        await service.detectPoses(mockVideo);
      }
      
      const stats = service.getStats();
      expect(stats.currentFPS).toBeGreaterThan(0);
      expect(stats.avgProcessingTime).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle initialization before use', async () => {
      const newService = new GaitPoseDetectionService();
      const mockVideo = document.createElement('video');
      
      // Should throw error if not initialized
      await expect(newService.detectPoses(mockVideo)).rejects.toThrow();
    });

    it('should handle null input gracefully', async () => {
      await service.initialize(DEFAULT_POSE_CONFIG);
      
      await expect(service.detectPoses(null as any)).rejects.toThrow();
    });

    it('should handle empty detection results', async () => {
      const { PoseDetectionService } = await import('../src/services/PoseDetectionService');
      const mockDetectionService = vi.mocked(PoseDetectionService).mock.instances[0];
      
      vi.mocked(mockDetectionService.detectPoses).mockResolvedValue([]);
      
      const mockVideo = document.createElement('video');
      const results = await service.detectPoses(mockVideo);
      
      expect(results).toHaveLength(0);
    });
  });
});