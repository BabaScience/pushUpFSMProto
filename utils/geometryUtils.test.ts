import type { Keypoint } from '../types';
import { calculateAngle, calculateBodyAngle, calculateDistance, normalizeCoordinates } from './geometryUtils';

describe('geometryUtils', () => {
  const mockKeypoint1: Keypoint = { x: 0, y: 0, confidence: 0.9, name: 'point1' };
  const mockKeypoint2: Keypoint = { x: 100, y: 0, confidence: 0.9, name: 'point2' };
  const mockKeypoint3: Keypoint = { x: 50, y: 50, confidence: 0.9, name: 'point3' };

  describe('calculateDistance', () => {
    test('should calculate distance between two points', () => {
      const distance = calculateDistance(mockKeypoint1, mockKeypoint2);
      expect(distance).toBe(100);
    });

    test('should calculate diagonal distance correctly', () => {
      const point1 = { x: 0, y: 0, confidence: 0.9, name: 'p1' };
      const point2 = { x: 3, y: 4, confidence: 0.9, name: 'p2' };
      const distance = calculateDistance(point1, point2);
      expect(distance).toBe(5);
    });

    test('should return 0 for same point', () => {
      const distance = calculateDistance(mockKeypoint1, mockKeypoint1);
      expect(distance).toBe(0);
    });
  });

  describe('calculateAngle', () => {
    test('should calculate angle between three points', () => {
      const point1 = { x: 0, y: 0, confidence: 0.9, name: 'p1' };
      const point2 = { x: 50, y: 0, confidence: 0.9, name: 'p2' }; // vertex
      const point3 = { x: 50, y: 50, confidence: 0.9, name: 'p3' };
      
      const angle = calculateAngle(point1, point2, point3);
      expect(angle).toBeCloseTo(90, 1);
    });

    test('should return 180 for straight line', () => {
      const point1 = { x: 0, y: 0, confidence: 0.9, name: 'p1' };
      const point2 = { x: 50, y: 0, confidence: 0.9, name: 'p2' };
      const point3 = { x: 100, y: 0, confidence: 0.9, name: 'p3' };
      
      const angle = calculateAngle(point1, point2, point3);
      expect(angle).toBeCloseTo(180, 1);
    });

    test('should handle acute angles', () => {
      const point1 = { x: 0, y: 0, confidence: 0.9, name: 'p1' };
      const point2 = { x: 50, y: 0, confidence: 0.9, name: 'p2' };
      const point3 = { x: 100, y: 50, confidence: 0.9, name: 'p3' };
      
      const angle = calculateAngle(point1, point2, point3);
      expect(angle).toBeGreaterThan(0);
      expect(angle).toBeLessThan(180);
    });
  });

  describe('calculateBodyAngle', () => {
    test('should calculate body angle from shoulder and hip keypoints', () => {
      const keypoints: Keypoint[] = [
        { x: 100, y: 100, confidence: 0.9, name: 'left_shoulder' },
        { x: 200, y: 100, confidence: 0.9, name: 'right_shoulder' },
        { x: 100, y: 200, confidence: 0.9, name: 'left_hip' },
        { x: 200, y: 200, confidence: 0.9, name: 'right_hip' },
      ];

      const angle = calculateBodyAngle(keypoints);
      expect(angle).toBeCloseTo(90, 1); // Vertical body (shoulders above hips)
    });

    test('should handle angled body position', () => {
      const keypoints: Keypoint[] = [
        { x: 100, y: 100, confidence: 0.9, name: 'left_shoulder' },
        { x: 200, y: 100, confidence: 0.9, name: 'right_shoulder' },
        { x: 120, y: 200, confidence: 0.9, name: 'left_hip' },
        { x: 220, y: 200, confidence: 0.9, name: 'right_hip' },
      ];

      const angle = calculateBodyAngle(keypoints);
      expect(angle).not.toBe(0);
    });

    test('should return null for missing keypoints', () => {
      const keypoints: Keypoint[] = [
        { x: 100, y: 100, confidence: 0.9, name: 'left_shoulder' },
      ];

      const angle = calculateBodyAngle(keypoints);
      expect(angle).toBeNull();
    });
  });

  describe('normalizeCoordinates', () => {
    test('should normalize coordinates to screen dimensions', () => {
      const keypoints: Keypoint[] = [
        { x: 50, y: 100, confidence: 0.9, name: 'point1' },
        { x: 150, y: 200, confidence: 0.9, name: 'point2' },
      ];

      const normalized = normalizeCoordinates(keypoints, 200, 400, 400, 800);
      
      expect(normalized[0].x).toBe(100);
      expect(normalized[0].y).toBe(200);
      expect(normalized[1].x).toBe(300);
      expect(normalized[1].y).toBe(400);
    });

    test('should preserve confidence and name', () => {
      const keypoints: Keypoint[] = [
        { x: 50, y: 100, confidence: 0.8, name: 'test_point' },
      ];

      const normalized = normalizeCoordinates(keypoints, 100, 200, 200, 400);
      
      expect(normalized[0].confidence).toBe(0.8);
      expect(normalized[0].name).toBe('test_point');
    });
  });
}); 