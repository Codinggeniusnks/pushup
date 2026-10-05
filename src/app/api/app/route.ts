import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isConfigured, serverClient } from '@/lib/supabase/server';
import { isSameOrigin } from '@/lib/request-origin';
const mode = z.enum(['standard','knee','crunch','situp']);
const uuid = z.string().uuid();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('snapshot') }),
  z.object({ action: z.literal('start'), mode: mode.default('standard') }),
  z.object({ action: z.literal('reps'), session: uuid, events: z.array(z.object({ seq: z.number().int().positive(), elapsed_ms: z.number().int().min(0).max(14400000) })).max(500) }),
  z.object({ action: z.literal('finish'), session: uuid, rejected: z.number().int().min(0).max(10000) }),
  z.object({ action: z.literal('leaderboard'), mode: mode.default('standard'), day: date, group: uuid.nullable().optional() }),
  z.object({ action: z.literal('activity'), day: date, mode: z.union([mode,z.literal('all')]).default('standard') }),
  z.object({ action: z.literal('members'), group: uuid }),
  z.object({ action: z.literal('profile'), nickname: z.string().trim().min(1).max(30) }),
  z.object({ action: z.literal('createGroup'), name: z.string().trim().min(2).max(50) }),
  z.object({ action: z.literal('joinGroup'), code: z.string().trim().min(1).max(30) }),
  z.object({ action: z.literal('manageGroup'), group: uuid, operation: z.enum(['rotate', 'leave', 'remove', 'delete']), member: uuid.optional() }),
]);
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  if (!isConfigured()) return NextResponse.json({ error: 'Connect Supabase to use live accounts and competitions.' }, { status: 503 });
  if (Number(request.headers.get('content-length') || 0) > 65536) return NextResponse.json({ error: 'Request too large' }, { status: 413 });
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'Please check the information you entered.' }, { status: 400 });
    const supabase = await serverClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
    const input = parsed.data;
    let rpc = ''; let args = {};
    switch (input.action) {
      case 'snapshot': rpc = 'app_snapshot'; break;
      case 'start': rpc = 'start_workout'; args = {p_mode:input.mode}; break;
      case 'reps': rpc = 'submit_reps'; args = { p_session: input.session, p_events: input.events }; break;
      case 'finish': rpc = 'finish_workout'; args = { p_session: input.session, p_rejected: input.rejected }; break;
      case 'leaderboard': rpc = 'leaderboard'; args = { p_day: input.day, p_group: input.group ?? null, p_mode:input.mode }; break;
      case 'activity': rpc = 'activity_on_date'; args = { p_day: input.day, p_mode:input.mode }; break;
      case 'members': rpc = 'group_members'; args = { p_group: input.group }; break;
      case 'profile': rpc = 'update_profile'; args = { p_nickname: input.nickname }; break;
      case 'createGroup': rpc = 'create_group'; args = { p_name: input.name }; break;
      case 'joinGroup': rpc = 'join_group'; args = { p_code: input.code }; break;
      case 'manageGroup': rpc = 'manage_group'; args = { p_group: input.group, p_action: input.operation, p_member: input.member ?? null }; break;
    }
    const { data, error } = await supabase.rpc(rpc, args);
    if (error) {
      console.error('pushup_rpc_failed', { action: input.action, code: error.code });
      return NextResponse.json({ error: error.code === 'P0001' ? error.message : 'Unable to save this change. Check your connection and database setup.' }, { status: 400 });
    }
    if (data?.error) return NextResponse.json({ error: data.error }, { status: 429 });
    return NextResponse.json({ data }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { console.error('pushup_request_failed'); return NextResponse.json({ error: 'Unable to complete the request. Please try again.' }, { status: 400 }); }
}
