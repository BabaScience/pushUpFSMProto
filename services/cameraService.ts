import { Camera, CameraType, FlashMode } from 'expo-camera';
import { AppState, AppStateStatus } from 'react-native';

export interface CameraPermissionResult {
  granted: boolean;
  status: string;
}

export interface CameraInitResult {
  success: boolean;
  error?: string;
}

export interface CameraConfiguration {
  type: CameraType;
  flashMode: FlashMode;
  autoFocus: boolean;
  ratio?: string;
}

export type FrameProcessor = (imageData: any) => void;

export class CameraService {
  private initialized = false;
  private processingFrames = false;
  private frameProcessor: FrameProcessor | null = null;
  private pausedFrameProcessor: FrameProcessor | null = null;
  private configuration: CameraConfiguration;
  private appStateSubscription: any = null;
  private processingInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.configuration = {
      type: 'front' as CameraType,
      flashMode: 'off' as FlashMode,
      autoFocus: true,
      ratio: '4:3',
    };
  }

  /**
   * Request camera permissions from the user
   */
  async requestPermissions(): Promise<CameraPermissionResult> {
    try {
      const result = await Camera.requestCameraPermissionsAsync();
      return {
        granted: result.granted,
        status: result.status,
      };
    } catch (error) {
      // Re-throw the error so initialize() can handle it properly
      throw error;
    }
  }

  /**
   * Check current camera permissions status
   */
  async checkPermissions(): Promise<CameraPermissionResult> {
    try {
      const result = await Camera.getCameraPermissionsAsync();
      return {
        granted: result.granted,
        status: result.status,
      };
    } catch (error) {
      return {
        granted: false,
        status: 'error',
      };
    }
  }

  /**
   * Initialize the camera service
   */
  async initialize(): Promise<CameraInitResult> {
    try {
      // Check permissions first
      const permissions = await this.requestPermissions();
      if (!permissions.granted) {
        return {
          success: false,
          error: 'Camera permission denied',
        };
      }

      // Set up app state listener
      this.setupAppStateListener();

      this.initialized = true;
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Camera initialization failed',
      };
    }
  }

  /**
   * Check if camera service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get current camera configuration
   */
  getConfiguration(): CameraConfiguration {
    return { ...this.configuration };
  }

  /**
   * Set camera type (front/back)
   */
  setCameraType(type: CameraType): void {
    this.configuration.type = type;
  }

  /**
   * Set flash mode
   */
  setFlashMode(mode: FlashMode): void {
    this.configuration.flashMode = mode;
  }

  /**
   * Start processing camera frames
   */
  startFrameProcessing(processor: FrameProcessor): void {
    if (!this.initialized) {
      throw new Error('Camera not initialized');
    }

    this.frameProcessor = processor;
    this.processingFrames = true;

    // Simulate frame processing at 30fps
    this.processingInterval = setInterval(() => {
      if (this.processingFrames && this.frameProcessor) {
        try {
          // In a real implementation, this would be actual camera frame data
          const mockFrameData = {
            width: 640,
            height: 480,
            timestamp: Date.now(),
            data: new Uint8Array(640 * 480 * 4), // RGBA data
          };
          this.frameProcessor(mockFrameData);
        } catch (error) {
          console.warn('Frame processing error:', error);
        }
      }
    }, 1000 / 30); // 30fps
  }

  /**
   * Stop processing camera frames
   */
  stopFrameProcessing(): void {
    this.processingFrames = false;
    this.frameProcessor = null;
    
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  /**
   * Check if currently processing frames
   */
  isProcessingFrames(): boolean {
    return this.processingFrames;
  }

  /**
   * Handle app state changes (background/foreground)
   */
  handleAppStateChange(nextAppState: AppStateStatus): void {
    if (nextAppState === 'background') {
      // Pause frame processing when app goes to background
      if (this.processingFrames && this.frameProcessor) {
        this.pausedFrameProcessor = this.frameProcessor;
        this.stopFrameProcessing();
      }
    } else if (nextAppState === 'active') {
      // Resume frame processing when app becomes active
      if (this.pausedFrameProcessor && !this.processingFrames) {
        this.startFrameProcessing(this.pausedFrameProcessor);
        this.pausedFrameProcessor = null;
      }
    }
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.stopFrameProcessing();
    
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    this.initialized = false;
    this.frameProcessor = null;
  }

  /**
   * Set up app state listener for lifecycle management
   */
  private setupAppStateListener(): void {
    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange.bind(this)
    );
  }
}

// Singleton instance
export const cameraService = new CameraService(); 