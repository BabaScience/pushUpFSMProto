import { act, renderHook } from '@testing-library/react-native';
import { poseEstimationService } from '../../services/poseEstimationService';
import type { PoseData } from '../../types';
import { usePoseDetection } from '../usePoseDetection';

// Mock the pose estimation service
jest.mock('../../services/poseEstimationService', () => ({
  poseEstimationService: {
    initialize: jest.fn(),
    cleanup: jest.fn(),
    isInitialized: jest.fn(),
    detectPose: jest.fn(),
    getConfiguration: jest.fn(),
    setConfidenceThreshold: jest.fn(),
    setMaxPoses: jest.fn(),
    getPerformanceStats: jest.fn(),
    resetPerformanceStats: jest.fn(),
  },
}));

describe('usePoseDetection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize pose detection service on mount', async () => {
      (poseEstimationService.initialize as jest.Mock).mockResolvedValue({ success: true });
      (poseEstimationService.isInitialized as jest.Mock).mockReturnValue(false);

      const { result } = renderHook(() => usePoseDetection());

      expect(result.current.isInitialized).toBe(false);
      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(poseEstimationService.initialize).toHaveBeenCalled();
    });

    test('should handle initialization success', async () => {
      (poseEstimationService.initialize as jest.Mock).mockResolvedValue({ success: true });
      (poseEstimationService.isInitialized as jest.Mock).mockReturnValue(true);

      const { result } = renderHook(() => usePoseDetection());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.isInitialized).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    test('should handle initialization failure', async () => {
      const errorMessage = 'TensorFlow initialization failed';
      (poseEstimationService.initialize as jest.Mock).mockResolvedValue({ 
        success: false, 
        error: errorMessage 
      });
      (poseEstimationService.isInitialized as jest.Mock).mockReturnValue(false);

      const { result } = renderHook(() => usePoseDetection());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.isInitialized).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(errorMessage);
    });

    test('should initialize with custom model', async () => {
      (poseEstimationService.initialize as jest.Mock).mockResolvedValue({ success: true });

      const { result } = renderHook(() => usePoseDetection({ model: 'PoseNet' }));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(poseEstimationService.initialize).toHaveBeenCalledWith('PoseNet');
    });
  });

  describe('Pose Detection', () => {
    beforeEach(async () => {
      (poseEstimationService.initialize as jest.Mock).mockResolvedValue({ success: true });
      (poseEstimationService.isInitialized as jest.Mock).mockReturnValue(true);
    });

    test('should detect pose from image data', async () => {
      const mockPose: PoseData = {
        keypoints: [
          { x: 100, y: 100, confidence: 0.9, name: 'nose' },
          { x: 90, y: 120, confidence: 0.8, name: 'left_shoulder' },
        ],
        confidence: 0.85,
        timestamp: Date.now(),
      };

      (poseEstimationService.detectPose as jest.Mock).mockResolvedValue(mockPose);

      const { result } = renderHook(() => usePoseDetection());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      const mockImageData = {
        width: 640,
        height: 480,
        data: new Uint8Array(640 * 480 * 4),
      };

      let detectedPose: PoseData | null = null;
      await act(async () => {
        detectedPose = await result.current.detectPose(mockImageData);
      });

      expect(detectedPose).toEqual(mockPose);
      expect(poseEstimationService.detectPose).toHaveBeenCalledWith(mockImageData);
    });

    test('should handle pose detection errors', async () => {
      (poseEstimationService.detectPose as jest.Mock).mockRejectedValue(
        new Error('Detection failed')
      );

      const { result } = renderHook(() => usePoseDetection());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      const mockImageData = {
        width: 640,
        height: 480,
        data: new Uint8Array(640 * 480 * 4),
      };

      let detectedPose: PoseData | null = null;
      await act(async () => {
        detectedPose = await result.current.detectPose(mockImageData);
      });

      expect(detectedPose).toBeNull();
      expect(result.current.error).toContain('Detection failed');
    });

    test('should return null when no poses detected', async () => {
      (poseEstimationService.detectPose as jest.Mock).mockResolvedValue(null);

      const { result } = renderHook(() => usePoseDetection());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      const mockImageData = {
        width: 640,
        height: 480,
        data: new Uint8Array(640 * 480 * 4),
      };

      let detectedPose: PoseData | null = null;
      await act(async () => {
        detectedPose = await result.current.detectPose(mockImageData);
      });

      expect(detectedPose).toBeNull();
    });

    test('should throw error when not initialized', async () => {
      (poseEstimationService.isInitialized as jest.Mock).mockReturnValue(false);

      const { result } = renderHook(() => usePoseDetection());

      const mockImageData = {
        width: 640,
        height: 480,
        data: new Uint8Array(640 * 480 * 4),
      };

      await expect(async () => {
        await act(async () => {
          await result.current.detectPose(mockImageData);
        });
      }).rejects.toThrow('not initialized');
    });
  });

  describe('Configuration Management', () => {
    beforeEach(async () => {
      (poseEstimationService.initialize as jest.Mock).mockResolvedValue({ success: true });
      (poseEstimationService.isInitialized as jest.Mock).mockReturnValue(true);
    });

    test('should get configuration', () => {
      const mockConfig = {
        model: 'MoveNet',
        confidenceThreshold: 0.7,
        maxPoses: 1,
      };
      (poseEstimationService.getConfiguration as jest.Mock).mockReturnValue(mockConfig);

      const { result } = renderHook(() => usePoseDetection());

      expect(result.current.getConfiguration()).toEqual(mockConfig);
    });

    test('should update confidence threshold', () => {
      const { result } = renderHook(() => usePoseDetection());

      act(() => {
        result.current.setConfidenceThreshold(0.8);
      });

      expect(poseEstimationService.setConfidenceThreshold).toHaveBeenCalledWith(0.8);
    });

    test('should update max poses', () => {
      const { result } = renderHook(() => usePoseDetection());

      act(() => {
        result.current.setMaxPoses(2);
      });

      expect(poseEstimationService.setMaxPoses).toHaveBeenCalledWith(2);
    });
  });

  describe('Performance Monitoring', () => {
    beforeEach(async () => {
      (poseEstimationService.initialize as jest.Mock).mockResolvedValue({ success: true });
      (poseEstimationService.isInitialized as jest.Mock).mockReturnValue(true);
    });

    test('should get performance stats', () => {
      const mockStats = {
        totalDetections: 100,
        averageDetectionTime: 50,
        lastDetectionTime: 45,
      };
      (poseEstimationService.getPerformanceStats as jest.Mock).mockReturnValue(mockStats);

      const { result } = renderHook(() => usePoseDetection());

      expect(result.current.getPerformanceStats()).toEqual(mockStats);
    });

    test('should reset performance stats', () => {
      const { result } = renderHook(() => usePoseDetection());

      act(() => {
        result.current.resetPerformanceStats();
      });

      expect(poseEstimationService.resetPerformanceStats).toHaveBeenCalled();
    });
  });

  describe('Real-time Processing', () => {
    beforeEach(async () => {
      (poseEstimationService.initialize as jest.Mock).mockResolvedValue({ success: true });
      (poseEstimationService.isInitialized as jest.Mock).mockReturnValue(true);
    });

    test('should start real-time detection', async () => {
      const mockPose: PoseData = {
        keypoints: [{ x: 100, y: 100, confidence: 0.9, name: 'nose' }],
        confidence: 0.85,
        timestamp: Date.now(),
      };

      (poseEstimationService.detectPose as jest.Mock).mockResolvedValue(mockPose);

      const onPoseDetected = jest.fn();
      const { result } = renderHook(() => usePoseDetection());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      act(() => {
        result.current.startRealTimeDetection(onPoseDetected);
      });

      expect(result.current.isDetecting).toBe(true);

      // Simulate frame processing
      const mockImageData = {
        width: 640,
        height: 480,
        data: new Uint8Array(640 * 480 * 4),
      };

      await act(async () => {
        // Trigger frame processing manually for testing
        await result.current.detectPose(mockImageData);
      });

      expect(onPoseDetected).toHaveBeenCalledWith(mockPose);
    });

    test('should stop real-time detection', () => {
      const { result } = renderHook(() => usePoseDetection());

      act(() => {
        result.current.startRealTimeDetection(jest.fn());
      });

      expect(result.current.isDetecting).toBe(true);

      act(() => {
        result.current.stopRealTimeDetection();
      });

      expect(result.current.isDetecting).toBe(false);
    });

    test('should handle detection callback errors gracefully', async () => {
      const mockPose: PoseData = {
        keypoints: [{ x: 100, y: 100, confidence: 0.9, name: 'nose' }],
        confidence: 0.85,
        timestamp: Date.now(),
      };

      (poseEstimationService.detectPose as jest.Mock).mockResolvedValue(mockPose);

      const errorCallback = jest.fn(() => {
        throw new Error('Callback error');
      });

      const { result } = renderHook(() => usePoseDetection());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      act(() => {
        result.current.startRealTimeDetection(errorCallback);
      });

      const mockImageData = {
        width: 640,
        height: 480,
        data: new Uint8Array(640 * 480 * 4),
      };

      // Should not throw error
      await act(async () => {
        await result.current.detectPose(mockImageData);
      });

      expect(errorCallback).toHaveBeenCalled();
    });
  });

  describe('Lifecycle Management', () => {
    test('should cleanup on unmount', () => {
      const { unmount } = renderHook(() => usePoseDetection());

      unmount();

      expect(poseEstimationService.cleanup).toHaveBeenCalled();
    });

    test('should stop detection on unmount', () => {
      const { result, unmount } = renderHook(() => usePoseDetection());

      act(() => {
        result.current.startRealTimeDetection(jest.fn());
      });

      expect(result.current.isDetecting).toBe(true);

      unmount();

      // Detection should be stopped during cleanup
      expect(poseEstimationService.cleanup).toHaveBeenCalled();
    });
  });

  describe('Error Recovery', () => {
    test('should retry initialization after error', async () => {
      (poseEstimationService.initialize as jest.Mock)
        .mockResolvedValueOnce({ success: false, error: 'Initial error' })
        .mockResolvedValueOnce({ success: true });

      const { result } = renderHook(() => usePoseDetection());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.error).toBe('Initial error');

      await act(async () => {
        await result.current.retry();
      });

      expect(poseEstimationService.initialize).toHaveBeenCalledTimes(2);
    });

    test('should clear errors on successful operations', async () => {
      (poseEstimationService.detectPose as jest.Mock)
        .mockRejectedValueOnce(new Error('Detection error'))
        .mockResolvedValueOnce({
          keypoints: [{ x: 100, y: 100, confidence: 0.9, name: 'nose' }],
          confidence: 0.85,
          timestamp: Date.now(),
        });

      (poseEstimationService.initialize as jest.Mock).mockResolvedValue({ success: true });
      (poseEstimationService.isInitialized as jest.Mock).mockReturnValue(true);

      const { result } = renderHook(() => usePoseDetection());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      const mockImageData = {
        width: 640,
        height: 480,
        data: new Uint8Array(640 * 480 * 4),
      };

      // First call fails
      await act(async () => {
        await result.current.detectPose(mockImageData);
      });

      expect(result.current.error).toContain('Detection error');

      // Second call succeeds
      await act(async () => {
        await result.current.detectPose(mockImageData);
      });

      expect(result.current.error).toBeNull();
    });
  });
}); 