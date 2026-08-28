
create type public.app_role as enum ('farmer','veterinarian','coop_admin','authority');
create type public.risk_category as enum ('No Risk','Low','Moderate','High');
create type public.reading_source as enum ('collar','manual','csv_import');

create table public.cooperatives (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);
grant select on public.cooperatives to authenticated;
grant all on public.cooperatives to service_role;
alter table public.cooperatives enable row level security;
create policy "coops readable by authenticated" on public.cooperatives for select to authenticated using (true);

create table public.farms (
  id uuid primary key default gen_random_uuid(),
  cooperative_id uuid not null references public.cooperatives(id) on delete cascade,
  name text not null,
  district text not null,
  gps_lat double precision,
  gps_lng double precision,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.farms to authenticated;
grant all on public.farms to service_role;
alter table public.farms enable row level security;

create table public.profiles (
  id uuid primary key,
  full_name text,
  phone text,
  farm_id uuid references public.farms(id) on delete set null,
  cooperative_id uuid references public.cooperatives(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile select" on public.profiles for select to authenticated using (id = auth.uid());
create policy "own profile insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "own roles select" on public.user_roles for select to authenticated using (user_id = auth.uid());

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create table public.vet_farm_assignments (
  id uuid primary key default gen_random_uuid(),
  vet_id uuid not null,
  farm_id uuid not null references public.farms(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (vet_id, farm_id)
);
grant select on public.vet_farm_assignments to authenticated;
grant all on public.vet_farm_assignments to service_role;
alter table public.vet_farm_assignments enable row level security;
create policy "own assignments select" on public.vet_farm_assignments for select to authenticated using (vet_id = auth.uid());

create or replace function public.can_view_farm(_user_id uuid, _farm_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select
    public.has_role(_user_id, 'authority')
    or exists (select 1 from public.profiles p where p.id = _user_id and p.farm_id = _farm_id)
    or exists (select 1 from public.vet_farm_assignments v where v.vet_id = _user_id and v.farm_id = _farm_id)
    or (public.has_role(_user_id, 'coop_admin') and exists (
          select 1 from public.farms f join public.profiles p on p.id = _user_id
          where f.id = _farm_id and f.cooperative_id = p.cooperative_id))
$$;

create or replace function public.can_edit_farm(_user_id uuid, _farm_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select
    (not public.has_role(_user_id, 'authority'))
    and public.can_view_farm(_user_id, _farm_id)
$$;

create policy "farms viewable" on public.farms for select to authenticated using (public.can_view_farm(auth.uid(), id));
create policy "farms editable" on public.farms for update to authenticated using (public.can_edit_farm(auth.uid(), id)) with check (public.can_edit_farm(auth.uid(), id));
create policy "farms insertable by admins" on public.farms for insert to authenticated with check (public.has_role(auth.uid(), 'coop_admin'));

create table public.animals (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  tag text not null unique,
  name text not null,
  breed text not null,
  age integer not null default 0,
  lactation_number integer not null default 0,
  vaccination_status boolean not null default false,
  disease_history jsonb not null default '[]'::jsonb,
  collar_device_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.animals to authenticated;
grant all on public.animals to service_role;
alter table public.animals enable row level security;
create policy "animals viewable" on public.animals for select to authenticated using (public.can_view_farm(auth.uid(), farm_id));
create policy "animals insertable" on public.animals for insert to authenticated with check (public.can_edit_farm(auth.uid(), farm_id));
create policy "animals updatable" on public.animals for update to authenticated using (public.can_edit_farm(auth.uid(), farm_id)) with check (public.can_edit_farm(auth.uid(), farm_id));
create policy "animals deletable" on public.animals for delete to authenticated using (public.can_edit_farm(auth.uid(), farm_id));

create or replace function public.can_view_animal(_user_id uuid, _animal_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.animals a where a.id = _animal_id and public.can_view_farm(_user_id, a.farm_id))
$$;

create or replace function public.can_edit_animal(_user_id uuid, _animal_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.animals a where a.id = _animal_id and public.can_edit_farm(_user_id, a.farm_id))
$$;

create table public.sensor_readings (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid not null references public.animals(id) on delete cascade,
  "timestamp" timestamptz not null default now(),
  body_temperature numeric(5,2),
  activity_level integer,
  rumination_minutes integer,
  milk_yield numeric(6,2),
  scc integer,
  battery_level integer,
  gps_lat double precision,
  gps_lng double precision,
  source public.reading_source not null default 'collar',
  created_at timestamptz not null default now()
);
create index sensor_readings_animal_ts on public.sensor_readings (animal_id, "timestamp" desc);
grant select, insert on public.sensor_readings to authenticated;
grant all on public.sensor_readings to service_role;
alter table public.sensor_readings enable row level security;
create policy "readings viewable" on public.sensor_readings for select to authenticated using (public.can_view_animal(auth.uid(), animal_id));
create policy "readings insertable" on public.sensor_readings for insert to authenticated with check (public.can_edit_animal(auth.uid(), animal_id));

create table public.predictions (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid not null references public.animals(id) on delete cascade,
  risk_score integer not null,
  risk_category public.risk_category not null,
  risk_factors jsonb not null default '[]'::jsonb,
  anomaly_flag boolean not null default false,
  anomaly_reason text,
  forecast_series jsonb not null default '[]'::jsonb,
  model_version text not null,
  predicted_at timestamptz not null default now()
);
create index predictions_animal_at on public.predictions (animal_id, predicted_at desc);
grant select on public.predictions to authenticated;
grant all on public.predictions to service_role;
alter table public.predictions enable row level security;
create policy "predictions viewable" on public.predictions for select to authenticated using (public.can_view_animal(auth.uid(), animal_id));

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid not null references public.animals(id) on delete cascade,
  prediction_id uuid references public.predictions(id) on delete set null,
  risk_category public.risk_category not null,
  anomaly boolean not null default false,
  actions jsonb not null default '[]'::jsonb,
  status text not null default 'open',
  acknowledged_by uuid,
  acknowledged_at timestamptz,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index alerts_animal_created on public.alerts (animal_id, created_at desc);
grant select, update on public.alerts to authenticated;
grant all on public.alerts to service_role;
alter table public.alerts enable row level security;
create policy "alerts viewable" on public.alerts for select to authenticated using (public.can_view_animal(auth.uid(), animal_id));
create policy "alerts updatable" on public.alerts for update to authenticated using (public.can_edit_animal(auth.uid(), animal_id)) with check (public.can_edit_animal(auth.uid(), animal_id));

create table public.treatment_records (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid not null references public.animals(id) on delete cascade,
  record_type text not null,
  value text,
  note text,
  recorded_at timestamptz not null default now(),
  created_by uuid,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.treatment_records to authenticated;
grant all on public.treatment_records to service_role;
alter table public.treatment_records enable row level security;
create policy "treatments viewable" on public.treatment_records for select to authenticated using (public.can_view_animal(auth.uid(), animal_id));
create policy "treatments insertable" on public.treatment_records for insert to authenticated with check (public.can_edit_animal(auth.uid(), animal_id));
create policy "treatments updatable" on public.treatment_records for update to authenticated using (public.can_edit_animal(auth.uid(), animal_id)) with check (public.can_edit_animal(auth.uid(), animal_id));

create table public.vet_recommendations (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid references public.animals(id) on delete cascade,
  domain text not null,
  text text not null,
  source text not null default 'Rule-based',
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.vet_recommendations to authenticated;
grant all on public.vet_recommendations to service_role;
alter table public.vet_recommendations enable row level security;
create policy "recommendations viewable" on public.vet_recommendations for select to authenticated
  using (animal_id is null or public.can_view_animal(auth.uid(), animal_id));
create policy "recommendations writable by vets" on public.vet_recommendations for insert to authenticated
  with check (public.has_role(auth.uid(), 'veterinarian') or public.has_role(auth.uid(), 'coop_admin'));
create policy "recommendations updatable by vets" on public.vet_recommendations for update to authenticated
  using (public.has_role(auth.uid(), 'veterinarian') or public.has_role(auth.uid(), 'coop_admin'))
  with check (public.has_role(auth.uid(), 'veterinarian') or public.has_role(auth.uid(), 'coop_admin'));
create policy "recommendations deletable by vets" on public.vet_recommendations for delete to authenticated
  using (public.has_role(auth.uid(), 'veterinarian') or public.has_role(auth.uid(), 'coop_admin'));

create table public.gateway_api_keys (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  key_hash text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
grant all on public.gateway_api_keys to service_role;
alter table public.gateway_api_keys enable row level security;

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  entity text not null,
  entity_id uuid,
  action text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
grant select, insert on public.audit_log to authenticated;
grant all on public.audit_log to service_role;
alter table public.audit_log enable row level security;
create policy "audit readable by authority and admins" on public.audit_log for select to authenticated
  using (public.has_role(auth.uid(), 'authority') or public.has_role(auth.uid(), 'coop_admin'));
create policy "audit insertable by self" on public.audit_log for insert to authenticated with check (actor_id = auth.uid());

create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;
create trigger animals_touch before update on public.animals for each row execute function public.touch_updated_at();
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger recs_touch before update on public.vet_recommendations for each row execute function public.touch_updated_at();

alter publication supabase_realtime add table public.alerts;
alter publication supabase_realtime add table public.predictions;

-- ============ SEED DEMO DATA ============
insert into public.cooperatives (id, name) values
  ('11111111-1111-1111-1111-111111111111','Bharat Dairy Cooperative');

insert into public.farms (id, cooperative_id, name, district, gps_lat, gps_lng) values
  ('a0000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','Ganga Dairy Co-op','Anand, Gujarat',22.55,72.95),
  ('a0000000-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','Kaveri Milk Union','Erode, Tamil Nadu',11.34,77.72),
  ('a0000000-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','Yamuna Farms','Karnal, Haryana',29.68,76.99),
  ('a0000000-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','Deccan Herd Collective','Pune, Maharashtra',18.52,73.85);

with names as (
  select * from (values
    ('Lakshmi',0),('Ganga',1),('Nandini',2),('Kamdhenu',3),('Sheela',4),('Radha',5),
    ('Meera',6),('Tulsi',7),('Parvati',8),('Saras',9),('Chandni',10),('Bhoomi',11),
    ('Kaveri',12),('Amba',13),('Rukmini',14),('Savitri',15),('Damini',16),('Ila',17),
    ('Padma',18),('Sundari',19),('Roopa',20),('Vasu',21),('Gauri',22),('Netra',23)
  ) as t(nm, idx)
), farm_list as (
  select id, row_number() over (order by name) - 1 as fidx from public.farms
)
insert into public.animals (farm_id, tag, name, breed, age, lactation_number, vaccination_status, disease_history, collar_device_id)
select f.id,
  'IN-F' || (n.idx % 4 + 1) || '-' || (1200 + n.idx * 7),
  n.nm,
  (array['Gir','Sahiwal','Holstein Friesian Cross','Jersey Cross','Red Sindhi','Tharparkar'])[(n.idx % 6) + 1],
  3 + (n.idx % 8),
  1 + (n.idx % 5),
  (n.idx % 4) <> 0,
  case when n.idx % 3 = 0
    then to_jsonb(array[(array['Subclinical mastitis (2025)','Clinical mastitis (2024)','Foot rot','Milk fever','Ketosis'])[(n.idx % 5) + 1]])
    else '[]'::jsonb end,
  'CLR-' || (8000 + n.idx * 13)
from names n join farm_list f on f.fidx = n.idx % 4;

with a as (
  select id, ((abs(hashtext(id::text)) % 100)::numeric / 100.0) as stress from public.animals
)
insert into public.sensor_readings (animal_id, "timestamp", body_temperature, activity_level, rumination_minutes, milk_yield, scc, source)
select a.id,
  (current_date - (29 - d))::timestamp at time zone 'UTC' + interval '8 hours',
  round((38.4 + drift * 1.6 + ((abs(hashtext(a.id::text || d::text)) % 30)::numeric / 100.0) - 0.15)::numeric, 2),
  round(72 - drift * 26 + ((abs(hashtext(a.id::text || d::text || 'a')) % 8) - 4))::int,
  round(470 - drift * 110 + ((abs(hashtext(a.id::text || d::text || 'r')) % 30) - 15))::int,
  round((14.5 - drift * 4.2 + ((abs(hashtext(a.id::text || d::text || 'm')) % 14)::numeric / 10.0) - 0.7)::numeric, 1),
  round(160 + drift * 620 + (abs(hashtext(a.id::text || d::text || 's')) % 60))::int,
  'collar'
from a
cross join generate_series(0, 29) as d
cross join lateral (select case when a.stress > 0.55 then (d::numeric / 29.0) * a.stress else 0::numeric end as drift) x;

with daily as (
  select sr.animal_id, sr."timestamp", sr.body_temperature, sr.scc, sr.milk_yield, sr.rumination_minutes,
         row_number() over (partition by sr.animal_id order by sr."timestamp" desc) as rn
  from public.sensor_readings sr
), scored as (
  select d.*, greatest(0, least(100, round(12 + (d.body_temperature - 38.4) * 34 + (d.scc - 160) / 9.0)))::int as score
  from daily d where d.rn <= 14
)
insert into public.predictions (animal_id, risk_score, risk_category, risk_factors, anomaly_flag, anomaly_reason, forecast_series, model_version, predicted_at)
select s.animal_id, s.score,
  (case when s.score >= 75 then 'High' when s.score >= 50 then 'Moderate' when s.score >= 25 then 'Low' else 'No Risk' end)::public.risk_category,
  jsonb_build_array(
    jsonb_build_object('factor', 'Body temperature ' || round(s.body_temperature - 38.5, 2) || 'C vs baseline',
      'contribution_value', round((s.body_temperature - 38.5) * 0.21, 3),
      'direction', case when s.body_temperature >= 38.5 then 'increases' else 'decreases' end),
    jsonb_build_object('factor', 'SCC at ' || s.scc || 'k cells/ml',
      'contribution_value', round(((s.scc - 200)::numeric / 1000) * 0.9, 3),
      'direction', case when s.scc > 200 then 'increases' else 'decreases' end),
    jsonb_build_object('factor', 'Rumination ' || s.rumination_minutes || ' min/day',
      'contribution_value', round((470 - s.rumination_minutes)::numeric * 0.0015, 3),
      'direction', case when s.rumination_minutes < 470 then 'increases' else 'decreases' end),
    jsonb_build_object('factor', 'Milk yield ' || s.milk_yield || ' L/day',
      'contribution_value', round((14.5 - s.milk_yield) * 0.02, 3),
      'direction', case when s.milk_yield < 14.5 then 'increases' else 'decreases' end)
  ),
  (s.rn = 1 and s.score > 70 and (abs(hashtext(s.animal_id::text)) % 5) = 0),
  case when (s.rn = 1 and s.score > 70 and (abs(hashtext(s.animal_id::text)) % 5) = 0)
    then 'Isolation Forest: irregular activity/rumination pattern not seen in training distribution' else null end,
  case when s.rn = 1 then (
    select jsonb_agg(jsonb_build_object(
      'day', g,
      'date', to_char((current_date + g)::date, 'YYYY-MM-DD'),
      'risk_score', greatest(0, least(100, round(s.score + case when g <= 0 then -(abs(g) * s.score / 34.0) else g * (case when s.score > 45 then 1.5 else 0.4 end) end)))::int,
      'segment', case when g <= 0 then 'observed' else 'forecast' end) order by g)
    from generate_series(-13, 14) as g)
  else '[]'::jsonb end,
  'tft-xgb-v2.4.1-seed',
  s."timestamp"
from scored s;

insert into public.alerts (animal_id, prediction_id, risk_category, anomaly, actions, status, created_at)
select p.animal_id, p.id, p.risk_category, p.anomaly_flag,
  case p.risk_category
    when 'High' then '["Isolate animal from milking line","Notify veterinarian today","Collect milk sample for CMT/SCC"]'::jsonb
    else '["Check milking hygiene & teat dipping","Re-test SCC in 48 hours","Monitor temperature twice daily"]'::jsonb
  end,
  'open', p.predicted_at
from (
  select distinct on (animal_id) * from public.predictions order by animal_id, predicted_at desc
) p
where p.risk_category in ('Moderate','High') or p.anomaly_flag;

insert into public.vet_recommendations (animal_id, domain, text, source) values
  (null,'Milking hygiene','Pre- and post-dip every teat with 0.5% iodine; use a single-use cloth per animal.','Rule-based'),
  (null,'Milking hygiene','Milk high-risk animals last and disinfect the cluster between animals.','AI'),
  (null,'Nutrition','Supplement selenium + vitamin E during peak lactation to support udder immunity.','AI'),
  (null,'Housing','Keep bedding dry; replace wet bedding twice daily during monsoon.','Rule-based'),
  (null,'Biosecurity','Quarantine newly purchased animals for 14 days with SCC screening before herd entry.','Rule-based');
