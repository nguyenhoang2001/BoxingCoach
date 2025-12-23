import { CameraService } from '@/services/CameraService';
import { render, waitFor } from '@testing-library/react';

describe('CameraService', () => {
  let cameraService: CameraService;
  let mockGetUserMedia: jest.MockedFunction<typeof navigator.mediaDevices.getUserMedia>;
  let mockEnumerateDevices: jest.MockedFunction<typeof navigator.mediaDevices.enumerateDevices>;

  beforeEach(() => {
    cameraService = new CameraService();
    mockGetUserMedia = navigator.mediaDevices.getUserMedia as jest.MockedFunction<typeof navigator.mediaDevices.getUserMedia>;
    mockEnumerateDevices = navigator.mediaDevices.enumerateDevices as jest.MockedFunction<typeof navigator.mediaDevices.enumerateDevices>;
    
    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    cameraService.stopCamera();
  });

  describe('initializeCamera', () => {
    it('should initialize camera with default constraints', async () => {
      const mockStream = {
        getTracks: jest.fn().mockReturnValue([
          { stop: jest.fn(), kind: 'video', enabled: true }
        ]),
        getVideoTracks: jest.fn().mockReturnValue([
          { stop: jest.fn(), getSettings: jest.fn().mockReturnValue({ width: 1280, height: 720, frameRate: 30 }) }
        ])
      };
      
      mockGetUserMedia.mockResolvedValue(mockStream as any);
      
      const video = await cameraService.initializeCamera();
      
      expect(mockGetUserMedia).toHaveBeenCalledWith({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        }
      });
      
      expect(video).toBeInstanceOf(HTMLVideoElement);
      expect(video.srcObject).toBe(mockStream);
      expect(video.autoplay).toBe(true);
      expect(video.muted).toBe(true);
    });

    it('should initialize camera with custom constraints', async () => {
      const customConstraints = {
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 15 }
        }
      };
      
      const mockStream = {
        getTracks: jest.fn().mockReturnValue([{ stop: jest.fn(), kind: 'video' }]),
        getVideoTracks: jest.fn().mockReturnValue([{ stop: jest.fn() }])
      };
      
      mockGetUserMedia.mockResolvedValue(mockStream as any);
      
      const video = await cameraService.initializeCamera(customConstraints);
      
      expect(mockGetUserMedia).toHaveBeenCalledWith(customConstraints);
      expect(video).toBeInstanceOf(HTMLVideoElement);
    });

    it('should handle camera access denied error', async () => {
      const error = new Error('Permission denied');
      mockGetUserMedia.mockRejectedValue(error);
      
      await expect(cameraService.initializeCamera()).rejects.toThrow(
        'Camera initialization failed: Error: Permission denied'
      );
    });

    it('should handle NotFoundError', async () => {
      const error = new Error('Requested device not found');
      error.name = 'NotFoundError';
      mockGetUserMedia.mockRejectedValue(error);
      
      await expect(cameraService.initializeCamera()).rejects.toThrow(
        'Camera initialization failed: Error: Requested device not found'
      );
    });

    it('should handle NotAllowedError', async () => {
      const error = new Error('Permission denied by user');
      error.name = 'NotAllowedError';
      mockGetUserMedia.mockRejectedValue(error);
      
      await expect(cameraService.initializeCamera()).rejects.toThrow(
        'Camera initialization failed: Error: Permission denied by user'
      );
    });

    it('should handle video metadata loading', async () => {
      const mockStream = {
        getTracks: jest.fn().mockReturnValue([{ stop: jest.fn() }]),
        getVideoTracks: jest.fn().mockReturnValue([{ stop: jest.fn() }])
      };
      
      mockGetUserMedia.mockResolvedValue(mockStream as any);
      
      const videoPromise = cameraService.initializeCamera();
      
      // Simulate video metadata loaded
      setTimeout(() => {
        const video = document.createElement('video') as any;
        if (video.onloadedmetadata) {
          video.onloadedmetadata();
        }
      }, 50);
      
      const video = await videoPromise;
      expect(video).toBeInstanceOf(HTMLVideoElement);
    });

    it('should handle video loading error', async () => {
      const mockStream = {
        getTracks: jest.fn().mockReturnValue([{ stop: jest.fn() }]),
        getVideoTracks: jest.fn().mockReturnValue([{ stop: jest.fn() }])
      };
      
      mockGetUserMedia.mockResolvedValue(mockStream as any);
      
      // Mock video error
      const originalCreateElement = document.createElement;
      document.createElement = jest.fn().mockImplementation((tagName: string) => {
        if (tagName === 'video') {
          const video = new (HTMLVideoElement as any)();
          setTimeout(() => {
            if (video.onerror) {
              video.onerror(new Error('Video loading failed'));
            }
          }, 50);
          return video;
        }
        return originalCreateElement.call(document, tagName);
      });
      
      await expect(cameraService.initializeCamera()).rejects.toThrow();
      
      // Restore original createElement
      document.createElement = originalCreateElement;
    });
  });

  describe('getAvailableDevices', () => {
    it('should return list of video input devices', async () => {
      const mockDevices = [
        { deviceId: 'camera1', kind: 'videoinput', label: 'Camera 1', groupId: 'group1' },
        { deviceId: 'camera2', kind: 'videoinput', label: 'Camera 2', groupId: 'group2' },
        { deviceId: 'mic1', kind: 'audioinput', label: 'Microphone 1', groupId: 'group3' }
      ];
      
      mockEnumerateDevices.mockResolvedValue(mockDevices as any);
      
      const devices = await cameraService.getAvailableDevices();
      
      expect(devices).toHaveLength(2);
      expect(devices[0]).toEqual(mockDevices[0]);
      expect(devices[1]).toEqual(mockDevices[1]);
      expect(devices.every(device => device.kind === 'videoinput')).toBe(true);
    });

    it('should return empty array when no video devices available', async () => {
      const mockDevices = [
        { deviceId: 'mic1', kind: 'audioinput', label: 'Microphone 1', groupId: 'group1' },
        { deviceId: 'speaker1', kind: 'audiooutput', label: 'Speaker 1', groupId: 'group2' }
      ];
      
      mockEnumerateDevices.mockResolvedValue(mockDevices as any);
      
      const devices = await cameraService.getAvailableDevices();
      
      expect(devices).toHaveLength(0);
    });

    it('should handle enumerateDevices error', async () => {
      const error = new Error('Device enumeration failed');
      mockEnumerateDevices.mockRejectedValue(error);
      
      await expect(cameraService.getAvailableDevices()).rejects.toThrow(
        'Device enumeration failed'
      );
    });
  });

  describe('stopCamera', () => {
    it('should stop all tracks and clean up resources', async () => {
      const mockTrack = { stop: jest.fn(), kind: 'video' };
      const mockStream = {
        getTracks: jest.fn().mockReturnValue([mockTrack]),
        getVideoTracks: jest.fn().mockReturnValue([mockTrack])
      };
      
      mockGetUserMedia.mockResolvedValue(mockStream as any);
      
      const video = await cameraService.initializeCamera();
      
      expect(video.srcObject).toBe(mockStream);
      
      cameraService.stopCamera();
      
      expect(mockTrack.stop).toHaveBeenCalled();
      expect(video.srcObject).toBe(null);
    });

    it('should handle stopping camera when not initialized', () => {
      expect(() => cameraService.stopCamera()).not.toThrow();
    });

    it('should handle multiple stop calls', async () => {
      const mockTrack = { stop: jest.fn() };
      const mockStream = {
        getTracks: jest.fn().mockReturnValue([mockTrack]),
        getVideoTracks: jest.fn().mockReturnValue([mockTrack])
      };
      
      mockGetUserMedia.mockResolvedValue(mockStream as any);
      
      await cameraService.initializeCamera();
      
      cameraService.stopCamera();
      cameraService.stopCamera();
      
      expect(mockTrack.stop).toHaveBeenCalledTimes(1);
    });
  });

  describe('camera switching', () => {
    it('should switch between different cameras', async () => {
      const mockStream1 = {
        getTracks: jest.fn().mockReturnValue([{ stop: jest.fn() }]),
        getVideoTracks: jest.fn().mockReturnValue([{ stop: jest.fn() }])
      };
      
      const mockStream2 = {
        getTracks: jest.fn().mockReturnValue([{ stop: jest.fn() }]),
        getVideoTracks: jest.fn().mockReturnValue([{ stop: jest.fn() }])
      };
      
      mockGetUserMedia
        .mockResolvedValueOnce(mockStream1 as any)
        .mockResolvedValueOnce(mockStream2 as any);
      
      // Initialize first camera
      const video1 = await cameraService.initializeCamera({
        video: { deviceId: 'camera1' }
      });
      
      expect(video1.srcObject).toBe(mockStream1);
      
      // Switch to second camera
      const video2 = await cameraService.initializeCamera({
        video: { deviceId: 'camera2' }
      });
      
      expect(video2.srcObject).toBe(mockStream2);
      expect(mockStream1.getTracks()[0].stop).toHaveBeenCalled();
    });
  });

  describe('camera constraints validation', () => {
    it('should handle invalid width constraints', async () => {
      const invalidConstraints = {
        video: {
          width: { ideal: -1 },
          height: { ideal: 720 }
        }
      };
      
      const error = new Error('Invalid width constraint');
      mockGetUserMedia.mockRejectedValue(error);
      
      await expect(cameraService.initializeCamera(invalidConstraints)).rejects.toThrow();
    });

    it('should handle invalid height constraints', async () => {
      const invalidConstraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: -1 }
        }
      };
      
      const error = new Error('Invalid height constraint');
      mockGetUserMedia.mockRejectedValue(error);
      
      await expect(cameraService.initializeCamera(invalidConstraints)).rejects.toThrow();
    });

    it('should handle invalid frame rate constraints', async () => {
      const invalidConstraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: -1 }
        }
      };
      
      const error = new Error('Invalid frame rate constraint');
      mockGetUserMedia.mockRejectedValue(error);
      
      await expect(cameraService.initializeCamera(invalidConstraints)).rejects.toThrow();
    });
  });

  describe('camera capabilities', () => {
    it('should handle cameras with different capabilities', async () => {
      const mockStream = {
        getTracks: jest.fn().mockReturnValue([
          {
            stop: jest.fn(),
            kind: 'video',
            getCapabilities: jest.fn().mockReturnValue({
              width: { min: 320, max: 1920 },
              height: { min: 240, max: 1080 },
              frameRate: { min: 5, max: 60 }
            })
          }
        ]),
        getVideoTracks: jest.fn().mockReturnValue([
          {
            stop: jest.fn(),
            getCapabilities: jest.fn().mockReturnValue({
              width: { min: 320, max: 1920 },
              height: { min: 240, max: 1080 },
              frameRate: { min: 5, max: 60 }
            })
          }
        ])
      };
      
      mockGetUserMedia.mockResolvedValue(mockStream as any);
      
      const video = await cameraService.initializeCamera();
      
      expect(video).toBeInstanceOf(HTMLVideoElement);
      expect(video.srcObject).toBe(mockStream);
    });
  });

  describe('error recovery', () => {
    it('should handle temporary camera access failures', async () => {
      const error = new Error('Temporary failure');
      mockGetUserMedia
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({
          getTracks: jest.fn().mockReturnValue([{ stop: jest.fn() }]),
          getVideoTracks: jest.fn().mockReturnValue([{ stop: jest.fn() }])
        } as any);
      
      // First call should fail
      await expect(cameraService.initializeCamera()).rejects.toThrow();
      
      // Second call should succeed
      const video = await cameraService.initializeCamera();
      expect(video).toBeInstanceOf(HTMLVideoElement);
    });
  });

  describe('memory management', () => {
    it('should properly clean up resources on multiple initializations', async () => {
      const mockTracks = [
        { stop: jest.fn() },
        { stop: jest.fn() },
        { stop: jest.fn() }
      ];
      
      const mockStreams = mockTracks.map(track => ({
        getTracks: jest.fn().mockReturnValue([track]),
        getVideoTracks: jest.fn().mockReturnValue([track])
      }));
      
      mockGetUserMedia
        .mockResolvedValueOnce(mockStreams[0] as any)
        .mockResolvedValueOnce(mockStreams[1] as any)
        .mockResolvedValueOnce(mockStreams[2] as any);
      
      // Initialize multiple times
      await cameraService.initializeCamera();
      await cameraService.initializeCamera();
      await cameraService.initializeCamera();
      
      // Stop camera
      cameraService.stopCamera();
      
      // Check that all previous tracks were stopped
      expect(mockTracks[0].stop).toHaveBeenCalled();
      expect(mockTracks[1].stop).toHaveBeenCalled();
      expect(mockTracks[2].stop).toHaveBeenCalled();
    });
  });
});