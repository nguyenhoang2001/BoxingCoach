# Video Encoding Guide

## The Issue

The video file `jab-video.mp4` is loading (metadata loads) but not displaying any frames. This is typically caused by:

- Incompatible video codec
- Unsupported audio codec
- Corrupted video frames
- Browser compatibility issue

## Solution: Re-encode the Video

If you have the original video file or can create a new one, you'll need to encode it properly.

### Using Online Tools (Easiest)

1. Visit: https://www.freeconvert.com/video-converter
2. Upload your jab-video.mp4 file
3. Select output format: MP4
4. Under advanced settings:
   - Video Codec: H.264 (libx264)
   - Audio Codec: AAC
   - Resolution: 1280x720 (or your original)
   - Frame Rate: 30 fps
5. Download and replace the file in `/public/tutorial-videos/jab-video.mp4`

### Using FFmpeg (If installed)

```bash
ffmpeg -i jab-video.mp4 -c:v libx264 -preset medium -crf 23 -c:a aac -b:a 128k jab-video-fixed.mp4
```

### Alternative: Use a Web-Safe Sample Video

If you want to test if the player works at all, use this sample video:

```
https://commondatastorage.googleapis.com/gtv-videos-library/sample/BigBuckBunny.mp4
```

Replace the URL in `src/pages/home/LessonView.tsx`:

```javascript
jab: {
  videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-library/sample/BigBuckBunny.mp4',
  // ...
}
```

## Recommended Video Specifications

- **Container**: MP4 (.mp4)
- **Video Codec**: H.264 (AVC)
- **Audio Codec**: AAC
- **Resolution**: 1920x1080 or 1280x720
- **Frame Rate**: 24-30 fps
- **Bitrate**: 2000-5000 kbps for video
- **Audio Bitrate**: 128 kbps

## Quick Test

To verify the video player works, temporarily replace the video URL with the sample video link above and refresh the page. If it plays, the issue is with your video file encoding.
