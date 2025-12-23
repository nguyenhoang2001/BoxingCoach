/**
 * Vitest test setup file
 * Configures global test environment and mocks
 */

import 'vitest-canvas-mock';
import { beforeEach, vi } from 'vitest';

// Mock performance.now
global.performance = {
  ...global.performance,
  now: vi.fn(() => Date.now())
};

// Mock performance.memory
Object.defineProperty(global.performance, 'memory', {
  writable: true,
  value: {
    usedJSHeapSize: 50000000,
    totalJSHeapSize: 100000000,
    jsHeapSizeLimit: 2000000000
  }
});

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((callback) => {
  setTimeout(callback, 16);
  return 1;
});

global.cancelAnimationFrame = vi.fn();

// Mock MediaDevices
const mockMediaDevices = {
  getUserMedia: vi.fn(() =>
    Promise.resolve({
      getTracks: () => [{
        stop: vi.fn()
      }]
    })
  )
};

Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: mockMediaDevices
});

// Mock HTMLVideoElement
Object.defineProperty(HTMLVideoElement.prototype, 'readyState', {
  writable: true,
  value: 4
});

Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', {
  writable: true,
  value: 640
});

Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', {
  writable: true,
  value: 480
});

// Mock HTMLCanvasElement
Object.defineProperty(HTMLCanvasElement.prototype, 'toDataURL', {
  writable: true,
  value: vi.fn(() => 'data:image/png;base64,mock-image-data')
});

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
};

// Setup test environment
beforeEach(() => {
  // Reset all mocks
  vi.clearAllMocks();
  
  // Reset DOM
  document.body.innerHTML = '';
  
  // Reset console
  (console.log as any).mockClear?.();
  (console.info as any).mockClear?.();
  (console.warn as any).mockClear?.();
  (console.error as any).mockClear?.();
});

// Global test utilities
global.createMockCanvas = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  return canvas;
};

global.createMockVideoElement = () => {
  const video = document.createElement('video');
  Object.defineProperty(video, 'readyState', { value: 4 });
  Object.defineProperty(video, 'videoWidth', { value: 640 });
  Object.defineProperty(video, 'videoHeight', { value: 480 });
  return video;
};

global.createMockPose = (options?: any) => {
  // Default keypoints must match the expected indices in GaitAnalysisService
  // The service expects keypoints[15] = leftAnkle and keypoints[16] = rightAnkle
  const defaultKeypoints = [
    { x: 320, y: 100, score: 0.9, name: 'nose' },           // 0
    { x: 310, y: 95, score: 0.85, name: 'left_eye' },       // 1
    { x: 330, y: 95, score: 0.85, name: 'right_eye' },      // 2
    { x: 305, y: 100, score: 0.8, name: 'left_ear' },       // 3
    { x: 335, y: 100, score: 0.8, name: 'right_ear' },      // 4
    { x: 280, y: 160, score: 0.9, name: 'left_shoulder' },  // 5
    { x: 360, y: 160, score: 0.9, name: 'right_shoulder' }, // 6
    { x: 260, y: 200, score: 0.85, name: 'left_elbow' },    // 7
    { x: 380, y: 200, score: 0.85, name: 'right_elbow' },   // 8
    { x: 250, y: 240, score: 0.8, name: 'left_wrist' },     // 9
    { x: 390, y: 240, score: 0.8, name: 'right_wrist' },    // 10
    { x: 300, y: 280, score: 0.9, name: 'left_hip' },       // 11
    { x: 340, y: 280, score: 0.9, name: 'right_hip' },      // 12
    { x: 295, y: 350, score: 0.85, name: 'left_knee' },     // 13
    { x: 345, y: 350, score: 0.85, name: 'right_knee' },    // 14
    { x: 290, y: 420, score: 0.9, name: 'left_ankle' },     // 15 - IMPORTANT: GaitAnalysisService uses index 15
    { x: 350, y: 420, score: 0.9, name: 'right_ankle' }     // 16 - IMPORTANT: GaitAnalysisService uses index 16
  ];

  return {
    keypoints: options?.keypoints || defaultKeypoints,
    score: options?.score || 0.9
  };
};

global.waitForNextFrame = () => {
  return new Promise(resolve => {
    requestAnimationFrame(resolve);
  });
};

// Mock TensorFlow.js modules
vi.mock('@tensorflow/tfjs', () => ({
  ready: vi.fn().mockResolvedValue(undefined),
  setBackend: vi.fn().mockResolvedValue(undefined),
  ENV: {
    set: vi.fn()
  }
}));

vi.mock('@tensorflow-models/pose-detection', () => ({
  SupportedModels: {
    MoveNet: 'MoveNet'
  },
  createDetector: vi.fn().mockResolvedValue({
    estimatePoses: vi.fn().mockResolvedValue([global.createMockPose()]),
    dispose: vi.fn()
  }),
  movenet: {
    modelType: {
      SINGLEPOSE_LIGHTNING: 'SINGLEPOSE_LIGHTNING',
      SINGLEPOSE_THUNDER: 'SINGLEPOSE_THUNDER'
    }
  }
}));

export {};