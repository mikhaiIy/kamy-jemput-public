-- QR artwork is distinct from private customer receipt evidence. Only trusted
-- administrators upload; the app serves the normalized PNG for customers to scan.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('payment-qr','payment-qr',false,5242880,array['image/png'])
on conflict(id) do nothing;
create policy payment_qr_no_browser_access on storage.objects as restrictive
for all to anon,authenticated using (bucket_id <> 'payment-qr') with check (bucket_id <> 'payment-qr');

create table public.tng_config_history (
 id bigint generated always as identity primary key,
 previous_config jsonb not null, config jsonb not null,
 changed_by uuid not null references public.users(id), changed_at timestamptz not null default now()
);
alter table public.tng_config_history enable row level security;
revoke all on public.tng_config_history from public,anon,authenticated,service_role;
grant select on public.tng_config_history to service_role;
create function public.protect_tng_config_history() returns trigger language plpgsql as $$
begin raise exception 'IMMUTABLE_HISTORY'; end $$;
create trigger immutable_tng_config_history before update or delete on public.tng_config_history
for each row execute function public.protect_tng_config_history();

create or replace function public.configure_tng(p_admin uuid,p_enabled boolean,p_payee text,p_qr text,p_instructions text)
 returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare old_config public.tng_payment_config; new_config public.tng_payment_config;
begin
 if not exists(select 1 from public.users where id=p_admin and role='admin') then raise exception 'FORBIDDEN'; end if;
 if length(p_payee)>120 or length(p_qr)>500 or length(p_instructions)>2000 or
 (p_enabled and (coalesce(btrim(p_payee),'')='' or coalesce(p_qr,'') !~ '^(https://|/api/payment-qr/[a-f0-9]{64}\.png$)')) then raise exception 'SLOT_INCOMPLETE'; end if;
 select * into old_config from public.tng_payment_config where id=true for update;
 if (old_config.enabled,old_config.payee_name,old_config.qr_image_url,old_config.instructions)
   is not distinct from (p_enabled,p_payee,p_qr,p_instructions) then return; end if;
 update public.tng_payment_config set enabled=p_enabled,payee_name=p_payee,qr_image_url=p_qr,instructions=p_instructions,version=version+1 where id=true returning * into new_config;
 insert into public.tng_config_history(previous_config,config,changed_by) values(to_jsonb(old_config),to_jsonb(new_config),p_admin);
end $$;
revoke all on function public.configure_tng(uuid,boolean,text,text,text) from public,anon,authenticated;
grant execute on function public.configure_tng(uuid,boolean,text,text,text) to service_role;

create or replace function public.admin_update_duitnow_slot(
  p_admin_id uuid,
  p_slot_number int,
  p_enabled boolean,
  p_label text,
  p_payee_name text,
  p_provider text,
  p_qr_image_url text,
  p_instructions text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_old public.duitnow_payment_slots%rowtype;
  v_new public.duitnow_payment_slots%rowtype;
begin
  if p_admin_id is null or not exists (
    select 1 from public.users u
    where u.id = p_admin_id and u.role = 'admin'
  ) then
    raise exception 'FORBIDDEN' using errcode = 'insufficient_privilege';
  end if;

  if p_slot_number not in (1, 2) then
    raise exception 'SLOT_INVALID' using errcode = 'check_violation';
  end if;

  if p_enabled and (
    btrim(coalesce(p_payee_name, '')) = ''
    or btrim(coalesce(p_provider, '')) = ''
    or btrim(coalesce(p_qr_image_url, '')) = ''
  ) then
    raise exception 'SLOT_INCOMPLETE' using errcode = 'check_violation';
  end if;

  select * into v_old from public.duitnow_payment_slots
  where slot_number = p_slot_number
  for update;
  if not found then
    raise exception 'SLOT_INVALID' using errcode = 'check_violation';
  end if;

  if (v_old.enabled,v_old.label,v_old.payee_name,v_old.provider,v_old.qr_image_url,v_old.instructions)
    is not distinct from (p_enabled,btrim(coalesce(p_label,'')),btrim(coalesce(p_payee_name,'')),btrim(coalesce(p_provider,'')),btrim(coalesce(p_qr_image_url,'')),coalesce(p_instructions,'')) then
    return jsonb_build_object('version',v_old.version,'enabled',v_old.enabled);
  end if;

  update public.duitnow_payment_slots
  set enabled = p_enabled,
      label = btrim(coalesce(p_label, '')),
      payee_name = btrim(coalesce(p_payee_name, '')),
      provider = btrim(coalesce(p_provider, '')),
      qr_image_url = btrim(coalesce(p_qr_image_url, '')),
      instructions = coalesce(p_instructions, ''),
      version = version + 1,
      updated_at = now()
  where slot_number = p_slot_number
  returning * into v_new;

  insert into public.duitnow_slot_history
    (slot_number, version, previous_config, config, changed_by)
  values (
    p_slot_number, v_new.version,
    jsonb_build_object(
      'slotNumber', v_old.slot_number, 'version', v_old.version, 'enabled', v_old.enabled,
      'label', v_old.label, 'payeeName', v_old.payee_name, 'provider', v_old.provider,
      'qrImageUrl', v_old.qr_image_url, 'instructions', v_old.instructions),
    jsonb_build_object(
      'slotNumber', v_new.slot_number, 'version', v_new.version, 'enabled', v_new.enabled,
      'label', v_new.label, 'payeeName', v_new.payee_name, 'provider', v_new.provider,
      'qrImageUrl', v_new.qr_image_url, 'instructions', v_new.instructions),
    p_admin_id);

  return jsonb_build_object('version', v_new.version, 'enabled', v_new.enabled);
end $$;
