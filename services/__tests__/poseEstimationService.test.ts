import { PoseEstimationService } from '../poseEstimationService';

// Mock TensorFlow.js
jest.mock('@tensorflow/tfjs', () => ({
  ready: jest.fn(() => Promise.resolve()),
}));

jest.mock('@tensorflow-models/pose-detection', () => ({
  SupportedModels: {
    MoveNet: 'MoveNet',
    PoseNet: 'PoseNet',
  },
  createDetector: jest.fn(),
}));

import * as poseDetection from '@tensorflow-models/pose-detection';
import * as tf from '@tensorflow/tfjs';

describe('PoseEstimationService', () => {
  let poseService: PoseEstimationService;
  const mockDetector = {
    estimatePoses: jest.fn(),
    dispose: jest.fn(),
  };

  beforeEach(() => {
    poseService = new PoseEstimationService();
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    test('should initialize TensorFlow successfully', async () => {
      (tf.ready as jest.Mock).mockResolvedValue(undefined);
      (poseDetection.createDetector as jest.Mock).mockResolvedValue(mockDetector);

      const result = await poseService.initialize();

      expect(result.success).toBe(true);
      expect(tf.ready).toHaveBeenCalled();
      expect(poseDetection.createDetector).toHaveBeenCalledWith(
        poseDetection.SupportedModels.MoveNet
      );
    });

    test('should handle TensorFlow initialization failure', async () => {
      (tf.ready as jest.Mock).mockRejectedValue(new Error('TF init failed'));

      const result = await poseService.initialize();

      expect(result.success).toBe(false);
      expect(result.error).toContain('TF init failed');
    });

    test('should handle model loading failure', async () => {
      (tf.ready as jest.Mock).mockResolvedValue(undefined);
      (poseDetection.createDetector as jest.Mock).mockRejectedValue(
        new Error('Model loading failed')
      );

      const result = await poseService.initialize();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Model loading failed');
    });

    test('should initialize with custom model', async () => {
      (tf.ready as jest.Mock).mockResolvedValue(undefined);
      (poseDetection.createDetector as jest.Mock).mockResolvedValue(mockDetector);

      const result = await poseService.initialize('PoseNet');

      expect(result.success).toBe(true);
      expect(poseDetection.createDetector).toHaveBeenCalledWith(
        poseDetection.SupportedModels.PoseNet
      );
    });
  });

  describe('Pose Detection', () => {
    beforeEach(async () => {
      (tf.ready as jest.Mock).mockResolvedValue(undefined);
      (poseDetection.createDetector as jest.Mock).mockResolvedValue(mockDetector);
      await poseService.initialize();
    });

    test('should detect poses from image data', async () => {
      const mockPoseData = {
        keypoints: [
          { x: 100, y: 100, confidence: 0.9, name: 'nose' },
          { x: 90, y: 120, confidence: 0.8, name: 'left_shoulder' },
        ],
        score: 0.85,
      };

      mockDetector.estimatePoses.mockResolvedValue([mockPoseData]);

      const mockImageData = {
        width: 640,
        height: 480,
        data: new Uint8Array(640 * 480 * 4),
      };

      const result = await poseService.detectPose(mockImageData);

      expect(result).not.toBeNull();
      expect(result!.keypoints).toHaveLength(2);
      expect(result!.confidence).toBe(0.85);
      expect(mockDetector.estimatePoses).toHaveBeenCalledWith(mockImageData);
    });

    test('should return null when no poses detected', async () => {
      mockDetector.estimatePoses.mockResolvedValue([]);

      const mockImageData = {
        width: 640,
        height: 480,
        data: new Uint8Array(640 * 480 * 4),
      };

      const result = await poseService.detectPose(mockImageData);

      expect(result).toBeNull();
    });

    test('should handle detection errors gracefully', async () => {
      mockDetector.estimatePoses.mockRejectedValue(new Error('Detection failed'));

      const mockImageData = {
        width: 640,
        height: 480,
        data: new Uint8Array(640 * 480 * 4),
      };

      const result = await poseService.detectPose(mockImageData);

      expect(result).toBeNull();
    });

    test('should throw error when not initialized', async () => {
      const uninitializedService = new PoseEstimationService();
      const mockImageData = {
        width: 640,
        height: 480,
        data: new Uint8Array(640 * 480 * 4),
      };

      await expect(uninitializedService.detectPose(mockImageData)).rejects.toThrow(
        'Pose estimation service not initialized'
      );
    });

    test('should filter poses by confidence threshold', async () => {
      const lowConfidencePose = {
        keypoints: [
          { x: 100, y: 100, confidence: 0.9, name: 'nose' },
          { x: 90, y: 120, confidence: 0.4, name: 'left_shoulder' }, // Low confidence
        ],
        score: 0.5, // Below default threshold
      };

      mockDetector.estimatePoses.mockResolvedValue([lowConfidencePose]);

      const mockImageData = {
        width: 640,
        height: 480,
        data: new Uint8Array(640 * 480 * 4),
      };

      const result = await poseService.detectPose(mockImageData);

      expect(result).toBeNull();
    });
  });

  describe('Configuration', () => {
    beforeEach(async () => {
      (tf.ready as jest.Mock).mockResolvedValue(undefined);
      (poseDetection.createDetector as jest.Mock).mockResolvedValue(mockDetector);
      await poseService.initialize();
    });

    test('should update confidence threshold', () => {
      poseService.setConfidenceThreshold(0.8);
      
      const config = poseService.getConfiguration();
      expect(config.confidenceThreshold).toBe(0.8);
    });

    test('should get current configuration', () => {
      const config = poseService.getConfiguration();
      
      expect(config).toHaveProperty('model');
      expect(config).toHaveProperty('confidenceThreshold');
      expect(config).toHaveProperty('maxPoses');
    });

    test('should update max poses', () => {
      poseService.setMaxPoses(2);
      
      const config = poseService.getConfiguration();
      expect(config.maxPoses).toBe(2);
    });
  });

  describe('Service Lifecycle', () => {
    beforeEach(async () => {
      (tf.ready as jest.Mock).mockResolvedValue(undefined);
      (poseDetection.createDetector as jest.Mock).mockResolvedValue(mockDetector);
      await poseService.initialize();
    });

    test('should check if service is initialized', () => {
      expect(poseService.isInitialized()).toBe(true);
    });

    test('should cleanup resources', () => {
      poseService.cleanup();

      expect(mockDetector.dispose).toHaveBeenCalled();
      expect(poseService.isInitialized()).toBe(false);
    });

    test('should handle cleanup when not initialized', () => {
      const uninitializedService = new PoseEstimationService();
      
      expect(() => uninitializedService.cleanup()).not.toThrow();
    });
  });

  describe('Performance Monitoring', () => {
    beforeEach(async () => {
      (tf.ready as jest.Mock).mockResolvedValue(undefined);
      (poseDetection.createDetector as jest.Mock).mockResolvedValue(mockDetector);
      await poseService.initialize();
    });

         test('should track detection performance', async () => {
       const mockPoseData = {
         keypoints: [{ x: 100, y: 100, confidence: 0.9, name: 'nose' }],
         score: 0.85,
       };

       mockDetector.estimatePoses.mockResolvedValue([mockPoseData]);

       const mockImageData = {
         width: 640,
         height: 480,
         data: new Uint8Array(640 * 480 * 4),
       };

       await poseService.detectPose(mockImageData);
       
       const stats = poseService.getPerformanceStats();
       
       expect(stats.totalDetections).toBe(1);
       expect(stats.averageDetectionTime).toBeGreaterThanOrEqual(0);
     });

    test('should reset performance stats', async () => {
      const mockPoseData = {
        keypoints: [{ x: 100, y: 100, confidence: 0.9, name: 'nose' }],
        score: 0.85,
      };

      mockDetector.estimatePoses.mockResolvedValue([mockPoseData]);

      const mockImageData = {
        width: 640,
        height: 480,
        data: new Uint8Array(640 * 480 * 4),
      };

      await poseService.detectPose(mockImageData);
      poseService.resetPerformanceStats();
      
      const stats = poseService.getPerformanceStats();
      
      expect(stats.totalDetections).toBe(0);
      expect(stats.averageDetectionTime).toBe(0);
    });
  });
}); 