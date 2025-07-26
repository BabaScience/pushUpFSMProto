# Push-Up Counter App - Computer Vision TDD Specification

## 🎯 Cursor Implementation Context

### Quick Start Commands for Cursor
```bash
# 1. Create project
npx create-expo-app@latest PushUpCounterProto --template tabs
cd PushUpCounterProto

# 2. Install all dependencies at once
npm install expo-camera @tensorflow/tfjs @tensorflow/tfjs-react-native @tensorflow-models/pose-detection @tensorflow/tfjs-platform-react-native @react-native-async-storage/async-storage react-native-svg react-native-canvas @testing-library/react-native @testing-library/jest-native --save-dev jest

# 3. Create folder structure
mkdir components hooks services utils types && mkdir components/CameraView components/Counter components/SessionControls components/WorkoutHistory

# 4. Start development
npx expo start
```

### Cursor Prompting Strategy
When using Cursor to implement this project, use these prompting patterns:

**For Components:**
```
Create a React Native component for [component name] that:
- Uses TypeScript with proper types
- Implements [specific functionality]
- Includes proper error handling
- Has accessibility props
- Uses Expo best practices
```

**For Hooks:**
```
Create a custom React hook that:
- Manages [specific state/logic]
- Returns typed values and functions
- Handles cleanup in useEffect
- Has proper dependency arrays
- Includes error states
```

**For Services:**
```
Create a service class/module that:
- Handles [specific functionality]
- Uses async/await properly
- Has comprehensive error handling
- Returns typed responses
- Is testable with mocks
```

## 📁 File-by-File Implementation Guide

### Priority Order for Cursor Implementation

#### Phase 1: Core Types & Config (Start Here)
```typescript
// types/index.ts - Define all types first
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

// ... more types
```

```typescript
// constants/poseConfig.ts - All configuration values
export const CV_FSM_CONFIG = {
  MIN_POSE_CONFIDENCE: 0.7,
  REQUIRED_KEYPOINTS: ['nose', 'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow'],
  TOP_POSITION_ANGLE: 15,
  BOTTOM_POSITION_ANGLE: -30,
  // ... all config values
} as const;
```

#### Phase 2: Core Utilities (Build Foundation)
1. `utils/geometryUtils.ts` - Math functions for angles, distances
2. `utils/poseAnalysis.ts` - Pose processing functions
3. `utils/pushUpFSM.ts` - State machine logic
4. `utils/formScoring.ts` - Form quality assessment

#### Phase 3: Services (External Integrations)
1. `services/cameraService.ts` - Camera management
2. `services/poseEstimationService.ts` - TensorFlow integration
3. `services/storageService.ts` - Data persistence

#### Phase 4: Hooks (Business Logic)
1. `hooks/useCamera.ts` - Camera hook
2. `hooks/usePoseDetection.ts` - Pose detection hook
3. `hooks/usePushUpDetection.ts` - Main detection logic
4. `hooks/useWorkoutSession.ts` - Session management

#### Phase 5: Components (UI Layer)
1. `components/CameraView/CameraView.tsx` - Main camera component
2. `components/Counter/Counter.tsx` - Counter display
3. `components/SessionControls/SessionControls.tsx` - Control buttons
4. `app/(tabs)/index.tsx` - Main screen integration

## 💡 Cursor Code Examples & Patterns

### Example Hook Implementation Pattern
```typescript
// hooks/usePoseDetection.ts - Example for Cursor
import { useState, useEffect, useRef } from 'react';
import type { PoseData } from '../types';

export function usePoseDetection() {
  const [isDetecting, setIsDetecting] = useState(false);
  const [currentPose, setCurrentPose] = useState<PoseData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Cursor: Implement pose detection logic here
  const startDetection = async () => {
    try {
      setIsDetecting(true);
      setError(null);
      // Initialize pose detection
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const stopDetection = () => {
    setIsDetecting(false);
    // Cleanup resources
  };

  useEffect(() => {
    return () => {
      stopDetection(); // Cleanup on unmount
    };
  }, []);

  return {
    isDetecting,
    currentPose,
    error,
    startDetection,
    stopDetection,
  };
}
```

