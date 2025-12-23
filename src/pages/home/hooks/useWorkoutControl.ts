import { useCallback, useRef, useState } from 'react';

export interface UseWorkoutControlProps {
  onStart?: () => void;
  onStop?: () => void;
  onProcessFrame?: () => void;
}

export function useWorkoutControl({
  onStart,
  onStop,
  onProcessFrame,
}: UseWorkoutControlProps = {}) {
  const [isRunning, setIsRunning] = useState(false);
  const [canStart, setCanStart] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const animationFrameRef = useRef<number | null>(null);
  const isRunningRef = useRef(false);

  const handleStart = useCallback(async () => {
    console.log('handleStart called - isInitialized:', isInitialized);
    if (!isInitialized) {
      setError('Camera not initialized');
      return;
    }
    
    try {
      setIsRunning(true);
      isRunningRef.current = true;
      setCanStart(false);
      setError(null);
      console.log('Starting pose detection and motion tracking...');
      
      // Call custom onStart callback if provided
      if (onStart) {
        await onStart();
      }
      
      // Start the animation loop if processFrame callback provided
      if (onProcessFrame) {
        const processFrame = () => {
          if (isRunningRef.current) {
            onProcessFrame();
            animationFrameRef.current = requestAnimationFrame(processFrame);
          }
        };
        console.log('Starting animation frame loop...');
        animationFrameRef.current = requestAnimationFrame(processFrame);
        console.log('Animation frame ID:', animationFrameRef.current);
      }
    } catch (err) {
      setError('Failed to start detection');
      console.error('Start error:', err);
    }
  }, [isInitialized, onStart, onProcessFrame]);

  const handleStop = useCallback(() => {
    setIsRunning(false);
    isRunningRef.current = false;
    setCanStart(true);
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    console.log('Stopping pose detection...');
    
    // Call custom onStop callback if provided
    if (onStop) {
      onStop();
    }
  }, [onStop]);

  const handleReset = useCallback(() => {
    handleStop();
  }, [handleStop]);

  return {
    isRunning,
    canStart,
    isInitialized,
    error,
    setIsInitialized,
    setCanStart,
    setError,
    handleStart,
    handleStop,
    handleReset,
    animationFrameRef,
    isRunningRef,
  };
}
