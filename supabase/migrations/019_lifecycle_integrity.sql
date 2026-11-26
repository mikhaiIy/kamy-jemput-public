-- Lifecycle integrity hardening (forward-only; supersedes only the RPC bodies
-- of migration 018, which stays applied as-is).
--
-- Two mutations carry BOTH same-row guards — `is_published = false` AND
-- `custom_data_draft is not null` — as predicates of the UPDATE statement
-- itself (not preceding reads or post-update checks):
--
-- 1. First publication (`finalize_paid_order`) promotes ONLY a live draft
--    marker. There is deliberately NO coalesce/fallback to the existing
--    `custom_data` snapshot: `cards.custom_data` must remain the immutable,
--    written-exactly-once first-publication snapshot. A missing or already-
--    consumed marker is an integrity failure (`CARD_NOT_PROMOTABLE`) that
--    surfaces through the existing retryable recovery path (webhook replay /
--    owner status polling return HTTP 500); it is remediated by support, never
--    silently papered over by publishing a stale snapshot or recreating draft
--    state. Successful promotion clears the marker in the same atomic UPDATE.
--
-- 2. Editing-only draft persistence (`update_card_draft_if_editing`) carries
--    the same two row predicates so a stale autosave can never recreate the
--    marker cleared by publication — recreating it would reopen replay
--    publication of a second "first" snapshot. Late saves against Published or
--    Unavailable cards simply match no row (the route maps that to HTTP 409).
--
-- Grants/revocations are restated because these functions stay executable
-- ONLY by service_role: trusted server code performs its own auth/ownership/
-- admin checks before calling.

-- Paid-order finalizer used by the Stripe webhook AND by owner status polling,
-- so a signed replay or a manual check can finish an interrupted Publishing
-- transition. Never re-publishes an Unavailable card and never recreates a
-- missing card: both are retryable/remediable failures, because rebuilding a
-- Card or publishing an old snapshot risks duplicate/malformed publications.
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
  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;
  if o.status is distinct from 'paid' then
    raise exception 'ORDER_NOT_PAID';
  end if;

  select * into c from public.cards where order_id = p_order_id for update;
  if not found then
    raise exception 'CARD_MISSING';
  end if;

  if c.is_published then
    return json_build_object('state', 'published', 'slug', c.slug, 'promoted', false);
  end if;

  -- Audit-read failure must fail the recovery operation, never default to
  -- "there was no disable".
  select action into v_last_action
    from public.card_availability_actions
   where card_id = c.id
   order by created_at desc, id desc
   limit 1;

  if v_last_action = 'disabled' then
    return json_build_object('state', 'unavailable', 'slug', c.slug, 'promoted', false);
  end if;

  -- First publication wins: promote the draft into the immutable snapshot.
  -- Both guards live ON the UPDATE: only a still-unpublished row that still
  -- carries a non-null draft marker is promotable, and the draft is copied
  -- WITHOUT any fallback to the previous snapshot.
  update public.cards set
    custom_data = c.custom_data_draft,
    custom_data_draft = null,
    is_published = true,
    published_at = coalesce(c.published_at, now())
  where id = c.id
    and is_published = false
    and custom_data_draft is not null;

  -- No fallback: a consumed/missing draft marker after the already-Published
  -- and Unavailable checks above is an integrity/remediation failure. The RPC
  -- aborts atomically (no partial write, no email side effect); webhook and
  -- status callers turn this into retryable HTTP 500.
  if not found then
    raise exception 'CARD_NOT_PROMOTABLE';
  end if;

  return json_build_object('state', 'published', 'slug', c.slug, 'promoted', true);
end;
$$;

-- Draft persistence is allowed only while the card is still atomically
-- Editing-with-a-live-draft: the related order remains unpaid AND the same two
-- row guards hold on the mutation itself, so a stale autosave arriving after
-- payment cannot recreate the draft marker cleared by first publication.
create or replace function public.update_card_draft_if_editing(p_card_id uuid, p_draft jsonb)
returns boolean
language plpgsql
as $$
begin
  update public.cards c
     set custom_data_draft = p_draft
   where c.id = p_card_id
     and c.is_published = false
     and c.custom_data_draft is not null
     and exists (
       select 1 from public.orders o
        where o.id = c.order_id
          and o.status <> 'paid'
     );
  return found;
end;
$$;

-- Functions are executable by PUBLIC by default — lock them to service_role.
revoke all on function public.finalize_paid_order(uuid) from public, anon, authenticated;
grant execute on function public.finalize_paid_order(uuid) to service_role;

revoke all on function public.update_card_draft_if_editing(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.update_card_draft_if_editing(uuid, jsonb) to service_role;
