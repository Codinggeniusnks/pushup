-- Run once in the Supabase SQL editor. All mutations are authenticated RPCs.
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 nickname text not null check (char_length(nickname) between 1 and 30),
 avatar_url text, created_at timestamptz not null default now()
);
create table public.workouts (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
 started_at timestamptz not null default clock_timestamp(), ended_at timestamptz,
 rejected integer not null default 0 check (rejected between 0 and 10000)
);
create unique index one_active_workout on public.workouts(user_id) where ended_at is null;
create table public.rep_events (
 session_id uuid not null references public.workouts(id) on delete cascade,
 seq integer not null check (seq > 0), elapsed_ms integer not null check (elapsed_ms between 0 and 14400000),
 occurred_at timestamptz not null, primary key(session_id,seq)
);
create index rep_date on public.rep_events(occurred_at);
create index workout_user on public.workouts(user_id,started_at desc);
create table public.groups (
 id uuid primary key default gen_random_uuid(), name text not null check (char_length(name) between 2 and 50),
 owner_id uuid not null references public.profiles(id) on delete cascade,
 invite_code text not null unique default upper(left(replace(gen_random_uuid()::text,'-',''),10)), created_at timestamptz not null default now()
);
create table public.memberships (
 group_id uuid not null references public.groups(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 joined_at timestamptz not null default clock_timestamp(), primary key(group_id,user_id)
);
create table public.join_attempts (user_id uuid primary key references public.profiles(id) on delete cascade, window_start timestamptz not null default now(), attempts integer not null default 1);
alter table public.profiles enable row level security;
alter table public.workouts enable row level security;
alter table public.rep_events enable row level security;
alter table public.groups enable row level security;
alter table public.memberships enable row level security;
alter table public.join_attempts enable row level security;
create policy own_profile on public.profiles for select to authenticated using(id=auth.uid());
create policy own_workout on public.workouts for select to authenticated using(user_id=auth.uid());
create policy own_reps on public.rep_events for select to authenticated using(exists(select 1 from public.workouts w where w.id=session_id and w.user_id=auth.uid()));
-- No direct writes or membership reads: narrow RPCs below enforce authorization.
revoke all on public.profiles,public.workouts,public.rep_events,public.groups,public.memberships,public.join_attempts from anon,authenticated;
grant select on public.profiles,public.workouts,public.rep_events to authenticated;

create function public.on_signup() returns trigger language plpgsql security definer set search_path = public as $$
begin
 insert into public.profiles(id,nickname,created_at) values(new.id,left(coalesce(nullif(trim(new.raw_user_meta_data->>'nickname'),''),nullif(trim(new.raw_user_meta_data->>'full_name'),''),'Athlete'),30),new.created_at);
 return new;
end $$;
create trigger create_profile after insert on auth.users for each row execute function public.on_signup();
-- Include accounts created before this migration.
insert into public.profiles(id,nickname,created_at) select id,left(coalesce(nullif(raw_user_meta_data->>'full_name',''),'Athlete'),30),created_at from auth.users on conflict do nothing;

create function public.start_workout() returns jsonb language plpgsql security definer set search_path = public as $$
declare w public.workouts; n integer;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 perform 1 from public.profiles where id=auth.uid() for update;
 update public.workouts set ended_at=started_at+interval '4 hours' where user_id=auth.uid() and ended_at is null and started_at < now()-interval '4 hours';
 select * into w from public.workouts where user_id=auth.uid() and ended_at is null;
 if w.id is null then insert into public.workouts(user_id) values(auth.uid()) returning * into w; end if;
 select coalesce(max(seq),0) into n from public.rep_events where session_id=w.id;
 return jsonb_build_object('id',w.id,'started_at',w.started_at,'server_now',clock_timestamp(),'next_seq',n+1,'accepted',n);
end $$;

create function public.submit_reps(p_session uuid,p_events jsonb) returns integer language plpgsql security definer set search_path = public as $$
declare w public.workouts; e jsonb; s integer; t integer; last_s integer; last_t integer; old_t integer;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 select * into w from public.workouts where id=p_session and user_id=auth.uid() for update;
 if w.id is null then raise exception 'Workout not found'; end if;
 if jsonb_typeof(p_events) <> 'array' or jsonb_array_length(p_events)>500 then raise exception 'Invalid batch'; end if;
 select coalesce(max(seq),0),coalesce(max(elapsed_ms),-1000) into last_s,last_t from public.rep_events where session_id=p_session;
 for e in select value from jsonb_array_elements(p_events) loop
  s := (e->>'seq')::integer; t := (e->>'elapsed_ms')::integer;
  if s is null or t is null then raise exception 'Invalid event'; end if;
  select elapsed_ms into old_t from public.rep_events where session_id=p_session and seq=s;
  if found then
   if old_t<>t then raise exception 'Conflicting event'; end if;
   continue;
  end if;
  if w.ended_at is not null then raise exception 'Workout already finished'; end if;
  if s<>last_s+1 or t-last_t<600 or t<600 or t>14400000 or w.started_at+t*interval '1 millisecond'>clock_timestamp()+interval '3 seconds' then raise exception 'Invalid repetition sequence or timing'; end if;
  insert into public.rep_events values(p_session,s,t,w.started_at+t*interval '1 millisecond');
  last_s:=s; last_t:=t;
 end loop;
 return last_s;
end $$;

create function public.finish_workout(p_session uuid,p_rejected integer) returns jsonb language plpgsql security definer set search_path = public as $$
declare w public.workouts;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 if p_rejected<0 or p_rejected>10000 then raise exception 'Invalid rejected count'; end if;
 select * into w from public.workouts where id=p_session and user_id=auth.uid() for update;
 if w.id is null then raise exception 'Workout not found'; end if;
 if w.ended_at is null then
  update public.workouts set ended_at=least(clock_timestamp(),started_at+interval '4 hours'),rejected=p_rejected where id=w.id returning * into w;
 end if;
 return to_jsonb(w);
end $$;

create function public.leaderboard(p_day date,p_group uuid default null) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare result jsonb;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 if p_group is not null and not exists(select 1 from public.memberships where group_id=p_group and user_id=auth.uid()) then raise exception 'Group not found'; end if;
 with totals as (
 select p.id user_id,p.nickname,p.avatar_url,count(e.seq)::integer count from public.profiles p
 left join public.memberships m on m.user_id=p.id and m.group_id=p_group
 left join public.workouts w on w.user_id=p.id
 left join public.rep_events e on e.session_id=w.id and e.occurred_at >= (p_day::timestamp at time zone 'Asia/Kuala_Lumpur') and e.occurred_at < ((p_day+1)::timestamp at time zone 'Asia/Kuala_Lumpur') and (p_group is null or e.occurred_at>=m.joined_at)
 where p_group is null or m.user_id is not null group by p.id
 ), ranked as (select *,rank() over(order by count desc) rank from totals)
 select coalesce(jsonb_agg(to_jsonb(r) order by r.rank,r.nickname,r.user_id),'[]') into result from (select * from ranked where rank<=100 or user_id=auth.uid()) r;
 return result;
end $$;

create function public.app_snapshot() returns jsonb language plpgsql stable security definer set search_path = public as $$
declare result jsonb;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 select jsonb_build_object(
 'profile',(select to_jsonb(p) from public.profiles p where id=auth.uid()),
 'workouts',coalesce((select jsonb_agg(to_jsonb(t) order by started_at desc) from (
 select w.id,w.started_at,w.ended_at,w.rejected,count(e.seq)::integer accepted,extract(epoch from(coalesce(w.ended_at,now())-w.started_at))::integer duration_seconds
 from public.workouts w left join public.rep_events e on e.session_id=w.id where w.user_id=auth.uid() group by w.id order by w.started_at desc limit 1000) t),'[]'::jsonb),
 'daily',coalesce((select jsonb_agg(to_jsonb(t) order by t.day) from (select (e.occurred_at at time zone 'Asia/Kuala_Lumpur')::date as day,count(*)::integer count from public.rep_events e join public.workouts w on w.id=e.session_id where w.user_id=auth.uid() group by 1) t),'[]'::jsonb),
 'total',(select count(*) from public.rep_events e join public.workouts w on w.id=e.session_id where w.user_id=auth.uid()),
 'groups',coalesce((select jsonb_agg(jsonb_build_object('id',g.id,'name',g.name,'owner_id',g.owner_id,'invite_code',g.invite_code,'joined_at',m.joined_at,'member_count',(select count(*) from public.memberships where group_id=g.id))) from public.groups g join public.memberships m on m.group_id=g.id where m.user_id=auth.uid()),'[]'::jsonb),
 'active',(select jsonb_build_object('id',w.id,'started_at',w.started_at,'next_seq',coalesce(max(e.seq),0)+1,'accepted',count(e.seq)) from public.workouts w left join public.rep_events e on e.session_id=w.id where w.user_id=auth.uid() and w.ended_at is null group by w.id)
 ) into result;
 return result;
end $$;

create function public.activity_on_date(p_day date) returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 return coalesce((select jsonb_agg(to_jsonb(t) order by started_at desc) from (
 select w.id,w.started_at,w.ended_at,w.rejected,extract(epoch from(coalesce(w.ended_at,now())-w.started_at))::integer duration_seconds,count(e.seq)::integer accepted
 from public.workouts w left join public.rep_events e on e.session_id=w.id and (e.occurred_at at time zone 'Asia/Kuala_Lumpur')::date=p_day
 where w.user_id=auth.uid() group by w.id having count(e.seq)>0 or (w.started_at at time zone 'Asia/Kuala_Lumpur')::date=p_day) t),'[]'::jsonb);
end $$;

create function public.update_profile(p_nickname text,p_avatar text default null) returns void language plpgsql security definer set search_path = public as $$
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 if char_length(trim(p_nickname)) not between 1 and 30 then raise exception 'Nickname must be 1–30 characters'; end if;
 if p_avatar is not null and p_avatar <> auth.uid()::text||'/avatar.webp' then raise exception 'Invalid avatar path'; end if;
 update public.profiles set nickname=trim(p_nickname),avatar_url=coalesce(p_avatar,avatar_url) where id=auth.uid();
end $$;

create function public.create_group(p_name text) returns uuid language plpgsql security definer set search_path = public as $$
declare gid uuid;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 perform 1 from public.profiles where id=auth.uid() for update;
 if (select count(*) from public.groups where owner_id=auth.uid())>=20 then raise exception 'You can own up to 20 groups'; end if;
 insert into public.groups(name,owner_id) values(trim(p_name),auth.uid()) returning id into gid;
 insert into public.memberships(group_id,user_id) values(gid,auth.uid()); return gid;
end $$;

-- Returns errors as data so failed attempts still commit the rate-limit counter.
create function public.join_group(p_code text) returns jsonb language plpgsql security definer set search_path = public as $$
declare gid uuid; tries integer;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 insert into public.join_attempts(user_id) values(auth.uid()) on conflict(user_id) do update set
 attempts=case when public.join_attempts.window_start<now()-interval '15 minutes' then 1 else public.join_attempts.attempts+1 end,
 window_start=case when public.join_attempts.window_start<now()-interval '15 minutes' then now() else public.join_attempts.window_start end returning attempts into tries;
 if tries>10 then return jsonb_build_object('error','Too many attempts. Try again in 15 minutes.'); end if;
 select id into gid from public.groups where invite_code=upper(trim(p_code)) for share;
 if gid is null then return jsonb_build_object('error','Invite code not found. Check the code with the group owner.'); end if;
 insert into public.memberships(group_id,user_id) values(gid,auth.uid()) on conflict do nothing;
 return jsonb_build_object('id',gid);
end $$;

create function public.manage_group(p_group uuid,p_action text,p_member uuid default null) returns void language plpgsql security definer set search_path = public as $$
declare owner uuid;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 select owner_id into owner from public.groups where id=p_group for update;
 if owner is null or not exists(select 1 from public.memberships where group_id=p_group and user_id=auth.uid()) then raise exception 'Group not found'; end if;
 if p_action='leave' then
  if owner=auth.uid() then raise exception 'As owner, delete the group instead of leaving'; end if;
  delete from public.memberships where group_id=p_group and user_id=auth.uid();
 elsif owner<>auth.uid() then raise exception 'Only the owner can do this';
 elsif p_action='rotate' then update public.groups set invite_code=upper(left(replace(gen_random_uuid()::text,'-',''),10)) where id=p_group;
 elsif p_action='remove' then
  if p_member=owner then raise exception 'Cannot remove the owner'; end if;
  delete from public.memberships where group_id=p_group and user_id=p_member;
 elsif p_action='delete' then delete from public.groups where id=p_group;
 else raise exception 'Unknown action'; end if;
end $$;

create function public.group_members(p_group uuid) returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
 if auth.uid() is null or not exists(select 1 from public.memberships where group_id=p_group and user_id=auth.uid()) then raise exception 'Group not found'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('user_id',p.id,'nickname',p.nickname,'avatar_url',p.avatar_url) order by p.nickname,p.id) from public.profiles p join public.memberships m on m.user_id=p.id where m.group_id=p_group),'[]'::jsonb);
