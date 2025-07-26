import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { useCamera } from '../../hooks/useCamera';
import { usePoseDetection } from '../../hooks/usePoseDetection';
import { CameraView } from './CameraView';

// Mock the hooks
jest.mock('../../hooks/useCamera', () => ({
  useCamera: jest.fn(),
}));

jest.mock('../../hooks/usePoseDetection', () => ({
  usePoseDetection: jest.fn(),
}));

// Mock expo-camera
jest.mock('expo-camera', () => ({
  Camera: {
    Constants: {
      Type: {
        front: 'front',
        back: 'back',
      },
    },
  },
}));

const mockUseCamera = useCamera as jest.Mock;
const mockUsePoseDetection = usePoseDetection as jest.Mock;

describe('CameraView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseCamera.mockReturnValue({
      isInitialized: true,
      hasPermission: true,
      isLoading: false,
      error: null,
      getConfiguration: jest.fn(() => ({ type: 'back', flashMode: 'off' })),
      setCameraType: jest.fn(),
      setFlashMode: jest.fn(),
      startFrameProcessing: jest.fn(),
      stopFrameProcessing: jest.fn(),
      isProcessingFrames: false,
    });

    mockUsePoseDetection.mockReturnValue({
      isInitialized: true,
      isDetecting: false,
      error: null,
      detectPose: jest.fn(),
      startRealTimeDetection: jest.fn(),
      stopRealTimeDetection: jest.fn(),
    });
  });

  describe('Camera Initialization', () => {
    test('should render camera view when initialized', () => {
      const { getByTestId } = render(<CameraView />);
      
      expect(getByTestId('camera-view')).toBeTruthy();
    });

    test('should show loading state when camera is loading', () => {
      mockUseCamera.mockReturnValue({
        isInitialized: false,
        hasPermission: true,
        isLoading: true,
        error: null,
      });

      const { getByText } = render(<CameraView />);
      
      expect(getByText('Initializing camera...')).toBeTruthy();
    });

    test('should show permission request when no permission', () => {
      mockUseCamera.mockReturnValue({
        isInitialized: false,
        hasPermission: false,
        isLoading: false,
        error: null,
        requestPermissions: jest.fn(),
      });

      const { getByText, getByTestId } = render(<CameraView />);
      
      expect(getByText('Camera permission required')).toBeTruthy();
      expect(getByTestId('request-permission-button')).toBeTruthy();
    });

    test('should show error state when camera fails', () => {
      mockUseCamera.mockReturnValue({
        isInitialized: false,
        hasPermission: true,
        isLoading: false,
        error: 'Camera not available',
      });

      const { getByText } = render(<CameraView />);
      
      expect(getByText('Camera Error')).toBeTruthy();
      expect(getByText('Camera not available')).toBeTruthy();
    });
  });

  describe('Camera Controls', () => {
    test('should toggle camera type when flip button pressed', () => {
      const mockSetCameraType = jest.fn();
      mockUseCamera.mockReturnValue({
        isInitialized: true,
        hasPermission: true,
        isLoading: false,
        error: null,
        getConfiguration: jest.fn(() => ({ type: 'back', flashMode: 'off' })),
        setCameraType: mockSetCameraType,
      });

      const { getByTestId } = render(<CameraView />);
      
      fireEvent.press(getByTestId('flip-camera-button'));
      
      expect(mockSetCameraType).toHaveBeenCalledWith('front');
    });

    test('should toggle flash mode when flash button pressed', () => {
      const mockSetFlashMode = jest.fn();
      mockUseCamera.mockReturnValue({
        isInitialized: true,
        hasPermission: true,
        isLoading: false,
        error: null,
        getConfiguration: jest.fn(() => ({ type: 'back', flashMode: 'off' })),
        setFlashMode: mockSetFlashMode,
      });

      const { getByTestId } = render(<CameraView />);
      
      fireEvent.press(getByTestId('flash-button'));
      
      expect(mockSetFlashMode).toHaveBeenCalledWith('torch');
    });
  });

  describe('Pose Overlay', () => {
    test('should render pose overlay when pose data available', () => {
      const mockPoseData = {
        keypoints: [
          { x: 100, y: 100, confidence: 0.9, name: 'nose' },
          { x: 90, y: 120, confidence: 0.8, name: 'left_shoulder' },
        ],
        confidence: 0.85,
        timestamp: Date.now(),
      };

      const { getByTestId } = render(<CameraView currentPose={mockPoseData} />);
      
      expect(getByTestId('pose-overlay')).toBeTruthy();
    });

    test('should not render pose overlay when no pose data', () => {
      const { queryByTestId } = render(<CameraView currentPose={null} />);
      
      expect(queryByTestId('pose-overlay')).toBeNull();
    });

    test('should render keypoints when pose data available', () => {
      const mockPoseData = {
        keypoints: [
          { x: 100, y: 100, confidence: 0.9, name: 'nose' },
          { x: 90, y: 120, confidence: 0.8, name: 'left_shoulder' },
        ],
        confidence: 0.85,
        timestamp: Date.now(),
      };

      const { getByTestId } = render(<CameraView currentPose={mockPoseData} />);
      
      expect(getByTestId('keypoint-nose')).toBeTruthy();
      expect(getByTestId('keypoint-left_shoulder')).toBeTruthy();
    });
  });

  describe('Integration', () => {
    test('should handle camera ready callback', () => {
      const mockOnCameraReady = jest.fn();
      
      render(<CameraView onCameraReady={mockOnCameraReady} />);
      
      // Camera should be ready when initialized and has permission
      expect(mockOnCameraReady).toHaveBeenCalledWith(true);
    });

    test('should handle camera not ready callback', () => {
      const mockOnCameraReady = jest.fn();
      mockUseCamera.mockReturnValue({
        isInitialized: false,
        hasPermission: false,
        isLoading: false,
        error: null,
      });
      
      render(<CameraView onCameraReady={mockOnCameraReady} />);
      
      expect(mockOnCameraReady).toHaveBeenCalledWith(false);
    });
  });

  describe('Accessibility', () => {
    test('should have proper accessibility labels', () => {
      const { getByLabelText } = render(<CameraView />);
      
      expect(getByLabelText('Camera view')).toBeTruthy();
      expect(getByLabelText('Flip camera')).toBeTruthy();
      expect(getByLabelText('Toggle flash')).toBeTruthy();
    });
  });
}); 