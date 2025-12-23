import { GaitAnalysisService, GaitParameters, GaitPhase } from '@/services/GaitAnalysisService';
import { Pose } from '@tensorflow-models/pose-detection';

describe('GaitAnalysisService', () => {
  let service: GaitAnalysisService;
  let mockPose: Pose;

  beforeEach(() => {
    service = new GaitAnalysisService();
    mockPose = global.createMockPose();
  });

  afterEach(() => {
    service.reset();
  });

  describe('initialization', () => {
    it('should initialize with empty parameters', () => {
      const parameters = service.calculateGaitParameters();
      
      expect(parameters).toEqual({
        cadence: 0,
        strideLength: 0,
        strideTime: 0,
        stepWidth: 0,
        velocity: 0,
        symmetryIndex: 0,
        confidence: 0,
        leftStepLength: 0,
        rightStepLength: 0,
        gaitPhase: {
          left: 'mid-stance',
          right: 'mid-stance',
          leftProgress: 0,
          rightProgress: 0,
          confidence: 0
        },
        stanceTime: 0,
        swingTime: 0,
        doubleSupport: 0
      });
    });

    it('should start with empty pose history', () => {
      const parameters = service.calculateGaitParameters();
      expect(parameters.confidence).toBe(0);
    });
  });

  describe('addPose', () => {
    it('should add pose to history', () => {
      const baseTime = Date.now();
      
      // Create a walking sequence that will generate gait events
      for (let i = 0; i < 30; i++) {
        const timestamp = baseTime + i * 33; // 30 FPS
        const walkingPhase = i / 30 * 2 * Math.PI; // One complete gait cycle
        
        // Create walking pose with ankle movement
        const walkingPose = global.createMockPose({
          keypoints: Array.from({ length: 17 }, (_, idx) => {
            if (idx === 15) { // Left ankle
              return {
                x: 290 + Math.sin(walkingPhase) * 30,
                y: 420 + Math.abs(Math.sin(walkingPhase)) * 15,
                score: 0.9,
                name: 'left_ankle'
              };
            } else if (idx === 16) { // Right ankle
              return {
                x: 350 + Math.sin(walkingPhase + Math.PI) * 30,
                y: 420 + Math.abs(Math.sin(walkingPhase + Math.PI)) * 15,
                score: 0.9,
                name: 'right_ankle'
              };
            }
            return { x: 100 + idx * 20, y: 200 + idx * 20, score: 0.9, name: `keypoint_${idx}` };
          })
        });
        
        service.addPose(walkingPose, timestamp);
      }
      
      const parameters = service.calculateGaitParameters();
      expect(parameters.confidence).toBeGreaterThan(0);
    });

    it('should maintain pose history limit', () => {
      const baseTime = Date.now();
      
      // Add poses over 6 seconds (should keep only last 5 seconds)
      for (let i = 0; i < 60; i++) {
        service.addPose(mockPose, baseTime + i * 100);
      }
      
      const parameters = service.calculateGaitParameters();
      expect(parameters.confidence).toBeGreaterThan(0);
    });

    it('should handle poses with low confidence keypoints', () => {
      const lowConfidencePose = global.createMockPose({
        keypoints: Array.from({ length: 17 }, (_, i) => ({
          x: 100 + i * 10,
          y: 200 + i * 10,
          score: 0.2, // Low confidence
          name: `keypoint_${i}`
        }))
      });
      
      service.addPose(lowConfidencePose, Date.now());
      
      const parameters = service.calculateGaitParameters();
      expect(parameters.confidence).toBeLessThan(0.5);
    });

    it('should detect gait events from ankle movement', () => {
      const baseTime = Date.now();
      
      // Create poses with ankle movement pattern
      for (let i = 0; i < 10; i++) {
        const movingPose = global.createMockPose({
          keypoints: Array.from({ length: 17 }, (_, idx) => {
            if (idx === 15) { // Left ankle
              return {
                x: 100 + Math.sin(i * 0.5) * 20,
                y: 200 + Math.cos(i * 0.5) * 10,
                score: 0.9,
                name: 'left_ankle'
              };
            }
            if (idx === 16) { // Right ankle
              return {
                x: 120 + Math.sin(i * 0.5 + Math.PI) * 20,
                y: 200 + Math.cos(i * 0.5 + Math.PI) * 10,
                score: 0.9,
                name: 'right_ankle'
              };
            }
            return {
              x: 100 + idx * 10,
              y: 200 + idx * 10,
              score: 0.9,
              name: `keypoint_${idx}`
            };
          })
        });
        
        service.addPose(movingPose, baseTime + i * 100);
      }
      
      const parameters = service.calculateGaitParameters();
      expect(parameters.confidence).toBeGreaterThan(0.5);
    });
  });

  describe('calculateGaitParameters', () => {
    it('should return empty parameters with insufficient data', () => {
      // Add only a few poses (less than 30)
      for (let i = 0; i < 5; i++) {
        service.addPose(mockPose, Date.now() + i * 100);
      }
      
      const parameters = service.calculateGaitParameters();
      expect(parameters.cadence).toBe(0);
      expect(parameters.strideLength).toBe(0);
    });

    it('should calculate parameters with sufficient data', () => {
      const baseTime = Date.now();
      
      // Add sufficient poses (30+)
      for (let i = 0; i < 50; i++) {
        const pose = global.createMockPose({
          keypoints: Array.from({ length: 17 }, (_, idx) => {
            if (idx === 15) { // Left ankle
              return {
                x: 100 + i * 2,
                y: 200,
                score: 0.9,
                name: 'left_ankle'
              };
            }
            if (idx === 16) { // Right ankle
              return {
                x: 120 + i * 2,
                y: 200,
                score: 0.9,
                name: 'right_ankle'
              };
            }
            return {
              x: 100 + idx * 10,
              y: 200 + idx * 10,
              score: 0.9,
              name: `keypoint_${idx}`
            };
          })
        });
        
        service.addPose(pose, baseTime + i * 100);
      }
      
      const parameters = service.calculateGaitParameters();
      expect(parameters.confidence).toBeGreaterThan(0.5);
      expect(parameters.stepWidth).toBeGreaterThan(0);
    });

    it('should handle poses with missing ankle keypoints', () => {
      const poseWithMissingAnkles = global.createMockPose({
        keypoints: Array.from({ length: 17 }, (_, idx) => {
          if (idx === 15 || idx === 16) { // Ankle keypoints
            return {
              x: 0,
              y: 0,
              score: 0.1, // Very low confidence
              name: `keypoint_${idx}`
            };
          }
          return {
            x: 100 + idx * 10,
            y: 200 + idx * 10,
            score: 0.9,
            name: `keypoint_${idx}`
          };
        })
      });
      
      for (let i = 0; i < 50; i++) {
        service.addPose(poseWithMissingAnkles, Date.now() + i * 100);
      }
      
      const parameters = service.calculateGaitParameters();
      expect(parameters.confidence).toBeLessThan(0.5);
    });
  });

  describe('cadence calculation', () => {
    it('should calculate cadence from heel strike events', () => {
      const baseTime = Date.now();
      
      // Simulate heel strike pattern
      for (let i = 0; i < 60; i++) {
        const pose = global.createMockPose({
          keypoints: Array.from({ length: 17 }, (_, idx) => {
            if (idx === 15) { // Left ankle
              // Simulate heel strike every 10 frames
              const isHeelStrike = i % 10 === 0;
              return {
                x: 100 + (isHeelStrike ? 0 : Math.sin(i * 0.1) * 5),
                y: 200,
                score: 0.9,
                name: 'left_ankle'
              };
            }
            if (idx === 16) { // Right ankle
              const isHeelStrike = (i + 5) % 10 === 0;
              return {
                x: 120 + (isHeelStrike ? 0 : Math.sin(i * 0.1 + Math.PI) * 5),
                y: 200,
                score: 0.9,
                name: 'right_ankle'
              };
            }
            return {
              x: 100 + idx * 10,
              y: 200 + idx * 10,
              score: 0.9,
              name: `keypoint_${idx}`
            };
          })
        });
        
        service.addPose(pose, baseTime + i * 100);
      }
      
      const parameters = service.calculateGaitParameters();
      expect(parameters.cadence).toBeGreaterThan(0);
    });

    it('should handle irregular gait patterns', () => {
      const baseTime = Date.now();
      
      // Simulate irregular gait (different timing for each foot)
      for (let i = 0; i < 60; i++) {
        const pose = global.createMockPose({
          keypoints: Array.from({ length: 17 }, (_, idx) => {
            if (idx === 15) { // Left ankle - irregular pattern
              return {
                x: 100 + Math.random() * 10,
                y: 200,
                score: 0.9,
                name: 'left_ankle'
              };
            }
            if (idx === 16) { // Right ankle - irregular pattern
              return {
                x: 120 + Math.random() * 10,
                y: 200,
                score: 0.9,
                name: 'right_ankle'
              };
            }
            return {
              x: 100 + idx * 10,
              y: 200 + idx * 10,
              score: 0.9,
              name: `keypoint_${idx}`
            };
          })
        });
        
        service.addPose(pose, baseTime + i * 100);
      }
      
      const parameters = service.calculateGaitParameters();
      expect(parameters.cadence).toBeGreaterThanOrEqual(0);
    });
  });

  describe('stride length calculation', () => {
    it('should calculate stride length when calibrated', () => {
      service.calibrate({
        pixelsPerMeter: 100,
        referenceHeight: 1.7,
        cameraHeight: 1.0,
        cameraAngle: 0
      });
      
      const baseTime = Date.now();
      
      // Simulate walking with heel strikes
      for (let i = 0; i < 60; i++) {
        const pose = global.createMockPose({
          keypoints: Array.from({ length: 17 }, (_, idx) => {
            if (idx === 15) { // Left ankle
              return {
                x: 100 + i * 2, // Progressive movement
                y: 200,
                score: 0.9,
                name: 'left_ankle'
              };
            }
            return {
              x: 100 + idx * 10,
              y: 200 + idx * 10,
              score: 0.9,
              name: `keypoint_${idx}`
            };
          })
        });
        
        service.addPose(pose, baseTime + i * 100);
      }
      
      const parameters = service.calculateGaitParameters();
      expect(parameters.strideLength).toBeGreaterThan(0);
    });

    it('should return zero stride length when not calibrated', () => {
      const baseTime = Date.now();
      
      for (let i = 0; i < 60; i++) {
        service.addPose(mockPose, baseTime + i * 100);
      }
      
      const parameters = service.calculateGaitParameters();
      expect(parameters.strideLength).toBe(0);
    });
  });

  describe('step width calculation', () => {
    it('should calculate step width from ankle separation', () => {
      service.calibrate({
        pixelsPerMeter: 100,
        referenceHeight: 1.7,
        cameraHeight: 1.0,
        cameraAngle: 0
      });
      
      const pose = global.createMockPose({
        keypoints: Array.from({ length: 17 }, (_, idx) => {
          if (idx === 15) { // Left ankle
            return {
              x: 100,
              y: 200,
              score: 0.9,
              name: 'left_ankle'
            };
          }
          if (idx === 16) { // Right ankle
            return {
              x: 120, // 20 pixels apart
              y: 200,
              score: 0.9,
              name: 'right_ankle'
            };
          }
          return {
            x: 100 + idx * 10,
            y: 200 + idx * 10,
            score: 0.9,
            name: `keypoint_${idx}`
          };
        })
      });
      
      for (let i = 0; i < 50; i++) {
        service.addPose(pose, Date.now() + i * 100);
      }
      
      const parameters = service.calculateGaitParameters();
      expect(parameters.stepWidth).toBe(0.2); // 20 pixels / 100 pixels per meter
    });

    it('should handle varying step widths', () => {
      service.calibrate({
        pixelsPerMeter: 100,
        referenceHeight: 1.7,
        cameraHeight: 1.0,
        cameraAngle: 0
      });
      
      const baseTime = Date.now();
      
      for (let i = 0; i < 50; i++) {
        const pose = global.createMockPose({
          keypoints: Array.from({ length: 17 }, (_, idx) => {
            if (idx === 15) { // Left ankle
              return {
                x: 100,
                y: 200,
                score: 0.9,
                name: 'left_ankle'
              };
            }
            if (idx === 16) { // Right ankle
              return {
                x: 120 + (i % 10), // Varying width
                y: 200,
                score: 0.9,
                name: 'right_ankle'
              };
            }
            return {
              x: 100 + idx * 10,
              y: 200 + idx * 10,
              score: 0.9,
              name: `keypoint_${idx}`
            };
          })
        });
        
        service.addPose(pose, baseTime + i * 100);
      }
      
      const parameters = service.calculateGaitParameters();
      expect(parameters.stepWidth).toBeGreaterThan(0);
    });
  });

  describe('velocity calculation', () => {
    it('should calculate velocity from stride length and cadence', () => {
      service.calibrate({
        pixelsPerMeter: 100,
        referenceHeight: 1.7,
        cameraHeight: 1.0,
        cameraAngle: 0
      });
      
      const baseTime = Date.now();
      
      // Simulate consistent walking pattern
      for (let i = 0; i < 60; i++) {
        const pose = global.createMockPose({
          keypoints: Array.from({ length: 17 }, (_, idx) => {
            if (idx === 15) { // Left ankle
              return {
                x: 100 + i * 3, // Consistent forward movement
                y: 200,
                score: 0.9,
                name: 'left_ankle'
              };
            }
            if (idx === 16) { // Right ankle
              return {
                x: 120 + i * 3,
                y: 200,
                score: 0.9,
                name: 'right_ankle'
              };
            }
            return {
              x: 100 + idx * 10,
              y: 200 + idx * 10,
              score: 0.9,
              name: `keypoint_${idx}`
            };
          })
        });
        
        service.addPose(pose, baseTime + i * 100);
      }
      
      const parameters = service.calculateGaitParameters();
      expect(parameters.velocity).toBeGreaterThanOrEqual(0);
    });
  });

  describe('symmetry index calculation', () => {
    it('should calculate symmetry from left and right steps', () => {
      const baseTime = Date.now();
      
      // Simulate symmetric gait
      for (let i = 0; i < 60; i++) {
        const pose = global.createMockPose({
          keypoints: Array.from({ length: 17 }, (_, idx) => {
            if (idx === 15) { // Left ankle
              return {
                x: 100 + Math.sin(i * 0.2) * 10,
                y: 200,
                score: 0.9,
                name: 'left_ankle'
              };
            }
            if (idx === 16) { // Right ankle
              return {
                x: 120 + Math.sin(i * 0.2 + Math.PI) * 10,
                y: 200,
                score: 0.9,
                name: 'right_ankle'
              };
            }
            return {
              x: 100 + idx * 10,
              y: 200 + idx * 10,
              score: 0.9,
              name: `keypoint_${idx}`
            };
          })
        });
        
        service.addPose(pose, baseTime + i * 100);
      }
      
      const parameters = service.calculateGaitParameters();
      expect(parameters.symmetryIndex).toBeGreaterThanOrEqual(0);
      expect(parameters.symmetryIndex).toBeLessThanOrEqual(100);
    });

    it('should handle asymmetric gait patterns', () => {
      const baseTime = Date.now();
      
      // Simulate asymmetric gait (more left steps than right)
      for (let i = 0; i < 60; i++) {
        const pose = global.createMockPose({
          keypoints: Array.from({ length: 17 }, (_, idx) => {
            if (idx === 15) { // Left ankle - more active
              return {
                x: 100 + Math.sin(i * 0.3) * 15,
                y: 200,
                score: 0.9,
                name: 'left_ankle'
              };
            }
            if (idx === 16) { // Right ankle - less active
              return {
                x: 120 + Math.sin(i * 0.15) * 5,
                y: 200,
                score: 0.9,
                name: 'right_ankle'
              };
            }
            return {
              x: 100 + idx * 10,
              y: 200 + idx * 10,
              score: 0.9,
              name: `keypoint_${idx}`
            };
          })
        });
        
        service.addPose(pose, baseTime + i * 100);
      }
      
      const parameters = service.calculateGaitParameters();
      expect(parameters.symmetryIndex).toBeGreaterThanOrEqual(0);
      expect(parameters.symmetryIndex).toBeLessThanOrEqual(100);
    });
  });

  describe('confidence calculation', () => {
    it('should calculate confidence from keypoint quality', () => {
      const highConfidencePose = global.createMockPose({
        keypoints: Array.from({ length: 17 }, (_, idx) => ({
          x: 100 + idx * 10,
          y: 200 + idx * 10,
          score: 0.95, // High confidence
          name: `keypoint_${idx}`
        }))
      });
      
      for (let i = 0; i < 50; i++) {
        service.addPose(highConfidencePose, Date.now() + i * 100);
      }
      
      const parameters = service.calculateGaitParameters();
      expect(parameters.confidence).toBeGreaterThan(0.9);
    });

    it('should handle low confidence poses', () => {
      const lowConfidencePose = global.createMockPose({
        keypoints: Array.from({ length: 17 }, (_, idx) => ({
          x: 100 + idx * 10,
          y: 200 + idx * 10,
          score: 0.3, // Low confidence
          name: `keypoint_${idx}`
        }))
      });
      
      for (let i = 0; i < 50; i++) {
        service.addPose(lowConfidencePose, Date.now() + i * 100);
      }
      
      const parameters = service.calculateGaitParameters();
      expect(parameters.confidence).toBeLessThan(0.5);
    });
  });

  describe('calibration', () => {
    it('should accept calibration data', () => {
      service.calibrate({
        pixelsPerMeter: 150,
        referenceHeight: 1.7,
        cameraHeight: 1.0,
        cameraAngle: 0
      });
      
      // Calibration affects stride length calculation
      const pose = global.createMockPose({
        keypoints: Array.from({ length: 17 }, (_, idx) => {
          if (idx === 15) { // Left ankle
            return {
              x: 100,
              y: 200,
              score: 0.9,
              name: 'left_ankle'
            };
          }
          if (idx === 16) { // Right ankle
            return {
              x: 150, // 50 pixels apart
              y: 200,
              score: 0.9,
              name: 'right_ankle'
            };
          }
          return {
            x: 100 + idx * 10,
            y: 200 + idx * 10,
            score: 0.9,
            name: `keypoint_${idx}`
          };
        })
      });
      
      for (let i = 0; i < 50; i++) {
        service.addPose(pose, Date.now() + i * 100);
      }
      
      const parameters = service.calculateGaitParameters();
      expect(parameters.stepWidth).toBeCloseTo(50/150, 2); // 50 pixels / 150 pixels per meter
    });
  });

  describe('reset', () => {
    it('should clear all data and return to initial state', () => {
      service.calibrate({
        pixelsPerMeter: 100,
        referenceHeight: 1.7,
        cameraHeight: 1.0,
        cameraAngle: 0
      });
      
      // Add some data
      for (let i = 0; i < 50; i++) {
        service.addPose(mockPose, Date.now() + i * 100);
      }
      
      let parameters = service.calculateGaitParameters();
      expect(parameters.confidence).toBeGreaterThan(0);
      
      // Reset service
      service.reset();
      
      parameters = service.calculateGaitParameters();
      expect(parameters).toEqual({
        cadence: 0,
        strideLength: 0,
        strideTime: 0,
        stepWidth: 0,
        velocity: 0,
        symmetryIndex: 0,
        confidence: 0
      });
    });
  });

  describe('performance and edge cases', () => {
    it('should handle rapid pose updates', () => {
      const baseTime = Date.now();
      
      // Add poses very rapidly
      for (let i = 0; i < 1000; i++) {
        service.addPose(mockPose, baseTime + i * 10);
      }
      
      const parameters = service.calculateGaitParameters();
      expect(parameters.confidence).toBeGreaterThan(0);
    });

    it('should handle poses with NaN values', () => {
      const nanPose = global.createMockPose({
        keypoints: Array.from({ length: 17 }, (_, idx) => ({
          x: idx === 15 ? NaN : 100 + idx * 10,
          y: idx === 16 ? NaN : 200 + idx * 10,
          score: 0.9,
          name: `keypoint_${idx}`
        }))
      });
      
      expect(() => {
        service.addPose(nanPose, Date.now());
      }).not.toThrow();
    });

    it('should handle poses with infinite values', () => {
      const infinitePose = global.createMockPose({
        keypoints: Array.from({ length: 17 }, (_, idx) => ({
          x: idx === 15 ? Infinity : 100 + idx * 10,
          y: idx === 16 ? -Infinity : 200 + idx * 10,
          score: 0.9,
          name: `keypoint_${idx}`
        }))
      });
      
      expect(() => {
        service.addPose(infinitePose, Date.now());
      }).not.toThrow();
    });

    it('should handle very old timestamps', () => {
      const oldTimestamp = Date.now() - 1000000; // Very old
      
      service.addPose(mockPose, oldTimestamp);
      
      const parameters = service.calculateGaitParameters();
      expect(parameters.confidence).toBeGreaterThanOrEqual(0);
    });

    it('should handle future timestamps', () => {
      const futureTimestamp = Date.now() + 1000000; // Future
      
      service.addPose(mockPose, futureTimestamp);
      
      const parameters = service.calculateGaitParameters();
      expect(parameters.confidence).toBeGreaterThanOrEqual(0);
    });
  });
});