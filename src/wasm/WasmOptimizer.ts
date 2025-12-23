/**
 * WebAssembly optimization utilities for CPU-intensive gait analysis tasks
 * Provides significant performance improvements for mathematical operations
 */

interface WasmModule {
  memory: WebAssembly.Memory;
  exports: {
    malloc: (size: number) => number;
    free: (ptr: number) => void;
    calculateGaitMetrics: (dataPtr: number, length: number) => number;
    filterPoseData: (dataPtr: number, length: number, threshold: number) => number;
    calculateJointAngles: (keypointsPtr: number, count: number) => number;
    processFrameData: (framePtr: number, width: number, height: number) => number;
    optimizeTrajectory: (pointsPtr: number, count: number) => number;
    [key: string]: any;
  };
}

interface WasmOptimizationOptions {
  initialMemoryPages: number;
  maximumMemoryPages: number;
  enableSIMD: boolean;
  enableThreads: boolean;
  wasmPath: string;
}

class WasmOptimizer {
  private module: WasmModule | null = null;
  private isInitialized = false;
  private memoryManager: WasmMemoryManager;
  private options: WasmOptimizationOptions;
  private wasmSupported = false;
  private simdSupported = false;
  private threadsSupported = false;

  constructor(options: Partial<WasmOptimizationOptions> = {}) {
    this.options = {
      initialMemoryPages: 256, // 16MB
      maximumMemoryPages: 1024, // 64MB
      enableSIMD: true,
      enableThreads: false, // Disabled by default for compatibility
      wasmPath: '/wasm/gait-analysis.wasm',
      ...options
    };

    this.memoryManager = new WasmMemoryManager();
    this.detectWasmSupport();
  }

  private detectWasmSupport(): void {
    // Check WebAssembly support
    this.wasmSupported = typeof WebAssembly !== 'undefined' && 
                        typeof WebAssembly.instantiate === 'function';

    if (!this.wasmSupported) {
      console.warn('WebAssembly not supported, falling back to JavaScript');
      return;
    }

    // Check SIMD support
    this.simdSupported = this.checkSIMDSupport();
    
    // Check threads support
    this.threadsSupported = this.checkThreadsSupport();

    console.log('WebAssembly capabilities:', {
      wasm: this.wasmSupported,
      simd: this.simdSupported,
      threads: this.threadsSupported
    });
  }

  private checkSIMDSupport(): boolean {
    try {
      // Test if SIMD is supported by trying to compile a simple SIMD instruction
      const simdTestModule = new Uint8Array([
        0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
        0x01, 0x05, 0x01, 0x60, 0x00, 0x01, 0x7b,
        0x03, 0x02, 0x01, 0x00,
        0x0a, 0x0a, 0x01, 0x08, 0x00, 0x41, 0x00, 0xfd, 0x0c, 0x0b
      ]);
      
      WebAssembly.validate(simdTestModule);
      return true;
    } catch (error) {
      return false;
    }
  }

  private checkThreadsSupport(): boolean {
    return typeof SharedArrayBuffer !== 'undefined' && 
           typeof Worker !== 'undefined';
  }

  public async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    if (!this.wasmSupported) {
      console.warn('WebAssembly not supported, using JavaScript fallback');
      return false;
    }

