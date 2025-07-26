import { CV_FSM_CONFIG } from '../constants/poseConfig';
import type { Keypoint, PoseData } from '../types';
import {
    calculateElbowAngle,
    calculatePoseQuality,
    calculateVerticalDisplacement,
    detectMovementDirection,
    getRequiredKeypoints,
    isValidPushUpPose,
} from './poseAnalysis';

describe('poseAnalysis', () => {
  const createMockKeypoints = (overrides: Partial<Record<string, Partial<Keypoint>>> = {}): Keypoint[] => {
    const defaults: Record<string, Keypoint> = {
      nose: { x: 150, y: 50, confidence: 0.9, name: 'nose' },
      left_shoulder: { x: 100, y: 100, confidence: 0.9, name: 'left_shoulder' },
      right_shoulder: { x: 200, y: 100, confidence: 0.9, name: 'right_shoulder' },
      left_elbow: { x: 80, y: 150, confidence: 0.9, name: 'left_elbow' },
      right_elbow: { x: 220, y: 150, confidence: 0.9, name: 'right_elbow' },
      left_wrist: { x: 60, y: 200, confidence: 0.9, name: 'left_wrist' },
      right_wrist: { x: 240, y: 200, confidence: 0.9, name: 'right_wrist' },
      left_hip: { x: 110, y: 250, confidence: 0.9, name: 'left_hip' },
      right_hip: { x: 190, y: 250, confidence: 0.9, name: 'right_hip' },
    };

    return Object.entries(defaults).map(([name, keypoint]) => ({
      ...keypoint,
      ...overrides[name],
      name,
    }));
  };

  describe('isValidPushUpPose', () => {
    test('should return true for valid pose with all required keypoints', () => {
      const keypoints = createMockKeypoints();
      const isValid = isValidPushUpPose(keypoints);
      expect(isValid).toBe(true);
    });

    test('should return false when required keypoints are missing', () => {
      const keypoints = createMockKeypoints();
      const incompleteKeypoints = keypoints.filter(kp => kp.name !== 'left_shoulder');
      
      const isValid = isValidPushUpPose(incompleteKeypoints);
      expect(isValid).toBe(false);
    });

    test('should return false when keypoint confidence is too low', () => {
      const keypoints = createMockKeypoints({
        left_shoulder: { confidence: 0.5 }, // Below MIN_POSE_CONFIDENCE
      });
      
      const isValid = isValidPushUpPose(keypoints);
      expect(isValid).toBe(false);
    });

    test('should return true when all keypoints meet confidence threshold', () => {
      const keypoints = createMockKeypoints({
        left_shoulder: { confidence: CV_FSM_CONFIG.MIN_POSE_CONFIDENCE },
      });
      
      const isValid = isValidPushUpPose(keypoints);
      expect(isValid).toBe(true);
    });
  });

  describe('calculateElbowAngle', () => {
    test('should calculate left elbow angle correctly', () => {
      const keypoints = createMockKeypoints();
      const angle = calculateElbowAngle(keypoints, 'left');
      
      expect(angle).toBeGreaterThan(0);
      expect(angle).toBeLessThanOrEqual(180);
    });

    test('should calculate right elbow angle correctly', () => {
      const keypoints = createMockKeypoints();
      const angle = calculateElbowAngle(keypoints, 'right');
      
      expect(angle).toBeGreaterThan(0);
      expect(angle).toBeLessThanOrEqual(180);
    });

    test('should return null when required keypoints are missing', () => {
      const keypoints = createMockKeypoints();
      const incompleteKeypoints = keypoints.filter(kp => kp.name !== 'left_elbow');
      
      const angle = calculateElbowAngle(incompleteKeypoints, 'left');
      expect(angle).toBeNull();
    });

    test('should handle straight arm position (180 degrees)', () => {
      const keypoints = createMockKeypoints({
        left_shoulder: { x: 100, y: 100 },
        left_elbow: { x: 150, y: 100 },
        left_wrist: { x: 200, y: 100 },
      });
      
      const angle = calculateElbowAngle(keypoints, 'left');
      expect(angle).toBeCloseTo(180, 1);
    });
  });

  describe('calculateVerticalDisplacement', () => {
    test('should calculate displacement between two poses', () => {
      const pose1: PoseData = {
        keypoints: createMockKeypoints(),
        confidence: 0.9,
        timestamp: Date.now(),
      };

      const pose2: PoseData = {
        keypoints: createMockKeypoints({
          nose: { y: 100 }, // Moved down by 50 pixels
        }),
        confidence: 0.9,
        timestamp: Date.now() + 100,
      };

      const displacement = calculateVerticalDisplacement(pose1, pose2);
      expect(displacement).toBeCloseTo(50, 1);
    });

    test('should return 0 for identical poses', () => {
      const pose1: PoseData = {
        keypoints: createMockKeypoints(),
        confidence: 0.9,
        timestamp: Date.now(),
      };

      const displacement = calculateVerticalDisplacement(pose1, pose1);
      expect(displacement).toBe(0);
    });

    test('should handle negative displacement (upward movement)', () => {
      const pose1: PoseData = {
        keypoints: createMockKeypoints({ nose: { y: 100 } }),
        confidence: 0.9,
        timestamp: Date.now(),
      };

      const pose2: PoseData = {
        keypoints: createMockKeypoints({ nose: { y: 50 } }),
        confidence: 0.9,
        timestamp: Date.now() + 100,
      };

      const displacement = calculateVerticalDisplacement(pose1, pose2);
      expect(displacement).toBeCloseTo(-50, 1);
    });
  });

  describe('getRequiredKeypoints', () => {
    test('should return all required keypoints when present', () => {
      const keypoints = createMockKeypoints();
      const required = getRequiredKeypoints(keypoints);
      
      expect(required).toHaveLength(CV_FSM_CONFIG.REQUIRED_KEYPOINTS.length);
      expect(required.every(kp => kp !== null)).toBe(true);
    });

    test('should return null for missing keypoints', () => {
      const keypoints = createMockKeypoints();
      const incompleteKeypoints = keypoints.filter(kp => kp.name !== 'nose');
      
      const required = getRequiredKeypoints(incompleteKeypoints);
      const noseKeypoint = required.find((_, index) => 
        CV_FSM_CONFIG.REQUIRED_KEYPOINTS[index] === 'nose'
      );
      
      expect(noseKeypoint).toBeNull();
    });
  });

  describe('calculatePoseQuality', () => {
    test('should return high quality score for good pose', () => {
      const keypoints = createMockKeypoints();
      const quality = calculatePoseQuality(keypoints);
      
      expect(quality).toBeGreaterThan(0.7);
      expect(quality).toBeLessThanOrEqual(1.0);
    });

    test('should return lower quality score for poor pose alignment', () => {
      const keypoints = createMockKeypoints({
        left_shoulder: { x: 50, y: 100 }, // Misaligned shoulders
        right_shoulder: { x: 250, y: 120 },
      });
      
      const quality = calculatePoseQuality(keypoints);
      expect(quality).toBeLessThan(0.8);
    });

    test('should return 0 for invalid pose', () => {
      const keypoints = createMockKeypoints();
      const incompleteKeypoints = keypoints.filter(kp => kp.name !== 'left_shoulder');
      
      const quality = calculatePoseQuality(incompleteKeypoints);
      expect(quality).toBe(0);
    });
  });

  describe('detectMovementDirection', () => {
    test('should detect downward movement', () => {
      const pose1: PoseData = {
        keypoints: createMockKeypoints(),
        confidence: 0.9,
        timestamp: Date.now(),
      };

      const pose2: PoseData = {
        keypoints: createMockKeypoints({
          nose: { y: 100 }, // Moved down
          left_shoulder: { y: 150 },
          right_shoulder: { y: 150 },
        }),
        confidence: 0.9,
        timestamp: Date.now() + 100,
      };

      const direction = detectMovementDirection(pose1, pose2);
      expect(direction).toBe('down');
    });

    test('should detect upward movement', () => {
      const pose1: PoseData = {
        keypoints: createMockKeypoints({
          nose: { y: 100 },
          left_shoulder: { y: 150 },
          right_shoulder: { y: 150 },
        }),
        confidence: 0.9,
        timestamp: Date.now(),
      };

      const pose2: PoseData = {
        keypoints: createMockKeypoints(),
        confidence: 0.9,
        timestamp: Date.now() + 100,
      };

      const direction = detectMovementDirection(pose1, pose2);
      expect(direction).toBe('up');
    });

    test('should detect no movement for stable pose', () => {
      const pose1: PoseData = {
        keypoints: createMockKeypoints(),
        confidence: 0.9,
        timestamp: Date.now(),
      };

      const pose2: PoseData = {
        keypoints: createMockKeypoints({
          nose: { y: 52 }, // Minimal movement below threshold
        }),
        confidence: 0.9,
        timestamp: Date.now() + 100,
      };

      const direction = detectMovementDirection(pose1, pose2);
      expect(direction).toBe('stable');
    });
  });
}); 