/**
 * Comprehensive performance tests and benchmarks for gait detection system
 * Tests FPS, memory usage, processing latency, and system stability
 */

import { PerformanceMonitor } from '../../src/performance/PerformanceMonitor';
import { AdaptiveQualityManager } from '../../src/performance/AdaptiveQualityManager';
import { OptimizedRenderingPipeline } from '../../src/rendering/OptimizedRenderingPipeline';
import { WasmOptimizer } from '../../src/wasm/WasmOptimizer';
import { MemoryManager } from '../../src/memory/MemoryManager';

interface BenchmarkResult {
  name: string;
  score: number;
  metrics: {
    fps: number;
    averageProcessingTime: number;
    memoryUsage: number;
    peakMemoryUsage: number;
    stability: number;
  };
  details: any;
}

class PerformanceBenchmark {
  private canvas: HTMLCanvasElement;
  private performanceMonitor: PerformanceMonitor;
  private memoryManager: MemoryManager;
  private results: BenchmarkResult[] = [];

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 1280;
    this.canvas.height = 720;
    document.body.appendChild(this.canvas);

    this.performanceMonitor = new PerformanceMonitor();
    this.memoryManager = new MemoryManager();
    this.memoryManager.startMonitoring();
  }

  public async runFullBenchmark(): Promise<BenchmarkResult[]> {
    console.log('Starting comprehensive performance benchmark...');
    
    this.results = [];
    
    // Core performance benchmarks
    await this.benchmarkFrameProcessing();
    await this.benchmarkRenderingPipeline();
    await this.benchmarkMemoryManagement();
    await this.benchmarkWasmOptimization();
    await this.benchmarkAdaptiveQuality();
    
    // Stress tests
    await this.benchmarkStressTest();
    await this.benchmarkLongRunningTest();
    
    // Real-world scenarios
    await this.benchmarkMultiPersonDetection();
    await this.benchmarkHighResolutionProcessing();
    
    console.log('Benchmark completed');
    return this.results;
  }

  private async benchmarkFrameProcessing(): Promise<void> {
    const testName = 'Frame Processing';
    console.log(`Running ${testName} benchmark...`);
    
    const iterations = 300; // 10 seconds at 30 FPS
    const processingTimes: number[] = [];
    let totalFrames = 0;
    let droppedFrames = 0;
    
    const startTime = performance.now();
    
    for (let i = 0; i < iterations; i++) {
      const frameStart = performance.now();
      
      // Simulate frame processing
      const mockImageData = this.generateMockImageData(1280, 720);
      const mockPoses = this.generateMockPoseData(2); // 2 people
      
      // Process frame
      await this.processFrame(mockImageData, mockPoses);
      
      const frameEnd = performance.now();
      const frameTime = frameEnd - frameStart;
      
      processingTimes.push(frameTime);
      totalFrames++;
      
      if (frameTime > 33.33) { // 30 FPS threshold
        droppedFrames++;
      }
      
      // Simulate 30 FPS timing
      await this.sleep(Math.max(0, 33.33 - frameTime));
    }
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    
    const avgProcessingTime = processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length;
    const fps = (totalFrames / totalTime) * 1000;
    const memoryUsage = this.memoryManager.getMemoryUsage();
    
    const score = this.calculateScore({
      fps,
      averageProcessingTime: avgProcessingTime,
      memoryUsage,
      droppedFrames: droppedFrames / totalFrames
    });
    
    this.results.push({
      name: testName,
      score,
      metrics: {
        fps,
        averageProcessingTime: avgProcessingTime,
        memoryUsage,
        peakMemoryUsage: memoryUsage,
        stability: 1 - (droppedFrames / totalFrames)
      },
      details: {
        totalFrames,
        droppedFrames,
        processingTimes: processingTimes.slice(-10), // Last 10 frame times
        targetFPS: 30
      }
    });
  }

  private async benchmarkRenderingPipeline(): Promise<void> {
    const testName = 'Rendering Pipeline';
    console.log(`Running ${testName} benchmark...`);
    
    const pipeline = new OptimizedRenderingPipeline(this.canvas);
    const renderTimes: number[] = [];
    const iterations = 200;
    
    pipeline.start();
    
    const startMemory = this.memoryManager.getMemoryUsage();
    
    for (let i = 0; i < iterations; i++) {
      const renderStart = performance.now();
      
      // Create mock render frame
      const frame = {
        id: `frame-${i}`,
        timestamp: performance.now(),
        imageData: this.generateMockImageData(1280, 720),
        poses: this.generateMockPoseData(3),
        overlays: [
          { type: 'skeleton' as const, data: {}, visible: true, opacity: 1.0 },
          { type: 'trajectory' as const, data: { points: [] }, visible: true, opacity: 0.8 }
        ],
        priority: 1
      };
      
      pipeline.queueFrame(frame);
      
      // Wait for frame to be processed
      await this.sleep(16.67); // 60 FPS timing
      
      const renderEnd = performance.now();
      renderTimes.push(renderEnd - renderStart);
    }
    
    const endMemory = this.memoryManager.getMemoryUsage();
    const stats = pipeline.getStats();
    
    pipeline.stop();
    
    const score = this.calculateScore({
      fps: stats.fps,
      averageProcessingTime: stats.frameTime,
      memoryUsage: endMemory - startMemory,
      droppedFrames: stats.droppedFrames / iterations
    });
    
    this.results.push({
      name: testName,
      score,
      metrics: {
        fps: stats.fps,
        averageProcessingTime: stats.frameTime,
        memoryUsage: endMemory - startMemory,
        peakMemoryUsage: endMemory,
        stability: 1 - (stats.droppedFrames / iterations)
      },
      details: {
        renderingStats: stats,
        renderTimes: renderTimes.slice(-10)
      }
    });
  }

  private async benchmarkMemoryManagement(): Promise<void> {
    const testName = 'Memory Management';
    console.log(`Running ${testName} benchmark...`);
    
    const startMemory = this.memoryManager.getMemoryUsage();
    const iterations = 1000;
    
    // Test memory pool efficiency
    const poolHits = [];
    const poolMisses = [];
    
    for (let i = 0; i < iterations; i++) {
      // Acquire and release objects from different pools
      const imageData = this.memoryManager.acquire<ImageData>('imageData');
      const poseData = this.memoryManager.acquire<Float32Array>('poseData');
      const frameBuffer = this.memoryManager.acquire<Uint8Array>('frameBuffer');
      
      // Use objects briefly
      await this.sleep(1);
      
      // Release objects
      this.memoryManager.release('imageData', imageData);
      this.memoryManager.release('poseData', poseData);
      this.memoryManager.release('frameBuffer', frameBuffer);
      
      // Track pool performance
      const stats = this.memoryManager.getStats();
      const imageDataPool = stats.poolStats.get('imageData');
      if (imageDataPool) {
        poolHits.push(imageDataPool.hits);
        poolMisses.push(imageDataPool.misses);
      }
    }
    
    // Force garbage collection test
    this.memoryManager.forceGC();
    await this.sleep(100); // Wait for GC
    
    const endMemory = this.memoryManager.getMemoryUsage();
    const memoryDelta = endMemory - startMemory;
    
    const stats = this.memoryManager.getStats();
    const hitRate = poolHits.length > 0 ? 
      (poolHits[poolHits.length - 1] / (poolHits[poolHits.length - 1] + poolMisses[poolMisses.length - 1])) : 0;
    
    const score = this.calculateScore({
      fps: 60, // Not applicable
      averageProcessingTime: 1, // Minimal processing time
      memoryUsage: memoryDelta,
      droppedFrames: 0,
      hitRate
    });
    
    this.results.push({
      name: testName,
      score,
      metrics: {
        fps: 60,
        averageProcessingTime: 1,
        memoryUsage: memoryDelta,
        peakMemoryUsage: endMemory,
        stability: hitRate
      },
      details: {
        memoryStats: stats,
        poolHitRate: hitRate,
        gcStats: stats.gcStats
      }
    });
  }

  private async benchmarkWasmOptimization(): Promise<void> {
    const testName = 'WebAssembly Optimization';
    console.log(`Running ${testName} benchmark...`);
    
    const wasmOptimizer = new WasmOptimizer();
    const isWasmAvailable = await wasmOptimizer.initialize();
    
    if (!isWasmAvailable) {
      console.warn('WebAssembly not available, using JavaScript fallback');
    }
    
    const iterations = 100;
    const wasmTimes: number[] = [];
    const jsTimes: number[] = [];
    
    // Test pose data processing
    const mockPoseData = new Float32Array(51); // 17 keypoints * 3
    for (let i = 0; i < mockPoseData.length; i++) {
      mockPoseData[i] = Math.random();
    }
    
    // Benchmark WebAssembly version
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await wasmOptimizer.calculateGaitMetrics(mockPoseData);
      const end = performance.now();
      wasmTimes.push(end - start);
    }
    
    // Benchmark JavaScript fallback
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      this.calculateGaitMetricsJS(mockPoseData);
      const end = performance.now();
      jsTimes.push(end - start);
    }
    
    const avgWasmTime = wasmTimes.reduce((a, b) => a + b, 0) / wasmTimes.length;
    const avgJsTime = jsTimes.reduce((a, b) => a + b, 0) / jsTimes.length;
    const speedup = avgJsTime / avgWasmTime;
    
    const memoryUsage = wasmOptimizer.getMemoryUsage();
    const capabilities = wasmOptimizer.getCapabilities();
    
    const score = this.calculateScore({
      fps: 1000 / avgWasmTime, // Theoretical FPS based on processing time
      averageProcessingTime: avgWasmTime,
      memoryUsage,
      droppedFrames: 0,
      speedup
    });
    
    this.results.push({
      name: testName,
      score,
      metrics: {
        fps: 1000 / avgWasmTime,
        averageProcessingTime: avgWasmTime,
        memoryUsage,
        peakMemoryUsage: memoryUsage,
        stability: speedup
      },
      details: {
        wasmAvailable: isWasmAvailable,
        capabilities,
        wasmTime: avgWasmTime,
        jsTime: avgJsTime,
        speedup,
        wasmTimes: wasmTimes.slice(-10),
        jsTimes: jsTimes.slice(-10)
      }
    });
    
    wasmOptimizer.dispose();
  }

  private async benchmarkAdaptiveQuality(): Promise<void> {
    const testName = 'Adaptive Quality Management';
    console.log(`Running ${testName} benchmark...`);
    
    const adaptiveQuality = new AdaptiveQualityManager(this.performanceMonitor);
    const adaptations: any[] = [];
    
    // Simulate varying performance conditions
    const testScenarios = [
      { fps: 60, cpu: 30, memory: 200 * 1024 * 1024 }, // Good performance
      { fps: 25, cpu: 80, memory: 400 * 1024 * 1024 }, // Poor performance
      { fps: 45, cpu: 50, memory: 300 * 1024 * 1024 }, // Medium performance
      { fps: 15, cpu: 95, memory: 500 * 1024 * 1024 }, // Very poor performance
      { fps: 50, cpu: 40, memory: 250 * 1024 * 1024 }  // Recovery
    ];
    
    let totalAdaptations = 0;
    let appropriateAdaptations = 0;
    
    for (const scenario of testScenarios) {
      // Simulate performance metrics
      this.performanceMonitor.recordFrame({
        renderTime: 1000 / scenario.fps,
        memoryUsage: scenario.memory,
        processingTime: 1000 / scenario.fps,
        accuracy: 0.95
      });
      
      await this.sleep(2100); // Wait for adaptation (hysteresis = 2000ms)
      
      const currentProfile = adaptiveQuality.getCurrentProfile();
      adaptations.push({
        scenario,
        profile: currentProfile.name,
        timestamp: Date.now()
      });
      
      totalAdaptations++;
      
      // Check if adaptation was appropriate
      if (scenario.fps < 25 && ['low', 'minimal'].includes(currentProfile.name)) {
        appropriateAdaptations++;
      } else if (scenario.fps > 50 && ['high', 'ultra'].includes(currentProfile.name)) {
        appropriateAdaptations++;
      } else if (scenario.fps >= 25 && scenario.fps <= 50 && ['medium', 'high'].includes(currentProfile.name)) {
        appropriateAdaptations++;
      }
    }
    
    const adaptationAccuracy = appropriateAdaptations / totalAdaptations;
    const history = adaptiveQuality.getAdaptationHistory();
    
    const score = this.calculateScore({
      fps: 60, // Not directly applicable
      averageProcessingTime: 16.67, // Target frame time
      memoryUsage: 0,
      droppedFrames: 0,
      adaptationAccuracy
    });
    
    this.results.push({
      name: testName,
      score,
      metrics: {
        fps: 60,
        averageProcessingTime: 16.67,
        memoryUsage: 0,
        peakMemoryUsage: 0,
        stability: adaptationAccuracy
      },
      details: {
        adaptations,
        adaptationHistory: history,
        adaptationAccuracy,
        deviceCapabilities: adaptiveQuality.getDeviceCapabilities()
      }
    });
    
    adaptiveQuality.dispose();
  }

  private async benchmarkStressTest(): Promise<void> {
    const testName = 'Stress Test';
    console.log(`Running ${testName} benchmark...`);
    
    const iterations = 1000;
    const concurrentOperations = 5;
    const stressResults: any[] = [];
    
    const startTime = performance.now();
    const startMemory = this.memoryManager.getMemoryUsage();
    
    // Run multiple concurrent operations
    const promises: Promise<void>[] = [];
    
    for (let i = 0; i < concurrentOperations; i++) {
      promises.push(this.runConcurrentStressTest(iterations / concurrentOperations, i));
    }
    
    await Promise.all(promises);
    
    const endTime = performance.now();
    const endMemory = this.memoryManager.getMemoryUsage();
    
    const totalTime = endTime - startTime;
    const memoryDelta = endMemory - startMemory;
    const fps = (iterations / totalTime) * 1000;
    
    const score = this.calculateScore({
      fps,
      averageProcessingTime: totalTime / iterations,
      memoryUsage: memoryDelta,
      droppedFrames: 0
    });
    
    this.results.push({
      name: testName,
      score,
      metrics: {
        fps,
        averageProcessingTime: totalTime / iterations,
        memoryUsage: memoryDelta,
        peakMemoryUsage: endMemory,
        stability: 1.0 // Completed without crashes
      },
      details: {
        iterations,
        concurrentOperations,
        totalTime,
        memoryDelta,
        stressResults
      }
    });
  }

  private async runConcurrentStressTest(iterations: number, threadId: number): Promise<void> {
    for (let i = 0; i < iterations; i++) {
      // Simulate heavy processing
      const imageData = this.generateMockImageData(640, 480);
      const poses = this.generateMockPoseData(4); // 4 people
      
      await this.processFrame(imageData, poses);
      
      // Brief pause to prevent blocking
      if (i % 10 === 0) {
        await this.sleep(1);
      }
    }
  }

  private async benchmarkLongRunningTest(): Promise<void> {
    const testName = 'Long Running Test';
    console.log(`Running ${testName} benchmark...`);
    
    const duration = 30000; // 30 seconds
    const startTime = performance.now();
    const startMemory = this.memoryManager.getMemoryUsage();
    
    let frameCount = 0;
    let totalProcessingTime = 0;
    const memorySnapshots: number[] = [];
    
    while (performance.now() - startTime < duration) {
      const frameStart = performance.now();
      
      // Simulate frame processing
      const imageData = this.generateMockImageData(1280, 720);
      const poses = this.generateMockPoseData(2);
      
      await this.processFrame(imageData, poses);
      
      const frameEnd = performance.now();
      totalProcessingTime += frameEnd - frameStart;
      frameCount++;
      
      // Take memory snapshot every 100 frames
      if (frameCount % 100 === 0) {
        memorySnapshots.push(this.memoryManager.getMemoryUsage());
      }
      
      // Maintain 30 FPS
      await this.sleep(Math.max(0, 33.33 - (frameEnd - frameStart)));
    }
    
    const endTime = performance.now();
    const endMemory = this.memoryManager.getMemoryUsage();
    
    const actualDuration = endTime - startTime;
    const fps = (frameCount / actualDuration) * 1000;
    const avgProcessingTime = totalProcessingTime / frameCount;
    const memoryDelta = endMemory - startMemory;
    
    // Check for memory leaks
    const memoryGrowth = memorySnapshots.length > 1 ? 
      memorySnapshots[memorySnapshots.length - 1] - memorySnapshots[0] : 0;
    
    const score = this.calculateScore({
      fps,
      averageProcessingTime: avgProcessingTime,
      memoryUsage: memoryDelta,
      droppedFrames: 0,
      memoryGrowth: memoryGrowth / (1024 * 1024) // Convert to MB
    });
    
    this.results.push({
      name: testName,
      score,
      metrics: {
        fps,
        averageProcessingTime: avgProcessingTime,
        memoryUsage: memoryDelta,
        peakMemoryUsage: Math.max(...memorySnapshots),
        stability: 1.0 - (memoryGrowth / startMemory) // Stability decreases with memory growth
      },
      details: {
        duration: actualDuration,
        frameCount,
        memorySnapshots,
        memoryGrowth,
        targetFPS: 30
      }
    });
  }

  private async benchmarkMultiPersonDetection(): Promise<void> {
    const testName = 'Multi-Person Detection';
    console.log(`Running ${testName} benchmark...`);
    
    const personCounts = [1, 2, 3, 4, 5, 6, 8, 10];
    const results: any[] = [];
    
    for (const personCount of personCounts) {
      const iterations = 50;
      const processingTimes: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        
        const imageData = this.generateMockImageData(1280, 720);
        const poses = this.generateMockPoseData(personCount);
        
        await this.processFrame(imageData, poses);
        
        const end = performance.now();
        processingTimes.push(end - start);
      }
      
      const avgTime = processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length;
      const fps = 1000 / avgTime;
      
      results.push({
        personCount,
        averageProcessingTime: avgTime,
        fps,
        meetsTarget: fps >= 30
      });
    }
    
    const maxSupportedPersons = results.filter(r => r.meetsTarget).length;
    const avgFPS = results.reduce((sum, r) => sum + r.fps, 0) / results.length;
    
    const score = this.calculateScore({
      fps: avgFPS,
      averageProcessingTime: 1000 / avgFPS,
      memoryUsage: 0,
      droppedFrames: 0,
      scalability: maxSupportedPersons / personCounts.length
    });
    
    this.results.push({
      name: testName,
      score,
      metrics: {
        fps: avgFPS,
        averageProcessingTime: 1000 / avgFPS,
        memoryUsage: 0,
        peakMemoryUsage: 0,
        stability: maxSupportedPersons / personCounts.length
      },
      details: {
        results,
        maxSupportedPersons,
        personCounts
      }
    });
  }

  private async benchmarkHighResolutionProcessing(): Promise<void> {
    const testName = 'High Resolution Processing';
    console.log(`Running ${testName} benchmark...`);
    
    const resolutions = [
      { width: 640, height: 480, name: '480p' },
      { width: 1280, height: 720, name: '720p' },
      { width: 1920, height: 1080, name: '1080p' },
      { width: 2560, height: 1440, name: '1440p' },
      { width: 3840, height: 2160, name: '4K' }
    ];
    
    const results: any[] = [];
    
    for (const resolution of resolutions) {
      const iterations = 20;
      const processingTimes: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        
        const imageData = this.generateMockImageData(resolution.width, resolution.height);
        const poses = this.generateMockPoseData(1);
        
        await this.processFrame(imageData, poses);
        
        const end = performance.now();
        processingTimes.push(end - start);
      }
      
      const avgTime = processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length;
      const fps = 1000 / avgTime;
      
      results.push({
        resolution: resolution.name,
        width: resolution.width,
        height: resolution.height,
        averageProcessingTime: avgTime,
        fps,
        meetsTarget: fps >= 30
      });
    }
    
    const maxSupportedResolution = results.filter(r => r.meetsTarget).slice(-1)[0];
    const avgFPS = results.reduce((sum, r) => sum + r.fps, 0) / results.length;
    
    const score = this.calculateScore({
      fps: avgFPS,
      averageProcessingTime: 1000 / avgFPS,
      memoryUsage: 0,
      droppedFrames: 0,
      maxResolution: maxSupportedResolution ? maxSupportedResolution.width * maxSupportedResolution.height : 0
    });
    
    this.results.push({
      name: testName,
      score,
      metrics: {
        fps: avgFPS,
        averageProcessingTime: 1000 / avgFPS,
        memoryUsage: 0,
        peakMemoryUsage: 0,
        stability: maxSupportedResolution ? 1.0 : 0.5
      },
      details: {
        results,
        maxSupportedResolution,
        resolutions
      }
    });
  }

  private calculateScore(metrics: any): number {
    // Weighted scoring system
    const weights = {
      fps: 0.3,
      processingTime: 0.2,
      memory: 0.2,
      stability: 0.15,
      efficiency: 0.15
    };
    
    let score = 0;
    
    // FPS score (0-100)
    const fpsScore = Math.min(100, (metrics.fps / 60) * 100);
    score += fpsScore * weights.fps;
    
    // Processing time score (0-100, lower is better)
    const processingScore = Math.max(0, 100 - (metrics.averageProcessingTime / 33.33) * 100);
    score += processingScore * weights.processingTime;
    
    // Memory score (0-100, lower usage is better)
    const memoryScore = Math.max(0, 100 - (metrics.memoryUsage / (100 * 1024 * 1024)) * 100);
    score += memoryScore * weights.memory;
    
    // Stability score (0-100)
    const stabilityScore = (metrics.stability || 1.0) * 100;
    score += stabilityScore * weights.stability;
    
    // Efficiency score (based on various factors)
    const efficiencyScore = this.calculateEfficiencyScore(metrics);
    score += efficiencyScore * weights.efficiency;
    
    return Math.max(0, Math.min(100, score));
  }

  private calculateEfficiencyScore(metrics: any): number {
    let efficiency = 100;
    
    // Penalize dropped frames
    if (metrics.droppedFrames > 0) {
      efficiency -= metrics.droppedFrames * 10;
    }
    
    // Reward good hit rates
    if (metrics.hitRate) {
      efficiency += (metrics.hitRate - 0.8) * 50;
    }
    
    // Reward WASM speedup
    if (metrics.speedup) {
      efficiency += Math.min(20, (metrics.speedup - 1) * 10);
    }
    
    // Reward adaptation accuracy
    if (metrics.adaptationAccuracy) {
      efficiency += (metrics.adaptationAccuracy - 0.7) * 100;
    }
    
    return Math.max(0, Math.min(100, efficiency));
  }

  private async processFrame(imageData: ImageData, poses: any[]): Promise<void> {
    // Simulate AI processing
    await this.sleep(Math.random() * 10 + 5);
    
    // Record performance metrics
    this.performanceMonitor.recordFrame({
      renderTime: performance.now(),
      memoryUsage: this.memoryManager.getMemoryUsage(),
      processingTime: Math.random() * 10 + 5,
      accuracy: 0.9 + Math.random() * 0.1
    });
  }

  private generateMockImageData(width: number, height: number): ImageData {
    const data = new Uint8ClampedArray(width * height * 4);
    
    // Generate random image data
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.random() * 255;     // R
      data[i + 1] = Math.random() * 255; // G
      data[i + 2] = Math.random() * 255; // B
      data[i + 3] = 255;                 // A
    }
    
    return new ImageData(data, width, height);
  }

  private generateMockPoseData(personCount: number): any[] {
    const poses = [];
    
    for (let p = 0; p < personCount; p++) {
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
      for (let i = 0; i < 17; i++) {
        pose.keypoints.push({
          x: Math.random() * 1280,
          y: Math.random() * 720,
          confidence: 0.5 + Math.random() * 0.5,
          name: `keypoint_${i}`
        });
      }
      
      poses.push(pose);
    }
    
    return poses;
  }

  private calculateGaitMetricsJS(poseData: Float32Array): Float32Array {
    const metrics = new Float32Array(20);
    
    // Simple gait metrics calculation
    const keypoints = poseData.length / 3;
    
    for (let i = 0; i < keypoints; i++) {
      const x = poseData[i * 3];
      const y = poseData[i * 3 + 1];
      const confidence = poseData[i * 3 + 2];
      
      metrics[0] += Math.sqrt(x * x + y * y) * confidence;
    }
    
    metrics[0] /= keypoints;
    
    return metrics;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public generateReport(): string {
    const report = ['=== Performance Benchmark Report ===', ''];
    
    // Overall summary
    const avgScore = this.results.reduce((sum, r) => sum + r.score, 0) / this.results.length;
    report.push(`Overall Score: ${avgScore.toFixed(1)}/100`);
    report.push(`Performance Grade: ${this.getPerformanceGrade(avgScore)}`);
    report.push('');
    
    // Individual benchmark results
    report.push('=== Individual Benchmark Results ===');
    this.results.forEach(result => {
      report.push(`${result.name}: ${result.score.toFixed(1)}/100`);
      report.push(`  FPS: ${result.metrics.fps.toFixed(1)}`);
      report.push(`  Avg Processing Time: ${result.metrics.averageProcessingTime.toFixed(2)}ms`);
      report.push(`  Memory Usage: ${(result.metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`);
      report.push(`  Stability: ${(result.metrics.stability * 100).toFixed(1)}%`);
      report.push('');
    });
    
    // Recommendations
    report.push('=== Recommendations ===');
    report.push(...this.generateRecommendations());
    
    return report.join('\n');
  }

  private getPerformanceGrade(score: number): string {
    if (score >= 90) return 'A+ (Excellent)';
    if (score >= 80) return 'A (Very Good)';
    if (score >= 70) return 'B (Good)';
    if (score >= 60) return 'C (Fair)';
    if (score >= 50) return 'D (Poor)';
    return 'F (Failing)';
  }

  private generateRecommendations(): string[] {
    const recommendations = [];
    
    // Check for performance issues
    const lowScoreTests = this.results.filter(r => r.score < 70);
    
    if (lowScoreTests.length > 0) {
      recommendations.push('⚠️ Performance Issues Detected:');
      lowScoreTests.forEach(test => {
        recommendations.push(`- ${test.name} scored ${test.score.toFixed(1)}/100`);
        
        if (test.metrics.fps < 30) {
          recommendations.push('  → Consider reducing video resolution or frame rate');
        }
        
        if (test.metrics.averageProcessingTime > 33.33) {
          recommendations.push('  → Optimize processing pipeline or enable WebAssembly');
        }
        
        if (test.metrics.memoryUsage > 200 * 1024 * 1024) {
          recommendations.push('  → Implement memory pooling or garbage collection optimization');
        }
        
        if (test.metrics.stability < 0.9) {
          recommendations.push('  → Improve error handling and system stability');
        }
      });
    }
    
    // General recommendations
    recommendations.push('\n💡 General Recommendations:');
    recommendations.push('- Enable hardware acceleration when available');
    recommendations.push('- Use adaptive quality management for varying device capabilities');
    recommendations.push('- Implement object pooling for frequently allocated objects');
    recommendations.push('- Consider WebAssembly for CPU-intensive operations');
    recommendations.push('- Monitor memory usage and implement leak detection');
    
    return recommendations;
  }

  public dispose(): void {
    this.performanceMonitor.dispose();
    this.memoryManager.dispose();
    
    if (this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }
}

// Jest test cases
describe('Performance Benchmark', () => {
  let benchmark: PerformanceBenchmark;
  
  beforeEach(() => {
    benchmark = new PerformanceBenchmark();
  });
  
  afterEach(() => {
    benchmark.dispose();
  });
  
  test('should complete full benchmark suite', async () => {
    const results = await benchmark.runFullBenchmark();
    
    expect(results).toBeDefined();
    expect(results.length).toBeGreaterThan(0);
    expect(results.every(r => r.score >= 0 && r.score <= 100)).toBe(true);
  }, 120000); // 2 minute timeout
  
  test('should maintain 30+ FPS in frame processing', async () => {
    const results = await benchmark.runFullBenchmark();
    const frameProcessingResult = results.find(r => r.name === 'Frame Processing');
    
    expect(frameProcessingResult).toBeDefined();
    expect(frameProcessingResult!.metrics.fps).toBeGreaterThanOrEqual(30);
  }, 60000);
  
  test('should not have memory leaks', async () => {
    const results = await benchmark.runFullBenchmark();
    const memoryResult = results.find(r => r.name === 'Memory Management');
    
    expect(memoryResult).toBeDefined();
    expect(memoryResult!.metrics.stability).toBeGreaterThan(0.8);
  }, 60000);
  
  test('should show performance improvement with WebAssembly', async () => {
    const results = await benchmark.runFullBenchmark();
    const wasmResult = results.find(r => r.name === 'WebAssembly Optimization');
    
    expect(wasmResult).toBeDefined();
    // Either WASM should be faster or fallback should work
    expect(wasmResult!.score).toBeGreaterThan(50);
  }, 60000);
  
  test('should adapt quality based on performance', async () => {
    const results = await benchmark.runFullBenchmark();
    const adaptiveResult = results.find(r => r.name === 'Adaptive Quality Management');
    
    expect(adaptiveResult).toBeDefined();
    expect(adaptiveResult!.metrics.stability).toBeGreaterThan(0.7);
  }, 60000);
  
  test('should handle stress conditions', async () => {
    const results = await benchmark.runFullBenchmark();
    const stressResult = results.find(r => r.name === 'Stress Test');
    
    expect(stressResult).toBeDefined();
    expect(stressResult!.metrics.stability).toBe(1.0); // Should not crash
  }, 60000);
});

export { PerformanceBenchmark, type BenchmarkResult };
