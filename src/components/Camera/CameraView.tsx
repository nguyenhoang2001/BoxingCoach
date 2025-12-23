import React, { forwardRef, useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, 
  CameraOff, 
  Settings, 
  Download, 
  RotateCcw, 
  Maximize, 
  Minimize,
  AlertCircle,
  Loader2,
  Check,
  X
} from 'lucide-react';

import { UseCameraReturn } from '@/hooks/useCamera';
import { CameraConstraints, CameraDevice, VideoSettings } from '@/types';
import { cn } from '@/utils/cn';

interface CameraViewProps {
  camera: UseCameraReturn;
  analysisActive: boolean;
  onAnalysisToggle: (active: boolean) => void;
  className?: string;
}

interface CameraControlsProps {
  camera: UseCameraReturn;
  onCaptureFrame: () => void;
  onToggleSettings: () => void;
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
  disabled?: boolean;
}

const CameraControls: React.FC<CameraControlsProps> = ({
  camera,
  onCaptureFrame,
  onToggleSettings,
  onToggleFullscreen,
  isFullscreen,
  disabled = false
}) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const devices = camera.getDevices();
  const settings = camera.getSettings();

  const handleCapture = async () => {
    if (disabled || isCapturing) return;

    setIsCapturing(true);
    try {
      await onCaptureFrame();
    } finally {
      setIsCapturing(false);
    }
  };

  const handleSwitchCamera = async () => {
    if (disabled || devices.length <= 1) return;

    try {
      const currentDeviceId = settings?.deviceId;
      const currentIndex = devices.findIndex(d => d.deviceId === currentDeviceId);
      const nextIndex = (currentIndex + 1) % devices.length;
      const nextDevice = devices[nextIndex];
      
      await camera.switchCamera(nextDevice.deviceId);
    } catch (error) {
      console.error('Failed to switch camera:', error);
    }
  };

  return (
    <div className="flex items-center justify-center space-x-4 p-4 bg-black bg-opacity-50 rounded-lg">
      <button
        onClick={handleCapture}
        disabled={disabled || isCapturing}
        className={cn(
          "p-3 rounded-full transition-all duration-200",
          disabled || isCapturing
            ? "bg-gray-500 cursor-not-allowed"
            : "bg-white hover:bg-gray-100 active:scale-95"
        )}
        title="Capture Frame"
      >
        {isCapturing ? (
          <Loader2 className="w-6 h-6 animate-spin text-gray-800" />
        ) : (
          <Camera className="w-6 h-6 text-gray-800" />
        )}
      </button>

      {devices.length > 1 && (
        <button
          onClick={handleSwitchCamera}
          disabled={disabled}
          className={cn(
            "p-3 rounded-full transition-all duration-200",
            disabled
              ? "bg-gray-500 cursor-not-allowed"
              : "bg-white hover:bg-gray-100 active:scale-95"
          )}
          title="Switch Camera"
        >
          <RotateCcw className="w-6 h-6 text-gray-800" />
        </button>
      )}

      <button
        onClick={onToggleSettings}
        disabled={disabled}
        className={cn(
          "p-3 rounded-full transition-all duration-200",
          disabled
            ? "bg-gray-500 cursor-not-allowed"
            : "bg-white hover:bg-gray-100 active:scale-95"
        )}
        title="Camera Settings"
      >
        <Settings className="w-6 h-6 text-gray-800" />
      </button>

      <button
        onClick={onToggleFullscreen}
        className="p-3 rounded-full bg-white hover:bg-gray-100 active:scale-95 transition-all duration-200"
        title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
      >
        {isFullscreen ? (
          <Minimize className="w-6 h-6 text-gray-800" />
        ) : (
          <Maximize className="w-6 h-6 text-gray-800" />
        )}
      </button>
    </div>
  );
};

interface CameraInfoProps {
  settings: VideoSettings | null;
  devices: CameraDevice[];
  isLoading: boolean;
  error: string | null;
}

const CameraInfo: React.FC<CameraInfoProps> = ({ settings, devices, isLoading, error }) => {
  if (error) {
    return (
      <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-2 rounded-lg flex items-center space-x-2">
        <AlertCircle className="w-4 h-4" />
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="absolute top-4 left-4 bg-blue-500 text-white px-3 py-2 rounded-lg flex items-center space-x-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading...</span>
      </div>
    );
  }

  if (!settings) {
    return null;
  }

  const currentDevice = devices.find(d => d.deviceId === settings.deviceId);

  return (
    <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white px-3 py-2 rounded-lg">
      <div className="flex items-center space-x-2 mb-1">
        <Check className="w-4 h-4 text-green-400" />
        <span className="text-sm font-medium">Camera Active</span>
      </div>
      <div className="text-xs space-y-1">
        <div>{currentDevice?.label || 'Unknown Camera'}</div>
        <div>{settings.width}x{settings.height} @ {settings.frameRate}fps</div>
      </div>
    </div>
  );
};

interface CameraSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  camera: UseCameraReturn;
}

