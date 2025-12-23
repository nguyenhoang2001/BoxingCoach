/**
 * Pose Detection Diagnostic Component
 * Helps identify why the pose detection overlay is not working
 */

import { useRef, useEffect, useState, FC } from 'react';
import { PoseDetectionService } from '../services/PoseDetectionService';

interface DiagnosticInfo {
  cameraStatus: 'not_requested' | 'requesting' | 'ready' | 'error';
  poseServiceStatus: 'not_init' | 'initializing' | 'ready' | 'error';
  tensorflowStatus: 'not_loaded' | 'loading' | 'ready' | 'error';
  videoReadiness: 'not_ready' | 'ready';
  canvasContext: 'not_available' | 'available';
  poseDetectionCount: number;
  lastError: string | null;
  modelLoadTime: number | null;
}

export const PoseDetectionDiagnostic: FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const poseServiceRef = useRef<PoseDetectionService | null>(null);
  const [diagnostic, setDiagnostic] = useState<DiagnosticInfo>({
    cameraStatus: 'not_requested',
    poseServiceStatus: 'not_init',
    tensorflowStatus: 'not_loaded',
    videoReadiness: 'not_ready',
    canvasContext: 'not_available',
    poseDetectionCount: 0,
    lastError: null,
    modelLoadTime: null
  });
  const [isRunning, setIsRunning] = useState(false);

  // Initialize everything
  useEffect(() => {
    initializeDiagnostic();
  }, []);

  const initializeDiagnostic = async () => {
    try {
      // Step 1: Check TensorFlow.js loading
      setDiagnostic(prev => ({ ...prev, tensorflowStatus: 'loading' }));
      
      // Import TensorFlow to test loading
      const tf = await import('@tensorflow/tfjs');
      await tf.ready();
      setDiagnostic(prev => ({ ...prev, tensorflowStatus: 'ready' }));

      // Step 2: Initialize camera
      setDiagnostic(prev => ({ ...prev, cameraStatus: 'requesting' }));
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, frameRate: 30 }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          // Resize canvas to match video dimensions
          if (canvasRef.current && videoRef.current) {
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
            console.log('Diagnostic canvas resized to:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);
          }
          
          setDiagnostic(prev => ({ ...prev, 
            cameraStatus: 'ready',
            videoReadiness: 'ready'
          }));
        };
      }

      // Step 3: Check canvas context
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          setDiagnostic(prev => ({ ...prev, canvasContext: 'available' }));
        }
      }

      // Step 4: Initialize pose detection service
      setDiagnostic(prev => ({ ...prev, poseServiceStatus: 'initializing' }));
      
      poseServiceRef.current = new PoseDetectionService();
      await poseServiceRef.current.initialize({
        modelType: 'lightning',
        enableGPU: true,
        inputResolution: { width: 640, height: 480 },
        validation: {
          minPoseConfidence: 0.25,
          minVisibleKeypoints: 3,
          requiredKeypoints: [],
          maxKeypointDistance: 150,
          enableAnatomicalValidation: false
        },
        smoothing: {
          smoothingFactor: 0.2,
          minConfidence: 0.3,
          maxDistance: 50,
          enableVelocitySmoothing: true,
          historySize: 5
        },
        performance: {
          enableFrameSkipping: false, // Disable for diagnostic
          frameSkipInterval: 1,
          targetFPS: 30
        },
        maxPoses: 1
      });

      const stats = poseServiceRef.current.getStats();
      setDiagnostic(prev => ({ 
        ...prev, 
        poseServiceStatus: 'ready',
        modelLoadTime: stats.modelLoadTime
      }));

    } catch (error) {
      console.error('Diagnostic initialization error:', error);
      setDiagnostic(prev => ({ 
        ...prev, 
        lastError: error instanceof Error ? error.message : String(error)
      }));
    }
  };

  const testPoseDetection = async () => {
    if (!poseServiceRef.current || !videoRef.current) {
      setDiagnostic(prev => ({ 
        ...prev, 
        lastError: 'Service or video not ready'
      }));
      return;
    }

    try {
      console.log('Testing pose detection...');
      console.log('Video readyState:', videoRef.current.readyState);
      console.log('Video dimensions:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);

      const poses = await poseServiceRef.current.detectPoses(videoRef.current);
      console.log('Detected poses:', poses);
      
      if (poses.length > 0 && poses[0].keypoints.length > 0) {
        console.log('First keypoint:', poses[0].keypoints[0]);
        console.log('Video size:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);
  console.log('Canvas size:', canvasRef.current?.width, 'x', canvasRef.current?.height);
      }

      setDiagnostic(prev => ({ 
        ...prev, 
        poseDetectionCount: prev.poseDetectionCount + 1,
        lastError: poses.length === 0 ? 'No poses detected' : null
      }));

      // Draw simple test on canvas
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          
          // Don't draw video frame - just overlay
          // ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
          
          // Draw test overlay
          ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
          ctx.fillRect(10, 10, 200, 60);
          ctx.fillStyle = 'white';
          ctx.font = '14px Arial';
          ctx.fillText(`Poses detected: ${poses.length}`, 20, 30);
          ctx.fillText(`Detection #${diagnostic.poseDetectionCount + 1}`, 20, 50);

          // Draw poses if any
      poses.forEach((pose) => {
        pose.keypoints.forEach((kp) => {
          if ((kp.score ?? 0) > 0.3) {
                ctx.fillStyle = 'lime';
                ctx.beginPath();
                ctx.arc(kp.x, kp.y, 5, 0, 2 * Math.PI);
                ctx.fill();
                
                // Label keypoint
                ctx.fillStyle = 'white';
                ctx.font = '10px Arial';
            ctx.fillText(`${kp.name} (${((kp.score ?? 0) * 100).toFixed(0)}%)`, 
                           kp.x + 10, kp.y + 5);
              }
            });
          });
        }
      }

    } catch (error) {
      console.error('Pose detection test error:', error);
      setDiagnostic(prev => ({ 
        ...prev, 
        lastError: error instanceof Error ? error.message : String(error)
      }));
    }
  };

  const startContinuousDetection = () => {
    setIsRunning(true);
    const runDetection = async () => {
      if (isRunning) {
        await testPoseDetection();
        setTimeout(runDetection, 100); // 10 FPS for diagnostic
      }
    };
    runDetection();
  };

  const stopContinuousDetection = () => {
    setIsRunning(false);
  };

  const getStatusColor = (status: string) => {
    if (status.includes('ready') || status.includes('available')) return 'text-green-600';
    if (status.includes('error')) return 'text-red-600';
    if (status.includes('loading') || status.includes('requesting') || status.includes('initializing')) return 'text-yellow-600';
    return 'text-gray-600';
  };

  return (
    <div className="pose-diagnostic p-6 bg-gray-100 rounded-lg">
      <h2 className="text-xl font-bold mb-4">Pose Detection Diagnostic</h2>
      
      {/* Video and Canvas */}
      <div className="flex gap-4 mb-6">
        <div className="relative">
          <h3 className="text-lg font-semibold mb-2">Camera Feed</h3>
          <video 
            ref={videoRef}
            width="320" 
            height="240" 
            autoPlay 
            muted 
            playsInline
            style={{ border: '2px solid #ccc', borderRadius: '4px' }}
          />
        </div>
        
        <div className="relative">
          <h3 className="text-lg font-semibold mb-2">Pose Overlay</h3>
          <canvas 
            ref={canvasRef}
            width="640" 
            height="480" 
            style={{ 
              border: '2px solid #333', 
              borderRadius: '4px',
              backgroundColor: '#f0f0f0',
              width: '320px',
              height: '240px'
            }}
          />
        </div>
      </div>

      {/* Status Information */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white p-4 rounded">
          <h3 className="font-semibold mb-2">System Status</h3>
          <div className="space-y-1 text-sm">
            <div className={getStatusColor(diagnostic.cameraStatus)}>
              Camera: {diagnostic.cameraStatus}
            </div>
            <div className={getStatusColor(diagnostic.poseServiceStatus)}>
              Pose Service: {diagnostic.poseServiceStatus}
            </div>
            <div className={getStatusColor(diagnostic.tensorflowStatus)}>
              TensorFlow: {diagnostic.tensorflowStatus}
            </div>
            <div className={getStatusColor(diagnostic.videoReadiness)}>
              Video: {diagnostic.videoReadiness}
            </div>
            <div className={getStatusColor(diagnostic.canvasContext)}>
              Canvas: {diagnostic.canvasContext}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded">
          <h3 className="font-semibold mb-2">Detection Info</h3>
          <div className="space-y-1 text-sm">
            <div>Detection Count: {diagnostic.poseDetectionCount}</div>
            {diagnostic.modelLoadTime && (
              <div>Model Load Time: {diagnostic.modelLoadTime.toFixed(0)}ms</div>
            )}
            {diagnostic.lastError && (
              <div className="text-red-600">Error: {diagnostic.lastError}</div>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        <button 
          onClick={testPoseDetection}
          disabled={diagnostic.poseServiceStatus !== 'ready' || diagnostic.videoReadiness !== 'ready'}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-400"
        >
          Test Single Detection
        </button>
        
        <button 
          onClick={isRunning ? stopContinuousDetection : startContinuousDetection}
          disabled={diagnostic.poseServiceStatus !== 'ready' || diagnostic.videoReadiness !== 'ready'}
          className="px-4 py-2 bg-green-500 text-white rounded disabled:bg-gray-400"
        >
          {isRunning ? 'Stop' : 'Start'} Continuous Detection
        </button>
      </div>

      {/* Debug Console */}
      <div className="mt-4 p-4 bg-black text-green-400 rounded font-mono text-xs h-32 overflow-y-auto">
        <div>Open browser console for detailed debug information</div>
        <div>Check Network tab for TensorFlow model loading</div>
        <div>Look for pose detection errors in console</div>
      </div>
    </div>
  );
};