    try {
      const wasmModule = await this.loadWasmModule();
      this.module = wasmModule;
      this.memoryManager.initialize(wasmModule.memory);
      this.isInitialized = true;
      
      console.log('WebAssembly module initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize WebAssembly module:', error);
      return false;
    }
  }

  private async loadWasmModule(): Promise<WasmModule> {
    const importObject = {
      env: {
        memory: new WebAssembly.Memory({
          initial: this.options.initialMemoryPages,
          maximum: this.options.maximumMemoryPages,
          shared: this.options.enableThreads
        }),
        abort: () => {
          throw new Error('WebAssembly abort called');
        },
        // Math functions
        sin: Math.sin,
        cos: Math.cos,
        sqrt: Math.sqrt,
        atan2: Math.atan2,
        pow: Math.pow,
        // Console functions for debugging
        consoleLog: (value: number) => console.log('WASM LOG:', value),
        consoleError: (value: number) => console.error('WASM ERROR:', value)
      }
    };

    const wasmResponse = await fetch(this.options.wasmPath);
    if (!wasmResponse.ok) {
      throw new Error(`Failed to load WASM file: ${wasmResponse.status}`);
    }

    const wasmBytes = await wasmResponse.arrayBuffer();
    const wasmModule = await WebAssembly.instantiate(wasmBytes, importObject);
    
    return {
      memory: importObject.env.memory,
      exports: wasmModule.instance.exports as any
    };
  }

  public async calculateGaitMetrics(poseData: Float32Array): Promise<Float32Array | null> {
    if (!this.isInitialized || !this.module) {
      return this.calculateGaitMetricsJS(poseData);
    }

    try {
      // Allocate memory for input data
      const inputPtr = this.memoryManager.allocate(poseData.length * 4);
      
      // Copy data to WASM memory
      const wasmMemory = new Float32Array(this.module.memory.buffer, inputPtr, poseData.length);
      wasmMemory.set(poseData);
      
      // Call WASM function
      const resultPtr = this.module.exports.calculateGaitMetrics(inputPtr, poseData.length);
      
      // Read result
      const resultLength = 20; // Number of gait metrics
      const result = new Float32Array(this.module.memory.buffer, resultPtr, resultLength);
      const output = new Float32Array(result);
      
      // Free memory
      this.memoryManager.free(inputPtr);
      this.memoryManager.free(resultPtr);
      
      return output;
    } catch (error) {
      console.error('WASM gait metrics calculation failed:', error);
      return this.calculateGaitMetricsJS(poseData);
    }
  }

  private calculateGaitMetricsJS(poseData: Float32Array): Float32Array {
    // JavaScript fallback implementation
    const metrics = new Float32Array(20);
    
    // Basic gait metrics calculation
    // This is a simplified version - actual implementation would be more complex
    const keypoints = poseData.length / 3; // x, y, confidence per keypoint
    
    for (let i = 0; i < keypoints; i++) {
      const x = poseData[i * 3];
      const y = poseData[i * 3 + 1];
      const confidence = poseData[i * 3 + 2];
      
      // Simple velocity calculation
      metrics[0] += Math.sqrt(x * x + y * y) * confidence;
    }
    
    metrics[0] /= keypoints; // Average velocity
    
    return metrics;
  }

  public async filterPoseData(poseData: Float32Array, threshold: number): Promise<Float32Array | null> {
    if (!this.isInitialized || !this.module) {
      return this.filterPoseDataJS(poseData, threshold);
    }

    try {
      const inputPtr = this.memoryManager.allocate(poseData.length * 4);
      const wasmMemory = new Float32Array(this.module.memory.buffer, inputPtr, poseData.length);
      wasmMemory.set(poseData);
      
      const resultPtr = this.module.exports.filterPoseData(inputPtr, poseData.length, threshold);
      
      const result = new Float32Array(this.module.memory.buffer, resultPtr, poseData.length);
      const output = new Float32Array(result);
      
      this.memoryManager.free(inputPtr);
      this.memoryManager.free(resultPtr);
      
      return output;
    } catch (error) {
      console.error('WASM pose filtering failed:', error);
      return this.filterPoseDataJS(poseData, threshold);
    }
  }

  private filterPoseDataJS(poseData: Float32Array, threshold: number): Float32Array {
    const filtered = new Float32Array(poseData.length);
    
    for (let i = 0; i < poseData.length; i += 3) {
      const confidence = poseData[i + 2];
      
      if (confidence >= threshold) {
        filtered[i] = poseData[i];     // x
        filtered[i + 1] = poseData[i + 1]; // y
        filtered[i + 2] = confidence;   // confidence
      }
    }
    
    return filtered;
  }

  public async calculateJointAngles(keypoints: Float32Array): Promise<Float32Array | null> {
    if (!this.isInitialized || !this.module) {
      return this.calculateJointAnglesJS(keypoints);
    }

    try {
      const inputPtr = this.memoryManager.allocate(keypoints.length * 4);
      const wasmMemory = new Float32Array(this.module.memory.buffer, inputPtr, keypoints.length);
      wasmMemory.set(keypoints);
      
      const resultPtr = this.module.exports.calculateJointAngles(inputPtr, keypoints.length / 3);
      
      const resultLength = 12; // Number of joint angles
      const result = new Float32Array(this.module.memory.buffer, resultPtr, resultLength);
      const output = new Float32Array(result);
      
      this.memoryManager.free(inputPtr);
      this.memoryManager.free(resultPtr);
      
      return output;
    } catch (error) {
      console.error('WASM joint angle calculation failed:', error);
      return this.calculateJointAnglesJS(keypoints);
    }
  }

  private calculateJointAnglesJS(keypoints: Float32Array): Float32Array {
    const angles = new Float32Array(12);
    
    // Calculate joint angles using vector mathematics
    // This is a simplified implementation
    for (let i = 0; i < keypoints.length; i += 9) { // 3 points per angle
      const p1 = { x: keypoints[i], y: keypoints[i + 1] };
      const p2 = { x: keypoints[i + 3], y: keypoints[i + 4] };
      const p3 = { x: keypoints[i + 6], y: keypoints[i + 7] };
      
      // Calculate angle between vectors
      const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
      const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };
      
      const dot = v1.x * v2.x + v1.y * v2.y;
      const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
      const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
      
      if (mag1 > 0 && mag2 > 0) {
        angles[i / 9] = Math.acos(dot / (mag1 * mag2));
      }
    }
    
    return angles;
  }

  public async processFrameData(frameData: Uint8Array, width: number, height: number): Promise<Uint8Array | null> {
    if (!this.isInitialized || !this.module) {
      return this.processFrameDataJS(frameData, width, height);
    }

    try {
      const inputPtr = this.memoryManager.allocate(frameData.length);
      const wasmMemory = new Uint8Array(this.module.memory.buffer, inputPtr, frameData.length);
      wasmMemory.set(frameData);
      
      const resultPtr = this.module.exports.processFrameData(inputPtr, width, height);
      
      const result = new Uint8Array(this.module.memory.buffer, resultPtr, frameData.length);
      const output = new Uint8Array(result);
      
      this.memoryManager.free(inputPtr);
      this.memoryManager.free(resultPtr);
      
      return output;
    } catch (error) {
      console.error('WASM frame processing failed:', error);
      return this.processFrameDataJS(frameData, width, height);
    }
  }

  private processFrameDataJS(frameData: Uint8Array, width: number, height: number): Uint8Array {
    const processed = new Uint8Array(frameData.length);
    
    // Simple frame processing (e.g., edge detection)
    for (let i = 0; i < frameData.length; i += 4) {
      const r = frameData[i];
      const g = frameData[i + 1];
      const b = frameData[i + 2];
      const a = frameData[i + 3];
      
      // Convert to grayscale
      const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      
      processed[i] = gray;
      processed[i + 1] = gray;
      processed[i + 2] = gray;
      processed[i + 3] = a;
    }
    
    return processed;
  }

  public isWasmAvailable(): boolean {
    return this.wasmSupported && this.isInitialized;
  }

  public isSIMDAvailable(): boolean {
    return this.simdSupported && this.isInitialized;
  }

  public isThreadsAvailable(): boolean {
    return this.threadsSupported && this.isInitialized;
  }

  public getMemoryUsage(): number {
    return this.memoryManager.getUsage();
  }

  public getCapabilities(): {
    wasm: boolean;
    simd: boolean;
    threads: boolean;
    memorySize: number;
  } {
    return {
      wasm: this.wasmSupported,
      simd: this.simdSupported,
      threads: this.threadsSupported,
      memorySize: this.module ? this.module.memory.buffer.byteLength : 0
    };
  }

  public dispose(): void {
    if (this.memoryManager) {
      this.memoryManager.dispose();
    }
    this.module = null;
    this.isInitialized = false;
  }
}

