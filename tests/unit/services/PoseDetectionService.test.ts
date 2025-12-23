import { PoseDetectionService } from '@/services/PoseDetectionService';
import * as poseDetection from '@tensorflow-models/pose-detection';
import * as tf from '@tensorflow/tfjs';

// Mock the TensorFlow.js modules
jest.mock('@tensorflow/tfjs');
jest.mock('@tensorflow-models/pose-detection');

describe('PoseDetectionService', () => {
  let service: PoseDetectionService;
  let mockDetector: jest.Mocked<poseDetection.PoseDetector>;
  let mockTf: jest.Mocked<typeof tf>;
  let mockPoseDetection: jest.Mocked<typeof poseDetection>;

  beforeEach(() => {
    service = new PoseDetectionService();
    
    // Mock TensorFlow.js
    mockTf = tf as jest.Mocked<typeof tf>;
    mockTf.ready = jest.fn().mockResolvedValue(undefined);
    
    // Mock pose detection
    mockPoseDetection = poseDetection as jest.Mocked<typeof poseDetection>;
    
    // Mock detector
    mockDetector = {
      estimatePoses: jest.fn(),
      dispose: jest.fn(),
      reset: jest.fn()
    } as any;
    
    mockPoseDetection.createDetector = jest.fn().mockResolvedValue(mockDetector);
    mockPoseDetection.SupportedModels = {
      MoveNet: 'MoveNet',
      PoseNet: 'PoseNet',
      BlazePose: 'BlazePose'
    } as any;
    mockPoseDetection.movenet = {
      modelType: {
        SINGLEPOSE_LIGHTNING: 'SinglePose.Lightning',
        SINGLEPOSE_THUNDER: 'SinglePose.Thunder',
        MULTIPOSE_LIGHTNING: 'MultiPose.Lightning'
      }
    } as any;
    
    jest.clearAllMocks();
  });

  afterEach(() => {
    service.dispose();
  });

  describe('initialize', () => {
    it('should initialize with lightning model by default', async () => {
      await service.initialize();
      
      expect(mockTf.ready).toHaveBeenCalled();
      expect(mockPoseDetection.createDetector).toHaveBeenCalledWith(
        'MoveNet',
        {
          modelType: 'SinglePose.Lightning',
          multiPoseMaxDimension: 256,
          enableSmoothing: true,
          minPoseScore: 0.25
        }
      );
    });

    it('should initialize with thunder model when specified', async () => {
      await service.initialize('thunder');
      
      expect(mockPoseDetection.createDetector).toHaveBeenCalledWith(
        'MoveNet',
        {
          modelType: 'SinglePose.Thunder',
          multiPoseMaxDimension: 256,
          enableSmoothing: true,
          minPoseScore: 0.25
        }
      );
    });

    it('should not reinitialize if already initialized', async () => {
      await service.initialize();
      await service.initialize();
      
      expect(mockTf.ready).toHaveBeenCalledTimes(1);
      expect(mockPoseDetection.createDetector).toHaveBeenCalledTimes(1);
    });

    it('should handle initialization errors', async () => {
      const error = new Error('Model loading failed');
      mockPoseDetection.createDetector.mockRejectedValue(error);
      
      await expect(service.initialize()).rejects.toThrow('Model loading failed');
    });

    it('should handle TensorFlow.js ready failure', async () => {
      const error = new Error('TensorFlow.js not ready');
      mockTf.ready.mockRejectedValue(error);
      
      await expect(service.initialize()).rejects.toThrow('TensorFlow.js not ready');
    });
  });

  describe('estimatePoses', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should estimate poses from video element', async () => {
      const mockPoses = [
        {
          keypoints: Array.from({ length: 17 }, (_, i) => ({
            x: 100 + i * 10,
            y: 200 + i * 10,
            score: 0.9,
            name: `keypoint_${i}`
          })),
          score: 0.95
        }
      ];
      
      mockDetector.estimatePoses.mockResolvedValue(mockPoses as any);
      
      const video = document.createElement('video');
      const poses = await service.estimatePoses(video);
      
      expect(mockDetector.estimatePoses).toHaveBeenCalledWith(video, {
        maxPoses: 1,
        flipHorizontal: false,
        scoreThreshold: 0.5
      });
      
      expect(poses).toEqual(mockPoses);
    });

    it('should estimate poses from ImageData', async () => {
      const mockPoses = [global.createMockPose()];
      mockDetector.estimatePoses.mockResolvedValue(mockPoses as any);
      
      const imageData = new ImageData(100, 100);
      const poses = await service.estimatePoses(imageData);
      
      expect(mockDetector.estimatePoses).toHaveBeenCalledWith(imageData, {
        maxPoses: 1,
        flipHorizontal: false,
        scoreThreshold: 0.5
      });
      
      expect(poses).toEqual(mockPoses);
    });

    it('should estimate poses from canvas element', async () => {
      const mockPoses = [global.createMockPose()];
      mockDetector.estimatePoses.mockResolvedValue(mockPoses as any);
      
      const canvas = document.createElement('canvas');
      const poses = await service.estimatePoses(canvas);
      
      expect(mockDetector.estimatePoses).toHaveBeenCalledWith(canvas, {
        maxPoses: 1,
        flipHorizontal: false,
        scoreThreshold: 0.5
      });
      
      expect(poses).toEqual(mockPoses);
    });

    it('should handle timestamp parameter', async () => {
      const mockPoses = [global.createMockPose()];
      mockDetector.estimatePoses.mockResolvedValue(mockPoses as any);
      
      const video = document.createElement('video');
      const timestamp = Date.now();
      
      await service.estimatePoses(video, timestamp);
      
      expect(mockDetector.estimatePoses).toHaveBeenCalledWith(video, {
        maxPoses: 1,
        flipHorizontal: false,
        scoreThreshold: 0.5
      });
    });

    it('should throw error when not initialized', async () => {
      const uninitializedService = new PoseDetectionService();
      const video = document.createElement('video');
      
      await expect(uninitializedService.estimatePoses(video)).rejects.toThrow(
        'Pose detector not initialized'
      );
    });

    it('should handle estimation errors', async () => {
      const error = new Error('Pose estimation failed');
      mockDetector.estimatePoses.mockRejectedValue(error);
      
      const video = document.createElement('video');
      
      await expect(service.estimatePoses(video)).rejects.toThrow('Pose estimation failed');
    });

    it('should handle empty pose results', async () => {
      mockDetector.estimatePoses.mockResolvedValue([]);
      
      const video = document.createElement('video');
      const poses = await service.estimatePoses(video);
      
      expect(poses).toEqual([]);
    });

    it('should handle low quality poses', async () => {
      const lowQualityPoses = [{
        keypoints: Array.from({ length: 17 }, (_, i) => ({
          x: 100 + i * 10,
          y: 200 + i * 10,
          score: 0.2, // Low confidence
          name: `keypoint_${i}`
        })),
        score: 0.3 // Low overall score
      }];
      
      mockDetector.estimatePoses.mockResolvedValue(lowQualityPoses as any);
      
      const video = document.createElement('video');
      const poses = await service.estimatePoses(video);
      
      expect(poses).toEqual(lowQualityPoses);
    });
  });

  describe('dispose', () => {
    it('should dispose detector and clean up resources', async () => {
      await service.initialize();
      
      service.dispose();
      
      expect(mockDetector.dispose).toHaveBeenCalled();
    });

    it('should handle dispose when not initialized', () => {
      expect(() => service.dispose()).not.toThrow();
    });

    it('should handle multiple dispose calls', async () => {
      await service.initialize();
      
      service.dispose();
      service.dispose();
      
      expect(mockDetector.dispose).toHaveBeenCalledTimes(1);
    });

    it('should prevent estimation after dispose', async () => {
      await service.initialize();
      service.dispose();
      
      const video = document.createElement('video');
      
      await expect(service.estimatePoses(video)).rejects.toThrow(
        'Pose detector not initialized'
      );
    });
  });

  describe('model switching', () => {
    it('should switch from lightning to thunder model', async () => {
      await service.initialize('lightning');
      service.dispose();
      
      await service.initialize('thunder');
      
      expect(mockPoseDetection.createDetector).toHaveBeenCalledTimes(2);
      expect(mockPoseDetection.createDetector).toHaveBeenLastCalledWith(
        'MoveNet',
        expect.objectContaining({
          modelType: 'SinglePose.Thunder'
        })
      );
    });

    it('should switch from thunder to lightning model', async () => {
      await service.initialize('thunder');
      service.dispose();
      
      await service.initialize('lightning');
      
      expect(mockPoseDetection.createDetector).toHaveBeenCalledTimes(2);
      expect(mockPoseDetection.createDetector).toHaveBeenLastCalledWith(
        'MoveNet',
        expect.objectContaining({
          modelType: 'SinglePose.Lightning'
        })
      );
    });
  });

  describe('performance optimization', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should handle rapid successive estimation calls', async () => {
      const mockPoses = [global.createMockPose()];
      mockDetector.estimatePoses.mockResolvedValue(mockPoses as any);
      
      const video = document.createElement('video');
      const promises = [];
      
      // Make multiple rapid calls
      for (let i = 0; i < 10; i++) {
        promises.push(service.estimatePoses(video));
      }
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(10);
      expect(mockDetector.estimatePoses).toHaveBeenCalledTimes(10);
    });

    it('should handle large images efficiently', async () => {
      const mockPoses = [global.createMockPose()];
      mockDetector.estimatePoses.mockResolvedValue(mockPoses as any);
      
      const canvas = document.createElement('canvas');
      canvas.width = 1920;
      canvas.height = 1080;
      
      const startTime = performance.now();
      await service.estimatePoses(canvas);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('error handling and recovery', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should handle temporary network errors', async () => {
      const networkError = new Error('Network request failed');
      mockDetector.estimatePoses
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce([global.createMockPose()]);
      
      const video = document.createElement('video');
      
      // First call should fail
      await expect(service.estimatePoses(video)).rejects.toThrow('Network request failed');
      
      // Second call should succeed
      const poses = await service.estimatePoses(video);
      expect(poses).toHaveLength(1);
    });

    it('should handle memory errors', async () => {
      const memoryError = new Error('Out of memory');
      mockDetector.estimatePoses.mockRejectedValue(memoryError);
      
      const video = document.createElement('video');
      
      await expect(service.estimatePoses(video)).rejects.toThrow('Out of memory');
    });

    it('should handle malformed input gracefully', async () => {
      const malformedError = new Error('Invalid input tensor');
      mockDetector.estimatePoses.mockRejectedValue(malformedError);
      
      const video = document.createElement('video');
      
      await expect(service.estimatePoses(video)).rejects.toThrow('Invalid input tensor');
    });
  });

  describe('configuration options', () => {
    it('should handle custom configuration parameters', async () => {
      // Create a new service to test different configurations
      const customService = new PoseDetectionService();
      
      // Mock createDetector to capture configuration
      mockPoseDetection.createDetector.mockClear();
      
      await customService.initialize('lightning');
      
      expect(mockPoseDetection.createDetector).toHaveBeenCalledWith(
        'MoveNet',
        expect.objectContaining({
          modelType: 'SinglePose.Lightning',
          multiPoseMaxDimension: 256,
          enableSmoothing: true,
          minPoseScore: 0.25
        })
      );
      
      customService.dispose();
    });

    it('should use correct score threshold', async () => {
      const mockPoses = [global.createMockPose()];
      mockDetector.estimatePoses.mockResolvedValue(mockPoses as any);
      
      const video = document.createElement('video');
      await service.estimatePoses(video);
      
      expect(mockDetector.estimatePoses).toHaveBeenCalledWith(
        video,
        expect.objectContaining({
          scoreThreshold: 0.5
        })
      );
    });

    it('should use correct maxPoses setting', async () => {
      const mockPoses = [global.createMockPose()];
      mockDetector.estimatePoses.mockResolvedValue(mockPoses as any);
      
      const video = document.createElement('video');
      await service.estimatePoses(video);
      
      expect(mockDetector.estimatePoses).toHaveBeenCalledWith(
        video,
        expect.objectContaining({
          maxPoses: 1
        })
      );
    });
  });

  describe('keypoint validation', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should return poses with correct keypoint structure', async () => {
      const mockPoses = [{
        keypoints: [
          { x: 100, y: 200, score: 0.9, name: 'nose' },
          { x: 110, y: 210, score: 0.8, name: 'left_eye' },
          { x: 120, y: 220, score: 0.7, name: 'right_eye' }
        ],
        score: 0.85
      }];
      
      mockDetector.estimatePoses.mockResolvedValue(mockPoses as any);
      
      const video = document.createElement('video');
      const poses = await service.estimatePoses(video);
      
      expect(poses[0].keypoints).toHaveLength(3);
      expect(poses[0].keypoints[0]).toMatchObject({
        x: 100,
        y: 200,
        score: 0.9,
        name: 'nose'
      });
    });

    it('should handle missing keypoints gracefully', async () => {
      const mockPoses = [{
        keypoints: [
          { x: 100, y: 200, score: 0.9, name: 'nose' },
          { x: 0, y: 0, score: 0.1, name: 'left_eye' } // Low confidence keypoint
        ],
        score: 0.5
      }];
      
      mockDetector.estimatePoses.mockResolvedValue(mockPoses as any);
      
      const video = document.createElement('video');
      const poses = await service.estimatePoses(video);
      
      expect(poses[0].keypoints).toHaveLength(2);
      expect(poses[0].keypoints[1].score).toBe(0.1);
    });
  });
});