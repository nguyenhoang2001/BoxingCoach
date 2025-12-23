import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings, 
  Camera, 
  Monitor, 
  Sun, 
  Moon, 
  Zap, 
  Shield, 
  Info,
  Save,
  RotateCcw,
  TestTube,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

import { UseCameraReturn } from '@/hooks/useCamera';
import { LoadingButton } from '@/components/LoadingSpinner';
import { useNotificationHelpers } from '@/components/NotificationProvider';

interface SettingsPanelProps {
  theme: 'light' | 'dark' | 'system';
  onThemeChange: (theme: 'light' | 'dark' | 'system') => void;
  camera: UseCameraReturn;
}

interface SettingsSection {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

const SettingsSection: React.FC<SettingsSection> = ({ title, icon, children }) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
    <div className="flex items-center space-x-2 mb-4">
      {icon}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        {title}
      </h3>
    </div>
    {children}
  </div>
);

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  theme,
  onThemeChange,
  camera
}) => {
  const [isTestingCamera, setIsTestingCamera] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    results: Record<string, boolean>;
    errors: string[];
  } | null>(null);

  const notifications = useNotificationHelpers();
  const devices = camera.getDevices();
  const settings = camera.getSettings();

  const handleTestCamera = async () => {
    setIsTestingCamera(true);
    setTestResult(null);

    try {
      const result = await camera.testCamera();
      setTestResult(result);
      
      if (result.success) {
        notifications.success('Camera Test', 'All camera tests passed successfully');
      } else {
        notifications.error('Camera Test', `Tests failed: ${result.errors.join(', ')}`);
      }
    } catch (error) {
      notifications.error('Camera Test', 'Failed to run camera tests');
    } finally {
      setIsTestingCamera(false);
    }
  };

  const handleRefreshDevices = async () => {
    try {
      await camera.enumerateDevices();
      notifications.success('Devices', 'Camera devices refreshed successfully');
    } catch (error) {
      notifications.error('Devices', 'Failed to refresh camera devices');
    }
  };

  const renderThemeIcon = (themeType: 'light' | 'dark' | 'system') => {
    switch (themeType) {
      case 'light':
        return <Sun className="w-5 h-5" />;
      case 'dark':
        return <Moon className="w-5 h-5" />;
      case 'system':
        return <Monitor className="w-5 h-5" />;
    }
  };

  const renderTestResult = (test: string, passed: boolean) => (
    <div className="flex items-center space-x-2">
      {passed ? (
        <CheckCircle className="w-4 h-4 text-green-500" />
      ) : (
        <AlertCircle className="w-4 h-4 text-red-500" />
      )}
      <span className={`text-sm ${passed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
        {test.charAt(0).toUpperCase() + test.slice(1).replace(/([A-Z])/g, ' $1')}
      </span>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Configure your gait detection application
        </p>
      </div>

      <div className="space-y-6">
        {/* Appearance Settings */}
        <SettingsSection
          title="Appearance"
          icon={<Monitor className="w-5 h-5 text-blue-500" />}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Theme
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['system', 'light', 'dark'] as const).map((themeType) => (
                  <button
                    key={themeType}
                    onClick={() => onThemeChange(themeType)}
                    className={`
                      p-3 rounded-lg border-2 transition-all duration-200 flex items-center justify-center space-x-2
                      ${theme === themeType
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }
                    `}
                  >
                    {renderThemeIcon(themeType)}
                    <span className="text-sm font-medium capitalize">
                      {themeType}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </SettingsSection>

        {/* Camera Settings */}
        <SettingsSection
          title="Camera"
          icon={<Camera className="w-5 h-5 text-green-500" />}
        >
          <div className="space-y-4">
            {/* Current Camera Status */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900 dark:text-white">
                  Current Status
                </h4>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  camera.state.isStreaming
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                }`}>
                  {camera.state.isStreaming ? 'Active' : 'Inactive'}
                </div>
              </div>
              
              {settings && (
                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <div>Resolution: {settings.width}×{settings.height}</div>
                  <div>Frame Rate: {settings.frameRate} fps</div>
                  <div>Facing Mode: {settings.facingMode}</div>
                </div>
              )}
            </div>

            {/* Available Devices */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Available Cameras
                </label>
                <button
                  onClick={handleRefreshDevices}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-2">
                {devices.length > 0 ? (
                  devices.map((device) => (
                    <div
                      key={device.deviceId}
                      className={`p-3 rounded-lg border ${
                        device.deviceId === settings?.deviceId
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {device.label}
                        </span>
                        {device.deviceId === settings?.deviceId && (
                          <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-1 rounded">
                            Current
                          </span>
                        )}
                      </div>
                      
                      {device.capabilities && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Max: {device.capabilities.width.max}×{device.capabilities.height.max} @ {device.capabilities.frameRate.max} fps
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                    No cameras found
                  </div>
                )}
              </div>
            </div>

            {/* Camera Test */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    Camera Test
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Test camera functionality and browser compatibility
                  </p>
                </div>
                <LoadingButton
                  onClick={handleTestCamera}
                  isLoading={isTestingCamera}
                  className="bg-blue-600 text-white hover:bg-blue-700"
                >
                  <TestTube className="w-4 h-4 mr-2" />
                  Test Camera
                </LoadingButton>
              </div>

              {testResult && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 rounded-lg border ${
                    testResult.success
                      ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                      : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                  }`}
                >
                  <div className="flex items-center space-x-2 mb-3">
                    {testResult.success ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    )}
                    <span className={`font-medium ${
                      testResult.success
                        ? 'text-green-800 dark:text-green-200'
                        : 'text-red-800 dark:text-red-200'
                    }`}>
                      {testResult.success ? 'All tests passed' : 'Some tests failed'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(testResult.results).map(([test, passed]) => (
                      <div key={test}>
                        {renderTestResult(test, passed)}
                      </div>
                    ))}
                  </div>

                  {testResult.errors.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-800">
                      <h5 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                        Errors:
                      </h5>
                      <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                        {testResult.errors.map((error, index) => (
                          <li key={index}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          </div>
        </SettingsSection>

        {/* Performance Settings */}
        <SettingsSection
          title="Performance"
          icon={<Zap className="w-5 h-5 text-yellow-500" />}
        >
          <div className="space-y-4">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Info className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                <span className="text-yellow-800 dark:text-yellow-200 font-medium">
                  Performance Tips
                </span>
              </div>
              <ul className="text-yellow-700 dark:text-yellow-300 text-sm space-y-1">
                <li>• Use Chrome or Edge for best performance</li>
                <li>• Enable hardware acceleration in browser settings</li>
                <li>• Close unnecessary tabs and applications</li>
                <li>• Use well-lit environment for better detection</li>
                <li>• Maintain 2-3 meters distance from camera</li>
              </ul>
            </div>
          </div>
        </SettingsSection>

        {/* Privacy & Security */}
        <SettingsSection
          title="Privacy & Security"
          icon={<Shield className="w-5 h-5 text-purple-500" />}
        >
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span className="text-blue-800 dark:text-blue-200 font-medium">
                  Privacy Information
                </span>
              </div>
              <ul className="text-blue-700 dark:text-blue-300 text-sm space-y-1">
                <li>• Video processing happens entirely on your device</li>
                <li>• No video data is transmitted or stored on servers</li>
                <li>• Analysis results are processed locally</li>
                <li>• Camera access can be revoked at any time</li>
                <li>• Application requires HTTPS for security</li>
              </ul>
            </div>
          </div>
        </SettingsSection>

        {/* Debug Information */}
        {process.env.NODE_ENV === 'development' && (
          <SettingsSection
            title="Debug Information"
            icon={<Info className="w-5 h-5 text-gray-500" />}
          >
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-auto">
                  {JSON.stringify(camera.getDebugInfo(), null, 2)}
                </pre>
              </div>
            </div>
          </SettingsSection>
        )}
      </div>
    </div>
  );
};