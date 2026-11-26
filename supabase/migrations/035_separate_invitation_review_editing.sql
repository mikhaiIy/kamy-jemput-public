-- Separate invitation editing from manual payment review.
--
-- Manual receipts, evidence, review decisions and their frozen snapshots are
-- payment records. They remain append-only and are not changed when the owner
-- saves invitation content. The live unpublished draft is a separate editing
-- surface and remains writable for its owner while a pending or insufficient
-- manual attempt is under review.
--
-- This additive correction replaces only the two card-trigger draft locks.
-- Payment concurrency, Stripe/manual handoff, publication, template and
-- deletion/audit protections remain in force.

-- Legacy DuitNow submissions still protect the card from deletion once any
-- submission exists, but no longer freeze the owner's live invitation draft
-- while that submission awaits review.
create or replace function public.cards_payment_lifecycle_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if coalesce(current_setting('app.paid_draft_publication', true), '') = 'on' then
    if TG_OP = 'DELETE' then return old; end if;
    return new;
  end if;

  if coalesce(current_setting('app.payment_completion', true), '') = 'on' then
    if TG_OP = 'DELETE' then return old; end if;
    return new;
  end if;

  if TG_OP = 'INSERT' and new.is_published is true then
    raise exception 'PUBLICATION_PAYMENT_ONLY' using errcode = 'check_violation';
  end if;

  if TG_OP = 'UPDATE' and new.is_published is distinct from old.is_published then
    raise exception 'PUBLICATION_PAYMENT_ONLY' using errcode = 'check_violation';
  end if;

  if TG_OP = 'DELETE' then
    if exists (
      select 1 from public.orders
      where id = old.order_id and status = 'paid'
    ) then
      raise exception 'PAID_CARD_PROTECTED' using errcode = 'restrict_violation';
    end if;
    if exists (
      select 1 from public.duitnow_transfer_submissions s
      where s.order_id = old.order_id
    ) then
      raise exception 'IMMUTABLE_PAYMENT_AUDIT_PROTECTED' using errcode = 'restrict_violation';
    end if;
    return old;
  end if;

  return new;
end;
$$;

-- Receipt attempts likewise keep their immutable payment audit deletion
-- boundary, while allowing owner draft saves during submitted/insufficient
-- review and during a same-method top-up review.
create or replace function public.manual_receipt_card_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if TG_OP = 'DELETE' and exists (
    select 1 from public.manual_payment_attempts where order_id = old.order_id
  ) then
    raise exception 'IMMUTABLE_PAYMENT_AUDIT_PROTECTED';
  end if;
  if TG_OP = 'DELETE' then return old; end if;
  return new;
end;
$$;
