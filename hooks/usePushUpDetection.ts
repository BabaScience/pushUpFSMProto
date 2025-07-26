import { useCallback, useEffect, useRef, useState } from 'react';
import { PushUpState, type PoseData } from '../types';
import { PushUpFSM } from '../utils/pushUpFSM';
import { useCamera } from './useCamera';
import { usePoseDetection } from './usePoseDetection';

export interface SessionStats {
  totalReps: number;
  currentState: PushUpState;
  averageFormQuality: number;
  sessionDuration: number;
  startTime: number;
}

export interface UsePushUpDetectionReturn {
  // State
  isReady: boolean;
  isActive: boolean;
  currentState: PushUpState;
  repCount: number;
  currentPose: PoseData | null;
  formQuality: number;
  formFeedback: string[];
  error: string | null;

  // Actions
  startDetection: () => void;
  stopDetection: () => void;
  reset: () => void;

  // Session
  getSessionStats: () => SessionStats;
}

export function usePushUpDetection(): UsePushUpDetectionReturn {
  const camera = useCamera();
  const poseDetection = usePoseDetection();
  
  const [isActive, setIsActive] = useState(false);
  const [formQualityHistory, setFormQualityHistory] = useState<number[]>([]);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  
  const fsmRef = useRef<PushUpFSM>(new PushUpFSM());
  const frameProcessorRef = useRef<((frame: any) => Promise<void>) | null>(null);

  // Computed state from FSM
  const currentState = fsmRef.current.getCurrentState();
  const repCount = fsmRef.current.getRepCount();
  const currentPose = fsmRef.current.getCurrentPose();

  // System readiness
  const isReady = camera.isInitialized && poseDetection.isInitialized && !camera.error && !poseDetection.error;
  
  // Error handling - prioritize camera errors over pose detection errors
  const error = camera.error || poseDetection.error;

  // Current form metrics (from latest FSM result)
  const [currentFormQuality, setCurrentFormQuality] = useState(0);
  const [currentFormFeedback, setCurrentFormFeedback] = useState<string[]>([]);

  /**
   * Frame processor that handles camera frames
   */
  const createFrameProcessor = useCallback(() => {
    return async (frame: any) => {
      try {
        // Detect pose from frame
        const pose = await poseDetection.detectPose(frame);
        
        if (pose) {
          // Process pose through FSM
          const result = fsmRef.current.processPose(pose);
          
          // Update form metrics
          setCurrentFormQuality(result.formQuality || 0);
          setCurrentFormFeedback(result.formFeedback || []);
          
          // Track form quality history for statistics
          if (result.formQuality !== undefined) {
            setFormQualityHistory(prev => [...prev.slice(-29), result.formQuality!]);
          }
        }
      } catch (err) {
        console.warn('Error processing frame:', err);
      }
    };
  }, [poseDetection]);

  /**
   * Start push-up detection
   */
  const startDetection = useCallback(() => {
    if (!isReady) {
      console.warn('Cannot start detection: system not ready');
      return;
    }

    try {
      // Create and store frame processor
      const processor = createFrameProcessor();
      frameProcessorRef.current = processor;

      // Start camera frame processing
      camera.startFrameProcessing(processor);
      
      // Start pose detection (though we handle it in frame processor)
      poseDetection.startRealTimeDetection(() => {
        // This callback is handled in the frame processor instead
      });

      // Mark session as active
      setIsActive(true);
      setSessionStartTime(Date.now());
      
    } catch (err) {
      console.error('Error starting detection:', err);
    }
  }, [isReady, camera, poseDetection, createFrameProcessor]);

  /**
   * Stop push-up detection
   */
  const stopDetection = useCallback(() => {
    try {
      // Stop camera frame processing
      camera.stopFrameProcessing();
      
      // Stop pose detection
      poseDetection.stopRealTimeDetection();

      // Clear frame processor reference
      frameProcessorRef.current = null;

      // Mark session as inactive
      setIsActive(false);
      
    } catch (err) {
      console.error('Error stopping detection:', err);
    }
  }, [camera, poseDetection]);

  /**
   * Reset detection state
   */
  const reset = useCallback(() => {
    // Stop detection if active
    if (isActive) {
      stopDetection();
    }

    // Reset FSM
    fsmRef.current.reset();
    
    // Reset local state
    setCurrentFormQuality(0);
    setCurrentFormFeedback([]);
    setFormQualityHistory([]);
    setSessionStartTime(null);
    
  }, [isActive, stopDetection]);

  /**
   * Get session statistics
   */
  const getSessionStats = useCallback((): SessionStats => {
    const averageFormQuality = formQualityHistory.length > 0 
      ? formQualityHistory.reduce((sum, quality) => sum + quality, 0) / formQualityHistory.length
      : 0;

    const sessionDuration = sessionStartTime 
      ? Date.now() - sessionStartTime 
      : 0;

    return {
      totalReps: repCount,
      currentState,
      averageFormQuality,
      sessionDuration,
      startTime: sessionStartTime || 0,
    };
  }, [formQualityHistory, sessionStartTime, repCount, currentState]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (isActive) {
        stopDetection();
      }
    };
  }, [isActive, stopDetection]);

  /**
   * Handle system state changes
   */
  useEffect(() => {
    // If system becomes not ready while active, stop detection
    if (isActive && !isReady) {
      stopDetection();
    }
  }, [isActive, isReady, stopDetection]);

  return {
    // State
    isReady,
    isActive,
    currentState,
    repCount,
    currentPose,
    formQuality: currentFormQuality,
    formFeedback: currentFormFeedback,
    error,

    // Actions
    startDetection,
    stopDetection,
    reset,

    // Session
    getSessionStats,
  };
} 