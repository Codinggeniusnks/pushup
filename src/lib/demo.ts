import { EXERCISE_MODES, type ExerciseMode } from './modes';
import type { Ranking, Snapshot } from './types';
import { dateShift, dayKey } from './time';
export const DEMO_ID = 'preview-athlete';
export function demoSnapshot(): Snapshot {
 const today = dayKey();
 const counts = [42, 0, 56, 30, 68, 45, 0, 52, 40, 72, 35, 0, 60, 48, 38, 0, 55, 64, 40, 70, 52, 0, 46, 60, 35, 80, 48, 62];
 const daily = counts.map((count,i)=>({day:dateShift(today,i-27),count}));
 const standardWorkouts = daily.filter(d=>d.count>0).reverse().map((d,i)=>({mode:'standard' as const,ranked:true,id:`sample-${i}`,started_at:`${d.day}T07:30:00+08:00`,ended_at:`${d.day}T07:36:24+08:00`,accepted:d.count,rejected:i%4,duration_seconds:384}));
 const dailyByMode=EXERCISE_MODES.flatMap((mode,index)=>daily.map(d=>({...d,mode,count:index?Math.round(d.count*(.45+index*.18)):d.count})));
 const workouts=EXERCISE_MODES.flatMap((mode,index)=>standardWorkouts.map(w=>({...w,mode,ranked:mode==='standard',id:index?mode+'-'+w.id:w.id,accepted:index?Math.round(w.accepted*(.45+index*.18)):w.accepted}))).sort((a,b)=>b.started_at.localeCompare(a.started_at));
 return {totalsByMode:{standard:2486,knee:960,crunch:1430,situp:725},dailyByMode,profile:{id:DEMO_ID,nickname:'Alex Morgan',avatar_url:null,created_at:dateShift(today,-120)+'T08:00:00+08:00'},daily,workouts,total:2486,groups:[{id:'morning',name:'The Morning Crew',owner_id:DEMO_ID,invite_code:'EARLYBIRDS',member_count:8,joined_at:dateShift(today,-28)},{id:'onepercent',name:'One Percent Better',owner_id:'someone',invite_code:'BETTER2026',member_count:12,joined_at:dateShift(today,-14)}],active:null};
}
export function demoRankings(mode:ExerciseMode='standard'): Ranking[] {
 return [ ['jordan','Jordan Lee',124],['sarah','Sarah Chen',112],['marcus','Marcus Williams',98],['maya','Maya Patel',86],['daniel','Daniel Tan',75],[DEMO_ID,'Alex Morgan',62],['emma','Emma Wilson',58],['adam','Adam Lim',45] ].map(([user_id,nickname,count],i)=>({user_id:String(user_id),nickname:String(nickname),count:mode==='standard'?Number(count):Math.round(Number(count)*({knee:.63,crunch:.81,situp:.99}[mode])),rank:i+1,avatar_url:null}));
}
