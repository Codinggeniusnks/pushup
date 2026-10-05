/* Copyright 2020 Google LLC. Licensed under Apache-2.0.
 * TypeScript adaptation of ML Kit PoseEmbedding/PoseClassifier; modified for
 * MediaPipe image/world coordinates, provenance checks and timestamp smoothing.
 * See public/licenses/google-mlkit-Apache-2.0.txt and THIRD_PARTY.md.
 */
import type { Landmark } from './tracking';
import { EXERCISE_MODES, type ExerciseMode } from './modes';
export const MODEL_ID='mediapipe-tasks-vision@0.10.32/full/float16/1';
export type FeatureSpace='image-2d'|'world-3d';
export type PoseLabel='start'|'end'|'transition'|'wrong'|'invalid';
export type ReferenceSample={person:string;recording:string;split:'train'|'tune'|'evaluation';mode:ExerciseMode;label:PoseLabel;landmarks:Landmark[];worldLandmarks:Landmark[];aspect:number};
export type ReferenceSet={version:string;model:string;source:string;license:string;rightsConfirmed:boolean;samples:ReferenceSample[]};
type V=[number,number,number];
const pairs=[[11,13],[12,14],[13,15],[14,16],[23,25],[24,26],[25,27],[26,28],[11,15],[12,16],[23,27],[24,28],[23,15],[24,16],[11,27],[12,28],[23,15],[24,16],[13,14],[25,26],[15,16],[27,28]];
const sub=(a:V,b:V):V=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const mean=(a:V,b:V):V=>[(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2];
export function poseEmbedding(points:Landmark[],aspect=1,space:FeatureSpace='image-2d',mirror=false):number[]{
 if(points.length!==33||!Number.isFinite(aspect)||aspect<=0||points.some(p=>![p.x,p.y,...(space==='world-3d'?[p.z]:[])].every(Number.isFinite)))throw new Error('Invalid landmark geometry');
 const p:V[]=points.map(v=>[v.x*(space==='image-2d'?aspect:1)*(mirror?-1:1),v.y,space==='world-3d'?v.z!:0]);
 const center=mean(p[23],p[24]);const torso=sub(mean(p[11],p[12]),center);
 const scale=Math.max(Math.hypot(torso[0],torso[1])*2.5,...p.map(v=>Math.hypot(v[0]-center[0],v[1]-center[1])));
 if(scale<1e-6)throw new Error('Degenerate pose');
 const normalized=p.map(v=>sub(v,center).map(n=>n*100/scale) as V);
 return [sub(mean(normalized[23],normalized[24]),mean(normalized[11],normalized[12])),...pairs.map(([a,b])=>sub(normalized[a],normalized[b]))].flat();
}
export function validateReferenceSet(set:ReferenceSet){
 if(set.model!==MODEL_ID||!set.version||!set.source||!set.license||set.rightsConfirmed!==true)throw new Error('Reference provenance or model mismatch');
 const people=new Map<string,string>(),recordings=new Map<string,string>();
 for(const s of set.samples){
  if(!EXERCISE_MODES.includes(s.mode)||!['start','end','transition','wrong','invalid'].includes(s.label)||!['train','tune','evaluation'].includes(s.split)||!s.person||!s.recording)throw new Error('Invalid reference label');
  if((people.has(s.person)&&people.get(s.person)!==s.split)||(recordings.has(s.recording)&&recordings.get(s.recording)!==s.split))throw new Error('Person or recording leaks across splits');
  people.set(s.person,s.split);recordings.set(s.recording,s.split);
  poseEmbedding(s.landmarks,s.aspect);poseEmbedding(s.worldLandmarks,1,'world-3d');
 }
}
export class PoseClassifier {
 private samples:{label:string;features:number[]}[];
 constructor(set:ReferenceSet,private space:FeatureSpace='image-2d'){
  validateReferenceSet(set);
  this.samples=set.samples.filter(s=>s.split==='train').map(s=>({label:`${s.mode}:${s.label}`,features:poseEmbedding(space==='image-2d'?s.landmarks:s.worldLandmarks,s.aspect,space)}));
 }
 classify(points:Landmark[],aspect=1):Record<string,number>{
  if(!this.samples.length)return {};
  const a=poseEmbedding(points,aspect,this.space),b=poseEmbedding(points,aspect,this.space,true);
  const distances=(features:number[],query:number[])=>features.map((v,i)=>Math.abs(v-query[i])*(i%3===2?.2:1));
  const candidates=this.samples.map(s=>{const d=distances(s.features,a),mirror=distances(s.features,b);return {...s,max:Math.min(Math.max(...d),Math.max(...mirror)),mean:Math.min(d.reduce((a,b)=>a+b,0),mirror.reduce((a,b)=>a+b,0))/d.length};}).sort((a,b)=>a.max-b.max).slice(0,30).sort((a,b)=>a.mean-b.mean).slice(0,10);
  const scores:Record<string,number>={};for(const c of candidates)scores[c.label]=(scores[c.label]??0)+1/candidates.length;
  return scores;
 }
}
/** Scores do not count reps. The exercise state machine must witness a full cycle. */
export class ClassificationFilter {
 private values:Record<string,number>={};private active=new Set<string>();private last=-1;
 reset(){this.values={};this.active.clear();this.last=-1;}
 update(scores:Record<string,number>,time:number){
  if(!Number.isFinite(time)||time<=this.last)return {scores:{...this.values},active:[...this.active]};
  if(this.last>=0&&time-this.last>350)this.reset();
  const alpha=this.last<0?1:1-Math.exp(-(time-this.last)/150);this.last=time;
  for(const label of new Set([...Object.keys(this.values),...Object.keys(scores)])){
   this.values[label]=(this.values[label]??0)+((scores[label]??0)-(this.values[label]??0))*alpha;
   if(this.values[label]>=.75)this.active.add(label);else if(this.values[label]<=.45)this.active.delete(label);
  }
  return {scores:{...this.values},active:[...this.active]};
 }
}
