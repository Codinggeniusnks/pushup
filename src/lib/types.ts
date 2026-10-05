import type { ExerciseMode } from './modes';
export type Profile = { id: string; nickname: string; avatar_url: string | null; created_at: string };
export type Workout = { mode?: ExerciseMode; ranked?: boolean; id: string; started_at: string; ended_at: string | null; accepted: number; rejected: number; duration_seconds: number };
export type DailyTotal = { day: string; count: number };
export type Ranking = { user_id: string; nickname: string; avatar_url: string | null; count: number; rank: number };
export type Group = { id: string; name: string; owner_id: string; invite_code: string; member_count: number; joined_at: string };
export type Snapshot = { totalsByMode?: Record<ExerciseMode,number>; dailyByMode?: (DailyTotal & {mode:ExerciseMode})[]; profile: Profile; workouts: Workout[]; daily: DailyTotal[]; total: number; groups: Group[]; active: { mode?: ExerciseMode; ranked?: boolean; id: string; started_at: string; next_seq: number; accepted: number } | null };
export type RepEvent = { seq: number; elapsed_ms: number };
export type PendingWorkout = { mode?: ExerciseMode; ranked?: boolean; sessionId: string; startedAt: string; nextSeq: number; events: RepEvent[]; accepted: number; rejected: number; finishRequested: boolean };
