# Reference collection and promotion

The four `v1/*.json` manifests are deliberately empty. No licensed, consented examples extracted with this app's pinned model have been acquired. They are gap records, not trained datasets. Unit-test landmark fixtures are synthetic and must never be used as accuracy evidence.

## Extract on-device

Open `/research`. Select a local, appropriately licensed clip, record usage rights, a pseudonymous person ID, a recording ID and a split. Use one short labelled phase for training/tuning; labels are `start`, `end`, `transition`, `wrong`, `invalid`. For `wrong`, include knee versus standard push-ups and crunch versus full sit-up explicitly. Download the reference JSON; no frames or files are uploaded. Use full sequences and human-annotated rep completion times for evaluation. Blank times mean no valid reps.

The research worker is the workout worker: MediaPipe Tasks Vision **0.10.32**, Full float16 model v1, SHA256 `5134a3aad27a58b93da0088d431f366da362b44e3ccfbe3462b3827a839011b1`. Both image and world landmarks, visibility/presence if provided by MediaPipe, source timestamps and processing times are exported. Exclude ambiguous multi-person frames from labelled samples, but retain them in evaluation sequences.

Combine reference sets only with consistent model, rights and provenance. Preserve source/licence records for every contributing recording (use a manifest as the top-level source reference). Every recording of one person must stay in one split. `validateReferenceSet` rejects person/recording overlap across splits. The classifier uses only `train` examples; tune entry/exit thresholds on `tune`; never tune from evaluation results. Google recommends varied people and approximately 100 samples per class; adjacent frames alone are not a diverse dataset.

## Evaluate before promotion

In the local lab choose `evaluation`, load a combined reference set and extract a separately recorded full sequence. Record every expected rep completion time in seconds. Download the comparison report for v3.1, current geometric candidate, classifier+2D and classifier+3D. v3.1 has no knee/crunch/sit-up support; its results on these modes are contextual only. Match accepted times within 1 second of annotations, not just final totals, so false counts cannot cancel missed reps. Timing combines the recorded worker time and replay analysis time; compare on the same physical phone. Tracking-interruption totals require human review to label false interruptions.

All four agreed 10-rep valid sequences must count exactly 10, invalid sequences must count zero, and standard regressions must pass. Record people, recording IDs, device, browser version, orientation, camera, lighting, ground truth and per-mode result. Test physical Android Chrome and iPhone Safari. No such real recordings or phone test results are included yet.

## Release gates and rollback

Keep `CLASSIFICATION_PROMOTED=false` until reference and physical tests pass. Populate `TRAINING_SET` only with approved examples and update the versioned manifests/status page with actual evidence. Estimated 3D remains comparison-only until it measurably improves held-out results. Both feature spaces use identical recorded sequences. Never switch models or detectors during a repetition.

New modes are server-stamped practice (`ranked=false`). After validation, enabling a mode in `exercise_configs` applies to **new sessions only**; do not rewrite historical practice sessions. Update the UI practice labels and detector/version together. Do not enable scoring just to populate an empty leaderboard.

`src/lib/pose-v3.1.ts` and `tracking-v3.1.ts` preserve the original standard detector for benchmark/rollback. The previous deployed release ID is in DEPLOYMENT.md. Roll back the app configuration without removing the additive migration; legacy APIs still refer to standard mode.
