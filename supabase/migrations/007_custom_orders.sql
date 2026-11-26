-- Phase 4: custom-order intake queue.
--
-- Customers who can't find what they need in the catalogue submit a request
-- through /templates/custom. Admins triage from /admin/custom-orders and
-- typically resolve by adding a Section/variant to the registry (which
-- benefits future customers) or by quoting a bespoke order.

create table if not exists public.custom_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  event_type text not null,
  brief text not null,
  contact_name text not null,
  contact_phone text not null,
  contact_email text,
  budget_band text,
  reference_links text,
  status text not null default 'new' check (status in ('new', 'in_review', 'quoted', 'closed_won', 'closed_lost')),
  admin_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists custom_orders_status_idx on public.custom_orders(status);
create index if not exists custom_orders_user_id_idx on public.custom_orders(user_id);

alter table public.custom_orders enable row level security;

-- Anyone (authenticated or not) can submit. The API route still validates the
-- payload and does the insert via the admin client, but having an insert
-- policy keeps RLS coherent if the row is ever touched from a user-scoped
-- client.
create policy "anyone can submit custom orders"
  on public.custom_orders for insert
  with check (true);

create policy "users can read own custom orders"
  on public.custom_orders for select
  using (auth.uid() = user_id);

create policy "admins manage custom orders"
  on public.custom_orders for all
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid() and users.role = 'admin'
    )
  );

-- Auto-bump updated_at when admin notes / status change.
create or replace function public.touch_custom_orders_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists custom_orders_touch_updated_at on public.custom_orders;
create trigger custom_orders_touch_updated_at
  before update on public.custom_orders
  for each row execute procedure public.touch_custom_orders_updated_at();