### Example Service Pattern
```typescript
// services/poseEstimationService.ts - Example for Cursor
import * as poseDetection from '@tensorflow-models/pose-detection';
import type { PoseData } from '../types';

class PoseEstimationService {
  private detector: poseDetection.PoseDetector | null = null;
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Cursor: Implement TensorFlow model loading
      const model = poseDetection.SupportedModels.MoveNet;
      this.detector = await poseDetection.createDetector(model);
      this.isInitialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize pose detection: ${error}`);
    }
  }

  async detectPose(imageData: ImageData): Promise<PoseData | null> {
    if (!this.detector) throw new Error('Detector not initialized');
    
    // Cursor: Implement pose detection logic
    const poses = await this.detector.estimatePoses(imageData);
    if (poses.length === 0) return null;
    
    return {
      keypoints: poses[0].keypoints,
      confidence: poses[0].score || 0,
      timestamp: Date.now(),
    };
  }

  cleanup() {
    this.detector?.dispose();
    this.detector = null;
    this.isInitialized = false;
  }
}

export const poseEstimationService = new PoseEstimationService();
```

### Example Component Pattern
```typescript
// components/CameraView/CameraView.tsx - Example for Cursor
import React, { useRef, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Camera } from 'expo-camera';
import { usePoseDetection } from '../../hooks/usePoseDetection';

interface CameraViewProps {
  onPoseDetected?: (pose: PoseData) => void;
  isActive: boolean;
}

export function CameraView({ onPoseDetected, isActive }: CameraViewProps) {
  const cameraRef = useRef<Camera>(null);
  const { currentPose, startDetection, stopDetection } = usePoseDetection();

  useEffect(() => {
    if (isActive) {
      startDetection();
    } else {
      stopDetection();
    }
  }, [isActive]);

  useEffect(() => {
    if (currentPose && onPoseDetected) {
      onPoseDetected(currentPose);
    }
  }, [currentPose, onPoseDetected]);

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={styles.camera}
        type={Camera.Constants.Type.front}
        // Cursor: Add camera props and frame processing
      />
      {/* Cursor: Add pose overlay component here */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
});
```
- **Requirement**: Automatically detect push-up motions using camera and pose estimation with FSM
- **Acceptance Criteria**:
  - Real-time pose detection using device camera
  - FSM States: IDLE → SETUP_POSITION → GOING_DOWN → BOTTOM_POSITION → GOING_UP → TOP_POSITION → IDLE
  - Track key body landmarks (shoulders, elbows, wrists, torso)
  - Calculate body angle and vertical displacement
  - Complete rep counted only after full FSM state cycle
  - Works in various lighting conditions
  - Handles partial occlusion of body parts
  - Configurable sensitivity and angle thresholds

### 2. Real-time Camera Feed with Overlay
- **Requirement**: Live camera preview with pose detection visualization
- **Acceptance Criteria**:
  - Full-screen camera preview
  - Overlay skeleton/keypoints on detected pose
  - Visual feedback for current FSM state
  - Guidance indicators for proper positioning
  - Frame rate indicator for performance monitoring

### 3. Counter Display with Visual Feedback
- **Requirement**: Real-time display of push-up count with pose-based feedback
- **Acceptance Criteria**:
  - Large, visible counter display over camera feed
  - Updates immediately when rep is detected
  - Maintains count during session
  - Shows current session and total historical count
  - Visual indicators for pose quality/form
  - FSM state display for debugging

### 4. Session Management
- **Requirement**: Start, pause, stop, and reset workout sessions
- **Acceptance Criteria**:
  - Start button to begin counting and camera
  - Pause/Resume functionality (stops camera processing)
  - Stop button to end session
  - Reset button to clear current count
  - Session timer display
  - Background/foreground handling

### 5. Data Persistence & Analytics
- **Requirement**: Store workout history with pose quality metrics
- **Acceptance Criteria**:
  - Save completed sessions with date/time
  - Store total push-ups per session
  - Record average pose quality scores
  - Track form consistency metrics
  - Display workout history with analytics
  - Data persists between app launches

## Push-Up Detection FSM (Computer Vision)

### State Machine Design

```typescript
enum PushUpState {
  IDLE = 'IDLE',
  SETUP_POSITION = 'SETUP_POSITION',
  GOING_DOWN = 'GOING_DOWN',
  BOTTOM_POSITION = 'BOTTOM_POSITION', 
  GOING_UP = 'GOING_UP',
  TOP_POSITION = 'TOP_POSITION'
}

