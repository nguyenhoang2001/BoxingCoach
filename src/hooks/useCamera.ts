import { useState, useEffect, useCallback, useRef } from 'react';
import { CameraService } from '@/services/CameraService';
import { 
  CameraState, 
  CameraDevice, 
  CameraConstraints, 
  VideoSettings, 
  ErrorInfo 
} from '@/types';

interface UseCameraOptions {
  autoInitialize?: boolean;
  defaultConstraints?: CameraConstraints;
  onInitialized?: (settings: VideoSettings) => void;
  onError?: (error: ErrorInfo) => void;
  onDeviceChange?: (devices: CameraDevice[]) => void;
  onPermissionChange?: (state: string) => void;
}

interface UseCameraReturn {
  // State
  state: CameraState;
  isLoading: boolean;
  error: string | null;
  
  // Methods
  initialize: (videoElement: HTMLVideoElement, constraints?: CameraConstraints) => Promise<VideoSettings>;
  switchCamera: (deviceId: string) => Promise<VideoSettings>;
  updateConstraints: (constraints: CameraConstraints) => Promise<VideoSettings>;
  captureFrame: () => Promise<{ imageData: ImageData; dataURL: string; timestamp: number }>;
  stop: () => Promise<void>;
  requestPermission: () => Promise<boolean>;
  enumerateDevices: () => Promise<CameraDevice[]>;
  testCamera: () => Promise<{ success: boolean; results: Record<string, boolean>; errors: string[] }>;
  
  // Getters
  getVideoElement: () => HTMLVideoElement | null;
  getStream: () => MediaStream | null;
  getSettings: () => VideoSettings | null;
  getDevices: () => CameraDevice[];
  getDebugInfo: () => Record<string, any>;
}

