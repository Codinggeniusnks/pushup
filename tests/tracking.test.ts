import {describe,it,expect} from 'vitest';
import {PoseTracker,PushupCounter,metricsFromLandmarks,distinctPoses,type Landmark} from '../src/lib/pose';

// Analytic side-on skeletons; these test geometry and state transitions, not model accuracy on imagery.
function pose(depth=0,offset=0):Landmark[]{
  const p=Array.from({length:33},()=>({x:.5,y:.5,visibility:.9}));
  const sx=.30-.10*depth,sy=.30+.26*depth,ax=.85,ay=.43;
  for(const [ids,shift] of [[[11,13,15,23,25,27],0],[[12,14,16,24,26,28],.01]] as const){
    const points=[[sx,sy],[.30,.50+.06*depth],[.30,.70],[sx+(ax-sx)*.4,sy+(ay-sy)*.4],[sx+(ax-sx)*.72,sy+(ay-sy)*.72],[ax,ay]];
    ids.forEach((id,i)=>{p[id]={x:points[i][0]+offset+shift,y:points[i][1],visibility:.9};});
  }
  return p;
}
function harness(){const tracker=new PoseTracker(),counter=new PushupCounter();let time=0;return {tracker,counter,
  frame:(poses:Landmark[][],ms=100)=>{const metrics=tracker.update(poses,1,time+=ms);return {metrics,result:counter.update(metrics,time)};},
  hold:(n=8)=>{for(let i=0;i<n;i++){const metrics=tracker.update([pose()],1,time+=100);counter.update(metrics,time);}}
};}
describe('stable phone tracking',()=>{
  it('requires a continuous 500ms setup position',()=>{const t=new PoseTracker();expect(t.update([pose()],1,0).setupReady).toBe(false);expect(t.update([pose()],1,250).setupReady).toBe(false);expect(t.update([pose()],1,499).setupReady).toBe(false);expect(t.update([pose()],1,500).setupReady).toBe(true);});
  it('does not show a second-person warning for a fleeting phantom',()=>{const t=new PoseTracker();t.update([pose()],1,0);const m=t.update([pose(),pose(0,.10)],1,100);expect(m.tracking).toBe('uncertain');expect(m.single).toBe(true);expect(m.visible).toBe(false);expect(m.reason).not.toContain('Only one person');expect(t.update([pose()],1,200).single).toBe(true);});
  it('confirms a persistent distinct person only after 500ms',()=>{const t=new PoseTracker();t.update([pose()],1,0);for(let time=100;time<600;time+=100)expect(t.update([pose(),pose(0,.10)],1,time).single).toBe(true);expect(t.update([pose(),pose(0,.10)],1,600).tracking).toBe('multiple');});
  it('does not accumulate time across intermittent second detections',()=>{const t=new PoseTracker();for(let time=0;time<2000;time+=100){const m=t.update(time%200?[pose(),pose(0,.1)]:[pose()],1,time);expect(m.single).toBe(true);}});
  it('does not confirm a second person across a stalled frame stream',()=>{const t=new PoseTracker();t.update([pose(),pose(0,.1)],1,0);expect(t.update([pose(),pose(0,.1)],1,700).single).toBe(true);});
  it('keeps the primary when detector ordering changes',()=>{const t=new PoseTracker();const first=t.update([pose()],1,0);t.update([pose(0,.1),pose()],1,100);const next=t.update([pose()],1,200);expect(next.trackId).toBe(first.trackId);});
  it('gives a newly positioned body a new track and fresh setup',()=>{const t=new PoseTracker();const first=t.update([pose()],1,0);const moved=pose().map(p=>({...p,y:p.y+.4}));const next=t.update([moved],1,100);expect(next.trackId).not.toBe(first.trackId);expect(next.setupReady).toBe(false);});
  it('does not reuse a lock after a long absence',()=>{const t=new PoseTracker();const first=t.update([pose()],1,0);t.update([],1,500);t.update([],1,1000);expect(t.update([pose()],1,1500).trackId).not.toBe(first.trackId);});
  it('recognizes duplicate skeletons with a single noisy extremity',()=>{const p=pose(),q=pose(0,.004);q[28].y+=.12;expect(distinctPoses([p,q])).toHaveLength(1);});
  it('merges duplicate near sides even when both far sides are occluded',()=>{const p=pose(),q=pose(0,.004);for(const i of [12,14,16,24,26,28]){p[i].visibility=.1;q[i].visibility=.1;}expect(distinctPoses([p,q])).toHaveLength(1);});
  it('reports a hidden wrist by name',()=>{const p=pose();p[15].visibility=.1;p[16].visibility=.1;const m=metricsFromLandmarks([p]);expect(m.reason).toContain('wrist');expect(m.missingJoints).toContain('wrist');expect(m.checks?.arms).toBe(false);});
  it('reports out-of-frame feet by name',()=>{const p=pose();p[27].x=1.05;p[28].x=1.06;expect(metricsFromLandmarks([p]).reason).toBe('Move back so your feet fit');});
  it('explains a front view instead of blaming body visibility',()=>{const p=pose();for(const i of [11,13,15,23,25,27])p[i].x=.45;for(const i of [12,14,16,24,26,28])p[i].x=.65;expect(metricsFromLandmarks([p]).reason).toContain('front view');expect(metricsFromLandmarks([p]).single).toBe(true);});
  it('counts 10 analytic reps exactly once despite a brief extra detection each cycle',()=>{
    const h=harness();h.hold();
    for(let rep=0;rep<10;rep++){
      for(const d of [.2,.4,.6,.8,1,1,.8,.6,.4,.2,0,0,0])h.frame(d===.6?[pose(d),pose(d,.12)]:[pose(d)]);
      h.hold(2);
    }
    expect(h.counter.accepted).toBe(10);
  });
  it('never invents depth hidden by uncertain frames',()=>{const h=harness();h.hold();for(const d of [.2,.4,.6])h.frame([pose(d)]);h.frame([pose(1),pose(1,.12)]);h.frame([pose(.8),pose(.8,.12)]);for(const d of [.6,.4,.2,0,0,0,0])h.frame([pose(d)]);expect(h.counter.accepted).toBe(0);});
  it('requires a fresh top after a confirmed additional person',()=>{const h=harness();h.hold();for(const d of [.2,.4,.6,.8,1,1])h.frame([pose(d)]);for(let i=0;i<7;i++)h.frame([pose(1),pose(1,.12)]);for(const d of [.8,.6,.4,.2,0,0,0,0,0,0])h.frame([pose(d)]);expect(h.counter.accepted).toBe(0);});
  it('does not transfer an in-progress rep to a replacement track',()=>{const h=harness();h.hold();for(const d of [.2,.4,.6,.8,1,1])h.frame([pose(d)]);h.frame([pose().map(p=>({...p,y:p.y+.3}))]);h.hold();expect(h.counter.accepted).toBe(0);});
  it('does not advance tracking on repeated or out-of-order timestamps',()=>{const t=new PoseTracker();t.update([pose()],1,100);for(let i=0;i<20;i++)expect(t.update([pose()],1,100).setupReady).toBe(false);expect(t.update([pose()],1,90).visible).toBe(false);});
});
