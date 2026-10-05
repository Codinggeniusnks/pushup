import type { CounterResult } from './pose';
export type Cue = { text:string; urgent:boolean };
/** Speak transitions, not every frame. Counting itself remains entirely in the detector. */
export class CoachingCues {
  private phase='ready';private accepted=0;private rejected=0;
  private warning='';private warningSince=0;private lastWarning=-Infinity;
  update(result:CounterResult,time:number):Cue|null {
    const previous=this.phase;this.phase=result.phase;
    if(result.counted&&result.accepted>this.accepted){this.accepted=result.accepted;this.rejected=result.rejected;return {text:String(result.accepted),urgent:true};}
    this.accepted=result.accepted;
    if(result.rejected>this.rejected){this.rejected=result.rejected;return {text:result.feedback.includes('Lower further')?'Not counted. Lower further.':result.feedback.includes('baseline')?'Not counted. Return to your lying baseline.':'Rep not counted. Reset at the top.',urgent:true};}
    if(result.phase==='bottom'&&previous!=='bottom')return {text:result.feedback.includes('Good lift')?'Lower with control.':'Push up.',urgent:false};
    if(result.phase==='top'&&previous==='ready')return {text:'Ready. Begin.',urgent:false};
    const feedback=result.feedback;
    let warning='';
    if(feedback.includes('Only one person'))warning='Tracking paused. Check for another person or a mirror.';
    else if(feedback.includes('front view')||feedback.includes('camera beside'))warning='Place the phone beside your body.';
    else if(feedback.includes('feet'))warning='Keep your feet in view.';
    else if(feedback.includes('wrist')||feedback.includes('hands'))warning='Keep your hands in view.';
    else if(feedback.includes('Straighten your legs'))warning='Straighten your legs.';
    else if(feedback.includes('Straighten your body'))warning='Straighten your body.';
    else if(feedback.includes('Move fully')||feedback.includes('Tracking is weak'))warning='Tracking paused. Move fully into view.';
    else if(feedback.includes('Lie back')||feedback.includes('Rest flat'))warning='Lie back and rest until ready.';
    else if(feedback.includes('Bend your knees'))warning='Bend your knees. Keep feet planted.';
    else if(feedback.includes('Keep bent knees'))warning='Keep your bent knees supported.';
    else if(feedback.includes('Hold a straight-arm'))warning='Hold straight arms until ready.';
    if(warning!==this.warning){this.warning=warning;this.warningSince=time;}
    if(warning&&time-this.warningSince>=700&&time-this.lastWarning>=5000){this.lastWarning=time;return {text:warning,urgent:false};}
    return null;
  }
}

export type ZoomRange={min:number;max:number;step:number;current:number|null};
export function cameraZoom(track:MediaStreamTrack):ZoomRange|null{
  const capabilities=track.getCapabilities?.() as (MediaTrackCapabilities&{zoom?:{min:number;max:number;step:number}})|undefined;
  const z=capabilities?.zoom;
  if(!z||![z.min,z.max,z.step].every(Number.isFinite)||z.min<=0||z.max<=z.min||z.step<=0)return null;
  const settings=track.getSettings() as MediaTrackSettings&{zoom?:number};
  return {...z,current:Number.isFinite(settings.zoom)?settings.zoom!:null};
}
