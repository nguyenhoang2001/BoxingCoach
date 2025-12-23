import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
  root: null,
  rootMargin: '',
  thresholds: [],
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock HTMLMediaElement
Object.defineProperty(HTMLMediaElement.prototype, 'play', {
  writable: true,
  value: vi.fn().mockImplementation(() => Promise.resolve()),
});

Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
  writable: true,
  value: vi.fn(),
});

Object.defineProperty(HTMLMediaElement.prototype, 'load', {
  writable: true,
  value: vi.fn(),
});

// Mock getUserMedia
const mockStream = {
  getTracks: vi.fn(() => [
    {
      stop: vi.fn(),
      getSettings: vi.fn(() => ({
        width: 1280,
        height: 720,
        frameRate: 30,
        facingMode: 'user',
        deviceId: 'default'
      })),
      getCapabilities: vi.fn(() => ({
        width: { min: 320, max: 1920 },
        height: { min: 240, max: 1080 },
        frameRate: { min: 15, max: 60 },
        facingMode: ['user', 'environment']
      })),
      getConstraints: vi.fn(() => ({})),
      applyConstraints: vi.fn(() => Promise.resolve()),
      enabled: true,
      id: 'video-track-1',
      kind: 'video',
      label: 'Camera 1',
      muted: false,
      readyState: 'live'
    }
  ]),
  getVideoTracks: vi.fn(() => [
    {
      stop: vi.fn(),
      getSettings: vi.fn(() => ({
        width: 1280,
        height: 720,
        frameRate: 30,
        facingMode: 'user',
        deviceId: 'default'
      })),
      getCapabilities: vi.fn(() => ({
        width: { min: 320, max: 1920 },
        height: { min: 240, max: 1080 },
        frameRate: { min: 15, max: 60 },
        facingMode: ['user', 'environment']
      })),
      getConstraints: vi.fn(() => ({})),
      applyConstraints: vi.fn(() => Promise.resolve()),
      enabled: true,
      id: 'video-track-1',
      kind: 'video',
      label: 'Camera 1',
      muted: false,
      readyState: 'live'
    }
  ]),
  active: true,
  id: 'stream-1'
};

Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: vi.fn(() => Promise.resolve(mockStream)),
    enumerateDevices: vi.fn(() => Promise.resolve([
      {
        deviceId: 'camera-1',
        groupId: 'group-1',
        kind: 'videoinput',
        label: 'Front Camera'
      },
      {
        deviceId: 'camera-2',
        groupId: 'group-2',
        kind: 'videoinput',
        label: 'Back Camera'
      }
    ])),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  },
});

// Mock permissions API
Object.defineProperty(navigator, 'permissions', {
  writable: true,
  value: {
    query: vi.fn(() => Promise.resolve({
      state: 'granted',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }))
  },
});

// Mock Canvas and WebGL
HTMLCanvasElement.prototype.getContext = vi.fn((contextType) => {
  if (contextType === '2d') {
    return {
      fillRect: vi.fn(),
      clearRect: vi.fn(),
      getImageData: vi.fn(() => ({
        data: new Uint8ClampedArray(4),
        width: 1,
        height: 1
      })),
      putImageData: vi.fn(),
      drawImage: vi.fn(),
      createImageData: vi.fn(() => ({
        data: new Uint8ClampedArray(4),
        width: 1,
        height: 1
      })),
      setTransform: vi.fn(),
      resetTransform: vi.fn(),
      measureText: vi.fn(() => ({ width: 0 })),
      fillText: vi.fn(),
      strokeText: vi.fn(),
      beginPath: vi.fn(),
      closePath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      arc: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      canvas: {
        width: 1280,
        height: 720,
        toDataURL: vi.fn(() => 'data:image/png;base64,mock'),
        toBlob: vi.fn()
      }
    };
  } else if (contextType === 'webgl' || contextType === 'webgl2') {
    return {
      getExtension: vi.fn(),
      createShader: vi.fn(),
      shaderSource: vi.fn(),
      compileShader: vi.fn(),
      createProgram: vi.fn(),
      attachShader: vi.fn(),
      linkProgram: vi.fn(),
      useProgram: vi.fn(),
      createBuffer: vi.fn(),
      bindBuffer: vi.fn(),
      bufferData: vi.fn(),
      createTexture: vi.fn(),
      bindTexture: vi.fn(),
      texImage2D: vi.fn(),
      texParameteri: vi.fn(),
      drawArrays: vi.fn(),
      drawElements: vi.fn(),
      viewport: vi.fn(),
      clear: vi.fn(),
      clearColor: vi.fn()
    };
  }
  return null;
});

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((cb) => setTimeout(cb, 16));
global.cancelAnimationFrame = vi.fn();

// Mock performance API
Object.defineProperty(window, 'performance', {
  writable: true,
  value: {
    now: vi.fn(() => Date.now()),
    mark: vi.fn(),
    measure: vi.fn(),
    getEntriesByName: vi.fn(() => [{ duration: 16 }]),
    memory: {
      usedJSHeapSize: 1000000,
      totalJSHeapSize: 2000000,
      jsHeapSizeLimit: 4000000
    }
  }
});

// Mock Web Workers
global.Worker = vi.fn().mockImplementation(() => ({
  postMessage: vi.fn(),
  terminate: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  onerror: null,
  onmessage: null
}));

// Mock URL API
global.URL.createObjectURL = vi.fn(() => 'blob:mock');
global.URL.revokeObjectURL = vi.fn();

// Mock Blob
global.Blob = vi.fn().mockImplementation((content, options) => ({
  size: content ? content.join('').length : 0,
  type: options?.type || '',
  arrayBuffer: vi.fn(() => Promise.resolve(new ArrayBuffer(0))),
  text: vi.fn(() => Promise.resolve('')),
  stream: vi.fn()
}));

// Mock File API
global.File = vi.fn().mockImplementation((content, name, options) => ({
  ...new Blob(content, options),
  name,
  lastModified: Date.now()
}));

// Mock crypto API for testing
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: vi.fn((arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }),
    subtle: {
      generateKey: vi.fn(() => Promise.resolve({})),
      encrypt: vi.fn(() => Promise.resolve(new ArrayBuffer(0))),
      decrypt: vi.fn(() => Promise.resolve(new ArrayBuffer(0)))
    }
  }
});

// Console cleanup
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Cleanup after each test
afterEach(() => {
  vi.clearAllMocks();
});