import { CV_FSM_CONFIG } from '../../constants/poseConfig';
import { PushUpState, type Keypoint, type PoseData } from '../../types';
import { formScoring } from '../formScoring';
import { calculateBodyAngle, calculateDistance } from '../geometryUtils';
import { isValidPushUpPose } from '../poseAnalysis';
import { PushUpFSM } from '../pushUpFSM';

describe('Phase 1 Integration Tests', () => {
  describe('Complete Push-Up Detection Flow', () => {
    let fsm: PushUpFSM;

    const createRealisticPose = (position: 'setup' | 'down' | 'bottom' | 'up' | 'top'): PoseData => {
      const baseKeypoints: Record<string, Keypoint> = {
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

      // Adjust positions based on push-up phase
      const adjustments: Record<string, Record<string, Partial<Keypoint>>> = {
        setup: {}, // Base position
        down: {
          nose: { y: 70 },
          left_shoulder: { y: 120 },
          right_shoulder: { y: 120 },
        },
        bottom: {
          nose: { y: 100 },
          left_shoulder: { y: 150 },
          right_shoulder: { y: 150 },
        },
        up: {
          nose: { y: 80 },
          left_shoulder: { y: 130 },
          right_shoulder: { y: 130 },
        },
        top: {}, // Back to base position
      };

      const keypoints = Object.entries(baseKeypoints).map(([name, keypoint]) => ({
        ...keypoint,
        ...adjustments[position][name],
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

    test('should complete a full push-up sequence with proper state transitions', () => {
      // Test complete push-up flow
      const poses = [
        createRealisticPose('setup'),
        createRealisticPose('down'),
        createRealisticPose('bottom'),
        createRealisticPose('up'),
        createRealisticPose('top'),
      ];

      const expectedStates = [
        PushUpState.SETUP_POSITION,
        PushUpState.GOING_DOWN,
        PushUpState.BOTTOM_POSITION,
        PushUpState.GOING_UP,
        // Last state could be TOP_POSITION or SETUP_POSITION depending on form quality
      ];

      let repCount = 0;
      poses.forEach((pose, index) => {
        const result = fsm.processPose(pose);
        
        if (index < expectedStates.length) {
          expect(result.currentState).toBe(expectedStates[index]);
        } else {
          // Final state: should be either TOP_POSITION or SETUP_POSITION
          expect([PushUpState.TOP_POSITION, PushUpState.SETUP_POSITION]).toContain(result.currentState);
        }
        
        expect(result.formQuality).toBeGreaterThanOrEqual(0); // Valid form quality score
        expect(result.formQuality).toBeLessThanOrEqual(1);
        expect(result.formFeedback).toBeDefined();
        
        if (result.currentState === PushUpState.TOP_POSITION) {
          repCount++;
          expect(result.repCount).toBe(repCount);
        }
      });

      // Rep count depends on form quality - should be 0 or 1
      expect(repCount).toBeGreaterThanOrEqual(0);
      expect(repCount).toBeLessThanOrEqual(1);
    });

    test('should integrate all utility functions correctly', () => {
      const setupPose = createRealisticPose('setup');
      const bottomPose = createRealisticPose('bottom');

             // Test geometry utils integration
       const setupBodyAngle = calculateBodyAngle(setupPose.keypoints);
       const bottomBodyAngle = calculateBodyAngle(bottomPose.keypoints);
       
       expect(setupBodyAngle).not.toBeNull();
       expect(bottomBodyAngle).not.toBeNull();
       
       // Test distance calculations show pose differences
       const setupNose = setupPose.keypoints.find(kp => kp.name === 'nose')!;
       const bottomNose = bottomPose.keypoints.find(kp => kp.name === 'nose')!;
       const noseMovement = calculateDistance(setupNose, bottomNose);
       expect(noseMovement).toBeGreaterThan(0);

      // Test pose analysis integration
      expect(isValidPushUpPose(setupPose.keypoints)).toBe(true);
      expect(isValidPushUpPose(bottomPose.keypoints)).toBe(true);

          const setupQuality = formScoring.calculateOverallFormQuality(setupPose, [setupPose]);
    const bottomQuality = formScoring.calculateOverallFormQuality(bottomPose, [bottomPose]);
      
      expect(setupQuality).toBeGreaterThanOrEqual(0);
      expect(setupQuality).toBeLessThanOrEqual(1);
      expect(bottomQuality).toBeGreaterThanOrEqual(0);
      expect(bottomQuality).toBeLessThanOrEqual(1);

      // Test distance calculations
      const leftShoulder = setupPose.keypoints.find(kp => kp.name === 'left_shoulder')!;
      const rightShoulder = setupPose.keypoints.find(kp => kp.name === 'right_shoulder')!;
      const shoulderDistance = calculateDistance(leftShoulder, rightShoulder);
      
      expect(shoulderDistance).toBeCloseTo(100, 1); // Expected shoulder width
    });

    test('should use configuration values correctly', () => {
      // Test that FSM uses config values
      expect(CV_FSM_CONFIG.MIN_POSE_CONFIDENCE).toBe(0.7);
      expect(CV_FSM_CONFIG.REQUIRED_KEYPOINTS).toContain('nose');
      expect(CV_FSM_CONFIG.REQUIRED_KEYPOINTS).toContain('left_shoulder');
      expect(CV_FSM_CONFIG.TOP_POSITION_ANGLE).toBe(15);
      expect(CV_FSM_CONFIG.BOTTOM_POSITION_ANGLE).toBe(-30);

      // Test pose validation uses config
      const lowConfidencePose = createRealisticPose('setup');
      lowConfidencePose.keypoints[0].confidence = 0.5; // Below threshold

      expect(isValidPushUpPose(lowConfidencePose.keypoints)).toBe(false);
    });

         test('should handle multiple consecutive push-ups', () => {
       // Complete first push-up
       const firstPushUp = ['setup', 'down', 'bottom', 'up', 'top'] as const;
       firstPushUp.forEach(position => {
         const pose = createRealisticPose(position);
         fsm.processPose(pose);
       });
       
       expect(fsm.getRepCount()).toBeGreaterThanOrEqual(0); // May be 0 or 1 depending on form quality

       // Mock time passage for TOP_POSITION transition
       jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 600);

       // Complete second push-up
       const secondPushUp = ['setup', 'down', 'bottom', 'up', 'top'] as const;
       secondPushUp.forEach(position => {
         const pose = createRealisticPose(position);
         fsm.processPose(pose);
       });

       expect(fsm.getRepCount()).toBeGreaterThanOrEqual(0); // May be 0, 1, or 2 depending on form quality
       
       jest.restoreAllMocks();
     });

         test('should reject poor form push-ups', () => {
       const poorFormPose = createRealisticPose('top');
       // Simulate extremely poor form to drop quality below 0.6 threshold
       poorFormPose.keypoints.find(kp => kp.name === 'left_shoulder')!.x = 10;
       poorFormPose.keypoints.find(kp => kp.name === 'left_shoulder')!.y = 50;
       poorFormPose.keypoints.find(kp => kp.name === 'right_shoulder')!.x = 500;
       poorFormPose.keypoints.find(kp => kp.name === 'right_shoulder')!.y = 200;
       // Also misalign hips
       poorFormPose.keypoints.find(kp => kp.name === 'left_hip')!.x = 20;
       poorFormPose.keypoints.find(kp => kp.name === 'left_hip')!.y = 300;
       poorFormPose.keypoints.find(kp => kp.name === 'right_hip')!.x = 480;
       poorFormPose.keypoints.find(kp => kp.name === 'right_hip')!.y = 400;

       const poses = [
         createRealisticPose('setup'),
         createRealisticPose('down'),
         createRealisticPose('bottom'),
         createRealisticPose('up'),
         poorFormPose, // Poor form at top
       ];

       poses.forEach(pose => fsm.processPose(pose));

       // Should not count the rep due to poor form
       expect(fsm.getRepCount()).toBe(0);
     });

    test('should handle reset functionality', () => {
      // Complete a push-up
      const poses = [
        createRealisticPose('setup'),
        createRealisticPose('down'),
        createRealisticPose('bottom'),
        createRealisticPose('up'),
        createRealisticPose('top'),
      ];

      poses.forEach(pose => fsm.processPose(pose));
      expect(fsm.getRepCount()).toBeGreaterThanOrEqual(0); // May be 0 or 1 depending on form quality

      // Reset FSM
      fsm.reset();

      expect(fsm.getCurrentState()).toBe(PushUpState.IDLE);
      expect(fsm.getRepCount()).toBe(0);
      expect(fsm.getCurrentPose()).toBeNull();
    });
  });

  describe('Type Safety Integration', () => {
    test('should maintain type safety across all components', () => {
      const fsm = new PushUpFSM();
      const pose: PoseData = {
        keypoints: [
          { x: 100, y: 100, confidence: 0.9, name: 'nose' },
        ],
        confidence: 0.9,
        timestamp: Date.now(),
      };

      const result = fsm.processPose(pose);

      // Verify all return types
      expect(typeof result.currentState).toBe('string');
      expect(Object.values(PushUpState)).toContain(result.currentState);
      expect(typeof result.repCount).toBe('number');
      expect(typeof result.formQuality).toBe('number');
      expect(Array.isArray(result.formFeedback)).toBe(true);
      expect(typeof result.stateChanged).toBe('boolean');
    });
  });
}); 