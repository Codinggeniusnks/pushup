/// <reference lib="webworker" />
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import { PoseClassifier } from '../lib/pose-classifier';
import { TRAINING_SET } from '../lib/reference-config';
let landmarker:PoseLandmarker|null=null;
const classifier2d=TRAINING_SET.samples.length?new PoseClassifier(TRAINING_SET,'image-2d'):null;
const classifier3d=TRAINING_SET.samples.length?new PoseClassifier(TRAINING_SET,'world-3d'):null;
self.onmessage=async(event:MessageEvent)=>{
 const {type,frame,time,base}=event.data;
 try{
  if(type==='init'){
   const files=await FilesetResolver.forVisionTasks(`${base}/wasm`);
   const options={runningMode:'VIDEO' as const,numPoses:2,minPoseDetectionConfidence:.5,minPosePresenceConfidence:.5,minTrackingConfidence:.5};
   try{landmarker=await PoseLandmarker.createFromOptions(files,{...options,baseOptions:{modelAssetPath:`${base}/models/pose_landmarker_full.task`,delegate:'GPU'}});}
   catch{landmarker=await PoseLandmarker.createFromOptions(files,{...options,baseOptions:{modelAssetPath:`${base}/models/pose_landmarker_full.task`,delegate:'CPU'}});}
   self.postMessage({type:'ready'});
  }else if(type==='frame'&&landmarker){
   const started=performance.now();
   const result=landmarker.detectForVideo(frame,time);
   const scores2d=classifier2d?result.landmarks.map(p=>classifier2d.classify(p,frame.width/frame.height)):null;
   const scores3d=classifier3d?result.worldLandmarks.map(p=>classifier3d.classify(p)):null;
   self.postMessage({type:'pose',landmarks:result.landmarks,worldLandmarks:result.worldLandmarks,time,scores2d,scores3d,inferenceMs:performance.now()-started,model:'mediapipe-tasks-vision@0.10.32/full/float16/1'});
  }
 }catch(error){self.postMessage({type:'error',message:error instanceof Error?error.message:'Pose detection unavailable'});}
 finally{if(frame)frame.close();}
};
