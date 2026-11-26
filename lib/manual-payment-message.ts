/** Customer-safe copy for manual-payment outcomes. */

export type ManualPaymentStatus = {
  outcome: "pending" | "insufficient" | "rejected" | "confirmed" | "duplicate"
  method: "duitnow" | "tng"
  reason: string
  receivedSen: number
  creditedSen: number
  remainingSen: number
  excessSen: number
  paidDraft?: boolean
}

function formatMyrFromSen(sen: number): string {
  return `RM ${(sen / 100).toFixed(2)}`
}

/**
 * Payment outcome alone does not prove that the invitation is editable: the
 * same receipt history can remain visible after first publication or an
 * administrative disable. Callers must pass the derived editable-draft
 * lifecycle explicitly before showing that part of the copy.
 */
export function manualPaymentMessage(
  state: ManualPaymentStatus,
  invitationEditable = false,
): string {
  const editableNote = invitationEditable
    ? " Jemputan anda masih boleh disunting."
    : ""
  if (state.outcome === "rejected") {
    const reason = state.reason.trim().replace(/[.!?]+$/, "")
    return `Bayaran belum disahkan. ${reason || "Sila semak resit anda"}. Muat naik resit yang dibetulkan.${editableNote}`
  }
  if (state.outcome === "insufficient") {
    return `${formatMyrFromSen(state.receivedSen)} telah diterima. Baki ${formatMyrFromSen(state.remainingSen)} masih perlu dibayar. Bayar baki melalui kaedah QR yang dipilih dan muat naik resit.${editableNote}`
  }
  if (state.outcome === "duplicate") {
    return `Bayaran tambahan direkodkan. Tiada draf berbayar tambahan dibuat.${editableNote}`
  }
  if (state.outcome === "confirmed") {
    const message = invitationEditable
      ? "Bayaran disahkan. Draf berbayar anda sedia untuk disunting."
      : "Bayaran disahkan."
    return `${message}${state.excessSen > 0 ? ` Lebihan ${formatMyrFromSen(state.excessSen)} memerlukan bantuan bayaran balik manual.` : ""}`
  }
  return invitationEditable
    ? "Resit diterima. Menunggu semakan pentadbir. Jemputan anda masih boleh disunting; rekod bayaran kekal tidak berubah."
    : "Resit diterima. Menunggu semakan pentadbir."
}
