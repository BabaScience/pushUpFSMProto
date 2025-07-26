import { CV_FSM_CONFIG } from '../constants/poseConfig';
import type { Keypoint, PoseData } from '../types';
import { calculateAngle, calculateDistance } from './geometryUtils';

export interface FormAssessment {
  bodyAlignment: number;
  elbowPositioning: number;
  movementSmoothness: number;
  overallQuality: number;
}

export class FormScoring {
  /**
   * Assess body alignment during push-up
   * Evaluates how straight the body is from shoulders to ankles
   */
  assessBodyAlignment(keypoints: Keypoint[]): number {
    try {
      const requiredKeypoints = this.getRequiredAlignmentKeypoints(keypoints);
      if (!requiredKeypoints.shoulders || !requiredKeypoints.hips || !requiredKeypoints.ankles) {
        return 0;
      }

      // Check confidence levels
      const minConfidence = CV_FSM_CONFIG.MIN_POSE_CONFIDENCE;
      const allKeypoints = [
        ...requiredKeypoints.shoulders,
        ...requiredKeypoints.hips,
        ...requiredKeypoints.ankles,
      ];

      if (allKeypoints.some(kp => kp.confidence < minConfidence)) {
        return Math.max(0, 0.5 - (minConfidence - Math.min(...allKeypoints.map(kp => kp.confidence))));
      }

      // Calculate body line angle
      const shoulderCenter = this.getCenterPoint(requiredKeypoints.shoulders);
      const hipCenter = this.getCenterPoint(requiredKeypoints.hips);
      const ankleCenter = this.getCenterPoint(requiredKeypoints.ankles);

      // Calculate angles between body segments
      const shoulderHipAngle = calculateAngle(shoulderCenter, hipCenter, { x: hipCenter.x + 100, y: hipCenter.y, confidence: 1, name: 'reference' });
      const hipAnkleAngle = calculateAngle(hipCenter, ankleCenter, { x: ankleCenter.x + 100, y: ankleCenter.y, confidence: 1, name: 'reference' });

      // Calculate deviation from ideal straight line
      const angleDifference = Math.abs(shoulderHipAngle - hipAnkleAngle);
      const alignmentScore = Math.max(0, 1 - (angleDifference / CV_FSM_CONFIG.IDEAL_BODY_ALIGNMENT));

      return Math.min(1.0, alignmentScore);
    } catch (error) {
      console.warn('Error assessing body alignment:', error);
      return 0;
    }
  }

  /**
   * Assess elbow positioning during push-up
   * Evaluates if elbows are at proper angles and not flared out
   */
  assessElbowPositioning(keypoints: Keypoint[]): number {
    try {
      const requiredKeypoints = this.getRequiredElbowKeypoints(keypoints);
      if (!requiredKeypoints.shoulders || !requiredKeypoints.elbows || !requiredKeypoints.wrists) {
        return 0;
      }

      // Check confidence levels
      const minConfidence = CV_FSM_CONFIG.MIN_POSE_CONFIDENCE;
      const allKeypoints = [
        ...requiredKeypoints.shoulders,
        ...requiredKeypoints.elbows,
        ...requiredKeypoints.wrists,
      ];

      if (allKeypoints.some(kp => kp.confidence < minConfidence)) {
        return 0;
      }

      // Calculate elbow angles
      const leftElbowAngle = this.calculateElbowAngle(
        requiredKeypoints.shoulders[0],
        requiredKeypoints.elbows[0],
        requiredKeypoints.wrists[0]
      );

      const rightElbowAngle = this.calculateElbowAngle(
        requiredKeypoints.shoulders[1],
        requiredKeypoints.elbows[1],
        requiredKeypoints.wrists[1]
      );

      // Evaluate angles against ideal range
      const [minAngle, maxAngle] = CV_FSM_CONFIG.ELBOW_ANGLE_RANGE;
      const leftScore = this.scoreAngleInRange(leftElbowAngle, minAngle, maxAngle);
      const rightScore = this.scoreAngleInRange(rightElbowAngle, minAngle, maxAngle);

      // Average the scores
      return (leftScore + rightScore) / 2;
    } catch (error) {
      console.warn('Error assessing elbow positioning:', error);
      return 0;
    }
  }

