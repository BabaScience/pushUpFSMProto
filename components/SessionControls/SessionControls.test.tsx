import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { SessionControls } from './SessionControls';

describe('SessionControls', () => {
  const defaultProps = {
    isActive: false,
    isPaused: false,
    onStart: jest.fn(),
    onStop: jest.fn(),
    onPause: jest.fn(),
    onResume: jest.fn(),
    onReset: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    test('should render start button when session is inactive', () => {
      const { getByText, getByTestId } = render(
        <SessionControls {...defaultProps} />
      );
      
      expect(getByText('Start Workout')).toBeTruthy();
      expect(getByTestId('start-button')).toBeTruthy();
    });

    test('should show proper test IDs for inactive state', () => {
      const { getByTestId } = render(
        <SessionControls {...defaultProps} />
      );
      
      expect(getByTestId('session-controls')).toBeTruthy();
      expect(getByTestId('start-button')).toBeTruthy();
      expect(getByTestId('reset-button')).toBeTruthy();
    });
  });

  describe('Active Session State', () => {
    test('should render stop and pause buttons when session is active', () => {
      const { getByText, getByTestId } = render(
        <SessionControls 
          {...defaultProps}
          isActive={true}
        />
      );
      
      expect(getByText('Stop')).toBeTruthy();
      expect(getByText('Pause')).toBeTruthy();
      expect(getByTestId('stop-button')).toBeTruthy();
      expect(getByTestId('pause-button')).toBeTruthy();
    });

    test('should not show start button when session is active', () => {
      const { queryByTestId } = render(
        <SessionControls 
          {...defaultProps}
          isActive={true}
        />
      );
      
      expect(queryByTestId('start-button')).toBeNull();
    });
  });

  describe('Paused Session State', () => {
    test('should render resume and stop buttons when session is paused', () => {
      const { getByText, getByTestId } = render(
        <SessionControls 
          {...defaultProps}
          isActive={true}
          isPaused={true}
        />
      );
      
      expect(getByText('Resume')).toBeTruthy();
      expect(getByText('Stop')).toBeTruthy();
      expect(getByTestId('resume-button')).toBeTruthy();
      expect(getByTestId('stop-button')).toBeTruthy();
    });

    test('should not show pause button when session is paused', () => {
      const { queryByTestId } = render(
        <SessionControls 
          {...defaultProps}
          isActive={true}
          isPaused={true}
        />
      );
      
      expect(queryByTestId('pause-button')).toBeNull();
    });
  });

  describe('Button Interactions', () => {
    test('should call onStart when start button is pressed', () => {
      const mockOnStart = jest.fn();
      const { getByTestId } = render(
        <SessionControls 
          {...defaultProps}
          onStart={mockOnStart}
        />
      );
      
      fireEvent.press(getByTestId('start-button'));
      
      expect(mockOnStart).toHaveBeenCalledTimes(1);
    });

    test('should call onStop when stop button is pressed', () => {
      const mockOnStop = jest.fn();
      const { getByTestId } = render(
        <SessionControls 
          {...defaultProps}
          isActive={true}
          onStop={mockOnStop}
        />
      );
      
      fireEvent.press(getByTestId('stop-button'));
      
      expect(mockOnStop).toHaveBeenCalledTimes(1);
    });

    test('should call onPause when pause button is pressed', () => {
      const mockOnPause = jest.fn();
      const { getByTestId } = render(
        <SessionControls 
          {...defaultProps}
          isActive={true}
          onPause={mockOnPause}
        />
      );
      
      fireEvent.press(getByTestId('pause-button'));
      
      expect(mockOnPause).toHaveBeenCalledTimes(1);
    });

    test('should call onResume when resume button is pressed', () => {
      const mockOnResume = jest.fn();
      const { getByTestId } = render(
        <SessionControls 
          {...defaultProps}
          isActive={true}
          isPaused={true}
          onResume={mockOnResume}
        />
      );
      
      fireEvent.press(getByTestId('resume-button'));
      
      expect(mockOnResume).toHaveBeenCalledTimes(1);
    });

    test('should call onReset when reset button is pressed', () => {
      const mockOnReset = jest.fn();
      const { getByTestId } = render(
        <SessionControls 
          {...defaultProps}
          onReset={mockOnReset}
        />
      );
      
      fireEvent.press(getByTestId('reset-button'));
      
      expect(mockOnReset).toHaveBeenCalledTimes(1);
    });
  });

  describe('Button States', () => {
    test('should disable start button when loading', () => {
      const { getByTestId } = render(
        <SessionControls 
          {...defaultProps}
          isLoading={true}
        />
      );
      
      const startButton = getByTestId('start-button');
      expect(startButton.props.accessibilityState.disabled).toBe(true);
    });

    test('should disable all buttons when loading', () => {
      const { getByTestId } = render(
        <SessionControls 
          {...defaultProps}
          isActive={true}
          isLoading={true}
        />
      );
      
      expect(getByTestId('stop-button').props.accessibilityState.disabled).toBe(true);
      expect(getByTestId('pause-button').props.accessibilityState.disabled).toBe(true);
    });

    test('should show loading indicator when loading', () => {
      const { getByTestId } = render(
        <SessionControls 
          {...defaultProps}
          isLoading={true}
        />
      );
      
      expect(getByTestId('loading-indicator')).toBeTruthy();
    });
  });

  describe('Session Status Display', () => {
    test('should display session status when provided', () => {
      const { getByText } = render(
        <SessionControls 
          {...defaultProps}
          isActive={true}
          sessionStatus="5 reps completed"
        />
      );
      
      expect(getByText('5 reps completed')).toBeTruthy();
    });

    test('should not display session status when not provided', () => {
      const { queryByTestId } = render(
        <SessionControls {...defaultProps} />
      );
      
      expect(queryByTestId('session-status')).toBeNull();
    });

    test('should display elapsed time when provided', () => {
      const { getByText } = render(
        <SessionControls 
          {...defaultProps}
          isActive={true}
          elapsedTime={125} // 2:05
        />
      );
      
      expect(getByText('2:05')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    test('should have proper accessibility labels for inactive state', () => {
      const { getByLabelText } = render(
        <SessionControls {...defaultProps} />
      );
      
      expect(getByLabelText('Session controls')).toBeTruthy();
      expect(getByLabelText('Start workout session')).toBeTruthy();
      expect(getByLabelText('Reset workout data')).toBeTruthy();
    });

    test('should have proper accessibility labels for active state', () => {
      const { getByLabelText } = render(
        <SessionControls 
          {...defaultProps}
          isActive={true}
        />
      );
      
      expect(getByLabelText('Stop workout session')).toBeTruthy();
      expect(getByLabelText('Pause workout session')).toBeTruthy();
    });

    test('should have proper accessibility labels for paused state', () => {
      const { getByLabelText } = render(
        <SessionControls 
          {...defaultProps}
          isActive={true}
          isPaused={true}
        />
      );
      
      expect(getByLabelText('Resume workout session')).toBeTruthy();
      expect(getByLabelText('Stop workout session')).toBeTruthy();
    });

    test('should announce loading state', () => {
      const { getByLabelText } = render(
        <SessionControls 
          {...defaultProps}
          isLoading={true}
        />
      );
      
      expect(getByLabelText('Loading')).toBeTruthy();
    });
  });

  describe('Visual States', () => {
    test('should apply active state styling', () => {
      const { getByTestId } = render(
        <SessionControls 
          {...defaultProps}
          isActive={true}
        />
      );
      
      const container = getByTestId('session-controls');
      expect(Array.isArray(container.props.style)).toBe(true);
      expect(container.props.style[1]).toEqual(
        expect.objectContaining({
          backgroundColor: 'rgba(76, 175, 80, 0.1)',
        })
      );
    });

    test('should apply paused state styling', () => {
      const { getByTestId } = render(
        <SessionControls 
          {...defaultProps}
          isActive={true}
          isPaused={true}
        />
      );
      
      const container = getByTestId('session-controls');
      expect(Array.isArray(container.props.style)).toBe(true);
      expect(container.props.style[1]).toEqual(
        expect.objectContaining({
          backgroundColor: 'rgba(255, 152, 0, 0.1)',
        })
      );
    });
  });

  describe('Edge Cases', () => {
    test('should handle missing callback functions gracefully', () => {
      const { getByTestId } = render(
        <SessionControls 
          isActive={false}
          isPaused={false}
        />
      );
      
      // Should not crash when pressing buttons without callbacks
      expect(() => {
        fireEvent.press(getByTestId('reset-button'));
      }).not.toThrow();
    });

    test('should render with minimal props', () => {
      const { getByTestId } = render(
        <SessionControls 
          isActive={false}
          isPaused={false}
        />
      );
      
      expect(getByTestId('session-controls')).toBeTruthy();
    });
  });
}); 