import { z } from "zod"
import { isAllowedCardImageReference } from "./card-assets"

/**
 * Shared schema for customer image fields.
 *
 * Blank values are valid placeholders. Non-blank values must be either a
 * stable protected app reference, a narrowly compatible known-origin legacy
 * card-assets URL, or an explicitly public static/template asset path.
 */
export const cardImageReferenceSchema = z
  .string()
  .refine(isAllowedCardImageReference, "URL tidak sah")
