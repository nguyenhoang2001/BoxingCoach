import { PoseDetectionService } from '../../../services/PoseDetectionService';
import { KeypointName, PoseDetectionResult } from '../../../types/pose';
import PunchStatMeasure from '../../../components/boxing-pose/PunchStatMeasure';
import { PoseMetrics, VideoDisplayerCallbacks } from '../interfaces';

export class VideoDisplayer {
  private poseDetectionService: PoseDetectionService | null = null;
  private animationFrameId: number | null = null;
  private streamRef: MediaStream | null = null;
  private isRunningRef: boolean = false;
  private frameCountRef: number = 0;
  private lastProcessTimeRef: number = 0;
  private showOverlaysRef: boolean = false;
  
  // Smoothing parameters
  private previousPose: PoseDetectionResult | null = null;
  private smoothingFactor: number = 0.7; // Higher = more smoothing (0-1)
  
  // PunchStat measurement
  private punchStatMeasure: PunchStatMeasure;
  private leadHand: boolean = true; // true = left, false = right
  
  private poseMetrics: PoseMetrics = {
    detectionConfidence: 0,
    keypointCount: 0,
    visibleKeypoints: 0,
    poseStability: 0,
    trackingQuality: 0,
    movementIntensity: 0,
    poseDuration: 0,
    averageKeypointConfidence: 0,
  };

  private callbacks: VideoDisplayerCallbacks;

  constructor(callbacks: VideoDisplayerCallbacks = {}) {
    this.callbacks = callbacks;
    this.punchStatMeasure = new PunchStatMeasure();
  }

  setLeadHand(isLeft: boolean): void {
    this.leadHand = isLeft;
  }

  setOverlaysVisible(visible: boolean): void {
    this.showOverlaysRef = visible;
  }

  async initializeServices(): Promise<void> {
    try {
      console.log('Starting service initialization...');
      // Initialize pose detection service only if not already initialized
      if (!this.poseDetectionService) {
        console.log('Creating new PoseDetectionService instance...');
        this.poseDetectionService = new PoseDetectionService();
        
        // Configure pose detection
        try {
          console.log('Initializing pose detection service...');
          await this.poseDetectionService.initialize({
            modelType: 'lightning',
            enableGPU: true,
            inputResolution: { width: 640, height: 480 },
            validation: {
              minPoseConfidence: 0.4,
              minVisibleKeypoints: 0.3,
              requiredKeypoints: [
                KeypointName.NOSE,
                KeypointName.LEFT_SHOULDER,
                KeypointName.RIGHT_SHOULDER,
                KeypointName.LEFT_HIP,
                KeypointName.RIGHT_HIP
              ],
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
              enableFrameSkipping: true,
              frameSkipInterval: 2,
              targetFPS: 30
            },
            maxPoses: 1
          });
          
          console.log('Pose detection service initialized successfully');
          console.log('Service ready state:', this.poseDetectionService.isReady());
        } catch (serviceError) {
          console.error('Failed to initialize pose detection service:', serviceError);
          throw serviceError;
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize system';
      if (this.callbacks.onError) {
        this.callbacks.onError(errorMessage);
      }
      console.error('Initialization error:', err);
    }
  }

  async initializeCamera(videoElement: HTMLVideoElement, canvasElement: HTMLCanvasElement, selectedCameraId?: string, updateCanvasLayout?: () => void): Promise<void> {
    try {
      // Request camera access with specific device ID if selected
      const videoConstraints: MediaTrackConstraints = {
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 30 }
      };
      
      if (selectedCameraId) {
        videoConstraints.deviceId = { exact: selectedCameraId };
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints
      });
      
      this.streamRef = stream;
      videoElement.srcObject = stream;
      
      // Wait for video to load
      videoElement.onloadedmetadata = () => {
        // Set canvas dimensions to match actual video dimensions
        const videoWidth = videoElement.videoWidth;
        const videoHeight = videoElement.videoHeight;
        
        canvasElement.width = videoWidth;
        canvasElement.height = videoHeight;
        
        // Update canvas layout to match video display
        if (updateCanvasLayout) {
          updateCanvasLayout();
        }
        
        console.log('Canvas resized to match video:', videoWidth, 'x', videoHeight);
        
        // Only set initialized if pose detection service is also ready
        if (this.poseDetectionService && this.poseDetectionService.isReady()) {
          if (this.callbacks.onInitialized) {
            this.callbacks.onInitialized(true);
          }
          console.log('Camera and pose detection initialized successfully');
        } else {
          console.warn('Camera ready but pose detection service not ready yet');
        }
      };
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize camera';
      if (this.callbacks.onError) {
        this.callbacks.onError(errorMessage);
      }
      console.error('Camera initialization error:', err);
    }
  }

