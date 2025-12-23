# PoseOverlay Component

A comprehensive visual overlay component for real-time pose detection visualization in the gait detection system. This component renders keypoints, skeletal connections, and confidence indicators on a canvas overlay for accurate human motion tracking.

## Features

- **Real-time Rendering**: Smooth 30+ FPS pose visualization with optimized canvas operations
- **Keypoint Visualization**: Accurate circles for each detected body part with confidence-based styling
- **Skeletal Connections**: Anatomically correct connections between related keypoints
- **Color Coding**: Multiple color schemes (default, confidence-based, body part grouping)
- **Confidence Indicators**: Visual bars showing detection confidence for each keypoint
- **Temporal Smoothing**: Reduces jitter for stable visualization
- **Performance Optimization**: Adaptive quality based on performance mode
- **Debug Information**: Real-time performance metrics and statistics
- **Interactive Controls**: Toggle visibility, adjust settings, and customize appearance

## Installation

The component is part of the gait-detection container and uses existing dependencies:

```bash
# Dependencies are already included in package.json
npm install
```

## Basic Usage

```tsx
import React, { useRef } from 'react';
import { PoseOverlay } from './components/PoseOverlay';
import { usePoseOverlay } from './hooks/usePoseOverlay';

function GaitDetectionApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const poseOverlay = usePoseOverlay({
    videoElement: videoRef.current,
    canvasElement: canvasRef.current,
    isActive: true
  });

  return (
    <div className="relative w-full h-full">
      <video ref={videoRef} className="w-full h-full" />
      
      <canvas 
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />
      
      <PoseOverlay
        canvasRef={canvasRef}
        videoRef={videoRef}
        poses={poseOverlay.poses}
        settings={poseOverlay.settings}
        isActive={true}
      />
    </div>
  );
}
```

## Advanced Usage with Demo Component

```tsx
import React from 'react';
import { PoseDetectionDemo } from './components/PoseDetectionDemo';

function App() {
  return (
    <PoseDetectionDemo
      showDebugInfo={true}
      performanceMode="balanced"
      className="w-screen h-screen"
    />
  );
}
```

## Component Props

### PoseOverlay Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `canvasRef` | `React.RefObject<HTMLCanvasElement>` | ✅ | Reference to canvas element for rendering |
| `videoRef` | `React.RefObject<HTMLVideoElement>` | ❌ | Reference to video element for size calculation |
| `poses` | `PoseDetectionResult[]` | ✅ | Array of pose detection results to visualize |
| `settings` | `VisualizationSettings` | ✅ | Visualization configuration settings |
| `isActive` | `boolean` | ✅ | Whether overlay rendering is active |
| `performanceMode` | `'high' \| 'balanced' \| 'battery'` | ❌ | Performance optimization mode |
| `onPerformanceUpdate` | `(metrics: PerformanceMetrics) => void` | ❌ | Callback for performance metrics |
| `styleOverrides` | `Partial<OverlayStyle>` | ❌ | Custom style overrides |
| `showDebugInfo` | `boolean` | ❌ | Show debug information panel |
| `className` | `string` | ❌ | Additional CSS classes |

### Visualization Settings

```typescript
interface VisualizationSettings {
  skeletonOpacity: number;        // 0.0 - 1.0, overlay transparency
  trajectoryOpacity: number;      // 0.0 - 1.0, trajectory line transparency
  showConfidence: boolean;        // Show confidence indicator bars
  showParameters: boolean;        // Show gait parameters (future feature)
  skeletonStyle: 'basic' | 'anatomical' | 'minimal';
  colorScheme: 'default' | 'confidence' | 'phase';
  showTrajectory: boolean;        // Show movement trajectories
  trajectoryLength: number;       // Number of trajectory points to show
}
```

### Style Overrides

```typescript
interface OverlayStyle {
  keypoint: {
    radius: number;               // Base keypoint circle radius
    strokeWidth: number;          // Border width around keypoints
    glowRadius: number;           // Glow effect radius
  };
  connection: {
    width: number;                // Line width for skeletal connections
    dashPattern?: number[];       // Optional dash pattern for lines
    shadowBlur: number;           // Shadow blur effect
  };
  confidence: {
    barWidth: number;             // Width of confidence indicator bars
    barHeight: number;            // Height of confidence indicator bars
    offset: number;               // Distance above keypoint
  };
  animation: {
    duration: number;             // Animation duration (ms)
    easing: string;               // CSS easing function
  };
}
```

## Color Schemes

### Default
- **Left side**: Blue tones (`#45b7d1`, `#ffeaa7`)
- **Right side**: Green/Orange tones (`#96ceb4`, `#fdcb6e`)
- **Head**: Red (`#ff6b6b`)
- **Torso**: Cyan (`#4ecdc4`)

### Confidence-based
- **High confidence (>0.8)**: Green (`#00ff88`)
- **Medium confidence (0.6-0.8)**: Yellow (`#ffff00`)
- **Low confidence (0.4-0.6)**: Orange (`#ff8800`)
- **Very low confidence (<0.4)**: Red (`#ff4444`)

### Body Parts (Phase)
- **Head**: Red (`#ff6b6b`)
- **Torso**: Cyan (`#4ecdc4`)
- **Left arm**: Blue (`#45b7d1`)
- **Right arm**: Green (`#96ceb4`)
- **Left leg**: Light yellow (`#ffeaa7`)
- **Right leg**: Orange (`#fdcb6e`)

## Performance Modes

### High Performance
- **Target FPS**: 60
- **Smoothing buffer**: 5 frames
- **Frame skipping**: Disabled
- **Best for**: High-end devices, research applications