interface PoseData {
  keypoints: Keypoint[];
  confidence: number;
  timestamp: number;
}

interface BodyMetrics {
  shoulderAngle: number;
  elbowAngle: number;
  bodyAngle: number;
  verticalDisplacement: number;
  poseQuality: number;
}
```

### State Definitions

1. **IDLE**: Waiting for person to enter frame
   - Entry: Reset pose tracking buffers
   - Exit Condition: Valid pose detected for minimum duration

2. **SETUP_POSITION**: Person in plank/starting position
   - Entry: Start tracking body metrics
   - Exit Conditions: Downward movement detected (→ GOING_DOWN) OR pose lost (→ IDLE)

3. **GOING_DOWN**: User is lowering body toward ground  
   - Entry: Record starting body angle
   - Exit Conditions: Body angle reaches bottom threshold (→ BOTTOM_POSITION) OR timeout (→ SETUP_POSITION)

4. **BOTTOM_POSITION**: User is at bottom of push-up
   - Entry: Record bottom position metrics
   - Exit Conditions: Upward movement detected (→ GOING_UP) OR timeout (→ SETUP_POSITION)

5. **GOING_UP**: User is pushing up from ground
   - Entry: Start tracking upward motion  
   - Exit Conditions: Body angle returns to top threshold (→ TOP_POSITION) OR timeout (→ SETUP_POSITION)

6. **TOP_POSITION**: User has completed push-up
   - Entry: Increment counter, record form quality
   - Exit Condition: Always transition to SETUP_POSITION after brief delay

### Computer Vision Configuration

```typescript
const CV_FSM_CONFIG = {
  // Pose detection
  MIN_POSE_CONFIDENCE: 0.7,
  REQUIRED_KEYPOINTS: ['nose', 'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow', 'left_wrist', 'right_wrist'],
  
  // Body angle thresholds (degrees from horizontal)
  TOP_POSITION_ANGLE: 15,        // Nearly horizontal at top
  BOTTOM_POSITION_ANGLE: -30,    // Angled down at bottom
  MIN_ANGLE_CHANGE: 25,          // Minimum angle change for valid rep
  
  // Movement detection
  MIN_VERTICAL_DISPLACEMENT: 50, // pixels (minimum up/down movement)
  MOVEMENT_THRESHOLD: 3.0,       // pixels/frame for motion detection
  STABILITY_FRAMES: 10,          // frames pose must be stable
  
  // Timing constraints
  MIN_SETUP_DURATION: 1000,      // ms (minimum time in setup)
  MIN_DOWN_DURATION: 500,        // ms (minimum time going down)
  MIN_UP_DURATION: 500,          // ms (minimum time going up)
  MAX_STATE_DURATION: 5000,      // ms (timeout for any state)
  
  // Form quality scoring
  IDEAL_BODY_ALIGNMENT: 5,       // degrees tolerance for straight body
  ELBOW_ANGLE_RANGE: [45, 90],   // degrees for proper elbow position
  SHOULDER_STABILITY: 10,        // pixel tolerance for shoulder movement
};
```

## Technical Architecture

### Tech Stack
- **Framework**: React Native with Expo SDK 49+
- **Computer Vision**: @tensorflow/tfjs + @tensorflow/tfjs-react-native
- **Pose Detection**: @tensorflow-models/pose-detection (MoveNet/PoseNet)
- **Camera**: expo-camera with real-time processing
- **Canvas**: react-native-canvas for pose overlay rendering
- **Storage**: AsyncStorage for local data persistence
- **Testing**: Jest + React Native Testing Library
- **State Management**: React hooks + Context API
- **FSM**: Custom finite state machine with pose integration

### Project Structure
```
PUSHUPCOUNTERPROTO/
├── .expo/
├── .vscode/
├── app/
│   ├── (tabs)/
│   │   ├── index.tsx          # Main camera/counter screen
│   │   ├── history.tsx        # Workout history screen
│   │   └── settings.tsx       # Settings screen
│   ├── _layout.tsx
│   └── +not-found.tsx
├── assets/
├── components/
│   ├── CameraView/
│   │   ├── CameraView.tsx
│   │   ├── CameraView.test.tsx
│   │   └── PoseOverlay.tsx
│   ├── Counter/
│   │   ├── Counter.tsx
│   │   └── Counter.test.tsx
│   ├── SessionControls/
│   │   ├── SessionControls.tsx
│   │   └── SessionControls.test.tsx
│   └── WorkoutHistory/
│       ├── WorkoutHistory.tsx
│       └── WorkoutHistory.test.tsx
├── constants/
│   ├── Colors.ts
│   └── poseConfig.ts
├── hooks/
│   ├── usePoseDetection.ts
│   ├── usePoseDetection.test.ts
│   ├── usePushUpDetection.ts
│   ├── usePushUpDetection.test.ts
│   ├── useCamera.ts
│   ├── useCamera.test.ts
│   ├── useWorkoutSession.ts
│   ├── useWorkoutSession.test.ts
│   ├── useWorkoutHistory.ts
│   └── useWorkoutHistory.test.ts
├── services/
│   ├── poseEstimationService.ts
│   ├── poseEstimationService.test.ts
│   ├── cameraService.ts
│   ├── cameraService.test.ts
│   ├── storageService.ts
│   └── storageService.test.ts
├── utils/
│   ├── pushUpFSM.ts
│   ├── pushUpFSM.test.ts
│   ├── poseAnalysis.ts
│   ├── poseAnalysis.test.ts
│   ├── geometryUtils.ts
│   ├── geometryUtils.test.ts
│   ├── formScoring.ts
│   └── formScoring.test.ts
├── types/
│   └── index.ts
├── node_modules/
├── scripts/
├── .gitignore
├── app.json
├── eslint.config.js
├── expo-env.d.ts
├── package-lock.json
├── package.json
├── README.md
├── spec.md
└── tsconfig.json
```

## 🧪 TDD with Cursor

### Test-First Development Pattern for Cursor

When implementing each file, start with the test:

```bash
# Example workflow:
# 1. Create test file first
touch utils/poseAnalysis.test.ts

