import { CV_FSM_CONFIG } from '../constants/poseConfig';
import type { Keypoint, PoseData } from '../types';
import { calculateAngle } from './geometryUtils';

/**
 * Check if a pose contains all required keypoints with sufficient confidence
 */
export function isValidPushUpPose(keypoints: Keypoint[]): boolean {
  const requiredKeypoints = getRequiredKeypoints(keypoints);
  
  // Check if all required keypoints are present
  if (requiredKeypoints.some(kp => kp === null)) {
    return false;
  }

  // Check if all keypoints meet confidence threshold
  return requiredKeypoints.every(kp => 
    kp !== null && kp.confidence >= CV_FSM_CONFIG.MIN_POSE_CONFIDENCE
  );
}

/**
 * Calculate the elbow angle for left or right arm
 */
export function calculateElbowAngle(keypoints: Keypoint[], side: 'left' | 'right'): number | null {
  const shoulder = keypoints.find(kp => kp.name === `${side}_shoulder`);
  const elbow = keypoints.find(kp => kp.name === `${side}_elbow`);
  const wrist = keypoints.find(kp => kp.name === `${side}_wrist`);

  if (!shoulder || !elbow || !wrist) {
    return null;
  }

  return calculateAngle(shoulder, elbow, wrist);
}

/**
 * Calculate vertical displacement between two poses using key reference points
 */
export function calculateVerticalDisplacement(pose1: PoseData, pose2: PoseData): number {
  // Use nose as primary reference point for vertical movement
  const nose1 = pose1.keypoints.find(kp => kp.name === 'nose');
  const nose2 = pose2.keypoints.find(kp => kp.name === 'nose');

  if (!nose1 || !nose2) {
    // Fallback to shoulder center if nose is not available
    const leftShoulder1 = pose1.keypoints.find(kp => kp.name === 'left_shoulder');
    const rightShoulder1 = pose1.keypoints.find(kp => kp.name === 'right_shoulder');
    const leftShoulder2 = pose2.keypoints.find(kp => kp.name === 'left_shoulder');
    const rightShoulder2 = pose2.keypoints.find(kp => kp.name === 'right_shoulder');

    if (!leftShoulder1 || !rightShoulder1 || !leftShoulder2 || !rightShoulder2) {
      return 0;
    }

    const shoulderCenter1Y = (leftShoulder1.y + rightShoulder1.y) / 2;
    const shoulderCenter2Y = (leftShoulder2.y + rightShoulder2.y) / 2;

    return shoulderCenter2Y - shoulderCenter1Y;
  }

  return nose2.y - nose1.y;
}

/**
 * Get all required keypoints from a keypoints array
 * Returns array with null for missing keypoints
 */
export function getRequiredKeypoints(keypoints: Keypoint[]): (Keypoint | null)[] {
  return CV_FSM_CONFIG.REQUIRED_KEYPOINTS.map(name => 
    keypoints.find(kp => kp.name === name) || null
  );
}

/**
 * Calculate overall pose quality score (0-1)
 */
export function calculatePoseQuality(keypoints: Keypoint[]): number {
  if (!isValidPushUpPose(keypoints)) {
    return 0;
  }

  let qualityScore = 0;
  let factors = 0;

  // Factor 1: Body alignment (shoulders and hips should be level)
  const leftShoulder = keypoints.find(kp => kp.name === 'left_shoulder');
  const rightShoulder = keypoints.find(kp => kp.name === 'right_shoulder');
  const leftHip = keypoints.find(kp => kp.name === 'left_hip');
  const rightHip = keypoints.find(kp => kp.name === 'right_hip');

  if (leftShoulder && rightShoulder) {
    const shoulderAlignment = Math.abs(leftShoulder.y - rightShoulder.y);
    const shoulderScore = Math.max(0, 1 - (shoulderAlignment / CV_FSM_CONFIG.IDEAL_BODY_ALIGNMENT));
    qualityScore += shoulderScore;
    factors++;
  }

  if (leftHip && rightHip) {
    const hipAlignment = Math.abs(leftHip.y - rightHip.y);
    const hipScore = Math.max(0, 1 - (hipAlignment / CV_FSM_CONFIG.IDEAL_BODY_ALIGNMENT));
    qualityScore += hipScore;
    factors++;
  }

  // Factor 2: Elbow angles should be within ideal range
  const leftElbowAngle = calculateElbowAngle(keypoints, 'left');
  const rightElbowAngle = calculateElbowAngle(keypoints, 'right');

  if (leftElbowAngle !== null) {
    const inRange = leftElbowAngle >= CV_FSM_CONFIG.ELBOW_ANGLE_RANGE[0] && 
                   leftElbowAngle <= CV_FSM_CONFIG.ELBOW_ANGLE_RANGE[1];
    qualityScore += inRange ? 1 : 0.5;
    factors++;
  }

  if (rightElbowAngle !== null) {
    const inRange = rightElbowAngle >= CV_FSM_CONFIG.ELBOW_ANGLE_RANGE[0] && 
                   rightElbowAngle <= CV_FSM_CONFIG.ELBOW_ANGLE_RANGE[1];
    qualityScore += inRange ? 1 : 0.5;
    factors++;
  }

  // Factor 3: Confidence scores
  const avgConfidence = keypoints.reduce((sum, kp) => sum + kp.confidence, 0) / keypoints.length;
  qualityScore += avgConfidence;
  factors++;

  return factors > 0 ? qualityScore / factors : 0;
}

/**
 * Detect movement direction between two poses
 */
export function detectMovementDirection(pose1: PoseData, pose2: PoseData): 'up' | 'down' | 'stable' {
  const displacement = calculateVerticalDisplacement(pose1, pose2);
  
  if (Math.abs(displacement) < CV_FSM_CONFIG.MOVEMENT_THRESHOLD) {
    return 'stable';
  }
  
  return displacement > 0 ? 'down' : 'up';
} 