  private smoothPose(currentPose: PoseDetectionResult): PoseDetectionResult {
    // If no previous pose, just return current
    if (!this.previousPose) {
      this.previousPose = JSON.parse(JSON.stringify(currentPose));
      return currentPose;
    }

    // Apply exponential moving average to smooth keypoints
    const smoothedPose: PoseDetectionResult = {
      ...currentPose,
      keypoints: currentPose.keypoints.map((kp, idx) => {
        const prevKp = this.previousPose!.keypoints[idx];
        
        // Only smooth if both current and previous keypoint are confident
        if ((kp.score ?? 0) > 0.3 && (prevKp?.score ?? 0) > 0.3) {
          return {
            ...kp,
            x: prevKp.x * this.smoothingFactor + kp.x * (1 - this.smoothingFactor),
            y: prevKp.y * this.smoothingFactor + kp.y * (1 - this.smoothingFactor),
          };
        }
        
        return kp;
      })
    };

    // Update previous pose for next frame
    this.previousPose = JSON.parse(JSON.stringify(smoothedPose));
    
    return smoothedPose;
  }

  async processFrame(videoElement: HTMLVideoElement, canvasElement: HTMLCanvasElement): Promise<void> {
    if (!videoElement || !canvasElement) {
      console.log('processFrame early return - missing video or canvas');
      return;
    }
    
    if (!this.poseDetectionService || !this.poseDetectionService.isReady()) {
      console.log('processFrame early return - pose detection service not ready');
      return;
    }

    // Throttle to ~20 FPS (run every 3rd frame at 60fps)
    this.frameCountRef++;
    const now = performance.now();
    const timeSinceLastProcess = now - this.lastProcessTimeRef;
    
    // Skip if less than 50ms has passed (targeting ~20 FPS)
    if (timeSinceLastProcess < 50) {
      if (this.isRunningRef) {
        this.animationFrameId = requestAnimationFrame(() => this.processFrame(videoElement, canvasElement));
      }
      return;
    }
    
    this.lastProcessTimeRef = now;

    try {
      const canvas = canvasElement;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw test indicator to verify canvas is working
      ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
      ctx.fillRect(canvas.width - 50, 5, 40, 20);
      ctx.fillStyle = 'white';
      ctx.font = '12px Arial';
      ctx.fillText('LIVE', canvas.width - 45, 18);

      // Run pose detection
      const poses = await this.poseDetectionService.detectPoses(videoElement);
      
      if (poses.length > 0) {
        // Apply smoothing to reduce jitter
        const rawPose = poses[0];
        const pose = this.smoothPose(rawPose);
        const timestamp = Date.now();
        
        // Calculate metrics
        const totalKeypoints = pose.keypoints.length;
        const visibleKeypoints = pose.keypoints.filter(kp => (kp.score ?? 0) > 0.3).length;
        const averageConfidence = pose.keypoints.reduce((sum, kp) => sum + (kp.score ?? 0), 0) / totalKeypoints;
        
        // Calculate pose stability (based on confidence variance)
        const confidenceVariance = pose.keypoints.reduce((sum, kp) => {
          const diff = (kp.score ?? 0) - averageConfidence;
          return sum + (diff * diff);
        }, 0) / totalKeypoints;
        const stability = Math.max(0, 1 - confidenceVariance);
        
        // Calculate movement intensity (mock for now - would need pose history)
        const movementIntensity = Math.random() * 0.5 + 0.2; // Mock movement detection
        
        // Convert pose keypoints to landmarks format for PunchStatMeasure
        const landmarks = pose.keypoints.map(kp => ({
          name: kp.name,
          x: kp.x,
          y: kp.y,
          z: kp.z,
          score: kp.score ?? 0
        }));
        
        // Get PunchStat using PunchStatMeasure
        const punchStat = this.punchStatMeasure.getPunchStat(landmarks, timestamp);
        
        // Update leadHand in punchStat
        punchStat.leadHand = this.leadHand;
        
        this.poseMetrics = {
          detectionConfidence: pose.confidence,
          keypointCount: totalKeypoints,
          visibleKeypoints: visibleKeypoints,
          poseStability: stability,
          trackingQuality: (averageConfidence + stability) / 2,
          movementIntensity: movementIntensity,
          poseDuration: (timestamp - (timestamp - 1000)) / 1000, // Mock duration
          averageKeypointConfidence: averageConfidence,
        };

        // Notify metrics update with PunchStat
        if (this.callbacks.onMetricsUpdate) {
          this.callbacks.onMetricsUpdate(punchStat);
        }

        if (this.callbacks.onPoseUpdate) {
          this.callbacks.onPoseUpdate(pose);
        }

        // Draw pose visualization
        this.drawPose(ctx, pose, visibleKeypoints, totalKeypoints, averageConfidence, stability, movementIntensity);
        
      } else {
        // No pose detected
        this.poseMetrics = {
          detectionConfidence: 0,
          keypointCount: 0,
          visibleKeypoints: 0,
          poseStability: 0,
          trackingQuality: 0,
          movementIntensity: 0,
          poseDuration: 0,
          averageKeypointConfidence: 0,
        };

        if (this.callbacks.onPoseUpdate) {
          this.callbacks.onPoseUpdate(null);
        }
        
        if (this.showOverlaysRef) {
          ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
          ctx.fillRect(10, 10, 200, 40);
          ctx.fillStyle = '#ffffff';
          ctx.font = '16px Arial';
          ctx.fillText('No Pose Detected', 20, 35);
        }
      }

      // Draw performance stats
      if (this.showOverlaysRef && this.poseDetectionService) {
        const stats = this.poseDetectionService.getStats();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(canvas.width - 220, 10, 210, 80);
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px Arial';
        ctx.fillText(`FPS: ${stats.currentFPS.toFixed(1)}`, canvas.width - 210, 25);
        ctx.fillText(`Processing: ${stats.avgProcessingTime.toFixed(1)}ms`, canvas.width - 210, 40);
        ctx.fillText(`Memory: ${stats.memoryUsage.toFixed(1)}MB`, canvas.width - 210, 55);
        ctx.fillText(`Poses Detected: ${stats.totalPoses || 0}`, canvas.width - 210, 70);
      }
      
    } catch (err) {
      console.error('Frame processing error:', err);
      if (this.callbacks.onError) {
        const message = err instanceof Error ? err.message : 'Processing error';
        this.callbacks.onError(message);
      }
    }
    
    // Continue animation loop only if still running
    if (this.isRunningRef) {
      this.animationFrameId = requestAnimationFrame(() => this.processFrame(videoElement, canvasElement));
    }
  }

