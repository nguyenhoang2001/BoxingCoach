import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  Timer, 
  Zap, 
  BarChart3, 
  TrendingUp, 
  Target,
  Gauge,
  Clock,
  Footprints,
  AlertCircle
} from 'lucide-react';
import { GaitParameters, DEFAULT_GAIT_PARAMETERS } from '@/types';

interface GaitAnalysisPanelProps {
  active: boolean;
  videoElement: HTMLVideoElement | null;
}

const ParameterCard: React.FC<{
  label: string;
  value: number;
  unit: string;
  icon: React.ReactNode;
  confidence: number;
  normal?: { min: number; max: number };
}> = ({ label, value, unit, icon, confidence, normal }) => {
  const isNormal = normal ? value >= normal.min && value <= normal.max : true;
  const confidenceColor = confidence > 0.8 ? 'text-green-500' : confidence > 0.6 ? 'text-yellow-500' : 'text-red-500';
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          {icon}
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </span>
        </div>
        <div className={`w-2 h-2 rounded-full ${confidenceColor}`} />
      </div>
      
      <div className="flex items-baseline space-x-1">
        <span className="text-2xl font-bold text-gray-900 dark:text-white">
          {value.toFixed(1)}
        </span>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {unit}
        </span>
      </div>
      
      {normal && (
        <div className="mt-2 flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isNormal ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className={`text-xs ${isNormal ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {isNormal ? 'Normal' : 'Abnormal'}
          </span>
        </div>
      )}
      
      <div className="mt-2">
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
          <span>Confidence</span>
          <span>{(confidence * 100).toFixed(0)}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div 
            className={`h-2 rounded-full ${confidenceColor.replace('text-', 'bg-')}`}
            style={{ width: `${confidence * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};

const GaitPhaseIndicator: React.FC<{
  currentPhase: string;
  foot: 'left' | 'right';
}> = ({ currentPhase, foot }) => {
  const phases = [
    'heel-strike',
    'foot-flat',
    'mid-stance',
    'heel-off',
    'toe-off',
    'mid-swing',
    'terminal-swing'
  ];
  
  const currentIndex = phases.indexOf(currentPhase);
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Gait Phase
        </h3>
        <div className={`px-2 py-1 rounded text-xs font-medium ${
          foot === 'left' 
            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
            : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
        }`}>
          {foot.toUpperCase()}
        </div>
      </div>
      
      <div className="space-y-2">
        {phases.map((phase, index) => (
          <div
            key={phase}
            className={`flex items-center space-x-2 p-2 rounded ${
              index === currentIndex
                ? 'bg-blue-100 dark:bg-blue-900'
                : 'bg-gray-50 dark:bg-gray-700'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${
              index === currentIndex ? 'bg-blue-500' : 'bg-gray-400'
            }`} />
            <span className={`text-sm ${
              index === currentIndex
                ? 'text-blue-800 dark:text-blue-200 font-medium'
                : 'text-gray-600 dark:text-gray-400'
            }`}>
              {phase.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const GaitAnalysisPanel: React.FC<GaitAnalysisPanelProps> = ({ 
  active, 
  videoElement 
}) => {
  const [parameters, setParameters] = useState<GaitParameters>(DEFAULT_GAIT_PARAMETERS);
  const [currentPhase, setCurrentPhase] = useState<string>('heel-strike');
  const [currentFoot, setCurrentFoot] = useState<'left' | 'right'>('left');
  const [sessionTime, setSessionTime] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Simulate analysis when active
  useEffect(() => {
    if (active && videoElement) {
      setIsAnalyzing(true);
      
      // Simulate parameter updates
      const interval = setInterval(() => {
        setParameters(prev => ({
          ...prev,
          cadence: 110 + Math.random() * 20,
          strideLength: 1.2 + Math.random() * 0.3,
          strideTime: 1.0 + Math.random() * 0.2,
          stepWidth: 0.15 + Math.random() * 0.1,
          velocity: 1.3 + Math.random() * 0.4,
          symmetryIndex: 85 + Math.random() * 15,
          confidence: 0.7 + Math.random() * 0.3,
          doubleSupport: 20 + Math.random() * 10,
          swingPhase: 40 + Math.random() * 5,
          stancePhase: 60 + Math.random() * 5
        }));
        
        // Simulate phase changes
        const phases = ['heel-strike', 'foot-flat', 'mid-stance', 'heel-off', 'toe-off', 'mid-swing', 'terminal-swing'];
        setCurrentPhase(phases[Math.floor(Math.random() * phases.length)]);
        setCurrentFoot(Math.random() > 0.5 ? 'left' : 'right');
      }, 1000);

      return () => clearInterval(interval);
    } else {
      setIsAnalyzing(false);
      setParameters(DEFAULT_GAIT_PARAMETERS);
    }
  }, [active, videoElement]);

  // Session timer
  useEffect(() => {
    if (active) {
      const startTime = Date.now();
      const timer = setInterval(() => {
        setSessionTime(Date.now() - startTime);
      }, 1000);
      
      return () => clearInterval(timer);
    } else {
      setSessionTime(0);
    }
  }, [active]);

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (!active) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Analysis Inactive
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Start camera analysis to view gait parameters
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Gait Analysis
          </h2>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {formatTime(sessionTime)}
            </span>
          </div>
        </div>

        {/* Status */}
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Zap className="w-5 h-5 text-green-600 dark:text-green-400" />
            <span className="text-green-800 dark:text-green-200 font-medium">
              Analyzing Gait Pattern
            </span>
          </div>
          <p className="text-green-700 dark:text-green-300 text-sm mt-1">
            Real-time processing active
          </p>
        </div>

        {/* Temporal Parameters */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Temporal Parameters
          </h3>
          <div className="grid grid-cols-1 gap-4">
            <ParameterCard
              label="Cadence"
              value={parameters.cadence}
              unit="steps/min"
              icon={<Timer className="w-4 h-4 text-blue-500" />}
              confidence={parameters.confidence}
              normal={{ min: 100, max: 125 }}
            />
            <ParameterCard
              label="Stride Time"
              value={parameters.strideTime}
              unit="s"
              icon={<Clock className="w-4 h-4 text-purple-500" />}
              confidence={parameters.confidence}
              normal={{ min: 0.9, max: 1.3 }}
            />
          </div>
        </div>

        {/* Spatial Parameters */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Spatial Parameters
          </h3>
          <div className="grid grid-cols-1 gap-4">
            <ParameterCard
              label="Stride Length"
              value={parameters.strideLength}
              unit="m"
              icon={<Footprints className="w-4 h-4 text-green-500" />}
              confidence={parameters.confidence}
              normal={{ min: 1.0, max: 1.6 }}
            />
            <ParameterCard
              label="Step Width"
              value={parameters.stepWidth}
              unit="m"
              icon={<BarChart3 className="w-4 h-4 text-orange-500" />}
              confidence={parameters.confidence}
              normal={{ min: 0.1, max: 0.25 }}
            />
          </div>
        </div>

        {/* Derived Parameters */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Derived Parameters
          </h3>
          <div className="grid grid-cols-1 gap-4">
            <ParameterCard
              label="Velocity"
              value={parameters.velocity}
              unit="m/s"
              icon={<TrendingUp className="w-4 h-4 text-indigo-500" />}
              confidence={parameters.confidence}
              normal={{ min: 1.0, max: 1.8 }}
            />
            <ParameterCard
              label="Symmetry Index"
              value={parameters.symmetryIndex}
              unit="%"
              icon={<Target className="w-4 h-4 text-red-500" />}
              confidence={parameters.confidence}
              normal={{ min: 90, max: 100 }}
            />
          </div>
        </div>

        {/* Gait Phase */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Current Phase
          </h3>
          <GaitPhaseIndicator
            currentPhase={currentPhase}
            foot={currentFoot}
          />
        </div>

        {/* Analysis Quality */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Analysis Quality
          </h3>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Overall Confidence
              </span>
              <span className="text-sm font-medium">
                {(parameters.confidence * 100).toFixed(0)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="h-2 rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"
                style={{ width: `${parameters.confidence * 100}%` }}
              />
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Data Quality
              </span>
              <span className="text-sm font-medium">
                {parameters.confidence > 0.8 ? 'Excellent' : 
                 parameters.confidence > 0.6 ? 'Good' : 
                 parameters.confidence > 0.4 ? 'Fair' : 'Poor'}
              </span>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        {parameters.confidence < 0.6 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              <span className="text-yellow-800 dark:text-yellow-200 font-medium">
                Improve Analysis Quality
              </span>
            </div>
            <ul className="text-yellow-700 dark:text-yellow-300 text-sm space-y-1">
              <li>• Ensure good lighting conditions</li>
              <li>• Stand at recommended distance (2-3 meters)</li>
              <li>• Wear contrasting clothing</li>
              <li>• Walk in a straight line</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};