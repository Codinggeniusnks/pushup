import {describe,it,expect} from 'vitest';
import {CoachingCues,cameraZoom} from '../src/lib/coaching';
import type {CounterResult} from '../src/lib/pose';
const base:CounterResult={accepted:0,rejected:0,phase:'ready',counted:false,feedback:'Hold a straight-arm plank briefly to get ready'};
describe('distance coaching',()=>{
 it('announces ready and depth transitions once',()=>{const c=new CoachingCues();expect(c.update({...base,phase:'top'},0)?.text).toBe('Ready. Begin.');expect(c.update({...base,phase:'top'},100)).toBeNull();expect(c.update({...base,phase:'bottom'},200)?.text).toBe('Push up.');expect(c.update({...base,phase:'bottom'},300)).toBeNull();});
 it('prioritizes accepted counts without repeating them',()=>{const c=new CoachingCues();const rep={...base,accepted:1,counted:true,phase:'top'};expect(c.update(rep,100)).toEqual({text:'1',urgent:true});expect(c.update({...rep,counted:false},200)).toBeNull();expect(c.update({...rep,accepted:2},300)?.text).toBe('2');});
 it('announces rejection separately from successful counts',()=>{const c=new CoachingCues();expect(c.update({...base,rejected:1,feedback:'Rep not counted. Lower further'},0)?.text).toBe('Not counted. Lower further.');});
 it('does not speak transient tracking warnings or flood sustained warnings',()=>{const c=new CoachingCues();const warning={...base,feedback:'Your wrist is hidden'};expect(c.update(warning,0)).toBeNull();expect(c.update(warning,500)).toBeNull();expect(c.update(warning,700)?.text).toBe('Keep your hands in view.');expect(c.update(warning,1000)).toBeNull();expect(c.update(warning,5700)?.text).toBe('Keep your hands in view.');});
 it('uses only supported zoom capabilities and does not invent the current zoom',()=>{const track={getCapabilities:()=>({zoom:{min:.5,max:5,step:.1}}),getSettings:()=>({zoom:1})} as unknown as MediaStreamTrack;expect(cameraZoom(track)).toEqual({min:.5,max:5,step:.1,current:1});expect(cameraZoom({...track,getSettings:()=>({})} as MediaStreamTrack)?.current).toBeNull();expect(cameraZoom({getCapabilities:()=>({})} as MediaStreamTrack)).toBeNull();});
});
