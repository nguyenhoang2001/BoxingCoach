// /Users/minhhoang/Documents/projects/BoxingCoach/src/components/boxing-pose/PunchStatMeasure.ts

import { Landmark, LandmarkMap, PunchSide } from './interfaces';
import { PunchStat } from './PunchStat';
import { toMap, dist, angleBetween } from './utils';

/**
 * PunchStatMeasure
 *
 * Usage:
 *   const m = new PunchStatMeasure();
 *   const stat = m.getPunchStat(landmarks, timestampMs);
 *
 * The method accepts either:
 *   - an array of Landmark objects with .name properties (e.g. 'left_wrist'),
 *   - or an object map keyed by those names.
 *
 * Expected landmark names (common): left_wrist, right_wrist, left_elbow, right_elbow, left_shoulder, right_shoulder
 */
export default class PunchStatMeasure {
    private prev: {
        leftWrist?: Landmark;
        rightWrist?: Landmark;
        timestamp?: number;
    } = {};

    // threshold in normalized x-space to choose side when ambiguous
    private sideXThreshold = 0.02;

    constructor() {}

    getPunchStat(landmarksInput: Landmark[] | LandmarkMap, timestamp = Date.now()): PunchStat {
        const lm = toMap(landmarksInput);

        const leftWrist = lm['left_wrist'];
        const rightWrist = lm['right_wrist'];
        const leftElbow = lm['left_elbow'];
        const rightElbow = lm['right_elbow'];
        const leftShoulder = lm['left_shoulder'];
        const rightShoulder = lm['right_shoulder'];
        const leftHip = lm['left_hip'];
        const rightHip = lm['right_hip'];
        const nose = lm['nose'];

        const timestampMs = timestamp;

        // fallback: if missing keypoints return default stat
        if (!leftWrist && !rightWrist) {
            return {
                leadHand: true,
                velocity: 0,
                leftShoulderAngle: 0,
                headAngle: 90,
                rightShoulderAngle: 0,
                hipRotation: 0,
                rightElbowAngle: 0,
                leftElbowAngle: 0,
            };
        }

        // determine side: pick the wrist that is more extended forward (x distance from shoulder)
        // We assume image coordinates where smaller x is left of image; user's forward extension may vary
        // We'll compare absolute x-distance between wrist and same-side shoulder.
        let chosenSide: PunchSide = 'unknown';
        let chosenWrist: Landmark | undefined;
        let chosenElbow: Landmark | undefined;
        let chosenShoulder: Landmark | undefined;

        const leftDeltaX = leftWrist && leftShoulder ? Math.abs(leftWrist.x - leftShoulder.x) : -1;
        const rightDeltaX = rightWrist && rightShoulder ? Math.abs(rightWrist.x - rightShoulder.x) : -1;

        if (leftDeltaX >= 0 && rightDeltaX >= 0) {
            if (leftDeltaX > rightDeltaX + this.sideXThreshold) {
                chosenSide = 'left';
            } else if (rightDeltaX > leftDeltaX + this.sideXThreshold) {
                chosenSide = 'right';
            } else {
                // similar extension: pick the one with higher overall confidence or larger extensionNormalized later
                const lConf = ((leftWrist?.score ?? 0) + (leftShoulder?.score ?? 0)) / 2;
                const rConf = ((rightWrist?.score ?? 0) + (rightShoulder?.score ?? 0)) / 2;
                chosenSide = lConf >= rConf ? 'left' : 'right';
            }
        } else if (leftDeltaX >= 0) {
            chosenSide = 'left';
        } else if (rightDeltaX >= 0) {
            chosenSide = 'right';
        }

        if (chosenSide === 'left') {
            chosenWrist = leftWrist;
            chosenElbow = leftElbow;
            chosenShoulder = leftShoulder;
        } else if (chosenSide === 'right') {
            chosenWrist = rightWrist;
            chosenElbow = rightElbow;
            chosenShoulder = rightShoulder;
        } else {
            // fallback: pick whichever wrist exists
            if (leftWrist) {
                chosenSide = 'left';
                chosenWrist = leftWrist;
                chosenElbow = leftElbow;
                chosenShoulder = leftShoulder;
            } else {
                chosenSide = 'right';
                chosenWrist = rightWrist!;
                chosenElbow = rightElbow;
                chosenShoulder = rightShoulder;
            }
        }

        // compute speed using previous stored wrist position for that side
        let speed = 0;
        const prev = this.prev;
        const dt = prev.timestamp ? Math.max(1, timestampMs - prev.timestamp) / 1000 : 0; // seconds

        if (dt > 0) {
            const prevWrist = chosenSide === 'left' ? prev.leftWrist : prev.rightWrist;
            if (prevWrist && chosenWrist) {
                const d = dist(chosenWrist, prevWrist);
                speed = d / dt;
            }
        }

        // update prev buffer for side-specific wrists and timestamp
        if (chosenSide === 'left' && leftWrist) prev.leftWrist = leftWrist;
        if (chosenSide === 'right' && rightWrist) prev.rightWrist = rightWrist;
        prev.timestamp = timestampMs;

        // Calculate shoulder angles
        const leftShoulderAngle = leftShoulder && leftElbow && leftHip 
            ? angleBetween(leftElbow, leftShoulder, leftHip)
            : 0;
        
        const rightShoulderAngle = rightShoulder && rightElbow && rightHip
            ? angleBetween(rightElbow, rightShoulder, rightHip)
            : 0;

        // Calculate elbow angles
        const leftElbowAngle = leftWrist && leftElbow && leftShoulder
            ? angleBetween(leftWrist, leftElbow, leftShoulder)
            : 0;
        
        const rightElbowAngle = rightWrist && rightElbow && rightShoulder
            ? angleBetween(rightWrist, rightElbow, rightShoulder)
            : 0;

        // Calculate head angle using angle at nose between left shoulder and right shoulder
        let headAngle = 90; // default neutral
        if (nose && leftShoulder && rightShoulder) {
            // Calculate angle at nose (vertex) between left shoulder and right shoulder
            headAngle = angleBetween(nose, rightShoulder, leftShoulder);
        }

        // Calculate hip rotation (angle between hip line and shoulder line)
        let hipRotation = 0;
        if (leftHip && rightHip && leftShoulder && rightShoulder) {
            const hipDx = rightHip.x - leftHip.x;
            const hipDy = rightHip.y - leftHip.y;
            const shoulderDx = rightShoulder.x - leftShoulder.x;
            const shoulderDy = rightShoulder.y - leftShoulder.y;
            
            const hipAngle = Math.atan2(hipDy, hipDx);
            const shoulderAngle = Math.atan2(shoulderDy, shoulderDx);
            hipRotation = Math.abs((shoulderAngle - hipAngle) * 180 / Math.PI);
            
            // Normalize to 0-180 range
            if (hipRotation > 180) hipRotation = 360 - hipRotation;
        }

        const stat: PunchStat = {
            leadHand: chosenSide === 'left',
            velocity: speed,
            leftShoulderAngle,
            headAngle,
            rightShoulderAngle,
            hipRotation,
            rightElbowAngle,
            leftElbowAngle,
        };

        return stat;
    }
}