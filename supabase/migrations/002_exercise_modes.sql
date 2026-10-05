-- Apply after 001_pushup.sql. Existing sessions and clients remain standard push-ups.
create table public.exercise_configs(mode text primary key check(mode in ('standard','knee','crunch','situp')),ranked_enabled boolean not null default false);
insert into public.exercise_configs values ('standard',true),('knee',false),('crunch',false),('situp',false);
alter table public.exercise_configs enable row level security;
revoke all on public.exercise_configs from public,anon,authenticated;
alter table public.workouts add column mode text not null default 'standard' references public.exercise_configs(mode), add column ranked boolean not null default true;
-- Server-owned immutable identity: promotion applies only to newly started sessions.
create function public.immutable_workout_mode() returns trigger language plpgsql set search_path=public as $$
begin if new.mode<>old.mode or new.ranked<>old.ranked then raise exception 'Workout mode and ranking eligibility are immutable'; end if; return new; end $$;
create trigger preserve_workout_mode before update on public.workouts for each row execute function public.immutable_workout_mode();
revoke execute on function public.immutable_workout_mode() from public,anon,authenticated;
create index workout_mode_user on public.workouts(mode,user_id);
create function public.start_workout(p_mode text) returns jsonb language plpgsql security definer set search_path = public as $$
declare w public.workouts; n integer;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 if p_mode is null or not exists(select 1 from public.exercise_configs where mode=p_mode) then raise exception 'Unknown exercise mode'; end if;
 perform 1 from public.profiles where id=auth.uid() for update;
 update public.workouts set ended_at=started_at+interval '4 hours' where user_id=auth.uid() and ended_at is null and started_at < now()-interval '4 hours';
 select * into w from public.workouts where user_id=auth.uid() and ended_at is null;
 if w.id is not null and w.mode<>p_mode then raise exception 'Finish the active workout before switching exercise modes'; end if;
 if w.id is null then insert into public.workouts(user_id,mode,ranked) select auth.uid(),mode,ranked_enabled from public.exercise_configs where mode=p_mode returning * into w; end if;
 select coalesce(max(seq),0) into n from public.rep_events where session_id=w.id;
 return jsonb_build_object('mode',w.mode,'ranked',w.ranked,'id',w.id,'started_at',w.started_at,'server_now',clock_timestamp(),'next_seq',n+1,'accepted',n);