  private drawPose(
    ctx: CanvasRenderingContext2D,
    pose: PoseDetectionResult,
    visibleKeypoints: number,
    totalKeypoints: number,
    averageConfidence: number,
    stability: number,
    movementIntensity: number
  ): void {
    ctx.strokeStyle = '#00ff00';
    ctx.fillStyle = '#ff0000';
    ctx.lineWidth = 2;
    
    // Draw skeleton connections
    const connections = [
      [5, 6], [5, 7], [7, 9], [6, 8], [8, 10], // Arms
      [5, 11], [6, 12], [11, 12], // Torso
      [11, 13], [13, 15], [12, 14], [14, 16] // Legs
    ];
    
    connections.forEach(([from, to]) => {
      if (pose.keypoints[from] && pose.keypoints[to] && 
          (pose.keypoints[from].score ?? 0) > 0.3 && (pose.keypoints[to].score ?? 0) > 0.3) {
        ctx.beginPath();
        ctx.moveTo(pose.keypoints[from].x, pose.keypoints[from].y);
        ctx.lineTo(pose.keypoints[to].x, pose.keypoints[to].y);
        ctx.stroke();
      }
    });
    
    // Draw keypoints with confidence-based colors
    pose.keypoints.forEach((kp, idx) => {
      const score = kp.score ?? 0;
      if (score > 0.3) {
        // Color based on confidence: red for low, yellow for medium, green for high
        if (score > 0.7) {
          ctx.fillStyle = '#00ff00'; // Green for high confidence
        } else if (score > 0.5) {
          ctx.fillStyle = '#ffff00'; // Yellow for medium confidence
        } else {
          ctx.fillStyle = '#ff8800'; // Orange for lower confidence
        }
        
        ctx.beginPath();
        ctx.arc(kp.x, kp.y, 4 + (score * 2), 0, 2 * Math.PI);
        ctx.fill();
        
        // Highlight critical keypoints (head, shoulders, hips)
        if (idx === 0 || idx === 5 || idx === 6 || idx === 11 || idx === 12) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(kp.x, kp.y, 8, 0, 2 * Math.PI);
          ctx.stroke();
        }
      }
    });
    
