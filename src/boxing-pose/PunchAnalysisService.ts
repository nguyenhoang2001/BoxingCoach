// Minimal PunchAnalysisService - MVP heuristics and eventing
export type Keypoint = { name: string; x: number; y: number; confidence: number };
export type PoseFrame = { timestamp: number; keypoints: Keypoint[] };

export type PunchType = 'jab' | 'cross' | 'hook' | 'uppercut' | 'unknown';

export type PunchEvent = {
  id: string;
  hand: 'left' | 'right';
  type: PunchType;
  timestamp: number;
  score: number;
  tips?: string[];
};

export class PunchAnalysisService {
  private buffer: PoseFrame[] = [];
  private maxBufferMs = 500;
  private minVelocity = 600;
  private minConfidence = 0.4;
  private listeners: ((e: PunchEvent) => void)[] = [];
  private lastPunchTime = 0;

  public pushFrame(frame: PoseFrame) {
    this.buffer.push(frame);
    const cutoff = frame.timestamp - this.maxBufferMs;
    while (this.buffer.length && this.buffer[0].timestamp < cutoff) this.buffer.shift();
    this.tryDetect();
  }

  public onPunch(cb: (e: PunchEvent) => void) {
    this.listeners.push(cb);
    return () => { this.listeners = this.listeners.filter(x => x !== cb); };
  }

  private emit(e: PunchEvent) { this.listeners.forEach(cb => cb(e)); }

  private getKeypoint(frame: PoseFrame, name: string) {
    return frame.keypoints.find(k => k.name === name && k.confidence >= this.minConfidence) || null;
  }

  private velocityBetween(a: {x:number,y:number}, b: {x:number,y:number}, dtMs: number) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const dt = Math.max(1, dtMs) / 1000;
    return { vx: dx / dt, vy: dy / dt, speed: Math.hypot(dx, dy) / dt };
  }

  private angleBetween(a: {x:number,y:number}, b: {x:number,y:number}, c: {x:number,y:number}) {
    // angle at b between ba and bc in degrees
    const v1x = a.x - b.x, v1y = a.y - b.y;
    const v2x = c.x - b.x, v2y = c.y - b.y;
    const dot = v1x * v2x + v1y * v2y;
    const mag1 = Math.hypot(v1x, v1y) || 1e-6;
    const mag2 = Math.hypot(v2x, v2y) || 1e-6;
    const cos = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
    const rad = Math.acos(cos);
    return rad * (180 / Math.PI);
  }

  private tryDetect() {
    if (this.buffer.length < 2) return;
    const newest = this.buffer[this.buffer.length - 1];
    const prev = this.buffer[this.buffer.length - 2];

    const now = newest.timestamp;
    if (now - this.lastPunchTime < 300) return; // debounce

    const lw = this.getKeypoint(newest, 'left_wrist');
    const rw = this.getKeypoint(newest, 'right_wrist');
    const lprev = this.getKeypoint(prev, 'left_wrist');
    const rprev = this.getKeypoint(prev, 'right_wrist');

    const leftElbow = this.getKeypoint(newest, 'left_elbow');
    const leftShoulder = this.getKeypoint(newest, 'left_shoulder');
    const rightShoulder = this.getKeypoint(newest, 'right_shoulder');
    const rightWrist = this.getKeypoint(newest, 'right_wrist');
    const rightElbow = this.getKeypoint(newest, 'right_elbow');

    if (lw && lprev && leftElbow && leftShoulder) {
      const v = this.velocityBetween({x: lprev.x, y: lprev.y}, {x: lw.x, y: lw.y}, newest.timestamp - prev.timestamp);
      const elbowAngle = this.angleBetween({x: lw.x, y: lw.y}, {x: leftElbow.x, y: leftElbow.y}, {x: leftShoulder.x, y: leftShoulder.y});
      const extensionPx = lw.x - leftShoulder.x;
      const extensionThreshold = 30;
      const tips: string[] = [];


      let guardUp = false;
      if (rightElbow && rightWrist && rightShoulder) {
        const guardAngle = this.angleBetween({ x: rightShoulder.x, y: rightShoulder.y }, { x: rightElbow.x, y: rightElbow.y }, { x: rightWrist.x, y: rightWrist.y });
        const tol = 12; 
        guardUp = Math.abs(guardAngle - 91) <= tol;
        if (guardUp && rightWrist.y > rightShoulder.y - 30) {
          guardUp = false;
        }
      }

      if (v.vx > this.minVelocity && elbowAngle > 160 && extensionPx > extensionThreshold) {
        if (!guardUp) tips.push('Keep right hand up to guard your face');
        const evt: PunchEvent = { id: String(now), hand: 'left', timestamp: now, type: 'jab', score: Math.min(1, v.vx / (this.minVelocity * 2)), tips };
        this.emit(evt);
        this.lastPunchTime = now;
      }
    }

    // Right-hand detection: detect jab similarly but treat right hand as guard when raised
    if (rw && rprev) {
      const v = this.velocityBetween({x: rprev.x, y: rprev.y}, {x: rw.x, y: rw.y}, newest.timestamp - prev.timestamp);
      const rightElbow = this.getKeypoint(newest, 'right_elbow');
      const rightShould = this.getKeypoint(newest, 'right_shoulder');
      const leftShould = this.getKeypoint(newest, 'left_shoulder');
      if (rightElbow && rightShould) {
        const elbowAngleR = this.angleBetween({x: rw.x, y: rw.y}, {x: rightElbow.x, y: rightElbow.y}, {x: rightShould.x, y: rightShould.y});
        const extensionPxR = rw.x - rightShould.x;
        const tipsR: string[] = [];
        // If left hand is not up (guard), suggest it. Use elbow angle at left elbow to decide.
        let oppositeGuard = false;
        const leftWrist = this.getKeypoint(newest, 'left_wrist');
        const leftElbowCur = this.getKeypoint(newest, 'left_elbow');
        if (leftElbowCur && leftWrist && leftShould) {
          const leftGuardAngle = this.angleBetween({ x: leftShould.x, y: leftShould.y }, { x: leftElbowCur.x, y: leftElbowCur.y }, { x: leftWrist.x, y: leftWrist.y });
          oppositeGuard = Math.abs(leftGuardAngle - 91) <= 12 && leftWrist.y < leftShould.y - 10;
        }

        if (v.vx > this.minVelocity && elbowAngleR > 160 && extensionPxR > 30) {
          if (!oppositeGuard) tipsR.push('Keep left hand up to guard');
          const evt: PunchEvent = { id: String(now), hand: 'right', timestamp: now, type: 'jab', score: Math.min(1, v.vx / (this.minVelocity * 2)), tips: tipsR };
          this.emit(evt);
          this.lastPunchTime = now;
        }
      }
    }
  }
}