# 2. Write failing tests
# 3. Ask Cursor to implement the actual function
# 4. Run tests and iterate
```

### Example Test Pattern for Cursor
```typescript
// utils/poseAnalysis.test.ts - Example for Cursor
import { calculateBodyAngle, isValidPushUpPose } from './poseAnalysis';
import type { Keypoint } from '../types';

describe('poseAnalysis', () => {
  const mockKeypoints: Keypoint[] = [
    { x: 100, y: 100, confidence: 0.9, name: 'nose' },
    { x: 90, y: 120, confidence: 0.8, name: 'left_shoulder' },
    { x: 110, y: 120, confidence: 0.8, name: 'right_shoulder' },
    // ... more keypoints
  ];

  test('calculateBodyAngle should return angle in degrees', () => {
    const angle = calculateBodyAngle(mockKeypoints);
    expect(angle).toBeGreaterThan(-90);
    expect(angle).toBeLessThan(90);
  });

  test('isValidPushUpPose should validate pose confidence', () => {
    const isValid = isValidPushUpPose(mockKeypoints);
    expect(isValid).toBe(true);
  });

  // Cursor: Add more specific test cases
});
```

### Cursor Prompts for TDD
```
Write comprehensive tests for [function/class name] that:
- Test happy path scenarios
- Test edge cases and error conditions
- Mock external dependencies
- Use Jest and React Native Testing Library
- Follow AAA pattern (Arrange, Act, Assert)
```

### Computer Vision Tests

#### 1. Pose Estimation Service (`services/poseEstimationService.test.ts`)
```typescript
describe('Pose Estimation Service', () => {
  test('should initialize TensorFlow models correctly')
  test('should detect poses from camera frames')
  test('should handle model loading failures gracefully')
  test('should filter poses by confidence threshold')
  test('should process frames at target FPS')
  test('should clean up resources when stopped')
  test('should handle different device orientations')
})
```

#### 2. Pose Analysis (`utils/poseAnalysis.test.ts`)
```typescript
describe('Pose Analysis', () => {
  test('should calculate body angle from keypoints')
  test('should measure vertical displacement between poses')
  test('should detect valid push-up starting position')
  test('should calculate elbow and shoulder angles')
  test('should determine pose quality score')
  test('should handle missing or low-confidence keypoints')
  test('should normalize coordinates for different screen sizes')
})
```

#### 3. Push-Up FSM with CV (`utils/pushUpFSM.test.ts`)
```typescript
describe('Computer Vision Push-Up FSM', () => {
  test('should start in IDLE state')
  test('should transition IDLE → SETUP_POSITION when valid pose detected')
  test('should transition SETUP_POSITION → GOING_DOWN when body angle decreases')
  test('should transition GOING_DOWN → BOTTOM_POSITION when angle threshold reached')
  test('should transition BOTTOM_POSITION → GOING_UP when upward movement detected')
  test('should transition GOING_UP → TOP_POSITION when returning to start angle')
  test('should transition TOP_POSITION → SETUP_POSITION and increment counter')
  test('should timeout to appropriate state when stuck')
  test('should handle pose detection failures during transitions')
  test('should validate form quality before counting rep')
  test('should reset state machine when pose is lost')
})
```

#### 4. Camera Service (`services/cameraService.test.ts`)
```typescript
describe('Camera Service', () => {
  test('should request camera permissions')
  test('should start camera with correct configuration')
  test('should capture frames for pose processing')
  test('should handle camera unavailable gracefully')
  test('should stop camera and release resources')
  test('should handle app backgrounding')
  test('should manage camera orientation changes')
})
```

#### 5. Form Scoring (`utils/formScoring.test.ts`)
```typescript
describe('Form Scoring', () => {
  test('should score body alignment during push-up')
  test('should evaluate elbow positioning')
  test('should assess movement smoothness')
  test('should calculate overall form quality')
  test('should provide specific feedback for improvements')
  test('should handle edge cases in pose data')
})
```

### Integration Tests

#### 6. Pose Detection Hook (`hooks/usePoseDetection.test.ts`)
```typescript
describe('usePoseDetection', () => {
  test('should initialize pose detection models')
  test('should process camera frames and return poses')
  test('should handle model initialization failures')
  test('should manage camera lifecycle')
  test('should filter poses by confidence')
  test('should cleanup resources on unmount')
})
```

#### 7. Push-Up Detection Hook (`hooks/usePushUpDetection.test.ts`)
```typescript
describe('usePushUpDetection', () => {
  test('should initialize FSM in IDLE state')
  test('should process pose data through FSM')
  test('should increment count when FSM completes full cycle')
  test('should not count reps with poor form')
  test('should provide current FSM state and pose metrics')
  test('should handle pose detection interruptions')
  test('should reset detection state when requested')
})
```

### Component Tests

#### 8. Camera View (`components/CameraView/CameraView.test.ts`)
```typescript
describe('Camera View', () => {
  test('should render camera preview')
  test('should display pose overlay when pose detected')
  test('should show FSM state indicators')
  test('should handle camera permissions')
  test('should display form feedback')
  test('should render performance metrics')
})
```

#### 9. Counter Component (`components/Counter/Counter.test.ts`)
```typescript
describe('Counter Component', () => {
  test('should display current count over camera')
  test('should show form quality indicators')
  test('should display session timer')
  test('should show current FSM state')
  test('should provide visual feedback for rep completion')
})
```

## 🔥 Cursor Development Workflow

### Daily Development Pattern

#### 1. Morning Setup (5 min)
```bash
# Start development server
npx expo start

