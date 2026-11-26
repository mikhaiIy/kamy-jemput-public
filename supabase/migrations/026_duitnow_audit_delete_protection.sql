-- Preserve immutable DuitNow evidence after every review outcome.
--
-- The original foreign keys cascaded an order deletion into append-only
-- submission/review rows. Their immutable triggers correctly rejected that
-- cascade, but made a rejected transfer's deletion outcome accidental. Audit
-- evidence is retained instead: an order or its fulfillment card cannot be
-- deleted once a transfer submission exists, including after rejection.

alter table public.duitnow_payment_reviews
  drop constraint if exists duitnow_payment_reviews_submission_id_fkey,
  add constraint duitnow_payment_reviews_submission_id_fkey
    foreign key (submission_id) references public.duitnow_transfer_submissions(id)
    on delete restrict;

alter table public.duitnow_payment_reviews
  drop constraint if exists duitnow_payment_reviews_order_id_fkey,
  add constraint duitnow_payment_reviews_order_id_fkey
    foreign key (order_id) references public.orders(id)
    on delete restrict;

alter table public.duitnow_transfer_submissions
  drop constraint if exists duitnow_transfer_submissions_order_id_fkey,
  add constraint duitnow_transfer_submissions_order_id_fkey
    foreign key (order_id) references public.orders(id)
    on delete restrict;

create or replace function public.cards_payment_lifecycle_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
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
    if exists (select 1 from public.orders where id = old.order_id and status = 'paid') then
      raise exception 'PAID_CARD_PROTECTED' using errcode = 'restrict_violation';
    end if;
    if exists (
      select 1 from public.duitnow_transfer_submissions s where s.order_id = old.order_id
    ) then
      raise exception 'IMMUTABLE_PAYMENT_AUDIT_PROTECTED' using errcode = 'restrict_violation';
    end if;
    return old;
  end if;

  return new;
end $$;

create or replace function public.prevent_protected_order_delete()
returns trigger language plpgsql as $$
begin
  if old.status = 'paid' or old.checkout_reservation_token is not null
     or exists (select 1 from public.duitnow_transfer_submissions s where s.order_id = old.id) then
    raise exception 'IMMUTABLE_PAYMENT_AUDIT_PROTECTED' using errcode = 'restrict_violation';
  end if;
  return old;
end $$;

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
  if o.status = 'paid' or o.checkout_reservation_token is not null or c.is_published
     or exists (select 1 from public.duitnow_transfer_submissions s where s.order_id = o.id) then
    return false;
  end if;
  delete from public.orders where id = o.id;
  return true;
end;
$$;

revoke all on function public.delete_card_if_editing(uuid, uuid) from public, anon, authenticated;
grant execute on function public.delete_card_if_editing(uuid, uuid) to service_role;