  /**
   * Assess movement smoothness across a sequence of poses
   * Evaluates how smooth and controlled the movement is
   */
  assessMovementSmoothness(poseHistory: PoseData[]): number {
    if (poseHistory.length === 0) return 0;
    if (poseHistory.length === 1) return 1.0;

    try {
      const movements: number[] = [];

      for (let i = 1; i < poseHistory.length; i++) {
        const prevPose = poseHistory[i - 1];
        const currentPose = poseHistory[i];

        // Calculate movement between poses
        const movement = this.calculatePoseMovement(prevPose, currentPose);
        movements.push(movement);
      }

      // Calculate smoothness score based on movement consistency
      const avgMovement = movements.reduce((sum, m) => sum + m, 0) / movements.length;
      const variance = movements.reduce((sum, m) => sum + Math.pow(m - avgMovement, 2), 0) / movements.length;
      const standardDeviation = Math.sqrt(variance);

      // Lower standard deviation = smoother movement
      const smoothnessScore = Math.max(0, 1 - (standardDeviation / CV_FSM_CONFIG.MOVEMENT_THRESHOLD));
      return Math.min(1.0, smoothnessScore);
    } catch (error) {
      console.warn('Error assessing movement smoothness:', error);
      return 0;
    }
  }

  /**
   * Calculate overall form quality from individual components
   * Combines all form assessments into a single score
   */
  calculateOverallFormQuality(currentPose: PoseData, poseHistory: PoseData[]): number {
    try {
      // Individual component scores
      const bodyAlignment = this.assessBodyAlignment(currentPose.keypoints);
      const elbowPositioning = this.assessElbowPositioning(currentPose.keypoints);
      const movementSmoothness = this.assessMovementSmoothness(poseHistory);

      // Pose confidence penalty
      const confidencePenalty = Math.max(0, CV_FSM_CONFIG.MIN_POSE_CONFIDENCE - currentPose.confidence);

      // Weighted combination of scores
      const weights = {
        bodyAlignment: 0.4,
        elbowPositioning: 0.3,
        movementSmoothness: 0.2,
        confidence: 0.1,
      };

      const overallScore = 
        (bodyAlignment * weights.bodyAlignment) +
        (elbowPositioning * weights.elbowPositioning) +
        (movementSmoothness * weights.movementSmoothness) +
        ((1 - confidencePenalty) * weights.confidence);

      return Math.max(0, Math.min(1.0, overallScore));
    } catch (error) {
      console.warn('Error calculating overall form quality:', error);
      return 0;
    }
  }

  /**
   * Generate specific feedback for form improvements
   * Provides actionable insights based on form assessment
   */
  generateFormFeedback(currentPose: PoseData, poseHistory: PoseData[]): string {
    try {
      const feedback: string[] = [];

      // Assess individual components
      const bodyAlignment = this.assessBodyAlignment(currentPose.keypoints);
      const elbowPositioning = this.assessElbowPositioning(currentPose.keypoints);
      const movementSmoothness = this.assessMovementSmoothness(poseHistory);
      const overallQuality = this.calculateOverallFormQuality(currentPose, poseHistory);

      // Generate specific feedback based on scores
      if (overallQuality > 0.8) {
        feedback.push('Good form! Keep maintaining that straight body line.');
      } else {
        if (bodyAlignment < 0.6) {
          feedback.push('Focus on body alignment - keep your body in a straight line from head to heels.');
        }

        if (elbowPositioning < 0.6) {
          feedback.push('Keep your elbows closer to your body - avoid flaring them out wide.');
        }

        if (movementSmoothness < 0.6) {
          feedback.push('Try to move more smoothly and controlled through the full range of motion.');
        }

        if (currentPose.confidence < CV_FSM_CONFIG.MIN_POSE_CONFIDENCE) {
          feedback.push('Make sure your full body is visible in the camera frame.');
        }
      }

      return feedback.length > 0 ? feedback.join(' ') : 'Keep up the good work!';
    } catch (error) {
      console.warn('Error generating form feedback:', error);
      return 'Focus on maintaining good form throughout the movement.';
    }
  }