    // Draw pose information overlay if enabled
    if (this.showOverlaysRef) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(10, 10, 320, 160);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px Arial';
      ctx.fillText(`Pose Confidence: ${(pose.confidence * 100).toFixed(1)}%`, 20, 30);
      ctx.fillText(`Visible Keypoints: ${visibleKeypoints}/${totalKeypoints}`, 20, 50);
      ctx.fillText(`Avg Keypoint Confidence: ${(averageConfidence * 100).toFixed(1)}%`, 20, 70);
      ctx.fillText(`Pose Stability: ${(stability * 100).toFixed(1)}%`, 20, 90);
      ctx.fillText(`Tracking Quality: ${((averageConfidence + stability) / 2 * 100).toFixed(1)}%`, 20, 110);
      ctx.fillText(`Movement Intensity: ${(movementIntensity * 100).toFixed(1)}%`, 20, 130);
      ctx.fillText(`Detection ID: ${pose.id || 'N/A'}`, 20, 150);
    }
  }

  async start(videoElement: HTMLVideoElement, canvasElement: HTMLCanvasElement): Promise<void> {
    if (!this.poseDetectionService || !this.poseDetectionService.isReady()) {
      if (this.callbacks.onError) {
        this.callbacks.onError('Pose detection service not ready');
      }
      console.error('PoseDetectionService not ready');
      return;
    }
    
    this.isRunningRef = true;
    console.log('Starting pose detection and motion tracking...');
    console.log('PoseDetectionService ready:', this.poseDetectionService?.isReady());
    
    // Start the animation loop
    console.log('Starting animation frame loop...');
    this.animationFrameId = requestAnimationFrame(() => this.processFrame(videoElement, canvasElement));
    console.log('Animation frame ID:', this.animationFrameId);
  }

  stop(): void {
    this.isRunningRef = false;
    
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    // Reset smoothing state
    this.previousPose = null;
    
    console.log('Stopped pose detection');
  }

  cleanup(): void {
    console.log('Cleanup: stopping animation frame and stream...');
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.streamRef) {
      this.streamRef.getTracks().forEach(track => track.stop());
    }
  }

  dispose(): void {
    console.log('Component unmounting: disposing pose detection service...');
    if (this.poseDetectionService) {
      this.poseDetectionService.dispose();
      this.poseDetectionService = null;
    }
  }

  getMetrics(): { detectionConfidence: number; trackingQuality: number } {
    return {
      detectionConfidence: this.poseMetrics.detectionConfidence,
      trackingQuality: this.poseMetrics.trackingQuality
    };
  }

  isReady(): boolean {
    return this.poseDetectionService !== null && this.poseDetectionService.isReady();
  }

  isRunning(): boolean {
    return this.isRunningRef;
  }
}
