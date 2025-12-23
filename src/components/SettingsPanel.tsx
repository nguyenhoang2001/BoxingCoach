/**
 * Settings Panel Component - Application configuration interface
 * Allows users to adjust camera, AI, performance, and UI settings
 */

import React, { useState } from 'react';
import { AppConfig } from '../types';
import './SettingsPanel.css';

interface SettingsPanelProps {
  config: AppConfig;
  onSave: (config: Partial<AppConfig>) => void;
  onClose: () => void;
  className?: string;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  config,
  onSave,
  onClose,
  className
}) => {
  const [localConfig, setLocalConfig] = useState<AppConfig>({ ...config });
  const [activeTab, setActiveTab] = useState<'camera' | 'ai' | 'performance' | 'ui'>('camera');

  const handleSave = () => {
    onSave(localConfig);
    onClose();
  };

  const handleReset = () => {
    setLocalConfig({ ...config });
  };

  const updateConfig = (section: keyof AppConfig, updates: any) => {
    setLocalConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        ...updates
      }
    }));
  };

  const renderCameraSettings = () => (
    <div className="settings-section">
      <h4>Camera Settings</h4>
      
      <div className="setting-group">
        <label>Resolution</label>
        <div className="resolution-controls">
          <div className="input-group">
            <label>Width:</label>
            <input
              type="number"
              value={localConfig.camera.defaultConstraints.width.ideal}
              onChange={(e) => updateConfig('camera', {
                defaultConstraints: {
                  ...localConfig.camera.defaultConstraints,
                  width: { ...localConfig.camera.defaultConstraints.width, ideal: parseInt(e.target.value) }
                }
              })}
              min="320"
              max="1920"
            />
          </div>
          <div className="input-group">
            <label>Height:</label>
            <input
              type="number"
              value={localConfig.camera.defaultConstraints.height.ideal}
              onChange={(e) => updateConfig('camera', {
                defaultConstraints: {
                  ...localConfig.camera.defaultConstraints,
                  height: { ...localConfig.camera.defaultConstraints.height, ideal: parseInt(e.target.value) }
                }
              })}
              min="240"
              max="1080"
            />
          </div>
        </div>
      </div>

      <div className="setting-group">
        <label>Frame Rate</label>
        <input
          type="number"
          value={localConfig.camera.defaultConstraints.frameRate.ideal}
          onChange={(e) => updateConfig('camera', {
            defaultConstraints: {
              ...localConfig.camera.defaultConstraints,
              frameRate: { ...localConfig.camera.defaultConstraints.frameRate, ideal: parseInt(e.target.value) }
            }
          })}
          min="15"
          max="60"
        />
      </div>

      <div className="setting-group">
        <label>Permissions Timeout (ms)</label>
        <input
          type="number"
          value={localConfig.camera.permissionsTimeout}
          onChange={(e) => updateConfig('camera', { permissionsTimeout: parseInt(e.target.value) })}
          min="5000"
          max="30000"
        />
      </div>
    </div>
  );

  const renderAISettings = () => (
    <div className="settings-section">
      <h4>AI Settings</h4>
      
      <div className="setting-group">
        <label>Model Type</label>
        <select
          value={localConfig.ai.modelType}
          onChange={(e) => updateConfig('ai', { modelType: e.target.value as 'lightning' | 'thunder' })}
        >
          <option value="lightning">Lightning (Fast)</option>
          <option value="thunder">Thunder (Accurate)</option>
        </select>
      </div>

      <div className="setting-group">
        <label>Minimum Pose Score</label>
        <input
          type="range"
          min="0.1"
          max="0.9"
          step="0.05"
          value={localConfig.ai.minPoseScore}
          onChange={(e) => updateConfig('ai', { minPoseScore: parseFloat(e.target.value) })}
        />
        <span className="range-value">{localConfig.ai.minPoseScore.toFixed(2)}</span>
      </div>

      <div className="setting-group">
        <label>Maximum Poses</label>
        <input
          type="number"
          value={localConfig.ai.maxPoses}
          onChange={(e) => updateConfig('ai', { maxPoses: parseInt(e.target.value) })}
          min="1"
          max="5"
        />
      </div>

      <div className="setting-group">
        <label>
          <input
            type="checkbox"
            checked={localConfig.ai.enableSmoothing}
            onChange={(e) => updateConfig('ai', { enableSmoothing: e.target.checked })}
          />
          Enable Pose Smoothing
        </label>
      </div>
    </div>
  );

  const renderPerformanceSettings = () => (
    <div className="settings-section">
      <h4>Performance Settings</h4>
      
      <div className="setting-group">
        <label>Target FPS</label>
        <input
          type="number"
          value={localConfig.performance.targetFPS}
          onChange={(e) => updateConfig('performance', { targetFPS: parseInt(e.target.value) })}
          min="15"
          max="60"
        />
      </div>

      <div className="setting-group">
        <label>Memory Threshold (MB)</label>
        <input
          type="number"
          value={localConfig.performance.memoryThreshold}
          onChange={(e) => updateConfig('performance', { memoryThreshold: parseInt(e.target.value) })}
          min="256"
          max="2048"
        />
      </div>

      <div className="setting-group">
        <label>Max Dropped Frames</label>
        <input
          type="number"
          value={localConfig.performance.maxDroppedFrames}
          onChange={(e) => updateConfig('performance', { maxDroppedFrames: parseInt(e.target.value) })}
          min="1"
          max="20"
        />
      </div>

      <div className="setting-group">
        <label>
          <input
            type="checkbox"
            checked={localConfig.performance.adaptiveQuality}
            onChange={(e) => updateConfig('performance', { adaptiveQuality: e.target.checked })}
          />
          Enable Adaptive Quality
        </label>
      </div>
    </div>
  );

  const renderUISettings = () => (
    <div className="settings-section">
      <h4>UI Settings</h4>
      
      <div className="setting-group">
        <label>Theme</label>
        <select
          value={localConfig.ui.theme}
          onChange={(e) => updateConfig('ui', { theme: e.target.value as 'light' | 'dark' })}
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </div>

      <div className="setting-group">
        <label>
          <input
            type="checkbox"
            checked={localConfig.ui.showDebugInfo}
            onChange={(e) => updateConfig('ui', { showDebugInfo: e.target.checked })}
          />
          Show Debug Information
        </label>
      </div>

      <div className="setting-group">
        <label>Auto-save Interval (ms)</label>
        <input
          type="number"
          value={localConfig.ui.autoSaveInterval}
          onChange={(e) => updateConfig('ui', { autoSaveInterval: parseInt(e.target.value) })}
          min="10000"
          max="300000"
        />
      </div>
    </div>
  );

  return (
    <div className="settings-overlay">
      <div className={`settings-panel ${className || ''}`}>
        <div className="settings-header">
          <h3>Settings</h3>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>

        <div className="settings-tabs">
          <button 
            className={`tab ${activeTab === 'camera' ? 'active' : ''}`}
            onClick={() => setActiveTab('camera')}
          >
            Camera
          </button>
          <button 
            className={`tab ${activeTab === 'ai' ? 'active' : ''}`}
            onClick={() => setActiveTab('ai')}
          >
            AI
          </button>
          <button 
            className={`tab ${activeTab === 'performance' ? 'active' : ''}`}
            onClick={() => setActiveTab('performance')}
          >
            Performance
          </button>
          <button 
            className={`tab ${activeTab === 'ui' ? 'active' : ''}`}
            onClick={() => setActiveTab('ui')}
          >
            UI
          </button>
        </div>

        <div className="settings-content">
          {activeTab === 'camera' && renderCameraSettings()}
          {activeTab === 'ai' && renderAISettings()}
          {activeTab === 'performance' && renderPerformanceSettings()}
          {activeTab === 'ui' && renderUISettings()}
        </div>

        <div className="settings-footer">
          <button className="reset-button" onClick={handleReset}>
            Reset to Default
          </button>
          <div className="action-buttons">
            <button className="cancel-button" onClick={onClose}>
              Cancel
            </button>
            <button className="save-button" onClick={handleSave}>
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};