### Balanced (Default)
- **Target FPS**: 30
- **Smoothing buffer**: 3 frames
- **Frame skipping**: Every 2nd frame
- **Best for**: Most applications, good quality/performance balance

### Battery Saver
- **Target FPS**: 15
- **Smoothing buffer**: 1 frame
- **Frame skipping**: Every 3rd frame
- **Best for**: Mobile devices, extended battery life

## Hooks

### usePoseOverlay

A custom hook that integrates pose detection with the overlay component:

```typescript
const poseOverlay = usePoseOverlay({
  videoElement: videoRef.current,
  canvasElement: canvasRef.current,
  isActive: true,
  performanceMode: 'balanced',
  config: {
    modelType: 'lightning',
    enableGPU: true,
    maxPoses: 1
  }
});

// Available properties:
// - poses: PoseDetectionResult[]
// - settings: VisualizationSettings
// - updateSettings: (settings: Partial<VisualizationSettings>) => void
// - performance: PerformanceMetrics
// - isDetecting: boolean
// - startDetection: () => Promise<void>
// - stopDetection: () => void
// - error: string | null
// - stats: { totalPoses, averageConfidence, detectionRate }
```

## Keypoint Mapping

The component uses the COCO 17-point model:

```
0: nose           9: left_wrist
1: left_eye      10: right_wrist
2: right_eye     11: left_hip
3: left_ear      12: right_hip
4: right_ear     13: left_knee
5: left_shoulder 14: right_knee
6: right_shoulder 15: left_ankle
7: left_elbow    16: right_ankle
8: right_elbow
```

## Skeletal Connections

Anatomically accurate connections between keypoints:

- **Head**: Nose ↔ Eyes ↔ Ears
- **Torso**: Shoulders ↔ Hips (rectangular core)
- **Arms**: Shoulder → Elbow → Wrist
- **Legs**: Hip → Knee → Ankle

## Performance Monitoring

Real-time metrics tracked:

- **Frame Rate**: Current rendering FPS
- **Render Time**: Average time per frame (ms)
- **Memory Usage**: JavaScript heap size (MB)
- **Dropped Frames**: Count of frames that couldn't render in time
- **Processing Latency**: Time from pose detection to rendering

## Integration Examples

### With Existing Camera System

```tsx
import { CameraView } from './Camera/CameraView';
import { PoseOverlay } from './PoseOverlay';
import { useCamera } from '../hooks/useCamera';
import { usePoseOverlay } from '../hooks/usePoseOverlay';

function IntegratedGaitDetection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const camera = useCamera({ autoStart: true });
  const poseOverlay = usePoseOverlay({
    videoElement: videoRef.current,
    isActive: true
  });

  return (
    <div className="relative">
      <CameraView
        ref={videoRef}
        camera={camera}
        analysisActive={poseOverlay.isDetecting}
        onAnalysisToggle={(active) => {
          if (active) poseOverlay.startDetection();
          else poseOverlay.stopDetection();
        }}
      />
      
      <canvas ref={canvasRef} className="absolute inset-0" />
      
      <PoseOverlay
        canvasRef={canvasRef}
        videoRef={videoRef}
        poses={poseOverlay.poses}
        settings={poseOverlay.settings}
        isActive={poseOverlay.isDetecting}
        showDebugInfo={true}
      />
    </div>
  );
}
```

### Custom Styling

```tsx
const customStyle = {
  keypoint: {
    radius: 8,
    strokeWidth: 3,
    glowRadius: 12
  },
  connection: {
    width: 4,
    shadowBlur: 6
  },
  confidence: {
    barWidth: 40,
    barHeight: 6,
    offset: 25
  }
};

<PoseOverlay
  // ... other props
  styleOverrides={customStyle}
/>
```

## Testing

Comprehensive test suite included:

```bash
# Run pose overlay tests
npm test PoseOverlay.test.tsx

# Run all component tests
npm test
```

Test coverage includes:
- Rendering without errors
- Canvas drawing operations
- User interactions
- Performance mode handling
- Error states
- Cleanup on unmount

## Troubleshooting

### Common Issues

1. **Canvas not rendering**
   - Ensure canvas ref is properly attached
   - Check that poses array is not empty
   - Verify isActive is true

2. **Poor performance**
   - Use 'battery' performance mode
   - Reduce skeleton opacity
   - Disable confidence indicators

3. **Jittery visualization**
   - Increase smoothing buffer size
   - Use 'balanced' or 'high' performance mode
   - Check pose detection confidence thresholds

### Debug Information

Enable debug mode to see real-time metrics:

```tsx
<PoseOverlay
  showDebugInfo={true}
  onPerformanceUpdate={(metrics) => {
    console.log('Performance:', metrics);
  }}
  // ... other props
/>
```

## Browser Compatibility

- **Chrome**: Full support
- **Firefox**: Full support  
- **Safari**: Supported (may have performance differences)
- **Edge**: Full support

Requires:
- Canvas 2D API support
- RequestAnimationFrame support
- ES6+ features

## Future Enhancements

- [ ] WebGL-based rendering for better performance
- [ ] 3D pose visualization
- [ ] Trajectory trail rendering
- [ ] Export capabilities (video, images)
- [ ] Real-time pose comparison overlays
- [ ] Custom keypoint labeling
- [ ] Gesture recognition integration

## Contributing

When contributing to the PoseOverlay component:

1. Maintain 30+ FPS performance
2. Follow existing TypeScript patterns
3. Add comprehensive tests
4. Update documentation
5. Consider accessibility features

## License

Part of the rhobot-cluster-configuration project. See main project license.