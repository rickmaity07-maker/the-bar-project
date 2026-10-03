-- Bar-05 database schema (Neon Postgres). Applied by scripts/setup-db.mjs; safe to run again.

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null default '',
  password_hash text not null,
  role text not null default 'user' check (role in ('user', 'owner')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

create table if not exists sessions (
  token_hash text primary key,
  user_id uuid not null references users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists sessions_user_idx on sessions (user_id);

create table if not exists login_attempts (
  id bigserial primary key,
  email text not null,
  attempted_at timestamptz not null default now()
);
create index if not exists login_attempts_email_idx on login_attempts (email, attempted_at);

create table if not exists reservations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  phone text not null,
  email text not null default '',
  date date not null,
  time time not null,
  end_time time,
  guests integer not null,
  is_private boolean not null default false,
  occasion text not null default '',
  message text not null default '',
  locale text not null default 'de',
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'declined', 'cancelled')),
  admin_note text not null default '',
  updated_at timestamptz,
  updated_by uuid references users (id) on delete set null
);
create index if not exists reservations_date_idx on reservations (date, time);
create index if not exists reservations_status_idx on reservations (status);

create table if not exists menu_categories (
  id uuid primary key default gen_random_uuid(),
  sort integer not null default 0,
  name_de text not null,
  name_en text not null default '',
  line_de text not null default '',
  line_en text not null default '',
  visible boolean not null default true
);

create table if not exists menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references menu_categories (id) on delete cascade,
  sort integer not null default 0,
  name_de text not null,
  name_en text not null default '',
  note_de text not null default '',
  note_en text not null default '',
  price text not null,
  image text not null default '',
  visible boolean not null default true
);
create index if not exists menu_items_category_idx on menu_items (category_id, sort);

-- weekday follows JavaScript's Date.getDay(): 0 is Sunday, 6 is Saturday.
create table if not exists opening_hours (
  weekday integer primary key check (weekday between 0 and 6),
  closed boolean not null default false,
  opens time not null default '18:00',
  closes time not null default '00:00'
);

create table if not exists closed_dates (
  date date primary key,
  reason text not null default ''
);

create table if not exists activity_log (
  id bigserial primary key,
  at timestamptz not null default now(),
  user_id uuid references users (id) on delete set null,
  user_email text not null default '',
  action text not null,
  entity text not null default '',
  entity_id text not null default '',
  detail text not null default ''
);
create index if not exists activity_log_at_idx on activity_log (at desc);

-- Accounts book their own tables: a phone number on the profile and the booking's owner.
alter table users add column if not exists phone text not null default '';
alter table reservations add column if not exists user_id uuid references users (id) on delete set null;
create index if not exists reservations_user_idx on reservations (user_id);

-- Google sign-in: the Google account id; password_hash is '' for accounts that only use Google.
alter table users add column if not exists google_sub text unique;
