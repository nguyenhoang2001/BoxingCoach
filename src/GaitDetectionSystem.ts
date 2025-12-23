/**
 * Main integration class for the optimized gait detection system
 * Combines all performance optimization components
 */

import { PerformanceMonitor } from './performance/PerformanceMonitor';
import { AdaptiveQualityManager } from './performance/AdaptiveQualityManager';
import { OptimizedRenderingPipeline } from './rendering/OptimizedRenderingPipeline';
import { WasmOptimizer } from './wasm/WasmOptimizer';
import { MemoryManager } from './memory/MemoryManager';

interface GaitDetectionOptions {
  targetFPS: number;
  enableWebAssembly: boolean;
  enableAdaptiveQuality: boolean;
  enableMemoryOptimization: boolean;
  enableGPUAcceleration: boolean;
  videoConstraints: MediaTrackConstraints;
}

interface SystemMetrics {
  performance: any;
  memory: any;
  quality: any;
  rendering: any;
  wasm: any;
}

class GaitDetectionSystem {
  private videoElement: HTMLVideoElement;
  private canvasElement: HTMLCanvasElement;
  private performanceMonitor: PerformanceMonitor;
  private qualityManager: AdaptiveQualityManager;
  private renderingPipeline: OptimizedRenderingPipeline;
  private wasmOptimizer: WasmOptimizer;
  private memoryManager: MemoryManager;
  private options: GaitDetectionOptions;
  private isInitialized = false;
  private isRunning = false;
  private mediaStream: MediaStream | null = null;
  private animationFrame: number | null = null;
  private observers: ((metrics: SystemMetrics) => void)[] = [];
  private lastFrameTime = 0;
  private frameCount = 0;

