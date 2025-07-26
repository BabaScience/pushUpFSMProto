import { Camera } from 'expo-camera';
import { CameraService } from '../cameraService';

// Mock expo-camera
jest.mock('expo-camera', () => ({
  Camera: {
    requestCameraPermissionsAsync: jest.fn(),
    getCameraPermissionsAsync: jest.fn(),
    Constants: {
      Type: {
        front: 'front',
        back: 'back',
      },
    },
  },
}));

describe('CameraService', () => {
  let cameraService: CameraService;
  const mockCameraRef = {
    current: {
      takePictureAsync: jest.fn(),
      recordAsync: jest.fn(),
      stopRecording: jest.fn(),
    },
  };

  beforeEach(() => {
    cameraService = new CameraService();
    jest.clearAllMocks();
  });

  afterEach(() => {
    cameraService.cleanup();
  });

  describe('Camera Permissions', () => {
    test('should request camera permissions successfully', async () => {
      (Camera.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
        granted: true,
      });

      const result = await cameraService.requestPermissions();

      expect(result.granted).toBe(true);
      expect(Camera.requestCameraPermissionsAsync).toHaveBeenCalled();
    });

    test('should handle permission denial', async () => {
      (Camera.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
        granted: false,
      });

      const result = await cameraService.requestPermissions();

      expect(result.granted).toBe(false);
      expect(result.status).toBe('denied');
    });

    test('should check existing permissions', async () => {
      (Camera.getCameraPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
        granted: true,
      });

      const result = await cameraService.checkPermissions();

      expect(result.granted).toBe(true);
      expect(Camera.getCameraPermissionsAsync).toHaveBeenCalled();
    });
  });

  describe('Camera Initialization', () => {
    test('should initialize camera with default settings', async () => {
      (Camera.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
        granted: true,
      });

      const result = await cameraService.initialize();

      expect(result.success).toBe(true);
      expect(cameraService.isInitialized()).toBe(true);
    });

    test('should fail initialization without permissions', async () => {
      (Camera.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
        granted: false,
      });

      const result = await cameraService.initialize();

      expect(result.success).toBe(false);
      expect(result.error).toContain('permission');
      expect(cameraService.isInitialized()).toBe(false);
    });

    test('should handle initialization errors', async () => {
      (Camera.requestCameraPermissionsAsync as jest.Mock).mockRejectedValue(
        new Error('Camera not available')
      );

      const result = await cameraService.initialize();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Camera not available');
    });
  });

  describe('Camera Configuration', () => {
    beforeEach(async () => {
      (Camera.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
        granted: true,
      });
      await cameraService.initialize();
    });

    test('should get current camera configuration', () => {
      const config = cameraService.getConfiguration();

      expect(config).toHaveProperty('type');
      expect(config).toHaveProperty('flashMode');
      expect(config).toHaveProperty('autoFocus');
    });

    test('should update camera type', () => {
      cameraService.setCameraType('back');
      const config = cameraService.getConfiguration();

      expect(config.type).toBe('back');
    });

    test('should update flash mode', () => {
      cameraService.setFlashMode('on' as any);
      const config = cameraService.getConfiguration();

      expect(config.flashMode).toBe('on');
    });
  });

  describe('Frame Processing', () => {
    beforeEach(async () => {
      (Camera.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
        granted: true,
      });
      await cameraService.initialize();
    });

    test('should start frame processing', () => {
      const mockCallback = jest.fn();
      
      cameraService.startFrameProcessing(mockCallback);

      expect(cameraService.isProcessingFrames()).toBe(true);
    });

    test('should stop frame processing', () => {
      const mockCallback = jest.fn();
      
      cameraService.startFrameProcessing(mockCallback);
      cameraService.stopFrameProcessing();

      expect(cameraService.isProcessingFrames()).toBe(false);
    });

    test('should handle frame processing errors', () => {
      const mockCallback = jest.fn(() => {
        throw new Error('Processing error');
      });

      expect(() => {
        cameraService.startFrameProcessing(mockCallback);
      }).not.toThrow();
    });
  });

  describe('Lifecycle Management', () => {
    beforeEach(async () => {
      (Camera.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
        granted: true,
      });
      await cameraService.initialize();
    });

    test('should handle app backgrounding', () => {
      cameraService.startFrameProcessing(jest.fn());
      
      cameraService.handleAppStateChange('background');

      expect(cameraService.isProcessingFrames()).toBe(false);
    });

         test('should handle app foregrounding', () => {
       const mockCallback = jest.fn();
       cameraService.startFrameProcessing(mockCallback);
       expect(cameraService.isProcessingFrames()).toBe(true);
       
       cameraService.handleAppStateChange('background');
       expect(cameraService.isProcessingFrames()).toBe(false);
       
       cameraService.handleAppStateChange('active');
       expect(cameraService.isProcessingFrames()).toBe(true);
     });

    test('should cleanup resources', () => {
      cameraService.startFrameProcessing(jest.fn());
      
      cameraService.cleanup();

      expect(cameraService.isInitialized()).toBe(false);
      expect(cameraService.isProcessingFrames()).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should handle camera unavailable error', async () => {
      (Camera.requestCameraPermissionsAsync as jest.Mock).mockRejectedValue(
        new Error('Camera hardware unavailable')
      );

      const result = await cameraService.initialize();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Camera hardware unavailable');
    });

    test('should handle frame processing without initialization', () => {
      expect(() => {
        cameraService.startFrameProcessing(jest.fn());
      }).toThrow('Camera not initialized');
    });
  });
}); 