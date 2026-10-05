import { PushupCounter as BaselineCounter } from './pose-v3.1';
import { PoseTracker as BaselineTracker } from './tracking-v3.1';
import { PoseTracker, type Landmark } from './tracking';
import { createCounter } from './exercise-counter';
import { ClassificationFilter, PoseClassifier, validateReferenceSet, type ReferenceSet, type FeatureSpace } from './pose-classifier';
import type { ExerciseMode } from './modes';
export type ReferenceFrame={time:number;landmarks:Landmark[][];worldLandmarks:Landmark[][];inferenceMs:number};
export type Sequence={person:string;recording:string;mode:ExerciseMode;aspect:number;frames:ReferenceFrame[];expectedRepTimes:number[];validSequence:boolean};
export function benchmark(sequence:Sequence,set?:ReferenceSet){
 if(set){validateReferenceSet(set);if(set.samples.some(s=>s.split!=='evaluation'&&(s.person===sequence.person||s.recording===sequence.recording)))throw new Error('Evaluation person/recording appears in training or tuning');}
 const run=(space:FeatureSpace|'baseline'|'heuristic')=>{
  const tracker=space==='baseline'?new BaselineTracker():new PoseTracker(sequence.mode);
  const counter=space==='baseline'?new BaselineCounter():createCounter(sequence.mode);
  const classifier=set&&(space==='image-2d'||space==='world-3d')?new PoseClassifier(set,space):null;
  const filter=new ClassificationFilter();let previousTrack:number|undefined;let interruptions=0,wasLost=false;const accepted:number[]=[];const costs:number[]=[];
  for(const frame of sequence.frames){
   const began=performance.now();const m=tracker.update(frame.landmarks,sequence.aspect,frame.time);
   const lost=!m.visible||!m.single;if(lost&&!wasLost)interruptions++;wasLost=lost;
   if(lost||previousTrack!==m.trackId)filter.reset();previousTrack=m.trackId;
   if(classifier&&m.visible){
    const index=frame.landmarks.indexOf(tracker.activePose!);
    const points=space==='world-3d'?frame.worldLandmarks[index]:frame.landmarks[index];
    const output=filter.update(classifier.classify(points,sequence.aspect),frame.time);
    Object.assign(m,{classification:{start:output.active.includes(sequence.mode+':start'),end:output.active.includes(sequence.mode+':end'),invalid:output.active.some(l=>!l.startsWith(sequence.mode+':')||l.endsWith(':invalid')||l.endsWith(':wrong'))}});
   }
   if(counter.update(m,frame.time).counted)accepted.push(frame.time);
   costs.push(performance.now()-began+frame.inferenceMs);
  }
  const unmatched=[...sequence.expectedRepTimes];let falseCounts=0;
  for(const time of accepted){const index=unmatched.findIndex(t=>Math.abs(t-time)<=1000);if(index<0)falseCounts++;else unmatched.splice(index,1);}
  return {accepted:accepted.length,missedReps:unmatched.length,falseCounts,trackingInterruptions:interruptions,meanProcessingMs:costs.reduce((a,b)=>a+b,0)/Math.max(1,costs.length),exact:unmatched.length===0&&falseCounts===0,interruptionMetric:'All tracking interruptions; review annotated visible intervals to determine false interruptions.'};
 };
 return {mode:sequence.mode,baseline:run('baseline'),candidate2d:run('heuristic'),classified2d:set?run('image-2d'):null,classified3d:set?run('world-3d'):null,note:'v3.1 baseline supports standard push-ups only. Timing includes recorded device inference time plus replay processing. This is not physical-phone validation.'};
}
