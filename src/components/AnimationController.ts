/**
 * AnimationController - Smooth animations and transitions for gait visualization
 * Manages frame-rate independent animations, easing functions, and performance optimization
 * Implements object pooling and efficient rendering loops for 30+ FPS performance
 */

import { Point2D, Point3D, PerformanceMetrics } from '../types/gait';

export interface AnimationConfig {
  targetFPS: number;
  enableAdaptiveFrameRate: boolean;
  enableObjectPooling: boolean;
  maxAnimationObjects: number;
  performanceThreshold: number;
}

export interface AnimationObject {
  id: string;
  startTime: number;
  duration: number;
  easing: EasingFunction;
  onUpdate: (progress: number) => void;
  onComplete?: () => void;
  properties: { [key: string]: any };
}

export interface Tween {
  from: number;
  to: number;
  current: number;
  duration: number;
  easing: EasingFunction;
}

export type EasingFunction = (t: number) => number;

export class AnimationController {
  private animationId: number | null = null;
  private animations: Map<string, AnimationObject> = new Map();
  private objectPool: AnimationObject[] = [];
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private config: AnimationConfig;
  private performanceMetrics: PerformanceMetrics;
  private isRunning: boolean = false;

  // Built-in easing functions
  public static readonly Easing = {
    linear: (t: number) => t,
    easeInQuad: (t: number) => t * t,
    easeOutQuad: (t: number) => t * (2 - t),
    easeInOutQuad: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    easeInCubic: (t: number) => t * t * t,
    easeOutCubic: (t: number) => (--t) * t * t + 1,
    easeInOutCubic: (t: number) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
    easeInQuart: (t: number) => t * t * t * t,
    easeOutQuart: (t: number) => 1 - (--t) * t * t * t,
    easeInOutQuart: (t: number) => t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t,
    easeInBounce: (t: number) => 1 - AnimationController.Easing.easeOutBounce(1 - t),
    easeOutBounce: (t: number) => {
      if (t < 1 / 2.75) {
        return 7.5625 * t * t;
      } else if (t < 2 / 2.75) {
        return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
      } else if (t < 2.5 / 2.75) {
        return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
      } else {
        return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
      }
    },
    easeInOutBounce: (t: number) => t < 0.5 ? 
      AnimationController.Easing.easeInBounce(t * 2) * 0.5 : 
      AnimationController.Easing.easeOutBounce(t * 2 - 1) * 0.5 + 0.5
  };

  constructor(config: AnimationConfig) {
    this.config = config;
    this.performanceMetrics = {
      frameRate: 0,
      averageRenderTime: 0,
      memoryUsage: 0,
      droppedFrames: 0,
      processingLatency: 0
    };
    
    this.initializeObjectPool();
  }

  private initializeObjectPool(): void {
    if (!this.config.enableObjectPooling) return;
    
    for (let i = 0; i < this.config.maxAnimationObjects; i++) {
      this.objectPool.push(this.createAnimationObject());
    }
  }

  private createAnimationObject(): AnimationObject {
    return {
      id: '',
      startTime: 0,
      duration: 0,
      easing: AnimationController.Easing.linear,
      onUpdate: () => {},
      onComplete: undefined,
      properties: {}
    };
  }

  private getAnimationObject(): AnimationObject {
    if (this.config.enableObjectPooling && this.objectPool.length > 0) {
      return this.objectPool.pop()!;
    }
    return this.createAnimationObject();
  }

  private returnAnimationObject(obj: AnimationObject): void {
    if (this.config.enableObjectPooling && this.objectPool.length < this.config.maxAnimationObjects) {
      // Reset object properties
      obj.id = '';
      obj.startTime = 0;
      obj.duration = 0;
      obj.easing = AnimationController.Easing.linear;
      obj.onUpdate = () => {};
      obj.onComplete = undefined;
      obj.properties = {};
      
      this.objectPool.push(obj);
    }
  }

