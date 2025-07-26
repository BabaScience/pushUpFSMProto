import AsyncStorage from '@react-native-async-storage/async-storage';

export interface WorkoutSession {
  id: string;
  date: string;
  startTime: number;
  endTime: number;
  totalReps: number;
  averageFormQuality: number;
  duration: number; // in seconds
  formConsistency: number;
}

export interface WorkoutStatistics {
  totalWorkouts: number;
  totalReps: number;
  totalDuration: number; // in seconds
  averageRepsPerWorkout: number;
  averageWorkoutDuration: number;
  bestFormQuality: number;
  averageFormQuality: number;
  currentStreak: number;
  longestStreak: number;
}

export interface StorageResult {
  success: boolean;
  error?: string;
}

export interface StorageUsage {
  totalKeys: number;
  workoutKeys: number;
}

export class StorageService {
  private readonly SESSION_PREFIX = 'workout_session_';
  private readonly STATS_KEY = 'workout_statistics';

  /**
   * Save a workout session
   */
  async saveWorkoutSession(session: WorkoutSession): Promise<StorageResult> {
    try {
      const key = `${this.SESSION_PREFIX}${session.id}`;
      await AsyncStorage.setItem(key, JSON.stringify(session));
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save workout session',
      };
    }
  }

  /**
   * Get a workout session by ID
   */
  async getWorkoutSession(sessionId: string): Promise<WorkoutSession | null> {
    try {
      const key = `${this.SESSION_PREFIX}${sessionId}`;
      const data = await AsyncStorage.getItem(key);
      
      if (!data) {
        return null;
      }

      return JSON.parse(data) as WorkoutSession;
    } catch (error) {
      console.warn('Error retrieving workout session:', error);
      return null;
    }
  }

  /**
   * Get workout history with optional limit
   */
  async getWorkoutHistory(limit?: number): Promise<WorkoutSession[]> {
    try {
      // Get all keys
      const allKeys = await AsyncStorage.getAllKeys();
      
      // Filter workout session keys
      const sessionKeys = allKeys
        .filter(key => key.startsWith(this.SESSION_PREFIX))
        .sort() // Sort by key (which includes timestamp-based IDs)
        .reverse(); // Most recent first

      // Apply limit if specified
      const keysToFetch = limit ? sessionKeys.slice(0, limit) : sessionKeys;

      if (keysToFetch.length === 0) {
        return [];
      }

      // Get session data
      const sessionData = await AsyncStorage.multiGet(keysToFetch);
      
      // Parse and filter valid sessions
      const sessions: WorkoutSession[] = [];
      for (const [key, value] of sessionData) {
        if (value) {
          try {
            const session = JSON.parse(value) as WorkoutSession;
            sessions.push(session);
          } catch (error) {
            console.warn(`Corrupted session data for key ${key}:`, error);
          }
        }
      }

      return sessions;
    } catch (error) {
      console.warn('Error retrieving workout history:', error);
      return [];
    }
  }

  /**
   * Save workout statistics
   */
  async saveWorkoutStats(stats: WorkoutStatistics): Promise<StorageResult> {
    try {
      await AsyncStorage.setItem(this.STATS_KEY, JSON.stringify(stats));
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save workout statistics',
      };
    }
  }

  /**
   * Get workout statistics
   */
  async getWorkoutStats(): Promise<WorkoutStatistics> {
    try {
      const data = await AsyncStorage.getItem(this.STATS_KEY);
      
      if (!data) {
        // Return default stats if none exist
        return this.getDefaultStats();
      }

      return JSON.parse(data) as WorkoutStatistics;
    } catch (error) {
      console.warn('Error retrieving workout statistics:', error);
      return this.getDefaultStats();
    }
  }

  /**
   * Update statistics after a workout
   */
  async updateStatsAfterWorkout(session: Partial<WorkoutSession>): Promise<StorageResult> {
    try {
      const currentStats = await this.getWorkoutStats();
      
      // Update statistics
      const updatedStats: WorkoutStatistics = {
        totalWorkouts: currentStats.totalWorkouts + 1,
        totalReps: currentStats.totalReps + (session.totalReps || 0),
        totalDuration: currentStats.totalDuration + (session.duration || 0),
        averageRepsPerWorkout: 0, // Will be calculated below
        averageWorkoutDuration: 0, // Will be calculated below
        bestFormQuality: Math.max(currentStats.bestFormQuality, session.averageFormQuality || 0),
        averageFormQuality: 0, // Will be calculated below
        currentStreak: currentStats.currentStreak + 1, // Simplified - would need date logic for real streak
        longestStreak: Math.max(currentStats.longestStreak, currentStats.currentStreak + 1),
      };

      // Calculate averages
      updatedStats.averageRepsPerWorkout = updatedStats.totalReps / updatedStats.totalWorkouts;
      updatedStats.averageWorkoutDuration = updatedStats.totalDuration / updatedStats.totalWorkouts;
      
      // Calculate average form quality (weighted by total workouts)
      const totalFormQuality = (currentStats.averageFormQuality * currentStats.totalWorkouts) + (session.averageFormQuality || 0);
      updatedStats.averageFormQuality = totalFormQuality / updatedStats.totalWorkouts;

      return await this.saveWorkoutStats(updatedStats);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update workout statistics',
      };
    }
  }

  /**
   * Delete a workout session
   */
  async deleteWorkoutSession(sessionId: string): Promise<StorageResult> {
    try {
      const key = `${this.SESSION_PREFIX}${sessionId}`;
      await AsyncStorage.removeItem(key);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete workout session',
      };
    }
  }

  /**
   * Clear all workout data
   */
  async clearAllWorkoutData(): Promise<StorageResult> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      
      // Filter workout-related keys
      const workoutKeys = allKeys.filter(key => 
        key.startsWith(this.SESSION_PREFIX) || key === this.STATS_KEY
      );

      if (workoutKeys.length > 0) {
        await AsyncStorage.multiRemove(workoutKeys);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to clear workout data',
      };
    }
  }

  /**
   * Get storage usage information
   */
  async getStorageUsage(): Promise<StorageUsage> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const workoutKeys = allKeys.filter(key => 
        key.startsWith(this.SESSION_PREFIX) || key === this.STATS_KEY
      );

      return {
        totalKeys: allKeys.length,
        workoutKeys: workoutKeys.length,
      };
    } catch (error) {
      console.warn('Error getting storage usage:', error);
      return {
        totalKeys: 0,
        workoutKeys: 0,
      };
    }
  }

  /**
   * Get default statistics
   */
  private getDefaultStats(): WorkoutStatistics {
    return {
      totalWorkouts: 0,
      totalReps: 0,
      totalDuration: 0,
      averageRepsPerWorkout: 0,
      averageWorkoutDuration: 0,
      bestFormQuality: 0,
      averageFormQuality: 0,
      currentStreak: 0,
      longestStreak: 0,
    };
  }
}

// Singleton instance
export const storageService = new StorageService(); 