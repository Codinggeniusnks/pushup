import { PushupCounter, type CounterResult, type PoseMetrics } from './pose';
import type { ExerciseMode } from './modes';
/** Experimental 2D baseline-relative counters. Thresholds are not clinical definitions. */
export class AbdominalCounter {
 accepted=0; rejected=0;
 private phase='ready'; private last=-1; private good=-1; private stable:number|null=null;
 private track?:number;private side?:string;private baseline=0;private hip=0;private footX=0;private footY=0;
 private start=0;private peak=0;private crossed:number|null=null;private smooth:number|null=null;
 constructor(private mode:'crunch'|'situp'){}
 resetTracking(){this.phase='ready';this.stable=null;this.crossed=null;this.smooth=null;this.good=-1;this.track=undefined;this.side=undefined;}
 update(m:PoseMetrics,time:number):CounterResult{
  let counted=false;const result=(feedback:string)=>({accepted:this.accepted,rejected:this.rejected,phase:this.phase,counted,feedback});
  if(!Number.isFinite(time)||time<=this.last)return result('Hold a steady pace');
  const dt=this.last<0?50:time-this.last;this.last=time;
  if(dt>900||(this.good>=0&&time-this.good>350)||(this.track!==undefined&&m.trackId!==this.track)||(this.side&&m.side!==this.side))this.resetTracking();
  this.track=m.trackId;this.side=m.side;
  if(!m.single){this.resetTracking();return result('Only one person in frame');}
  if(!m.visible||!m.horizontal||![m.torsoLift,m.supportY,m.footX,m.footY,m.knee].every(Number.isFinite)){
   this.stable=null;this.crossed=null;return result(m.reason??'Move fully into view');
  }
  this.good=time;
  const raw=m.torsoLift!;this.smooth=this.smooth===null?raw:this.smooth+(raw-this.smooth)*(1-Math.exp(-dt/80));
  const lift=this.smooth;
  if(m.knee<35||m.knee>145){if(this.phase!=='ready')this.phase='invalid';return result('Bend your knees and keep your feet planted');}
  if(this.phase==='ready'){
   if(Math.abs(raw)>15){this.stable=null;return result('Lie back with shoulders resting to set your baseline');}
   this.stable??=time;
   if(time-this.stable>=500){this.baseline=lift;this.hip=m.supportY!;this.footX=m.footX!;this.footY=m.footY!;this.phase='top';this.stable=null;}
   return result(this.phase==='top'?'Ready. Lift with control':'Rest flat briefly until ready');
  }
  const delta=lift-this.baseline;
  const flat=Math.abs(delta)<=8&&(!m.classification||m.classification.start);
  this.stable=flat?(this.stable??time):null;
  const returned=this.stable!==null&&time-this.stable>=150;
  if(Math.abs(m.supportY!-this.hip)>.06||Math.hypot(m.footX!-this.footX,m.footY!-this.footY)>.08||m.classification?.invalid)this.phase='invalid';
  if(this.phase==='top'&&delta>12){this.phase='descending';this.start=time;this.peak=delta;this.crossed=null;}
  if(this.phase==='descending'||this.phase==='bottom'){
   this.peak=Math.max(this.peak,delta);
   if(this.mode==='crunch'&&delta>45)this.phase='invalid';
   else {
    const enough=delta>=(this.mode==='crunch'?20:60)&&(!m.classification||m.classification.end);
    this.crossed=enough?(this.crossed??time):null;
    if(this.crossed!==null&&time-this.crossed>=100)this.phase='bottom';
   }
  }
  if(returned&&['descending','bottom','invalid'].includes(this.phase)){
   counted=this.phase==='bottom'&&time-this.start>=600&&time-this.start<=15000;
   if(counted)this.accepted++;else this.rejected++;
   this.phase='top';this.crossed=null;
   return result(counted?'Good rep. Keep going!':'Rep not counted. Return to baseline and use the selected exercise');
  }
  return result(this.phase==='invalid'?'Rep not counted. Keep hips and feet still; return to baseline':this.phase==='bottom'?'Good lift. Lower with control':this.mode==='crunch'?'Lift your shoulders with control':'Lift your torso substantially upright');
 }
}
export const createCounter=(mode:ExerciseMode)=>mode==='standard'||mode==='knee'?new PushupCounter(mode):new AbdominalCounter(mode);