  /**
   * Start the animation loop
   */
  public start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.animate();
  }

  /**
   * Stop the animation loop
   */
  public stop(): void {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /**
   * Main animation loop
   */
  private animate(): void {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastFrameTime;
    const targetFrameTime = 1000 / this.config.targetFPS;

    // Adaptive frame rate control
    if (this.config.enableAdaptiveFrameRate) {
      if (deltaTime < targetFrameTime) {
        this.animationId = requestAnimationFrame(() => this.animate());
        return;
      }
    }

    const frameStartTime = performance.now();
    
    // Update all animations
    this.updateAnimations(currentTime);
    
    // Update performance metrics
    this.updatePerformanceMetrics(currentTime, frameStartTime);
    
    this.lastFrameTime = currentTime;
    this.frameCount++;
    
    // Schedule next frame
    this.animationId = requestAnimationFrame(() => this.animate());
  }

  private updateAnimations(currentTime: number): void {
    const completedAnimations: string[] = [];
    
    this.animations.forEach((animation, id) => {
      const elapsed = currentTime - animation.startTime;
      const progress = Math.min(elapsed / animation.duration, 1);
      const easedProgress = animation.easing(progress);
      
      // Update animation
      animation.onUpdate(easedProgress);
      
      // Check if animation is complete
      if (progress >= 1) {
        completedAnimations.push(id);
        if (animation.onComplete) {
          animation.onComplete();
        }
      }
    });
    
    // Remove completed animations
    completedAnimations.forEach(id => {
      const animation = this.animations.get(id);
      if (animation) {
        this.returnAnimationObject(animation);
        this.animations.delete(id);
      }
    });
  }

  private updatePerformanceMetrics(currentTime: number, frameStartTime: number): void {
    const frameTime = performance.now() - frameStartTime;
    this.performanceMetrics.averageRenderTime = 
      (this.performanceMetrics.averageRenderTime + frameTime) / 2;
    
    // Calculate frame rate
    if (this.lastFrameTime) {
      const deltaTime = currentTime - this.lastFrameTime;
      this.performanceMetrics.frameRate = 1000 / deltaTime;
    }
    
    // Update memory usage
    if (performance.memory) {
      this.performanceMetrics.memoryUsage = performance.memory.usedJSHeapSize / 1024 / 1024;
    }
    
    // Adaptive frame rate adjustment
    if (this.config.enableAdaptiveFrameRate) {
      this.adjustFrameRate();
    }
  }

  private adjustFrameRate(): void {
    const currentFPS = this.performanceMetrics.frameRate;
    const targetFPS = this.config.targetFPS;
    
    if (currentFPS < targetFPS * 0.8) {
      // Reduce quality or frame rate
      this.config.targetFPS = Math.max(15, this.config.targetFPS - 5);
    } else if (currentFPS > targetFPS * 1.2) {
      // Increase quality or frame rate
      this.config.targetFPS = Math.min(60, this.config.targetFPS + 5);
    }
  }

  /**
   * Create a new animation
   */
  public animate(
    id: string,
    duration: number,
    onUpdate: (progress: number) => void,
    easing: EasingFunction = AnimationController.Easing.easeInOutQuad,
    onComplete?: () => void
  ): void {
    // Remove existing animation with same ID
    this.removeAnimation(id);
    
    const animation = this.getAnimationObject();
    animation.id = id;
    animation.startTime = performance.now();
    animation.duration = duration;
    animation.easing = easing;
    animation.onUpdate = onUpdate;
    animation.onComplete = onComplete;
    
    this.animations.set(id, animation);
  }

  /**
   * Create a tween animation for numeric values
   */
  public tween(
    id: string,
    from: number,
    to: number,
    duration: number,
    onUpdate: (value: number) => void,
    easing: EasingFunction = AnimationController.Easing.easeInOutQuad,
    onComplete?: () => void
  ): void {
    this.animate(
      id,
      duration,
      (progress) => {
        const value = from + (to - from) * progress;
        onUpdate(value);
      },
      easing,
      onComplete
    );
  }

  /**
   * Create a point animation (2D)
   */
  public animatePoint2D(
    id: string,
    from: Point2D,
    to: Point2D,
    duration: number,
    onUpdate: (point: Point2D) => void,
    easing: EasingFunction = AnimationController.Easing.easeInOutQuad,
    onComplete?: () => void
  ): void {
    this.animate(
      id,
      duration,
      (progress) => {
        const point: Point2D = {
          x: from.x + (to.x - from.x) * progress,
          y: from.y + (to.y - from.y) * progress
        };
        onUpdate(point);
      },
      easing,
      onComplete
    );
  }

  /**
   * Create a point animation (3D)
   */
  public animatePoint3D(
    id: string,
    from: Point3D,
    to: Point3D,
    duration: number,
    onUpdate: (point: Point3D) => void,
    easing: EasingFunction = AnimationController.Easing.easeInOutQuad,
    onComplete?: () => void
  ): void {
    this.animate(
      id,
      duration,
      (progress) => {
        const point: Point3D = {
          x: from.x + (to.x - from.x) * progress,
          y: from.y + (to.y - from.y) * progress,
          z: from.z + (to.z - from.z) * progress
        };
        onUpdate(point);
      },
      easing,
      onComplete
    );
  }

  /**
   * Create a color animation
   */
  public animateColor(
    id: string,
    fromColor: { r: number, g: number, b: number, a?: number },
    toColor: { r: number, g: number, b: number, a?: number },
    duration: number,
    onUpdate: (color: string) => void,
    easing: EasingFunction = AnimationController.Easing.easeInOutQuad,
    onComplete?: () => void
  ): void {
    this.animate(
      id,
      duration,
      (progress) => {
        const r = Math.round(fromColor.r + (toColor.r - fromColor.r) * progress);
        const g = Math.round(fromColor.g + (toColor.g - fromColor.g) * progress);
        const b = Math.round(fromColor.b + (toColor.b - fromColor.b) * progress);
        const a = fromColor.a !== undefined && toColor.a !== undefined
          ? fromColor.a + (toColor.a - fromColor.a) * progress
          : 1;
        
        const color = a !== 1 ? `rgba(${r}, ${g}, ${b}, ${a})` : `rgb(${r}, ${g}, ${b})`;
        onUpdate(color);
      },
      easing,
      onComplete
    );
  }

  /**
   * Create a spring animation
   */
  public spring(
    id: string,
    from: number,
    to: number,
    onUpdate: (value: number) => void,
    config: { stiffness?: number, damping?: number, mass?: number } = {},
    onComplete?: () => void
  ): void {
    const stiffness = config.stiffness || 100;
    const damping = config.damping || 10;
    const mass = config.mass || 1;
    
    let position = from;
    let velocity = 0;
    let lastTime = performance.now();
    
    const springUpdate = () => {
      const currentTime = performance.now();
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;
      
      const force = -stiffness * (position - to);
      const dampingForce = -damping * velocity;
      const acceleration = (force + dampingForce) / mass;
      
      velocity += acceleration * deltaTime;
      position += velocity * deltaTime;
      
      onUpdate(position);
      
      // Check if spring has settled
      const settled = Math.abs(velocity) < 0.01 && Math.abs(position - to) < 0.01;
      if (!settled) {
        requestAnimationFrame(springUpdate);
      } else {
        onUpdate(to);
        if (onComplete) onComplete();
      }
    };
    
    this.removeAnimation(id);
    requestAnimationFrame(springUpdate);
  }

  /**
   * Create a shake animation
   */
  public shake(
    id: string,
    intensity: number,
    duration: number,
    onUpdate: (offset: Point2D) => void,
    onComplete?: () => void
  ): void {
    this.animate(
      id,
      duration,
      (progress) => {
        const currentIntensity = intensity * (1 - progress);
        const offset: Point2D = {
          x: (Math.random() - 0.5) * currentIntensity,
          y: (Math.random() - 0.5) * currentIntensity
        };
        onUpdate(offset);
      },
      AnimationController.Easing.linear,
      () => {
        onUpdate({ x: 0, y: 0 });
        if (onComplete) onComplete();
      }
    );
  }

  /**
   * Create a pulse animation
   */
  public pulse(
    id: string,
    minScale: number,
    maxScale: number,
    duration: number,
    onUpdate: (scale: number) => void,
    cycles?: number
  ): void {
    let currentCycle = 0;
    const maxCycles = cycles || Infinity;
    
    const pulseOnce = () => {
      if (currentCycle >= maxCycles) return;
      
      this.animate(
        `${id}_pulse_${currentCycle}`,
        duration,
        (progress) => {
          const scale = minScale + (maxScale - minScale) * Math.sin(progress * Math.PI);
          onUpdate(scale);
        },
        AnimationController.Easing.linear,
        () => {
          currentCycle++;
          if (currentCycle < maxCycles) {
            pulseOnce();
          }
        }
      );
    };
    
    pulseOnce();
  }

  /**
   * Create a chain of animations
   */
  public chain(animations: Array<() => void>): void {
    if (animations.length === 0) return;
    
    const executeNext = (index: number) => {
      if (index >= animations.length) return;
      
      animations[index]();
      
      // Execute next animation after a small delay
      setTimeout(() => executeNext(index + 1), 50);
    };
    
    executeNext(0);
  }

  /**
   * Remove a specific animation
   */
  public removeAnimation(id: string): void {
    const animation = this.animations.get(id);
    if (animation) {
      this.returnAnimationObject(animation);
      this.animations.delete(id);
    }
  }

  /**
   * Remove all animations
   */
  public clearAnimations(): void {
    this.animations.forEach((animation, id) => {
      this.returnAnimationObject(animation);
    });
    this.animations.clear();
  }

  /**
   * Pause all animations
   */
  public pause(): void {
    this.isRunning = false;
  }

  /**
   * Resume all animations
   */
  public resume(): void {
    if (!this.isRunning) {
      this.isRunning = true;
      this.lastFrameTime = performance.now();
      this.animate();
    }
  }

  /**
   * Check if animation exists
   */
  public hasAnimation(id: string): boolean {
    return this.animations.has(id);
  }

  /**
   * Get current performance metrics
   */
  public getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<AnimationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get animation count
   */
  public getAnimationCount(): number {
    return this.animations.size;
  }

  /**
   * Get object pool stats
   */
  public getObjectPoolStats(): { available: number, inUse: number, total: number } {
    return {
      available: this.objectPool.length,
      inUse: this.animations.size,
      total: this.config.maxAnimationObjects
    };
  }

  /**
   * Cleanup resources
   */
  public dispose(): void {
    this.stop();
    this.clearAnimations();
    this.objectPool = [];
  }
}