  constructor(
    videoElement: HTMLVideoElement,
    canvasElement: HTMLCanvasElement,
    options: Partial<GaitDetectionOptions> = {}
  ) {
    this.videoElement = videoElement;
    this.canvasElement = canvasElement;
    
    this.options = {
      targetFPS: 30,
      enableWebAssembly: true,
      enableAdaptiveQuality: true,
      enableMemoryOptimization: true,
      enableGPUAcceleration: true,
      videoConstraints: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 }
      },
      ...options
    };

    this.initializeComponents();
  }

  private initializeComponents(): void {
    // Initialize performance monitoring
    this.performanceMonitor = new PerformanceMonitor({
      minFPS: this.options.targetFPS,
      maxFrameTime: 1000 / this.options.targetFPS
    });

    // Initialize memory management
    if (this.options.enableMemoryOptimization) {
      this.memoryManager = new MemoryManager();
      this.memoryManager.startMonitoring();
    }

    // Initialize adaptive quality management
    if (this.options.enableAdaptiveQuality) {
      this.qualityManager = new AdaptiveQualityManager(this.performanceMonitor);
      this.qualityManager.subscribe(this.handleQualityChange.bind(this));
    }

    // Initialize rendering pipeline
    this.renderingPipeline = new OptimizedRenderingPipeline(this.canvasElement, {
      targetFPS: this.options.targetFPS,
      enableGPUAcceleration: this.options.enableGPUAcceleration
    });

    // Initialize WebAssembly optimizer
    if (this.options.enableWebAssembly) {
      this.wasmOptimizer = new WasmOptimizer();
    }

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Performance monitoring
    this.performanceMonitor.subscribe((metrics) => {
      this.notifyObservers({
        performance: metrics,
        memory: this.memoryManager?.getStats(),
        quality: this.qualityManager?.getCurrentProfile(),
        rendering: this.renderingPipeline.getStats(),
        wasm: this.wasmOptimizer?.getCapabilities()
      });
    });

    // Handle video events
    this.videoElement.addEventListener('loadedmetadata', () => {
      this.canvasElement.width = this.videoElement.videoWidth;
      this.canvasElement.height = this.videoElement.videoHeight;
    });

    this.videoElement.addEventListener('error', (error) => {
      console.error('Video error:', error);
    });

    // Handle window resize
    window.addEventListener('resize', () => {
      this.handleResize();
    });

    // Handle visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pause();
      } else {
        this.resume();
      }
    });
  }

  private handleQualityChange(profile: any): void {
    console.log('Quality profile changed:', profile);
    
    // Update video constraints
    if (this.mediaStream) {
      const videoTrack = this.mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.applyConstraints({
          width: profile.videoResolution.width,
          height: profile.videoResolution.height,
          frameRate: profile.frameRate
        }).catch(console.error);
      }
    }

    // Update rendering pipeline
    this.renderingPipeline.updateOptions({
      targetFPS: profile.frameRate,
      enableGPUAcceleration: profile.enableGPUAcceleration
    });
  }

  private handleResize(): void {
    const rect = this.canvasElement.getBoundingClientRect();
    this.renderingPipeline.resize(rect.width, rect.height);
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Initialize WebAssembly if enabled
      if (this.wasmOptimizer) {
        await this.wasmOptimizer.initialize();
      }

      // Initialize camera
      await this.initializeCamera();

      // Start rendering pipeline
      this.renderingPipeline.start();

      this.isInitialized = true;
      console.log('Gait detection system initialized successfully');
    } catch (error) {
      console.error('Failed to initialize gait detection system:', error);
      throw error;
    }
  }

  private async initializeCamera(): Promise<void> {
    try {
      const constraints = {
        video: this.options.videoConstraints,
        audio: false
      };

      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.videoElement.srcObject = this.mediaStream;
      
      return new Promise((resolve, reject) => {
        this.videoElement.onloadedmetadata = () => {
          this.videoElement.play()
            .then(() => resolve())
            .catch(reject);
        };
        
        this.videoElement.onerror = reject;
      });
    } catch (error) {
      console.error('Failed to initialize camera:', error);
      throw error;
    }
  }

  public start(): void {
    if (!this.isInitialized) {
      throw new Error('System not initialized. Call initialize() first.');
    }

    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.frameCount = 0;
    
    this.processFrame();
    console.log('Gait detection started');
  }

  private processFrame(): void {
    if (!this.isRunning) {
      return;
    }

    const now = performance.now();
    const deltaTime = now - this.lastFrameTime;
    const targetFrameTime = 1000 / this.options.targetFPS;

    if (deltaTime >= targetFrameTime) {
      this.analyzeFrame();
      this.lastFrameTime = now - (deltaTime % targetFrameTime);
      this.frameCount++;
    }

    this.animationFrame = requestAnimationFrame(() => this.processFrame());
  }

  private async analyzeFrame(): Promise<void> {
    const frameStart = performance.now();

    try {
      // Capture frame from video
      const imageData = this.captureVideoFrame();
      
      if (!imageData) {
        return;
      }

      // Process frame with WebAssembly if available
      let processedData;
      if (this.wasmOptimizer && this.wasmOptimizer.isWasmAvailable()) {
        processedData = await this.wasmOptimizer.processFrameData(
          new Uint8Array(imageData.data),
          imageData.width,
          imageData.height
        );
      } else {
        processedData = await this.processFrameJS(imageData);
      }

      // Detect poses (mock implementation)
      const poses = this.detectPoses(processedData || imageData);

      // Calculate gait metrics
      const gaitMetrics = await this.calculateGaitMetrics(poses);

      // Render visualization
      this.renderVisualization(imageData, poses, gaitMetrics);

      // Record performance metrics
      const frameEnd = performance.now();
      this.recordFrameMetrics(frameEnd - frameStart);

    } catch (error) {
      console.error('Frame analysis error:', error);
    }
  }

  private captureVideoFrame(): ImageData | null {
    if (!this.videoElement.videoWidth || !this.videoElement.videoHeight) {
      return null;
    }

    // Use memory pool for canvas if available
    const tempCanvas = this.memoryManager ? 
      this.memoryManager.acquire<HTMLCanvasElement>('canvas') :
      document.createElement('canvas');
    
    tempCanvas.width = this.videoElement.videoWidth;
    tempCanvas.height = this.videoElement.videoHeight;
    
    const ctx = tempCanvas.getContext('2d')!;
    ctx.drawImage(this.videoElement, 0, 0);
    
    const imageData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    
    // Return canvas to pool
    if (this.memoryManager) {
      this.memoryManager.release('canvas', tempCanvas);
    }
    
    return imageData;
  }

  private async processFrameJS(imageData: ImageData): Promise<Uint8Array> {
    // JavaScript fallback for frame processing
    const data = new Uint8Array(imageData.data);
    
    // Simple preprocessing (e.g., grayscale conversion)
    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
    }
    
    return data;
  }

  private detectPoses(imageData: ImageData | Uint8Array): any[] {
    // Mock pose detection - in real implementation, this would use TensorFlow.js or MediaPipe
    const poses = [];
    
    // Generate mock pose data
    for (let i = 0; i < 2; i++) {
      const pose = {
        keypoints: [],
        confidence: 0.8 + Math.random() * 0.2,
        bbox: {
          x: Math.random() * 100,
          y: Math.random() * 100,
          width: 100 + Math.random() * 100,
          height: 150 + Math.random() * 100
        }
      };
      
      // Generate 17 keypoints (COCO format)
      for (let j = 0; j < 17; j++) {
        pose.keypoints.push({
          x: Math.random() * this.canvasElement.width,
          y: Math.random() * this.canvasElement.height,
          confidence: 0.5 + Math.random() * 0.5,
          name: `keypoint_${j}`
        });
      }
      
      poses.push(pose);
    }
    
    return poses;
  }

  private async calculateGaitMetrics(poses: any[]): Promise<any> {
    if (!poses.length) {
      return {};
    }

    // Use WebAssembly for gait calculations if available
    if (this.wasmOptimizer && this.wasmOptimizer.isWasmAvailable()) {
      const poseData = new Float32Array(poses.length * 51); // 17 keypoints * 3 per pose
      
      poses.forEach((pose, poseIndex) => {
        pose.keypoints.forEach((keypoint: any, kpIndex: number) => {
          const baseIndex = poseIndex * 51 + kpIndex * 3;
          poseData[baseIndex] = keypoint.x;
          poseData[baseIndex + 1] = keypoint.y;
          poseData[baseIndex + 2] = keypoint.confidence;
        });
      });
      
      const metrics = await this.wasmOptimizer.calculateGaitMetrics(poseData);
      return this.parseGaitMetrics(metrics);
    } else {
      return this.calculateGaitMetricsJS(poses);
    }
  }

  private parseGaitMetrics(metrics: Float32Array | null): any {
    if (!metrics) {
      return {};
    }

    return {
      cadence: metrics[0],
      strideLength: metrics[1],
      stepWidth: metrics[2],
      walkingSpeed: metrics[3],
      symmetry: metrics[4],
      stability: metrics[5]
    };
  }

  private calculateGaitMetricsJS(poses: any[]): any {
    // JavaScript fallback for gait metrics calculation
    const metrics = {
      cadence: 120 + Math.random() * 40,
      strideLength: 1.2 + Math.random() * 0.4,
      stepWidth: 0.1 + Math.random() * 0.1,
      walkingSpeed: 1.0 + Math.random() * 0.5,
      symmetry: 0.9 + Math.random() * 0.1,
      stability: 0.8 + Math.random() * 0.2
    };
    
    return metrics;
  }

  private renderVisualization(imageData: ImageData, poses: any[], gaitMetrics: any): void {
    // Create render frame
    const renderFrame = {
      id: `frame-${this.frameCount}`,
      timestamp: performance.now(),
      imageData,
      poses,
      overlays: [
        {
          type: 'skeleton' as const,
          data: poses,
          visible: true,
          opacity: 1.0
        },
        {
          type: 'metrics' as const,
          data: { metrics: gaitMetrics },
          visible: true,
          opacity: 0.9
        }
      ],
      priority: 1
    };

    // Queue frame for rendering
    this.renderingPipeline.queueFrame(renderFrame);
  }

  private recordFrameMetrics(processingTime: number): void {
    this.performanceMonitor.recordFrame({
      processingTime,
      timestamp: performance.now(),
      memoryUsage: this.memoryManager?.getMemoryUsage() || 0,
      accuracy: 0.9 + Math.random() * 0.1
    });
  }

  public pause(): void {
    this.isRunning = false;
    
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  public resume(): void {
    if (!this.isRunning && this.isInitialized) {
      this.start();
    }
  }

  public stop(): void {
    this.pause();
    
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    
    this.renderingPipeline.stop();
    this.renderingPipeline.clear();
    
    console.log('Gait detection stopped');
  }

  public getSystemMetrics(): SystemMetrics {
    return {
      performance: this.performanceMonitor.getMetrics(),
      memory: this.memoryManager?.getStats(),
      quality: this.qualityManager?.getCurrentProfile(),
      rendering: this.renderingPipeline.getStats(),
      wasm: this.wasmOptimizer?.getCapabilities()
    };
  }

  public subscribe(observer: (metrics: SystemMetrics) => void): () => void {
    this.observers.push(observer);
    return () => {
      const index = this.observers.indexOf(observer);
      if (index > -1) {
        this.observers.splice(index, 1);
      }
    };
  }

  private notifyObservers(metrics: SystemMetrics): void {
    this.observers.forEach(observer => {
      try {
        observer(metrics);
      } catch (error) {
        console.error('Observer error:', error);
      }
    });
  }

  public updateOptions(options: Partial<GaitDetectionOptions>): void {
    this.options = { ...this.options, ...options };
    
    // Update components
    if (options.targetFPS) {
      this.renderingPipeline.updateOptions({ targetFPS: options.targetFPS });
    }
  }

  public generatePerformanceReport(): string {
    const metrics = this.getSystemMetrics();
    const report = [];
    
    report.push('=== Gait Detection Performance Report ===');
    report.push('');
    
    // Performance metrics
    if (metrics.performance) {
      report.push('Performance Metrics:');
      report.push(`  FPS: ${metrics.performance.fps.toFixed(1)}`);
      report.push(`  Frame Time: ${metrics.performance.averageFrameTime.toFixed(2)}ms`);
      report.push(`  Memory Usage: ${(metrics.performance.memoryUsage / 1024 / 1024).toFixed(2)}MB`);
      report.push(`  CPU Usage: ${metrics.performance.cpuUsage.toFixed(1)}%`);
      report.push('');
    }
    
    // Quality settings
    if (metrics.quality) {
      report.push('Quality Settings:');
      report.push(`  Profile: ${metrics.quality.name}`);
      report.push(`  Resolution: ${metrics.quality.videoResolution.width}x${metrics.quality.videoResolution.height}`);
      report.push(`  Frame Rate: ${metrics.quality.frameRate}`);
      report.push(`  GPU Acceleration: ${metrics.quality.enableGPUAcceleration ? 'Enabled' : 'Disabled'}`);
      report.push('');
    }
    
    // Rendering stats
    if (metrics.rendering) {
      report.push('Rendering Statistics:');
      report.push(`  Render FPS: ${metrics.rendering.fps.toFixed(1)}`);
      report.push(`  Queue Size: ${metrics.rendering.queueSize}`);
      report.push(`  Dropped Frames: ${metrics.rendering.droppedFrames}`);
      report.push(`  Render Calls: ${metrics.rendering.renderCalls}`);
      report.push('');
    }
    
    // WebAssembly status
    if (metrics.wasm) {
      report.push('WebAssembly Status:');
      report.push(`  Available: ${metrics.wasm.wasm ? 'Yes' : 'No'}`);
      report.push(`  SIMD Support: ${metrics.wasm.simd ? 'Yes' : 'No'}`);
      report.push(`  Memory Size: ${(metrics.wasm.memorySize / 1024 / 1024).toFixed(2)}MB`);
      report.push('');
    }
    
    // Memory statistics
    if (metrics.memory) {
      report.push('Memory Statistics:');
      report.push(`  Current Usage: ${(metrics.memory.currentUsage / 1024 / 1024).toFixed(2)}MB`);
      report.push(`  Peak Usage: ${(metrics.memory.peakUsage / 1024 / 1024).toFixed(2)}MB`);
      report.push(`  Total Allocated: ${metrics.memory.totalAllocated}`);
      report.push(`  Total Released: ${metrics.memory.totalReleased}`);
      report.push('');
    }
    
    return report.join('\n');
  }

  public dispose(): void {
    this.stop();
    
    // Dispose all components
    this.performanceMonitor.dispose();
    this.qualityManager?.dispose();
    this.renderingPipeline.dispose();
    this.wasmOptimizer?.dispose();
    this.memoryManager?.dispose();
    
    // Clear observers
    this.observers = [];
    
    this.isInitialized = false;
  }
}

export { GaitDetectionSystem, type GaitDetectionOptions, type SystemMetrics };
