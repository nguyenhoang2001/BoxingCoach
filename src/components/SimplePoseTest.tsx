/**
 * Simple Pose Detection Test Component
 * Minimal implementation to verify TensorFlow.js pose detection is working
 */

import React, { useRef, useEffect, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as poseDetection from '@tensorflow-models/pose-detection';

export const SimplePoseTest: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState('Initializing...');
  const [detector, setDetector] = useState<poseDetection.PoseDetector | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    initializePoseDetection();
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const initializePoseDetection = async () => {
    try {
      setStatus('Loading TensorFlow.js...');
      await tf.ready();
      console.log('TensorFlow.js loaded successfully');
      console.log('Backend:', tf.getBackend());

      setStatus('Loading pose detection model...');
      
      // Create detector with explicit model URL
      const detectorConfig: poseDetection.MoveNetModelConfig = {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
        enableSmoothing: false,
        minPoseScore: 0.25,
        multiPoseMaxDimension: 256
      };

      const detector = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        detectorConfig
      );
      
      setDetector(detector);
      console.log('Pose detector created successfully');

      setStatus('Requesting camera access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          // Resize canvas to match video
          if (canvasRef.current && videoRef.current) {
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
            console.log('SimplePoseTest canvas resized to:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);
          }
          
          setStatus('Camera ready - waiting for poses...');
          console.log('Video ready, starting detection...');
          detectPose();
        };
      }
    } catch (error) {
      console.error('Initialization error:', error);
      setStatus(`Error: ${error.message}`);
    }
  };

  const detectPose = async () => {
    if (!detector || !videoRef.current || !canvasRef.current) {
      console.log('Missing requirements:', { detector: !!detector, video: !!videoRef.current, canvas: !!canvasRef.current });
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      console.error('No canvas context');
      return;
    }

    // Make sure video is ready
    if (video.readyState < 2) {
      console.log('Video not ready, waiting...');
      animationRef.current = requestAnimationFrame(detectPose);
      return;
    }

    try {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw video frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Detect poses
      console.log('Running pose detection...');
      const poses = await detector.estimatePoses(video, {
        maxPoses: 1,
        flipHorizontal: false
      });

      console.log('Poses detected:', poses.length, poses);

      if (poses.length > 0) {
        setStatus(`Pose detected! Confidence: ${(poses[0].score * 100).toFixed(1)}%`);
        
        // Draw keypoints
        const pose = poses[0];
        ctx.fillStyle = 'red';
        ctx.strokeStyle = 'yellow';
        ctx.lineWidth = 2;

        // Draw each keypoint
        pose.keypoints.forEach((keypoint, idx) => {
          if (keypoint.score > 0.3) {
            const { x, y } = keypoint;
            
            // Draw point
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, 2 * Math.PI);
            ctx.fill();
            
            // Draw label
            ctx.fillStyle = 'white';
            ctx.font = '12px Arial';
            ctx.fillText(`${keypoint.name || idx}`, x + 10, y);
            ctx.fillStyle = 'red';
          }
        });

        // Draw skeleton
        const adjacentKeyPoints = poseDetection.util.getAdjacentPairs(poseDetection.SupportedModels.MoveNet);
        adjacentKeyPoints.forEach(([i, j]) => {
          const kp1 = pose.keypoints[i];
          const kp2 = pose.keypoints[j];
          
          if (kp1.score > 0.3 && kp2.score > 0.3) {
            ctx.beginPath();
            ctx.moveTo(kp1.x, kp1.y);
            ctx.lineTo(kp2.x, kp2.y);
            ctx.stroke();
          }
        });
      } else {
        setStatus('No pose detected - try moving into view');
      }
    } catch (error) {
      console.error('Detection error:', error);
      setStatus(`Detection error: ${error.message}`);
    }

    // Continue detection loop
    animationRef.current = requestAnimationFrame(detectPose);
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#f0f0f0', borderRadius: '8px' }}>
      <h3>Simple Pose Detection Test</h3>
      <p>Status: <strong>{status}</strong></p>
      
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <video
          ref={videoRef}
          width="320"
          height="240"
          autoPlay
          playsInline
          muted
          style={{ 
            position: 'absolute',
            visibility: 'hidden' // Hide video, only show canvas
          }}
        />
        <canvas
          ref={canvasRef}
          width="320"
          height="240"
          style={{
            border: '2px solid black',
            borderRadius: '4px'
          }}
        />
      </div>
      
      <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
        <p>This component directly uses TensorFlow.js pose detection.</p>
        <p>Red dots = keypoints, Yellow lines = skeleton</p>
        <p>Check browser console for detailed logs.</p>
      </div>
    </div>
  );
};