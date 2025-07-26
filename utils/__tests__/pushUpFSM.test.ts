import { CV_FSM_CONFIG } from '../../constants/poseConfig';
import { PushUpState, type Keypoint, type PoseData } from '../../types';
import { PushUpFSM } from '../pushUpFSM';

describe('PushUpFSM', () => {
  let fsm: PushUpFSM;

  const createMockPose = (overrides: Partial<Record<string, Partial<Keypoint>>> = {}): PoseData => {
    const defaultKeypoints: Record<string, Keypoint> = {
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

    const keypoints = Object.entries(defaultKeypoints).map(([name, keypoint]) => ({
      ...keypoint,
      ...overrides[name],
      name,
    }));

    return {
      keypoints,
      confidence: 0.9,
      timestamp: Date.now(),
    };
  };

  beforeEach(() => {
    fsm = new PushUpFSM();
  });

  describe('initialization', () => {
    test('should start in IDLE state', () => {
      expect(fsm.getCurrentState()).toBe(PushUpState.IDLE);
    });

    test('should have zero rep count initially', () => {
      expect(fsm.getRepCount()).toBe(0);
    });

    test('should have no current pose initially', () => {
      expect(fsm.getCurrentPose()).toBeNull();
    });
  });

  describe('state transitions', () => {
    test('should transition from IDLE to SETUP_POSITION with valid pose', () => {
      const pose = createMockPose();
      const result = fsm.processPose(pose);

      expect(result.currentState).toBe(PushUpState.SETUP_POSITION);
      expect(result.repCount).toBe(0);
      expect(result.stateChanged).toBe(true);
    });

    test('should remain in IDLE with invalid pose', () => {
      const pose = createMockPose({
        left_shoulder: { confidence: 0.5 }, // Below threshold
      });
      const result = fsm.processPose(pose);

      expect(result.currentState).toBe(PushUpState.IDLE);
      expect(result.stateChanged).toBe(false);
    });

    test('should transition from SETUP_POSITION to GOING_DOWN when body angle decreases', () => {
      const setupPose = createMockPose();
      fsm.processPose(setupPose);

      // Simulate downward movement by moving nose and shoulders down
      const downPose = createMockPose({
        nose: { y: 80 },
        left_shoulder: { y: 130 },
        right_shoulder: { y: 130 },
      });
      const result = fsm.processPose(downPose);

      expect(result.currentState).toBe(PushUpState.GOING_DOWN);
      expect(result.stateChanged).toBe(true);
    });

    test('should transition from GOING_DOWN to BOTTOM_POSITION at bottom threshold', () => {
      const setupPose = createMockPose();
      fsm.processPose(setupPose);

      const downPose = createMockPose({
        nose: { y: 80 },
        left_shoulder: { y: 130 },
        right_shoulder: { y: 130 },
      });
      fsm.processPose(downPose);

      // Simulate reaching bottom position
      const bottomPose = createMockPose({
        nose: { y: 120 },
        left_shoulder: { y: 170 },
        right_shoulder: { y: 170 },
      });
      const result = fsm.processPose(bottomPose);

      expect(result.currentState).toBe(PushUpState.BOTTOM_POSITION);
      expect(result.stateChanged).toBe(true);
    });

    test('should transition from BOTTOM_POSITION to GOING_UP on upward movement', () => {
      // Set up FSM in bottom position
      const setupPose = createMockPose();
      fsm.processPose(setupPose);

      const downPose = createMockPose({
        nose: { y: 80 },
        left_shoulder: { y: 130 },
        right_shoulder: { y: 130 },
      });
      fsm.processPose(downPose);

      const bottomPose = createMockPose({
        nose: { y: 120 },
        left_shoulder: { y: 170 },
        right_shoulder: { y: 170 },
      });
      fsm.processPose(bottomPose);

      // Simulate upward movement
      const upPose = createMockPose({
        nose: { y: 100 },
        left_shoulder: { y: 150 },
        right_shoulder: { y: 150 },
      });
      const result = fsm.processPose(upPose);

      expect(result.currentState).toBe(PushUpState.GOING_UP);
      expect(result.stateChanged).toBe(true);
    });

    test('should transition from GOING_UP to TOP_POSITION and increment count', () => {
      // Set up complete push-up sequence
      const setupPose = createMockPose();
      fsm.processPose(setupPose);

      const downPose = createMockPose({
        nose: { y: 80 },
        left_shoulder: { y: 130 },
        right_shoulder: { y: 130 },
      });
      fsm.processPose(downPose);

      const bottomPose = createMockPose({
        nose: { y: 120 },
        left_shoulder: { y: 170 },
        right_shoulder: { y: 170 },
      });
      fsm.processPose(bottomPose);

      const upPose = createMockPose({
        nose: { y: 100 },
        left_shoulder: { y: 150 },
        right_shoulder: { y: 150 },
      });
      fsm.processPose(upPose);

      // Return to top position
      const topPose = createMockPose();
      const result = fsm.processPose(topPose);

      expect(result.currentState).toBe(PushUpState.TOP_POSITION);
      expect(result.repCount).toBe(1);
      expect(result.stateChanged).toBe(true);
    });

    test('should transition from TOP_POSITION back to SETUP_POSITION', () => {
      // Complete a full rep first
      const poses = [
        createMockPose(), // SETUP
        createMockPose({ nose: { y: 80 }, left_shoulder: { y: 130 }, right_shoulder: { y: 130 } }), // DOWN
        createMockPose({ nose: { y: 120 }, left_shoulder: { y: 170 }, right_shoulder: { y: 170 } }), // BOTTOM
        createMockPose({ nose: { y: 100 }, left_shoulder: { y: 150 }, right_shoulder: { y: 150 } }), // UP
        createMockPose(), // TOP
      ];

      poses.forEach(pose => fsm.processPose(pose));

      // Mock time passage to allow TOP_POSITION to transition
      jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 600);

      // Next pose should transition back to setup
      const nextPose = createMockPose();
      const result = fsm.processPose(nextPose);

      expect(result.currentState).toBe(PushUpState.SETUP_POSITION);
      expect(result.repCount).toBe(1);

      jest.restoreAllMocks();
    });
  });

  describe('timeout handling', () => {
    test('should timeout from SETUP_POSITION to IDLE after max duration', () => {
      const pose = createMockPose();
      fsm.processPose(pose);

      // Mock time passage
      jest.spyOn(Date, 'now').mockReturnValue(Date.now() + CV_FSM_CONFIG.MAX_STATE_DURATION + 1000);

      const result = fsm.processPose(pose);
      expect(result.currentState).toBe(PushUpState.IDLE);
      expect(result.stateChanged).toBe(true);

      jest.restoreAllMocks();
    });

    test('should timeout from GOING_DOWN to SETUP_POSITION after max duration', () => {
      const setupPose = createMockPose();
      fsm.processPose(setupPose);

      const downPose = createMockPose({
        nose: { y: 80 },
        left_shoulder: { y: 130 },
        right_shoulder: { y: 130 },
      });
      fsm.processPose(downPose);

      // Mock time passage
      jest.spyOn(Date, 'now').mockReturnValue(Date.now() + CV_FSM_CONFIG.MAX_STATE_DURATION + 1000);

      const result = fsm.processPose(downPose);
      expect(result.currentState).toBe(PushUpState.SETUP_POSITION);

      jest.restoreAllMocks();
    });
  });

  describe('pose quality validation', () => {
    test('should not count rep with poor form quality', () => {
      const poses = [
        createMockPose(), // SETUP
        createMockPose({ nose: { y: 80 }, left_shoulder: { y: 130 }, right_shoulder: { y: 130 } }), // DOWN
        createMockPose({ nose: { y: 120 }, left_shoulder: { y: 170 }, right_shoulder: { y: 170 } }), // BOTTOM
        createMockPose({ nose: { y: 100 }, left_shoulder: { y: 150 }, right_shoulder: { y: 150 } }), // UP
        createMockPose({
          left_shoulder: { x: 50, y: 100 }, // Poor alignment
          right_shoulder: { x: 250, y: 120 },
        }), // TOP with poor form
      ];

      let result;
      poses.forEach(pose => {
        result = fsm.processPose(pose);
      });

      // Should not increment count due to poor form
      expect(result!.repCount).toBe(0);
    });
  });

  describe('reset functionality', () => {
    test('should reset FSM to initial state', () => {
      // Complete a rep
      const poses = [
        createMockPose(),
        createMockPose({ nose: { y: 80 }, left_shoulder: { y: 130 }, right_shoulder: { y: 130 } }),
        createMockPose({ nose: { y: 120 }, left_shoulder: { y: 170 }, right_shoulder: { y: 170 } }),
        createMockPose({ nose: { y: 100 }, left_shoulder: { y: 150 }, right_shoulder: { y: 150 } }),
        createMockPose(),
      ];

      poses.forEach(pose => fsm.processPose(pose));

      fsm.reset();

      expect(fsm.getCurrentState()).toBe(PushUpState.IDLE);
      expect(fsm.getRepCount()).toBe(0);
      expect(fsm.getCurrentPose()).toBeNull();
    });
  });

  describe('form quality feedback', () => {
    test('should provide form quality score', () => {
      const pose = createMockPose();
      const result = fsm.processPose(pose);

      expect(result.formQuality).toBeGreaterThan(0);
      expect(result.formQuality).toBeLessThanOrEqual(1);
    });

    test('should provide form feedback messages', () => {
      const pose = createMockPose({
        left_shoulder: { x: 50, y: 100 },
        right_shoulder: { x: 250, y: 120 },
      });
      const result = fsm.processPose(pose);

      expect(result.formFeedback).toBeDefined();
      expect(Array.isArray(result.formFeedback)).toBe(true);
    });
  });
}); 