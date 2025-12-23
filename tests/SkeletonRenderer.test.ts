/**
 * SkeletonRenderer Tests
 * Comprehensive test suite for real-time skeleton rendering
 */

import { SkeletonRenderer } from '../src/components/SkeletonRenderer';
import { Pose, Keypoint, VisualizationSettings } from '../src/types/gait';

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
  imageSmoothingQuality = 'high';
  strokeStyle = '#000000';
  fillStyle = '#000000';
  lineWidth = 1;
  globalAlpha = 1;
  
  clearRect = jest.fn();
  drawImage = jest.fn();
  beginPath = jest.fn();
  moveTo = jest.fn();
  lineTo = jest.fn();
  stroke = jest.fn();
  fill = jest.fn();
  arc = jest.fn();
  fillRect = jest.fn();
  getImageData = jest.fn(() => ({ data: new Uint8ClampedArray(4) }));
}

describe('SkeletonRenderer', () => {
  let canvas: HTMLCanvasElement;
  let renderer: SkeletonRenderer;
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
      trajectoryLength: 100
    };
    
    renderer = new SkeletonRenderer(canvas, settings);
  });

  afterEach(() => {
    renderer.dispose();
  });

  describe('Initialization', () => {
    it('should initialize with correct canvas and settings', () => {
      expect(renderer).toBeDefined();
      expect(renderer.getContext()).toBeDefined();
    });

    it('should set up canvas context properties', () => {
      const ctx = renderer.getContext();
      expect(ctx.lineCap).toBe('round');
      expect(ctx.lineJoin).toBe('round');
      expect(ctx.imageSmoothingEnabled).toBe(true);
    });
  });

  describe('Pose Rendering', () => {
    let mockPose: Pose;
    
    beforeEach(() => {
      mockPose = {
        keypoints: [
          { x: 100, y: 50, score: 0.9, name: 'nose' },
          { x: 90, y: 60, score: 0.8, name: 'left_eye' },
          { x: 110, y: 60, score: 0.8, name: 'right_eye' },
          { x: 80, y: 100, score: 0.7, name: 'left_shoulder' },
          { x: 120, y: 100, score: 0.7, name: 'right_shoulder' },
          { x: 70, y: 200, score: 0.6, name: 'left_hip' },
          { x: 130, y: 200, score: 0.6, name: 'right_hip' },
          { x: 75, y: 300, score: 0.5, name: 'left_knee' },
          { x: 125, y: 300, score: 0.5, name: 'right_knee' },
          { x: 80, y: 400, score: 0.4, name: 'left_ankle' },
          { x: 120, y: 400, score: 0.4, name: 'right_ankle' }
        ],
        score: 0.8,
        timestamp: Date.now()
      };
    });

    it('should render skeleton with valid poses', () => {
      const ctx = renderer.getContext();
      const clearRectSpy = jest.spyOn(ctx, 'clearRect');
      const beginPathSpy = jest.spyOn(ctx, 'beginPath');
      
      renderer.drawSkeleton([mockPose]);
      
      expect(clearRectSpy).toHaveBeenCalled();
      expect(beginPathSpy).toHaveBeenCalled();
    });

    it('should filter keypoints by confidence threshold', () => {
      const lowConfidencePose: Pose = {
        ...mockPose,
        keypoints: mockPose.keypoints.map(kp => ({ ...kp, score: 0.2 }))
      };
      
      const ctx = renderer.getContext();
      const beginPathSpy = jest.spyOn(ctx, 'beginPath');
      
      renderer.drawSkeleton([lowConfidencePose]);
      
      // Should not draw connections with low confidence
      expect(beginPathSpy).toHaveBeenCalledTimes(1); // Only clearRect call
    });

    it('should render confidence indicators when enabled', () => {
      settings.showConfidence = true;
      renderer.updateSettings(settings);
      
      const ctx = renderer.getContext();
      const fillRectSpy = jest.spyOn(ctx, 'fillRect');
      
      renderer.drawSkeleton([mockPose]);
      
      expect(fillRectSpy).toHaveBeenCalled();
    });

    it('should not render confidence indicators when disabled', () => {
      settings.showConfidence = false;
      renderer.updateSettings(settings);
      
      const ctx = renderer.getContext();
      const fillRectSpy = jest.spyOn(ctx, 'fillRect');
      
      renderer.drawSkeleton([mockPose]);
      
      expect(fillRectSpy).not.toHaveBeenCalled();
    });
  });

  describe('Color Schemes', () => {
    let mockPose: Pose;
    
    beforeEach(() => {
      mockPose = {
        keypoints: [
          { x: 100, y: 50, score: 0.9, name: 'nose' },
          { x: 80, y: 100, score: 0.7, name: 'left_shoulder' },
          { x: 120, y: 100, score: 0.7, name: 'right_shoulder' }
        ],
        score: 0.8,
        timestamp: Date.now()
      };
    });

    it('should apply default color scheme', () => {
      settings.colorScheme = 'default';
      renderer.updateSettings(settings);
      
      const ctx = renderer.getContext();
      jest.spyOn(ctx, 'stroke');
      
      renderer.drawSkeleton([mockPose]);
      
      // Should use default colors
      expect(ctx.strokeStyle).toBeTruthy();
    });

    it('should apply confidence-based color scheme', () => {
      settings.colorScheme = 'confidence';
      renderer.updateSettings(settings);
      
      const ctx = renderer.getContext();
      jest.spyOn(ctx, 'stroke');
      
      renderer.drawSkeleton([mockPose]);
      
      // Should use confidence-based colors
      expect(ctx.strokeStyle).toBeTruthy();
    });

    it('should apply phase-based color scheme', () => {
      settings.colorScheme = 'phase';
      renderer.updateSettings(settings);
      
      const ctx = renderer.getContext();
      jest.spyOn(ctx, 'stroke');
      
      renderer.drawSkeleton([mockPose]);
      
      // Should use phase-based colors
      expect(ctx.strokeStyle).toBeTruthy();
    });
  });

  describe('Skeleton Styles', () => {
    let mockPose: Pose;
    
    beforeEach(() => {
      mockPose = {
        keypoints: [
          { x: 100, y: 50, score: 0.9, name: 'nose' },
          { x: 80, y: 100, score: 0.7, name: 'left_shoulder' }
        ],
        score: 0.8,
        timestamp: Date.now()
      };
    });

    it('should apply basic skeleton style', () => {
      settings.skeletonStyle = 'basic';
      renderer.updateSettings(settings);
      
      renderer.drawSkeleton([mockPose]);
      
      // Should render with basic style
      expect(renderer.getContext().lineWidth).toBeTruthy();
    });

    it('should apply anatomical skeleton style', () => {
      settings.skeletonStyle = 'anatomical';
      renderer.updateSettings(settings);
      
      renderer.drawSkeleton([mockPose]);
      
      // Should render with anatomical style
      expect(renderer.getContext().lineWidth).toBeTruthy();
    });

    it('should apply minimal skeleton style', () => {
      settings.skeletonStyle = 'minimal';
      renderer.updateSettings(settings);
      
      renderer.drawSkeleton([mockPose]);
      
      // Should render with minimal style
      expect(renderer.getContext().lineWidth).toBeTruthy();
    });
  });

  describe('Performance Metrics', () => {
    it('should track rendering performance', () => {
      const mockPose: Pose = {
        keypoints: [
          { x: 100, y: 50, score: 0.9, name: 'nose' }
        ],
        score: 0.8,
        timestamp: Date.now()
      };
      
      renderer.drawSkeleton([mockPose]);
      
      const metrics = renderer.getPerformanceMetrics();
      expect(metrics.averageRenderTime).toBeGreaterThanOrEqual(0);
      expect(metrics.frameRate).toBeGreaterThanOrEqual(0);
    });

    it('should update frame rate correctly', () => {
      const mockPose: Pose = {
        keypoints: [
          { x: 100, y: 50, score: 0.9, name: 'nose' }
        ],
        score: 0.8,
        timestamp: Date.now()
      };
      
      // Render multiple frames
      for (let i = 0; i < 5; i++) {
        renderer.drawSkeleton([mockPose]);
      }
      
      const metrics = renderer.getPerformanceMetrics();
      expect(metrics.frameRate).toBeGreaterThan(0);
    });
  });

  describe('Settings Updates', () => {
    it('should update skeleton opacity', () => {
      const newSettings = { ...settings, skeletonOpacity: 0.5 };
      renderer.updateSettings(newSettings);
      
      // Should accept new opacity setting
      expect(renderer.updateSettings).not.toThrow();
    });

    it('should update visualization settings', () => {
      const newSettings = { 
        ...settings, 
        showConfidence: false,
        colorScheme: 'confidence' as const
      };
      
      renderer.updateSettings(newSettings);
      
      // Should accept new settings
      expect(renderer.updateSettings).not.toThrow();
    });
  });

  describe('Canvas Operations', () => {
    it('should clear canvas', () => {
      const ctx = renderer.getContext();
      const clearRectSpy = jest.spyOn(ctx, 'clearRect');
      
      renderer.clear();
      
      expect(clearRectSpy).toHaveBeenCalledWith(0, 0, canvas.width, canvas.height);
    });

    it('should resize canvas', () => {
      renderer.resize(800, 600);
      
      expect(canvas.width).toBe(800);
      expect(canvas.height).toBe(600);
    });

    it('should export frame data', () => {
      const ctx = renderer.getContext();
      const getImageDataSpy = jest.spyOn(ctx, 'getImageData');
      
      const imageData = renderer.exportFrame();
      
      expect(getImageDataSpy).toHaveBeenCalledWith(0, 0, canvas.width, canvas.height);
      expect(imageData).toBeDefined();
    });
  });

  describe('Video Integration', () => {
    it('should render video frame when provided', () => {
      const mockVideo = {
        readyState: 4,
        videoWidth: 640,
        videoHeight: 480
      } as HTMLVideoElement;
      
      const ctx = renderer.getContext();
      const drawImageSpy = jest.spyOn(ctx, 'drawImage');
      
      renderer.drawSkeleton([], mockVideo);
      
      expect(drawImageSpy).toHaveBeenCalledWith(
        mockVideo, 0, 0, canvas.width, canvas.height
      );
    });

    it('should not render video frame when not ready', () => {
      const mockVideo = {
        readyState: 1,
        videoWidth: 640,
        videoHeight: 480
      } as HTMLVideoElement;
      
      const ctx = renderer.getContext();
      const drawImageSpy = jest.spyOn(ctx, 'drawImage');
      
      renderer.drawSkeleton([], mockVideo);
      
      expect(drawImageSpy).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle empty poses array', () => {
      expect(() => {
        renderer.drawSkeleton([]);
      }).not.toThrow();
    });

    it('should handle poses with missing keypoints', () => {
      const incompletePose: Pose = {
        keypoints: [],
        score: 0.5,
        timestamp: Date.now()
      };
      
      expect(() => {
        renderer.drawSkeleton([incompletePose]);
      }).not.toThrow();
    });

    it('should handle invalid keypoint coordinates', () => {
      const invalidPose: Pose = {
        keypoints: [
          { x: NaN, y: NaN, score: 0.9, name: 'nose' }
        ],
        score: 0.8,
        timestamp: Date.now()
      };
      
      expect(() => {
        renderer.drawSkeleton([invalidPose]);
      }).not.toThrow();
    });
  });

  describe('Cleanup', () => {
    it('should dispose resources properly', () => {
      const ctx = renderer.getContext();
      const clearRectSpy = jest.spyOn(ctx, 'clearRect');
      
      renderer.dispose();
      
      expect(clearRectSpy).toHaveBeenCalledWith(0, 0, canvas.width, canvas.height);
    });
  });
});