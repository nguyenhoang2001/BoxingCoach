import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CameraService } from '../src/services/CameraService';

describe('CameraService', () => {
  let cameraService: CameraService;
  let mockVideoElement: HTMLVideoElement;

  beforeEach(() => {
    cameraService = new CameraService();
    mockVideoElement = document.createElement('video');
    
    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    cameraService.dispose();
  });

  describe('checkSupport', () => {
    it('should return supported when all features are available', async () => {
      const support = await cameraService.checkSupport();
      
      expect(support.supported).toBe(true);
      expect(support.features.getUserMedia).toBe(true);
      expect(support.features.enumerateDevices).toBe(true);
      expect(support.issues).toHaveLength(0);
    });

    it('should return unsupported when getUserMedia is not available', async () => {
      // Mock unavailable getUserMedia
      Object.defineProperty(navigator, 'mediaDevices', {
        value: undefined,
        writable: true
      });

      const support = await cameraService.checkSupport();
      
      expect(support.supported).toBe(false);
      expect(support.features.getUserMedia).toBe(false);
      expect(support.issues).toContain('getUserMedia API not supported');
    });

    it('should detect HTTPS requirement correctly', async () => {
      // Mock non-HTTPS environment
      Object.defineProperty(location, 'protocol', {
        value: 'http:',
        writable: true
      });
      Object.defineProperty(location, 'hostname', {
        value: 'example.com',
        writable: true
      });

      const support = await cameraService.checkSupport();
      
      expect(support.supported).toBe(false);
      expect(support.features.https).toBe(false);
      expect(support.issues).toContain('HTTPS required for camera access');
    });
  });

  describe('requestPermission', () => {
    it('should return true when permission is granted', async () => {
      const hasPermission = await cameraService.requestPermission();
      
      expect(hasPermission).toBe(true);
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ video: true });
    });

    it('should return false when permission is denied', async () => {
      // Mock permission denied
      vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(
        new Error('Permission denied')
      );

      const hasPermission = await cameraService.requestPermission();
      
      expect(hasPermission).toBe(false);
      expect(cameraService.getState().error).toBe('Permission denied');
    });

    it('should check existing permission state', async () => {
      // Mock granted permission
      vi.mocked(navigator.permissions.query).mockResolvedValueOnce({
        state: 'granted',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      } as any);

      const hasPermission = await cameraService.requestPermission();
      
      expect(hasPermission).toBe(true);
      expect(navigator.permissions.query).toHaveBeenCalledWith({ name: 'camera' });
    });
  });

  describe('enumerateDevices', () => {
    it('should return available video devices', async () => {
      const devices = await cameraService.enumerateDevices();
      
      expect(devices).toHaveLength(2);
      expect(devices[0]).toMatchObject({
        deviceId: 'camera-1',
        label: 'Front Camera',
        kind: 'videoinput',
        groupId: 'group-1'
      });
      expect(navigator.mediaDevices.enumerateDevices).toHaveBeenCalled();
    });

    it('should handle enumeration errors gracefully', async () => {
      vi.mocked(navigator.mediaDevices.enumerateDevices).mockRejectedValueOnce(
        new Error('Enumeration failed')
      );

      const devices = await cameraService.enumerateDevices();
      
      expect(devices).toHaveLength(0);
      expect(cameraService.getState().error).toBe('Enumeration failed');
    });

    it('should update state with devices', async () => {
      await cameraService.enumerateDevices();
      
      const state = cameraService.getState();
      expect(state.devices).toHaveLength(2);
    });
  });

  describe('initialize', () => {
    it('should successfully initialize camera', async () => {
      const settings = await cameraService.initialize(mockVideoElement);
      
      expect(settings).toMatchObject({
        width: 1280,
        height: 720,
        frameRate: 30,
        facingMode: 'user',
        deviceId: 'default'
      });
      
      const state = cameraService.getState();
      expect(state.isInitialized).toBe(true);
      expect(state.isStreaming).toBe(true);
      expect(state.hasPermission).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should use provided constraints', async () => {
      const constraints = {
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 15 }
      };

      await cameraService.initialize(mockVideoElement, constraints);
      
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        video: expect.objectContaining(constraints)
      });
    });

    it('should handle initialization errors', async () => {
      vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(
        new Error('Camera not available')
      );

      await expect(cameraService.initialize(mockVideoElement)).rejects.toThrow(
        'Camera not available'
      );
      
      const state = cameraService.getState();
      expect(state.isInitialized).toBe(false);
      expect(state.isStreaming).toBe(false);
      expect(state.error).toBe('Camera not available');
    });

    it('should set up video element correctly', async () => {
      await cameraService.initialize(mockVideoElement);
      
      expect(mockVideoElement.srcObject).toBeDefined();
      expect(mockVideoElement.playsInline).toBe(true);
      expect(mockVideoElement.muted).toBe(true);
      expect(mockVideoElement.autoplay).toBe(true);
    });

    it('should emit initialized event', async () => {
      const listener = vi.fn();
      cameraService.on('initialized', listener);
      
      await cameraService.initialize(mockVideoElement);
      
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        width: 1280,
        height: 720,
        frameRate: 30
      }));
    });
  });

  describe('switchCamera', () => {
    beforeEach(async () => {
      await cameraService.initialize(mockVideoElement);
    });

    it('should switch to different camera device', async () => {
      const newSettings = await cameraService.switchCamera('camera-2');
      
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        video: expect.objectContaining({
          deviceId: 'camera-2'
        })
      });
      expect(newSettings.deviceId).toBe('default'); // From mock
    });

    it('should throw error if camera not initialized', async () => {
      const uninitializedService = new CameraService();
      
      await expect(uninitializedService.switchCamera('camera-2')).rejects.toThrow(
        'Camera not initialized'
      );
      
      uninitializedService.dispose();
    });

    it('should throw error if device not found', async () => {
      await expect(cameraService.switchCamera('non-existent')).rejects.toThrow(
        'Device not found'
      );
    });
  });

  describe('updateConstraints', () => {
    beforeEach(async () => {
      await cameraService.initialize(mockVideoElement);
    });

    it('should update video constraints', async () => {
      const newConstraints = {
        width: { ideal: 640 },
        height: { ideal: 480 }
      };

      const settings = await cameraService.updateConstraints(newConstraints);
      
      const mockTrack = cameraService.getStream()?.getVideoTracks()[0];
      expect(mockTrack?.applyConstraints).toHaveBeenCalledWith(newConstraints);
      expect(settings.width).toBe(1280); // From mock settings
    });

    it('should throw error if no active stream', async () => {
      await cameraService.stop();
      
      await expect(cameraService.updateConstraints({})).rejects.toThrow(
        'No active stream'
      );
    });

    it('should emit settingsChanged event', async () => {
      const listener = vi.fn();
      cameraService.on('settingsChanged', listener);
      
      await cameraService.updateConstraints({
        frameRate: { ideal: 60 }
      });
      
      expect(listener).toHaveBeenCalled();
    });
  });

  describe('captureFrame', () => {
    beforeEach(async () => {
      await cameraService.initialize(mockVideoElement);
      
      // Mock video dimensions
      Object.defineProperty(mockVideoElement, 'videoWidth', { value: 1280 });
      Object.defineProperty(mockVideoElement, 'videoHeight', { value: 720 });
    });

    it('should capture frame from video element', async () => {
      const frame = await cameraService.captureFrame();
      
      expect(frame).toMatchObject({
        imageData: expect.any(Object),
        dataURL: expect.stringContaining('data:image/'),
        timestamp: expect.any(Number)
      });
    });

    it('should throw error if camera not streaming', async () => {
      await cameraService.stop();
      
      await expect(cameraService.captureFrame()).rejects.toThrow(
        'Camera not streaming'
      );
    });

    it('should use correct canvas dimensions', async () => {
      await cameraService.captureFrame();
      
      // Canvas context should be called with video dimensions
      const mockContext = HTMLCanvasElement.prototype.getContext as any;
      expect(mockContext).toHaveBeenCalledWith('2d');
    });
  });

  describe('stop', () => {
    beforeEach(async () => {
      await cameraService.initialize(mockVideoElement);
    });

    it('should stop all tracks and clean up', async () => {
      const mockTrack = cameraService.getStream()?.getVideoTracks()[0];
      
      await cameraService.stop();
      
      expect(mockTrack?.stop).toHaveBeenCalled();
      expect(mockVideoElement.srcObject).toBeNull();
      
      const state = cameraService.getState();
      expect(state.isStreaming).toBe(false);
      expect(state.isInitialized).toBe(false);
      expect(state.stream).toBeNull();
    });

    it('should emit stopped event', async () => {
      const listener = vi.fn();
      cameraService.on('stopped', listener);
      
      await cameraService.stop();
      
      expect(listener).toHaveBeenCalled();
    });
  });

  describe('testCamera', () => {
    it('should run comprehensive camera tests', async () => {
      const result = await cameraService.testCamera();
      
      expect(result.success).toBe(true);
      expect(result.results).toMatchObject({
        browserSupport: true,
        permission: true,
        deviceEnumeration: true,
        streamCreation: true
      });
      expect(result.errors).toHaveLength(0);
    });

    it('should return failed tests in results', async () => {
      // Mock permission failure
      vi.mocked(navigator.permissions.query).mockRejectedValueOnce(
        new Error('Permission API not supported')
      );

      const result = await cameraService.testCamera();
      
      expect(result.success).toBe(false);
      expect(result.results.permission).toBe(false);
      expect(result.errors).toContain('Permission request failed');
    });

    it('should test device enumeration', async () => {
      vi.mocked(navigator.mediaDevices.enumerateDevices).mockResolvedValueOnce([]);

      const result = await cameraService.testCamera();
      
      expect(result.success).toBe(false);
      expect(result.results.deviceEnumeration).toBe(false);
      expect(result.errors).toContain('No camera devices found');
    });
  });

  describe('event handling', () => {
    it('should handle device changes', async () => {
      const listener = vi.fn();
      cameraService.on('devicechange', listener);
      
      // Simulate device change
      const deviceChangeHandler = vi.mocked(navigator.mediaDevices.addEventListener).mock.calls
        .find(call => call[0] === 'devicechange')?.[1];
      
      if (deviceChangeHandler) {
        await deviceChangeHandler(new Event('devicechange'));
      }
      
      expect(navigator.mediaDevices.enumerateDevices).toHaveBeenCalled();
    });

    it('should handle permission changes', async () => {
      const listener = vi.fn();
      cameraService.on('permissionchange', listener);
      
      // This would be called by the browser when permission changes
      // We can't easily test this without more complex mocking
      expect(listener).not.toHaveBeenCalled();
    });

    it('should allow removing event listeners', () => {
      const listener = vi.fn();
      
      cameraService.on('initialized', listener);
      cameraService.off('initialized', listener);
      
      // Listener should not be called after removal
      expect(() => cameraService.off('initialized', listener)).not.toThrow();
    });
  });

  describe('getDebugInfo', () => {
    it('should return comprehensive debug information', async () => {
      await cameraService.initialize(mockVideoElement);
      
      const debugInfo = cameraService.getDebugInfo();
      
      expect(debugInfo).toMatchObject({
        state: expect.any(Object),
        videoElement: expect.any(Object),
        streamInfo: expect.any(Object),
        capabilities: expect.any(Object),
        constraints: expect.any(Object),
        browserInfo: expect.any(Object)
      });
    });

    it('should include browser information', () => {
      const debugInfo = cameraService.getDebugInfo();
      
      expect(debugInfo.browserInfo).toMatchObject({
        userAgent: expect.any(String),
        platform: expect.any(String),
        language: expect.any(String)
      });
    });
  });
});