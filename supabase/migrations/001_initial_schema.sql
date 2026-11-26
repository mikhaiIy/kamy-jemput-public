-- Enable pgcrypto for gen_random_uuid()
create extension if not exists "pgcrypto";

-- Users table (mirrors auth.users)
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  phone text,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz default now()
);

-- Templates table (seed data added separately)
create table public.templates (
  id text primary key,
  name text not null,
  category text not null check (category in ('wedding', 'birthday', 'corporate')),
  thumbnail_url text,
  price_myr integer not null default 3000,
  is_active boolean default true,
  config_schema jsonb
);

-- Orders table
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  template_id text references public.templates(id),
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed')),
  stripe_session_id text,
  price_myr integer not null,
  custom_data jsonb,
  created_at timestamptz default now()
);

-- Cards table
create table public.cards (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  template_id text references public.templates(id),
  slug text unique not null,
  custom_data jsonb not null default '{}',
  is_published boolean default false,
  published_at timestamptz,
  created_at timestamptz default now()
);

-- RSVP responses table
create table public.rsvp_responses (
  id uuid primary key default gen_random_uuid(),
  card_id uuid references public.cards(id) on delete cascade,
  guest_name text not null,
  guest_contact text,
  attending boolean not null,
  pax integer default 1 check (pax >= 1 and pax <= 20),
  message text,
  created_at timestamptz default now()
);

-- Trigger: automatically insert into users when auth.users gets a new row
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Seed templates
insert into public.templates (id, name, category, thumbnail_url, price_myr) values
  ('malay-wedding', 'Malay Wedding Classic', 'wedding', '/templates/malay-wedding/thumb.jpg', 3500),
  ('chinese-wedding', 'Chinese Wedding Red', 'wedding', '/templates/chinese-wedding/thumb.jpg', 3500),
  ('minimalist', 'Modern Minimalist', 'wedding', '/templates/minimalist/thumb.jpg', 3000),
  ('birthday', 'Birthday Celebration', 'birthday', '/templates/birthday/thumb.jpg', 2500),
  ('corporate', 'Corporate Event', 'corporate', '/templates/corporate/thumb.jpg', 4000);
