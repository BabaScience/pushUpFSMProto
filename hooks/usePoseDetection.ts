import { useCallback, useEffect, useRef, useState } from 'react';
import type { PerformanceStats, PoseEstimationConfig } from '../services/poseEstimationService';
import { poseEstimationService } from '../services/poseEstimationService';
import type { PoseData } from '../types';

export interface UsePoseDetectionOptions {
  model?: string;
  confidenceThreshold?: number;
  maxPoses?: number;
}

export interface UsePoseDetectionReturn {
  // State
  isInitialized: boolean;
  isLoading: boolean;
  isDetecting: boolean;
  error: string | null;

  // Actions
  detectPose: (imageData: any) => Promise<PoseData | null>;
  retry: () => Promise<void>;

  // Real-time Detection
  startRealTimeDetection: (onPoseDetected: (pose: PoseData) => void) => void;
  stopRealTimeDetection: () => void;

  // Configuration
  getConfiguration: () => PoseEstimationConfig;
  setConfidenceThreshold: (threshold: number) => void;
  setMaxPoses: (maxPoses: number) => void;

  // Performance
  getPerformanceStats: () => PerformanceStats;
  resetPerformanceStats: () => void;
}

export function usePoseDetection(options?: UsePoseDetectionOptions): UsePoseDetectionReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const detectionCallbackRef = useRef<((pose: PoseData) => void) | null>(null);

  // Get current state from service
  const isInitialized = poseEstimationService.isInitialized();

  /**
   * Initialize pose estimation service
   */
  const initializePoseDetection = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await poseEstimationService.initialize(options?.model);
      
      if (!result.success) {
        setError(result.error || 'Failed to initialize pose detection');
      } else {
        // Apply initial configuration
        if (options?.confidenceThreshold) {
          poseEstimationService.setConfidenceThreshold(options.confidenceThreshold);
        }
        if (options?.maxPoses) {
          poseEstimationService.setMaxPoses(options.maxPoses);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pose detection initialization failed');
    } finally {
      setIsLoading(false);
    }
  }, [options?.model, options?.confidenceThreshold, options?.maxPoses]);

  /**
   * Detect pose from image data
   */
  const detectPose = useCallback(async (imageData: any): Promise<PoseData | null> => {
    if (!poseEstimationService.isInitialized()) {
      throw new Error('Pose estimation service not initialized');
    }

    try {
      setError(null);
      const pose = await poseEstimationService.detectPose(imageData);
      
      // Call real-time detection callback if active
      if (pose && detectionCallbackRef.current && isDetecting) {
        try {
          detectionCallbackRef.current(pose);
        } catch (callbackError) {
          console.warn('Error in pose detection callback:', callbackError);
        }
      }

      return pose;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Pose detection failed';
      setError(errorMessage);
      return null;
    }
  }, [isDetecting]);

  /**
   * Retry pose detection initialization
   */
  const retry = useCallback(async () => {
    await initializePoseDetection();
  }, [initializePoseDetection]);

  /**
   * Start real-time pose detection
   */
  const startRealTimeDetection = useCallback((onPoseDetected: (pose: PoseData) => void) => {
    detectionCallbackRef.current = onPoseDetected;
    setIsDetecting(true);
  }, []);

  /**
   * Stop real-time pose detection
   */
  const stopRealTimeDetection = useCallback(() => {
    detectionCallbackRef.current = null;
    setIsDetecting(false);
  }, []);

  /**
   * Get pose detection configuration
   */
  const getConfiguration = useCallback(() => {
    return poseEstimationService.getConfiguration();
  }, []);

  /**
   * Set confidence threshold
   */
  const setConfidenceThreshold = useCallback((threshold: number) => {
    poseEstimationService.setConfidenceThreshold(threshold);
  }, []);

  /**
   * Set maximum number of poses to detect
   */
  const setMaxPoses = useCallback((maxPoses: number) => {
    poseEstimationService.setMaxPoses(maxPoses);
  }, []);

  /**
   * Get performance statistics
   */
  const getPerformanceStats = useCallback(() => {
    return poseEstimationService.getPerformanceStats();
  }, []);

  /**
   * Reset performance statistics
   */
  const resetPerformanceStats = useCallback(() => {
    poseEstimationService.resetPerformanceStats();
  }, []);

  /**
   * Initialize pose detection on mount
   */
  useEffect(() => {
    initializePoseDetection();
  }, [initializePoseDetection]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      setIsDetecting(false);
      detectionCallbackRef.current = null;
      poseEstimationService.cleanup();
    };
  }, []);

  return {
    // State
    isInitialized,
    isLoading,
    isDetecting,
    error,

    // Actions
    detectPose,
    retry,

    // Real-time Detection
    startRealTimeDetection,
    stopRealTimeDetection,

    // Configuration
    getConfiguration,
    setConfidenceThreshold,
    setMaxPoses,

    // Performance
    getPerformanceStats,
    resetPerformanceStats,
  };
} 