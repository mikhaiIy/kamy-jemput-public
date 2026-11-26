-- DuitNow pending-review card guard.
--
-- Extends the cards lifecycle trigger so the fulfillment card row itself —
-- not just its saved draft (`cards.custom_data_draft`) — is protected while a
-- DuitNow transfer submission on a still-pending order awaits manual review.
-- Without this, deleting the card during that window would make a later
-- confirmation fail with `ORDER_CARD_MISSING` inside `complete_order_payment`.
--
-- Deletion stays allowed for pending orders with no unreviewed submission and
-- after a rejected submission (the customer may restart), and paid cards
-- remain protected as before. The guard is database-enforced so both the
-- customer (`app/actions/card.ts`) and administrator
-- (`app/(admin)/admin/cards/[id]/actions.ts`) deletion paths receive the
-- error without code changes.

create or replace function public.cards_payment_lifecycle_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(current_setting('app.payment_completion', true), '') = 'on' then
    if TG_OP = 'DELETE' then return old; end if;
    return new;
  end if;

  if TG_OP = 'INSERT' and new.is_published is true then
    raise exception 'PUBLICATION_PAYMENT_ONLY' using errcode = 'check_violation';
  end if;

  if TG_OP = 'UPDATE' then
    if new.is_published is distinct from old.is_published then
      raise exception 'PUBLICATION_PAYMENT_ONLY' using errcode = 'check_violation';
    end if;
    if new.custom_data_draft is distinct from old.custom_data_draft
       and exists (
         select 1
         from public.duitnow_transfer_submissions s
         join public.orders o on o.id = s.order_id
         where s.order_id = old.order_id
           and o.status = 'pending'
           and not exists (
             select 1 from public.duitnow_payment_reviews r
             where r.submission_id = s.id
           )
       ) then
      raise exception 'DRAFT_LOCKED_PENDING_REVIEW' using errcode = 'check_violation';
    end if;
  end if;

  if TG_OP = 'DELETE' then
    if exists (
      select 1 from public.orders
      where id = old.order_id and status = 'paid'
    ) then
      raise exception 'PAID_CARD_PROTECTED' using errcode = 'restrict_violation';
    end if;
    if exists (
      select 1
      from public.duitnow_transfer_submissions s
      join public.orders o on o.id = s.order_id
      where s.order_id = old.order_id
        and o.status = 'pending'
        and not exists (
          select 1 from public.duitnow_payment_reviews r
          where r.submission_id = s.id
        )
    ) then
      raise exception 'PENDING_REVIEW_CARD_PROTECTED' using errcode = 'restrict_violation';
    end if;
    return old;
  end if;

  return new;
end $$;

-- Same signature as migration 021, so existing ACLs (execute revoked from
-- public/anon/authenticated) are preserved by CREATE OR REPLACE FUNCTION.
