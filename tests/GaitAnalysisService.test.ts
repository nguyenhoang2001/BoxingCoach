/**
 * Comprehensive test suite for GaitAnalysisService
 * Tests based on biomechanics research and clinical validation
 */

import { GaitAnalysisService } from '../src/services/GaitAnalysisService';
import { 
  Pose, 
  Keypoint, 
  GaitPhase, 
  GaitEvent, 
  GaitParameters,
  GaitAnalysisConfig,
  TemporalParameters,
  SpatialParameters,
  SymmetryParameters
} from '../src/types/gait';

describe('GaitAnalysisService', () => {
  let service: GaitAnalysisService;
  let mockConfig: GaitAnalysisConfig;

  beforeEach(() => {
    mockConfig = {
      calibration: {
        pixelsPerMeter: 100,
        subjectHeight: 1.7,
        referenceDistance: 2.0
      },
      detection: {
        minConfidenceThreshold: 0.5,
        smoothingWindowSize: 5,
        eventDetectionThreshold: 0.3
      },
      processing: {
        maxHistorySize: 300,
        updateInterval: 33,
        enableRealTimeProcessing: true
      },
      filters: {
        enableTemporalSmoothing: true,
        enableOutlierDetection: true,
        outlierThreshold: 2.0
      }
    };

    service = new GaitAnalysisService(mockConfig);
  });

  afterEach(() => {
    service.reset();
  });

  describe('Initialization', () => {
    test('should initialize with default configuration', () => {
      const defaultService = new GaitAnalysisService();
      expect(defaultService).toBeDefined();
      expect(defaultService.getConfig()).toBeDefined();
    });

    test('should initialize with custom configuration', () => {
      const config = service.getConfig();
      expect(config.calibration.pixelsPerMeter).toBe(100);
      expect(config.detection.minConfidenceThreshold).toBe(0.5);
    });
  });

  describe('Pose Processing', () => {
    test('should add pose to history', () => {
      const pose = createMockPose();
      const timestamp = Date.now();
      
      service.addPose(pose, timestamp);
      
      const history = service.getPoseHistory();
      expect(history).toHaveLength(1);
      expect(history[0].timestamp).toBe(timestamp);
    });

    test('should maintain history size limit', () => {
      const maxSize = mockConfig.processing.maxHistorySize;
      
      for (let i = 0; i < maxSize + 50; i++) {
        service.addPose(createMockPose(), Date.now() + i);
      }
      
      const history = service.getPoseHistory();
      expect(history).toHaveLength(maxSize);
    });

    test('should filter poses by confidence threshold', () => {
      const lowConfidencePose = createMockPose(0.3);
      const highConfidencePose = createMockPose(0.8);
      
      service.addPose(lowConfidencePose, Date.now());
      service.addPose(highConfidencePose, Date.now() + 100);
      
      const validPoses = service.getValidPoses();
      expect(validPoses).toHaveLength(1);
      expect(validPoses[0].pose.score).toBe(0.8);
    });
  });

  describe('Gait Event Detection', () => {
    test('should detect heel strike events', () => {
      const poses = createGaitCyclePoses();
      poses.forEach((pose, index) => {
        service.addPose(pose, Date.now() + index * 100);
      });

      const events = service.getGaitEvents();
      const heelStrikes = events.filter(e => e.phase === GaitPhase.HEEL_STRIKE);
      
      expect(heelStrikes.length).toBeGreaterThan(0);
      expect(heelStrikes[0].foot).toBeDefined();
      expect(heelStrikes[0].confidence).toBeGreaterThan(0);
    });

    test('should detect toe-off events', () => {
      const poses = createGaitCyclePoses();
      poses.forEach((pose, index) => {
        service.addPose(pose, Date.now() + index * 100);
      });

      const events = service.getGaitEvents();
      const toeOffs = events.filter(e => e.phase === GaitPhase.PRE_SWING);
      
      expect(toeOffs.length).toBeGreaterThan(0);
    });

    test('should maintain temporal consistency in events', () => {
      const poses = createGaitCyclePoses();
      poses.forEach((pose, index) => {
        service.addPose(pose, Date.now() + index * 100);
      });

      const events = service.getGaitEvents();
      
      // Events should be chronologically ordered
      for (let i = 1; i < events.length; i++) {
        expect(events[i].timestamp).toBeGreaterThanOrEqual(events[i-1].timestamp);
      }
    });
  });

  describe('Temporal Parameter Calculation', () => {
    test('should calculate cadence correctly', () => {
      const startTime = Date.now();
      const poses = createGaitCyclePoses();
      
      // Add poses over 10 seconds to get stable cadence
      poses.forEach((pose, index) => {
        service.addPose(pose, startTime + index * 100);
      });

      const parameters = service.calculateGaitParameters();
      
      expect(parameters.temporal.cadence).toBeGreaterThan(0);
      expect(parameters.temporal.cadence).toBeLessThan(200); // Reasonable upper bound
    });

    test('should calculate stride time correctly', () => {
      const poses = createGaitCyclePoses();
      poses.forEach((pose, index) => {
        service.addPose(pose, Date.now() + index * 100);
      });

      const parameters = service.calculateGaitParameters();
      
      expect(parameters.temporal.strideTime).toBeGreaterThan(0);
      expect(parameters.temporal.strideTime).toBeLessThan(3.0); // Reasonable upper bound
    });

    test('should calculate stance and swing times', () => {
      const poses = createGaitCyclePoses();
      poses.forEach((pose, index) => {
        service.addPose(pose, Date.now() + index * 100);
      });

      const parameters = service.calculateGaitParameters();
      
      expect(parameters.temporal.stanceTime).toBeGreaterThan(0);
      expect(parameters.temporal.swingTime).toBeGreaterThan(0);
      
      // Stance time should be approximately 60% of stride time
      const stanceRatio = parameters.temporal.stanceTime / parameters.temporal.strideTime;
      expect(stanceRatio).toBeGreaterThan(0.5);
      expect(stanceRatio).toBeLessThan(0.8);
    });
  });

  describe('Spatial Parameter Calculation', () => {
    test('should calculate stride length with calibration', () => {
      service.calibrate({ pixelsPerMeter: 100, subjectHeight: 1.7 });
      
      const poses = createGaitCyclePoses();
      poses.forEach((pose, index) => {
        service.addPose(pose, Date.now() + index * 100);
      });

      const parameters = service.calculateGaitParameters();
      
      expect(parameters.spatial.strideLength).toBeGreaterThan(0);
      expect(parameters.spatial.strideLength).toBeLessThan(3.0); // Reasonable upper bound
    });

    test('should calculate step width correctly', () => {
      const poses = createGaitCyclePoses();
      poses.forEach((pose, index) => {
        service.addPose(pose, Date.now() + index * 100);
      });

      const parameters = service.calculateGaitParameters();
      
      expect(parameters.spatial.stepWidth).toBeGreaterThan(0);
      expect(parameters.spatial.stepWidth).toBeLessThan(0.5); // Reasonable upper bound
    });

    test('should handle missing calibration gracefully', () => {
      const poses = createGaitCyclePoses();
      poses.forEach((pose, index) => {
        service.addPose(pose, Date.now() + index * 100);
      });

      const parameters = service.calculateGaitParameters();
      
      // Should return normalized values or zero when uncalibrated
      expect(parameters.spatial.confidence).toBeLessThan(0.5);
    });
  });

  describe('Derived Parameter Calculation', () => {
    test('should calculate velocity from stride length and cadence', () => {
      service.calibrate({ pixelsPerMeter: 100, subjectHeight: 1.7 });
      
      const poses = createGaitCyclePoses();
      poses.forEach((pose, index) => {
        service.addPose(pose, Date.now() + index * 100);
      });

      const parameters = service.calculateGaitParameters();
      
      expect(parameters.derived.velocity).toBeGreaterThan(0);
      expect(parameters.derived.velocity).toBeLessThan(3.0); // Reasonable upper bound
    });

    test('should calculate normalized velocity', () => {
      service.calibrate({ pixelsPerMeter: 100, subjectHeight: 1.7 });
      
      const poses = createGaitCyclePoses();
      poses.forEach((pose, index) => {
        service.addPose(pose, Date.now() + index * 100);
      });

      const parameters = service.calculateGaitParameters();
      
      expect(parameters.derived.normalizedVelocity).toBeGreaterThan(0);
      expect(parameters.derived.normalizedVelocity).toBeLessThan(1.0);
    });
  });

  describe('Symmetry Analysis', () => {
    test('should calculate temporal symmetry index', () => {
      const poses = createAsymmetricGaitPoses();
      poses.forEach((pose, index) => {
        service.addPose(pose, Date.now() + index * 100);
      });

      const parameters = service.calculateGaitParameters();
      
      expect(parameters.symmetry.temporalSymmetryIndex).toBeGreaterThanOrEqual(0);
      expect(parameters.symmetry.temporalSymmetryIndex).toBeLessThanOrEqual(100);
    });

    test('should calculate spatial symmetry index', () => {
      const poses = createAsymmetricGaitPoses();
      poses.forEach((pose, index) => {
        service.addPose(pose, Date.now() + index * 100);
      });

      const parameters = service.calculateGaitParameters();
      
      expect(parameters.symmetry.spatialSymmetryIndex).toBeGreaterThanOrEqual(0);
      expect(parameters.symmetry.spatialSymmetryIndex).toBeLessThanOrEqual(100);
    });

    test('should calculate gait variability index', () => {
      const poses = createVariableGaitPoses();
      poses.forEach((pose, index) => {
        service.addPose(pose, Date.now() + index * 100);
      });

      const parameters = service.calculateGaitParameters();
      
      expect(parameters.symmetry.gaitVariabilityIndex).toBeGreaterThanOrEqual(0);
      expect(parameters.symmetry.gaitVariabilityIndex).toBeLessThan(50); // High variability threshold
    });
  });

  describe('Confidence Scoring', () => {
    test('should provide confidence scores for all parameters', () => {
      const poses = createGaitCyclePoses();
      poses.forEach((pose, index) => {
        service.addPose(pose, Date.now() + index * 100);
      });

      const parameters = service.calculateGaitParameters();
      
      expect(parameters.temporal.confidence).toBeGreaterThanOrEqual(0);
      expect(parameters.temporal.confidence).toBeLessThanOrEqual(1);
      expect(parameters.spatial.confidence).toBeGreaterThanOrEqual(0);
      expect(parameters.spatial.confidence).toBeLessThanOrEqual(1);
      expect(parameters.derived.confidence).toBeGreaterThanOrEqual(0);
      expect(parameters.derived.confidence).toBeLessThanOrEqual(1);
      expect(parameters.symmetry.confidence).toBeGreaterThanOrEqual(0);
      expect(parameters.symmetry.confidence).toBeLessThanOrEqual(1);
    });

    test('should calculate overall confidence', () => {
      const poses = createGaitCyclePoses();
      poses.forEach((pose, index) => {
        service.addPose(pose, Date.now() + index * 100);
      });

      const parameters = service.calculateGaitParameters();
      
      expect(parameters.overallConfidence).toBeGreaterThanOrEqual(0);
      expect(parameters.overallConfidence).toBeLessThanOrEqual(1);
    });

    test('should lower confidence for insufficient data', () => {
      const pose = createMockPose();
      service.addPose(pose, Date.now());

      const parameters = service.calculateGaitParameters();
      
      expect(parameters.overallConfidence).toBeLessThan(0.5);
    });
  });

  describe('Performance Requirements', () => {
    test('should process pose data within 100ms', () => {
      const poses = createGaitCyclePoses();
      
      const startTime = performance.now();
      poses.forEach((pose, index) => {
        service.addPose(pose, Date.now() + index * 100);
      });
      service.calculateGaitParameters();
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(100);
    });

    test('should handle real-time processing load', () => {
      const poses = createGaitCyclePoses();
      
      // Simulate 30 FPS processing
      const processingTimes: number[] = [];
      for (let i = 0; i < 30; i++) {
        const startTime = performance.now();
        service.addPose(poses[i % poses.length], Date.now() + i * 33);
        service.calculateGaitParameters();
        const endTime = performance.now();
        processingTimes.push(endTime - startTime);
      }
      
      const averageTime = processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length;
      expect(averageTime).toBeLessThan(33); // Should be faster than frame rate
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid pose data gracefully', () => {
      const invalidPose: Pose = {
        keypoints: [],
        score: 0
      };
      
      expect(() => {
        service.addPose(invalidPose, Date.now());
      }).not.toThrow();
    });

    test('should handle missing keypoints', () => {
      const incompleteKeypoints: Keypoint[] = Array(10).fill({
        x: 0,
        y: 0,
        score: 0.1
      });
      
      const pose: Pose = {
        keypoints: incompleteKeypoints,
        score: 0.5
      };
      
      expect(() => {
        service.addPose(pose, Date.now());
        service.calculateGaitParameters();
      }).not.toThrow();
    });

    test('should handle negative timestamps', () => {
      const pose = createMockPose();
      
      expect(() => {
        service.addPose(pose, -1000);
      }).not.toThrow();
    });
  });

  describe('Data Management', () => {
    test('should reset all data correctly', () => {
      const poses = createGaitCyclePoses();
      poses.forEach((pose, index) => {
        service.addPose(pose, Date.now() + index * 100);
      });

      service.reset();
      
      expect(service.getPoseHistory()).toHaveLength(0);
      expect(service.getGaitEvents()).toHaveLength(0);
      
      const parameters = service.calculateGaitParameters();
      expect(parameters.overallConfidence).toBe(0);
    });

    test('should export session data', () => {
      const poses = createGaitCyclePoses();
      poses.forEach((pose, index) => {
        service.addPose(pose, Date.now() + index * 100);
      });

      const session = service.exportSession();
      
      expect(session.parameters).toBeDefined();
      expect(session.events).toBeDefined();
      expect(session.metadata).toBeDefined();
      expect(session.duration).toBeGreaterThan(0);
    });
  });

  // Helper functions for creating test data
  function createMockPose(confidence: number = 0.8): Pose {
    const keypoints: Keypoint[] = [];
    
    // Create 17 keypoints as per COCO format
    for (let i = 0; i < 17; i++) {
      keypoints.push({
        x: 100 + Math.random() * 200,
        y: 100 + Math.random() * 400,
        score: confidence + Math.random() * 0.2
      });
    }
    
    return {
      keypoints,
      score: confidence
    };
  }

  function createGaitCyclePoses(): Pose[] {
    const poses: Pose[] = [];
    
    // Create a sequence of poses representing a complete gait cycle
    for (let i = 0; i < 60; i++) {
      const phase = i / 60; // 0 to 1
      const pose = createMockPose(0.7 + Math.random() * 0.2);
      
      // Simulate ankle movement during gait cycle
      const leftAnkle = pose.keypoints[15];
      const rightAnkle = pose.keypoints[16];
      
      // Left foot: heel strike at phase 0, toe-off at phase 0.6
      leftAnkle.y = 350 + Math.sin(phase * Math.PI * 2) * 20;
      
      // Right foot: heel strike at phase 0.5, toe-off at phase 0.1
      rightAnkle.y = 350 + Math.sin((phase + 0.5) * Math.PI * 2) * 20;
      
      poses.push(pose);
    }
    
    return poses;
  }

  function createAsymmetricGaitPoses(): Pose[] {
    const poses = createGaitCyclePoses();
    
    // Introduce asymmetry by modifying right side timing
    poses.forEach((pose, index) => {
      const rightAnkle = pose.keypoints[16];
      const rightKnee = pose.keypoints[14];
      
      // Make right side slower
      rightAnkle.y += Math.sin(index * 0.8 * Math.PI / 30) * 10;
      rightKnee.y += Math.sin(index * 0.8 * Math.PI / 30) * 5;
    });
    
    return poses;
  }

  function createVariableGaitPoses(): Pose[] {
    const poses = createGaitCyclePoses();
    
    // Introduce variability in timing and amplitude
    poses.forEach((pose, index) => {
      const noise = (Math.random() - 0.5) * 0.3;
      
      pose.keypoints.forEach(keypoint => {
        keypoint.x += noise * 10;
        keypoint.y += noise * 10;
      });
    });
    
    return poses;
  }
});