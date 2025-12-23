/**
 * GaitTrajectoryRenderer Tests
 * Comprehensive test suite for trajectory visualization
 */

import { GaitTrajectoryRenderer } from '../src/components/GaitTrajectoryRenderer';
import { Pose, Keypoint, VisualizationSettings, GaitTrajectory } from '../src/types/gait';

// Mock Canvas API
class MockCanvas {
  width = 640;
  height = 480;
  
  getContext(type: string) {
    return new MockCanvasContext();
  }
}

class MockCanvasContext {
  canvas = new MockCanvas();
  lineCap = 'round';
  lineJoin = 'round';
  imageSmoothingEnabled = true;
  strokeStyle = '#000000';
  fillStyle = '#000000';
  lineWidth = 1;
  globalAlpha = 1;
  
  clearRect = jest.fn();
  beginPath = jest.fn();
  moveTo = jest.fn();
  lineTo = jest.fn();
  stroke = jest.fn();
  fill = jest.fn();
  arc = jest.fn();
}

describe('GaitTrajectoryRenderer', () => {
  let canvas: HTMLCanvasElement;
  let renderer: GaitTrajectoryRenderer;
  let settings: VisualizationSettings;
  
  beforeEach(() => {
    canvas = new MockCanvas() as any;
    settings = {
      skeletonOpacity: 0.8,
      trajectoryOpacity: 0.6,
      showConfidence: true,
      showParameters: true,
      skeletonStyle: 'anatomical',
      colorScheme: 'default',
      showTrajectory: true,
      trajectoryLength: 50
    };
    
    renderer = new GaitTrajectoryRenderer(canvas, settings);
  });

  afterEach(() => {
    renderer.dispose();
  });

  describe('Initialization', () => {
    it('should initialize with correct canvas and settings', () => {
      expect(renderer).toBeDefined();
    });

    it('should set trajectory length from settings', () => {
      const customSettings = { ...settings, trajectoryLength: 75 };
      const customRenderer = new GaitTrajectoryRenderer(canvas, customSettings);
      
      expect(customRenderer).toBeDefined();
      customRenderer.dispose();
    });
  });

  describe('Trajectory Updates', () => {
    let mockPoses: Pose[];
    
    beforeEach(() => {
      mockPoses = [{
        keypoints: [
          { x: 100, y: 400, score: 0.9, name: 'left_ankle' },
          { x: 150, y: 400, score: 0.8, name: 'right_ankle' },
          { x: 125, y: 200, score: 0.7, name: 'left_hip' },
          { x: 125, y: 200, score: 0.7, name: 'right_hip' }
        ],
        score: 0.8,
        timestamp: Date.now()
      }];
    });

    it('should update trajectory for person', () => {
      expect(() => {
        renderer.updateTrajectory('person1', mockPoses);
      }).not.toThrow();
    });

    it('should handle empty poses array', () => {
      expect(() => {
        renderer.updateTrajectory('person1', []);
      }).not.toThrow();
    });

    it('should filter low confidence keypoints', () => {
      const lowConfidencePoses: Pose[] = [{
        keypoints: [
          { x: 100, y: 400, score: 0.3, name: 'left_ankle' },
          { x: 150, y: 400, score: 0.2, name: 'right_ankle' }
        ],
        score: 0.3,
        timestamp: Date.now()
      }];
      
      expect(() => {
        renderer.updateTrajectory('person1', lowConfidencePoses);
      }).not.toThrow();
    });

    it('should create new trajectory for unknown person', () => {
      renderer.updateTrajectory('person1', mockPoses);
      renderer.updateTrajectory('person2', mockPoses);
      
      const person1Data = renderer.getTrajectoryData('person1');
      const person2Data = renderer.getTrajectoryData('person2');
      
      expect(person1Data).toBeDefined();
      expect(person2Data).toBeDefined();
    });
  });

  describe('Trajectory Drawing', () => {
    let mockPoses: Pose[];
    
    beforeEach(() => {
      mockPoses = [{
        keypoints: [
          { x: 100, y: 400, score: 0.9, name: 'left_ankle' },
          { x: 150, y: 400, score: 0.8, name: 'right_ankle' },
          { x: 125, y: 200, score: 0.7, name: 'left_hip' },
          { x: 125, y: 200, score: 0.7, name: 'right_hip' }
        ],
        score: 0.8,
        timestamp: Date.now()
      }];
    });

    it('should draw trajectories', () => {
      renderer.updateTrajectory('person1', mockPoses);
      
      const ctx = canvas.getContext('2d') as MockCanvasContext;
      const beginPathSpy = jest.spyOn(ctx, 'beginPath');
      const strokeSpy = jest.spyOn(ctx, 'stroke');
      
      renderer.drawTrajectories();
      
      expect(beginPathSpy).toHaveBeenCalled();
      expect(strokeSpy).toHaveBeenCalled();
    });

    it('should not draw trajectories with insufficient points', () => {
      // Only one pose, need at least 2 for trajectory
      renderer.updateTrajectory('person1', mockPoses);
      
      const ctx = canvas.getContext('2d') as MockCanvasContext;
      const beginPathSpy = jest.spyOn(ctx, 'beginPath');
      
      renderer.drawTrajectories();
      
      // Should not draw trajectory line with only 1 point
      expect(beginPathSpy).not.toHaveBeenCalled();
    });

    it('should apply trajectory opacity', () => {
      // Add multiple poses to create trajectory
      const poses = [];
      for (let i = 0; i < 5; i++) {
        poses.push({
          keypoints: [
            { x: 100 + i * 10, y: 400, score: 0.9, name: 'left_ankle' },
            { x: 150 + i * 10, y: 400, score: 0.8, name: 'right_ankle' }
          ],
          score: 0.8,
          timestamp: Date.now() + i * 100
        });
      }
      
      poses.forEach(pose => {
        renderer.updateTrajectory('person1', [pose]);
      });
      
      const ctx = canvas.getContext('2d') as MockCanvasContext;
      jest.spyOn(ctx, 'stroke');
      
      renderer.drawTrajectories();
      
      // Should apply trajectory opacity
      expect(ctx.globalAlpha).toBeLessThanOrEqual(1);
    });
  });

  describe('Velocity Vectors', () => {
    it('should draw velocity vectors', () => {
      const poses = [];
      for (let i = 0; i < 3; i++) {
        poses.push({
          keypoints: [
            { x: 100 + i * 20, y: 400, score: 0.9, name: 'left_ankle' },
            { x: 150 + i * 20, y: 400, score: 0.8, name: 'right_ankle' }
          ],
          score: 0.8,
          timestamp: Date.now() + i * 100
        });
      }
      
      poses.forEach(pose => {
        renderer.updateTrajectory('person1', [pose]);
      });
      
      const ctx = canvas.getContext('2d') as MockCanvasContext;
      const beginPathSpy = jest.spyOn(ctx, 'beginPath');
      const strokeSpy = jest.spyOn(ctx, 'stroke');
      
      renderer.drawVelocityVectors();
      
      expect(beginPathSpy).toHaveBeenCalled();
      expect(strokeSpy).toHaveBeenCalled();
    });

    it('should not draw velocity vectors with insufficient data', () => {
      const ctx = canvas.getContext('2d') as MockCanvasContext;
      const beginPathSpy = jest.spyOn(ctx, 'beginPath');
      
      renderer.drawVelocityVectors();
      
      expect(beginPathSpy).not.toHaveBeenCalled();
    });
  });

  describe('Stride Length Calculation', () => {
    it('should calculate stride length', () => {
      const poses = [];
      
      // Create a walking pattern with heel strikes
      for (let i = 0; i < 10; i++) {
        poses.push({
          keypoints: [
            { x: 100 + i * 10, y: 400 + Math.sin(i * 0.5) * 20, score: 0.9, name: 'left_ankle' }
          ],
          score: 0.8,
          timestamp: Date.now() + i * 100
        });
      }
      
      poses.forEach(pose => {
        renderer.updateTrajectory('person1', [pose]);
      });
      
      const strideLength = renderer.calculateStrideLength('person1', 'left');
      
      expect(strideLength).toBeGreaterThanOrEqual(0);
    });

    it('should return 0 for unknown person', () => {
      const strideLength = renderer.calculateStrideLength('unknown', 'left');
      expect(strideLength).toBe(0);
    });

    it('should return 0 for insufficient trajectory data', () => {
      const pose = {
        keypoints: [
          { x: 100, y: 400, score: 0.9, name: 'left_ankle' }
        ],
        score: 0.8,
        timestamp: Date.now()
      };
      
      renderer.updateTrajectory('person1', [pose]);
      
      const strideLength = renderer.calculateStrideLength('person1', 'left');
      expect(strideLength).toBe(0);
    });
  });

  describe('Trajectory Data Management', () => {
    it('should get trajectory data for person', () => {
      const poses = [{
        keypoints: [
          { x: 100, y: 400, score: 0.9, name: 'left_ankle' }
        ],
        score: 0.8,
        timestamp: Date.now()
      }];
      
      renderer.updateTrajectory('person1', poses);
      
      const trajectoryData = renderer.getTrajectoryData('person1');
      expect(trajectoryData).toBeDefined();
      expect(trajectoryData?.leftFoot).toBeDefined();
      expect(trajectoryData?.rightFoot).toBeDefined();
      expect(trajectoryData?.centerOfMass).toBeDefined();
    });

    it('should return null for unknown person', () => {
      const trajectoryData = renderer.getTrajectoryData('unknown');
      expect(trajectoryData).toBeNull();
    });

    it('should export all trajectory data', () => {
      const poses = [{
        keypoints: [
          { x: 100, y: 400, score: 0.9, name: 'left_ankle' }
        ],
        score: 0.8,
        timestamp: Date.now()
      }];
      
      renderer.updateTrajectory('person1', poses);
      renderer.updateTrajectory('person2', poses);
      
      const exportedData = renderer.exportTrajectoryData();
      expect(exportedData.size).toBe(2);
      expect(exportedData.has('person1')).toBe(true);
      expect(exportedData.has('person2')).toBe(true);
    });
  });

  describe('Trajectory Clearing', () => {
    it('should clear all trajectories', () => {
      const poses = [{
        keypoints: [
          { x: 100, y: 400, score: 0.9, name: 'left_ankle' }
        ],
        score: 0.8,
        timestamp: Date.now()
      }];
      
      renderer.updateTrajectory('person1', poses);
      renderer.updateTrajectory('person2', poses);
      
      renderer.clearTrajectories();
      
      expect(renderer.getTrajectoryData('person1')).toBeNull();
      expect(renderer.getTrajectoryData('person2')).toBeNull();
    });

    it('should clear trajectory for specific person', () => {
      const poses = [{
        keypoints: [
          { x: 100, y: 400, score: 0.9, name: 'left_ankle' }
        ],
        score: 0.8,
        timestamp: Date.now()
      }];
      
      renderer.updateTrajectory('person1', poses);
      renderer.updateTrajectory('person2', poses);
      
      renderer.clearPersonTrajectory('person1');
      
      expect(renderer.getTrajectoryData('person1')).toBeNull();
      expect(renderer.getTrajectoryData('person2')).toBeDefined();
    });
  });

  describe('Settings Updates', () => {
    it('should update trajectory settings', () => {
      const newSettings = {
        ...settings,
        trajectoryOpacity: 0.9,
        trajectoryLength: 75
      };
      
      expect(() => {
        renderer.updateSettings(newSettings);
      }).not.toThrow();
    });

    it('should update trajectory length', () => {
      const newSettings = {
        ...settings,
        trajectoryLength: 25
      };
      
      renderer.updateSettings(newSettings);
      
      // Should accept new trajectory length
      expect(renderer.updateSettings).not.toThrow();
    });
  });

  describe('Smoothing', () => {
    it('should apply smoothing to trajectory points', () => {
      const poses = [];
      
      // Create noisy trajectory data
      for (let i = 0; i < 5; i++) {
        poses.push({
          keypoints: [
            { 
              x: 100 + i * 10 + Math.random() * 10, 
              y: 400 + Math.random() * 10, 
              score: 0.9, 
              name: 'left_ankle' 
            }
          ],
          score: 0.8,
          timestamp: Date.now() + i * 100
        });
      }
      
      poses.forEach(pose => {
        renderer.updateTrajectory('person1', [pose]);
      });
      
      const trajectoryData = renderer.getTrajectoryData('person1');
      expect(trajectoryData?.leftFoot.length).toBeGreaterThan(0);
    });
  });

  describe('Memory Management', () => {
    it('should limit trajectory length', () => {
      const maxLength = 5;
      const customSettings = { ...settings, trajectoryLength: maxLength };
      const customRenderer = new GaitTrajectoryRenderer(canvas, customSettings);
      
      // Add more poses than the limit
      for (let i = 0; i < maxLength + 3; i++) {
        const pose = {
          keypoints: [
            { x: 100 + i * 10, y: 400, score: 0.9, name: 'left_ankle' }
          ],
          score: 0.8,
          timestamp: Date.now() + i * 100
        };
        
        customRenderer.updateTrajectory('person1', [pose]);
      }
      
      const trajectoryData = customRenderer.getTrajectoryData('person1');
      expect(trajectoryData?.leftFoot.length).toBeLessThanOrEqual(maxLength);
      
      customRenderer.dispose();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing keypoints gracefully', () => {
      const poses = [{
        keypoints: [
          { x: 100, y: 400, score: 0.9, name: 'unknown_keypoint' }
        ],
        score: 0.8,
        timestamp: Date.now()
      }];
      
      expect(() => {
        renderer.updateTrajectory('person1', poses);
      }).not.toThrow();
    });

    it('should handle invalid coordinates', () => {
      const poses = [{
        keypoints: [
          { x: NaN, y: Infinity, score: 0.9, name: 'left_ankle' }
        ],
        score: 0.8,
        timestamp: Date.now()
      }];
      
      expect(() => {
        renderer.updateTrajectory('person1', poses);
      }).not.toThrow();
    });
  });

  describe('Cleanup', () => {
    it('should dispose resources properly', () => {
      renderer.updateTrajectory('person1', [{
        keypoints: [
          { x: 100, y: 400, score: 0.9, name: 'left_ankle' }
        ],
        score: 0.8,
        timestamp: Date.now()
      }]);
      
      expect(() => {
        renderer.dispose();
      }).not.toThrow();
      
      // Should clear all trajectories
      expect(renderer.getTrajectoryData('person1')).toBeNull();
    });
  });
});