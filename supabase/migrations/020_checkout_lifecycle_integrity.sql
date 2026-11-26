-- Checkout reservation integrity. A reservation is a durable payment-workflow
-- guard, not a customer-visible lifecycle state. Every multi-row operation
-- below locks the order before its card.

alter table public.orders
  add column if not exists checkout_reservation_token uuid,
  add column if not exists checkout_reserved_at timestamptz,
  add column if not exists stripe_session_expires_at timestamptz;

-- Stop rather than silently picking a winner if historical data cannot satisfy
-- the one-order/one-card and one-order/one-Checkout-Session invariants.
do $$
begin
  if exists (
    select 1 from public.cards where order_id is not null group by order_id having count(*) > 1
  ) then
    raise exception 'DUPLICATE_CARD_ORDER_BINDINGS';
  end if;
  if exists (
    select 1 from public.orders where stripe_session_id is not null group by stripe_session_id having count(*) > 1
  ) then
    raise exception 'DUPLICATE_STRIPE_SESSION_BINDINGS';
  end if;
end;
$$;

create unique index if not exists cards_one_card_per_order_idx
  on public.cards(order_id) where order_id is not null;
create unique index if not exists orders_one_stripe_session_idx
  on public.orders(stripe_session_id) where stripe_session_id is not null;

-- Creates the pre-payment pair as one transaction, sourced only from an active
-- Section-v2 template. The caller supplies the collision-resistant URL slug.
create or replace function public.create_draft_order_and_card(
  p_template_id text,
  p_owner uuid,
  p_slug text
) returns json
language plpgsql
as $$
declare
  t public.templates%rowtype;
  o public.orders%rowtype;
  c public.cards%rowtype;
  v_data jsonb;
begin
  select * into t from public.templates
   where id = p_template_id and is_active = true
   for share;
  if not found or t.theme is null or t.sections is null then
    raise exception 'ACTIVE_V2_TEMPLATE_NOT_FOUND';
  end if;

  v_data := jsonb_build_object(
    'templateId', t.id, 'theme', t.theme, 'sections', t.sections, 'schemaVersion', 2
  );
  insert into public.orders (user_id, template_id, status, price_myr, custom_data)
    values (p_owner, t.id, 'pending', t.price_myr, v_data)
    returning * into o;
  insert into public.cards (
    order_id, user_id, template_id, slug, custom_data, custom_data_draft, is_published
  ) values (o.id, p_owner, t.id, p_slug, v_data, v_data, false)
    returning * into c;
  return json_build_object('orderId', o.id, 'cardId', c.id, 'slug', c.slug);
end;
$$;

-- Draft persistence takes the same order-then-card locks as every other
-- lifecycle operation. Its UPDATE retains migration 019's same-row guards, so
-- neither a late autosave nor a concurrent payment can recreate a consumed
-- draft marker.
create or replace function public.update_card_draft_if_editing(p_card_id uuid, p_draft jsonb)
returns boolean
language plpgsql
as $$
declare
  v_order_id uuid;
  o public.orders%rowtype;
  c public.cards%rowtype;
begin
  -- This discovery read takes no lock; every lock acquisition below follows
  -- the global order-then-card rule.
  select order_id into v_order_id from public.cards where id = p_card_id;
  if not found or v_order_id is null then return false; end if;
  select * into o from public.orders where id = v_order_id for update;
  if not found or o.status = 'paid' then return false; end if;
  select * into c from public.cards where id = p_card_id for update;
  if not found or c.order_id is distinct from o.id then return false; end if;

  update public.cards
     set custom_data_draft = p_draft
   where id = c.id
     and is_published = false
     and custom_data_draft is not null
     and exists (
       select 1 from public.orders locked_order
        where locked_order.id = o.id and locked_order.status <> 'paid'
     );
  return found;
end;
$$;

