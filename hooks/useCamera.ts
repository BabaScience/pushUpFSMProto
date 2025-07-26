import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import type { CameraConfiguration, FrameProcessor } from '../services/cameraService';
import { cameraService } from '../services/cameraService';

export interface UseCameraReturn {
  // State
  isInitialized: boolean;
  isLoading: boolean;
  isProcessingFrames: boolean;
  hasPermission: boolean;
  error: string | null;

  // Actions
  requestPermissions: () => Promise<void>;
  checkPermissions: () => Promise<void>;
  retry: () => Promise<void>;
  
  // Configuration
  getConfiguration: () => CameraConfiguration;
  setCameraType: (type: 'front' | 'back') => void;
  setFlashMode: (mode: string) => void;
  
  // Frame Processing
  startFrameProcessing: (processor: FrameProcessor) => void;
  stopFrameProcessing: () => void;
  
  // Lifecycle
  handleAppStateChange: (nextAppState: AppStateStatus) => void;
}

export function useCamera(): UseCameraReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const appStateRef = useRef(AppState.currentState);

  // Get current state from service
  const isInitialized = cameraService.isInitialized();
  const isProcessingFrames = cameraService.isProcessingFrames();

  /**
   * Initialize camera service
   */
  const initializeCamera = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await cameraService.initialize();
      
      if (!result.success) {
        setError(result.error || 'Failed to initialize camera');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Camera initialization failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Request camera permissions
   */
  const requestPermissions = useCallback(async () => {
    try {
      setError(null);
      const result = await cameraService.requestPermissions();
      
      if (result.granted) {
        setHasPermission(true);
      } else {
        setHasPermission(false);
        setError('Camera permission denied. Please enable camera access in settings.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Permission request failed');
      setHasPermission(false);
    }
  }, []);

  /**
   * Check existing camera permissions
   */
  const checkPermissions = useCallback(async () => {
    try {
      const result = await cameraService.checkPermissions();
      setHasPermission(result.granted);
    } catch (err) {
      console.warn('Error checking permissions:', err);
      setHasPermission(false);
    }
  }, []);

  /**
   * Retry camera initialization
   */
  const retry = useCallback(async () => {
    await initializeCamera();
  }, [initializeCamera]);

  /**
   * Get camera configuration
   */
  const getConfiguration = useCallback(() => {
    return cameraService.getConfiguration();
  }, []);

  /**
   * Set camera type (front/back)
   */
  const setCameraType = useCallback((type: 'front' | 'back') => {
    cameraService.setCameraType(type as any);
  }, []);

  /**
   * Set flash mode
   */
  const setFlashMode = useCallback((mode: string) => {
    cameraService.setFlashMode(mode as any);
  }, []);

  /**
   * Start frame processing
   */
  const startFrameProcessing = useCallback((processor: FrameProcessor) => {
    cameraService.startFrameProcessing(processor);
  }, []);

  /**
   * Stop frame processing
   */
  const stopFrameProcessing = useCallback(() => {
    cameraService.stopFrameProcessing();
  }, []);

  /**
   * Handle app state changes
   */
  const handleAppStateChange = useCallback((nextAppState: AppStateStatus) => {
    appStateRef.current = nextAppState;
    cameraService.handleAppStateChange(nextAppState);
  }, []);

  /**
   * Set up app state listener
   */
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
    };
  }, [handleAppStateChange]);

  /**
   * Initialize camera on mount
   */
  useEffect(() => {
    initializeCamera();
  }, [initializeCamera]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      cameraService.cleanup();
    };
  }, []);

  return {
    // State
    isInitialized,
    isLoading,
    isProcessingFrames,
    hasPermission,
    error,

    // Actions
    requestPermissions,
    checkPermissions,
    retry,

    // Configuration
    getConfiguration,
    setCameraType,
    setFlashMode,

    // Frame Processing
    startFrameProcessing,
    stopFrameProcessing,

    // Lifecycle
    handleAppStateChange,
  };
} 