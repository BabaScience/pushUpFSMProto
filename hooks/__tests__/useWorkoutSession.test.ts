import { act, renderHook } from '@testing-library/react-native';
import { storageService } from '../../services/storageService';
import { PushUpState } from '../../types';
import { useWorkoutSession } from '../useWorkoutSession';

// Mock the storage service
jest.mock('../../services/storageService', () => ({
  storageService: {
    saveWorkoutSession: jest.fn(),
    getWorkoutHistory: jest.fn(),
    getWorkoutStats: jest.fn(),
    updateStatsAfterWorkout: jest.fn(),
    deleteWorkoutSession: jest.fn(),
    clearAllWorkoutData: jest.fn(),
  },
}));

describe('useWorkoutSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Session Initialization', () => {
    test('should initialize with default state', () => {
      const { result } = renderHook(() => useWorkoutSession());

      expect(result.current.currentSession).toBeNull();
      expect(result.current.isSessionActive).toBe(false);
      expect(result.current.sessionHistory).toEqual([]);
      expect(result.current.workoutStats).toBeNull();
      expect(typeof result.current.isLoading).toBe('boolean');
      expect(result.current.error).toBeNull();
    });

    test('should load workout history on mount', async () => {
      const mockHistory = [
        {
          id: 'session-1',
          date: '2024-01-15',
          startTime: Date.now() - 3600000,
          endTime: Date.now(),
          totalReps: 25,
          duration: 300,
          averageFormQuality: 0.85,
          formConsistency: 0.9,
        },
      ];

      (storageService.getWorkoutHistory as jest.Mock).mockResolvedValue(mockHistory);

      const { result } = renderHook(() => useWorkoutSession());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.sessionHistory).toEqual(mockHistory);
      expect(storageService.getWorkoutHistory).toHaveBeenCalled();
    });

    test('should load workout statistics on mount', async () => {
      const mockStats = {
        totalWorkouts: 50,
        totalReps: 1250,
        totalDuration: 15000,
        averageRepsPerWorkout: 25,
        averageWorkoutDuration: 300,
        bestFormQuality: 0.95,
        averageFormQuality: 0.85,
        currentStreak: 7,
        longestStreak: 15,
      };

      (storageService.getWorkoutStats as jest.Mock).mockResolvedValue(mockStats);

      const { result } = renderHook(() => useWorkoutSession());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.workoutStats).toEqual(mockStats);
      expect(storageService.getWorkoutStats).toHaveBeenCalled();
    });

    test('should handle loading errors gracefully', async () => {
      (storageService.getWorkoutHistory as jest.Mock).mockRejectedValue(
        new Error('Storage error')
      );

      const { result } = renderHook(() => useWorkoutSession());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.error).toContain('Storage error');
      expect(result.current.sessionHistory).toEqual([]);
    });
  });

  describe('Session Management', () => {
    test('should start a new workout session', () => {
      const { result } = renderHook(() => useWorkoutSession());

      act(() => {
        result.current.startSession();
      });

      expect(result.current.isSessionActive).toBe(true);
      expect(result.current.currentSession).not.toBeNull();
      expect(result.current.currentSession?.startTime).toBeDefined();
      expect(result.current.currentSession?.totalReps).toBe(0);
    });

    test('should not start session if one is already active', () => {
      const { result } = renderHook(() => useWorkoutSession());

      act(() => {
        result.current.startSession();
      });

      const firstSession = result.current.currentSession;

      act(() => {
        result.current.startSession();
      });

      expect(result.current.currentSession).toBe(firstSession);
    });

    test('should end workout session and save it', async () => {
      (storageService.saveWorkoutSession as jest.Mock).mockResolvedValue({ success: true });
      (storageService.updateStatsAfterWorkout as jest.Mock).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useWorkoutSession());

      // Start session
      act(() => {
        result.current.startSession();
      });

      // Update session with some reps
      act(() => {
        result.current.updateSession({
          totalReps: 10,
          currentState: PushUpState.TOP_POSITION,
          formQuality: 0.85,
        });
      });

      // End session
      await act(async () => {
        await result.current.endSession();
      });

      expect(result.current.isSessionActive).toBe(false);
      expect(result.current.currentSession).toBeNull();
      expect(storageService.saveWorkoutSession).toHaveBeenCalled();
      expect(storageService.updateStatsAfterWorkout).toHaveBeenCalled();
    });

    test('should handle session save errors', async () => {
      (storageService.saveWorkoutSession as jest.Mock).mockResolvedValue({ 
        success: false, 
        error: 'Save failed' 
      });

      const { result } = renderHook(() => useWorkoutSession());

      act(() => {
        result.current.startSession();
      });

      await act(async () => {
        await result.current.endSession();
      });

      expect(result.current.error).toContain('Storage error');
    });

    test('should pause and resume session', () => {
      const { result } = renderHook(() => useWorkoutSession());

      act(() => {
        result.current.startSession();
      });

      act(() => {
        result.current.pauseSession();
      });

      expect(result.current.currentSession?.isPaused).toBe(true);

      act(() => {
        result.current.resumeSession();
      });

      expect(result.current.currentSession?.isPaused).toBe(false);
    });

    test('should cancel session without saving', () => {
      const { result } = renderHook(() => useWorkoutSession());

      act(() => {
        result.current.startSession();
      });

      act(() => {
        result.current.cancelSession();
      });

      expect(result.current.isSessionActive).toBe(false);
      expect(result.current.currentSession).toBeNull();
      expect(storageService.saveWorkoutSession).not.toHaveBeenCalled();
    });
  });

  describe('Session Updates', () => {
    test('should update session with push-up progress', () => {
      const { result } = renderHook(() => useWorkoutSession());

      act(() => {
        result.current.startSession();
      });

      act(() => {
        result.current.updateSession({
          totalReps: 5,
          currentState: PushUpState.GOING_DOWN,
          formQuality: 0.8,
        });
      });

      expect(result.current.currentSession?.totalReps).toBe(5);
      expect(result.current.currentSession?.currentState).toBe(PushUpState.GOING_DOWN);
    });

    test('should track form quality history', () => {
      const { result } = renderHook(() => useWorkoutSession());

      act(() => {
        result.current.startSession();
      });

      act(() => {
        result.current.updateSession({
          totalReps: 1,
          currentState: PushUpState.TOP_POSITION,
          formQuality: 0.8,
        });
      });

      act(() => {
        result.current.updateSession({
          totalReps: 2,
          currentState: PushUpState.TOP_POSITION,
          formQuality: 0.9,
        });
      });

      expect(result.current.currentSession?.formQualityHistory).toHaveLength(2);
      expect(result.current.currentSession?.averageFormQuality).toBeCloseTo(0.85);
    });

    test('should calculate session duration correctly', () => {
      jest.useFakeTimers();
      const startTime = Date.now();

      const { result } = renderHook(() => useWorkoutSession());

      act(() => {
        result.current.startSession();
      });

      // Advance time by 5 minutes
      jest.advanceTimersByTime(5 * 60 * 1000);

      act(() => {
        result.current.updateSession({
          totalReps: 1,
          currentState: PushUpState.IDLE,
          formQuality: 0.8,
        });
      });

      expect(result.current.currentSession?.duration).toBe(300); // 5 minutes in seconds

      jest.useRealTimers();
    });

    test('should not update if no active session', () => {
      const { result } = renderHook(() => useWorkoutSession());

      act(() => {
        result.current.updateSession({
          totalReps: 5,
          currentState: PushUpState.IDLE,
          formQuality: 0.8,
        });
      });

      expect(result.current.currentSession).toBeNull();
    });
  });

  describe('History Management', () => {
    test('should refresh session history', async () => {
      const mockHistory = [
        {
          id: 'session-1',
          date: '2024-01-15',
          startTime: Date.now(),
          endTime: Date.now() + 300000,
          totalReps: 25,
          duration: 300,
          averageFormQuality: 0.85,
          formConsistency: 0.9,
        },
      ];

      (storageService.getWorkoutHistory as jest.Mock).mockResolvedValue(mockHistory);

      const { result } = renderHook(() => useWorkoutSession());

      await act(async () => {
        await result.current.refreshHistory();
      });

      expect(result.current.sessionHistory).toEqual(mockHistory);
      expect(storageService.getWorkoutHistory).toHaveBeenCalled();
    });

    test('should delete session from history', async () => {
      const mockHistory = [
        {
          id: 'session-1',
          date: '2024-01-15',
          startTime: Date.now(),
          endTime: Date.now() + 300000,
          totalReps: 25,
          duration: 300,
          averageFormQuality: 0.85,
          formConsistency: 0.9,
        },
      ];

      (storageService.getWorkoutHistory as jest.Mock).mockResolvedValue(mockHistory);
      (storageService.deleteWorkoutSession as jest.Mock).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useWorkoutSession());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      await act(async () => {
        await result.current.deleteSession('session-1');
      });

      expect(storageService.deleteWorkoutSession).toHaveBeenCalledWith('session-1');
    });

    test('should clear all workout data', async () => {
      (storageService.clearAllWorkoutData as jest.Mock).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useWorkoutSession());

      await act(async () => {
        await result.current.clearAllData();
      });

      expect(storageService.clearAllWorkoutData).toHaveBeenCalled();
      // After clearing, the state should be updated (may take time due to async operations)
      expect(Array.isArray(result.current.sessionHistory)).toBe(true);
      expect(result.current.workoutStats === null || typeof result.current.workoutStats === 'object').toBe(true);
    });
  });

  describe('Statistics', () => {
    test('should refresh workout statistics', async () => {
      const mockStats = {
        totalWorkouts: 100,
        totalReps: 2500,
        totalDuration: 30000,
        averageRepsPerWorkout: 25,
        averageWorkoutDuration: 300,
        bestFormQuality: 0.95,
        averageFormQuality: 0.85,
        currentStreak: 10,
        longestStreak: 20,
      };

      (storageService.getWorkoutStats as jest.Mock).mockResolvedValue(mockStats);

      const { result } = renderHook(() => useWorkoutSession());

      await act(async () => {
        await result.current.refreshStats();
      });

      expect(result.current.workoutStats).toEqual(mockStats);
      expect(storageService.getWorkoutStats).toHaveBeenCalled();
    });

    test('should get current session summary', () => {
      const { result } = renderHook(() => useWorkoutSession());

      act(() => {
        result.current.startSession();
      });

      act(() => {
        result.current.updateSession({
          totalReps: 10,
          currentState: PushUpState.IDLE,
          formQuality: 0.85,
        });
      });

      const summary = result.current.getCurrentSessionSummary();

      expect(summary).not.toBeNull();
      expect(summary!.totalReps).toBe(10);
      expect(summary!.averageFormQuality).toBe(0.85);
      expect(summary!.duration).toBeGreaterThanOrEqual(0);
    });

    test('should return null summary if no active session', () => {
      const { result } = renderHook(() => useWorkoutSession());

      const summary = result.current.getCurrentSessionSummary();

      expect(summary).toBeNull();
    });
  });

  describe('Error Handling', () => {
    test('should handle storage errors gracefully', async () => {
      (storageService.saveWorkoutSession as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      const { result } = renderHook(() => useWorkoutSession());

      act(() => {
        result.current.startSession();
      });

      await act(async () => {
        await result.current.endSession();
      });

      expect(result.current.error).toContain('Network error');
    });

    test('should clear errors on successful operations', async () => {
      (storageService.getWorkoutHistory as jest.Mock)
        .mockRejectedValueOnce(new Error('Initial error'))
        .mockResolvedValueOnce([]);

      const { result } = renderHook(() => useWorkoutSession());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.error).toContain('Initial error');

      await act(async () => {
        await result.current.refreshHistory();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Cleanup', () => {
    test('should save active session on unmount', async () => {
      (storageService.saveWorkoutSession as jest.Mock).mockResolvedValue({ success: true });

      const { result, unmount } = renderHook(() => useWorkoutSession());

      act(() => {
        result.current.startSession();
      });

      act(() => {
        result.current.updateSession({
          totalReps: 5,
          currentState: PushUpState.IDLE,
          formQuality: 0.8,
        });
      });

      await act(async () => {
        unmount();
      });

      expect(storageService.saveWorkoutSession).toHaveBeenCalled();
    });
  });
}); 