end $$;
create or replace function public.start_workout() returns jsonb language sql security definer set search_path=public as $$select public.start_workout('standard'::text)$$;
create function public.leaderboard(p_day date,p_group uuid,p_mode text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare result jsonb;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 if p_group is not null and not exists(select 1 from public.memberships where group_id=p_group and user_id=auth.uid()) then raise exception 'Group not found'; end if;
 if p_mode is null or not exists(select 1 from public.exercise_configs where mode=p_mode) then raise exception 'Unknown exercise mode'; end if;
 with totals as (
 select p.id user_id,p.nickname,p.avatar_url,count(e.seq)::integer count from public.profiles p
 left join public.memberships m on m.user_id=p.id and m.group_id=p_group
 left join public.workouts w on w.user_id=p.id and w.mode=p_mode and w.ranked
 left join public.rep_events e on e.session_id=w.id and e.occurred_at >= (p_day::timestamp at time zone 'Asia/Kuala_Lumpur') and e.occurred_at < ((p_day+1)::timestamp at time zone 'Asia/Kuala_Lumpur') and (p_group is null or e.occurred_at>=m.joined_at)
 where p_group is null or m.user_id is not null group by p.id
 ), ranked as (select *,rank() over(order by count desc) rank from totals)
 select coalesce(jsonb_agg(to_jsonb(r) order by r.rank,r.nickname,r.user_id),'[]') into result from (select * from ranked where rank<=100 or user_id=auth.uid()) r;
 return result;
end $$;
create or replace function public.leaderboard(p_day date,p_group uuid default null) returns jsonb language sql stable security definer set search_path=public as $$select public.leaderboard(p_day,p_group,'standard'::text)$$;
create or replace function public.app_snapshot() returns jsonb language plpgsql stable security definer set search_path = public as $$
declare result jsonb;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 select jsonb_build_object(
 'profile',(select to_jsonb(p) from public.profiles p where id=auth.uid()),
 'workouts',coalesce((select jsonb_agg(to_jsonb(t) order by started_at desc) from (
 select w.mode,w.ranked,w.id,w.started_at,w.ended_at,w.rejected,count(e.seq)::integer accepted,extract(epoch from(coalesce(w.ended_at,now())-w.started_at))::integer duration_seconds
 from public.workouts w left join public.rep_events e on e.session_id=w.id where w.user_id=auth.uid() group by w.id order by w.started_at desc limit 1000) t),'[]'::jsonb),
 'daily',coalesce((select jsonb_agg(to_jsonb(t) order by t.day) from (select (e.occurred_at at time zone 'Asia/Kuala_Lumpur')::date as day,count(*)::integer count from public.rep_events e join public.workouts w on w.id=e.session_id where w.user_id=auth.uid() and w.mode='standard' group by 1) t),'[]'::jsonb),
 'total',(select count(*) from public.rep_events e join public.workouts w on w.id=e.session_id where w.user_id=auth.uid() and w.mode='standard'),
 'totalsByMode',(select jsonb_object_agg(mode,total) from (select c.mode,count(e.seq)::integer total from public.exercise_configs c left join public.workouts w on w.mode=c.mode and w.user_id=auth.uid() left join public.rep_events e on e.session_id=w.id group by c.mode) t),
 'dailyByMode',coalesce((select jsonb_agg(to_jsonb(t) order by t.day,t.mode) from (select w.mode,(e.occurred_at at time zone 'Asia/Kuala_Lumpur')::date as day,count(*)::integer count from public.rep_events e join public.workouts w on w.id=e.session_id where w.user_id=auth.uid() group by 1,2) t),'[]'::jsonb),
 'groups',coalesce((select jsonb_agg(jsonb_build_object('id',g.id,'name',g.name,'owner_id',g.owner_id,'invite_code',g.invite_code,'joined_at',m.joined_at,'member_count',(select count(*) from public.memberships where group_id=g.id))) from public.groups g join public.memberships m on m.group_id=g.id where m.user_id=auth.uid()),'[]'::jsonb),
 'active',(select jsonb_build_object('mode',w.mode,'ranked',w.ranked,'id',w.id,'started_at',w.started_at,'next_seq',coalesce(max(e.seq),0)+1,'accepted',count(e.seq)) from public.workouts w left join public.rep_events e on e.session_id=w.id where w.user_id=auth.uid() and w.ended_at is null group by w.id)
 ) into result;
 return result;
end $$;
create function public.activity_on_date(p_day date,p_mode text) returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 if p_mode is null or (p_mode<>'all' and not exists(select 1 from public.exercise_configs where mode=p_mode)) then raise exception 'Unknown exercise mode'; end if;
 return coalesce((select jsonb_agg(to_jsonb(t) order by started_at desc) from (
 select w.mode,w.ranked,w.id,w.started_at,w.ended_at,w.rejected,extract(epoch from(coalesce(w.ended_at,now())-w.started_at))::integer duration_seconds,count(e.seq)::integer accepted
 from public.workouts w left join public.rep_events e on e.session_id=w.id and (e.occurred_at at time zone 'Asia/Kuala_Lumpur')::date=p_day
 where w.user_id=auth.uid() and (p_mode='all' or w.mode=p_mode) group by w.id having count(e.seq)>0 or (w.started_at at time zone 'Asia/Kuala_Lumpur')::date=p_day) t),'[]'::jsonb);
end $$;
create or replace function public.activity_on_date(p_day date) returns jsonb language sql stable security definer set search_path=public as $$select public.activity_on_date(p_day,'standard'::text)$$;
revoke execute on function public.start_workout(text),public.leaderboard(date,uuid,text),public.activity_on_date(date,text) from public,anon;
grant execute on function public.start_workout(text),public.leaderboard(date,uuid,text),public.activity_on_date(date,text) to authenticated;
