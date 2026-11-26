/**
 * Helpers shared by the HTML, metadata, OG and RSVP guest boundaries.
 *
 * A profile name is the only customer-controlled value permitted in the
 * private edit-window notice. Event payloads are deliberately not accepted.
 */
export function safeCustomerDisplayName(value: unknown): string {
  if (typeof value !== "string") return "The host"

  const cleaned = value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80)
    .trim()

  return cleaned || "The host"
}
export function guestEditingNotice(customerName: unknown): string {
  return `${safeCustomerDisplayName(customerName)} is making edits. Please wait.`
}
