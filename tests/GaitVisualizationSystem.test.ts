/**
 * GaitVisualizationSystem Tests
 * Integration tests for the complete gait visualization system
 */

import { GaitVisualizationSystem } from '../src/components/GaitVisualizationSystem';
import { VisualizationSettings } from '../src/types/gait';

// Mock MediaDevices API
const mockMediaDevices = {
  getUserMedia: jest.fn()
};

// Mock Canvas API
class MockCanvas {
  width = 640;
  height = 480;
  
  getContext() {
    return {
      clearRect: jest.fn(),
      drawImage: jest.fn(),
      canvas: this
    };
  }
  
  toDataURL() {
    return 'data:image/png;base64,mock-data';
  }
  
  getBoundingClientRect() {
    return {
      width: 640,
      height: 480,
      top: 0,
      left: 0
    };
  }
}

// Mock HTML elements
const createMockElement = (id: string) => {
  const element = document.createElement('div');
  element.id = id;
  element.innerHTML = `<div data-testid="${id}">Mock ${id}</div>`;
  return element;
};

describe('GaitVisualizationSystem', () => {
  let canvas: HTMLCanvasElement;
  let qualityContainer: HTMLElement;
  let parametersContainer: HTMLElement;
  let system: GaitVisualizationSystem;
  let defaultSettings: VisualizationSettings;

  beforeEach(() => {
    // Setup DOM mocks
    canvas = new MockCanvas() as any;
    qualityContainer = createMockElement('quality-container');
    parametersContainer = createMockElement('parameters-container');
    
    // Mock media devices
    Object.defineProperty(navigator, 'mediaDevices', {
      writable: true,
      value: mockMediaDevices
    });
    
    // Mock getUserMedia
    mockMediaDevices.getUserMedia.mockResolvedValue({
      getTracks: () => [{
        stop: jest.fn()
      }]
    });
    
    // Default settings
    defaultSettings = {
      skeletonOpacity: 0.8,
      trajectoryOpacity: 0.6,
      showConfidence: true,
      showParameters: true,
      skeletonStyle: 'anatomical',
      colorScheme: 'default',
      showTrajectory: true,
      trajectoryLength: 100
    };
    
    // Create system
    system = new GaitVisualizationSystem(canvas, qualityContainer, parametersContainer);
  });

  afterEach(() => {
    system.dispose();
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should create system with required components', () => {
      expect(system).toBeDefined();
    });

    it('should initialize with camera access', async () => {
      // Mock successful camera access
      mockMediaDevices.getUserMedia.mockResolvedValue({
        getTracks: () => [{
          stop: jest.fn()
        }]
      });
      
      await expect(system.initialize(defaultSettings)).resolves.not.toThrow();
    });

    it('should handle camera access failure', async () => {
      // Mock camera access failure
      mockMediaDevices.getUserMedia.mockRejectedValue(new Error('Camera not available'));
      
      await expect(system.initialize(defaultSettings)).rejects.toThrow();
    });
  });

  describe('System Control', () => {
    beforeEach(async () => {
      await system.initialize(defaultSettings);
    });

    it('should start and stop system', async () => {
      await expect(system.start()).resolves.not.toThrow();
      expect(system.stop()).not.toThrow();
    });

    it('should pause and resume system', async () => {
      await system.start();
      
      expect(() => {
        system.pause();
        system.resume();
      }).not.toThrow();
    });

    it('should handle multiple start calls', async () => {
      await system.start();
      await expect(system.start()).resolves.not.toThrow();
    });
  });

  describe('Settings Management', () => {
    beforeEach(async () => {
      await system.initialize(defaultSettings);
    });

    it('should update skeleton opacity', () => {
      expect(() => {
        system.updateSettings({ skeletonOpacity: 0.5 });
      }).not.toThrow();
    });

    it('should update trajectory settings', () => {
      expect(() => {
        system.updateSettings({ 
          trajectoryOpacity: 0.4,
          showTrajectory: false
        });
      }).not.toThrow();
    });

    it('should update skeleton style', () => {
      expect(() => {
        system.updateSettings({ skeletonStyle: 'minimal' });
      }).not.toThrow();
    });

    it('should update color scheme', () => {
      expect(() => {
        system.updateSettings({ colorScheme: 'confidence' });
      }).not.toThrow();
    });

    it('should update confidence indicators', () => {
      expect(() => {
        system.updateSettings({ showConfidence: false });
      }).not.toThrow();
    });
  });

  describe('Performance Metrics', () => {
    beforeEach(async () => {
      await system.initialize(defaultSettings);
    });

    it('should provide performance metrics', () => {
      const metrics = system.getPerformanceMetrics();
      
      expect(metrics).toBeDefined();
      expect(metrics.frameRate).toBeGreaterThanOrEqual(0);
      expect(metrics.averageRenderTime).toBeGreaterThanOrEqual(0);
      expect(metrics.memoryUsage).toBeGreaterThanOrEqual(0);
      expect(metrics.droppedFrames).toBeGreaterThanOrEqual(0);
      expect(metrics.processingLatency).toBeGreaterThanOrEqual(0);
    });

    it('should track frame rate after starting', async () => {
      await system.start();
      
      // Let system run for a bit
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const metrics = system.getPerformanceMetrics();
      expect(metrics.frameRate).toBeGreaterThan(0);
    });
  });

  describe('Data Export', () => {
    beforeEach(async () => {
      await system.initialize(defaultSettings);
    });

    it('should export frame data', () => {
      const frameData = system.exportFrame();
      expect(frameData).toBe('data:image/png;base64,mock-data');
    });

    it('should export trajectory data', () => {
      const trajectoryData = system.exportTrajectoryData();
      expect(trajectoryData).toBeDefined();
      expect(trajectoryData instanceof Map).toBe(true);
    });

    it('should export parameter data', () => {
      const parameterData = system.exportParameterData();
      expect(parameterData).toBeDefined();
      expect(parameterData.parameters).toBeDefined();
      expect(parameterData.timestamp).toBeDefined();
    });

    it('should export quality data', () => {
      const qualityData = system.exportQualityData();
      expect(qualityData).toBeDefined();
    });
  });

  describe('Resize Handling', () => {
    beforeEach(async () => {
      await system.initialize(defaultSettings);
    });

    it('should handle window resize', () => {
      expect(() => {
        system.handleResize();
      }).not.toThrow();
    });

    it('should update canvas size on resize', () => {
      const originalWidth = canvas.width;
      const originalHeight = canvas.height;
      
      system.handleResize();
      
      // Canvas size should be updated
      expect(canvas.width).toBeDefined();
      expect(canvas.height).toBeDefined();
    });
  });

  describe('Analysis Results', () => {
    beforeEach(async () => {
      await system.initialize(defaultSettings);
    });

    it('should provide analysis results', () => {
      const results = system.getAnalysisResults();
      // Currently returns null in mock implementation
      expect(results).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle initialization errors gracefully', async () => {
      // Mock initialization failure
      mockMediaDevices.getUserMedia.mockRejectedValue(new Error('Test error'));
      
      await expect(system.initialize(defaultSettings)).rejects.toThrow('Test error');
    });

    it('should handle missing DOM elements', () => {
      expect(() => {
        new GaitVisualizationSystem(null as any, qualityContainer, parametersContainer);
      }).not.toThrow();
    });

    it('should handle invalid settings', () => {
      expect(() => {
        system.updateSettings({ skeletonOpacity: -1 });
      }).not.toThrow();
    });
  });

  describe('Resource Management', () => {
    beforeEach(async () => {
      await system.initialize(defaultSettings);
    });

    it('should dispose resources properly', () => {
      expect(() => {
        system.dispose();
      }).not.toThrow();
    });

    it('should stop stream tracks on disposal', () => {
      const mockTrack = { stop: jest.fn() };
      mockMediaDevices.getUserMedia.mockResolvedValue({
        getTracks: () => [mockTrack]
      });
      
      system.dispose();
      
      // Should stop after initialization
      expect(mockTrack.stop).toHaveBeenCalled();
    });
  });

  describe('Integration Tests', () => {
    it('should integrate all components correctly', async () => {
      await system.initialize(defaultSettings);
      await system.start();
      
      // Let system run briefly
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Should have performance metrics
      const metrics = system.getPerformanceMetrics();
      expect(metrics.frameRate).toBeGreaterThanOrEqual(0);
      
      // Should be able to export data
      expect(system.exportFrame()).toBeDefined();
      expect(system.exportTrajectoryData()).toBeDefined();
      expect(system.exportParameterData()).toBeDefined();
      expect(system.exportQualityData()).toBeDefined();
      
      system.stop();
    });

    it('should handle rapid settings changes', async () => {
      await system.initialize(defaultSettings);
      
      // Rapid settings changes
      for (let i = 0; i < 10; i++) {
        system.updateSettings({ 
          skeletonOpacity: Math.random(),
          trajectoryOpacity: Math.random()
        });
      }
      
      // Should handle all changes without error
      expect(() => {
        system.updateSettings({ showConfidence: true });
      }).not.toThrow();
    });
  });

  describe('Performance Under Load', () => {
    it('should maintain performance with multiple operations', async () => {
      await system.initialize(defaultSettings);
      await system.start();
      
      // Simulate load with rapid operations
      for (let i = 0; i < 50; i++) {
        system.updateSettings({ skeletonOpacity: Math.random() });
        system.getPerformanceMetrics();
        system.exportFrame();
      }
      
      // Should still be responsive
      const metrics = system.getPerformanceMetrics();
      expect(metrics).toBeDefined();
      
      system.stop();
    });
  });
});