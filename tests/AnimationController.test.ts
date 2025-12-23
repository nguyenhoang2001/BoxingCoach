/**
 * AnimationController Tests
 * Test suite for animation and transition system
 */

import { AnimationController } from '../src/components/AnimationController';
import { Point2D, Point3D } from '../src/types/gait';

describe('AnimationController', () => {
  let controller: AnimationController;
  
  beforeEach(() => {
    controller = new AnimationController({
      targetFPS: 60,
      enableAdaptiveFrameRate: true,
      enableObjectPooling: true,
      maxAnimationObjects: 50,
      performanceThreshold: 0.8
    });
    
    // Mock performance.now for consistent testing
    jest.spyOn(performance, 'now').mockReturnValue(1000);
  });

  afterEach(() => {
    controller.dispose();
    jest.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with correct configuration', () => {
      expect(controller).toBeDefined();
      expect(controller.getAnimationCount()).toBe(0);
    });

    it('should create object pool when enabled', () => {
      const stats = controller.getObjectPoolStats();
      expect(stats.total).toBe(50);
      expect(stats.available).toBe(50);
      expect(stats.inUse).toBe(0);
    });
  });

  describe('Basic Animations', () => {
    it('should create and manage animations', () => {
      const onUpdate = jest.fn();
      const onComplete = jest.fn();
      
      controller.animate('test-animation', 1000, onUpdate, AnimationController.Easing.linear, onComplete);
      
      expect(controller.hasAnimation('test-animation')).toBe(true);
      expect(controller.getAnimationCount()).toBe(1);
    });

    it('should remove animations by ID', () => {
      const onUpdate = jest.fn();
      
      controller.animate('test-animation', 1000, onUpdate);
      expect(controller.hasAnimation('test-animation')).toBe(true);
      
      controller.removeAnimation('test-animation');
      expect(controller.hasAnimation('test-animation')).toBe(false);
    });

    it('should clear all animations', () => {
      const onUpdate = jest.fn();
      
      controller.animate('animation1', 1000, onUpdate);
      controller.animate('animation2', 1000, onUpdate);
      
      expect(controller.getAnimationCount()).toBe(2);
      
      controller.clearAnimations();
      expect(controller.getAnimationCount()).toBe(0);
    });
  });

  describe('Tween Animations', () => {
    it('should create numeric tween animations', () => {
      const onUpdate = jest.fn();
      
      controller.tween('number-tween', 0, 100, 1000, onUpdate);
      
      expect(controller.hasAnimation('number-tween')).toBe(true);
    });

    it('should interpolate values correctly', (done) => {
      const values: number[] = [];
      
      controller.tween('test-tween', 0, 100, 100, (value) => {
        values.push(value);
      }, AnimationController.Easing.linear, () => {
        expect(values.length).toBeGreaterThan(0);
        expect(values[0]).toBe(0);
        expect(values[values.length - 1]).toBe(100);
        done();
      });
      
      controller.start();
      
      // Simulate time progression
      setTimeout(() => {
        jest.advanceTimersByTime(150);
      }, 10);
    });
  });

  describe('Point Animations', () => {
    it('should animate 2D points', () => {
      const onUpdate = jest.fn();
      const from: Point2D = { x: 0, y: 0 };
      const to: Point2D = { x: 100, y: 100 };
      
      controller.animatePoint2D('point-2d', from, to, 1000, onUpdate);
      
      expect(controller.hasAnimation('point-2d')).toBe(true);
    });

    it('should animate 3D points', () => {
      const onUpdate = jest.fn();
      const from: Point3D = { x: 0, y: 0, z: 0 };
      const to: Point3D = { x: 100, y: 100, z: 100 };
      
      controller.animatePoint3D('point-3d', from, to, 1000, onUpdate);
      
      expect(controller.hasAnimation('point-3d')).toBe(true);
    });
  });

  describe('Color Animations', () => {
    it('should animate colors', () => {
      const onUpdate = jest.fn();
      const fromColor = { r: 255, g: 0, b: 0 };
      const toColor = { r: 0, g: 255, b: 0 };
      
      controller.animateColor('color-animation', fromColor, toColor, 1000, onUpdate);
      
      expect(controller.hasAnimation('color-animation')).toBe(true);
    });

    it('should handle alpha values', () => {
      const onUpdate = jest.fn();
      const fromColor = { r: 255, g: 0, b: 0, a: 0.5 };
      const toColor = { r: 0, g: 255, b: 0, a: 1.0 };
      
      controller.animateColor('color-alpha', fromColor, toColor, 1000, onUpdate);
      
      expect(controller.hasAnimation('color-alpha')).toBe(true);
    });
  });

  describe('Special Animations', () => {
    it('should create shake animations', () => {
      const onUpdate = jest.fn();
      
      controller.shake('shake-animation', 10, 1000, onUpdate);
      
      expect(controller.hasAnimation('shake-animation')).toBe(true);
    });

    it('should create pulse animations', () => {
      const onUpdate = jest.fn();
      
      controller.pulse('pulse-animation', 0.5, 1.5, 1000, onUpdate, 3);
      
      expect(controller.hasAnimation('pulse-animation_pulse_0')).toBe(true);
    });

    it('should create spring animations', () => {
      const onUpdate = jest.fn();
      
      controller.spring('spring-animation', 0, 100, onUpdate, {
        stiffness: 100,
        damping: 10,
        mass: 1
      });
      
      expect(onUpdate).toHaveBeenCalled();
    });
  });

  describe('Easing Functions', () => {
    it('should provide linear easing', () => {
      const result = AnimationController.Easing.linear(0.5);
      expect(result).toBe(0.5);
    });

    it('should provide quadratic easing', () => {
      const easeIn = AnimationController.Easing.easeInQuad(0.5);
      const easeOut = AnimationController.Easing.easeOutQuad(0.5);
      const easeInOut = AnimationController.Easing.easeInOutQuad(0.5);
      
      expect(easeIn).toBe(0.25);
      expect(easeOut).toBe(0.75);
      expect(easeInOut).toBe(0.5);
    });

    it('should provide cubic easing', () => {
      const easeIn = AnimationController.Easing.easeInCubic(0.5);
      const easeOut = AnimationController.Easing.easeOutCubic(0.5);
      
      expect(easeIn).toBe(0.125);
      expect(easeOut).toBe(0.875);
    });

    it('should provide bounce easing', () => {
      const easeIn = AnimationController.Easing.easeInBounce(0.5);
      const easeOut = AnimationController.Easing.easeOutBounce(0.5);
      
      expect(easeIn).toBeGreaterThanOrEqual(0);
      expect(easeIn).toBeLessThanOrEqual(1);
      expect(easeOut).toBeGreaterThanOrEqual(0);
      expect(easeOut).toBeLessThanOrEqual(1);
    });
  });

  describe('Animation Control', () => {
    it('should start and stop animation loop', () => {
      controller.start();
      expect(controller.getPerformanceMetrics().frameRate).toBeGreaterThanOrEqual(0);
      
      controller.stop();
      // Should stop cleanly
    });

    it('should pause and resume animations', () => {
      const onUpdate = jest.fn();
      
      controller.animate('test-animation', 1000, onUpdate);
      controller.start();
      
      controller.pause();
      // Animation should be paused
      
      controller.resume();
      // Animation should resume
    });
  });

  describe('Performance Metrics', () => {
    it('should track performance metrics', () => {
      controller.start();
      
      const metrics = controller.getPerformanceMetrics();
      expect(metrics).toBeDefined();
      expect(metrics.frameRate).toBeGreaterThanOrEqual(0);
      expect(metrics.averageRenderTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Object Pool Management', () => {
    it('should manage object pool efficiently', () => {
      const onUpdate = jest.fn();
      
      // Create animations to use pool
      for (let i = 0; i < 10; i++) {
        controller.animate(`animation-${i}`, 1000, onUpdate);
      }
      
      const stats = controller.getObjectPoolStats();
      expect(stats.inUse).toBe(10);
      expect(stats.available).toBe(40);
      
      // Remove animations to return to pool
      for (let i = 0; i < 10; i++) {
        controller.removeAnimation(`animation-${i}`);
      }
      
      const newStats = controller.getObjectPoolStats();
      expect(newStats.inUse).toBe(0);
      expect(newStats.available).toBe(50);
    });
  });

  describe('Animation Chains', () => {
    it('should execute animation chains', () => {
      const animations: (() => void)[] = [];
      const onUpdate = jest.fn();
      
      for (let i = 0; i < 3; i++) {
        animations.push(() => {
          controller.animate(`chain-${i}`, 100, onUpdate);
        });
      }
      
      controller.chain(animations);
      
      // Should execute first animation immediately
      expect(controller.hasAnimation('chain-0')).toBe(true);
    });
  });

  describe('Configuration Updates', () => {
    it('should update configuration', () => {
      const newConfig = {
        targetFPS: 30,
        enableAdaptiveFrameRate: false
      };
      
      controller.updateConfig(newConfig);
      
      // Should accept new configuration
      expect(controller.updateConfig).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid animation IDs', () => {
      expect(() => {
        controller.removeAnimation('non-existent');
      }).not.toThrow();
    });

    it('should handle empty animation chains', () => {
      expect(() => {
        controller.chain([]);
      }).not.toThrow();
    });
  });

  describe('Cleanup', () => {
    it('should dispose resources properly', () => {
      const onUpdate = jest.fn();
      
      controller.animate('test-animation', 1000, onUpdate);
      controller.start();
      
      expect(() => {
        controller.dispose();
      }).not.toThrow();
      
      expect(controller.getAnimationCount()).toBe(0);
    });
  });
});