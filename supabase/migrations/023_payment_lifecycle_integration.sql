-- Integrate first-payment-wins publication with the invitation lifecycle.
-- Migration 021 restricts visibility changes to guarded database functions.
-- Migrations 019 and 020 add recovery and administrator availability changes.
-- These final definitions keep both guarantees and retain the global
-- order-then-card lock order.

create or replace function public.finalize_paid_order(p_order_id uuid)
returns json
language plpgsql
as $$
declare
  o public.orders%rowtype;
  c public.cards%rowtype;
  v_last_action text;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if o.status is distinct from 'paid' then raise exception 'ORDER_NOT_PAID'; end if;

  select * into c from public.cards where order_id = p_order_id for update;
  if not found then raise exception 'CARD_MISSING'; end if;

  if c.is_published then
    return json_build_object('state', 'published', 'slug', c.slug, 'promoted', false);
  end if;

  select action into v_last_action
    from public.card_availability_actions
   where card_id = c.id
   order by created_at desc, id desc
   limit 1;

  if v_last_action = 'disabled' then
    return json_build_object('state', 'unavailable', 'slug', c.slug, 'promoted', false);
  end if;

  perform set_config('app.payment_completion', 'on', true);
  update public.cards set
    custom_data = c.custom_data_draft,
    custom_data_draft = null,
    is_published = true,
    published_at = coalesce(c.published_at, now())
  where id = c.id
    and is_published = false
    and custom_data_draft is not null;

  if not found then raise exception 'CARD_NOT_PROMOTABLE'; end if;

  return json_build_object('state', 'published', 'slug', c.slug, 'promoted', true);
end;
$$;

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
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;

  select * into c from public.cards where id = p_card_id for update;
  if not found or c.order_id is distinct from o.id then raise exception 'CARD_NOT_FOUND'; end if;
  if o.status is distinct from 'paid' then raise exception 'UNPAID'; end if;

  select action into v_last_action
    from public.card_availability_actions
   where card_id = c.id
   order by created_at desc, id desc
   limit 1;

  perform set_config('app.payment_completion', 'on', true);

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

revoke all on function public.finalize_paid_order(uuid) from public, anon, authenticated;
grant execute on function public.finalize_paid_order(uuid) to service_role;

revoke all on function public.set_card_availability(uuid, uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.set_card_availability(uuid, uuid, text, text)
  to service_role;
