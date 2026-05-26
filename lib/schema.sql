-- Use gen_random_uuid() instead of uuid-ossp
-- Drivers
create table drivers (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now(),
  name text not null,
  email text unique not null,
  phone text,
  license_number text,
  truck_number text,
  trailer_number text,
  status text default 'active' check (status in ('active', 'inactive')),
  auth_id uuid references auth.users(id) on delete set null
);

-- Customers
create table customers (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now(),
  name text not null,
  active boolean default true
);

-- Load Tickets
create table tickets (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  driver_id uuid references drivers(id) on delete set null,
  customer_id uuid references customers(id) on delete set null,
  customer_name text,
  load_id text,
  bol_number text,
  date date not null,
  truck_number text,
  trailer_number text,
  location_loaded text,
  po_number text,
  sand_type text,
  arrival_time timestamp with time zone,
  departed_time timestamp with time zone,
  boxes jsonb default '[]',
  status text default 'started' check (status in ('started', 'submitted', 'approved', 'rejected')),
  synced boolean default true,
  notes text
);

-- Time Sheets
create table timesheets (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now(),
  driver_id uuid references drivers(id) on delete set null,
  log_type text not null check (log_type in ('working', 'time_off', 'broke_down')),
  location text,
  date date not null,
  start_time time not null,
  end_time time,
  odometer_start integer,
  odometer_end integer,
  state_miles jsonb default '[]',
  status text default 'started' check (status in ('started', 'submitted')),
  synced boolean default true
);

-- Maintenance Logs
create table maintenance (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now(),
  driver_id uuid references drivers(id) on delete set null,
  truck_number text,
  trailer_number text,
  issue text not null,
  severity text default 'low' check (severity in ('low', 'medium', 'high')),
  status text default 'open' check (status in ('open', 'in_progress', 'resolved')),
  resolved_at timestamp with time zone,
  notes text,
  synced boolean default true
);

-- RLS
alter table drivers enable row level security;
alter table customers enable row level security;
alter table tickets enable row level security;
alter table timesheets enable row level security;
alter table maintenance enable row level security;

-- DRIVERS policies
create policy "drivers_select_own" on drivers
  for select using (auth.uid() = auth_id);

create policy "drivers_update_own" on drivers
  for update using (auth.uid() = auth_id);

-- CUSTOMERS policies (any authenticated user can read/insert)
create policy "customers_select" on customers
  for select using (auth.uid() is not null);

create policy "customers_insert" on customers
  for insert with check (auth.uid() is not null);

-- TICKETS policies
create policy "tickets_select" on tickets
  for select using (
    driver_id in (select id from drivers where auth_id = auth.uid())
  );

create policy "tickets_insert" on tickets
  for insert with check (
    driver_id in (select id from drivers where auth_id = auth.uid())
  );

create policy "tickets_update" on tickets
  for update using (
    driver_id in (select id from drivers where auth_id = auth.uid())
  );

-- TIMESHEETS policies
create policy "timesheets_select" on timesheets
  for select using (
    driver_id in (select id from drivers where auth_id = auth.uid())
  );

create policy "timesheets_insert" on timesheets
  for insert with check (
    driver_id in (select id from drivers where auth_id = auth.uid())
  );

create policy "timesheets_update" on timesheets
  for update using (
    driver_id in (select id from drivers where auth_id = auth.uid())
  );

-- MAINTENANCE policies
create policy "maintenance_select" on maintenance
  for select using (
    driver_id in (select id from drivers where auth_id = auth.uid())
  );

create policy "maintenance_insert" on maintenance
  for insert with check (
    driver_id in (select id from drivers where auth_id = auth.uid())
  );
