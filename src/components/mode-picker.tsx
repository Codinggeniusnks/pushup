'use client';
import { EXERCISE_MODES, MODES, type ExerciseMode } from '@/lib/modes';
export function ExerciseArt({mode,className}:{mode:ExerciseMode;className?:string}){
 const abdominal=mode==='crunch'||mode==='situp';
 return <svg className={className} viewBox="0 0 150 65" aria-hidden="true"><path d="M5 57H145" stroke="currentColor" opacity=".2" strokeWidth="2"/><circle cx={abdominal?mode==='situp'?62:25:20} cy={abdominal?mode==='situp'?10:33:13} r="6" fill="currentColor"/><path d={mode==='standard'?'M30 24L75 35L126 54M32 25L32 54L23 54':mode==='knee'?'M30 24L68 38L98 54L125 32M32 25L32 54L23 54':mode==='crunch'?'M35 42L68 53L96 25L124 54M35 42L50 33': 'M64 20L70 53L96 25L124 54M64 23L88 31'} fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
export function ModePicker({mode,onChange,disabled=false}:{mode:ExerciseMode;onChange:(m:ExerciseMode)=>void;disabled?:boolean}){
 return <div className="mode-picker" role="group" aria-label="Exercise mode">{EXERCISE_MODES.map(m=><button type="button" key={m} disabled={disabled} aria-pressed={mode===m} onClick={()=>onChange(m)} className={mode===m?'selected':''}><ExerciseArt mode={m}/><strong>{MODES[m].label}</strong><span>{MODES[m].level}{MODES[m].experimental?' · Practice':''}</span></button>)}</div>;
}
