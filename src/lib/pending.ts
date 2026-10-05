import { modeOf, EXERCISE_MODES } from './modes';
import type { PendingWorkout } from './types';
export const pendingKey=(userId:string)=>`pushup.pending.v1.${userId}`;
export function readPending(userId:string):PendingWorkout|null {
 const value=localStorage.getItem(pendingKey(userId));if(!value)return null;
 try{const p=JSON.parse(value);if(typeof p.sessionId!=='string'||!Array.isArray(p.events)||typeof p.nextSeq!=='number')throw new Error('Invalid pending workout');if(p.mode!==undefined&&!EXERCISE_MODES.includes(p.mode))throw new Error("Unknown exercise mode");return {...p,mode:modeOf(p.mode)};}catch{throw new Error('The saved workout queue could not be read. Do not clear browser data until you have recovered your session.');}
}
export function savePending(userId:string,pending:PendingWorkout){localStorage.setItem(pendingKey(userId),JSON.stringify(pending));}
