import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface SessionControlsProps {
  isActive: boolean;
  isPaused: boolean;
  isLoading?: boolean;
  sessionStatus?: string;
  elapsedTime?: number; // in seconds
  onStart?: () => void;
  onStop?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onReset?: () => void;
}

export function SessionControls({
  isActive,
  isPaused,
  isLoading = false,
  sessionStatus,
  elapsedTime,
  onStart,
  onStop,
  onPause,
  onResume,
  onReset,
}: SessionControlsProps) {
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getContainerStyle = () => {
    if (isPaused) {
      return [styles.container, styles.pausedContainer];
    }
    if (isActive) {
      return [styles.container, styles.activeContainer];
    }
    return styles.container;
  };

  return (
    <View 
      style={getContainerStyle()}
      testID="session-controls"
      accessibilityLabel="Session controls"
    >
      {/* Session Status and Timer */}
      {(sessionStatus || elapsedTime !== undefined) && (
        <View style={styles.statusContainer}>
          {sessionStatus && (
            <Text 
              style={styles.statusText}
              testID="session-status"
            >
              {sessionStatus}
            </Text>
          )}
          {elapsedTime !== undefined && (
            <Text style={styles.timerText}>
              {formatTime(elapsedTime)}
            </Text>
          )}
        </View>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator 
            size="small" 
            color="#007AFF"
            testID="loading-indicator"
            accessibilityLabel="Loading"
          />
        </View>
      )}

      {/* Control Buttons */}
      <View style={styles.buttonsContainer}>
        {!isActive ? (
          // Inactive State: Start and Reset buttons
          <>
            <TouchableOpacity
              style={[styles.button, styles.startButton]}
              onPress={onStart}
              disabled={isLoading}
              testID="start-button"
              accessibilityLabel="Start workout session"
              accessibilityState={{ disabled: isLoading }}
            >
              <Text style={[styles.buttonText, styles.startButtonText]}>
                Start Workout
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.resetButton]}
              onPress={onReset}
              disabled={isLoading}
              testID="reset-button"
              accessibilityLabel="Reset workout data"
              accessibilityState={{ disabled: isLoading }}
            >
              <Text style={[styles.buttonText, styles.resetButtonText]}>
                Reset
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          // Active State: Stop and Pause/Resume buttons
          <>
            <TouchableOpacity
              style={[styles.button, styles.stopButton]}
              onPress={onStop}
              disabled={isLoading}
              testID="stop-button"
              accessibilityLabel="Stop workout session"
              accessibilityState={{ disabled: isLoading }}
            >
              <Text style={[styles.buttonText, styles.stopButtonText]}>
                Stop
              </Text>
            </TouchableOpacity>

            {isPaused ? (
              <TouchableOpacity
                style={[styles.button, styles.resumeButton]}
                onPress={onResume}
                disabled={isLoading}
                testID="resume-button"
                accessibilityLabel="Resume workout session"
                accessibilityState={{ disabled: isLoading }}
              >
                <Text style={[styles.buttonText, styles.resumeButtonText]}>
                  Resume
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.button, styles.pauseButton]}
                onPress={onPause}
                disabled={isLoading}
                testID="pause-button"
                accessibilityLabel="Pause workout session"
                accessibilityState={{ disabled: isLoading }}
              >
                <Text style={[styles.buttonText, styles.pauseButtonText]}>
                  Pause
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    minWidth: 300,
  },
  activeContainer: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  pausedContainer: {
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(255, 152, 0, 0.3)',
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 5,
  },
  timerText: {
    color: '#CCCCCC',
    fontSize: 14,
    fontFamily: 'System',
  },
  loadingContainer: {
    marginBottom: 15,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    gap: 15,
  },
  button: {
    flex: 1,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  startButtonText: {
    color: '#FFFFFF',
  },
  stopButton: {
    backgroundColor: '#F44336',
  },
  stopButtonText: {
    color: '#FFFFFF',
  },
  pauseButton: {
    backgroundColor: '#FF9800',
  },
  pauseButtonText: {
    color: '#FFFFFF',
  },
  resumeButton: {
    backgroundColor: '#2196F3',
  },
  resumeButtonText: {
    color: '#FFFFFF',
  },
  resetButton: {
    backgroundColor: 'rgba(158, 158, 158, 0.3)',
    borderWidth: 1,
    borderColor: '#9E9E9E',
  },
  resetButtonText: {
    color: '#9E9E9E',
  },
}); 