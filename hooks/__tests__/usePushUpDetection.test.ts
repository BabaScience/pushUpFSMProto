import { act, renderHook } from '@testing-library/react-native';
import { PushUpState, type PoseData } from '../../types';
import { usePushUpDetection } from '../usePushUpDetection';

// Mock the dependencies
jest.mock('../useCamera', () => ({
  useCamera: jest.fn(() => ({
    isInitialized: true,
    startFrameProcessing: jest.fn(),
    stopFrameProcessing: jest.fn(),
    isProcessingFrames: false,
  })),
}));

jest.mock('../usePoseDetection', () => ({
  usePoseDetection: jest.fn(() => ({
    isInitialized: true,
    detectPose: jest.fn(),
    startRealTimeDetection: jest.fn(),
    stopRealTimeDetection: jest.fn(),
    isDetecting: false,
  })),
}));

const mockPushUpStateIdle = 'IDLE';

jest.mock('../../utils/pushUpFSM', () => ({
  PushUpFSM: jest.fn().mockImplementation(() => ({
    processPose: jest.fn(),
    getCurrentState: jest.fn(() => mockPushUpStateIdle),
    getRepCount: jest.fn(() => 0),
    getCurrentPose: jest.fn(() => null),
    reset: jest.fn(),
  })),
}));

jest.mock('../../utils/formScoring', () => ({
  formScoring: {
    generateFormFeedback: jest.fn(() => 'Good form!'),
    calculateOverallFormQuality: jest.fn(() => 0.85),
  },
}));

import { PushUpFSM } from '../../utils/pushUpFSM';
import { useCamera } from '../useCamera';
import { usePoseDetection } from '../usePoseDetection';

