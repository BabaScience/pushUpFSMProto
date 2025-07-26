export interface Keypoint {
  x: number;
  y: number;
  confidence: number;
  name: string;
}

export interface PoseData {
  keypoints: Keypoint[];
  confidence: number;
  timestamp: number;
}

export enum PushUpState {
  IDLE = 'IDLE',
  SETUP_POSITION = 'SETUP_POSITION',
  GOING_DOWN = 'GOING_DOWN',
  BOTTOM_POSITION = 'BOTTOM_POSITION',
  GOING_UP = 'GOING_UP',
  TOP_POSITION = 'TOP_POSITION'
} 