class WasmMemoryManager {
  private memory: WebAssembly.Memory | null = null;
  private allocatedBlocks: Map<number, number> = new Map();
  private freeBlocks: { ptr: number; size: number }[] = [];
  private nextPtr = 1024; // Start after some reserved space

  public initialize(memory: WebAssembly.Memory): void {
    this.memory = memory;
  }

  public allocate(size: number): number {
    if (!this.memory) {
      throw new Error('Memory not initialized');
    }

    // Align size to 4-byte boundary
    const alignedSize = Math.ceil(size / 4) * 4;

    // Try to find a suitable free block
    for (let i = 0; i < this.freeBlocks.length; i++) {
      const block = this.freeBlocks[i];
      if (block.size >= alignedSize) {
        this.freeBlocks.splice(i, 1);
        
        // If block is larger, split it
        if (block.size > alignedSize) {
          this.freeBlocks.push({
            ptr: block.ptr + alignedSize,
            size: block.size - alignedSize
          });
        }
        
        this.allocatedBlocks.set(block.ptr, alignedSize);
        return block.ptr;
      }
    }

    // No suitable free block found, allocate new memory
    const ptr = this.nextPtr;
    this.nextPtr += alignedSize;
    
    // Check if we need to grow memory
    const requiredPages = Math.ceil(this.nextPtr / 65536);
    const currentPages = this.memory.buffer.byteLength / 65536;
    
    if (requiredPages > currentPages) {
      const additionalPages = requiredPages - currentPages;
      try {
        this.memory.grow(additionalPages);
      } catch (error) {
        throw new Error('Failed to grow WebAssembly memory');
      }
    }
    
    this.allocatedBlocks.set(ptr, alignedSize);
    return ptr;
  }

  public free(ptr: number): void {
    const size = this.allocatedBlocks.get(ptr);
    if (size) {
      this.allocatedBlocks.delete(ptr);
      this.freeBlocks.push({ ptr, size });
      
      // Merge adjacent free blocks
      this.mergeFreeBlocks();
    }
  }

  private mergeFreeBlocks(): void {
    this.freeBlocks.sort((a, b) => a.ptr - b.ptr);
    
    for (let i = 0; i < this.freeBlocks.length - 1; i++) {
      const current = this.freeBlocks[i];
      const next = this.freeBlocks[i + 1];
      
      if (current.ptr + current.size === next.ptr) {
        // Merge blocks
        current.size += next.size;
        this.freeBlocks.splice(i + 1, 1);
        i--; // Check this block again
      }
    }
  }

  public getUsage(): number {
    let totalAllocated = 0;
    for (const size of this.allocatedBlocks.values()) {
      totalAllocated += size;
    }
    return totalAllocated;
  }

  public dispose(): void {
    this.allocatedBlocks.clear();
    this.freeBlocks = [];
    this.memory = null;
  }
}

export { WasmOptimizer, type WasmOptimizationOptions };