  /**
   * Get required keypoints for body alignment assessment
   */
  private getRequiredAlignmentKeypoints(keypoints: Keypoint[]) {
    const shoulders = keypoints.filter(kp => kp.name.includes('shoulder'));
    const hips = keypoints.filter(kp => kp.name.includes('hip'));
    const ankles = keypoints.filter(kp => kp.name.includes('ankle'));

    return {
      shoulders: shoulders.length >= 2 ? shoulders : null,
      hips: hips.length >= 2 ? hips : null,
      ankles: ankles.length >= 2 ? ankles : null,
    };
  }

  /**
   * Get required keypoints for elbow positioning assessment
   */
  private getRequiredElbowKeypoints(keypoints: Keypoint[]) {
    const shoulders = keypoints.filter(kp => kp.name.includes('shoulder'));
    const elbows = keypoints.filter(kp => kp.name.includes('elbow'));
    const wrists = keypoints.filter(kp => kp.name.includes('wrist'));

    return {
      shoulders: shoulders.length >= 2 ? shoulders : null,
      elbows: elbows.length >= 2 ? elbows : null,
      wrists: wrists.length >= 2 ? wrists : null,
    };
  }

  /**
   * Calculate center point between two keypoints
   */
  private getCenterPoint(keypoints: Keypoint[]): Keypoint {
    const x = keypoints.reduce((sum, kp) => sum + kp.x, 0) / keypoints.length;
    const y = keypoints.reduce((sum, kp) => sum + kp.y, 0) / keypoints.length;
    const confidence = keypoints.reduce((sum, kp) => sum + kp.confidence, 0) / keypoints.length;

    return { x, y, confidence, name: 'center' };
  }

  /**
   * Calculate elbow angle
   */
  private calculateElbowAngle(shoulder: Keypoint, elbow: Keypoint, wrist: Keypoint): number {
    return calculateAngle(shoulder, elbow, wrist);
  }

  /**
   * Score an angle based on whether it falls within the ideal range
   */
  private scoreAngleInRange(angle: number, minAngle: number, maxAngle: number): number {
    if (isNaN(angle) || !isFinite(angle)) return 0;

    if (angle >= minAngle && angle <= maxAngle) {
      return 1.0;
    }

    // Calculate penalty based on distance from ideal range
    const distanceFromRange = Math.min(
      Math.abs(angle - minAngle),
      Math.abs(angle - maxAngle)
    );

    return Math.max(0, 1 - (distanceFromRange / 45)); // 45-degree tolerance
  }

  /**
   * Calculate movement between two poses
   */
  private calculatePoseMovement(pose1: PoseData, pose2: PoseData): number {
    const commonKeypoints = pose1.keypoints.filter(kp1 => 
      pose2.keypoints.some(kp2 => kp2.name === kp1.name)
    );

    if (commonKeypoints.length === 0) return 0;

    let totalMovement = 0;
    let keypointCount = 0;

    for (const kp1 of commonKeypoints) {
      const kp2 = pose2.keypoints.find(kp => kp.name === kp1.name);
      if (kp2) {
        const distance = calculateDistance(kp1, kp2);
        totalMovement += distance;
        keypointCount++;
      }
    }

    return keypointCount > 0 ? totalMovement / keypointCount : 0;
  }
}

// Singleton instance
export const formScoring = new FormScoring(); 