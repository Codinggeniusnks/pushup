export const EXERCISE_MODES = ['standard','knee','crunch','situp'] as const;
export type ExerciseMode = typeof EXERCISE_MODES[number];
export const modeOf = (value: unknown): ExerciseMode => EXERCISE_MODES.includes(value as ExerciseMode) ? value as ExerciseMode : 'standard';
export const MODES: Record<ExerciseMode,{label:string;level:string;experimental:boolean;setup:string;cycle:string;form:string}> = {
 standard:{label:'Standard push-up',level:'Advanced',experimental:false,setup:'Side view. Keep your nearest shoulder, arm, hip, knees and feet visible.',cycle:'Hold straight arms briefly, lower with control, then extend fully.',form:'Keep shoulders, hips and ankles aligned. Knees stay off the floor.'},
 knee:{label:'Knee push-up',level:'Beginner',experimental:true,setup:'Side view. Show your nearest arm, hip, knees and ankles. Rest your knees on the floor.',cycle:'Hold straight arms briefly, lower your chest, then extend fully.',form:'Keep shoulder–hip–knee aligned, bend your knees and keep them supported.'},
 crunch:{label:'Crunch',level:'Beginner',experimental:true,setup:'Side view with a level phone. Lie on your back with knees bent and feet planted. Show shoulders, hips, knees and feet.',cycle:'Rest flat briefly, lift your shoulders in a controlled partial curl, then return to your lying baseline.',form:'Keep hips down. A full upright sit-up does not count in crunch mode.'},
 situp:{label:'Full sit-up',level:'Advanced',experimental:true,setup:'Side view with a level phone. Lie on your back, knees bent and feet planted. Show shoulders, hips, knees and feet.',cycle:'Rest flat briefly, lift your torso substantially upright, then return to your lying baseline.',form:'A small crunch does not count. Keep your hips and feet in place; avoid swinging.'},
};
export const emptyTotals = ():Record<ExerciseMode,number> => ({standard:0,knee:0,crunch:0,situp:0});
