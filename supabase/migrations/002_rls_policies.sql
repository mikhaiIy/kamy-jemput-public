-- Row Level Security policies

-- Users table
alter table public.users enable row level security;

create policy "users can read own row"
  on public.users for select
  using (auth.uid() = id);

create policy "users can update own row"
  on public.users for update
  using (auth.uid() = id);

-- Templates table (public read)
alter table public.templates enable row level security;

create policy "anyone can read active templates"
  on public.templates for select
  using (is_active = true);

create policy "admins can manage templates"
  on public.templates for all
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid() and users.role = 'admin'
    )
  );

-- Orders table
alter table public.orders enable row level security;

create policy "users can read own orders"
  on public.orders for select
  using (auth.uid() = user_id);

create policy "users can insert own orders"
  on public.orders for insert
  with check (auth.uid() = user_id);

create policy "admins can read all orders"
  on public.orders for select
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid() and users.role = 'admin'
    )
  );

-- Cards table
alter table public.cards enable row level security;

create policy "published cards are publicly readable"
  on public.cards for select
  using (is_published = true);

create policy "owners can read own cards"
  on public.cards for select
  using (auth.uid() = user_id);

create policy "owners can update own cards"
  on public.cards for update
  using (auth.uid() = user_id);

create policy "admins can manage all cards"
  on public.cards for all
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid() and users.role = 'admin'
    )
  );

-- RSVP responses
alter table public.rsvp_responses enable row level security;

create policy "anyone can submit rsvp"
  on public.rsvp_responses for insert
  with check (true);

create policy "card owners can read rsvp"
  on public.rsvp_responses for select
  using (
    exists (
      select 1 from public.cards
      where cards.id = card_id and cards.user_id = auth.uid()
    )
  );

create policy "admins can read all rsvp"
  on public.rsvp_responses for select
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid() and users.role = 'admin'
    )
  );
