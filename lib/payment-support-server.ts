import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import {
  EMPTY_PAYMENT_SUPPORT_CONTACT,
  parsePaymentSupportContact,
  type PaymentSupportContact,
} from "./payment-support"

/**
 * Read the singleton through the supplied server client. A missing table,
 * malformed row, or temporary read failure returns the empty contact so a
 * customer message remains safe and never exposes database details/history.
 */
export async function loadPaymentSupportContact(
  db: SupabaseClient,
): Promise<PaymentSupportContact> {
  try {
    const { data, error } = await db
      .from("payment_support_config")
      .select("email, whatsapp, version")
      .eq("id", true)
      .maybeSingle()
    if (error || !data) return EMPTY_PAYMENT_SUPPORT_CONTACT
    return parsePaymentSupportContact(data)
  } catch {
    return EMPTY_PAYMENT_SUPPORT_CONTACT
  }
}
