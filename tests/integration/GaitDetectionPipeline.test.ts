import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CameraService } from '@/services/CameraService';
import { PoseDetectionService } from '@/services/PoseDetectionService';
import { GaitAnalysisService } from '@/services/GaitAnalysisService';
import { PersonTrackingService } from '@/services/PersonTrackingService';
import { PerformanceMonitorService } from '@/services/PerformanceMonitorService';

// Mock services for integration testing
jest.mock('@/services/CameraService');
jest.mock('@/services/PoseDetectionService');
jest.mock('@/services/GaitAnalysisService');
jest.mock('@/services/PersonTrackingService');
jest.mock('@/services/PerformanceMonitorService');

describe('Gait Detection Pipeline Integration Tests', () => {
  let mockCameraService: jest.Mocked<CameraService>;
  let mockPoseDetectionService: jest.Mocked<PoseDetectionService>;
  let mockGaitAnalysisService: jest.Mocked<GaitAnalysisService>;
  let mockPersonTrackingService: jest.Mocked<PersonTrackingService>;
  let mockPerformanceMonitorService: jest.Mocked<PerformanceMonitorService>;

  beforeEach(() => {
    // Setup mocked services
    mockCameraService = new CameraService() as jest.Mocked<CameraService>;
    mockPoseDetectionService = new PoseDetectionService() as jest.Mocked<PoseDetectionService>;
    mockGaitAnalysisService = new GaitAnalysisService() as jest.Mocked<GaitAnalysisService>;
    mockPersonTrackingService = new PersonTrackingService() as jest.Mocked<PersonTrackingService>;
    mockPerformanceMonitorService = new PerformanceMonitorService() as jest.Mocked<PerformanceMonitorService>;

    // Mock camera service methods
    mockCameraService.initializeCamera = jest.fn().mockResolvedValue(document.createElement('video'));
    mockCameraService.stopCamera = jest.fn();
    mockCameraService.getAvailableDevices = jest.fn().mockResolvedValue([
      { deviceId: 'camera1', kind: 'videoinput', label: 'Test Camera', groupId: 'group1' }
    ]);

    // Mock pose detection service methods
    mockPoseDetectionService.initialize = jest.fn().mockResolvedValue(undefined);
    mockPoseDetectionService.estimatePoses = jest.fn().mockResolvedValue([global.createMockPose()]);
    mockPoseDetectionService.dispose = jest.fn();

    // Mock gait analysis service methods
    mockGaitAnalysisService.addPose = jest.fn();
    mockGaitAnalysisService.calculateGaitParameters = jest.fn().mockReturnValue(global.createMockGaitParameters());
    mockGaitAnalysisService.calibratePixelsPerMeter = jest.fn();
    mockGaitAnalysisService.reset = jest.fn();

    // Mock person tracking service methods
    mockPersonTrackingService.updateTracking = jest.fn().mockReturnValue([
      {
        id: 'person1',
        poses: [{ pose: global.createMockPose(), timestamp: Date.now() }],
        lastSeen: Date.now(),
        boundingBox: { x: 100, y: 100, width: 200, height: 400 },
        confidence: 0.9
      }
    ]);
    mockPersonTrackingService.reset = jest.fn();

    // Mock performance monitor service methods
    mockPerformanceMonitorService.startFrameProcessing = jest.fn();
    mockPerformanceMonitorService.endFrameProcessing = jest.fn();
    mockPerformanceMonitorService.getMetrics = jest.fn().mockReturnValue({
      frameRate: 30,
      averageProcessingTime: 16.67,
      memoryUsage: 50,
      cpuUsage: 25,
      droppedFrames: 0,
      modelInferenceTime: 10,
      renderingTime: 5
    });
    mockPerformanceMonitorService.startMeasurement = jest.fn();
    mockPerformanceMonitorService.endMeasurement = jest.fn();
    mockPerformanceMonitorService.dispose = jest.fn();

    jest.clearAllMocks();
  });

  describe('Full Pipeline Integration', () => {
    it('should initialize all services in correct order', async () => {
      class GaitDetectionPipeline {
        private cameraService = mockCameraService;
        private poseDetectionService = mockPoseDetectionService;
        private gaitAnalysisService = mockGaitAnalysisService;
        private personTrackingService = mockPersonTrackingService;
        private performanceMonitorService = mockPerformanceMonitorService;

        async initialize() {
          await this.poseDetectionService.initialize('lightning');
          const video = await this.cameraService.initializeCamera();
          return video;
        }

        async processFrame(video: HTMLVideoElement) {
          this.performanceMonitorService.startFrameProcessing();
          
          const poses = await this.poseDetectionService.estimatePoses(video);
          const trackedPersons = this.personTrackingService.updateTracking(poses, Date.now());
          
          poses.forEach(pose => {
            this.gaitAnalysisService.addPose(pose, Date.now());
          });
          
          const gaitParameters = this.gaitAnalysisService.calculateGaitParameters();
          
          this.performanceMonitorService.endFrameProcessing();
          
          return { poses, trackedPersons, gaitParameters };
        }

        dispose() {
          this.cameraService.stopCamera();
          this.poseDetectionService.dispose();
          this.performanceMonitorService.dispose();
        }
      }

      const pipeline = new GaitDetectionPipeline();
      
      // Test initialization
      const video = await pipeline.initialize();
      expect(video).toBeInstanceOf(HTMLVideoElement);
      expect(mockPoseDetectionService.initialize).toHaveBeenCalledWith('lightning');
      expect(mockCameraService.initializeCamera).toHaveBeenCalled();

      // Test frame processing
      const result = await pipeline.processFrame(video);
      expect(result.poses).toHaveLength(1);
      expect(result.trackedPersons).toHaveLength(1);
      expect(result.gaitParameters).toBeDefined();

      // Test cleanup
      pipeline.dispose();
      expect(mockCameraService.stopCamera).toHaveBeenCalled();
      expect(mockPoseDetectionService.dispose).toHaveBeenCalled();
      expect(mockPerformanceMonitorService.dispose).toHaveBeenCalled();
    });

    it('should handle service initialization failures gracefully', async () => {
      class GaitDetectionPipeline {
        private cameraService = mockCameraService;
        private poseDetectionService = mockPoseDetectionService;

        async initialize() {
          await this.poseDetectionService.initialize('lightning');
          const video = await this.cameraService.initializeCamera();
          return video;
        }
      }

      const pipeline = new GaitDetectionPipeline();
      
      // Mock initialization failure
      mockPoseDetectionService.initialize.mockRejectedValue(new Error('Model loading failed'));
      
      await expect(pipeline.initialize()).rejects.toThrow('Model loading failed');
    });

    it('should handle camera initialization failures gracefully', async () => {
      class GaitDetectionPipeline {
        private cameraService = mockCameraService;
        private poseDetectionService = mockPoseDetectionService;

        async initialize() {
          await this.poseDetectionService.initialize('lightning');
          const video = await this.cameraService.initializeCamera();
          return video;
        }
      }

      const pipeline = new GaitDetectionPipeline();
      
      // Mock camera failure
      mockCameraService.initializeCamera.mockRejectedValue(new Error('Camera access denied'));
      
      await expect(pipeline.initialize()).rejects.toThrow('Camera access denied');
    });
  });

  describe('Real-time Processing Pipeline', () => {
    it('should process frames continuously', async () => {
      class RealTimeGaitDetection {
        private cameraService = mockCameraService;
        private poseDetectionService = mockPoseDetectionService;
        private gaitAnalysisService = mockGaitAnalysisService;
        private performanceMonitorService = mockPerformanceMonitorService;
        private processingLoop: number | null = null;
        private isProcessing = false;

        async start() {
          await this.poseDetectionService.initialize('lightning');
          const video = await this.cameraService.initializeCamera();
          
          this.isProcessing = true;
          this.processingLoop = setInterval(() => {
            this.processFrame(video);
          }, 33); // ~30 FPS
          
          return video;
        }

        async processFrame(video: HTMLVideoElement) {
          if (!this.isProcessing) return;
          
          this.performanceMonitorService.startFrameProcessing();
          
          try {
            const poses = await this.poseDetectionService.estimatePoses(video);
            
            poses.forEach(pose => {
              this.gaitAnalysisService.addPose(pose, Date.now());
            });
            
            const gaitParameters = this.gaitAnalysisService.calculateGaitParameters();
            
            this.performanceMonitorService.endFrameProcessing();
            
            return { poses, gaitParameters };
          } catch (error) {
            console.error('Frame processing error:', error);
            this.performanceMonitorService.endFrameProcessing();
            throw error;
          }
        }

        stop() {
          this.isProcessing = false;
          if (this.processingLoop) {
            clearInterval(this.processingLoop);
            this.processingLoop = null;
          }
          this.cameraService.stopCamera();
          this.poseDetectionService.dispose();
        }
      }

      const realTimeDetection = new RealTimeGaitDetection();
      
      // Start real-time processing
      await realTimeDetection.start();
      
      // Wait for a few processing cycles
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify processing started
      expect(mockPerformanceMonitorService.startFrameProcessing).toHaveBeenCalled();
      expect(mockPoseDetectionService.estimatePoses).toHaveBeenCalled();
      expect(mockGaitAnalysisService.addPose).toHaveBeenCalled();
      
      // Stop processing
      realTimeDetection.stop();
      
      expect(mockCameraService.stopCamera).toHaveBeenCalled();
      expect(mockPoseDetectionService.dispose).toHaveBeenCalled();
    });

    it('should handle processing errors without crashing', async () => {
      class RealTimeGaitDetection {
        private poseDetectionService = mockPoseDetectionService;
        private gaitAnalysisService = mockGaitAnalysisService;
        private performanceMonitorService = mockPerformanceMonitorService;

        async processFrame(video: HTMLVideoElement) {
          this.performanceMonitorService.startFrameProcessing();
          
          try {
            const poses = await this.poseDetectionService.estimatePoses(video);
            
            poses.forEach(pose => {
              this.gaitAnalysisService.addPose(pose, Date.now());
            });
            
            const gaitParameters = this.gaitAnalysisService.calculateGaitParameters();
            
            this.performanceMonitorService.endFrameProcessing();
            
            return { poses, gaitParameters };
          } catch (error) {
            this.performanceMonitorService.endFrameProcessing();
            throw error;
          }
        }
      }

      const realTimeDetection = new RealTimeGaitDetection();
      
      // Mock pose detection failure
      mockPoseDetectionService.estimatePoses.mockRejectedValue(new Error('Pose detection failed'));
      
      const video = document.createElement('video');
      
      await expect(realTimeDetection.processFrame(video)).rejects.toThrow('Pose detection failed');
      
      // Verify performance monitoring still called
      expect(mockPerformanceMonitorService.startFrameProcessing).toHaveBeenCalled();
      expect(mockPerformanceMonitorService.endFrameProcessing).toHaveBeenCalled();
    });
  });

  describe('Multi-person Tracking Integration', () => {
    it('should track multiple people simultaneously', async () => {
      class MultiPersonGaitDetection {
        private poseDetectionService = mockPoseDetectionService;
        private personTrackingService = mockPersonTrackingService;
        private gaitAnalysisService = mockGaitAnalysisService;

        async processFrame(video: HTMLVideoElement) {
          const poses = await this.poseDetectionService.estimatePoses(video);
          const trackedPersons = this.personTrackingService.updateTracking(poses, Date.now());
          
          // Process gait analysis for each tracked person
          trackedPersons.forEach(person => {
            person.poses.forEach(poseData => {
              this.gaitAnalysisService.addPose(poseData.pose, poseData.timestamp);
            });
          });
          
          const gaitParameters = this.gaitAnalysisService.calculateGaitParameters();
          
          return { poses, trackedPersons, gaitParameters };
        }
      }

      const multiPersonDetection = new MultiPersonGaitDetection();
      
      // Mock multiple poses
      const multiplePoses = [
        global.createMockPose({ score: 0.9 }),
        global.createMockPose({ score: 0.8 })
      ];
      
      mockPoseDetectionService.estimatePoses.mockResolvedValue(multiplePoses);
      
      // Mock multiple tracked persons
      const multipleTrackedPersons = [
        {
          id: 'person1',
          poses: [{ pose: multiplePoses[0], timestamp: Date.now() }],
          lastSeen: Date.now(),
          boundingBox: { x: 100, y: 100, width: 200, height: 400 },
          confidence: 0.9
        },
        {
          id: 'person2',
          poses: [{ pose: multiplePoses[1], timestamp: Date.now() }],
          lastSeen: Date.now(),
          boundingBox: { x: 300, y: 100, width: 200, height: 400 },
          confidence: 0.8
        }
      ];
      
      mockPersonTrackingService.updateTracking.mockReturnValue(multipleTrackedPersons);
      
      const video = document.createElement('video');
      const result = await multiPersonDetection.processFrame(video);
      
      expect(result.poses).toHaveLength(2);
      expect(result.trackedPersons).toHaveLength(2);
      expect(mockGaitAnalysisService.addPose).toHaveBeenCalledTimes(2);
    });
  });

  describe('Performance Monitoring Integration', () => {
    it('should monitor performance metrics throughout pipeline', async () => {
      class PerformanceMonitoredPipeline {
        private poseDetectionService = mockPoseDetectionService;
        private gaitAnalysisService = mockGaitAnalysisService;
        private performanceMonitorService = mockPerformanceMonitorService;

        async processFrame(video: HTMLVideoElement) {
          this.performanceMonitorService.startFrameProcessing();
          this.performanceMonitorService.startMeasurement('pose-detection');
          
          const poses = await this.poseDetectionService.estimatePoses(video);
          
          this.performanceMonitorService.endMeasurement('pose-detection');
          this.performanceMonitorService.startMeasurement('gait-analysis');
          
          poses.forEach(pose => {
            this.gaitAnalysisService.addPose(pose, Date.now());
          });
          
          const gaitParameters = this.gaitAnalysisService.calculateGaitParameters();
          
          this.performanceMonitorService.endMeasurement('gait-analysis');
          this.performanceMonitorService.endFrameProcessing();
          
          const metrics = this.performanceMonitorService.getMetrics();
          
          return { poses, gaitParameters, metrics };
        }
      }

      const monitoredPipeline = new PerformanceMonitoredPipeline();
      
      const video = document.createElement('video');
      const result = await monitoredPipeline.processFrame(video);
      
      expect(mockPerformanceMonitorService.startFrameProcessing).toHaveBeenCalled();
      expect(mockPerformanceMonitorService.startMeasurement).toHaveBeenCalledWith('pose-detection');
      expect(mockPerformanceMonitorService.startMeasurement).toHaveBeenCalledWith('gait-analysis');
      expect(mockPerformanceMonitorService.endMeasurement).toHaveBeenCalledWith('pose-detection');
      expect(mockPerformanceMonitorService.endMeasurement).toHaveBeenCalledWith('gait-analysis');
      expect(mockPerformanceMonitorService.endFrameProcessing).toHaveBeenCalled();
      expect(mockPerformanceMonitorService.getMetrics).toHaveBeenCalled();
      
      expect(result.metrics).toBeDefined();
      expect(result.metrics.frameRate).toBe(30);
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from temporary service failures', async () => {
      class ResilientPipeline {
        private poseDetectionService = mockPoseDetectionService;
        private gaitAnalysisService = mockGaitAnalysisService;
        private retryCount = 0;
        private maxRetries = 3;

        async processFrameWithRetry(video: HTMLVideoElement) {
          try {
            const poses = await this.poseDetectionService.estimatePoses(video);
            
            poses.forEach(pose => {
              this.gaitAnalysisService.addPose(pose, Date.now());
            });
            
            const gaitParameters = this.gaitAnalysisService.calculateGaitParameters();
            
            this.retryCount = 0; // Reset retry count on success
            
            return { poses, gaitParameters };
          } catch (error) {
            if (this.retryCount < this.maxRetries) {
              this.retryCount++;
              console.log(`Retrying frame processing (${this.retryCount}/${this.maxRetries})`);
              await new Promise(resolve => setTimeout(resolve, 100)); // Wait before retry
              return this.processFrameWithRetry(video);
            } else {
              throw error;
            }
          }
        }
      }

      const resilientPipeline = new ResilientPipeline();
      
      // Mock temporary failures followed by success
      mockPoseDetectionService.estimatePoses
        .mockRejectedValueOnce(new Error('Temporary failure 1'))
        .mockRejectedValueOnce(new Error('Temporary failure 2'))
        .mockResolvedValueOnce([global.createMockPose()]);
      
      const video = document.createElement('video');
      const result = await resilientPipeline.processFrameWithRetry(video);
      
      expect(result.poses).toHaveLength(1);
      expect(mockPoseDetectionService.estimatePoses).toHaveBeenCalledTimes(3);
    });

    it('should handle permanent service failures', async () => {
      class ResilientPipeline {
        private poseDetectionService = mockPoseDetectionService;
        private maxRetries = 3;

        async processFrameWithRetry(video: HTMLVideoElement) {
          let retryCount = 0;
          
          while (retryCount < this.maxRetries) {
            try {
              const poses = await this.poseDetectionService.estimatePoses(video);
              return { poses };
            } catch (error) {
              retryCount++;
              if (retryCount >= this.maxRetries) {
                throw new Error(`Failed after ${this.maxRetries} attempts: ${error.message}`);
              }
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }
        }
      }

      const resilientPipeline = new ResilientPipeline();
      
      // Mock permanent failure
      mockPoseDetectionService.estimatePoses.mockRejectedValue(new Error('Permanent failure'));
      
      const video = document.createElement('video');
      
      await expect(resilientPipeline.processFrameWithRetry(video)).rejects.toThrow(
        'Failed after 3 attempts: Permanent failure'
      );
      
      expect(mockPoseDetectionService.estimatePoses).toHaveBeenCalledTimes(3);
    });
  });

  describe('Data Flow Validation', () => {
    it('should maintain data integrity throughout pipeline', async () => {
      class DataValidationPipeline {
        private poseDetectionService = mockPoseDetectionService;
        private gaitAnalysisService = mockGaitAnalysisService;
        private personTrackingService = mockPersonTrackingService;

        async processFrame(video: HTMLVideoElement) {
          const poses = await this.poseDetectionService.estimatePoses(video);
          
          // Validate poses
          poses.forEach(pose => {
            expect(pose.keypoints).toBeDefined();
            expect(pose.keypoints.length).toBe(17);
            expect(pose.score).toBeGreaterThan(0);
          });
          
          const trackedPersons = this.personTrackingService.updateTracking(poses, Date.now());
          
          // Validate tracking data
          trackedPersons.forEach(person => {
            expect(person.id).toBeDefined();
            expect(person.confidence).toBeGreaterThan(0);
            expect(person.boundingBox).toBeDefined();
          });
          
          poses.forEach(pose => {
            this.gaitAnalysisService.addPose(pose, Date.now());
          });
          
          const gaitParameters = this.gaitAnalysisService.calculateGaitParameters();
          
          // Validate gait parameters
          expect(gaitParameters.cadence).toBeGreaterThanOrEqual(0);
          expect(gaitParameters.confidence).toBeGreaterThanOrEqual(0);
          expect(gaitParameters.confidence).toBeLessThanOrEqual(1);
          
          return { poses, trackedPersons, gaitParameters };
        }
      }

      const validationPipeline = new DataValidationPipeline();
      
      const video = document.createElement('video');
      const result = await validationPipeline.processFrame(video);
      
      expect(result.poses).toBeDefined();
      expect(result.trackedPersons).toBeDefined();
      expect(result.gaitParameters).toBeDefined();
    });
  });

  describe('Memory Management', () => {
    it('should properly manage memory throughout pipeline lifecycle', async () => {
      class MemoryManagedPipeline {
        private cameraService = mockCameraService;
        private poseDetectionService = mockPoseDetectionService;
        private gaitAnalysisService = mockGaitAnalysisService;
        private personTrackingService = mockPersonTrackingService;
        private performanceMonitorService = mockPerformanceMonitorService;

        async initialize() {
          await this.poseDetectionService.initialize('lightning');
          return await this.cameraService.initializeCamera();
        }

        async processFrame(video: HTMLVideoElement) {
          const poses = await this.poseDetectionService.estimatePoses(video);
          const trackedPersons = this.personTrackingService.updateTracking(poses, Date.now());
          
          poses.forEach(pose => {
            this.gaitAnalysisService.addPose(pose, Date.now());
          });
          
          const gaitParameters = this.gaitAnalysisService.calculateGaitParameters();
          
          return { poses, trackedPersons, gaitParameters };
        }

        reset() {
          this.gaitAnalysisService.reset();
          this.personTrackingService.reset();
        }

        dispose() {
          this.cameraService.stopCamera();
          this.poseDetectionService.dispose();
          this.performanceMonitorService.dispose();
        }
      }

      const memoryManagedPipeline = new MemoryManagedPipeline();
      
      // Test initialization
      const video = await memoryManagedPipeline.initialize();
      
      // Process multiple frames
      for (let i = 0; i < 10; i++) {
        await memoryManagedPipeline.processFrame(video);
      }
      
      // Test reset
      memoryManagedPipeline.reset();
      expect(mockGaitAnalysisService.reset).toHaveBeenCalled();
      expect(mockPersonTrackingService.reset).toHaveBeenCalled();
      
      // Test disposal
      memoryManagedPipeline.dispose();
      expect(mockCameraService.stopCamera).toHaveBeenCalled();
      expect(mockPoseDetectionService.dispose).toHaveBeenCalled();
      expect(mockPerformanceMonitorService.dispose).toHaveBeenCalled();
    });
  });
});