end $$;
revoke execute on function public.group_members(uuid) from public,anon;
grant execute on function public.group_members(uuid) to authenticated;
revoke execute on function public.on_signup() from public,anon,authenticated;
revoke execute on function public.start_workout(),public.submit_reps(uuid,jsonb),public.finish_workout(uuid,integer),public.leaderboard(date,uuid),public.app_snapshot(),public.activity_on_date(date),public.update_profile(text,text),public.create_group(text),public.join_group(text),public.manage_group(uuid,text,uuid) from public,anon;
grant execute on function public.start_workout(),public.submit_reps(uuid,jsonb),public.finish_workout(uuid,integer),public.leaderboard(date,uuid),public.app_snapshot(),public.activity_on_date(date),public.update_profile(text,text),public.create_group(text),public.join_group(text),public.manage_group(uuid,text,uuid) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('avatars','avatars',true,2097152,array['image/webp']) on conflict(id) do nothing;
create policy avatar_insert on storage.objects for insert to authenticated with check(bucket_id='avatars' and name=auth.uid()::text||'/avatar.webp');
create policy avatar_update on storage.objects for update to authenticated using(bucket_id='avatars' and name=auth.uid()::text||'/avatar.webp') with check(bucket_id='avatars' and name=auth.uid()::text||'/avatar.webp');
create policy avatar_select on storage.objects for select to authenticated using(bucket_id='avatars' and name=auth.uid()::text||'/avatar.webp');
