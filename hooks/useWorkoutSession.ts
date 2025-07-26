import { useCallback, useEffect, useRef, useState } from 'react';
import type { WorkoutSession, WorkoutStatistics } from '../services/storageService';
import { storageService } from '../services/storageService';
import { PushUpState } from '../types';

export interface SessionUpdate {
  totalReps: number;
  currentState: PushUpState;
  formQuality: number;
}

export interface CurrentSession {
  id: string;
  startTime: number;
  endTime?: number;
  totalReps: number;
  duration: number;
  currentState: PushUpState;
  averageFormQuality: number;
  formQualityHistory: number[];
  formConsistency: number;
  isPaused: boolean;
  pausedDuration: number;
}

export interface SessionSummary {
  totalReps: number;
  duration: number;
  averageFormQuality: number;
  formConsistency: number;
  startTime: number;
}

export interface UseWorkoutSessionReturn {
  // State
  currentSession: CurrentSession | null;
  isSessionActive: boolean;
  sessionHistory: WorkoutSession[];
  workoutStats: WorkoutStatistics | null;
  isLoading: boolean;
  error: string | null;

  // Session Management
  startSession: () => void;
  endSession: () => Promise<void>;
  pauseSession: () => void;
  resumeSession: () => void;
  cancelSession: () => void;
  updateSession: (update: SessionUpdate) => void;

  // History & Stats
  refreshHistory: () => Promise<void>;
  refreshStats: () => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  clearAllData: () => Promise<void>;

  // Utilities
  getCurrentSessionSummary: () => SessionSummary | null;
}

