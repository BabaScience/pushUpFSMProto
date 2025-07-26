import { render } from '@testing-library/react-native';
import React from 'react';
import { PushUpState } from '../../types';
import { Counter } from './Counter';

describe('Counter', () => {
  describe('Rep Count Display', () => {
    test('should display zero reps initially', () => {
      const { getByText } = render(
        <Counter 
          repCount={0} 
          currentState={PushUpState.IDLE} 
          formQuality={0} 
        />
      );
      
      expect(getByText('0')).toBeTruthy();
    });

    test('should display current rep count', () => {
      const { getByText } = render(
        <Counter 
          repCount={15} 
          currentState={PushUpState.TOP_POSITION} 
          formQuality={0.85} 
        />
      );
      
      expect(getByText('15')).toBeTruthy();
    });

    test('should display large numbers correctly', () => {
      const { getByText } = render(
        <Counter 
          repCount={999} 
          currentState={PushUpState.IDLE} 
          formQuality={0.9} 
        />
      );
      
      expect(getByText('999')).toBeTruthy();
    });
  });

  describe('State Display', () => {
    test('should display IDLE state', () => {
      const { getByText } = render(
        <Counter 
          repCount={0} 
          currentState={PushUpState.IDLE} 
          formQuality={0} 
        />
      );
      
      expect(getByText('Ready to start')).toBeTruthy();
    });

    test('should display SETUP_POSITION state', () => {
      const { getByText } = render(
        <Counter 
          repCount={0} 
          currentState={PushUpState.SETUP_POSITION} 
          formQuality={0.7} 
        />
      );
      
      expect(getByText('Get in position')).toBeTruthy();
    });

    test('should display GOING_DOWN state', () => {
      const { getByText } = render(
        <Counter 
          repCount={5} 
          currentState={PushUpState.GOING_DOWN} 
          formQuality={0.8} 
        />
      );
      
      expect(getByText('Going down')).toBeTruthy();
    });

    test('should display BOTTOM_POSITION state', () => {
      const { getByText } = render(
        <Counter 
          repCount={5} 
          currentState={PushUpState.BOTTOM_POSITION} 
          formQuality={0.75} 
        />
      );
      
      expect(getByText('Hold bottom')).toBeTruthy();
    });

    test('should display GOING_UP state', () => {
      const { getByText } = render(
        <Counter 
          repCount={5} 
          currentState={PushUpState.GOING_UP} 
          formQuality={0.9} 
        />
      );
      
      expect(getByText('Push up')).toBeTruthy();
    });

    test('should display TOP_POSITION state', () => {
      const { getByText } = render(
        <Counter 
          repCount={6} 
          currentState={PushUpState.TOP_POSITION} 
          formQuality={0.85} 
        />
      );
      
      expect(getByText('Great rep!')).toBeTruthy();
    });
  });

  describe('Form Quality Display', () => {
    test('should show excellent form quality', () => {
      const { getByText } = render(
        <Counter 
          repCount={10} 
          currentState={PushUpState.GOING_DOWN} 
          formQuality={0.95} 
        />
      );
      
      expect(getByText('Excellent (95%)')).toBeTruthy();
    });

    test('should show good form quality', () => {
      const { getByText } = render(
        <Counter 
          repCount={10} 
          currentState={PushUpState.GOING_DOWN} 
          formQuality={0.8} 
        />
      );
      
      expect(getByText('Good (80%)')).toBeTruthy();
    });

    test('should show fair form quality', () => {
      const { getByText } = render(
        <Counter 
          repCount={10} 
          currentState={PushUpState.GOING_DOWN} 
          formQuality={0.6} 
        />
      );
      
      expect(getByText('Fair (60%)')).toBeTruthy();
    });

    test('should show poor form quality', () => {
      const { getByText } = render(
        <Counter 
          repCount={10} 
          currentState={PushUpState.GOING_DOWN} 
          formQuality={0.3} 
        />
      );
      
      expect(getByText('Poor (30%)')).toBeTruthy();
    });

    test('should display form quality percentage', () => {
      const { getByText } = render(
        <Counter 
          repCount={5} 
          currentState={PushUpState.GOING_UP} 
          formQuality={0.87} 
        />
      );
      
      expect(getByText('Good (87%)')).toBeTruthy();
    });
  });

  describe('Visual Indicators', () => {
    test('should have proper test IDs', () => {
      const { getByTestId } = render(
        <Counter 
          repCount={5} 
          currentState={PushUpState.GOING_DOWN} 
          formQuality={0.8} 
        />
      );
      
      expect(getByTestId('counter-container')).toBeTruthy();
      expect(getByTestId('rep-count')).toBeTruthy();
      expect(getByTestId('current-state')).toBeTruthy();
      expect(getByTestId('form-quality')).toBeTruthy();
    });

    test('should show form quality indicator colors', () => {
      const { getByTestId } = render(
        <Counter 
          repCount={5} 
          currentState={PushUpState.GOING_DOWN} 
          formQuality={0.9} 
        />
      );
      
      const formQualityIndicator = getByTestId('form-quality-indicator');
      expect(formQualityIndicator).toBeTruthy();
    });
  });

  describe('Animation States', () => {
    test('should indicate rep completion with animation', () => {
      const { getByTestId } = render(
        <Counter 
          repCount={1} 
          currentState={PushUpState.TOP_POSITION} 
          formQuality={0.8} 
          isRepCompleted={true}
        />
      );
      
      expect(getByTestId('rep-animation')).toBeTruthy();
    });

    test('should not show animation when rep not completed', () => {
      const { queryByTestId } = render(
        <Counter 
          repCount={1} 
          currentState={PushUpState.GOING_DOWN} 
          formQuality={0.8} 
          isRepCompleted={false}
        />
      );
      
      expect(queryByTestId('rep-animation')).toBeNull();
    });
  });

  describe('Accessibility', () => {
    test('should have proper accessibility labels', () => {
      const { getByLabelText } = render(
        <Counter 
          repCount={8} 
          currentState={PushUpState.GOING_UP} 
          formQuality={0.75} 
        />
      );
      
      expect(getByLabelText('Push-up counter')).toBeTruthy();
      expect(getByLabelText('Rep count: 8')).toBeTruthy();
      expect(getByLabelText('Current state: Push up')).toBeTruthy();
      expect(getByLabelText('Form quality: 75%')).toBeTruthy();
    });

    test('should announce rep completion', () => {
      const { getByLabelText } = render(
        <Counter 
          repCount={10} 
          currentState={PushUpState.TOP_POSITION} 
          formQuality={0.9} 
          isRepCompleted={true}
        />
      );
      
      expect(getByLabelText('Rep completed! Total: 10')).toBeTruthy();
    });
  });

  describe('Optional Props', () => {
    test('should work with minimal props', () => {
      const { getByText } = render(
        <Counter 
          repCount={3} 
          currentState={PushUpState.IDLE} 
          formQuality={0.5} 
        />
      );
      
      expect(getByText('3')).toBeTruthy();
      expect(getByText('Ready to start')).toBeTruthy();
    });

    test('should display session duration when provided', () => {
      const { getByText } = render(
        <Counter 
          repCount={12} 
          currentState={PushUpState.GOING_DOWN} 
          formQuality={0.8} 
          sessionDuration={125} // 2:05
        />
      );
      
      expect(getByText('2:05')).toBeTruthy();
    });

    test('should display target reps when provided', () => {
      const { getByText } = render(
        <Counter 
          repCount={8} 
          currentState={PushUpState.GOING_UP} 
          formQuality={0.7} 
          targetReps={20}
        />
      );
      
      expect(getByText('8 / 20')).toBeTruthy();
    });
  });
}); 