-- Aura Tracker: run once in a Supabase project with email confirmation enabled.
-- Ownership comes from the validated JWT, never a client-supplied owner ID.
begin;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  dob date not null check (dob >= date '1900-01-01' and dob <= current_date),
  height_cm numeric(6,2) not null check (height_cm between 30 and 300),
  initial_weight_kg numeric(6,2) not null check (initial_weight_kg between 1 and 700),
  height_unit text not null check (height_unit in ('cm', 'ft')),
  weight_unit text not null check (weight_unit in ('kg', 'lb')),
  created_at timestamptz not null default now()
);
create table public.tracker_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade default auth.uid(),
  water_goal_ml numeric not null default 2000 check (water_goal_ml between 100 and 10000)
);
create table public.water_logs (
  id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  logged_at timestamptz not null,
  log_day date not null,
  amount_ml numeric not null check (amount_ml between 1 and 5000)
);
create table public.exercise_logs (
  id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  logged_at timestamptz not null,
  log_day date not null,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  sets integer not null check (sets between 1 and 100),
  reps integer not null check (reps between 1 and 1000),
  load_kg numeric not null check (load_kg between 0 and 1000)
);
create table public.weight_logs (
  user_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  log_day date not null,
  weight_kg numeric not null check (weight_kg between 1 and 700),
  primary key (user_id, log_day)
);
create index water_owner_date on public.water_logs (user_id, log_day, logged_at);
create index exercise_owner_date on public.exercise_logs (user_id, log_day, logged_at);

alter table public.profiles enable row level security;
alter table public.tracker_settings enable row level security;
alter table public.water_logs enable row level security;
alter table public.exercise_logs enable row level security;
alter table public.weight_logs enable row level security;

revoke all on public.profiles, public.tracker_settings, public.water_logs, public.exercise_logs, public.weight_logs from public, anon, authenticated;
grant select, insert on public.profiles to authenticated;
grant select, insert, update, delete on public.tracker_settings, public.water_logs, public.exercise_logs, public.weight_logs to authenticated;

create policy profile_read_own on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy profile_insert_own on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy settings_own on public.tracker_settings for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy water_own on public.water_logs for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy exercise_own on public.exercise_logs for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy weight_own on public.weight_logs for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create function public.complete_profile(p_profile jsonb, p_day date)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_user uuid := auth.uid(); v_result jsonb;
begin
  if v_user is null then raise exception 'Sign in required'; end if;
  -- A retry after a lost response must not create another initial weigh-in.
  select to_jsonb(p) into v_result from public.profiles p where p.id = v_user;
  if v_result is not null then return v_result; end if;
  if p_day is null or p_day < current_date - 2 or p_day > current_date + 2 then raise exception 'Invalid local date'; end if;
  insert into public.profiles (id, name, dob, height_cm, initial_weight_kg, height_unit, weight_unit)
  values (v_user, btrim(p_profile->>'name'), (p_profile->>'dob')::date, (p_profile->>'height_cm')::numeric, (p_profile->>'initial_weight_kg')::numeric, p_profile->>'height_unit', p_profile->>'weight_unit');
  insert into public.tracker_settings(user_id) values (v_user);
  insert into public.weight_logs(user_id, log_day, weight_kg) values (v_user, p_day, (p_profile->>'initial_weight_kg')::numeric);
  select to_jsonb(p) into v_result from public.profiles p where p.id = v_user;
  return v_result;
end $$;

create function public.get_tracker_data()
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'Sign in required'; end if;
  if not exists (select 1 from public.profiles where id = v_user) then raise exception 'Complete your profile first'; end if;
  return jsonb_build_object(
    'version', 1,
    'goalMl', coalesce((select water_goal_ml from public.tracker_settings where user_id = v_user), 2000),
    'water', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'at', logged_at, 'day', log_day, 'ml', amount_ml) order by logged_at, id) from public.water_logs where user_id = v_user), '[]'::jsonb),
    'exercises', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'at', logged_at, 'day', log_day, 'name', name, 'sets', sets, 'reps', reps, 'kg', load_kg) order by logged_at, id) from public.exercise_logs where user_id = v_user), '[]'::jsonb),
    'weights', coalesce((select jsonb_agg(jsonb_build_object('day', log_day, 'kg', weight_kg) order by log_day) from public.weight_logs where user_id = v_user), '[]'::jsonb)
  );
end $$;

create function public.apply_tracker_changes(p_changes jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'Sign in required'; end if;
  if not exists (select 1 from public.profiles where id = v_user) then raise exception 'Complete your profile first'; end if;
  if octet_length(p_changes::text) > 1000000 then raise exception 'Too many changes'; end if;
  if p_changes->>'goal_ml' is not null then
    insert into public.tracker_settings(user_id, water_goal_ml) values(v_user, (p_changes->>'goal_ml')::numeric)
    on conflict(user_id) do update set water_goal_ml = excluded.water_goal_ml;
  end if;
  delete from public.water_logs where user_id = v_user and id in (select value::uuid from jsonb_array_elements_text(p_changes->'water_remove'));
  delete from public.exercise_logs where user_id = v_user and id in (select value::uuid from jsonb_array_elements_text(p_changes->'exercise_remove'));
  delete from public.weight_logs where user_id = v_user and log_day in (select value::date from jsonb_array_elements_text(p_changes->'weight_remove'));
  insert into public.water_logs(id, user_id, logged_at, log_day, amount_ml)
    select x.id, v_user, x.at, x.day, x.ml from jsonb_to_recordset(p_changes->'water_upsert') as x(id uuid, at timestamptz, day date, ml numeric)
    on conflict(id) do update set logged_at = excluded.logged_at, log_day = excluded.log_day, amount_ml = excluded.amount_ml;
  insert into public.exercise_logs(id, user_id, logged_at, log_day, name, sets, reps, load_kg)
    select x.id, v_user, x.at, x.day, btrim(x.name), x.sets, x.reps, x.kg from jsonb_to_recordset(p_changes->'exercise_upsert') as x(id uuid, at timestamptz, day date, name text, sets integer, reps integer, kg numeric)
    on conflict(id) do update set logged_at = excluded.logged_at, log_day = excluded.log_day, name = excluded.name, sets = excluded.sets, reps = excluded.reps, load_kg = excluded.load_kg;
  insert into public.weight_logs(user_id, log_day, weight_kg)
    select v_user, x.day, x.kg from jsonb_to_recordset(p_changes->'weight_upsert') as x(day date, kg numeric)
    on conflict(user_id, log_day) do update set weight_kg = excluded.weight_kg;
end $$;

revoke all on function public.complete_profile(jsonb,date), public.get_tracker_data(), public.apply_tracker_changes(jsonb) from public, anon;
grant execute on function public.complete_profile(jsonb,date), public.get_tracker_data(), public.apply_tracker_changes(jsonb) to authenticated;
commit;
