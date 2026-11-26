/**
 * The acknowledgement is intentionally a single exact sentence. Keep this
 * value aligned with the database check in 033_paid_draft_publication.sql.
 */
export const PAID_DRAFT_PUBLICATION_ACKNOWLEDGEMENT =
  "I understand that this invitation will become public and read-only."

export function isPaidDraftPublicationAcknowledgement(value: unknown): value is string {
  return value === PAID_DRAFT_PUBLICATION_ACKNOWLEDGEMENT
}