# Run tests in watch mode
npm run test:watch

# Open Cursor with project context
cursor .
```

#### 2. Feature Development Loop
1. **Pick next file** from implementation priority order
2. **Write test first** using TDD pattern
3. **Use Cursor to implement** with specific prompts
4. **Test and iterate** until green
5. **Commit progress** with descriptive message

#### 3. Cursor Chat Prompts Library

**For Bug Fixes:**
```
There's an issue with [component/function]. The error is [error message]. 
Looking at the code in [file], can you help debug and fix this? 
Consider [relevant context].
```

**For New Features:**
```
I need to implement [feature] in [file]. It should [requirements].
The existing code structure is [context]. Please create a solution that 
follows the established patterns and includes proper TypeScript types.
```

**For Optimization:**
```
This [component/function] is running slowly. Can you optimize it for 
performance while maintaining the same functionality? Consider 
[specific performance requirements].
```

**For Testing:**
```
Create comprehensive tests for [file/function] that cover:
- Happy path scenarios
- Edge cases
- Error conditions
- Performance requirements
Use Jest and follow our existing test patterns.
```

### VSCode/Cursor Extensions to Install
```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.test-adapter-converter",
    "orta.vscode-jest",
    "expo.vscode-expo-tools"
  ]
}
```

### Phase 1: Project Setup & Computer Vision Foundation (Week 1-2)
1. Set up Expo project with tabs template
2. Configure TensorFlow.js and pose detection models
3. Implement camera service with frame capture in `services/`
4. Create pose estimation service
5. Write pose analysis utilities in `utils/` (angles, displacement)
6. Test pose detection accuracy with various positions

### Phase 2: FSM Integration with CV (Week 2-3)
1. Implement FSM with pose-based transitions in `utils/pushUpFSM.ts`
2. Create body metrics calculation functions in `utils/poseAnalysis.ts`
3. Integrate FSM with real-time pose data using hooks
4. Add form quality scoring system in `utils/formScoring.ts`
5. Test FSM state transitions with real movements

### Phase 3: Main App Screen & Real-time UI (Week 3)
1. Build main camera screen in `app/(tabs)/index.tsx`
2. Create camera view component with pose overlay in `components/CameraView/`
3. Implement real-time counter display component in `components/Counter/`
4. Add visual feedback for FSM states
5. Create session controls in `components/SessionControls/`
6. Test UI performance and responsiveness

### Phase 4: Navigation & History (Week 4)
1. Implement workout history screen in `app/(tabs)/history.tsx`
2. Create workout history component in `components/WorkoutHistory/`
3. Add settings screen in `app/(tabs)/settings.tsx`
4. Implement session management hooks in `hooks/`
5. Create data persistence layer in `services/storageService.ts`
6. Add analytics dashboard functionality

### Phase 5: Optimization & Polish (Week 4-5)
1. Performance optimization for real-time processing
2. Memory management and resource cleanup
3. Error handling and edge cases
4. User experience refinements
5. Production testing and validation

## Testing Strategy

### Unit Tests
- All pose analysis functions (angle calculations, metrics)
- FSM state transitions with mock pose data
- Form scoring algorithms
- Geometry utilities
- Individual components in isolation

### Integration Tests
- Camera + pose detection pipeline
- FSM + pose analysis integration
- Session management with storage
- Component integration with computer vision

### Manual Testing Scenarios
- Various push-up forms and speeds
- Different lighting conditions
- Multiple camera angles and distances
- Partial body occlusion scenarios
- Device orientation changes
- Background/foreground app transitions

## Performance Requirements

- **Camera Processing**: 30fps camera capture
- **Pose Detection**: 15-20fps pose estimation
- **UI Updates**: 60fps for smooth overlays
- **Memory Usage**: < 200MB RAM (due to ML models)
- **Battery Impact**: Optimized for 30+ minute sessions
- **Model Loading**: < 3 seconds initial setup
- **Frame Processing**: < 50ms per frame analysis

## Error Handling

- Camera permission denied
- Camera hardware unavailable
- TensorFlow model loading failures
- Pose detection confidence too low
- Insufficient lighting conditions
- Device memory constraints
- App backgrounding during session
- **FSM-specific errors**:
  - Pose detection interruption during rep
  - Invalid state transitions due to poor pose quality
  - Timeout handling when pose is lost

## Success Criteria

- [ ] 90%+ push-up detection accuracy in controlled tests
- [ ] Works reliably in various lighting conditions
- [ ] All automated tests passing (>85% code coverage)
- [ ] Smooth 30fps camera performance
- [ ] FSM handles edge cases gracefully
- [ ] Form quality feedback provides actionable insights
- [ ] App works on both iOS and Android
- [ ] Data persistence across app restarts

## Development Setup

### Prerequisites
- Node.js 18+
- Expo CLI
- Physical device with camera (required for testing)
- Good lighting environment for development

### Installation
```bash
npx create-expo-app@latest PushUpCounterProto --template tabs
cd PushUpCounterProto

