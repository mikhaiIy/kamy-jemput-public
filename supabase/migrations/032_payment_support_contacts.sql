-- Administrator-managed operational payment-support contacts.
--
-- There is one live row and an append-only history. Browser roles receive no
-- table or function access; the server uses the service-role client only after
-- checking the signed-in administrator. The RPC repeats that check and holds
-- the singleton row lock while it validates the optimistic version, updates
-- the live values, and appends the before/after audit record.

create table public.payment_support_config (
  id boolean primary key default true check (id = true),
  version bigint not null default 1 check (version >= 1),
  email text,
  whatsapp text,
  updated_by uuid references public.users(id),
  updated_at timestamptz not null default now(),
  constraint payment_support_email_check check (
    email is null
    or (
      length(email) between 1 and 254
      and length(split_part(email, '@', 1)) between 1 and 64
      and email = lower(email)
      and email !~ '[[:space:][:cntrl:],]'
      and email !~ '[.][.]'
      and split_part(email, '@', 1) !~ '^[.]'
      and split_part(email, '@', 1) !~ '[.]$'
      and email ~ '^[A-Za-z0-9.!#$%&''*+/=?^_`{|}~-]+@[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?([.][A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$'
    )
  ),
  constraint payment_support_whatsapp_check check (
    whatsapp is null or whatsapp ~ '^[+]60[1-9][0-9]{7,9}$'
  )
);

insert into public.payment_support_config (id)
values (true)
on conflict (id) do nothing;

create table public.payment_support_contact_history (
  id bigint generated always as identity primary key,
  config_version bigint not null check (config_version >= 2),
  previous_email text,
  previous_whatsapp text,
  new_email text,
  new_whatsapp text,
  operation text not null default 'change'
    check (operation in ('change', 'restore')),
  reason text not null
    check (
      length(btrim(reason)) between 1 and 500
      and reason !~ '[[:cntrl:]]'
    ),
  changed_by uuid not null references public.users(id),
  changed_at timestamptz not null default now(),
  constraint payment_support_history_email_check check (
    (previous_email is null or length(previous_email) between 1 and 254)
    and (new_email is null or length(new_email) between 1 and 254)
  ),
  constraint payment_support_history_whatsapp_check check (
    (previous_whatsapp is null or previous_whatsapp ~ '^[+]60[1-9][0-9]{7,9}$')
    and (new_whatsapp is null or new_whatsapp ~ '^[+]60[1-9][0-9]{7,9}$')
  )
);

alter table public.payment_support_config enable row level security;
alter table public.payment_support_contact_history enable row level security;

revoke all on public.payment_support_config from public, anon, authenticated, service_role;
revoke all on public.payment_support_contact_history from public, anon, authenticated, service_role;
grant select on public.payment_support_config to service_role;
grant select on public.payment_support_contact_history to service_role;

create or replace function public.protect_payment_support_contact_history()
returns trigger
language plpgsql
as $$
begin
  raise exception 'IMMUTABLE_HISTORY';
end
$$;

create trigger immutable_payment_support_contact_history
before update or delete on public.payment_support_contact_history
for each row execute function public.protect_payment_support_contact_history();

create or replace function public.update_payment_support_config(
  p_admin uuid,
  p_expected_version bigint,
  p_email text,
  p_whatsapp text,
  p_reason text,
  p_operation text default 'change'
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_old public.payment_support_config%rowtype;
  v_new public.payment_support_config%rowtype;
  v_email text := nullif(btrim(p_email), '');
  v_whatsapp text := nullif(btrim(p_whatsapp), '');
  v_reason text := btrim(coalesce(p_reason, ''));
begin
  if p_admin is null or not exists (
    select 1 from public.users u
    where u.id = p_admin and u.role = 'admin'
  ) then
    raise exception 'FORBIDDEN' using errcode = 'insufficient_privilege';
  end if;

  if p_expected_version is null then
    raise exception 'SUPPORT_CONTACT_VERSION_REQUIRED' using errcode = 'invalid_parameter_value';
  end if;
  if p_operation is null or p_operation not in ('change', 'restore') then
    raise exception 'SUPPORT_CONTACT_OPERATION_INVALID' using errcode = 'invalid_parameter_value';
  end if;
  if p_reason is null or p_reason ~ '[[:cntrl:]]'
     or length(v_reason) < 1 or length(v_reason) > 500 then
    raise exception 'SUPPORT_CONTACT_REASON_REQUIRED' using errcode = 'check_violation';
  end if;

  if v_email is not null and (
    v_email <> lower(v_email)
    or v_email ~ '[[:space:][:cntrl:],]'
    or v_email ~ '[.][.]'
    or length(split_part(v_email, '@', 1)) > 64
    or split_part(v_email, '@', 1) ~ '^[.]'
    or split_part(v_email, '@', 1) ~ '[.]$'
    or v_email !~ '^[A-Za-z0-9.!#$%&''*+/=?^_`{|}~-]+@[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?([.][A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$'
  ) then
    raise exception 'SUPPORT_CONTACT_EMAIL_INVALID' using errcode = 'check_violation';
  end if;
  if v_whatsapp is not null and v_whatsapp !~ '^[+]60[1-9][0-9]{7,9}$' then
    raise exception 'SUPPORT_CONTACT_WHATSAPP_INVALID' using errcode = 'check_violation';
  end if;

  select * into v_old
  from public.payment_support_config
  where id = true
  for update;
  if not found then
    raise exception 'SUPPORT_CONTACT_CONFIG_MISSING' using errcode = 'no_data_found';
  end if;
  if v_old.version is distinct from p_expected_version then
    raise exception 'SUPPORT_CONTACT_STALE' using errcode = 'serialization_failure';
  end if;

  -- A no-op is safe to replay and does not create misleading audit entries.
  if (v_old.email, v_old.whatsapp) is not distinct from (v_email, v_whatsapp) then
    return jsonb_build_object(
      'changed', false,
      'version', v_old.version,
      'email', v_old.email,
      'whatsapp', v_old.whatsapp
    );
  end if;

  update public.payment_support_config
  set email = v_email,
      whatsapp = v_whatsapp,
      version = v_old.version + 1,
      updated_by = p_admin,
      updated_at = now()
  where id = true
  returning * into v_new;

  insert into public.payment_support_contact_history (
    config_version,
    previous_email,
    previous_whatsapp,
    new_email,
    new_whatsapp,
    operation,
    reason,
    changed_by
  ) values (
    v_new.version,
    v_old.email,
    v_old.whatsapp,
    v_new.email,
    v_new.whatsapp,
    p_operation,
    v_reason,
    p_admin
  );

  return jsonb_build_object(
    'changed', true,
    'version', v_new.version,
    'email', v_new.email,
    'whatsapp', v_new.whatsapp
  );
end
$$;

revoke all on function public.update_payment_support_config(uuid,bigint,text,text,text,text)
from public, anon, authenticated, service_role;
grant execute on function public.update_payment_support_config(uuid,bigint,text,text,text,text)
to service_role;
