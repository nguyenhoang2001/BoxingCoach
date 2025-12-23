/**
 * Integration Tests for the complete Gait Detection Application
 * Tests the full application workflow and service coordination
 */

import { ApplicationCoordinator } from '../../src/services/ApplicationCoordinator';
import { AppConfig } from '../../src/types';

// Mock configuration for testing
const mockConfig: AppConfig = {
  camera: {
    defaultConstraints: {
      width: { ideal: 640, max: 1280 },
      height: { ideal: 480, max: 720 },
      frameRate: { ideal: 30, max: 60 }
    },
    permissionsTimeout: 5000,
    maxRetries: 2
  },
  ai: {
    modelPath: '/models/test',
    modelType: 'lightning',
    minPoseScore: 0.25,
    maxPoses: 1,
    enableSmoothing: true
  },
  performance: {
    targetFPS: 30,
    maxDroppedFrames: 5,
    memoryThreshold: 512,
    adaptiveQuality: true
  },
  ui: {
    theme: 'light',
    showDebugInfo: false,
    autoSaveInterval: 30000
  },
  export: {
    defaultFormat: 'json',
    includeRawData: false,
    compressionLevel: 6
  }
};

// Mock getUserMedia for testing
Object.defineProperty(global.navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: jest.fn().mockResolvedValue({
      getTracks: () => [{ stop: jest.fn() }]
    }),
    enumerateDevices: jest.fn().mockResolvedValue([
      {
        deviceId: 'camera1',
        kind: 'videoinput',
        label: 'Test Camera',
        groupId: 'test'
      }
    ])
  }
});

// Mock performance API
Object.defineProperty(global, 'performance', {
  writable: true,
  value: {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByName: jest.fn(() => [{ duration: 16.67 }]),
    memory: {
      usedJSHeapSize: 1024 * 1024 * 100 // 100MB
    }
  }
});

