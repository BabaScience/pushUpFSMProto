import { CV_FSM_CONFIG } from '../constants/poseConfig';
import { PushUpState, type PoseData } from '../types';
import { formScoring } from './formScoring';
import { calculateBodyAngle } from './geometryUtils';
import { detectMovementDirection, isValidPushUpPose } from './poseAnalysis';

export interface FSMResult {
  currentState: PushUpState;
  previousState: PushUpState;
  stateChanged: boolean;
  repCount: number;
  formQuality: number;
  formFeedback: string[];
  stateTransitionTime: number;
}

export class PushUpFSM {
  private currentState: PushUpState = PushUpState.IDLE;
  private previousState: PushUpState = PushUpState.IDLE;
  private repCount: number = 0;
  private stateStartTime: number = Date.now();
  private currentPose: PoseData | null = null;
  private previousPose: PoseData | null = null;
  private setupPose: PoseData | null = null;
  private bottomPose: PoseData | null = null;
  private poseHistory: PoseData[] = [];

  constructor() {
    this.reset();
  }

  processPose(pose: PoseData): FSMResult {
    const previousState = this.currentState;
    this.previousPose = this.currentPose;
    this.currentPose = pose;
    
    // Add to pose history (keep last 30 poses for smoothness analysis)
    this.poseHistory.push(pose);
    if (this.poseHistory.length > 30) {
      this.poseHistory.shift();
    }

    // Check for timeout first
    if (this.hasStateTimedOut()) {
      this.handleTimeout();
    } else {
      // Process state transitions based on pose
      this.processStateTransition(pose);
    }

    const stateChanged = this.currentState !== previousState;
    if (stateChanged) {
      this.previousState = previousState;
      this.stateStartTime = Date.now();
    }

    const formQuality = formScoring.calculateOverallFormQuality(pose, this.poseHistory);
    const formFeedback = [formScoring.generateFormFeedback(pose, this.poseHistory)];

    return {
      currentState: this.currentState,
      previousState: this.previousState,
      stateChanged,
      repCount: this.repCount,
      formQuality,
      formFeedback,
      stateTransitionTime: Date.now() - this.stateStartTime,
    };
  }

  private processStateTransition(pose: PoseData): void {
    switch (this.currentState) {
      case PushUpState.IDLE:
        if (isValidPushUpPose(pose.keypoints)) {
          this.currentState = PushUpState.SETUP_POSITION;
          this.setupPose = pose;
        }
        break;

      case PushUpState.SETUP_POSITION:
        if (!isValidPushUpPose(pose.keypoints)) {
          this.currentState = PushUpState.IDLE;
        } else if (this.isMovingDown(pose)) {
          this.currentState = PushUpState.GOING_DOWN;
        }
        break;

      case PushUpState.GOING_DOWN:
        if (!isValidPushUpPose(pose.keypoints)) {
          this.currentState = PushUpState.SETUP_POSITION;
        } else if (this.hasReachedBottomPosition(pose)) {
          this.currentState = PushUpState.BOTTOM_POSITION;
          this.bottomPose = pose;
        }
        break;

      case PushUpState.BOTTOM_POSITION:
        if (!isValidPushUpPose(pose.keypoints)) {
          this.currentState = PushUpState.SETUP_POSITION;
        } else if (this.isMovingUp(pose)) {
          this.currentState = PushUpState.GOING_UP;
        }
        break;

      case PushUpState.GOING_UP:
        if (!isValidPushUpPose(pose.keypoints)) {
          this.currentState = PushUpState.SETUP_POSITION;
        } else if (this.hasReachedTopPosition(pose)) {
          if (this.isValidRep(pose)) {
            this.repCount++;
            this.currentState = PushUpState.TOP_POSITION;
          } else {
            this.currentState = PushUpState.SETUP_POSITION;
          }
        }
        break;

      case PushUpState.TOP_POSITION:
        // Brief pause at top, then return to setup
        if (Date.now() - this.stateStartTime > 500) {
          this.currentState = PushUpState.SETUP_POSITION;
          this.setupPose = pose;
        }
        break;
    }
  }

