import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { useCamera } from '../../hooks/useCamera';
import { usePoseDetection } from '../../hooks/usePoseDetection';
import type { PoseData } from '../../types';

interface CameraViewProps {
  currentPose?: PoseData | null;
  onCameraReady?: (isReady: boolean) => void;
}

export function CameraView({ currentPose, onCameraReady }: CameraViewProps) {
  const {
    isInitialized,
    hasPermission,
    isLoading,
    error,
    getConfiguration,
    setCameraType,
    setFlashMode,
    requestPermissions,
  } = useCamera();

  const { isInitialized: isPoseInitialized } = usePoseDetection();

  // Notify parent when camera readiness changes
  useEffect(() => {
    const isReady = isInitialized && hasPermission && !error;
    onCameraReady?.(isReady);
  }, [isInitialized, hasPermission, error, onCameraReady]);

  const handleFlipCamera = () => {
    const config = getConfiguration();
    const newType = config.type === 'back' ? 'front' : 'back';
    setCameraType(newType);
  };

  const handleToggleFlash = () => {
    const config = getConfiguration();
    const newFlashMode = config.flashMode === 'off' ? 'torch' : 'off';
    setFlashMode(newFlashMode);
  };

  const handleRequestPermission = async () => {
    await requestPermissions();
  };

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.statusText}>Initializing camera...</Text>
      </View>
    );
  }

  // Permission request
  if (!hasPermission) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.statusText}>Camera permission required</Text>
        <Text style={styles.subText}>
          This app needs camera access to detect push-ups
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={handleRequestPermission}
          testID="request-permission-button"
        >
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorTitle}>Camera Error</Text>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  // Camera not initialized
  if (!isInitialized) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.statusText}>Setting up camera...</Text>
      </View>
    );
  }

  const config = getConfiguration();

  return (
    <View style={styles.container} testID="camera-view">
      {/* Camera Placeholder - In real implementation, this would be expo-camera */}
      <View style={styles.camera} accessibilityLabel="Camera view">
        {/* Pose Overlay */}
        {currentPose && <PoseOverlay pose={currentPose} />}

        {/* Camera Preview Placeholder */}
        <View style={styles.cameraPlaceholder}>
          <Text style={styles.placeholderText}>📷 Camera Preview</Text>
          <Text style={styles.placeholderSubtext}>
            {config.type === 'front' ? 'Front Camera' : 'Back Camera'}
          </Text>
          <Text style={styles.placeholderSubtext}>
            Flash: {config.flashMode === 'off' ? 'Off' : 'On'}
          </Text>
        </View>

        {/* Camera Controls */}
        <View style={styles.controlsContainer}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={handleFlipCamera}
            testID="flip-camera-button"
            accessibilityLabel="Flip camera"
          >
            <Text style={styles.controlButtonText}>↻</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlButton}
            onPress={handleToggleFlash}
            testID="flash-button"
            accessibilityLabel="Toggle flash"
          >
            <Text style={styles.controlButtonText}>
              {config.flashMode === 'off' ? '⚡' : '⚡️'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

interface PoseOverlayProps {
  pose: PoseData;
}

function PoseOverlay({ pose }: PoseOverlayProps) {
  // Only render keypoints with sufficient confidence
  const visibleKeypoints = pose.keypoints.filter(kp => kp.confidence > 0.5);

  if (visibleKeypoints.length === 0) {
    return null;
  }

  return (
    <Svg style={StyleSheet.absoluteFillObject} testID="pose-overlay">
      {/* Render keypoints as circles */}
      {visibleKeypoints.map((keypoint) => (
        <Circle
          key={keypoint.name}
          cx={keypoint.x}
          cy={keypoint.y}
          r="4"
          fill="#00FF00"
          stroke="#FFFFFF"
          strokeWidth="1"
          testID={`keypoint-${keypoint.name}`}
        />
      ))}

      {/* Render skeleton connections */}
      {renderSkeleton(visibleKeypoints)}
    </Svg>
  );
}

function renderSkeleton(keypoints: Array<{ x: number; y: number; name: string }>) {
  const connections = [
    // Head to shoulders
    ['nose', 'left_shoulder'],
    ['nose', 'right_shoulder'],
    
    // Shoulders to elbows
    ['left_shoulder', 'left_elbow'],
    ['right_shoulder', 'right_elbow'],
    
    // Elbows to wrists
    ['left_elbow', 'left_wrist'],
    ['right_elbow', 'right_wrist'],
    
    // Torso
    ['left_shoulder', 'right_shoulder'],
    ['left_shoulder', 'left_hip'],
    ['right_shoulder', 'right_hip'],
    ['left_hip', 'right_hip'],
  ];

  const keypointMap = new Map(keypoints.map(kp => [kp.name, kp]));
  
  return connections.map(([from, to], index) => {
    const fromPoint = keypointMap.get(from);
    const toPoint = keypointMap.get(to);
    
    if (!fromPoint || !toPoint) return null;
    
    return (
      <Line
        key={`${from}-${to}-${index}`}
        x1={fromPoint.x}
        y1={fromPoint.y}
        x2={toPoint.x}
        y2={toPoint.y}
        stroke="#00FF00"
        strokeWidth="2"
        opacity="0.7"
      />
    );
  }).filter((line): line is React.JSX.Element => line !== null);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 20,
  },
  statusText: {
    color: '#FFF',
    fontSize: 18,
    marginTop: 20,
    textAlign: 'center',
  },
  subText: {
    color: '#CCC',
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorTitle: {
    color: '#FF6B6B',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 16,
    textAlign: 'center',
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginTop: 30,
  },
  permissionButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  controlsContainer: {
    position: 'absolute',
    top: 50,
    right: 20,
    flexDirection: 'column',
    gap: 15,
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  controlButtonText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  cameraPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#333',
  },
  placeholderText: {
    color: '#FFF',
    fontSize: 24,
    marginBottom: 10,
  },
  placeholderSubtext: {
    color: '#CCC',
    fontSize: 14,
    marginBottom: 5,
  },
}); 