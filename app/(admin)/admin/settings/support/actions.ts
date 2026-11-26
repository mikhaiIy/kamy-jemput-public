"use server"

import { revalidatePath } from "next/cache"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import {
  SUPPORT_REASON_MAX_LENGTH,
  validateSupportEmail,
  validateSupportWhatsApp,
} from "@/lib/payment-support"

export type SupportContactActionInput = {
  email: unknown
  whatsapp: unknown
  reason: unknown
  expectedVersion: unknown
  restoreHistoryId?: unknown
}

export type SupportContactActionResult =
  | {
      ok: true
      changed: boolean
      version: number
      email: string | null
      whatsapp: string | null
    }
  | {
      ok: false
      error: string
      field?: "email" | "whatsapp" | "reason" | "version" | "history"
      stale?: boolean
    }

type SupportContactRpcResult = {
  changed?: unknown
  version?: unknown
  email?: unknown
  whatsapp?: unknown
}

async function getAdministrator() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { user: null, error: "Sila log masuk semula." }

  // Keep this role check beside the write boundary. The database RPC repeats
  // it because service-role writes bypass RLS.
  const { data: profile, error } = await supabaseAdmin
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()
  if (error || profile?.role !== "admin") {
    return { user: null, error: "Anda tidak dibenarkan melakukan tindakan ini." }
  }
  return { user, error: null }
}

function safeRpcError(message: string | null | undefined): SupportContactActionResult {
  switch ((message ?? "").trim()) {
    case "SUPPORT_CONTACT_STALE":
      return {
        ok: false,
        stale: true,
        field: "version",
        error: "Tetapan telah berubah dalam sesi lain. Muat semula halaman sebelum menyimpan.",
      }
    case "SUPPORT_CONTACT_REASON_REQUIRED":
      return {
        ok: false,
        field: "reason",
        error: "Masukkan sebab perubahan (maksimum 500 aksara).",
      }
    case "SUPPORT_CONTACT_EMAIL_INVALID":
      return { ok: false, field: "email", error: "Masukkan satu alamat e-mel yang sah." }
    case "SUPPORT_CONTACT_WHATSAPP_INVALID":
      return {
        ok: false,
        field: "whatsapp",
        error: "Masukkan nombor WhatsApp Malaysia bermula dengan +60.",
      }
    case "FORBIDDEN":
      return { ok: false, error: "Anda tidak dibenarkan melakukan tindakan ini." }
    default:
      return { ok: false, error: "Tetapan sokongan tidak dapat disimpan. Cuba semula." }
  }
}

function expectedVersionOf(value: unknown): number | null {
  if (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 1
  )
    return value
  if (typeof value === "string" && /^[1-9][0-9]*$/.test(value)) {
    const parsed = Number(value)
    return Number.isSafeInteger(parsed) ? parsed : null
  }
  return null
}

function historyIdOf(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null
  if (typeof value !== "string" || !/^[1-9][0-9]*$/.test(value)) return null
  return value
}

function reasonOf(value: unknown): string | null {
  if (typeof value !== "string") return null
  if (/[\u0000-\u001f\u007f-\u009f]/u.test(value)) return null
  const reason = value.trim()
  if (
    reason.length < 1 ||
    reason.length > SUPPORT_REASON_MAX_LENGTH ||
    /[\u0000-\u001f\u007f-\u009f]/u.test(reason)
  )
    return null
  return reason
}

/**
 * Save current support contacts, or restore the previous values from one
 * immutable history row when restoreHistoryId is supplied. Both paths use the
 * same guarded, audited RPC and therefore require a reason and version.
 */
export async function saveSupportContactAction(
  input: SupportContactActionInput,
): Promise<SupportContactActionResult> {
  const { user, error: authError } = await getAdministrator()
  if (!user) return { ok: false, error: authError ?? "Tidak dibenarkan." }

  const expectedVersion = expectedVersionOf(input.expectedVersion)
  if (expectedVersion === null) {
    return {
      ok: false,
      field: "version",
      error: "Versi tetapan tidak sah. Muat semula halaman dan cuba lagi.",
    }
  }

  const reason = reasonOf(input.reason)
  if (!reason) {
    return {
      ok: false,
      field: "reason",
      error: "Masukkan sebab perubahan (maksimum 500 aksara).",
    }
  }

  let emailValue: string | null
  let whatsappValue: string | null
  const restoreHistoryId = historyIdOf(input.restoreHistoryId)
  if (input.restoreHistoryId !== undefined && restoreHistoryId === null) {
    return { ok: false, field: "history", error: "Rekod pemulihan tidak sah." }
  }

  if (restoreHistoryId) {
    const { data: history, error } = await supabaseAdmin
      .from("payment_support_contact_history")
      .select("previous_email, previous_whatsapp")
      .eq("id", restoreHistoryId)
      .maybeSingle()
    if (error || !history) {
      return { ok: false, field: "history", error: "Rekod pemulihan tidak ditemui." }
    }
    emailValue = history.previous_email ?? null
    whatsappValue = history.previous_whatsapp ?? null
  } else {
    const email = validateSupportEmail(input.email ?? "")
    if (!email.ok) return { ok: false, field: "email", error: email.message }
    const whatsapp = validateSupportWhatsApp(input.whatsapp ?? "")
    if (!whatsapp.ok) return { ok: false, field: "whatsapp", error: whatsapp.message }
    emailValue = email.value
    whatsappValue = whatsapp.value
  }

  const { data, error } = await supabaseAdmin.rpc("update_payment_support_config", {
    p_admin: user.id,
    p_expected_version: expectedVersion,
    p_email: emailValue,
    p_whatsapp: whatsappValue,
    p_reason: reason,
    p_operation: restoreHistoryId ? "restore" : "change",
  })
  if (error) return safeRpcError(error.message)

  const result = (data ?? {}) as SupportContactRpcResult
  const version =
    typeof result.version === "number" && Number.isSafeInteger(result.version)
      ? result.version
      : Number(result.version)
  if (!Number.isSafeInteger(version) || version < 1) {
    return { ok: false, error: "Tetapan tidak dapat disahkan. Muat semula halaman." }
  }
  revalidatePath("/admin/settings/support")
  revalidatePath("/admin/settings")
  return {
    ok: true,
    changed: result.changed === true,
    version,
    email: typeof result.email === "string" ? result.email : null,
    whatsapp: typeof result.whatsapp === "string" ? result.whatsapp : null,
  }
}