  private hasStateTimedOut(): boolean {
    const timeInState = Date.now() - this.stateStartTime;
    return timeInState > CV_FSM_CONFIG.MAX_STATE_DURATION;
  }

  private handleTimeout(): void {
    switch (this.currentState) {
      case PushUpState.SETUP_POSITION:
        this.currentState = PushUpState.IDLE;
        break;
      case PushUpState.GOING_DOWN:
      case PushUpState.BOTTOM_POSITION:
      case PushUpState.GOING_UP:
        this.currentState = PushUpState.SETUP_POSITION;
        break;
      default:
        this.currentState = PushUpState.IDLE;
        break;
    }
  }

  private hasMinimumStability(): boolean {
    // For now, assume stability - in real implementation would track pose consistency
    const timeInCurrentState = Date.now() - this.stateStartTime;
    return timeInCurrentState > 100; // Minimal delay for initial transition
  }

  private isMovingDown(pose: PoseData): boolean {
    if (!this.previousPose) return false;
    
    const direction = detectMovementDirection(this.previousPose, pose);
    return direction === 'down';
  }

  private isMovingUp(pose: PoseData): boolean {
    if (!this.previousPose) return false;
    
    const direction = detectMovementDirection(this.previousPose, pose);
    return direction === 'up';
  }

  private hasReachedBottomPosition(pose: PoseData): boolean {
    if (!this.setupPose || !this.previousPose) return false;

    // Check if we've moved down significantly from setup position
    const currentNose = pose.keypoints.find(kp => kp.name === 'nose');
    const setupNose = this.setupPose.keypoints.find(kp => kp.name === 'nose');
    
    if (!currentNose || !setupNose) return false;
    
    const verticalMovement = currentNose.y - setupNose.y;
    return verticalMovement >= CV_FSM_CONFIG.MIN_VERTICAL_DISPLACEMENT;
  }

  private hasReachedTopPosition(pose: PoseData): boolean {
    if (!this.setupPose || !this.bottomPose) return false;

    // Check if we've moved back up close to setup position
    const currentNose = pose.keypoints.find(kp => kp.name === 'nose');
    const setupNose = this.setupPose.keypoints.find(kp => kp.name === 'nose');
    
    if (!currentNose || !setupNose) return false;
    
    const verticalDistance = Math.abs(currentNose.y - setupNose.y);
    return verticalDistance <= CV_FSM_CONFIG.TOP_POSITION_ANGLE; // Using as pixel threshold
  }

  private isValidRep(pose: PoseData): boolean {
    const formQuality = formScoring.calculateOverallFormQuality(pose, this.poseHistory);
    return formQuality > 0.6; // Minimum form quality threshold
  }

  private generateFormFeedback(pose: PoseData): string[] {
    const feedback: string[] = [];
    const formFeedback = formScoring.generateFormFeedback(pose, this.poseHistory);
    
    if (formFeedback && formFeedback.length > 0) {
      feedback.push(formFeedback);
    }

    if (!isValidPushUpPose(pose.keypoints)) {
      feedback.push('Ensure all body parts are visible');
    }

    // Add specific feedback based on pose analysis
    const bodyAngle = calculateBodyAngle(pose.keypoints);
    if (bodyAngle !== null && Math.abs(bodyAngle) > 45) {
      feedback.push('Keep your body straight');
    }

    return feedback;
  }

  getCurrentState(): PushUpState {
    return this.currentState;
  }

  getRepCount(): number {
    return this.repCount;
  }

  getCurrentPose(): PoseData | null {
    return this.currentPose;
  }

  reset(): void {
    this.currentState = PushUpState.IDLE;
    this.previousState = PushUpState.IDLE;
    this.repCount = 0;
    this.stateStartTime = Date.now();
    this.currentPose = null;
    this.previousPose = null;
    this.setupPose = null;
    this.bottomPose = null;
    this.poseHistory = [];
  }
} 