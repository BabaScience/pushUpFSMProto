import type { Keypoint } from '../types';

/**
 * Calculate the Euclidean distance between two keypoints
 */
export function calculateDistance(point1: Keypoint, point2: Keypoint): number {
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate the angle between three points (point2 is the vertex)
 * Returns angle in degrees
 */
export function calculateAngle(point1: Keypoint, point2: Keypoint, point3: Keypoint): number {
  const vector1 = {
    x: point1.x - point2.x,
    y: point1.y - point2.y,
  };
  
  const vector2 = {
    x: point3.x - point2.x,
    y: point3.y - point2.y,
  };

  const dotProduct = vector1.x * vector2.x + vector1.y * vector2.y;
  const magnitude1 = Math.sqrt(vector1.x * vector1.x + vector1.y * vector1.y);
  const magnitude2 = Math.sqrt(vector2.x * vector2.x + vector2.y * vector2.y);

  if (magnitude1 === 0 || magnitude2 === 0) {
    return 0;
  }

  const cosAngle = dotProduct / (magnitude1 * magnitude2);
  const angleRad = Math.acos(Math.max(-1, Math.min(1, cosAngle)));
  return (angleRad * 180) / Math.PI;
}

/**
 * Calculate the body angle from horizontal using shoulder and hip keypoints
 * Returns angle in degrees (positive = angled up, negative = angled down)
 */
export function calculateBodyAngle(keypoints: Keypoint[]): number | null {
  const leftShoulder = keypoints.find(kp => kp.name === 'left_shoulder');
  const rightShoulder = keypoints.find(kp => kp.name === 'right_shoulder');
  const leftHip = keypoints.find(kp => kp.name === 'left_hip');
  const rightHip = keypoints.find(kp => kp.name === 'right_hip');

  if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) {
    return null;
  }

  // Calculate center points
  const shoulderCenter = {
    x: (leftShoulder.x + rightShoulder.x) / 2,
    y: (leftShoulder.y + rightShoulder.y) / 2,
  };

  const hipCenter = {
    x: (leftHip.x + rightHip.x) / 2,
    y: (leftHip.y + rightHip.y) / 2,
  };

  // Calculate angle from horizontal
  const dx = hipCenter.x - shoulderCenter.x;
  const dy = hipCenter.y - shoulderCenter.y;
  
  const angleRad = Math.atan2(dy, dx);
  return (angleRad * 180) / Math.PI;
}

/**
 * Normalize keypoint coordinates to different screen dimensions
 */
export function normalizeCoordinates(
  keypoints: Keypoint[],
  fromWidth: number,
  fromHeight: number,
  toWidth: number,
  toHeight: number
): Keypoint[] {
  const scaleX = toWidth / fromWidth;
  const scaleY = toHeight / fromHeight;

  return keypoints.map(keypoint => ({
    ...keypoint,
    x: keypoint.x * scaleX,
    y: keypoint.y * scaleY,
  }));
} 