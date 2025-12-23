/**
 * Comprehensive Tests for Visual Overlay Rendering
 * Following TDD principles - tests verify accurate visual representation of detected body parts
 * with proper overlays, colors, and anatomical accuracy indicators
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SkeletonRenderer } from '../src/components/SkeletonRenderer';
import { VisualOverlaySystem } from '../src/components/VisualOverlaySystem';
import { Pose, Keypoint, VisualizationSettings, RenderingContext } from '../src/types/gait';

// Mock Canvas API with detailed tracking
class MockCanvasRenderingContext2D {
  public canvas = new MockCanvas();
  public fillStyle = '#000000';
  public strokeStyle = '#000000';
  public lineWidth = 1;
  public lineCap = 'round' as CanvasLineCap;
  public lineJoin = 'round' as CanvasLineJoin;
  public globalAlpha = 1;
  public font = '10px Arial';
  public textAlign = 'start' as CanvasTextAlign;
  public textBaseline = 'alphabetic' as CanvasTextBaseline;
  public imageSmoothingEnabled = true;
  public imageSmoothingQuality = 'high' as ImageSmoothingQuality;

  // Tracking properties for test verification
  public operations: Array<{type: string, args: any[]}> = [];
  
  public clearRect = vi.fn((x: number, y: number, w: number, h: number) => {
    this.operations.push({type: 'clearRect', args: [x, y, w, h]});
  });
  
  public fillRect = vi.fn((x: number, y: number, w: number, h: number) => {
    this.operations.push({type: 'fillRect', args: [x, y, w, h]});
  });
  
  public strokeRect = vi.fn((x: number, y: number, w: number, h: number) => {
    this.operations.push({type: 'strokeRect', args: [x, y, w, h]});
  });
  
  public beginPath = vi.fn(() => {
    this.operations.push({type: 'beginPath', args: []});
  });
  
  public moveTo = vi.fn((x: number, y: number) => {
    this.operations.push({type: 'moveTo', args: [x, y]});
  });
  
  public lineTo = vi.fn((x: number, y: number) => {
    this.operations.push({type: 'lineTo', args: [x, y]});
  });
  
  public arc = vi.fn((x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
    this.operations.push({type: 'arc', args: [x, y, radius, startAngle, endAngle]});
  });
  
  public stroke = vi.fn(() => {
    this.operations.push({type: 'stroke', args: []});
  });
  
  public fill = vi.fn(() => {
    this.operations.push({type: 'fill', args: []});
  });
  
  public fillText = vi.fn((text: string, x: number, y: number) => {
    this.operations.push({type: 'fillText', args: [text, x, y]});
  });
  
  public strokeText = vi.fn((text: string, x: number, y: number) => {
    this.operations.push({type: 'strokeText', args: [text, x, y]});
  });
  
  public drawImage = vi.fn((...args: any[]) => {
    this.operations.push({type: 'drawImage', args});
  });
  
  public save = vi.fn(() => {
    this.operations.push({type: 'save', args: []});
  });
  
  public restore = vi.fn(() => {
    this.operations.push({type: 'restore', args: []});
  });
  
  public setTransform = vi.fn((a: number, b: number, c: number, d: number, e: number, f: number) => {
    this.operations.push({type: 'setTransform', args: [a, b, c, d, e, f]});
  });
  
  public getImageData = vi.fn((x: number, y: number, sw: number, sh: number) => {
    this.operations.push({type: 'getImageData', args: [x, y, sw, sh]});
    return {
      data: new Uint8ClampedArray(sw * sh * 4),
      width: sw,
      height: sh
    };
  });
  
  public putImageData = vi.fn((imageData: ImageData, x: number, y: number) => {
    this.operations.push({type: 'putImageData', args: [imageData, x, y]});
  });

  public measureText = vi.fn((text: string) => ({
    width: text.length * 6, // Mock width calculation
    actualBoundingBoxLeft: 0,
    actualBoundingBoxRight: text.length * 6,
    actualBoundingBoxAscent: 8,
    actualBoundingBoxDescent: 2
  }));

  // Helper methods for test verification
  public getOperationCount(operationType: string): number {
    return this.operations.filter(op => op.type === operationType).length;
  }

  public getOperationsOfType(operationType: string): Array<{type: string, args: any[]}> {
    return this.operations.filter(op => op.type === operationType);
  }

  public reset(): void {
    this.operations = [];
    vi.clearAllMocks();
  }
}

class MockCanvas {
  public width = 640;
  public height = 480;
  private context = new MockCanvasRenderingContext2D();
  
  public getContext(type: string): MockCanvasRenderingContext2D | null {
    if (type === '2d') {
      return this.context;
    }
    return null;
  }
}

describe('Visual Overlay Rendering', () => {
  let canvas: MockCanvas;
  let ctx: MockCanvasRenderingContext2D;
  let skeletonRenderer: SkeletonRenderer;
  let overlaySystem: VisualOverlaySystem;
  let settings: VisualizationSettings;

  const createMockPose = (keypoints: Partial<Keypoint>[] = []): Pose => ({
    keypoints: keypoints.map((kp, index) => ({
      x: kp.x || 100 + index * 10,
      y: kp.y || 100 + index * 10,
      score: kp.score || 0.8,
      name: kp.name || `keypoint_${index}` as any
    })) as Keypoint[],
    score: 0.85,
    timestamp: Date.now(),
    boundingBox: { x: 50, y: 50, width: 200, height: 300 }
  });

  beforeEach(() => {
    canvas = new MockCanvas();
    ctx = canvas.getContext('2d')!;
    
    settings = {
      skeletonOpacity: 0.8,
      trajectoryOpacity: 0.6,
      showConfidence: true,
      showParameters: true,
      skeletonStyle: 'anatomical',
      colorScheme: 'default',
      showTrajectory: true,
      trajectoryLength: 100,
      overlaySettings: {
        showBoundingBox: true,
        showKeypoints: true,
        showConnections: true,
        showLabels: true,
        showConfidenceIndicators: true,
        keypointRadius: 4,
        connectionWidth: 2,
        fontSize: 12
      }
    };

    skeletonRenderer = new SkeletonRenderer(canvas as any, settings);
    overlaySystem = new VisualOverlaySystem(canvas as any, settings);
    
    ctx.reset();
  });

  afterEach(() => {
    skeletonRenderer?.dispose();
    overlaySystem?.dispose();
  });

  describe('Canvas Setup and Initialization', () => {
    it('should initialize canvas with proper dimensions and properties', () => {
      expect(canvas.width).toBe(640);
      expect(canvas.height).toBe(480);
      expect(ctx).toBeDefined();
      expect(ctx.imageSmoothingEnabled).toBe(true);
      expect(ctx.lineCap).toBe('round');
      expect(ctx.lineJoin).toBe('round');
    });

    it('should clear canvas before each render frame', () => {
      const poses = [createMockPose()];
      
      overlaySystem.render(poses);
      
      expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 640, 480);
      expect(ctx.getOperationCount('clearRect')).toBe(1);
    });

    it('should handle canvas resize dynamically', () => {
      overlaySystem.resize(1280, 720);
      
      expect(canvas.width).toBe(1280);
      expect(canvas.height).toBe(720);
      
      const poses = [createMockPose()];
      overlaySystem.render(poses);
      
      expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 1280, 720);
    });

    it('should maintain proper aspect ratio when resizing', () => {
      const originalAspectRatio = canvas.width / canvas.height;
      
      overlaySystem.resize(1920, 1080);
      const newAspectRatio = canvas.width / canvas.height;
      
      expect(newAspectRatio).toBeCloseTo(16/9, 2); // 1920/1080 aspect ratio
    });
  });

  describe('Keypoint Visual Rendering', () => {
    it('should render keypoints as circles with appropriate radius', () => {
      const pose = createMockPose([
        { x: 100, y: 100, score: 0.9, name: 'nose' },
        { x: 150, y: 150, score: 0.8, name: 'left_shoulder' },
        { x: 200, y: 150, score: 0.8, name: 'right_shoulder' }
      ]);

      overlaySystem.render([pose]);

      const arcOperations = ctx.getOperationsOfType('arc');
      expect(arcOperations).toHaveLength(3); // One for each keypoint

      // Verify each keypoint is rendered as a circle
      arcOperations.forEach((op, index) => {
        expect(op.args[2]).toBe(settings.overlaySettings!.keypointRadius); // radius
        expect(op.args[3]).toBe(0); // start angle
        expect(op.args[4]).toBeCloseTo(2 * Math.PI, 3); // end angle (full circle)
      });

      expect(ctx.getOperationCount('fill')).toBeGreaterThanOrEqual(3);
    });

    it('should render keypoints with colors based on confidence levels', () => {
      const pose = createMockPose([
        { x: 100, y: 100, score: 0.95, name: 'nose' }, // High confidence - green
        { x: 150, y: 150, score: 0.75, name: 'left_shoulder' }, // Medium confidence - yellow
        { x: 200, y: 150, score: 0.45, name: 'right_shoulder' } // Low confidence - red
      ]);

      overlaySystem.render([pose]);

      // Should have set different fill styles for different confidence levels
      const fillStyles = ctx.operations
        .filter(op => op.type === 'fillStyle')
        .map(op => op.args[0]);

      expect(fillStyles).toContain('#00FF00'); // Green for high confidence
      expect(fillStyles).toContain('#FFFF00'); // Yellow for medium confidence
      expect(fillStyles).toContain('#FF0000'); // Red for low confidence
    });

    it('should scale keypoint size based on confidence when enabled', () => {
      settings.overlaySettings!.scaleByConfidence = true;
      overlaySystem.updateSettings(settings);

      const pose = createMockPose([
        { x: 100, y: 100, score: 0.9, name: 'nose' },
        { x: 150, y: 150, score: 0.5, name: 'left_shoulder' }
      ]);

      overlaySystem.render([pose]);

      const arcOperations = ctx.getOperationsOfType('arc');
      
      // High confidence keypoint should have larger radius
      expect(arcOperations[0].args[2]).toBeGreaterThan(arcOperations[1].args[2]);
    });

    it('should render keypoint labels when enabled', () => {
      settings.overlaySettings!.showLabels = true;
      overlaySystem.updateSettings(settings);

      const pose = createMockPose([
        { x: 100, y: 100, score: 0.9, name: 'nose' },
        { x: 150, y: 150, score: 0.8, name: 'left_shoulder' }
      ]);

      overlaySystem.render([pose]);

      const textOperations = ctx.getOperationsOfType('fillText');
      expect(textOperations).toHaveLength(2);
      
      expect(textOperations[0].args[0]).toContain('nose');
      expect(textOperations[1].args[0]).toContain('left_shoulder');
    });

    it('should position labels appropriately relative to keypoints', () => {
      settings.overlaySettings!.showLabels = true;
      overlaySystem.updateSettings(settings);

      const pose = createMockPose([
        { x: 100, y: 100, score: 0.9, name: 'nose' }
      ]);

      overlaySystem.render([pose]);

      const arcOp = ctx.getOperationsOfType('arc')[0];
      const textOp = ctx.getOperationsOfType('fillText')[0];

      const keypointX = arcOp.args[0];
      const keypointY = arcOp.args[1];
      const labelX = textOp.args[1];
      const labelY = textOp.args[2];

      // Label should be offset from keypoint position
      expect(Math.abs(labelX - keypointX)).toBeGreaterThan(5);
      expect(Math.abs(labelY - keypointY)).toBeGreaterThan(5);
    });
  });

  describe('Body Part Highlighting', () => {
    it('should highlight different body regions with distinct colors', () => {
      const pose = createMockPose([
        // Head region
        { x: 100, y: 50, score: 0.9, name: 'nose' },
        { x: 90, y: 40, score: 0.8, name: 'left_eye' },
        { x: 110, y: 40, score: 0.8, name: 'right_eye' },
        
        // Upper body
        { x: 80, y: 100, score: 0.85, name: 'left_shoulder' },
        { x: 120, y: 100, score: 0.85, name: 'right_shoulder' },
        
        // Lower body
        { x: 85, y: 200, score: 0.8, name: 'left_hip' },
        { x: 115, y: 200, score: 0.8, name: 'right_hip' }
      ]);

      settings.colorScheme = 'anatomical';
      overlaySystem.updateSettings(settings);
      overlaySystem.render([pose]);

      // Should use different colors for different body regions
      const renderCalls = ctx.operations.filter(op => 
        op.type === 'fillStyle' || op.type === 'strokeStyle'
      );

      const uniqueColors = new Set(renderCalls.map(op => op.args[0]));
      expect(uniqueColors.size).toBeGreaterThan(1); // Multiple colors used
    });

    it('should render anatomically correct color coding', () => {
      const fullBodyPose = createMockPose([
        { x: 100, y: 50, score: 0.9, name: 'nose' },
        { x: 80, y: 100, score: 0.85, name: 'left_shoulder' },
        { x: 120, y: 100, score: 0.85, name: 'right_shoulder' },
        { x: 70, y: 150, score: 0.8, name: 'left_elbow' },
        { x: 130, y: 150, score: 0.8, name: 'right_elbow' },
        { x: 60, y: 200, score: 0.75, name: 'left_wrist' },
        { x: 140, y: 200, score: 0.75, name: 'right_wrist' },
        { x: 85, y: 250, score: 0.8, name: 'left_hip' },
        { x: 115, y: 250, score: 0.8, name: 'right_hip' },
        { x: 80, y: 350, score: 0.75, name: 'left_knee' },
        { x: 120, y: 350, score: 0.75, name: 'right_knee' },
        { x: 75, y: 450, score: 0.7, name: 'left_ankle' },
        { x: 125, y: 450, score: 0.7, name: 'right_ankle' }
      ]);

      settings.colorScheme = 'anatomical';
      settings.overlaySettings!.showBodyRegions = true;
      overlaySystem.updateSettings(settings);
      overlaySystem.render([fullBodyPose]);

      // Verify body region highlighting
      const fillRectOperations = ctx.getOperationsOfType('fillRect');
      expect(fillRectOperations.length).toBeGreaterThan(0); // Body regions highlighted
    });

    it('should provide visual feedback for limb start and end points', () => {
      const armPose = createMockPose([
        { x: 100, y: 100, score: 0.9, name: 'left_shoulder' }, // Start of arm
        { x: 80, y: 150, score: 0.85, name: 'left_elbow' },      // Middle joint
        { x: 60, y: 200, score: 0.8, name: 'left_wrist' }       // End of arm
      ]);

      settings.overlaySettings!.highlightLimbEndpoints = true;
      overlaySystem.updateSettings(settings);
      overlaySystem.render([armPose]);

      // Should highlight start (shoulder) and end (wrist) differently than middle joint
      const arcOperations = ctx.getOperationsOfType('arc');
      expect(arcOperations).toHaveLength(3);

      // End points should have different visual treatment (e.g., larger radius or different color)
      // This would be verified by checking the rendering parameters
      expect(ctx.getOperationCount('stroke')).toBeGreaterThan(0);
    });

    it('should accurately show where limbs start and end with visual indicators', () => {
      const legPose = createMockPose([
        { x: 100, y: 200, score: 0.9, name: 'left_hip' },    // Start of leg
        { x: 95, y: 300, score: 0.85, name: 'left_knee' },   // Middle joint
        { x: 90, y: 400, score: 0.8, name: 'left_ankle' }    // End of leg
      ]);

      settings.overlaySettings!.showLimbBoundaries = true;
      overlaySystem.updateSettings(settings);
      overlaySystem.render([legPose]);

      // Should render visual indicators for limb boundaries
      const strokeOperations = ctx.getOperationsOfType('stroke');
      expect(strokeOperations.length).toBeGreaterThan(0);

      // Should draw connecting lines between joints
      const lineOperations = ctx.getOperationsOfType('lineTo');
      expect(lineOperations.length).toBeGreaterThan(0);
    });
  });

  describe('Bounding Box Rendering', () => {
    it('should render bounding box around detected person', () => {
      const pose = createMockPose([
        { x: 100, y: 100, score: 0.9, name: 'nose' }
      ]);
      pose.boundingBox = { x: 50, y: 50, width: 200, height: 300 };

      settings.overlaySettings!.showBoundingBox = true;
      overlaySystem.updateSettings(settings);
      overlaySystem.render([pose]);

      const strokeRectOperations = ctx.getOperationsOfType('strokeRect');
      expect(strokeRectOperations).toHaveLength(1);
      
      const [x, y, width, height] = strokeRectOperations[0].args;
      expect(x).toBe(50);
      expect(y).toBe(50);
      expect(width).toBe(200);
      expect(height).toBe(300);
    });

    it('should color-code bounding boxes based on detection confidence', () => {
      const highConfidencePose = createMockPose([
        { x: 100, y: 100, score: 0.95, name: 'nose' }
      ]);
      highConfidencePose.score = 0.95;
      highConfidencePose.boundingBox = { x: 50, y: 50, width: 100, height: 150 };

      const lowConfidencePose = createMockPose([
        { x: 300, y: 100, score: 0.6, name: 'nose' }
      ]);
      lowConfidencePose.score = 0.6;
      lowConfidencePose.boundingBox = { x: 250, y: 50, width: 100, height: 150 };

      settings.overlaySettings!.showBoundingBox = true;
      overlaySystem.updateSettings(settings);
      overlaySystem.render([highConfidencePose, lowConfidencePose]);

      // Should set different stroke styles for different confidence levels
      const strokeStyleOperations = ctx.operations.filter(op => 
        op.type === 'strokeStyle'
      );
      
      expect(strokeStyleOperations.length).toBeGreaterThanOrEqual(2);
      
      // Colors should be different for different confidence levels
      const colors = strokeStyleOperations.map(op => op.args[0]);
      expect(new Set(colors).size).toBeGreaterThan(1);
    });

    it('should show pose ID labels on bounding boxes', () => {
      const pose = createMockPose([
        { x: 100, y: 100, score: 0.9, name: 'nose' }
      ]);
      pose.id = 'person_123';
      pose.boundingBox = { x: 50, y: 50, width: 200, height: 300 };

      settings.overlaySettings!.showBoundingBox = true;
      settings.overlaySettings!.showPoseIds = true;
      overlaySystem.updateSettings(settings);
      overlaySystem.render([pose]);

      const textOperations = ctx.getOperationsOfType('fillText');
      const idLabel = textOperations.find(op => 
        op.args[0].includes('person_123')
      );
      
      expect(idLabel).toBeDefined();
    });
  });

  describe('Real-time Visual Feedback', () => {
    it('should provide immediate visual feedback for pose detection', () => {
      const pose = createMockPose([
        { x: 100, y: 100, score: 0.9, name: 'nose' }
      ]);

      const startTime = performance.now();
      overlaySystem.render([pose]);
      const endTime = performance.now();

      // Rendering should be fast enough for real-time feedback
      expect(endTime - startTime).toBeLessThan(16.67); // 60 FPS target

      // Should have rendered visual elements
      expect(ctx.operations.length).toBeGreaterThan(0);
    });

    it('should update overlays smoothly during pose changes', () => {
      const pose1 = createMockPose([
        { x: 100, y: 100, score: 0.9, name: 'nose' }
      ]);
      
      const pose2 = createMockPose([
        { x: 105, y: 102, score: 0.88, name: 'nose' }
      ]);

      // Render first pose
      overlaySystem.render([pose1]);
      const operations1 = ctx.operations.length;
      
      ctx.reset();
      
      // Render updated pose
      overlaySystem.render([pose2]);
      const operations2 = ctx.operations.length;

      // Should perform similar number of operations for smooth updates
      expect(Math.abs(operations1 - operations2)).toBeLessThan(5);
    });

    it('should handle rapid pose updates without visual artifacts', () => {
      const poses = Array.from({ length: 10 }, (_, i) => 
        createMockPose([
          { x: 100 + i, y: 100 + i, score: 0.9 - i * 0.01, name: 'nose' }
        ])
      );

      poses.forEach(pose => {
        ctx.reset();
        overlaySystem.render([pose]);
        
        // Each frame should properly clear and redraw
        expect(ctx.getOperationCount('clearRect')).toBe(1);
        expect(ctx.getOperationCount('arc')).toBeGreaterThan(0);
      });
    });

    it('should maintain consistent frame rate during complex overlays', () => {
      const complexPose = createMockPose([
        { x: 100, y: 50, score: 0.9, name: 'nose' },
        { x: 90, y: 40, score: 0.8, name: 'left_eye' },
        { x: 110, y: 40, score: 0.8, name: 'right_eye' },
        { x: 80, y: 100, score: 0.85, name: 'left_shoulder' },
        { x: 120, y: 100, score: 0.85, name: 'right_shoulder' },
        { x: 70, y: 150, score: 0.8, name: 'left_elbow' },
        { x: 130, y: 150, score: 0.8, name: 'right_elbow' },
        { x: 60, y: 200, score: 0.75, name: 'left_wrist' },
        { x: 140, y: 200, score: 0.75, name: 'right_wrist' },
        { x: 85, y: 250, score: 0.8, name: 'left_hip' },
        { x: 115, y: 250, score: 0.8, name: 'right_hip' },
        { x: 80, y: 350, score: 0.75, name: 'left_knee' },
        { x: 120, y: 350, score: 0.75, name: 'right_knee' },
        { x: 75, y: 450, score: 0.7, name: 'left_ankle' },
        { x: 125, y: 450, score: 0.7, name: 'right_ankle' }
      ]);

      // Enable all visual features for complex rendering
      settings.overlaySettings!.showKeypoints = true;
      settings.overlaySettings!.showConnections = true;
      settings.overlaySettings!.showLabels = true;
      settings.overlaySettings!.showConfidenceIndicators = true;
      settings.overlaySettings!.showBoundingBox = true;
      overlaySystem.updateSettings(settings);

      const renderTimes: number[] = [];
      
      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();
        overlaySystem.render([complexPose]);
        const endTime = performance.now();
        renderTimes.push(endTime - startTime);
        ctx.reset();
      }

      const averageRenderTime = renderTimes.reduce((sum, time) => sum + time, 0) / renderTimes.length;
      const maxRenderTime = Math.max(...renderTimes);

      // Should maintain reasonable performance even with complex overlays
      expect(averageRenderTime).toBeLessThan(10); // Average under 10ms
      expect(maxRenderTime).toBeLessThan(20); // Max under 20ms
    });
  });

  describe('Adaptive Rendering Quality', () => {
    it('should reduce visual quality when performance drops', () => {
      // Simulate performance drop
      overlaySystem.setPerformanceMode('low');

      const pose = createMockPose([
        { x: 100, y: 100, score: 0.9, name: 'nose' },
        { x: 80, y: 150, score: 0.8, name: 'left_shoulder' }
      ]);

      overlaySystem.render([pose]);

      // In low performance mode, should use simpler rendering
      const arcOperations = ctx.getOperationsOfType('arc');
      const textOperations = ctx.getOperationsOfType('fillText');

      // Should render fewer visual elements or use simpler representations
      expect(textOperations.length).toBeLessThan(2); // Reduced labels
    });

    it('should increase visual quality when performance allows', () => {
      overlaySystem.setPerformanceMode('high');

      const pose = createMockPose([
        { x: 100, y: 100, score: 0.9, name: 'nose' },
        { x: 80, y: 150, score: 0.8, name: 'left_shoulder' }
      ]);

      overlaySystem.render([pose]);

      // In high performance mode, should use detailed rendering
      const operations = ctx.operations.length;
      expect(operations).toBeGreaterThan(10); // More detailed rendering
    });

    it('should automatically adjust quality based on frame rate', () => {
      // Simulate low frame rate scenario
      const lowFpsMetrics = { currentFPS: 15, targetFPS: 30 };
      overlaySystem.updatePerformanceMetrics(lowFpsMetrics);

      const pose = createMockPose([
        { x: 100, y: 100, score: 0.9, name: 'nose' }
      ]);

      overlaySystem.render([pose]);

      // Should automatically reduce quality
      const qualityLevel = overlaySystem.getCurrentQualityLevel();
      expect(qualityLevel).toBeLessThan(1.0); // Reduced quality
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty pose arrays gracefully', () => {
      expect(() => {
        overlaySystem.render([]);
      }).not.toThrow();

      // Should still clear the canvas
      expect(ctx.getOperationCount('clearRect')).toBe(1);
    });

    it('should handle poses with invalid keypoint coordinates', () => {
      const invalidPose = createMockPose([
        { x: NaN, y: 100, score: 0.9, name: 'nose' },
        { x: 100, y: Infinity, score: 0.8, name: 'left_shoulder' },
        { x: -1000, y: 150, score: 0.7, name: 'right_shoulder' }
      ]);

      expect(() => {
        overlaySystem.render([invalidPose]);
      }).not.toThrow();

      // Should filter out invalid keypoints and render only valid ones
      const arcOperations = ctx.getOperationsOfType('arc');
      expect(arcOperations.length).toBeLessThan(3); // Some keypoints filtered out
    });

    it('should handle canvas context loss gracefully', () => {
      // Simulate context loss
      const originalGetContext = canvas.getContext;
      canvas.getContext = vi.fn().mockReturnValue(null);

      expect(() => {
        const pose = createMockPose([
          { x: 100, y: 100, score: 0.9, name: 'nose' }
        ]);
        overlaySystem.render([pose]);
      }).not.toThrow();

      // Restore original method
      canvas.getContext = originalGetContext;
    });

    it('should maintain visual consistency across different canvas sizes', () => {
      const pose = createMockPose([
        { x: 100, y: 100, score: 0.9, name: 'nose' }
      ]);

      // Test with different canvas sizes
      const sizes = [
        { width: 320, height: 240 },
        { width: 640, height: 480 },
        { width: 1280, height: 720 },
        { width: 1920, height: 1080 }
      ];

      sizes.forEach(size => {
        overlaySystem.resize(size.width, size.height);
        ctx.reset();
        overlaySystem.render([pose]);

        // Should adapt rendering to canvas size
        const clearRectOp = ctx.getOperationsOfType('clearRect')[0];
        expect(clearRectOp.args[2]).toBe(size.width);
        expect(clearRectOp.args[3]).toBe(size.height);

        // Visual elements should scale appropriately
        const arcOperations = ctx.getOperationsOfType('arc');
        expect(arcOperations.length).toBeGreaterThan(0);
      });
    });

    it('should handle multiple overlapping poses correctly', () => {
      const pose1 = createMockPose([
        { x: 100, y: 100, score: 0.9, name: 'nose' }
      ]);
      pose1.id = 'person_1';

      const pose2 = createMockPose([
        { x: 110, y: 105, score: 0.85, name: 'nose' }
      ]);
      pose2.id = 'person_2';

      overlaySystem.render([pose1, pose2]);

      // Should render both poses distinctly
      const arcOperations = ctx.getOperationsOfType('arc');
      expect(arcOperations.length).toBeGreaterThanOrEqual(2);

      // Should use different colors or styles for different poses
      const strokeStyleOps = ctx.operations.filter(op => op.type === 'strokeStyle');
      expect(strokeStyleOps.length).toBeGreaterThan(0);
    });
  });
});