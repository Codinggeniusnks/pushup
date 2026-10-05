# Third-party assets

- **MediaPipe Tasks Vision 0.10.32**: local WASM assets copied from the installed `@mediapipe/tasks-vision` npm package. Apache-2.0; see the package distribution for notices.
- **MediaPipe Pose Landmarker Lite**, float16, version 1: downloaded from `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`. See Google's [MediaPipe model documentation](https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker) for model details and applicable terms.
- **Lucide** interface icons: ISC license.
- **DM Sans and Manrope**: Google Fonts, SIL Open Font License. The UI has system-font fallbacks when the font service is unavailable.
- The athlete illustration and PushUp mark are original inline SVGs created for this app.

Video frames are processed locally. Google Fonts requests load fonts only and contain no workout imagery. The app's local model files avoid runtime requests to third-party model CDNs.

- **MediaPipe Pose Landmarker Full**, float16, version 1: the active camera model is downloaded from `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task`. The Lite asset remains in the source bundle but is no longer selected by the camera worker. Model documentation and terms are linked above.

## Google pose classification reference

src/lib/pose-classifier.ts adapts the normalization, pairwise embedding, mirrored two-stage k-NN distance comparison and hysteresis approach from Google ML Kit samples, Copyright 2020 Google LLC, Apache License 2.0. Changes include TypeScript, aspect-corrected 2D and separate world-3D features, normalized votes, timestamp-based smoothing, provenance/split validation and explicit movement-order gates.

Source: https://github.com/googlesamples/mlkit/tree/master/android/vision-quickstart/app/src/main/java/com/google/mlkit/vision/demo/java/posedetector/classification

Full licence retained at public/licenses/google-mlkit-Apache-2.0.txt. Inspected repository licence and Java source headers on 21 September 2026. No proprietary SDK code or sample exercise videos were copied. Google sample CSV landmarks were not imported: provenance under a different extraction pipeline does not establish compatibility with this app. No real training dataset is shipped.
