import * as poseDetection from '@tensorflow-models/pose-detection';
import * as tf from '@tensorflow/tfjs';
import type { Keypoint, PoseData } from '../types';

export interface PoseEstimationConfig {
  model: string;
  confidenceThreshold: number;
  maxPoses: number;
}

export interface PoseEstimationResult {
  success: boolean;
  error?: string;
}

export interface PerformanceStats {
  totalDetections: number;
  averageDetectionTime: number;
  lastDetectionTime: number;
}

export class PoseEstimationService {
  private detector: poseDetection.PoseDetector | null = null;
  private initialized = false;
  private configuration: PoseEstimationConfig;
  private performanceStats: PerformanceStats;

  constructor() {
    this.configuration = {
      model: 'MoveNet',
      confidenceThreshold: 0.7,
      maxPoses: 1,
    };

    this.performanceStats = {
      totalDetections: 0,
      averageDetectionTime: 0,
      lastDetectionTime: 0,
    };
  }

  /**
   * Initialize the pose estimation service
   */
  async initialize(modelName?: string): Promise<PoseEstimationResult> {
    try {
      // Initialize TensorFlow.js
      await tf.ready();

      // Set model name if provided
      if (modelName) {
        this.configuration.model = modelName;
      }

      // Create pose detector
      const model = this.getModelType(this.configuration.model);
      this.detector = await poseDetection.createDetector(model);

      this.initialized = true;
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Pose estimation initialization failed',
      };
    }
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Detect poses from image data
   */
  async detectPose(imageData: any): Promise<PoseData | null> {
    if (!this.initialized || !this.detector) {
      throw new Error('Pose estimation service not initialized');
    }

    try {
      const startTime = performance.now();

      const poses = await this.detector.estimatePoses(imageData);
      
      const detectionTime = performance.now() - startTime;
      this.updatePerformanceStats(detectionTime);

      if (poses.length === 0) {
        return null;
      }

      const pose = poses[0];

      // Filter by confidence threshold
      if (pose.score && pose.score < this.configuration.confidenceThreshold) {
        return null;
      }

      // Convert to our PoseData format
      const keypoints: Keypoint[] = pose.keypoints.map(kp => ({
        x: kp.x,
        y: kp.y,
        confidence: kp.score || 0,
        name: kp.name || '',
      }));

      return {
        keypoints,
        confidence: pose.score || 0,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.warn('Pose detection error:', error);
      return null;
    }
  }

  /**
   * Get current configuration
   */
  getConfiguration(): PoseEstimationConfig {
    return { ...this.configuration };
  }

  /**
   * Set confidence threshold for pose detection
   */
  setConfidenceThreshold(threshold: number): void {
    this.configuration.confidenceThreshold = threshold;
  }

  /**
   * Set maximum number of poses to detect
   */
  setMaxPoses(maxPoses: number): void {
    this.configuration.maxPoses = maxPoses;
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): PerformanceStats {
    return { ...this.performanceStats };
  }

  /**
   * Reset performance statistics
   */
  resetPerformanceStats(): void {
    this.performanceStats = {
      totalDetections: 0,
      averageDetectionTime: 0,
      lastDetectionTime: 0,
    };
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    if (this.detector) {
      this.detector.dispose();
      this.detector = null;
    }
    this.initialized = false;
  }

  /**
   * Get TensorFlow model type from string
   */
  private getModelType(modelName: string): poseDetection.SupportedModels {
    switch (modelName) {
      case 'PoseNet':
        return poseDetection.SupportedModels.PoseNet;
      case 'MoveNet':
      default:
        return poseDetection.SupportedModels.MoveNet;
    }
  }

  /**
   * Update performance statistics
   */
  private updatePerformanceStats(detectionTime: number): void {
    this.performanceStats.totalDetections++;
    this.performanceStats.lastDetectionTime = detectionTime;
    
    // Calculate running average
    const totalTime = this.performanceStats.averageDetectionTime * (this.performanceStats.totalDetections - 1) + detectionTime;
    this.performanceStats.averageDetectionTime = totalTime / this.performanceStats.totalDetections;
  }
}

// Singleton instance
export const poseEstimationService = new PoseEstimationService(); 