# Install computer vision dependencies
npm install expo-camera @tensorflow/tfjs @tensorflow/tfjs-react-native
npm install @tensorflow-models/pose-detection
npm install @tensorflow/tfjs-platform-react-native

# Install additional dependencies
npm install @react-native-async-storage/async-storage
npm install react-native-svg react-native-canvas

# Install testing dependencies
npm install --save-dev jest @testing-library/react-native
npm install --save-dev @testing-library/jest-native

# Create required directories
mkdir components hooks services utils types
```

### Camera Permissions & Configuration
```json
// app.json
{
  "expo": {
    "name": "PushUp Counter Proto",
    "slug": "pushup-counter-proto",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "myapp",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/images/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": true,
      "infoPlist": {
        "NSCameraUsageDescription": "This app uses the camera to detect push-up movements for counting reps."
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "permissions": ["android.permission.CAMERA"]
    },
    "web": {
      "bundler": "metro",
      "output": "static",
      "favicon": "./assets/images/favicon.png"
    },
    "plugins": [
      "expo-router",
      [
        "expo-camera",
        {
          "cameraPermission": "Allow PushUp Counter to use your camera to detect push-ups and count reps automatically."
        }
      ]
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

### TensorFlow.js Setup
```typescript
// app/_layout.tsx
import '@tensorflow/tfjs-react-native';
import '@tensorflow/tfjs-platform-react-native';

// Platform adapter setup
import * as tf from '@tensorflow/tfjs';

export default function RootLayout() {
  useEffect(() => {
    // Initialize TensorFlow
    tf.ready().then(() => {
      console.log('TensorFlow.js is ready!');
    });
  }, []);

  // ... rest of layout
}
```

### Test Commands for Cursor Development
```bash
# Basic testing
npm test                    # Run all tests once
npm run test:watch         # Watch mode for development
npm run test:coverage      # Coverage report with threshold checks

# Specific test categories
npm run test:utils         # Test utility functions only
npm run test:hooks         # Test custom hooks only  
npm run test:components    # Test React components only
npm run test:services      # Test service classes only
npm run test:integration   # Integration tests only

# Development helpers
npm run lint               # Run ESLint
npm run type-check        # TypeScript compilation check
npm run test:ci           # CI-friendly test run
```

### Package.json Scripts for Cursor
```json
{
  "scripts": {
    "start": "expo start",
    "android": "expo start --android", 
    "ios": "expo start --ios",
    "web": "expo start --web",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:utils": "jest utils/",
    "test:hooks": "jest hooks/",
    "test:components": "jest components/",
    "test:services": "jest services/",
    "test:integration": "jest --testPathPattern=integration",
    "lint": "eslint . --ext .ts,.tsx",
    "type-check": "tsc --noEmit",
    "test:ci": "jest --ci --coverage --watchAll=false"
  }
}
```

This specification provides a comprehensive foundation for building a computer vision-based push-up counter with robust FSM detection and TDD methodology.