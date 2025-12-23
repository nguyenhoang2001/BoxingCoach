/**
 * Focused Test for Pose Detection Overlay Issue
 * Simple test to identify why overlay is not showing
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../src/App';

// Mock the services
vi.mock('../src/services/PoseDetectionService');

// Mock TensorFlow
vi.mock('@tensorflow/tfjs', () => ({
  ready: vi.fn().mockResolvedValue(true),
  setBackend: vi.fn().mockResolvedValue(true),
  getBackend: vi.fn().mockReturnValue('webgl'),
  ENV: {
    set: vi.fn()
  }
}));

vi.mock('@tensorflow-models/pose-detection', () => ({
  createDetector: vi.fn().mockResolvedValue({
    estimatePoses: vi.fn().mockResolvedValue([]),
    dispose: vi.fn()
  }),
  SupportedModels: {
    MoveNet: 'MoveNet'
  },
  movenet: {
    modelType: {
      SINGLEPOSE_LIGHTNING: 'singlepose_lightning',
      SINGLEPOSE_THUNDER: 'singlepose_thunder'
    }
  }
}));

// Mock navigator.mediaDevices
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: vi.fn().mockResolvedValue({
      getTracks: vi.fn().mockReturnValue([{ stop: vi.fn() }])
    })
  }
});

// Mock performance
Object.defineProperty(window, 'performance', {
  writable: true,
  value: {
    now: vi.fn().mockReturnValue(Date.now()),
    memory: {
      usedJSHeapSize: 50 * 1024 * 1024
    }
  }
});

describe('Pose Detection Overlay Issues', () => {
  let mockPoseDetectionService: any;
  let mockCanvas2DContext: any;

  beforeEach(() => {
    // Mock canvas context
    mockCanvas2DContext = {
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      drawImage: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      arc: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      fillText: vi.fn(),
      strokeText: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      scale: vi.fn(),
      setTransform: vi.fn(),
      getImageData: vi.fn().mockReturnValue({
        data: new Uint8ClampedArray(640 * 480 * 4)
      }),
      strokeStyle: '#000000',
      fillStyle: '#000000',
      lineWidth: 1,
      font: '10px sans-serif'
    };

    // Mock HTMLCanvasElement.getContext
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockCanvas2DContext);

    // Mock video element properties
    Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', {
      value: 640,
      writable: true,
      configurable: true
    });
    Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', {
      value: 480,
      writable: true,
      configurable: true
    });

    // Mock PoseDetectionService
    mockPoseDetectionService = {
      initialize: vi.fn().mockResolvedValue(undefined),
      detectPoses: vi.fn().mockResolvedValue([]),
      getStats: vi.fn().mockReturnValue({
        totalPoses: 0,
        averageConfidence: 0,
        currentFPS: 30,
        avgProcessingTime: 16.67,
        droppedFrames: 0,
        memoryUsage: 50.2,
        modelLoadTime: 1500
      }),
      dispose: vi.fn(),
      isReady: vi.fn().mockReturnValue(true)
    };

    const { PoseDetectionService } = require('../src/services/PoseDetectionService');
    vi.mocked(PoseDetectionService).mockImplementation(() => mockPoseDetectionService);
  });

  it('should have canvas and video elements present', async () => {
    render(<App />);
    
    await waitFor(() => {
      const video = document.querySelector('video');
      const canvas = document.querySelector('canvas');
      
      expect(video).toBeInTheDocument();
      expect(canvas).toBeInTheDocument();
    });
  });

  it('should initialize pose detection service', async () => {
    render(<App />);
    
    await waitFor(() => {
      expect(mockPoseDetectionService.initialize).toHaveBeenCalled();
    }, { timeout: 5000 });
  });

  it('should show start button when initialized', async () => {
    render(<App />);
    
    await waitFor(() => {
      const startButton = screen.getByText(/start/i);
      expect(startButton).toBeInTheDocument();
      // Should eventually become enabled when camera initializes
    }, { timeout: 5000 });
  });

  it('should detect when no poses are found and draw message', async () => {
    // Make sure detectPoses returns empty array
    mockPoseDetectionService.detectPoses.mockResolvedValue([]);

    render(<App />);
    
    // Wait for initialization
    await waitFor(() => {
      const startButton = screen.getByText(/start/i);
      expect(startButton).toBeInTheDocument();
    });

    // Check if start button becomes enabled (this indicates camera is ready)
    await waitFor(() => {
      const startButton = screen.getByText(/start/i);
      if (!startButton.hasAttribute('disabled')) {
        fireEvent.click(startButton);
      }
    }, { timeout: 10000 });

    // Wait a bit for the animation loop to run
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check if detectPoses was called
    expect(mockPoseDetectionService.detectPoses).toHaveBeenCalled();
    
    // Check if canvas drawing methods were called
    expect(mockCanvas2DContext.clearRect).toHaveBeenCalled();
    expect(mockCanvas2DContext.fillText).toHaveBeenCalledWith(
      'No person detected',
      expect.any(Number),
      expect.any(Number)
    );
  });

  it('should draw keypoints when pose is detected', async () => {
    // Mock a detected pose
    const mockPose = {
      keypoints: [
        { x: 320, y: 100, score: 0.9, name: 'nose' },
        { x: 300, y: 150, score: 0.8, name: 'left_shoulder' },
        { x: 340, y: 150, score: 0.8, name: 'right_shoulder' }
      ],
      confidence: 0.85,
      timestamp: Date.now(),
      id: 'pose_1',
      boundingBox: { x: 280, y: 80, width: 80, height: 100 }
    };

    mockPoseDetectionService.detectPoses.mockResolvedValue([mockPose]);

    render(<App />);
    
    // Wait for initialization and start
    await waitFor(() => {
      const startButton = screen.getByText(/start/i);
      if (!startButton.hasAttribute('disabled')) {
        fireEvent.click(startButton);
      }
    }, { timeout: 10000 });

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check if pose was processed
    expect(mockPoseDetectionService.detectPoses).toHaveBeenCalled();
    
    // Check if keypoints were drawn
    expect(mockCanvas2DContext.arc).toHaveBeenCalledWith(
      320, 100, expect.any(Number), 0, 2 * Math.PI
    );
    expect(mockCanvas2DContext.fill).toHaveBeenCalled();
    
    // Check if confidence info was drawn
    expect(mockCanvas2DContext.fillText).toHaveBeenCalledWith(
      expect.stringContaining('85.0%'),
      expect.any(Number),
      expect.any(Number)
    );
  });

  it('should identify the issue with TensorFlow model loading', async () => {
    // Test if TensorFlow.js is properly mocked and working
    const tf = await import('@tensorflow/tfjs');
    expect(tf.ready).toBeDefined();
    
    const poseDetection = await import('@tensorflow-models/pose-detection');
    expect(poseDetection.createDetector).toBeDefined();
    
    // The issue might be that the real TensorFlow model isn't loading properly
    // In the actual app, if createDetector fails, pose detection won't work
  });
});

describe('Real Implementation Issues', () => {
  it('should identify why pose detection might be failing in real app', () => {
    // Potential issues:
    // 1. TensorFlow.js model URL is not accessible (CSP or network issue)
    // 2. Model loading timeout
    // 3. WebGL backend initialization failure
    // 4. Camera stream not providing proper video data
    // 5. Canvas context issues
    
    console.log('Potential overlay issues:');
    console.log('1. TensorFlow model not loading (check network tab)');
    console.log('2. WebGL backend initialization failure');
    console.log('3. Camera stream not ready when pose detection runs');
    console.log('4. Canvas drawing issues (check console for errors)');
    console.log('5. Animation frame not running properly');
  });
});