export function useWorkoutSession(): UseWorkoutSessionReturn {
  const [currentSession, setCurrentSession] = useState<CurrentSession | null>(null);
  const [sessionHistory, setSessionHistory] = useState<WorkoutSession[]>([]);
  const [workoutStats, setWorkoutStats] = useState<WorkoutStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pauseStartTimeRef = useRef<number | null>(null);

  // Computed state
  const isSessionActive = currentSession !== null;

  /**
   * Generate unique session ID
   */
  const generateSessionId = useCallback(() => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  /**
   * Load initial data on mount
   */
  const loadInitialData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [history, stats] = await Promise.all([
        storageService.getWorkoutHistory(),
        storageService.getWorkoutStats(),
      ]);

      setSessionHistory(history);
      setWorkoutStats(stats);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load workout data';
      setError(errorMessage);
      console.error('Error loading initial data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Start a new workout session
   */
  const startSession = useCallback(() => {
    if (currentSession) {
      console.warn('Session already active');
      return;
    }

    const newSession: CurrentSession = {
      id: generateSessionId(),
      startTime: Date.now(),
      totalReps: 0,
      duration: 0,
      currentState: PushUpState.IDLE,
      averageFormQuality: 0,
      formQualityHistory: [],
      formConsistency: 0,
      isPaused: false,
      pausedDuration: 0,
    };

    setCurrentSession(newSession);
    setError(null);
  }, [currentSession, generateSessionId]);

  /**
   * End current workout session and save it
   */
  const endSession = useCallback(async () => {
    if (!currentSession) {
      console.warn('No active session to end');
      return;
    }

    try {
      setError(null);

      // Calculate final session data
      const endTime = Date.now();
      const totalDuration = Math.floor((endTime - currentSession.startTime - currentSession.pausedDuration) / 1000);
      
      const sessionToSave: WorkoutSession = {
        id: currentSession.id,
        date: new Date(currentSession.startTime).toISOString().split('T')[0],
        startTime: currentSession.startTime,
        endTime,
        totalReps: currentSession.totalReps,
        duration: totalDuration,
        averageFormQuality: currentSession.averageFormQuality,
        formConsistency: currentSession.formConsistency,
      };

      // Save session
      const saveResult = await storageService.saveWorkoutSession(sessionToSave);
      if (!saveResult.success) {
        throw new Error(saveResult.error || 'Failed to save session');
      }

      // Update statistics
      const statsResult = await storageService.updateStatsAfterWorkout(sessionToSave);
      if (!statsResult.success) {
        console.warn('Failed to update stats:', statsResult.error);
      }

      // Refresh data
      await Promise.all([refreshHistory(), refreshStats()]);

      // Clear current session
      setCurrentSession(null);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to end session';
      setError(errorMessage);
      console.error('Error ending session:', err);
    }
  }, [currentSession]);

  /**
   * Pause current session
   */
  const pauseSession = useCallback(() => {
    if (!currentSession || currentSession.isPaused) {
      return;
    }

    pauseStartTimeRef.current = Date.now();
    setCurrentSession(prev => prev ? { ...prev, isPaused: true } : null);
  }, [currentSession]);

  /**
   * Resume paused session
   */
  const resumeSession = useCallback(() => {
    if (!currentSession || !currentSession.isPaused) {
      return;
    }

    const pauseDuration = pauseStartTimeRef.current ? Date.now() - pauseStartTimeRef.current : 0;
    pauseStartTimeRef.current = null;

    setCurrentSession(prev => prev ? {
      ...prev,
      isPaused: false,
      pausedDuration: prev.pausedDuration + pauseDuration,
    } : null);
  }, [currentSession]);

  /**
   * Cancel current session without saving
   */
  const cancelSession = useCallback(() => {
    setCurrentSession(null);
    pauseStartTimeRef.current = null;
    setError(null);
  }, []);

  /**
   * Update current session with new data
   */
  const updateSession = useCallback((update: SessionUpdate) => {
    if (!currentSession) {
      return;
    }

    setCurrentSession(prev => {
      if (!prev) return null;

      // Calculate current duration (excluding paused time)
      const currentTime = Date.now();
      const totalElapsed = currentTime - prev.startTime;
      const activeDuration = Math.floor((totalElapsed - prev.pausedDuration) / 1000);

      // Update form quality history
      const newFormQualityHistory = [...prev.formQualityHistory, update.formQuality];
      const averageFormQuality = newFormQualityHistory.reduce((sum, quality) => sum + quality, 0) / newFormQualityHistory.length;

      // Calculate form consistency (standard deviation of form quality)
      const variance = newFormQualityHistory.reduce((sum, quality) => sum + Math.pow(quality - averageFormQuality, 2), 0) / newFormQualityHistory.length;
      const formConsistency = Math.max(0, 1 - Math.sqrt(variance));

      return {
        ...prev,
        totalReps: update.totalReps,
        currentState: update.currentState,
        duration: activeDuration,
        averageFormQuality,
        formQualityHistory: newFormQualityHistory,
        formConsistency,
      };
    });
  }, [currentSession]);

  /**
   * Refresh session history
   */
  const refreshHistory = useCallback(async () => {
    try {
      setError(null);
      const history = await storageService.getWorkoutHistory();
      setSessionHistory(history);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh history';
      setError(errorMessage);
      console.error('Error refreshing history:', err);
    }
  }, []);

  /**
   * Refresh workout statistics
   */
  const refreshStats = useCallback(async () => {
    try {
      setError(null);
      const stats = await storageService.getWorkoutStats();
      setWorkoutStats(stats);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh stats';
      setError(errorMessage);
      console.error('Error refreshing stats:', err);
    }
  }, []);

  /**
   * Delete a session from history
   */
  const deleteSession = useCallback(async (sessionId: string) => {
    try {
      setError(null);
      const result = await storageService.deleteWorkoutSession(sessionId);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete session');
      }

      // Refresh data
      await Promise.all([refreshHistory(), refreshStats()]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete session';
      setError(errorMessage);
      console.error('Error deleting session:', err);
    }
  }, [refreshHistory, refreshStats]);

  /**
   * Clear all workout data
   */
  const clearAllData = useCallback(async () => {
    try {
      setError(null);
      const result = await storageService.clearAllWorkoutData();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to clear data');
      }

      // Clear local state
      setSessionHistory([]);
      setWorkoutStats(null);
      setCurrentSession(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear data';
      setError(errorMessage);
      console.error('Error clearing data:', err);
    }
  }, []);

  /**
   * Get current session summary
   */
  const getCurrentSessionSummary = useCallback((): SessionSummary | null => {
    if (!currentSession) {
      return null;
    }

    return {
      totalReps: currentSession.totalReps,
      duration: currentSession.duration,
      averageFormQuality: currentSession.averageFormQuality,
      formConsistency: currentSession.formConsistency,
      startTime: currentSession.startTime,
    };
  }, [currentSession]);

  /**
   * Load initial data on mount
   */
  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  /**
   * Save active session on unmount
   */
  useEffect(() => {
    return () => {
      if (currentSession && currentSession.totalReps > 0) {
        // Save session on unmount if there's meaningful progress
        storageService.saveWorkoutSession({
          id: currentSession.id,
          date: new Date(currentSession.startTime).toISOString().split('T')[0],
          startTime: currentSession.startTime,
          endTime: Date.now(),
          totalReps: currentSession.totalReps,
          duration: currentSession.duration,
          averageFormQuality: currentSession.averageFormQuality,
          formConsistency: currentSession.formConsistency,
        }).catch(err => {
          console.error('Error saving session on unmount:', err);
        });
      }
    };
  }, [currentSession]);

  return {
    // State
    currentSession,
    isSessionActive,
    sessionHistory,
    workoutStats,
    isLoading,
    error,

    // Session Management
    startSession,
    endSession,
    pauseSession,
    resumeSession,
    cancelSession,
    updateSession,

    // History & Stats
    refreshHistory,
    refreshStats,
    deleteSession,
    clearAllData,

    // Utilities
    getCurrentSessionSummary,
  };
} 