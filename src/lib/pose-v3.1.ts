import type { PoseMetrics, Side } from './tracking-v3.1';
export * from './tracking-v3.1';
export type CounterResult = { accepted: number; rejected: number; feedback: string; phase: string; counted: boolean };
export class PushupCounter {
  accepted=0; rejected=0;
  private phase:'ready'|'top'|'descending'|'bottom'|'invalid'='ready';
  private smooth:PoseMetrics|null=null; private lastTime=-1; private lastGood=-1; private lost=false;
  private stableTop:number|null=null; private start=0; private brokenSince:number|null=null;
  private topReference=175; private calibrated=false; private cycleTop=175; private minimum=180; private descentFrames=0;
  private side?:Side;
  private trackId?:number;
  resetTracking(){this.phase='ready';this.smooth=null;this.stableTop=null;this.brokenSince=null;this.lastGood=-1;this.lost=false;this.side=undefined;this.calibrated=false;this.trackId=undefined;}
  update(input:PoseMetrics,time:number):CounterResult {
    let counted=false;
    const result=(feedback:string):CounterResult=>({accepted:this.accepted,rejected:this.rejected,feedback,phase:this.phase,counted});
    if(!Number.isFinite(time)||time<=this.lastTime)return result('Hold a steady pace');
    const dt=this.lastTime<0?50:time-this.lastTime;this.lastTime=time;
    if(dt>900||(this.lost&&this.lastGood>=0&&time-this.lastGood>350))this.resetTracking();
    if(this.trackId!==undefined&&input.trackId!==undefined&&input.trackId!==this.trackId)this.resetTracking();
    this.trackId=input.trackId;
    if(!input.single){this.resetTracking();return result('Only one person in frame — move away from mirrors or screens');}
    if(!input.visible||![input.elbow,input.hip,input.knee].every(Number.isFinite)){
      this.lost=true;this.stableTop=null;
      if(this.lastGood>=0&&time-this.lastGood>350)this.resetTracking();
      return result(input.reason??'Move fully into view');
    }
    if(this.side&&input.side&&this.side!==input.side)this.resetTracking();
    this.side=input.side;this.lastGood=time;this.lost=false;
    const previous=this.smooth,alpha=Math.min(.95,1-Math.exp(-dt/65));
    const m={...input,elbow:previous?previous.elbow+(input.elbow-previous.elbow)*alpha:input.elbow,hip:previous?previous.hip+(input.hip-previous.hip)*alpha:input.hip,knee:previous?previous.knee+(input.knee-previous.knee)*alpha:input.knee};this.smooth=m;
    if(!m.horizontal||m.hip<155||m.knee<155){
      this.stableTop=null;this.brokenSince??=time;
      if(time-this.brokenSince>250&&this.phase!=='ready')this.phase='invalid';
      return result(!m.horizontal?(input.reason??'Turn the camera beside you — a front view cannot judge push-up depth'):m.knee<155?'Straighten your legs — keep knees off the floor':'Straighten your body');
    }
    this.brokenSince=null;
    const target=this.calibrated?Math.max(150,Math.min(165,this.topReference-12)):155;
    this.stableTop=m.elbow>=target?(this.stableTop??time):null;
    const top=this.stableTop!==null&&time-this.stableTop>=(this.phase==='ready'?500:100);
    if(this.phase==='ready'){
      if(top){this.phase='top';if(!this.calibrated)this.topReference=m.elbow;this.calibrated=true;this.cycleTop=m.elbow;}
      return result(top?'Ready. Lower with control':'Hold a straight-arm plank briefly to get ready');
    }
    if(this.phase==='invalid'){if(top){this.rejected++;this.phase='top';}return result('Rep not counted. Reset at the top');}
    if(this.phase==='top'){
      this.cycleTop=Math.max(this.cycleTop,m.elbow);
      if(m.elbow<target-12){this.phase='descending';this.start=time;this.minimum=input.elbow;this.descentFrames=0;}
    }
    if(this.phase==='descending'){
      if(input.elbow<target-12)this.descentFrames++;
      this.minimum=Math.min(this.minimum,input.elbow);
      // Raw trough avoids smoothing away a short natural turnaround. Require temporal descent and range too.
      if(input.elbow<=100&&(input.shoulderAboveElbow??0)<=.45&&this.descentFrames>=2&&time-this.start>=100&&this.cycleTop-input.elbow>=50){this.phase='bottom';return result('Good depth. Push back up');}
      if(top){this.rejected++;this.phase='top';this.cycleTop=m.elbow;return result('Rep not counted. Lower further');}
      return result('Lower further');
    }
    if(this.phase==='bottom'&&top){
      if(time-this.start>=600&&time-this.start<=30000&&this.cycleTop-this.minimum>=50){this.accepted++;counted=true;}else this.rejected++;
      this.phase='top';this.cycleTop=m.elbow;
      return result(counted?'Good rep. Keep going!':'Rep not counted. Keep a steady pace');
    }
    return result(this.phase==='bottom'?'Extend your arms fully':'Lower with control');
  }
}