const CameraSettingsModal: React.FC<CameraSettingsModalProps> = ({ isOpen, onClose, camera }) => {
  const [localSettings, setLocalSettings] = useState<CameraConstraints>({});
  const [isApplying, setIsApplying] = useState(false);

  const devices = camera.getDevices();
  const currentSettings = camera.getSettings();

  useEffect(() => {
    if (currentSettings) {
      setLocalSettings({
        width: { ideal: currentSettings.width },
        height: { ideal: currentSettings.height },
        frameRate: { ideal: currentSettings.frameRate },
        deviceId: currentSettings.deviceId
      });
    }
  }, [currentSettings]);

  const handleApply = async () => {
    setIsApplying(true);
    try {
      await camera.updateConstraints(localSettings);
      onClose();
    } catch (error) {
      console.error('Failed to apply camera settings:', error);
    } finally {
      setIsApplying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Camera Settings
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Device Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Camera Device
            </label>
            <select
              value={localSettings.deviceId || ''}
              onChange={(e) => setLocalSettings(prev => ({ ...prev, deviceId: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {devices.map(device => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </option>
              ))}
            </select>
          </div>

          {/* Resolution */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Resolution
            </label>
            <select
              value={`${localSettings.width?.ideal}x${localSettings.height?.ideal}`}
              onChange={(e) => {
                const [width, height] = e.target.value.split('x').map(Number);
                setLocalSettings(prev => ({
                  ...prev,
                  width: { ideal: width },
                  height: { ideal: height }
                }));
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="640x480">640x480 (4:3)</option>
              <option value="1280x720">1280x720 (16:9)</option>
              <option value="1920x1080">1920x1080 (16:9)</option>
              <option value="3840x2160">3840x2160 (4K)</option>
            </select>
          </div>

          {/* Frame Rate */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Frame Rate
            </label>
            <select
              value={localSettings.frameRate?.ideal || 30}
              onChange={(e) => setLocalSettings(prev => ({
                ...prev,
                frameRate: { ideal: Number(e.target.value) }
              }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value={15}>15 fps</option>
              <option value={24}>24 fps</option>
              <option value={30}>30 fps</option>
              <option value={60}>60 fps</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={isApplying}
            className={cn(
              "px-4 py-2 bg-blue-600 text-white rounded-md transition-colors",
              isApplying
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-blue-700"
            )}
          >
            {isApplying ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Applying...</span>
              </div>
            ) : (
              'Apply'
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export const CameraView = forwardRef<HTMLVideoElement, CameraViewProps>(
  ({ camera, analysisActive, onAnalysisToggle, className }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(null);

    const { state, isLoading, error, captureFrame } = camera;

    // Handle fullscreen
    const handleToggleFullscreen = useCallback(() => {
      if (!containerRef.current) return;

      if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }, []);

    // Handle mouse movement for controls visibility
    const handleMouseMove = useCallback(() => {
      setShowControls(true);
      
      if (controlsTimeout) {
        clearTimeout(controlsTimeout);
      }
      
      const timeout = setTimeout(() => {
        setShowControls(false);
      }, 3000);
      
      setControlsTimeout(timeout);
    }, [controlsTimeout]);

    useEffect(() => {
      const handleFullscreenChange = () => {
        setIsFullscreen(!!document.fullscreenElement);
      };

      document.addEventListener('fullscreenchange', handleFullscreenChange);
      
      return () => {
        document.removeEventListener('fullscreenchange', handleFullscreenChange);
        if (controlsTimeout) {
          clearTimeout(controlsTimeout);
        }
      };
    }, [controlsTimeout]);

    const handleCaptureFrame = async () => {
      try {
        const frameData = await captureFrame();
        
        // Create download link
        const link = document.createElement('a');
        link.href = frameData.dataURL;
        link.download = `gait-frame-${Date.now()}.jpg`;
        link.click();
      } catch (error) {
        console.error('Failed to capture frame:', error);
      }
    };

    const renderContent = () => {
      if (error) {
        return (
          <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-800">
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Camera Error
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {error}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        );
      }

      if (isLoading) {
        return (
          <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-800">
            <div className="text-center">
              <Loader2 className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-spin" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Initializing Camera
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Please wait while we access your camera...
              </p>
            </div>
          </div>
        );
      }

      if (!state.isStreaming) {
        return (
          <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-800">
            <div className="text-center">
              <CameraOff className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Camera Not Active
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Click the camera button to start streaming
              </p>
            </div>
          </div>
        );
      }

      return (
        <>
          <video
            ref={ref}
            className="w-full h-full object-contain bg-black"
            playsInline
            muted
            autoPlay
          />
          
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
            style={{ pointerEvents: 'none' }}
          />
        </>
      );
    };

    return (
      <div
        ref={containerRef}
        className={cn(
          "relative bg-black rounded-lg overflow-hidden",
          isFullscreen ? "fixed inset-0 z-50 rounded-none" : "h-full",
          className
        )}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setShowControls(false)}
      >
        {/* Camera Info */}
        <CameraInfo
          settings={state.settings}
          devices={state.devices}
          isLoading={isLoading}
          error={error}
        />

        {/* Analysis Status */}
        {analysisActive && (
          <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-2 rounded-lg flex items-center space-x-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-sm">Analyzing</span>
          </div>
        )}

        {/* Camera Content */}
        <div className="relative w-full h-full">
          {renderContent()}
        </div>

        {/* Controls */}
        <AnimatePresence>
          {showControls && state.isStreaming && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-4 left-1/2 transform -translate-x-1/2"
            >
              <CameraControls
                camera={camera}
                onCaptureFrame={handleCaptureFrame}
                onToggleSettings={() => setShowSettings(true)}
                onToggleFullscreen={handleToggleFullscreen}
                isFullscreen={isFullscreen}
                disabled={!state.isStreaming}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Settings Modal */}
        <CameraSettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          camera={camera}
        />
      </div>
    );
  }
);