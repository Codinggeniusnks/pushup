import { describe,it,expect } from 'vitest';
import { createCounter } from '../src/lib/exercise-counter';
import { PushupCounter as Baseline } from '../src/lib/pose-v3.1';
import { metricsFromLandmarks, type PoseMetrics, type Landmark } from '../src/lib/tracking';
import { MODEL_ID, poseEmbedding, PoseClassifier, ClassificationFilter, validateReferenceSet, type ReferenceSet } from '../src/lib/pose-classifier';
import { type ExerciseMode } from '../src/lib/modes';
const base:PoseMetrics={elbow:175,hip:175,knee:90,kneeSupported:true,horizontal:true,visible:true,single:true,torsoLift:0,supportY:.7,footX:.8,footY:.7};
function rig(mode:ExerciseMode){const counter=createCounter(mode);let time=0;return {counter,hold:(patch:Partial<PoseMetrics>,n=16)=>{for(let i=0;i<n;i++)counter.update({...base,...patch},time+=50);}};}
describe('four-mode synthetic geometry regressions (not camera accuracy evidence)',()=>{
 it.each(['standard','knee','crunch','situp'] as ExerciseMode[])('counts ten witnessed cycles in %s',mode=>{const r=rig(mode);for(let i=0;i<10;i++){if(mode==='standard'||mode==='knee'){const knee=mode==='standard'?175:90;r.hold({knee});r.hold({elbow:80,knee});r.hold({knee});}else{r.hold({});r.hold({torsoLift:mode==='crunch'?30:75});r.hold({});}}expect(r.counter.accepted).toBe(10);});
 it('does not accept standard form in knee mode or knee form in standard mode',()=>{for(const mode of ['standard','knee'] as const){const r=rig(mode);const knee=mode==='knee'?175:90;r.hold({knee});r.hold({knee,elbow:80});r.hold({knee});expect(r.counter.accepted).toBe(0);}});
 it('requires supported knees',()=>{const r=rig('knee');r.hold({kneeSupported:false});r.hold({elbow:80,kneeSupported:false});r.hold({kneeSupported:false});expect(r.counter.accepted).toBe(0);});
 it.each([['crunch',75],['situp',30],['crunch',12],['situp',45]] as const)('rejects wrong or shallow %s lift %s', (mode,torsoLift)=>{const r=rig(mode);r.hold({});r.hold({torsoLift});r.hold({});expect(r.counter.accepted).toBe(0);});
 it('rejects moving hips and incomplete returns',()=>{const r=rig('situp');r.hold({});r.hold({torsoLift:75,supportY:.5});r.hold({});expect(r.counter.accepted).toBe(0);const p=rig('crunch');p.hold({});p.hold({torsoLift:30});p.hold({torsoLift:18});expect(p.counter.accepted).toBe(0);});
 it.each(['crunch','situp'] as const)('does not invent an unseen lift, %s',mode=>{const r=rig(mode);r.hold({});r.hold({torsoLift:75,visible:false},3);r.hold({});expect(r.counter.accepted).toBe(0);});
 it('preserves witnessed lift briefly, resets after longer loss or identity change',()=>{for(const n of [3,12]){const r=rig('crunch');r.hold({});r.hold({torsoLift:30});r.hold({visible:false},n);r.hold({});expect(r.counter.accepted).toBe(n===3?1:0);}const r=rig('situp');r.hold({trackId:1});r.hold({trackId:1,torsoLift:75});r.hold({trackId:2});expect(r.counter.accepted).toBe(0);});
 it('matches v3.1 for standard continuous cycles',()=>{const old=new Baseline(),current=createCounter('standard');let t=0;for(let n=0;n<10;n++)for(const elbow of [...Array(14).fill(175),170,162,153,142,131,120,109,98,88,96,107,118,130,143,155,166,174,176,176]){const m={...base,elbow,knee:175};t+=50;expect(current.update(m,t)).toEqual(old.update(m,t));}});
 it('abdominal tracking does not require occluded wrists',()=>{const p=Array.from({length:33},()=>({x:.5,y:.5,visibility:.9}));for(const [i,x,y]of [[11,.2,.65],[23,.5,.65],[25,.65,.4],[27,.8,.65],[12,.21,.65],[24,.51,.65],[26,.66,.4],[28,.81,.65]])p[i]={x,y,visibility:.9};p[15].visibility=0;p[16].visibility=0;expect(metricsFromLandmarks([p],1,undefined,'crunch').visible).toBe(true);expect(metricsFromLandmarks([p]).visible).toBe(false);});
});
function pose():Landmark[]{return Array.from({length:33},(_,i)=>({x:.1+(i%6)*.1,y:.1+Math.floor(i/6)*.1,z:i*.001,visibility:1}));}
describe('Google-style classifier and reference hygiene',()=>{
 const points=pose();const set:ReferenceSet={version:'test-synthetic',model:MODEL_ID,source:'Synthetic unit fixture, not real training data',license:'test only',rightsConfirmed:true,samples:[{mode:'standard',label:'start',person:'a',recording:'a1',split:'train',landmarks:points,worldLandmarks:points,aspect:1}]};
 it('normalizes translation and uniform body scale',()=>{const a=poseEmbedding(points),b=poseEmbedding(points.map(p=>({...p,x:p.x*2+1,y:p.y*2+3,z:p.z!*2})));a.forEach((v,i)=>expect(v).toBeCloseTo(b[i]));});
 it('supports mirrored poses and separate 3D embeddings',()=>{expect(new PoseClassifier(set).classify(points.map(p=>({...p,x:1-p.x})))['standard:start']).toBe(1);expect(poseEmbedding(points,1,'world-3d')).not.toEqual(poseEmbedding(points));});
 it('never trains on held-out evaluation poses',()=>{expect(new PoseClassifier({...set,samples:[{...set.samples[0],split:'evaluation'}]}).classify(points)).toEqual({});});
 it('rejects incompatible models, missing rights and split leakage',()=>{expect(()=>validateReferenceSet({...set,model:'MoveNet'})).toThrow();expect(()=>validateReferenceSet({...set,rightsConfirmed:false})).toThrow();expect(()=>validateReferenceSet({...set,samples:[...set.samples,{...set.samples[0],recording:'a2',split:'evaluation'}]})).toThrow(/leaks/);});
 it('uses different score entry/exit thresholds and clears stale classifications',()=>{const f=new ClassificationFilter();expect(f.update({'standard:end':.8},0).active).toContain('standard:end');expect(f.update({'standard:end':.6},100).active).toContain('standard:end');expect(f.update({},1000).active).toEqual([]);});
 it('classification alone never counts a static pose',()=>{const r=rig('standard');r.hold({knee:175,classification:{start:true,end:true,invalid:false}},100);expect(r.counter.accepted).toBe(0);});
});
