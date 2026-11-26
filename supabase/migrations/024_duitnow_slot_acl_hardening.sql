-- Harden the DuitNow slot writer boundary.
--
-- Migration 021 initially granted service_role broad table DML so trusted
-- server code could operate the new flow. That grant also let a service-role
-- SQL session update a slot without incrementing its version or appending the
-- corresponding immutable history record. Slot configuration must instead be
-- written only through the owned SECURITY DEFINER management RPC.
--
-- This deliberately uses PostgreSQL ACLs, not a transaction-local custom GUC:
-- a service-role caller can set a GUC for itself, so it cannot be an
-- authorization boundary. Reapplying these grants converges to the same least-
-- privilege state.

revoke all privileges on table public.duitnow_payment_slots from service_role;
grant select on table public.duitnow_payment_slots to service_role;

-- The append-only tables are read by the trusted checkout/admin surfaces but
-- are inserted only by their SECURITY DEFINER RPCs. Removing all DML also
-- prevents a service-role session from forging audit rows outside those paths.
revoke all privileges on table
  public.duitnow_slot_history,
  public.duitnow_transfer_submissions,
  public.duitnow_payment_reviews
  from service_role;
grant select on table
  public.duitnow_slot_history,
  public.duitnow_transfer_submissions,
  public.duitnow_payment_reviews
  to service_role;

revoke all privileges on sequence public.duitnow_slot_history_id_seq from service_role;

-- Restate the guarded slot-management contract. The function owner retains
-- the table privileges needed to lock/update the slot and write its history;
-- callers retain execute-only access through the trusted server boundary.
alter function public.admin_update_duitnow_slot(
  int, boolean, text, text, text, text, text
) security definer set search_path = public, pg_temp;

revoke all on function public.admin_update_duitnow_slot(
  int, boolean, text, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.admin_update_duitnow_slot(
  int, boolean, text, text, text, text, text
) to service_role;
