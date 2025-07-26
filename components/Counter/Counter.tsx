import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { PushUpState } from '../../types';

interface CounterProps {
  repCount: number;
  currentState: PushUpState;
  formQuality: number;
  isRepCompleted?: boolean;
  sessionDuration?: number; // in seconds
  targetReps?: number;
}

export function Counter({
  repCount,
  currentState,
  formQuality,
  isRepCompleted = false,
  sessionDuration,
  targetReps,
}: CounterProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Animate when rep is completed
  useEffect(() => {
    if (isRepCompleted) {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isRepCompleted, pulseAnim]);

  const getStateText = (state: PushUpState): string => {
    switch (state) {
      case PushUpState.IDLE:
        return 'Ready to start';
      case PushUpState.SETUP_POSITION:
        return 'Get in position';
      case PushUpState.GOING_DOWN:
        return 'Going down';
      case PushUpState.BOTTOM_POSITION:
        return 'Hold bottom';
      case PushUpState.GOING_UP:
        return 'Push up';
      case PushUpState.TOP_POSITION:
        return 'Great rep!';
      default:
        return 'Ready to start';
    }
  };

  const getFormQualityText = (quality: number): string => {
    if (quality >= 0.9) return 'Excellent';
    if (quality >= 0.75) return 'Good';
    if (quality >= 0.5) return 'Fair';
    return 'Poor';
  };

  const getFormQualityColor = (quality: number): string => {
    if (quality >= 0.9) return '#4CAF50'; // Green
    if (quality >= 0.75) return '#8BC34A'; // Light Green
    if (quality >= 0.5) return '#FF9800'; // Orange
    return '#F44336'; // Red
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formQualityPercentage = Math.round(formQuality * 100);
  const stateText = getStateText(currentState);
  const formQualityText = getFormQualityText(formQuality);
  const formQualityColor = getFormQualityColor(formQuality);

  return (
    <View 
      style={styles.container} 
      testID="counter-container"
      accessibilityLabel="Push-up counter"
    >
      {/* Rep Count Display */}
      <View style={styles.repCountContainer}>
        <Animated.View 
          style={[
            styles.repCountWrapper,
            { transform: [{ scale: pulseAnim }] }
          ]}
        >
          <Text 
            style={styles.repCount}
            testID="rep-count"
            accessibilityLabel={`Rep count: ${repCount}`}
          >
            {targetReps ? `${repCount} / ${targetReps}` : repCount.toString()}
          </Text>
        </Animated.View>
        
        {/* Rep Completion Animation */}
        {isRepCompleted && (
          <View style={styles.repAnimation} testID="rep-animation">
            <Text style={styles.repAnimationText}>+1</Text>
          </View>
        )}
      </View>

      {/* Current State */}
      <View style={styles.stateContainer}>
        <Text 
          style={styles.stateText}
          testID="current-state"
          accessibilityLabel={`Current state: ${stateText}`}
        >
          {stateText}
        </Text>
      </View>

      {/* Form Quality */}
      <View style={styles.formQualityContainer}>
        <View 
          style={[
            styles.formQualityIndicator,
            { backgroundColor: formQualityColor }
          ]}
          testID="form-quality-indicator"
        />
        <Text 
          style={[styles.formQualityText, { color: formQualityColor }]}
          testID="form-quality"
          accessibilityLabel={`Form quality: ${formQualityPercentage}%`}
        >
          {`${formQualityText} (${formQualityPercentage}%)`}
        </Text>
      </View>

      {/* Session Duration */}
      {sessionDuration !== undefined && (
        <View style={styles.durationContainer}>
          <Text style={styles.durationText}>
            {formatDuration(sessionDuration)}
          </Text>
        </View>
      )}

      {/* Accessibility announcement for rep completion */}
      {isRepCompleted && (
        <Text 
          style={styles.hiddenText}
          accessibilityLabel={`Rep completed! Total: ${repCount}`}
        >
          Rep completed
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 15,
    minWidth: 200,
  },
  repCountContainer: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: 15,
  },
  repCountWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  repCount: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    fontFamily: 'System',
  },
  repAnimation: {
    position: 'absolute',
    top: -30,
    right: -20,
  },
  repAnimationText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  stateContainer: {
    marginBottom: 15,
  },
  stateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  formQualityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  formQualityIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  formQualityText: {
    fontSize: 16,
    fontWeight: '500',
  },
  durationContainer: {
    marginTop: 10,
  },
  durationText: {
    fontSize: 14,
    color: '#CCCCCC',
    textAlign: 'center',
  },
  hiddenText: {
    position: 'absolute',
    left: -10000,
    width: 1,
    height: 1,
    overflow: 'hidden',
  },
}); 