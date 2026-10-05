export const TRACKING_VERSION = '3.1.0';
export type Landmark = { x: number; y: number; z?: number; visibility?: number };
export type Side = 'left' | 'right';
export type Joint = 'shoulder' | 'elbow' | 'wrist' | 'hip' | 'knee' | 'ankle';
export type TrackingStatus = 'acquiring' | 'tracked' | 'uncertain' | 'lost' | 'multiple' | 'position';
export type TrackingChecks = { angle: boolean; arms: boolean; feet: boolean };
export type PoseMetrics = {
  elbow: number; hip: number; knee: number; horizontal: boolean; visible: boolean; single: boolean;
  side?: Side; reason?: string; shoulderAboveElbow?: number;
  tracking?: TrackingStatus; missingJoints?: Joint[]; checks?: TrackingChecks; setupReady?: boolean; trackId?: number;
};
const sides = { left: [11,13,15,23,25,27], right: [12,14,16,24,26,28] };
const names: Joint[] = ['shoulder','elbow','wrist','hip','knee','ankle'];
const bodyIds = [11,12,13,14,15,16,23,24,25,26,27,28];
const emptyChecks = (): TrackingChecks => ({ angle:false, arms:false, feet:false });
const visibility = (p: Landmark[], i: number) => Number.isFinite(p[i]?.visibility) ? p[i].visibility! : 0;
const finite = (p?: Landmark): p is Landmark => !!p && Number.isFinite(p.x) && Number.isFinite(p.y);
const inFrame = (p?: Landmark) => finite(p) && p.x>=-.015 && p.x<=1.015 && p.y>=-.015 && p.y<=1.015;
const distance = (a: Landmark,b: Landmark,aspect: number) => Math.hypot((a.x-b.x)*aspect,a.y-b.y);
function score(p: Landmark[], side: Side) { const ids=sides[side]; return .65*Math.min(...ids.slice(0,3).map(i=>visibility(p,i)))+.35*ids.slice(3).reduce((sum,i)=>sum+visibility(p,i),0)/3; }
function scale(p: Landmark[], aspect: number) {
  const reliable=(i:number)=>finite(p[i])&&visibility(p,i)>=.35;
  return Math.max(.15,...Object.values(sides).map(ids=>reliable(ids[0])&&reliable(ids[5])?distance(p[ids[0]],p[ids[5]],aspect):reliable(ids[0])&&reliable(ids[3])?distance(p[ids[0]],p[ids[3]],aspect)*2:0));
}
export function angle(a: Landmark,b: Landmark,c: Landmark) {
  const u=[a.x-b.x,a.y-b.y],v=[c.x-b.x,c.y-b.y],norm=Math.hypot(...u)*Math.hypot(...v);
  if(norm<.000001)return 0;
  return Math.acos(Math.max(-1,Math.min(1,(u[0]*v[0]+u[1]*v[1])/norm)))*180/Math.PI;
}
/** Compare corresponding geometry, not bounding boxes: overlapping people remain distinct. */
export function distinctPoses(poses: Landmark[][],aspect=1): Landmark[][] {
  const usable=poses.filter(p=>p.length>=33&&((visibility(p,11)>=.5&&visibility(p,23)>=.5)||(visibility(p,12)>=.5&&visibility(p,24)>=.5)));
  const quality=(p:Landmark[])=>Math.max(score(p,'left'),score(p,'right'));
  const kept: Landmark[][]=[];
  for(const p of [...usable].sort((a,b)=>quality(b)-quality(a))){
    const duplicate=kept.some(q=>{
      const ids=bodyIds.filter(i=>finite(p[i])&&finite(q[i])&&visibility(p,i)>=.5&&visibility(q,i)>=.5);
      const length=Math.min(scale(p,aspect),scale(q,aspect));
      const errors=ids.map(i=>distance(p[i],q[i],aspect)/length).sort((a,b)=>a-b);
      const torso=ids.filter(i=>[11,12,23,24].includes(i));
      return ids.length>=6&&torso.length>=2&&torso.every(i=>distance(p[i],q[i],aspect)<length*.08)
        &&errors[Math.floor(errors.length/2)]<.06&&errors.filter(e=>e<.12).length>=Math.ceil(ids.length*.8);
    });
    if(!duplicate)kept.push(p);
  }
  return kept;
}
function invalid(reason='Move fully into view — place the phone beside you'):PoseMetrics {
  return {elbow:0,hip:0,knee:0,horizontal:false,visible:false,single:true,reason,missingJoints:[],checks:emptyChecks(),setupReady:false};
}
function measure(p:Landmark[],aspect:number,preferredSide?:Side):PoseMetrics {
  const side=preferredSide??(score(p,'left')>=score(p,'right')?'left':'right'),ids=sides[side];
  const missing=ids.flatMap((id,i)=>!inFrame(p[id])||visibility(p,id)<(i<3?.5:.35)?[names[i]]:[]);
  const checks:TrackingChecks={angle:false,arms:!missing.some(n=>['shoulder','elbow','wrist'].includes(n)),feet:!missing.some(n=>['knee','ankle'].includes(n))};
  // Diagnose viewpoint independently of occluded wrists/feet; a front view must not be called an extra person.
  const shoulder= p[ids[0]], ankle=p[ids[5]], wrist=p[ids[2]];
  if(finite(shoulder)&&finite(ankle)){
    const length=distance(shoulder,ankle,aspect),dx=Math.abs(shoulder.x-ankle.x)*aspect;
    const shouldersReliable=visibility(p,11)>=.5&&visibility(p,12)>=.5&&finite(p[11])&&finite(p[12]);
    const shoulderWidth=shouldersReliable?distance(p[11],p[12],aspect):0;
    checks.angle=dx>.20&&Math.abs(shoulder.y-ankle.y)<dx*.85&&shoulderWidth<length*.45;
  }
  let reason:string|undefined;
  if(!checks.angle)reason='Turn the camera beside you — a front view cannot judge push-up depth';
  else if(missing.includes('ankle'))reason=!inFrame(ankle)?'Move back so your feet fit':'Your feet are hidden — keep them visible';
  else if(missing.includes('wrist'))reason=!inFrame(wrist)?'Move back so your hands fit':'Your wrist is hidden — show the arm nearest the camera';
  else if(missing.length)reason=`Your ${missing[0]} is hidden — adjust the camera or lighting`;
  else if(score(p,side)<.55)reason='Tracking is weak — improve lighting and hold still briefly';
  if(missing.length||score(p,side)<.55)return {...invalid(reason),side,missingJoints:missing,checks};
  const [s,e,w,h,k,a]=ids.map(i=>({...p[i],x:p[i].x*aspect}));
  return {elbow:angle(s,e,w),hip:angle(s,h,k),knee:angle(h,k,a),horizontal:checks.angle&&w.y>s.y,visible:true,single:true,side,reason,missingJoints:[],checks,
    shoulderAboveElbow:(e.y-s.y)/Math.max(.001,distance(e,s,1))};
}
export function metricsFromLandmarks(poses:Landmark[][],aspect=1,preferredSide?:Side):PoseMetrics {
  if(!Number.isFinite(aspect)||aspect<=0)return invalid();
  const p=distinctPoses(poses,aspect);
  if(p.length>1)return {...invalid('Only one person in frame'),single:false};
  return p.length?measure(p[0],aspect,preferredSide):invalid();
}
/** Geometric continuity, not biometric recognition; never carries a cycle to a new track. */
function matchDistance(p:Landmark[],q:Landmark[],aspect:number) {
  const ids=[11,12,23,24,27,28].filter(i=>finite(p[i])&&finite(q[i])&&visibility(p,i)>=.35&&visibility(q,i)>=.35);
  if(ids.length<2)return Infinity;
  return ids.reduce((sum,i)=>sum+distance(p[i],q[i],aspect),0)/ids.length/scale(q,aspect);
}
export class PoseTracker {
  private side?:Side; private candidate?:Side; private candidateSince=0;
  private primary?:Landmark[]; private secondary?:Landmark[]; private secondSince:number|null=null;
  private lastSeen=-1; private lastTime=-1; private id=0; private stableSince:number|null=null;
  private previous:PoseMetrics=invalid();
  get activePose(){return this.primary;}
  update(poses:Landmark[][],aspect=1,time=performance.now()):PoseMetrics {
    if(!Number.isFinite(time)||time<=this.lastTime)return {...this.previous,visible:false,setupReady:false,tracking:'uncertain',reason:'Waiting for a fresh camera frame'};
    const gap=this.lastTime<0?0:time-this.lastTime;this.lastTime=time;
    if(gap>350)this.stableSince=null;
    if(gap>900){this.primary=undefined;this.side=undefined;this.secondSince=null;}
    const finish=(m:PoseMetrics)=>{this.previous={...m,trackId:this.id};return this.previous;};
    if(!Number.isFinite(aspect)||aspect<=0)return finish({...invalid(),tracking:'lost'});
    const p=distinctPoses(poses,aspect);
    if(!p.length){
      this.stableSince=null;this.secondSince=null;this.secondary=undefined;
      return finish({...invalid(poses.length?'Tracking is weak — improve lighting and show your shoulder and hip':undefined),tracking:this.lastSeen>=0&&time-this.lastSeen<=350?'uncertain':'lost'});
    }
    const ordered=this.primary?[...p].sort((a,b)=>matchDistance(a,this.primary!,aspect)-matchDistance(b,this.primary!,aspect)):p;
    if(ordered.length>1){
      this.stableSince=null;
      const second=ordered[1];
      if(this.secondSince===null||gap>350||!this.secondary||matchDistance(second,this.secondary,aspect)>.35)this.secondSince=time;
      this.secondary=second;
      const confirmed=time-this.secondSince>=500;
      return finish({...invalid(confirmed?'Only one person in frame — check for mirrors or screens':'Checking tracking — hold your position'),single:!confirmed,tracking:confirmed?'multiple':'uncertain'});
    }
    this.secondSince=null;this.secondary=undefined;
    const chosen=ordered[0];
    if(!this.primary||time-this.lastSeen>1200||matchDistance(chosen,this.primary,aspect)>.35){
      this.id++;this.side=undefined;this.candidate=undefined;this.stableSince=null;
    }
    this.primary=chosen;this.lastSeen=time;
    const best=score(chosen,'left')>=score(chosen,'right')?'left':'right';
    if(!this.side)this.side=best;
    if(best!==this.side&&(score(chosen,best)>score(chosen,this.side)+.18||!measure(chosen,aspect,this.side).visible)){
      if(this.candidate!==best){this.candidate=best;this.candidateSince=time;}
      if(time-this.candidateSince>=200){this.side=best;this.candidate=undefined;this.stableSince=null;}
    }else this.candidate=undefined;
    const m=measure(chosen,aspect,this.side);
    if(!m.visible||!m.horizontal){this.stableSince=null;return finish({...m,tracking:m.checks?.angle?'uncertain':'position',setupReady:false});}
    this.stableSince??=time;
    const ready=time-this.stableSince>=500;
    return finish({...m,tracking:ready?'tracked':'acquiring',setupReady:ready,reason:ready?'Position ready. Tap Start counting, then hold straight arms.':'Hold your position while the camera settles'});
  }
}
