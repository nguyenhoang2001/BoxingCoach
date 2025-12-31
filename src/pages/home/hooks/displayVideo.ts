import React, { useCallback, useEffect, useRef, useState, useImperativeHandle } from "react";
import { VideoDisplayer } from "../components/VideoDisplayer";
import { DisplayVideoHandle, DisplayVideoProps } from "../interfaces";

export const displayVideo = (
  {
    onStart,
    onStop,
    isRunning: externalIsRunning,
    setIsInitialized: externalSetIsInitialized,
    onMetricsUpdate,
  }: DisplayVideoProps,
  ref: React.Ref<DisplayVideoHandle | null>
) => {
    const displayerRef = useRef<VideoDisplayer | null>(null);
    const [selectedCameraId, setSelectedCameraId] = useState<string | undefined>(undefined);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    
    const updateCanvasLayout = useCallback(() => {
    if (canvasRef.current && videoRef.current && videoRef.current.videoWidth > 0) {
      const videoWidth = videoRef.current.videoWidth;
      const videoHeight = videoRef.current.videoHeight;
      const containerWidth = videoRef.current.clientWidth;
      const containerHeight = videoRef.current.clientHeight;
      
      const videoAspect = videoWidth / videoHeight;
      const containerAspect = containerWidth / containerHeight;
      
      let scale, offsetX, offsetY;
      
      if (videoAspect > containerAspect) {
        scale = containerWidth / videoWidth;
        offsetX = 0;
        offsetY = (containerHeight - videoHeight * scale) / 2;
      } else {
        scale = containerHeight / videoHeight;
        offsetX = (containerWidth - videoWidth * scale) / 2;
        offsetY = 0;
      }
      
      canvasRef.current.style.width = `${videoWidth * scale}px`;
      canvasRef.current.style.height = `${videoHeight * scale}px`;
      canvasRef.current.style.position = 'absolute';
      canvasRef.current.style.left = `${offsetX}px`;
      canvasRef.current.style.top = `${offsetY}px`;
    }
  }, []);
      
      useEffect(() => {
        if (!displayerRef.current) {
          displayerRef.current = new VideoDisplayer({
            onInitialized: (initialized) => {
              if (externalSetIsInitialized) {
                externalSetIsInitialized(initialized);
              }
            },
            onMetricsUpdate: (metrics) => {
              if (onMetricsUpdate) {
                onMetricsUpdate(metrics);
              }
            },
            onError: (error) => {
              console.error('VideoDisplayer error:', error);
            }
          });
        }
      }, [externalSetIsInitialized, onMetricsUpdate]);
    
      useEffect(() => {
        window.addEventListener('resize', updateCanvasLayout);
        return () => window.removeEventListener('resize', updateCanvasLayout);
      }, [updateCanvasLayout]);
    
      useEffect(() => {
        const initialize = async () => {
          if (!displayerRef.current || !videoRef.current || !canvasRef.current) return;
    
          try {
            await displayerRef.current.initializeServices();
            
            if (displayerRef.current.isReady() && videoRef.current.readyState >= 2) {
              if (externalSetIsInitialized) {
                externalSetIsInitialized(true);
              }
            }
            
            await displayerRef.current.initializeCamera(
              videoRef.current,
              canvasRef.current,
              selectedCameraId,
              updateCanvasLayout
            );
          } catch (error) {
            console.error('Initialization error:', error);
          }
        };
    
        initialize();
    
        return () => {
          if (displayerRef.current) {
            displayerRef.current.cleanup();
          }
        };
      }, [selectedCameraId, externalSetIsInitialized, updateCanvasLayout]);
    
      // Cleanup pose detection service only on component unmount
      useEffect(() => {
        return () => {
          if (displayerRef.current) {
            displayerRef.current.dispose();
          }
        };
      }, []);
    
      const handleStart = useCallback(async () => {
        if (!displayerRef.current || !videoRef.current || !canvasRef.current) {
          console.error('Cannot start: missing refs');
          return;
        }
    
        try {
          if (onStart) {
            await onStart();
          }
    
          await displayerRef.current.start(videoRef.current, canvasRef.current);
        } catch (err) {
          console.error('Start error:', err);
        }
      }, [externalIsRunning, onStart]);
    
      const handleStop = useCallback(() => {
        if (!displayerRef.current) return;
    
        displayerRef.current.stop();
    
        if (onStop) {
          onStop();
        }
      }, [externalIsRunning, onStop]);
    
      const processFrame = useCallback(() => {
        if (!displayerRef.current || !videoRef.current || !canvasRef.current) return;
        displayerRef.current.processFrame(videoRef.current, canvasRef.current);
      }, []);
    
      const getMetrics = useCallback(() => {
        if (!displayerRef.current) {
          return { headAngle: 0, detectionConfidence: 0, trackingQuality: 0 };
        }
        return displayerRef.current.getMetrics();
      }, []);
    
      const setLeadHand = useCallback((isLeft: boolean) => {
        if (displayerRef.current) {
          displayerRef.current.setLeadHand(isLeft);
        }
      }, []);

      const setOverlaysVisible = useCallback((visible: boolean) => {
        if (displayerRef.current) {
          displayerRef.current.setOverlaysVisible(visible);
        }
      }, []);
    
      useImperativeHandle(ref, () => ({
        handleStart,
        handleStop,
        processFrame,
        getMetrics,
        setLeadHand,
        setOverlaysVisible
      }), [handleStart, handleStop, processFrame, getMetrics, setLeadHand, setOverlaysVisible]);
    
      const handleCameraSelect = (deviceId: string) => {
        setSelectedCameraId(deviceId);
      };

      return {
        videoRef,
        canvasRef,
        handleCameraSelect,
        selectedCameraId
      }
  }