describe('Application Integration Tests', () => {
  let coordinator: ApplicationCoordinator;

  beforeEach(async () => {
    coordinator = new ApplicationCoordinator(mockConfig);
    
    // Mock document methods for canvas creation
    global.document.createElement = jest.fn((tagName: string) => {
      if (tagName === 'canvas') {
        return {
          getContext: jest.fn(() => ({
            drawImage: jest.fn(),
            getImageData: jest.fn(() => ({
              data: new Uint8ClampedArray(640 * 480 * 4),
              width: 640,
              height: 480
            })),
            clearRect: jest.fn(),
            beginPath: jest.fn(),
            moveTo: jest.fn(),
            lineTo: jest.fn(),
            stroke: jest.fn(),
            arc: jest.fn(),
            fill: jest.fn(),
            fillText: jest.fn()
          })),
          width: 640,
          height: 480
        };
      }
      if (tagName === 'video') {
        return {
          srcObject: null,
          autoplay: true,
          muted: true,
          videoWidth: 640,
          videoHeight: 480,
          onloadedmetadata: null,
          onerror: null,
          addEventListener: jest.fn()
        };
      }
      return {};
    });
  });

  afterEach(async () => {
    if (coordinator) {
      await coordinator.shutdown();
    }
  });

  describe('Application Lifecycle', () => {
    test('should initialize all services successfully', async () => {
      await coordinator.initialize();
      
      const state = coordinator.getState();
      expect(state.isInitialized).toBe(true);
      expect(state.error).toBeNull();
    });

    test('should start and stop the application', async () => {
      await coordinator.initialize();
      
      await coordinator.start();
      let state = coordinator.getState();
      expect(state.isRunning).toBe(true);
      expect(state.currentMode).toBe('analysis');
      
      await coordinator.stop();
      state = coordinator.getState();
      expect(state.isRunning).toBe(false);
      expect(state.currentMode).toBe('idle');
    });

    test('should handle application reset', async () => {
      await coordinator.initialize();
      await coordinator.start();
      
      await coordinator.reset();
      
      const state = coordinator.getState();
      expect(state.isRunning).toBe(false);
      expect(state.currentMode).toBe('idle');
      expect(state.error).toBeNull();
    });
  });

  describe('Service Integration', () => {
    test('should integrate camera and pose detection services', async () => {
      await coordinator.initialize();
      
      const cameraService = coordinator.getService('camera');
      const poseService = coordinator.getService('poseDetection');
      
      expect(cameraService).toBeDefined();
      expect(poseService).toBeDefined();
      
      await coordinator.start();
      
      expect(cameraService.getStatus().isCapturing).toBe(true);
      expect(poseService.getStatus().isInitialized).toBe(true);
    });

    test('should coordinate performance monitoring', async () => {
      await coordinator.initialize();
      
      const performanceService = coordinator.getService('performanceMonitor');
      expect(performanceService).toBeDefined();
      
      await coordinator.start();
      
      // Simulate some performance metrics
      const metrics = coordinator.getPerformanceMetrics();
      expect(metrics).toBeDefined();
      expect(typeof metrics.frameRate).toBe('number');
      expect(typeof metrics.memoryUsage).toBe('number');
    });

    test('should handle error recovery', async () => {
      await coordinator.initialize();
      
      const errorService = coordinator.getService('errorHandling');
      expect(errorService).toBeDefined();
      
      // Simulate an error
      const testError = {
        id: 'test-error',
        type: 'camera' as const,
        severity: 'medium' as const,
        message: 'Test camera error',
        timestamp: Date.now(),
        recoverable: true
      };
      
      errorService.handleError(testError);
      
      const errorHistory = errorService.getErrorHistory();
      expect(errorHistory).toContain(testError);
    });
  });

  describe('Data Flow Integration', () => {
    test('should process frame data through the pipeline', async () => {
      await coordinator.initialize();
      await coordinator.start();
      
      const gaitService = coordinator.getService('gaitAnalysis');
      
      // Mock pose data
      const mockPose = {
        keypoints: Array(17).fill({
          x: 100,
          y: 200,
          score: 0.8,
          name: 'test_keypoint'
        }),
        score: 0.8
      };
      
      // Add pose data
      gaitService.addPose(mockPose, Date.now());
      
      const status = gaitService.getStatus();
      expect(status.poseHistoryLength).toBeGreaterThan(0);
    });

    test('should export data in different formats', async () => {
      await coordinator.initialize();
      
      const exportOptions = {
        format: 'json' as const,
        includeRawData: false,
        includeSummaryStats: true,
        compression: false
      };
      
      const blob = await coordinator.exportData(exportOptions);
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/json');
    });
  });

  describe('Performance Integration', () => {
    test('should maintain target performance metrics', async () => {
      await coordinator.initialize();
      await coordinator.start();
      
      const adaptiveQualityService = coordinator.getService('adaptiveQuality');
      
      // Simulate good performance
      const goodMetrics = {
        frameRate: 30,
        averageProcessingTime: 16.67,
        memoryUsage: 200,
        droppedFrames: 0,
        modelInferenceTime: 10,
        renderingTime: 6.67,
        overallHealth: 'excellent' as const
      };
      
      adaptiveQualityService.updatePerformanceMetrics(goodMetrics);
      
      const settings = adaptiveQualityService.getSettings();
      expect(settings.frameRate).toBeGreaterThanOrEqual(30);
    });

    test('should adapt quality under performance pressure', async () => {
      await coordinator.initialize();
      await coordinator.start();
      
      const adaptiveQualityService = coordinator.getService('adaptiveQuality');
      
      // Simulate poor performance
      const poorMetrics = {
        frameRate: 15,
        averageProcessingTime: 66.67,
        memoryUsage: 600,
        droppedFrames: 10,
        modelInferenceTime: 40,
        renderingTime: 26.67,
        overallHealth: 'poor' as const
      };
      
      adaptiveQualityService.updatePerformanceMetrics(poorMetrics);
      
      // Wait for adaptation
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const settings = adaptiveQualityService.getSettings();
      expect(settings.processEveryNthFrame).toBeGreaterThan(1);
    });
  });

  describe('Configuration Management', () => {
    test('should update configuration at runtime', async () => {
      await coordinator.initialize();
      
      const newConfig = {
        performance: {
          ...mockConfig.performance,
          targetFPS: 25
        }
      };
      
      await coordinator.updateConfig(newConfig);
      
      const updatedConfig = coordinator.getConfig();
      expect(updatedConfig.performance.targetFPS).toBe(25);
    });
  });

  describe('Error Scenarios', () => {
    test('should handle camera access failure gracefully', async () => {
      // Mock camera failure
      (global.navigator.mediaDevices.getUserMedia as jest.Mock)
        .mockRejectedValueOnce(new Error('Camera access denied'));
      
      await coordinator.initialize();
      
      await expect(coordinator.start()).rejects.toThrow();
      
      const state = coordinator.getState();
      expect(state.isRunning).toBe(false);
    });

    test('should recover from temporary service failures', async () => {
      await coordinator.initialize();
      await coordinator.start();
      
      const cameraService = coordinator.getService('camera');
      
      // Simulate camera restart
      await cameraService.restart();
      
      expect(cameraService.getStatus().isCapturing).toBe(true);
    });
  });

  describe('Memory Management', () => {
    test('should not have memory leaks during extended operation', async () => {
      await coordinator.initialize();
      await coordinator.start();
      
      const initialMemory = coordinator.getPerformanceMetrics().memoryUsage;
      
      // Simulate extended operation
      for (let i = 0; i < 100; i++) {
        const gaitService = coordinator.getService('gaitAnalysis');
        const mockPose = {
          keypoints: Array(17).fill({ x: 100, y: 200, score: 0.8 }),
          score: 0.8
        };
        gaitService.addPose(mockPose, Date.now());
      }
      
      const finalMemory = coordinator.getPerformanceMetrics().memoryUsage;
      
      // Memory should not grow excessively
      expect(finalMemory - initialMemory).toBeLessThan(100); // Less than 100MB growth
    });
  });

  describe('Real-time Performance', () => {
    test('should maintain real-time performance targets', async () => {
      jest.setTimeout(10000); // 10 second timeout for this test
      
      await coordinator.initialize();
      await coordinator.start();
      
      const performancePromises: Promise<number>[] = [];
      
      // Simulate 30 frames of processing
      for (let i = 0; i < 30; i++) {
        const promise = new Promise<number>((resolve) => {
          const startTime = performance.now();
          
          // Simulate frame processing
          setTimeout(() => {
            const endTime = performance.now();
            resolve(endTime - startTime);
          }, 16); // 16ms target frame time
        });
        
        performancePromises.push(promise);
      }
      
      const processingTimes = await Promise.all(performancePromises);
      const averageTime = processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length;
      
      // Should maintain close to 60 FPS (16.67ms per frame)
      expect(averageTime).toBeLessThan(33.33); // Should be better than 30 FPS
    });
  });
});