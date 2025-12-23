/**
 * PoseDetectionDemo - Example component demonstrating PoseOverlay integration
 * Shows how to combine camera streaming with real-time pose detection overlay
 */

import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Pause, 
  Square, 
  Settings, 
  Activity, 
  Zap,
  Eye,
  TrendingUp,
  Users
} from 'lucide-react';

import { CameraView } from './Camera/CameraView';
import { PoseOverlay } from './PoseOverlay';
import { usePoseOverlay } from '../hooks/usePoseOverlay';
import { useCamera } from '../hooks/useCamera';
import { VisualizationSettings } from '../types/gait';

interface PoseDetectionDemoProps {
  className?: string;
  showDebugInfo?: boolean;
  performanceMode?: 'high' | 'balanced' | 'battery';
}

export const PoseDetectionDemo: React.FC<PoseDetectionDemoProps> = ({
  className = '',
  showDebugInfo = false,
  performanceMode = 'balanced'
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Initialize camera
  const camera = useCamera({
    constraints: {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 30 }
    },
    autoStart: true
  });

  // Initialize pose overlay
  const poseOverlay = usePoseOverlay({
    videoElement: videoRef.current || undefined,
    canvasElement: canvasRef.current || undefined,
    isActive: isAnalyzing,
    performanceMode,
    config: {
      modelType: 'lightning',
      inputResolution: { width: 256, height: 256 },
      enableGPU: true,
      maxPoses: 1,
      smoothing: {
        smoothingFactor: 0.8,
        minConfidence: 0.3,
        maxDistance: 50,
        enableVelocitySmoothing: true,
        historySize: 5
      }
    }
  });

  // Update refs when elements are available
  useEffect(() => {
    if (videoRef.current && canvasRef.current) {
      // Update canvas size to match video
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      const updateCanvasSize = () => {
        if (video.videoWidth && video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          canvas.style.width = '100%';
          canvas.style.height = '100%';
        }
      };

      video.addEventListener('loadedmetadata', updateCanvasSize);
      video.addEventListener('resize', updateCanvasSize);
      
      return () => {
        video.removeEventListener('loadedmetadata', updateCanvasSize);
        video.removeEventListener('resize', updateCanvasSize);
      };
    }
  }, [camera.state.isStreaming]);

  // Handle analysis toggle
  const handleAnalysisToggle = async (active: boolean) => {
    setIsAnalyzing(active);
    if (active) {
      await poseOverlay.startDetection();
    } else {
      poseOverlay.stopDetection();
    }
  };

  // Quick settings presets
  const applyPreset = (preset: 'minimal' | 'detailed' | 'clinical') => {
    const presets: Record<string, Partial<VisualizationSettings>> = {
      minimal: {
        skeletonStyle: 'minimal',
        showConfidence: false,
        skeletonOpacity: 0.6,
        colorScheme: 'default'
      },
      detailed: {
        skeletonStyle: 'anatomical',
        showConfidence: true,
        skeletonOpacity: 0.8,
        colorScheme: 'phase'
      },
      clinical: {
        skeletonStyle: 'anatomical',
        showConfidence: true,
        skeletonOpacity: 0.9,
        colorScheme: 'confidence',
        showParameters: true
      }
    };

    poseOverlay.updateSettings(presets[preset]);
  };

  return (
    <div className={`relative w-full h-full bg-gray-900 rounded-lg overflow-hidden ${className}`}>
      {/* Main Camera View with Overlay */}
      <div className="relative w-full h-full">
        <CameraView
          ref={videoRef}
          camera={camera}
          analysisActive={isAnalyzing}
          onAnalysisToggle={handleAnalysisToggle}
          className="w-full h-full"
        />
        
        {/* Pose Overlay Canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ 
            mixBlendMode: 'normal',
            zIndex: 10
          }}
        />
        
        {/* Pose Overlay Component */}
        <PoseOverlay
          canvasRef={canvasRef}
          videoRef={videoRef}
          poses={poseOverlay.poses}
          settings={poseOverlay.settings}
          isActive={isAnalyzing}
          performanceMode={performanceMode}
          onPerformanceUpdate={(metrics) => {
            if (showDebugInfo) {
              console.log('Pose overlay performance:', metrics);
            }
          }}
          showDebugInfo={showDebugInfo}
          className="absolute inset-0"
        />
      </div>

      {/* Control Panel */}
      <div className="absolute top-4 left-4 flex flex-col space-y-2 z-20">
        {/* Analysis Control */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => handleAnalysisToggle(!isAnalyzing)}
          disabled={!camera.state.isStreaming}
          className={`
            flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200
            ${isAnalyzing 
              ? 'bg-red-500 hover:bg-red-600 text-white' 
              : 'bg-green-500 hover:bg-green-600 text-white'
            }
            ${!camera.state.isStreaming ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          {isAnalyzing ? (
            <>
              <Pause className="w-4 h-4" />
              <span>Stop Analysis</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              <span>Start Analysis</span>
            </>
          )}
        </motion.button>

        {/* Quick Preset Buttons */}
        {isAnalyzing && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col space-y-1"
          >
            <button
              onClick={() => applyPreset('minimal')}
              className="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
            >
              Minimal
            </button>
            <button
              onClick={() => applyPreset('detailed')}
              className="px-3 py-1 text-sm bg-purple-500 hover:bg-purple-600 text-white rounded transition-colors"
            >
              Detailed
            </button>
            <button
              onClick={() => applyPreset('clinical')}
              className="px-3 py-1 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded transition-colors"
            >
              Clinical
            </button>
          </motion.div>
        )}
      </div>

      {/* Statistics Panel */}
      {isAnalyzing && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute bottom-4 left-4 bg-black bg-opacity-75 text-white p-3 rounded-lg z-20"
        >
          <div className="flex items-center space-x-2 mb-2">
            <Activity className="w-4 h-4 text-green-400" />
            <span className="text-sm font-semibold">Pose Detection Active</span>
          </div>
          
          <div className="space-y-1 text-xs">
            <div className="flex items-center justify-between space-x-4">
              <span className="flex items-center space-x-1">
                <Users className="w-3 h-3" />
                <span>Poses:</span>
              </span>
              <span className="font-mono">{poseOverlay.poses.length}</span>
            </div>
            
            <div className="flex items-center justify-between space-x-4">
              <span className="flex items-center space-x-1">
                <TrendingUp className="w-3 h-3" />
                <span>Confidence:</span>
              </span>
              <span className="font-mono">
                {(poseOverlay.stats.averageConfidence * 100).toFixed(1)}%
              </span>
            </div>
            
            <div className="flex items-center justify-between space-x-4">
              <span className="flex items-center space-x-1">
                <Zap className="w-3 h-3" />
                <span>FPS:</span>
              </span>
              <span className="font-mono">
                {poseOverlay.performance.frameRate.toFixed(1)}
              </span>
            </div>
            
            <div className="flex items-center justify-between space-x-4">
              <span className="flex items-center space-x-1">
                <Eye className="w-3 h-3" />
                <span>Detection Rate:</span>
              </span>
              <span className="font-mono">
                {poseOverlay.stats.detectionRate.toFixed(1)}/s
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Error Display */}
      <AnimatePresence>
        {poseOverlay.error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-4 right-4 bg-red-500 text-white p-3 rounded-lg z-20 max-w-sm"
          >
            <div className="flex items-center space-x-2 mb-1">
              <Square className="w-4 h-4" />
              <span className="font-semibold text-sm">Detection Error</span>
            </div>
            <p className="text-xs">{poseOverlay.error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 px-2 py-1 bg-white text-red-500 rounded text-xs hover:bg-gray-100 transition-colors"
            >
              Retry
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Performance Mode Indicator */}
      <div className="absolute top-4 right-4 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs z-20">
        Mode: {performanceMode.charAt(0).toUpperCase() + performanceMode.slice(1)}
      </div>

      {/* Settings Toggle */}
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="absolute top-12 right-4 p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors z-20"
        title="Overlay Settings"
      >
        <Settings className="w-4 h-4" />
      </button>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="absolute top-20 right-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg z-30 w-64"
          >
            <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
              Visualization Settings
            </h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Skeleton Style
                </label>
                <select 
                  value={poseOverlay.settings.skeletonStyle}
                  onChange={(e) => poseOverlay.updateSettings({ 
                    skeletonStyle: e.target.value as 'basic' | 'anatomical' | 'minimal' 
                  })}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="minimal">Minimal</option>
                  <option value="basic">Basic</option>
                  <option value="anatomical">Anatomical</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Color Scheme
                </label>
                <select 
                  value={poseOverlay.settings.colorScheme}
                  onChange={(e) => poseOverlay.updateSettings({ 
                    colorScheme: e.target.value as 'default' | 'confidence' | 'phase' 
                  })}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="default">Default</option>
                  <option value="confidence">Confidence</option>
                  <option value="phase">Body Parts</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Skeleton Opacity
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.1"
                  value={poseOverlay.settings.skeletonOpacity}
                  onChange={(e) => poseOverlay.updateSettings({ 
                    skeletonOpacity: parseFloat(e.target.value) 
                  })}
                  className="w-full"
                />
                <span className="text-xs text-gray-500">
                  {(poseOverlay.settings.skeletonOpacity * 100).toFixed(0)}%
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="showConfidence"
                  checked={poseOverlay.settings.showConfidence}
                  onChange={(e) => poseOverlay.updateSettings({ 
                    showConfidence: e.target.checked 
                  })}
                  className="w-4 h-4"
                />
                <label htmlFor="showConfidence" className="text-sm text-gray-700 dark:text-gray-300">
                  Show Confidence Indicators
                </label>
              </div>
            </div>
            
            <button
              onClick={() => setShowSettings(false)}
              className="mt-4 w-full px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
            >
              Close
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PoseDetectionDemo;