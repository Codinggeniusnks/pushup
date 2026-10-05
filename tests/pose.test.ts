import { describe,it,expect } from 'vitest';
import { PushupCounter,PoseTracker,distinctPoses,angle,metricsFromLandmarks,type PoseMetrics,type Landmark } from '../src/lib/pose';
const base:PoseMetrics={elbow:175,hip:175,knee:175,horizontal:true,visible:true,single:true};
function rig(){const counter=new PushupCounter();let t=0;return{counter,hold:(elbow:number,frames=14,extra:Partial<PoseMetrics>={})=>{let result;for(let i=0;i<frames;i++){t+=50;result=counter.update({...base,elbow,...extra},t);}return result!;}};}
describe('temporal repetition detector',()=>{
 it('counts exactly one full up-down-up cycle, never a held position',()=>{const r=rig();r.hold(175);r.hold(80);r.hold(175);r.hold(175,80);expect(r.counter.accepted).toBe(1);expect(r.counter.rejected).toBe(0);});
 it('requires a fresh top before counting a workout starting at the bottom',()=>{const r=rig();r.hold(80);r.hold(175);expect(r.counter.accepted).toBe(0);r.hold(80);r.hold(175);expect(r.counter.accepted).toBe(1);});
 it('rejects shallow repetitions',()=>{const r=rig();r.hold(175);r.hold(115);r.hold(175);expect(r.counter.accepted).toBe(0);expect(r.counter.rejected).toBe(1);});
 it('does not count a partial return',()=>{const r=rig();r.hold(175);r.hold(80);r.hold(140);expect(r.counter.accepted).toBe(0);});
 it.each([{hip:130},{knee:100},{horizontal:false}])('rejects sustained invalid form: %o',extra=>{const r=rig();r.hold(175);r.hold(80,12,extra);r.hold(175);expect(r.counter.accepted).toBe(0);expect(r.counter.rejected).toBe(1);});
 it('resets incomplete cycles after sustained tracking loss',()=>{const r=rig();r.hold(175);r.hold(80);r.hold(80,10,{visible:false});r.hold(175);expect(r.counter.accepted).toBe(0);r.hold(80);r.hold(175);expect(r.counter.accepted).toBe(1);});
 it('preserves a witnessed cycle through a brief occlusion',()=>{const r=rig();r.hold(175);r.hold(80);r.hold(80,3,{visible:false});r.hold(175);expect(r.counter.accepted).toBe(1);});
 it('does not infer the bottom during an occlusion',()=>{const r=rig();r.hold(175);r.hold(130);r.hold(80,3,{visible:false});r.hold(175);expect(r.counter.accepted).toBe(0);});
 it('counts a continuous rep without holding the bottom',()=>{const r=rig();r.hold(175);for(const elbow of [170,162,153,142,131,120,109,98,88,96,107,118,130,143,155,166,174,176,176])r.hold(elbow,1);expect(r.counter.accepted).toBe(1);});
 it('counts repeated cycles at a lower phone inference rate',()=>{const c=new PushupCounter();let t=0;const frame=(elbow:number)=>c.update({...base,elbow},t+=150);for(const elbow of [175,175,175,175,175,175,150,125,95,85,105,130,160,175,175,175,150,125,95,85,105,130,160,175,175])frame(elbow);expect(c.accepted).toBe(2);});
 it('rejects a deep arm bend when the shoulder has not lowered',()=>{const r=rig();r.hold(175);r.hold(85,12,{shoulderAboveElbow:.8});r.hold(175);expect(r.counter.accepted).toBe(0);});
 it('will not count with two people in frame',()=>{const r=rig();r.hold(175);r.hold(80,8,{single:false});r.hold(175);expect(r.counter.accepted).toBe(0);});
 it('ignores duplicate/out-of-order frames',()=>{const c=new PushupCounter();c.update(base,100);for(let i=0;i<50;i++)c.update({...base,elbow:80},100);expect(c.accepted).toBe(0);});
 it('does not let one-frame jitter create a bottom crossing',()=>{const r=rig();r.hold(175);r.hold(80,1);r.hold(175);expect(r.counter.accepted).toBe(0);});
 it('pause resets an incomplete cycle',()=>{const r=rig();r.hold(175);r.hold(80);r.counter.resetTracking();r.hold(175);expect(r.counter.accepted).toBe(0);});
 it('rejects degenerate geometry and absent poses',()=>{expect(angle({x:0,y:0},{x:0,y:0},{x:1,y:1})).toBe(0);expect(metricsFromLandmarks([]).visible).toBe(false);});
});

function skeleton(offset=0):Landmark[]{
 const p=Array.from({length:33},()=>({x:.5+offset,y:.5,visibility:.9}));
 for(const [i,x,y] of [[11,.22,.3],[13,.22,.5],[15,.22,.7],[23,.47,.35],[25,.66,.39],[27,.85,.43],[12,.23,.3],[14,.23,.5],[16,.23,.7],[24,.48,.35],[26,.67,.39],[28,.86,.43]])p[i]={x:x+offset,y,visibility:.9};
 return p;
}
describe('phone landmark filtering',()=>{
 it('merges near-identical detections of the same body',()=>{const p=skeleton(),ghost=skeleton(.005);expect(distinctPoses([p,ghost])).toHaveLength(1);expect(metricsFromLandmarks([p,ghost]).single).toBe(true);});
 it('keeps two distinct people even if their boxes overlap',()=>{const first=skeleton(),second=skeleton(.09);expect(distinctPoses([first,second])).toHaveLength(2);expect(metricsFromLandmarks([first,second]).single).toBe(false);});
 it('ignores a low-confidence phantom torso',()=>{const ghost=skeleton(.1).map(p=>({...p,visibility:.2}));expect(metricsFromLandmarks([skeleton(),ghost]).visible).toBe(true);});
 it('allows the occluded far side when the near side is visible',()=>{const p=skeleton();for(const i of [12,14,16,24,26,28])p[i].visibility=.2;expect(metricsFromLandmarks([p]).visible).toBe(true);});
 it('handles modest leg confidence while requiring a visible near arm',()=>{const p=skeleton();for(const i of [23,25,27])p[i].visibility=.55;for(const i of [12,14,16,24,26,28])p[i].visibility=.2;expect(metricsFromLandmarks([p]).visible).toBe(true);p[15].visibility=.2;expect(metricsFromLandmarks([p]).visible).toBe(false);});
 it('uses aspect ratio to calculate camera angles',()=>{const p=skeleton();expect(metricsFromLandmarks([p],16/9).elbow).toBeCloseTo(180);expect(metricsFromLandmarks([p],9/16).hip).toBeGreaterThan(170);});
 it('rejects out-of-frame feet',()=>{const p=skeleton();p[27].x=1.1;p[28].x=1.1;expect(metricsFromLandmarks([p]).visible).toBe(false);});
 it('does not switch arms on small confidence fluctuations',()=>{const tracker=new PoseTracker();const p=skeleton();expect(tracker.update([p]).side).toBe('left');for(const i of [12,14,16,24,26,28])p[i].visibility=.95;expect(tracker.update([p]).side).toBe('left');});
 it('resets after a missing frame followed by a long gap',()=>{const c=new PushupCounter();for(let t=50;t<=400;t+=50)c.update(base,t);for(let t=450;t<=800;t+=50)c.update({...base,elbow:80},t);c.update({...base,visible:false},850);for(let t=1300;t<=1750;t+=50)c.update(base,t);expect(c.accepted).toBe(0);});
});
