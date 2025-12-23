# Boxing Pose (MVP)

This folder contains minimal scaffolding for the boxing punch analysis feature.

Files:
- `PunchAnalysisService.ts` — lightweight service that ingests pose frames and emits punch events (MVP heuristics).
- `PunchFeedbackOverlay.tsx` — small React overlay to render last punch and highlight the wrist.
- `PunchMetricsPanel.tsx` — simple panel showing last punch metrics.
- `index.ts` — re-exports the module API.

Notes:
- Thresholds (velocity, confidence) are conservative defaults and must be tuned per camera.
- Integration: call `pushFrame({timestamp, keypoints})` as you receive pose frames and subscribe with `onPunch`.