export function useCamera(options: UseCameraOptions = {}): UseCameraReturn {
  const {
    autoInitialize = false,
    defaultConstraints = {},
    onInitialized,
    onError,
    onDeviceChange,
    onPermissionChange
  } = options;

  const [state, setState] = useState<CameraState>({
    isInitialized: false,
    isStreaming: false,
    hasPermission: false,
    error: null,
    stream: null,
    devices: [],
    currentDevice: null,
    settings: null
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cameraServiceRef = useRef<CameraService | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);

  // Initialize camera service
  useEffect(() => {
    if (!cameraServiceRef.current) {
      cameraServiceRef.current = new CameraService();
      
      // Set up event listeners
      cameraServiceRef.current.on('initialized', (settings: VideoSettings) => {
        setState(prev => ({ ...prev, ...cameraServiceRef.current!.getState() }));
        setError(null);
        onInitialized?.(settings);
      });

      cameraServiceRef.current.on('error', (errorInfo: ErrorInfo) => {
        setState(prev => ({ ...prev, ...cameraServiceRef.current!.getState() }));
        setError(errorInfo.message);
        onError?.(errorInfo);
      });

      cameraServiceRef.current.on('devicechange', (devices: CameraDevice[]) => {
        setState(prev => ({ ...prev, devices }));
        onDeviceChange?.(devices);
      });

      cameraServiceRef.current.on('permissionchange', (permissionState: string) => {
        setState(prev => ({ ...prev, hasPermission: permissionState === 'granted' }));
        onPermissionChange?.(permissionState);
      });

      cameraServiceRef.current.on('settingsChanged', (settings: VideoSettings) => {
        setState(prev => ({ ...prev, settings }));
      });

      cameraServiceRef.current.on('stopped', () => {
        setState(prev => ({ ...prev, ...cameraServiceRef.current!.getState() }));
      });
    }

    return () => {
      cameraServiceRef.current?.dispose();
    };
  }, [onInitialized, onError, onDeviceChange, onPermissionChange]);

  // Auto-initialize if requested
  useEffect(() => {
    if (autoInitialize && !state.isInitialized && videoElementRef.current) {
      initialize(videoElementRef.current, defaultConstraints);
    }
  }, [autoInitialize, state.isInitialized, defaultConstraints]);

  // Update state when camera service state changes
  useEffect(() => {
    if (cameraServiceRef.current) {
      const currentState = cameraServiceRef.current.getState();
      setState(currentState);
    }
  }, []);

  const initialize = useCallback(async (
    videoElement: HTMLVideoElement, 
    constraints?: CameraConstraints
  ): Promise<VideoSettings> => {
    if (!cameraServiceRef.current) {
      throw new Error('Camera service not initialized');
    }

    setIsLoading(true);
    setError(null);
    videoElementRef.current = videoElement;

    try {
      const settings = await cameraServiceRef.current.initialize(
        videoElement, 
        constraints || defaultConstraints
      );
      
      setState(cameraServiceRef.current.getState());
      return settings;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize camera';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [defaultConstraints]);

  const switchCamera = useCallback(async (deviceId: string): Promise<VideoSettings> => {
    if (!cameraServiceRef.current) {
      throw new Error('Camera service not initialized');
    }

    setIsLoading(true);
    setError(null);

    try {
      const settings = await cameraServiceRef.current.switchCamera(deviceId);
      setState(cameraServiceRef.current.getState());
      return settings;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to switch camera';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateConstraints = useCallback(async (constraints: CameraConstraints): Promise<VideoSettings> => {
    if (!cameraServiceRef.current) {
      throw new Error('Camera service not initialized');
    }

    setIsLoading(true);
    setError(null);

    try {
      const settings = await cameraServiceRef.current.updateConstraints(constraints);
      setState(cameraServiceRef.current.getState());
      return settings;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update constraints';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const captureFrame = useCallback(async () => {
    if (!cameraServiceRef.current) {
      throw new Error('Camera service not initialized');
    }

    try {
      return await cameraServiceRef.current.captureFrame();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to capture frame';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const stop = useCallback(async () => {
    if (!cameraServiceRef.current) {
      return;
    }

    setIsLoading(true);
    
    try {
      await cameraServiceRef.current.stop();
      setState(cameraServiceRef.current.getState());
    } finally {
      setIsLoading(false);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!cameraServiceRef.current) {
      throw new Error('Camera service not initialized');
    }

    setIsLoading(true);
    setError(null);

    try {
      const hasPermission = await cameraServiceRef.current.requestPermission();
      setState(cameraServiceRef.current.getState());
      return hasPermission;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to request permission';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const enumerateDevices = useCallback(async () => {
    if (!cameraServiceRef.current) {
      throw new Error('Camera service not initialized');
    }

    setIsLoading(true);
    setError(null);

    try {
      const devices = await cameraServiceRef.current.enumerateDevices();
      setState(cameraServiceRef.current.getState());
      return devices;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to enumerate devices';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const testCamera = useCallback(async () => {
    if (!cameraServiceRef.current) {
      throw new Error('Camera service not initialized');
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await cameraServiceRef.current.testCamera();
      if (!result.success) {
        setError(result.errors.join(', '));
      }
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Camera test failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getVideoElement = useCallback(() => {
    return cameraServiceRef.current?.getVideoElement() || null;
  }, []);

  const getStream = useCallback(() => {
    return cameraServiceRef.current?.getStream() || null;
  }, []);

  const getSettings = useCallback(() => {
    return cameraServiceRef.current?.getSettings() || null;
  }, []);

  const getDevices = useCallback(() => {
    return cameraServiceRef.current?.getDevices() || [];
  }, []);

  const getDebugInfo = useCallback(() => {
    return cameraServiceRef.current?.getDebugInfo() || {};
  }, []);

  return {
    // State
    state,
    isLoading,
    error,
    
    // Methods
    initialize,
    switchCamera,
    updateConstraints,
    captureFrame,
    stop,
    requestPermission,
    enumerateDevices,
    testCamera,
    
    // Getters
    getVideoElement,
    getStream,
    getSettings,
    getDevices,
    getDebugInfo
  };
}

// Additional hook for camera device management
export function useCameraDevices() {
  const [devices, setDevices] = useState<CameraDevice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enumerateDevices = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const mediaDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = mediaDevices
        .filter(device => device.kind === 'videoinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${device.deviceId.substring(0, 8)}`,
          kind: device.kind as 'videoinput',
          groupId: device.groupId
        }));

      setDevices(videoDevices);
      return videoDevices;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to enumerate devices';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    enumerateDevices();

    const handleDeviceChange = () => {
      enumerateDevices();
    };

    if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
      
      return () => {
        navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
      };
    }
  }, [enumerateDevices]);

  return {
    devices,
    isLoading,
    error,
    refresh: enumerateDevices
  };
}

// Hook for camera permission management
export function useCameraPermission() {
  const [permission, setPermission] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');
  const [isLoading, setIsLoading] = useState(false);

  const checkPermission = useCallback(async () => {
    setIsLoading(true);
    
    try {
      if (navigator.permissions) {
        const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
        setPermission(result.state);
        
        result.addEventListener('change', () => {
          setPermission(result.state);
        });
      } else {
        setPermission('unknown');
      }
    } catch (error) {
      setPermission('unknown');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    setIsLoading(true);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      setPermission('granted');
      return true;
    } catch (error) {
      setPermission('denied');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  return {
    permission,
    isLoading,
    checkPermission,
    requestPermission
  };
}