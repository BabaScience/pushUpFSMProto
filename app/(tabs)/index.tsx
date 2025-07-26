import { CameraView } from '@/components/CameraView/CameraView';
import { Counter } from '@/components/Counter/Counter';
import { SessionControls } from '@/components/SessionControls/SessionControls';
import { usePushUpDetection } from '@/hooks/usePushUpDetection';
import { useWorkoutSession } from '@/hooks/useWorkoutSession';
import React, { useEffect, useState } from 'react';
import { Alert, StatusBar, StyleSheet, View } from 'react-native';

export default function HomeScreen() {
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  
  // Push-up detection hook
  const {
    isActive: isDetectionActive,
    repCount,
    currentState,
    formQuality,
    formFeedback,
    currentPose,
    startDetection,
    stopDetection,
    reset: resetDetection,
    getSessionStats,
  } = usePushUpDetection();

  // Workout session management hook
  const {
    currentSession,
    startSession,
    endSession,
    pauseSession,
    resumeSession,
    cancelSession,
    updateSession,
    isLoading,
  } = useWorkoutSession();

  // Timer for elapsed time
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    
    if (currentSession && !currentSession.isPaused && sessionStartTime) {
      interval = setInterval(() => {
        const now = Date.now();
        const elapsed = Math.floor((now - sessionStartTime) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [currentSession, sessionStartTime]);

  // Handle session start
  const handleStartWorkout = async () => {
    try {
      const startTime = Date.now();
      setSessionStartTime(startTime);
      setElapsedTime(0);
      
      startSession();
      startDetection();
    } catch (error) {
      Alert.alert('Error', 'Failed to start workout session. Please try again.');
    }
  };

  // Handle session stop
  const handleStopWorkout = async () => {
    try {
      stopDetection();
      
      if (currentSession) {
        await endSession();
      }
      
      setSessionStartTime(null);
      setElapsedTime(0);
    } catch (error) {
      Alert.alert('Error', 'Failed to stop workout session. Please try again.');
    }
  };

  // Handle session pause
  const handlePauseWorkout = async () => {
    try {
      if (currentSession) {
        await pauseSession();
        stopDetection();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pause workout session. Please try again.');
    }
  };

  // Handle session resume
  const handleResumeWorkout = async () => {
    try {
      if (currentSession) {
        await resumeSession();
        startDetection();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to resume workout session. Please try again.');
    }
  };

  // Handle reset
  const handleReset = async () => {
    try {
      resetDetection();
      if (currentSession) {
        await cancelSession();
      }
      setSessionStartTime(null);
      setElapsedTime(0);
    } catch (error) {
      Alert.alert('Error', 'Failed to reset workout data. Please try again.');
    }
  };

  // Update session with current stats
  useEffect(() => {
    if (currentSession && isDetectionActive) {
      updateSession({
        totalReps: repCount,
        currentState: currentState,
        formQuality: formQuality,
      });
    }
  }, [repCount, currentState, formQuality, currentSession, isDetectionActive, updateSession]);

  const getSessionStatus = (): string | undefined => {
    if (!currentSession) return undefined;
    
    const feedback = formFeedback.length > 0 ? formFeedback[0] : '';
    if (feedback) {
      return feedback;
    }
    
    if (repCount === 0) {
      return 'Get ready to start your push-ups!';
    }
    
    return `${repCount} rep${repCount !== 1 ? 's' : ''} completed`;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      {/* Camera View - Full screen background */}
      <View style={styles.cameraContainer}>
        <CameraView 
          currentPose={currentPose}
          onCameraReady={(isReady) => {
            // Handle camera ready state if needed
            console.log('Camera ready:', isReady);
          }}
        />
      </View>

      {/* Overlay UI */}
      <View style={styles.overlayContainer}>
        {/* Counter - Top center */}
        <View style={styles.counterContainer}>
          <Counter
            repCount={repCount}
            currentState={currentState}
            formQuality={formQuality}
            sessionDuration={elapsedTime}
            isRepCompleted={false} // Could be enhanced with rep completion detection
          />
        </View>

        {/* Session Controls - Bottom */}
        <View style={styles.controlsContainer}>
          <SessionControls
            isActive={!!currentSession && !currentSession.isPaused}
            isPaused={!!currentSession && currentSession.isPaused}
            isLoading={isLoading}
            sessionStatus={getSessionStatus()}
            elapsedTime={currentSession ? elapsedTime : undefined}
            onStart={handleStartWorkout}
            onStop={handleStopWorkout}
            onPause={handlePauseWorkout}
            onResume={handleResumeWorkout}
            onReset={handleReset}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraContainer: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  overlayContainer: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60, // Account for status bar
    paddingBottom: 40,
  },
  counterContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  controlsContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
});