-- Reserves an exact editable pair before Stripe is contacted. Repeated calls
-- return the same reservation, including an unbound one after a network error.
create or replace function public.reserve_checkout(p_order_id uuid, p_owner uuid)
returns json
language plpgsql
as $$
declare
  o public.orders%rowtype;
  c public.cards%rowtype;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found or o.user_id is distinct from p_owner then
    raise exception 'ORDER_NOT_FOUND';
  end if;
  select * into c from public.cards where order_id = o.id for update;
  if not found then raise exception 'CARD_MISSING'; end if;
  if o.status = 'paid' then raise exception 'ORDER_PAID'; end if;
  if c.is_published or c.custom_data_draft is null then raise exception 'CARD_NOT_EDITING'; end if;

  if o.checkout_reservation_token is null then
    update public.orders
       set checkout_reservation_token = gen_random_uuid(), checkout_reserved_at = now()
     where id = o.id
     returning * into o;
  end if;
  return json_build_object(
    'reservationToken', o.checkout_reservation_token,
    'stripeSessionId', o.stripe_session_id,
    'stripeSessionExpiresAt', o.stripe_session_expires_at,
    'priceMyr', o.price_myr,
    'templateId', o.template_id
  );
end;
$$;

-- Bind a Stripe result only to the reservation that requested it. It is safe
-- for an idempotent retry to attach the same Session again.
create or replace function public.attach_checkout_session(
  p_order_id uuid, p_owner uuid, p_reservation_token uuid,
  p_stripe_session_id text, p_stripe_session_expires_at timestamptz
) returns boolean
language plpgsql
as $$
declare
  o public.orders%rowtype;
  c public.cards%rowtype;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found or o.user_id is distinct from p_owner then return false; end if;
  select * into c from public.cards where order_id = o.id for update;
  if not found or o.status = 'paid' or c.is_published then return false; end if;
  if o.checkout_reservation_token is distinct from p_reservation_token then return false; end if;
  if o.stripe_session_id is not null and o.stripe_session_id is distinct from p_stripe_session_id then
    return false;
  end if;
  update public.orders set
    stripe_session_id = p_stripe_session_id,
    stripe_session_expires_at = p_stripe_session_expires_at
  where id = o.id;
  return true;
end;
$$;

-- The caller must first obtain Stripe confirmation that this exact Session is
-- expired or cancelled. An unbound reservation is deliberately never released:
-- it could be a Stripe create response the server did not receive.
create or replace function public.release_checkout_reservation(
  p_order_id uuid, p_owner uuid, p_reservation_token uuid, p_stripe_session_id text
) returns boolean
language plpgsql
as $$
declare
  o public.orders%rowtype;
  c public.cards%rowtype;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found or o.user_id is distinct from p_owner then return false; end if;
  select * into c from public.cards where order_id = o.id for update;
  if not found or o.status = 'paid' then return false; end if;
  if o.checkout_reservation_token is distinct from p_reservation_token
     or o.stripe_session_id is distinct from p_stripe_session_id then return false; end if;
  update public.orders set checkout_reservation_token = null, checkout_reserved_at = null,
    stripe_session_id = null, stripe_session_expires_at = null where id = o.id;
  return true;
end;
$$;

-- Payment is accepted only for an already-persisted Checkout Session. Metadata
-- is checked by the webhook but never used as the database lookup authority.
create or replace function public.record_paid_checkout_session(p_stripe_session_id text)
returns json
language plpgsql
as $$
declare
  o public.orders%rowtype;
  c public.cards%rowtype;
begin
  select * into o from public.orders where stripe_session_id = p_stripe_session_id for update;
  if not found then raise exception 'CHECKOUT_SESSION_NOT_FOUND'; end if;
  select * into c from public.cards where order_id = o.id for update;
  if not found then raise exception 'CARD_MISSING'; end if;
  if o.status <> 'paid' then update public.orders set status = 'paid' where id = o.id; end if;
  return json_build_object('orderId', o.id);
end;
$$;

-- Editing deletion is still supported, but never through an active or ambiguous
-- payment reservation. The Stripe-confirmed release function above clears a
-- bound safe reservation before this routine can delete the pair.
create or replace function public.delete_card_if_editing(p_card_id uuid, p_owner uuid)
returns boolean
language plpgsql
as $$
declare
  c public.cards%rowtype;
  o public.orders%rowtype;
begin
  select * into c from public.cards where id = p_card_id;
  if not found or c.user_id is distinct from p_owner or c.order_id is null then return false; end if;
  select * into o from public.orders where id = c.order_id for update;
  if not found then return false; end if;
  select * into c from public.cards where id = p_card_id for update;
  if o.status = 'paid' or o.checkout_reservation_token is not null or c.is_published then return false; end if;
  delete from public.orders where id = o.id;
  return true;
end;
$$;

