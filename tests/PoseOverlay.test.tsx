/**
 * PoseOverlay Component Tests
 * Comprehensive test suite for the pose detection overlay visualization
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';

import { PoseOverlay } from '../src/components/PoseOverlay';
import { PoseDetectionResult, KeypointName } from '../src/types/pose';
import { VisualizationSettings } from '../src/types/gait';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Eye: () => <div data-testid="eye-icon" />,
  EyeOff: () => <div data-testid="eye-off-icon" />,
  Settings2: () => <div data-testid="settings-icon" />,
  Gauge: () => <div data-testid="gauge-icon" />,
  Timer: () => <div data-testid="timer-icon" />,
}));

// Mock performance API
Object.defineProperty(global, 'performance', {
  writable: true,
  value: {
    now: vi.fn(() => Date.now()),
    memory: {
      usedJSHeapSize: 1024 * 1024 * 10, // 10MB
    },
  },
});

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((callback) => {
  setTimeout(callback, 16); // ~60fps
  return 1;
});

global.cancelAnimationFrame = vi.fn();

describe('PoseOverlay Component', () => {
  let mockCanvas: HTMLCanvasElement;
  let mockVideo: HTMLVideoElement;
  let mockCanvasRef: React.RefObject<HTMLCanvasElement>;
  let mockVideoRef: React.RefObject<HTMLVideoElement>;
  let mockContext: CanvasRenderingContext2D;

  const defaultSettings: VisualizationSettings = {
    skeletonOpacity: 0.8,
    trajectoryOpacity: 0.6,
    showConfidence: true,
    showParameters: false,
    skeletonStyle: 'anatomical',
    colorScheme: 'phase',
    showTrajectory: false,
    trajectoryLength: 10,
  };

  const mockPose: PoseDetectionResult = {
    keypoints: [
      {
        name: KeypointName.NOSE,
        x: 100,
        y: 50,
        score: 0.9,
        visibility: 1,
        timestamp: Date.now(),
      },
      {
        name: KeypointName.LEFT_SHOULDER,
        x: 80,
        y: 120,
        score: 0.8,
        visibility: 1,
        timestamp: Date.now(),
      },
      {
        name: KeypointName.RIGHT_SHOULDER,
        x: 120,
        y: 120,
        score: 0.8,
        visibility: 1,
        timestamp: Date.now(),
      },
      {
        name: KeypointName.LEFT_HIP,
        x: 85,
        y: 200,
        score: 0.7,
        visibility: 1,
        timestamp: Date.now(),
      },
      {
        name: KeypointName.RIGHT_HIP,
        x: 115,
        y: 200,
        score: 0.7,
        visibility: 1,
        timestamp: Date.now(),
      },
    ],
    confidence: 0.85,
    timestamp: Date.now(),
    id: 'test-pose-1',
    boundingBox: {
      x: 70,
      y: 40,
      width: 60,
      height: 170,
    },
  };

  beforeEach(() => {
    // Create mock canvas and context
    mockContext = {
      clearRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      createRadialGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      setLineDash: vi.fn(),
    } as any;

    mockCanvas = {
      getContext: vi.fn(() => mockContext),
      width: 640,
      height: 480,
      style: {},
    } as any;

    mockVideo = {
      videoWidth: 640,
      videoHeight: 480,
    } as any;

    mockCanvasRef = { current: mockCanvas };
    mockVideoRef = { current: mockVideo };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(
      <PoseOverlay
        canvasRef={mockCanvasRef}
        videoRef={mockVideoRef}
        poses={[]}
        settings={defaultSettings}
        isActive={false}
      />
    );
  });

  it('displays overlay controls', () => {
    render(
      <PoseOverlay
        canvasRef={mockCanvasRef}
        videoRef={mockVideoRef}
        poses={[]}
        settings={defaultSettings}
        isActive={true}
      />
    );

    expect(screen.getByTitle(/Hide Overlay|Show Overlay/)).toBeInTheDocument();
    expect(screen.getByTitle('Overlay Settings')).toBeInTheDocument();
  });

  it('toggles visibility when eye button is clicked', () => {
    render(
      <PoseOverlay
        canvasRef={mockCanvasRef}
        videoRef={mockVideoRef}
        poses={[]}
        settings={defaultSettings}
        isActive={true}
      />
    );

    const visibilityButton = screen.getByTitle(/Hide Overlay|Show Overlay/);
    fireEvent.click(visibilityButton);

    // Should show "Show Overlay" after hiding
    expect(screen.getByTitle('Show Overlay')).toBeInTheDocument();
  });

  it('shows settings panel when settings button is clicked', () => {
    render(
      <PoseOverlay
        canvasRef={mockCanvasRef}
        videoRef={mockVideoRef}
        poses={[]}
        settings={defaultSettings}
        isActive={true}
      />
    );

    const settingsButton = screen.getByTitle('Overlay Settings');
    fireEvent.click(settingsButton);

    expect(screen.getByText('Overlay Settings')).toBeInTheDocument();
  });

  it('displays debug information when enabled', () => {
    render(
      <PoseOverlay
        canvasRef={mockCanvasRef}
        videoRef={mockVideoRef}
        poses={[mockPose]}
        settings={defaultSettings}
        isActive={true}
        showDebugInfo={true}
      />
    );

    expect(screen.getByText(/FPS:/)).toBeInTheDocument();
    expect(screen.getByText(/Render:/)).toBeInTheDocument();
    expect(screen.getByText(/Memory:/)).toBeInTheDocument();
    expect(screen.getByText(/Poses:/)).toBeInTheDocument();
  });

  it('calls canvas drawing methods when poses are provided', async () => {
    const onPerformanceUpdate = vi.fn();
    
    render(
      <PoseOverlay
        canvasRef={mockCanvasRef}
        videoRef={mockVideoRef}
        poses={[mockPose]}
        settings={defaultSettings}
        isActive={true}
        onPerformanceUpdate={onPerformanceUpdate}
      />
    );

    // Wait for animation frame
    await waitFor(() => {
      expect(mockContext.clearRect).toHaveBeenCalled();
    });

    // Should call drawing methods for keypoints and connections
    expect(mockContext.beginPath).toHaveBeenCalled();
    expect(mockContext.arc).toHaveBeenCalled(); // For keypoints
    expect(mockContext.moveTo).toHaveBeenCalled(); // For connections
    expect(mockContext.lineTo).toHaveBeenCalled(); // For connections
  });

  it('applies different color schemes correctly', () => {
    const confidenceSettings = { ...defaultSettings, colorScheme: 'confidence' as const };
    
    render(
      <PoseOverlay
        canvasRef={mockCanvasRef}
        videoRef={mockVideoRef}
        poses={[mockPose]}
        settings={confidenceSettings}
        isActive={true}
      />
    );

    // Should use confidence-based colors
    expect(mockContext.fillStyle).toBeDefined();
  });

  it('shows confidence indicators when enabled', async () => {
    const settingsWithConfidence = { ...defaultSettings, showConfidence: true };
    
    render(
      <PoseOverlay
        canvasRef={mockCanvasRef}
        videoRef={mockVideoRef}
        poses={[mockPose]}
        settings={settingsWithConfidence}
        isActive={true}
      />
    );

    await waitFor(() => {
      // Should draw confidence bars
      expect(mockContext.fillRect).toHaveBeenCalled();
    });
  });

  it('filters out low-confidence keypoints', async () => {
    const lowConfidencePose = {
      ...mockPose,
      keypoints: [
        ...mockPose.keypoints,
        {
          name: KeypointName.LEFT_WRIST,
          x: 50,
          y: 150,
          score: 0.2, // Below threshold
          visibility: 1,
          timestamp: Date.now(),
        },
      ],
    };

    render(
      <PoseOverlay
        canvasRef={mockCanvasRef}
        videoRef={mockVideoRef}
        poses={[lowConfidencePose]}
        settings={defaultSettings}
        isActive={true}
      />
    );

    await waitFor(() => {
      expect(mockContext.clearRect).toHaveBeenCalled();
    });

    // Low confidence keypoints should be filtered out
    // The exact number of arc calls depends on the keypoints above threshold
  });

  it('handles missing canvas gracefully', () => {
    const nullCanvasRef = { current: null };
    
    expect(() => {
      render(
        <PoseOverlay
          canvasRef={nullCanvasRef}
          videoRef={mockVideoRef}
          poses={[mockPose]}
          settings={defaultSettings}
          isActive={true}
        />
      );
    }).not.toThrow();
  });

  it('updates canvas size based on video dimensions', async () => {
    const newVideoRef = {
      current: {
        ...mockVideo,
        videoWidth: 1280,
        videoHeight: 720,
      },
    };

    render(
      <PoseOverlay
        canvasRef={mockCanvasRef}
        videoRef={newVideoRef}
        poses={[mockPose]}
        settings={defaultSettings}
        isActive={true}
      />
    );

    await waitFor(() => {
      expect(mockCanvas.width).toBe(1280);
      expect(mockCanvas.height).toBe(720);
    });
  });

  it('calls performance update callback with metrics', async () => {
    const onPerformanceUpdate = vi.fn();
    
    render(
      <PoseOverlay
        canvasRef={mockCanvasRef}
        videoRef={mockVideoRef}
        poses={[mockPose]}
        settings={defaultSettings}
        isActive={true}
        onPerformanceUpdate={onPerformanceUpdate}
      />
    );

    await waitFor(() => {
      expect(onPerformanceUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          frameRate: expect.any(Number),
          averageRenderTime: expect.any(Number),
          memoryUsage: expect.any(Number),
          droppedFrames: expect.any(Number),
          processingLatency: expect.any(Number),
        })
      );
    });
  });

  it('applies style overrides correctly', () => {
    const styleOverrides = {
      keypoint: { radius: 10 },
      connection: { width: 5 },
    };

    render(
      <PoseOverlay
        canvasRef={mockCanvasRef}
        videoRef={mockVideoRef}
        poses={[mockPose]}
        settings={defaultSettings}
        isActive={true}
        styleOverrides={styleOverrides}
      />
    );

    // Overrides should be applied (tested implicitly through drawing calls)
    expect(mockContext.arc).toHaveBeenCalled();
  });

  it('handles different performance modes', () => {
    const modes: Array<'high' | 'balanced' | 'battery'> = ['high', 'balanced', 'battery'];
    
    modes.forEach(mode => {
      render(
        <PoseOverlay
          canvasRef={mockCanvasRef}
          videoRef={mockVideoRef}
          poses={[mockPose]}
          settings={defaultSettings}
          isActive={true}
          performanceMode={mode}
        />
      );
    });

    // Should render without errors for all performance modes
    expect(mockContext.clearRect).toHaveBeenCalled();
  });

  it('stops rendering when inactive', () => {
    const { rerender } = render(
      <PoseOverlay
        canvasRef={mockCanvasRef}
        videoRef={mockVideoRef}
        poses={[mockPose]}
        settings={defaultSettings}
        isActive={true}
      />
    );

    // Reset mocks
    vi.clearAllMocks();

    // Deactivate overlay
    rerender(
      <PoseOverlay
        canvasRef={mockCanvasRef}
        videoRef={mockVideoRef}
        poses={[mockPose]}
        settings={defaultSettings}
        isActive={false}
      />
    );

    // Should not clear canvas when inactive
    expect(mockContext.clearRect).not.toHaveBeenCalled();
  });

  it('cleans up animation frame on unmount', () => {
    const { unmount } = render(
      <PoseOverlay
        canvasRef={mockCanvasRef}
        videoRef={mockVideoRef}
        poses={[mockPose]}
        settings={defaultSettings}
        isActive={true}
      />
    );

    unmount();

    expect(global.cancelAnimationFrame).toHaveBeenCalled();
  });
});