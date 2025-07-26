import { act, renderHook } from '@testing-library/react-native';
import { cameraService } from '../../services/cameraService';
import { useCamera } from '../useCamera';

// Mock the camera service
jest.mock('../../services/cameraService', () => ({
  cameraService: {
    initialize: jest.fn(),
    cleanup: jest.fn(),
    requestPermissions: jest.fn(),
    checkPermissions: jest.fn(),
    isInitialized: jest.fn(),
    getConfiguration: jest.fn(),
    setCameraType: jest.fn(),
    setFlashMode: jest.fn(),
    startFrameProcessing: jest.fn(),
    stopFrameProcessing: jest.fn(),
    isProcessingFrames: jest.fn(),
    handleAppStateChange: jest.fn(),
  },
}));

describe('useCamera', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Camera Initialization', () => {
    test('should initialize camera service on mount', async () => {
      (cameraService.initialize as jest.Mock).mockResolvedValue({ success: true });
      (cameraService.isInitialized as jest.Mock).mockReturnValue(false);

      const { result } = renderHook(() => useCamera());

      expect(result.current.isInitialized).toBe(false);
      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(cameraService.initialize).toHaveBeenCalled();
    });

    test('should handle initialization success', async () => {
      (cameraService.initialize as jest.Mock).mockResolvedValue({ success: true });
      (cameraService.isInitialized as jest.Mock).mockReturnValue(true);

      const { result } = renderHook(() => useCamera());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.isInitialized).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    test('should handle initialization failure', async () => {
      const errorMessage = 'Camera not available';
      (cameraService.initialize as jest.Mock).mockResolvedValue({ 
        success: false, 
        error: errorMessage 
      });
      (cameraService.isInitialized as jest.Mock).mockReturnValue(false);

      const { result } = renderHook(() => useCamera());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.isInitialized).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(errorMessage);
    });
  });

  describe('Permission Management', () => {
    test('should request permissions', async () => {
      (cameraService.requestPermissions as jest.Mock).mockResolvedValue({
        granted: true,
        status: 'granted'
      });

      const { result } = renderHook(() => useCamera());

      await act(async () => {
        await result.current.requestPermissions();
      });

      expect(cameraService.requestPermissions).toHaveBeenCalled();
      expect(result.current.hasPermission).toBe(true);
    });

    test('should handle permission denial', async () => {
      (cameraService.requestPermissions as jest.Mock).mockResolvedValue({
        granted: false,
        status: 'denied'
      });

      const { result } = renderHook(() => useCamera());

      await act(async () => {
        await result.current.requestPermissions();
      });

      expect(result.current.hasPermission).toBe(false);
      expect(result.current.error).toContain('permission');
    });

    test('should check existing permissions', async () => {
      (cameraService.checkPermissions as jest.Mock).mockResolvedValue({
        granted: true,
        status: 'granted'
      });

      const { result } = renderHook(() => useCamera());

      await act(async () => {
        await result.current.checkPermissions();
      });

      expect(cameraService.checkPermissions).toHaveBeenCalled();
      expect(result.current.hasPermission).toBe(true);
    });
  });

  describe('Camera Configuration', () => {
    test('should get camera configuration', () => {
      const mockConfig = {
        type: 'front' as const,
        flashMode: 'off' as const,
        autoFocus: true,
        ratio: '4:3',
      };
      (cameraService.getConfiguration as jest.Mock).mockReturnValue(mockConfig);

      const { result } = renderHook(() => useCamera());

      expect(result.current.getConfiguration()).toEqual(mockConfig);
      expect(cameraService.getConfiguration).toHaveBeenCalled();
    });

    test('should set camera type', () => {
      const { result } = renderHook(() => useCamera());

      act(() => {
        result.current.setCameraType('back');
      });

      expect(cameraService.setCameraType).toHaveBeenCalledWith('back');
    });

    test('should set flash mode', () => {
      const { result } = renderHook(() => useCamera());

      act(() => {
        result.current.setFlashMode('torch');
      });

      expect(cameraService.setFlashMode).toHaveBeenCalledWith('torch');
    });
  });

  describe('Frame Processing', () => {
    test('should start frame processing', () => {
      const mockCallback = jest.fn();
      const { result } = renderHook(() => useCamera());

      act(() => {
        result.current.startFrameProcessing(mockCallback);
      });

      expect(cameraService.startFrameProcessing).toHaveBeenCalledWith(mockCallback);
    });

    test('should stop frame processing', () => {
      const { result } = renderHook(() => useCamera());

      act(() => {
        result.current.stopFrameProcessing();
      });

      expect(cameraService.stopFrameProcessing).toHaveBeenCalled();
    });

    test('should check if processing frames', () => {
      (cameraService.isProcessingFrames as jest.Mock).mockReturnValue(true);

      const { result } = renderHook(() => useCamera());

      expect(result.current.isProcessingFrames).toBe(true);
      expect(cameraService.isProcessingFrames).toHaveBeenCalled();
    });
  });

  describe('Lifecycle Management', () => {
    test('should cleanup on unmount', () => {
      const { unmount } = renderHook(() => useCamera());

      unmount();

      expect(cameraService.cleanup).toHaveBeenCalled();
    });

    test('should handle app state changes', () => {
      const { result } = renderHook(() => useCamera());

      act(() => {
        result.current.handleAppStateChange('background');
      });

      expect(cameraService.handleAppStateChange).toHaveBeenCalledWith('background');
    });

    test('should reinitialize on focus after error', async () => {
      // First call fails
      (cameraService.initialize as jest.Mock)
        .mockResolvedValueOnce({ success: false, error: 'Initial error' })
        .mockResolvedValueOnce({ success: true });
      (cameraService.isInitialized as jest.Mock).mockReturnValue(false);

      const { result } = renderHook(() => useCamera());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.error).toBe('Initial error');

      // Retry initialization
      await act(async () => {
        await result.current.retry();
      });

      expect(cameraService.initialize).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    test('should handle service errors gracefully', async () => {
      (cameraService.initialize as jest.Mock).mockRejectedValue(new Error('Service error'));

      const { result } = renderHook(() => useCamera());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.error).toContain('Service error');
      expect(result.current.isLoading).toBe(false);
    });

    test('should clear errors on successful operations', async () => {
      (cameraService.requestPermissions as jest.Mock)
        .mockResolvedValueOnce({ granted: false, status: 'denied' })
        .mockResolvedValueOnce({ granted: true, status: 'granted' });

      const { result } = renderHook(() => useCamera());

      // First call fails
      await act(async () => {
        await result.current.requestPermissions();
      });

      expect(result.current.error).toContain('permission');

      // Second call succeeds
      await act(async () => {
        await result.current.requestPermissions();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.hasPermission).toBe(true);
    });
  });

  describe('Hook State Management', () => {
    test('should maintain consistent state across re-renders', () => {
      (cameraService.isInitialized as jest.Mock).mockReturnValue(true);
      (cameraService.isProcessingFrames as jest.Mock).mockReturnValue(false);

      const { result, rerender } = renderHook(() => useCamera());

      const initialState = {
        isInitialized: result.current.isInitialized,
        isProcessingFrames: result.current.isProcessingFrames,
        isLoading: result.current.isLoading,
      };

      rerender({});

      expect(result.current.isInitialized).toBe(initialState.isInitialized);
      expect(result.current.isProcessingFrames).toBe(initialState.isProcessingFrames);
      expect(result.current.isLoading).toBe(initialState.isLoading);
    });

    test('should provide stable function references', () => {
      const { result, rerender } = renderHook(() => useCamera());

      const initialFunctions = {
        requestPermissions: result.current.requestPermissions,
        checkPermissions: result.current.checkPermissions,
        setCameraType: result.current.setCameraType,
        setFlashMode: result.current.setFlashMode,
        startFrameProcessing: result.current.startFrameProcessing,
        stopFrameProcessing: result.current.stopFrameProcessing,
      };

      rerender({});

      expect(result.current.requestPermissions).toBe(initialFunctions.requestPermissions);
      expect(result.current.checkPermissions).toBe(initialFunctions.checkPermissions);
      expect(result.current.setCameraType).toBe(initialFunctions.setCameraType);
      expect(result.current.setFlashMode).toBe(initialFunctions.setFlashMode);
      expect(result.current.startFrameProcessing).toBe(initialFunctions.startFrameProcessing);
      expect(result.current.stopFrameProcessing).toBe(initialFunctions.stopFrameProcessing);
    });
  });
}); 