describe('usePushUpDetection', () => {
  const mockCamera = useCamera as jest.Mock;
  const mockPoseDetection = usePoseDetection as jest.Mock;
  const mockFSM = PushUpFSM as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset mocks to default state
    mockCamera.mockReturnValue({
      isInitialized: true,
      startFrameProcessing: jest.fn(),
      stopFrameProcessing: jest.fn(),
      isProcessingFrames: false,
      error: null,
    });

    mockPoseDetection.mockReturnValue({
      isInitialized: true,
      detectPose: jest.fn().mockResolvedValue(null),
      startRealTimeDetection: jest.fn(),
      stopRealTimeDetection: jest.fn(),
      isDetecting: false,
      error: null,
    });

    mockFSM.mockImplementation(() => ({
      processPose: jest.fn().mockReturnValue({
        currentState: PushUpState.IDLE,
        previousState: PushUpState.IDLE,
        stateChanged: false,
        repCount: 0,
        formQuality: 0.85,
        formFeedback: ['Good form!'],
        timestamp: Date.now(),
      }),
      getCurrentState: jest.fn(() => PushUpState.IDLE),
      getRepCount: jest.fn(() => 0),
      getCurrentPose: jest.fn(() => null),
      reset: jest.fn(),
    }));
  });

  describe('Initialization', () => {
    test('should initialize with default state', () => {
      const { result } = renderHook(() => usePushUpDetection());

      expect(result.current.isActive).toBe(false);
      expect(result.current.currentState).toBe(PushUpState.IDLE);
      expect(result.current.repCount).toBe(0);
      expect(result.current.currentPose).toBeNull();
      expect(result.current.formFeedback).toEqual([]);
      expect(result.current.isReady).toBe(true); // Both camera and pose detection initialized
    });

    test('should not be ready if camera is not initialized', () => {
      mockCamera.mockReturnValue({
        isInitialized: false,
        startFrameProcessing: jest.fn(),
        stopFrameProcessing: jest.fn(),
        isProcessingFrames: false,
        error: null,
      });

      const { result } = renderHook(() => usePushUpDetection());

      expect(result.current.isReady).toBe(false);
    });

    test('should not be ready if pose detection is not initialized', () => {
      mockPoseDetection.mockReturnValue({
        isInitialized: false,
        detectPose: jest.fn(),
        startRealTimeDetection: jest.fn(),
        stopRealTimeDetection: jest.fn(),
        isDetecting: false,
        error: null,
      });

      const { result } = renderHook(() => usePushUpDetection());

      expect(result.current.isReady).toBe(false);
    });

    test('should handle initialization errors', () => {
      mockCamera.mockReturnValue({
        isInitialized: false,
        startFrameProcessing: jest.fn(),
        stopFrameProcessing: jest.fn(),
        isProcessingFrames: false,
        error: 'Camera error',
      });

      const { result } = renderHook(() => usePushUpDetection());

      expect(result.current.error).toBe('Camera error');
    });
  });

  describe('Detection Control', () => {
    test('should start push-up detection', () => {
      const mockStartFrameProcessing = jest.fn();
      const mockStartRealTimeDetection = jest.fn();

      mockCamera.mockReturnValue({
        isInitialized: true,
        startFrameProcessing: mockStartFrameProcessing,
        stopFrameProcessing: jest.fn(),
        isProcessingFrames: false,
        error: null,
      });

      mockPoseDetection.mockReturnValue({
        isInitialized: true,
        detectPose: jest.fn(),
        startRealTimeDetection: mockStartRealTimeDetection,
        stopRealTimeDetection: jest.fn(),
        isDetecting: false,
        error: null,
      });

      const { result } = renderHook(() => usePushUpDetection());

      act(() => {
        result.current.startDetection();
      });

      expect(result.current.isActive).toBe(true);
      expect(mockStartFrameProcessing).toHaveBeenCalled();
      expect(mockStartRealTimeDetection).toHaveBeenCalled();
    });

    test('should stop push-up detection', () => {
      const mockStopFrameProcessing = jest.fn();
      const mockStopRealTimeDetection = jest.fn();

      mockCamera.mockReturnValue({
        isInitialized: true,
        startFrameProcessing: jest.fn(),
        stopFrameProcessing: mockStopFrameProcessing,
        isProcessingFrames: true,
        error: null,
      });

      mockPoseDetection.mockReturnValue({
        isInitialized: true,
        detectPose: jest.fn(),
        startRealTimeDetection: jest.fn(),
        stopRealTimeDetection: mockStopRealTimeDetection,
        isDetecting: true,
        error: null,
      });

      const { result } = renderHook(() => usePushUpDetection());

      // Start detection first
      act(() => {
        result.current.startDetection();
      });

      // Then stop it
      act(() => {
        result.current.stopDetection();
      });

      expect(result.current.isActive).toBe(false);
      expect(mockStopFrameProcessing).toHaveBeenCalled();
      expect(mockStopRealTimeDetection).toHaveBeenCalled();
    });

    test('should not start detection if not ready', () => {
      mockCamera.mockReturnValue({
        isInitialized: false,
        startFrameProcessing: jest.fn(),
        stopFrameProcessing: jest.fn(),
        isProcessingFrames: false,
        error: null,
      });

      const { result } = renderHook(() => usePushUpDetection());

      act(() => {
        result.current.startDetection();
      });

      expect(result.current.isActive).toBe(false);
    });
  });

  describe('Push-Up Processing', () => {
    test('should process poses through FSM', async () => {
      const mockPose: PoseData = {
        keypoints: [
          { x: 100, y: 100, confidence: 0.9, name: 'nose' },
          { x: 90, y: 120, confidence: 0.8, name: 'left_shoulder' },
        ],
        confidence: 0.85,
        timestamp: Date.now(),
      };

      const mockFSMInstance = {
        processPose: jest.fn().mockReturnValue({
          currentState: PushUpState.SETUP_POSITION,
          previousState: PushUpState.IDLE,
          stateChanged: true,
          repCount: 0,
          formQuality: 0.85,
          formFeedback: ['Good setup position!'],
          timestamp: Date.now(),
        }),
        getCurrentState: jest.fn(() => PushUpState.SETUP_POSITION),
        getRepCount: jest.fn(() => 0),
        getCurrentPose: jest.fn(() => mockPose),
        reset: jest.fn(),
      };

      mockFSM.mockImplementation(() => mockFSMInstance);

      const mockDetectPose = jest.fn().mockResolvedValue(mockPose);
      mockPoseDetection.mockReturnValue({
        isInitialized: true,
        detectPose: mockDetectPose,
        startRealTimeDetection: jest.fn(),
        stopRealTimeDetection: jest.fn(),
        isDetecting: false,
        error: null,
      });

      const { result } = renderHook(() => usePushUpDetection());

      // Simulate frame processing
      await act(async () => {
        result.current.startDetection();
        // Simulate the frame processor being called
        const frameProcessor = mockCamera().startFrameProcessing.mock.calls[0][0];
        await frameProcessor({ data: new Uint8Array(100) });
      });

      expect(mockFSMInstance.processPose).toHaveBeenCalledWith(mockPose);
      expect(result.current.currentState).toBe(PushUpState.SETUP_POSITION);
      expect(result.current.formFeedback).toEqual(['Good setup position!']);
    });

    test('should handle pose detection failures gracefully', async () => {
      const mockDetectPose = jest.fn().mockResolvedValue(null);
      mockPoseDetection.mockReturnValue({
        isInitialized: true,
        detectPose: mockDetectPose,
        startRealTimeDetection: jest.fn(),
        stopRealTimeDetection: jest.fn(),
        isDetecting: false,
        error: null,
      });

      const { result } = renderHook(() => usePushUpDetection());

      await act(async () => {
        result.current.startDetection();
        // Simulate frame processing with no pose detected
        const frameProcessor = mockCamera().startFrameProcessing.mock.calls[0][0];
        await frameProcessor({ data: new Uint8Array(100) });
      });

      // Should not crash and FSM should not be called
      expect(result.current.currentState).toBe(PushUpState.IDLE);
    });

    test('should count completed push-ups', () => {
      const mockFSMInstance = {
        processPose: jest.fn().mockReturnValue({
          currentState: PushUpState.TOP_POSITION,
          previousState: PushUpState.GOING_UP,
          stateChanged: true,
          repCount: 1,
          formQuality: 0.9,
          formFeedback: ['Excellent rep!'],
          timestamp: Date.now(),
        }),
        getCurrentState: jest.fn(() => PushUpState.TOP_POSITION),
        getRepCount: jest.fn(() => 1),
        getCurrentPose: jest.fn(() => null),
        reset: jest.fn(),
      };

      mockFSM.mockImplementation(() => mockFSMInstance);

      const { result } = renderHook(() => usePushUpDetection());

      expect(result.current.repCount).toBe(1);
      expect(result.current.currentState).toBe(PushUpState.TOP_POSITION);
    });
  });

  describe('Form Analysis', () => {
    test('should provide form feedback', () => {
      const mockFSMInstance = {
        processPose: jest.fn().mockReturnValue({
          currentState: PushUpState.GOING_DOWN,
          previousState: PushUpState.SETUP_POSITION,
          stateChanged: true,
          repCount: 0,
          formQuality: 0.6,
          formFeedback: ['Keep your body straight', 'Lower more slowly'],
          timestamp: Date.now(),
        }),
        getCurrentState: jest.fn(() => PushUpState.GOING_DOWN),
        getRepCount: jest.fn(() => 0),
        getCurrentPose: jest.fn(() => null),
        reset: jest.fn(),
      };

      mockFSM.mockImplementation(() => mockFSMInstance);

      const { result } = renderHook(() => usePushUpDetection());

      expect(Array.isArray(result.current.formFeedback)).toBe(true);
      expect(result.current.formQuality).toBeGreaterThanOrEqual(0);
      expect(result.current.formQuality).toBeLessThanOrEqual(1);
    });

    test('should track form quality over time', () => {
      const mockFSMInstance = {
        processPose: jest.fn().mockReturnValue({
          currentState: PushUpState.BOTTOM_POSITION,
          previousState: PushUpState.GOING_DOWN,
          stateChanged: true,
          repCount: 0,
          formQuality: 0.85,
          formFeedback: ['Good depth!'],
          timestamp: Date.now(),
        }),
        getCurrentState: jest.fn(() => PushUpState.BOTTOM_POSITION),
        getRepCount: jest.fn(() => 0),
        getCurrentPose: jest.fn(() => null),
        reset: jest.fn(),
      };

      mockFSM.mockImplementation(() => mockFSMInstance);

      const { result } = renderHook(() => usePushUpDetection());

      expect(result.current.formQuality).toBeGreaterThanOrEqual(0);
      expect(result.current.formQuality).toBeLessThanOrEqual(1);
    });
  });

  describe('Session Management', () => {
    test('should reset detection state', () => {
      const mockFSMInstance = {
        processPose: jest.fn(),
        getCurrentState: jest.fn(() => PushUpState.IDLE),
        getRepCount: jest.fn(() => 0),
        getCurrentPose: jest.fn(() => null),
        reset: jest.fn(),
      };

      mockFSM.mockImplementation(() => mockFSMInstance);

      const { result } = renderHook(() => usePushUpDetection());

      act(() => {
        result.current.reset();
      });

      expect(mockFSMInstance.reset).toHaveBeenCalled();
      expect(result.current.repCount).toBe(0);
      expect(result.current.currentState).toBe(PushUpState.IDLE);
    });

    test('should provide session statistics', () => {
      const mockFSMInstance = {
        processPose: jest.fn().mockReturnValue({
          currentState: PushUpState.IDLE,
          previousState: PushUpState.TOP_POSITION,
          stateChanged: true,
          repCount: 5,
          formQuality: 0.8,
          formFeedback: ['Session complete!'],
          timestamp: Date.now(),
        }),
        getCurrentState: jest.fn(() => PushUpState.IDLE),
        getRepCount: jest.fn(() => 5),
        getCurrentPose: jest.fn(() => null),
        reset: jest.fn(),
      };

      mockFSM.mockImplementation(() => mockFSMInstance);

      const { result } = renderHook(() => usePushUpDetection());

      const stats = result.current.getSessionStats();

      expect(stats.totalReps).toBe(5);
      expect(stats.currentState).toBe(PushUpState.IDLE);
      expect(stats.averageFormQuality).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle camera errors', () => {
      mockCamera.mockReturnValue({
        isInitialized: true,
        startFrameProcessing: jest.fn(),
        stopFrameProcessing: jest.fn(),
        isProcessingFrames: false,
        error: 'Camera permission denied',
      });

      const { result } = renderHook(() => usePushUpDetection());

      expect(result.current.error).toBe('Camera permission denied');
      expect(result.current.isReady).toBe(false);
    });

    test('should handle pose detection errors', () => {
      mockPoseDetection.mockReturnValue({
        isInitialized: true,
        detectPose: jest.fn(),
        startRealTimeDetection: jest.fn(),
        stopRealTimeDetection: jest.fn(),
        isDetecting: false,
        error: 'TensorFlow initialization failed',
      });

      const { result } = renderHook(() => usePushUpDetection());

      expect(result.current.error).toBe('TensorFlow initialization failed');
      expect(result.current.isReady).toBe(false);
    });

    test('should clear errors when systems recover', () => {
      const mockCameraReturn = {
        isInitialized: true,
        startFrameProcessing: jest.fn(),
        stopFrameProcessing: jest.fn(),
        isProcessingFrames: false,
        error: 'Initial error',
      };

      mockCamera.mockReturnValue(mockCameraReturn);

      const { result, rerender } = renderHook(() => usePushUpDetection());

      expect(result.current.error).toBe('Initial error');

      // Simulate error recovery
      mockCameraReturn.error = null as any;
      rerender({});

      expect(result.current.error).toBeNull();
    });
  });

  describe('Cleanup', () => {
    test('should stop detection on unmount', () => {
      const mockStopFrameProcessing = jest.fn();
      const mockStopRealTimeDetection = jest.fn();

      mockCamera.mockReturnValue({
        isInitialized: true,
        startFrameProcessing: jest.fn(),
        stopFrameProcessing: mockStopFrameProcessing,
        isProcessingFrames: true,
        error: null,
      });

      mockPoseDetection.mockReturnValue({
        isInitialized: true,
        detectPose: jest.fn(),
        startRealTimeDetection: jest.fn(),
        stopRealTimeDetection: mockStopRealTimeDetection,
        isDetecting: true,
        error: null,
      });

      const { result, unmount } = renderHook(() => usePushUpDetection());

      act(() => {
        result.current.startDetection();
      });

      unmount();

      expect(mockStopFrameProcessing).toHaveBeenCalled();
      expect(mockStopRealTimeDetection).toHaveBeenCalled();
    });
  });
}); 