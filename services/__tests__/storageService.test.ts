import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageService } from '../storageService';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  getAllKeys: jest.fn(),
  multiGet: jest.fn(),
  multiSet: jest.fn(),
  multiRemove: jest.fn(),
}));

describe('StorageService', () => {
  let storageService: StorageService;

  beforeEach(() => {
    storageService = new StorageService();
    jest.clearAllMocks();
  });

  describe('Workout Session Storage', () => {
    const mockSession = {
      id: 'session-123',
      date: '2024-01-15',
      startTime: Date.now(),
      endTime: Date.now() + 300000, // 5 minutes later
      totalReps: 25,
      averageFormQuality: 0.85,
      duration: 300, // 5 minutes in seconds
      formConsistency: 0.9,
    };

    test('should save workout session', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const result = await storageService.saveWorkoutSession(mockSession);

      expect(result.success).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        `workout_session_${mockSession.id}`,
        JSON.stringify(mockSession)
      );
    });

    test('should handle save errors', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Storage full'));

      const result = await storageService.saveWorkoutSession(mockSession);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Storage full');
    });

    test('should retrieve workout session by id', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockSession));

      const result = await storageService.getWorkoutSession(mockSession.id);

      expect(result).toEqual(mockSession);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith(`workout_session_${mockSession.id}`);
    });

    test('should return null for non-existent session', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await storageService.getWorkoutSession('non-existent');

      expect(result).toBeNull();
    });

    test('should handle corrupted session data', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('invalid-json');

      const result = await storageService.getWorkoutSession(mockSession.id);

      expect(result).toBeNull();
    });
  });

  describe('Workout History Management', () => {
    const mockSessions = [
      {
        id: 'session-1',
        date: '2024-01-15',
        totalReps: 25,
        duration: 300,
        averageFormQuality: 0.85,
      },
      {
        id: 'session-2',
        date: '2024-01-16',
        totalReps: 30,
        duration: 360,
        averageFormQuality: 0.88,
      },
    ];

    test('should get workout history', async () => {
             const sessionKeys = ['workout_session_session-1', 'workout_session_session-2'];
       const sessionData = mockSessions.map(session => [
         `workout_session_${session.id}`,
         JSON.stringify(session),
       ]);

       (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([
         ...sessionKeys,
         'other_key_1',
         'other_key_2',
       ]);
       (AsyncStorage.multiGet as jest.Mock).mockResolvedValue(sessionData);

       const result = await storageService.getWorkoutHistory();

       expect(result).toHaveLength(2);
       expect(result[0].id).toBe('session-1');
       expect(result[1].id).toBe('session-2');
       expect(AsyncStorage.getAllKeys).toHaveBeenCalled();
       expect(AsyncStorage.multiGet).toHaveBeenCalledWith(sessionKeys.reverse());
    });

    test('should get workout history with limit', async () => {
      const sessionKeys = ['workout_session_session-1', 'workout_session_session-2'];
      const sessionData = mockSessions.map(session => [
        `workout_session_${session.id}`,
        JSON.stringify(session),
      ]);

      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue(sessionKeys);
      (AsyncStorage.multiGet as jest.Mock).mockResolvedValue([sessionData[0]]);

             const result = await storageService.getWorkoutHistory(1);

       expect(result).toHaveLength(1);
       expect(AsyncStorage.multiGet).toHaveBeenCalledWith(['workout_session_session-2']);
    });

    test('should handle empty workout history', async () => {
      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue(['other_key']);

      const result = await storageService.getWorkoutHistory();

      expect(result).toHaveLength(0);
    });

    test('should filter corrupted sessions from history', async () => {
      const sessionKeys = ['workout_session_session-1', 'workout_session_session-2'];
      const sessionData = [
        [`workout_session_session-1`, JSON.stringify(mockSessions[0])],
        [`workout_session_session-2`, 'invalid-json'],
      ];

      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue(sessionKeys);
      (AsyncStorage.multiGet as jest.Mock).mockResolvedValue(sessionData);

      const result = await storageService.getWorkoutHistory();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('session-1');
    });
  });

  describe('Statistics Management', () => {
    const mockStats = {
      totalWorkouts: 50,
      totalReps: 1250,
      totalDuration: 15000, // seconds
      averageRepsPerWorkout: 25,
      averageWorkoutDuration: 300,
      bestFormQuality: 0.95,
      averageFormQuality: 0.85,
      currentStreak: 7,
      longestStreak: 15,
    };

    test('should save workout statistics', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const result = await storageService.saveWorkoutStats(mockStats);

      expect(result.success).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'workout_statistics',
        JSON.stringify(mockStats)
      );
    });

    test('should get workout statistics', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockStats));

      const result = await storageService.getWorkoutStats();

      expect(result).toEqual(mockStats);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('workout_statistics');
    });

    test('should return default stats when none exist', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await storageService.getWorkoutStats();

      expect(result.totalWorkouts).toBe(0);
      expect(result.totalReps).toBe(0);
      expect(result.currentStreak).toBe(0);
    });

    test('should update statistics after workout', async () => {
      const existingStats = { ...mockStats };
      const newSession = {
        id: 'new-session',
        totalReps: 20,
        duration: 240,
        averageFormQuality: 0.9,
        date: '2024-01-17',
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(existingStats));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const result = await storageService.updateStatsAfterWorkout(newSession);

      expect(result.success).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'workout_statistics',
        expect.any(String)
      );
    });
  });

  describe('Data Management', () => {
    test('should delete workout session', async () => {
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

      const result = await storageService.deleteWorkoutSession('session-123');

      expect(result.success).toBe(true);
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('workout_session_session-123');
    });

    test('should handle delete errors', async () => {
      (AsyncStorage.removeItem as jest.Mock).mockRejectedValue(new Error('Delete failed'));

      const result = await storageService.deleteWorkoutSession('session-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Delete failed');
    });

    test('should clear all workout data', async () => {
      const allKeys = [
        'workout_session_1',
        'workout_session_2',
        'workout_statistics',
        'other_key',
      ];
      const workoutKeys = ['workout_session_1', 'workout_session_2', 'workout_statistics'];

      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue(allKeys);
      (AsyncStorage.multiRemove as jest.Mock).mockResolvedValue(undefined);

      const result = await storageService.clearAllWorkoutData();

      expect(result.success).toBe(true);
      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith(workoutKeys);
    });

    test('should get storage usage info', async () => {
      const allKeys = ['workout_session_1', 'workout_session_2', 'other_key'];
      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue(allKeys);

      const usage = await storageService.getStorageUsage();

      expect(usage.totalKeys).toBe(3);
      expect(usage.workoutKeys).toBe(2);
    });
  });

  describe('Error Handling', () => {
    test('should handle AsyncStorage errors gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const result = await storageService.getWorkoutSession('test-id');

      expect(result).toBeNull();
    });

    test('should handle network-like errors', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Network error'));

      const mockSession = {
        id: 'test-session',
        date: '2024-01-15',
        startTime: Date.now(),
        endTime: Date.now() + 120000,
        totalReps: 10,
        duration: 120,
        averageFormQuality: 0.8,
        formConsistency: 0.85,
      };

      const result = await storageService.saveWorkoutSession(mockSession);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });
  });
}); 