create or replace function public.prevent_protected_order_delete()
returns trigger language plpgsql as $$
begin
  if old.status = 'paid' or old.checkout_reservation_token is not null then
    raise exception 'PROTECTED_ORDER_DELETE';
  end if;
  return old;
end;
$$;
drop trigger if exists orders_prevent_protected_delete on public.orders;
create trigger orders_prevent_protected_delete before delete on public.orders
for each row execute function public.prevent_protected_order_delete();

create or replace function public.prevent_protected_card_delete()
returns trigger language plpgsql as $$
declare o public.orders%rowtype;
begin
  if old.order_id is not null then
    select * into o from public.orders where id = old.order_id;
    if found and (o.status = 'paid' or o.checkout_reservation_token is not null) then
      raise exception 'PROTECTED_CARD_DELETE';
    end if;
  end if;
  return old;
end;
$$;
drop trigger if exists cards_prevent_protected_delete on public.cards;
create trigger cards_prevent_protected_delete before delete on public.cards
for each row execute function public.prevent_protected_card_delete();

-- Availability transitions also follow order-then-card locking, preventing a
-- payment finalizer from deadlocking with an administrator action.
create or replace function public.set_card_availability(
  p_card_id uuid, p_admin_id uuid, p_action text, p_reason text default null
) returns json
language plpgsql
as $$
declare
  v_order_id uuid;
  o public.orders%rowtype;
  c public.cards%rowtype;
  v_last_action text;
begin
  if p_action not in ('disabled', 'restored') then raise exception 'INVALID_ACTION'; end if;
  select order_id into v_order_id from public.cards where id = p_card_id;
  if not found or v_order_id is null then raise exception 'CARD_NOT_FOUND'; end if;
  select * into o from public.orders where id = v_order_id for update;
  select * into c from public.cards where id = p_card_id for update;
  if not found then raise exception 'CARD_NOT_FOUND'; end if;
  if c.order_id is distinct from o.id or o.status is distinct from 'paid' then
    raise exception 'UNPAID';
  end if;
  select action into v_last_action from public.card_availability_actions
   where card_id = c.id order by created_at desc, id desc limit 1;
  if p_action = 'disabled' then
    if not c.is_published then raise exception 'NOT_PUBLISHED'; end if;
    if coalesce(btrim(p_reason), '') = '' then raise exception 'REASON_REQUIRED'; end if;
    insert into public.card_availability_actions (card_id, admin_id, action, reason)
      values (c.id, p_admin_id, 'disabled', btrim(p_reason));
    update public.cards set is_published = false where id = c.id;
    return json_build_object('is_published', false, 'action', 'disabled');
  end if;
  if c.is_published then raise exception 'ALREADY_PUBLISHED'; end if;
  if v_last_action is distinct from 'disabled' then raise exception 'NOT_DISABLED'; end if;
  insert into public.card_availability_actions (card_id, admin_id, action, reason)
    values (c.id, p_admin_id, 'restored', nullif(btrim(coalesce(p_reason, '')), ''));
  update public.cards set is_published = true where id = c.id;
  return json_build_object('is_published', true, 'action', 'restored');
end;
$$;

-- The old anonymous policy exposed any public-looking unpaid row.
drop policy if exists "published cards are publicly readable" on public.cards;
create policy "paid published cards are publicly readable" on public.cards
for select to anon using (
  is_published = true and exists (
    select 1 from public.orders o where o.id = cards.order_id and o.status = 'paid'
  )
);

revoke all on function public.create_draft_order_and_card(text, uuid, text) from public, anon, authenticated;
revoke all on function public.reserve_checkout(uuid, uuid) from public, anon, authenticated;
revoke all on function public.attach_checkout_session(uuid, uuid, uuid, text, timestamptz) from public, anon, authenticated;
revoke all on function public.release_checkout_reservation(uuid, uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.record_paid_checkout_session(text) from public, anon, authenticated;
revoke all on function public.update_card_draft_if_editing(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.delete_card_if_editing(uuid, uuid) from public, anon, authenticated;
grant execute on function public.create_draft_order_and_card(text, uuid, text),
  public.reserve_checkout(uuid, uuid),
  public.attach_checkout_session(uuid, uuid, uuid, text, timestamptz),
  public.release_checkout_reservation(uuid, uuid, uuid, text),
  public.record_paid_checkout_session(text),
  public.update_card_draft_if_editing(uuid, jsonb),
  public.delete_card_if_editing(uuid, uuid)
  to service_role;
