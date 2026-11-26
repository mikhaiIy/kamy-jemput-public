import { createHash, randomUUID } from "node:crypto"
import { revalidatePath } from "next/cache"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import {
  buildReplacementAssetPlan,
  isReplacementDraftAssetSafe,
  remapReplacementCardData,
  type ReplacementAssetPlan,
} from "@/lib/card-replacement-assets"
import { collectCardAssetPaths } from "@/lib/card-assets"
import {
  CARD_ASSETS_BUCKET,
  CARD_ASSET_MIME_TYPES,
  MAX_CARD_ASSET_BYTES,
} from "@/lib/card-assets"
import type { CardData } from "@/lib/types"
import { generateSlug } from "@/lib/slugify"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type ReplacementBody = {
  operation?: unknown
  reason?: unknown
  requestId?: unknown
  grantId?: unknown
  expectedSourcePublicationId?: unknown
  expectedReplacementDraftVersion?: unknown
}

type GrantResult = {
  grantId?: string
  predecessorCardId?: string
  predecessorOrderId?: string
  predecessorPublicationId?: string
  replacementCardId?: string
  replacementOrderId?: string
  ownerId?: string
  reason?: string
  grantedAt?: string
  replayed?: boolean
}

function errorResponse(error: string, code: string, status = 409): Response {
  return Response.json({ error, code }, { status })
}

function parseBody(value: unknown):
  | { ok: true; body: Required<Pick<ReplacementBody, "operation" | "reason" | "requestId">> & ReplacementBody }
  | { ok: false; response: Response } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, response: Response.json({ error: "Invalid request body" }, { status: 400 }) }
  }
  const body = value as ReplacementBody
  if (body.operation !== "grant" && body.operation !== "cutover") {
    return { ok: false, response: Response.json({ error: "Invalid replacement operation" }, { status: 400 }) }
  }
  if (typeof body.reason !== "string" || body.reason.trim() !== body.reason || body.reason.length < 1 || new TextEncoder().encode(body.reason).length > 1000) {
    return { ok: false, response: Response.json({ error: "A bounded reason is required" }, { status: 400 }) }
  }
  if (typeof body.requestId !== "string" || !UUID_RE.test(body.requestId)) {
    return { ok: false, response: Response.json({ error: "A valid request id is required" }, { status: 400 }) }
  }
  if (body.operation === "cutover" && (typeof body.grantId !== "string" || !UUID_RE.test(body.grantId))) {
    return { ok: false, response: Response.json({ error: "A valid replacement grant is required" }, { status: 400 }) }
  }
  if (body.operation === "cutover" && (typeof body.expectedSourcePublicationId !== "string" || !UUID_RE.test(body.expectedSourcePublicationId))) {
    return { ok: false, response: Response.json({ error: "The reviewed source publication is required" }, { status: 400 }) }
  }
  if (body.operation === "cutover" && (typeof body.expectedReplacementDraftVersion !== "number" || !Number.isSafeInteger(body.expectedReplacementDraftVersion) || body.expectedReplacementDraftVersion < 1)) {
    return { ok: false, response: Response.json({ error: "The reviewed replacement draft version is required" }, { status: 400 }) }
  }
  return { ok: true, body: body as Required<Pick<ReplacementBody, "operation" | "reason" | "requestId">> & ReplacementBody }
}

function mimeForPath(path: string, reported: string | null): (typeof CARD_ASSET_MIME_TYPES)[number] | null {
  if (reported && (CARD_ASSET_MIME_TYPES as readonly string[]).includes(reported)) {
    return reported as (typeof CARD_ASSET_MIME_TYPES)[number]
  }
  const extension = path.split(".").at(-1)?.toLowerCase()
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg"
  if (extension === "png") return "image/png"
  if (extension === "webp") return "image/webp"
  if (extension === "gif") return "image/gif"
  return null
}

async function readSourceObject(path: string): Promise<{
  bytes: Uint8Array
  sha256: string
  sizeBytes: number
  contentType: (typeof CARD_ASSET_MIME_TYPES)[number]
}> {
  const { data, error } = await supabaseAdmin.storage.from(CARD_ASSETS_BUCKET).download(path)
  if (error || !data) throw new Error("SOURCE_ASSET_MISSING")
  const bytes = new Uint8Array(await data.arrayBuffer())
  const contentType = mimeForPath(path, data.type)
  if (!contentType || bytes.byteLength < 1 || bytes.byteLength > MAX_CARD_ASSET_BYTES) {
    throw new Error("SOURCE_ASSET_INVALID")
  }
  return {
    bytes,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    sizeBytes: bytes.byteLength,
    contentType,
  }
}

async function copySourceObject(
  plan: ReplacementAssetPlan,
  source: Awaited<ReturnType<typeof readSourceObject>>,
): Promise<void> {
  const { error } = await supabaseAdmin.storage.from(CARD_ASSETS_BUCKET).upload(
    plan.targetObjectPath,
    new Blob([
      source.bytes.buffer.slice(
        source.bytes.byteOffset,
        source.bytes.byteOffset + source.bytes.byteLength,
      ) as ArrayBuffer,
    ], { type: source.contentType }),
    { upsert: false, contentType: source.contentType, cacheControl: "no-store" },
  )
  if (!error) return

  // Retries never overwrite a target object. An existing object is accepted
  // only when its bytes match the frozen source hash.
  const { data: existing, error: readError } = await supabaseAdmin.storage
    .from(CARD_ASSETS_BUCKET)
    .download(plan.targetObjectPath)
  if (readError || !existing) throw new Error("ASSET_COPY_CONFLICT")
  const existingBytes = new Uint8Array(await existing.arrayBuffer())
  const existingHash = createHash("sha256").update(existingBytes).digest("hex")
  if (existingHash !== source.sha256 || existingBytes.byteLength !== source.sizeBytes) {
    throw new Error("ASSET_COPY_CONFLICT")
  }
}

async function validateTargetDraftAssets(
  draft: CardData,
  cardId: string,
  userId: string | null,
): Promise<void> {
  if (!isReplacementDraftAssetSafe(draft, { cardId, userId })) {
    throw new Error("REPLACEMENT_TARGET_ASSET_INVALID")
  }
  const paths = collectCardAssetPaths(draft, { cardId, userId })
  for (const path of paths) {
    try {
      await readSourceObject(path)
    } catch (error) {
      if (error instanceof Error && error.message === "SOURCE_ASSET_INVALID") {
        throw new Error("REPLACEMENT_TARGET_ASSET_INVALID")
      }
      throw new Error("REPLACEMENT_TARGET_ASSET_MISSING")
    }
  }
}

async function loadGrant(grantId: string): Promise<GrantResult | null> {
  const { data, error } = await supabaseAdmin
    .from("card_replacement_grants")
    .select("id, predecessor_card_id, predecessor_order_id, predecessor_publication_id, replacement_card_id, replacement_order_id, owner_id, reason, granted_at")
    .eq("id", grantId)
    .maybeSingle()
  if (error) throw new Error("REPLACEMENT_GRANT_LOOKUP_FAILED")
  if (!data) return null
  return {
    grantId: data.id,
    predecessorCardId: data.predecessor_card_id,
    predecessorOrderId: data.predecessor_order_id,
    predecessorPublicationId: data.predecessor_publication_id,
    replacementCardId: data.replacement_card_id,
    replacementOrderId: data.replacement_order_id,
    ownerId: data.owner_id,
    reason: data.reason,
    grantedAt: data.granted_at,
  }
}

async function prepareGrant(grant: GrantResult): Promise<{
  assetCount: number
  readyCount: number
  prepared: boolean
  draftVersion: number | null
}> {
  if (!grant.grantId || !grant.predecessorCardId || !grant.replacementCardId || !grant.predecessorPublicationId) {
    throw new Error("REPLACEMENT_GRANT_INVALID")
  }
  const [{ data: sourcePublication, error: sourceError }, { data: sourceCard, error: sourceCardError }, { data: targetCard, error: targetError }] = await Promise.all([
    supabaseAdmin.from("card_publications").select("snapshot").eq("id", grant.predecessorPublicationId).eq("card_id", grant.predecessorCardId).maybeSingle<{ snapshot: CardData }>(),
    supabaseAdmin.from("cards").select("id, user_id").eq("id", grant.predecessorCardId).maybeSingle<{ id: string; user_id: string | null }>(),
    supabaseAdmin.from("cards").select("id, user_id, custom_data_draft, draft_version").eq("id", grant.replacementCardId).maybeSingle<{ id: string; user_id: string | null; custom_data_draft: CardData; draft_version: number }>(),
  ])
  if (sourceError || sourceCardError || targetError || !sourcePublication?.snapshot || !sourceCard || !targetCard) {
    throw new Error("REPLACEMENT_GRANT_INVALID")
  }

  const context = {
    sourceCardId: sourceCard.id,
    sourceUserId: sourceCard.user_id,
    targetCardId: targetCard.id,
    targetUserId: targetCard.user_id,
  }
  const plan = buildReplacementAssetPlan(sourcePublication.snapshot, context)
  const cached = new Map<string, Awaited<ReturnType<typeof readSourceObject>>>()
  const planRows = []
  for (const item of plan) {
    const source = await readSourceObject(item.sourceObjectPath)
    cached.set(item.sourceObjectPath, source)
    planRows.push({
      sourceObjectPath: item.sourceObjectPath,
      targetObjectPath: item.targetObjectPath,
      sha256: source.sha256,
      sizeBytes: source.sizeBytes,
      contentType: source.contentType,
    })
  }

  const { data: planned, error: planError } = await supabaseAdmin.rpc("plan_card_replacement_assets", {
    p_grant_id: grant.grantId,
    p_source_publication_id: grant.predecessorPublicationId,
    p_assets: planRows,
  })
  if (planError) throw new Error(planError.message)

  for (const item of plan) {
    const source = cached.get(item.sourceObjectPath)
    if (!source) throw new Error("SOURCE_ASSET_MISSING")
    await copySourceObject(item, source)
    const { error: readyError } = await supabaseAdmin.rpc("mark_card_replacement_asset_ready", {
      p_grant_id: grant.grantId,
      p_source_object_path: item.sourceObjectPath,
      p_sha256: source.sha256,
      p_size_bytes: source.sizeBytes,
      p_content_type: source.contentType,
    })
    if (readyError) throw new Error(readyError.message)
  }

  const { data: currentTarget, error: currentTargetError } = await supabaseAdmin
    .from("cards")
    .select("custom_data_draft, draft_version")
    .eq("id", grant.replacementCardId)
    .maybeSingle<{ custom_data_draft: CardData; draft_version: number }>()
  if (currentTargetError || !currentTarget?.custom_data_draft) throw new Error("REPLACEMENT_TARGET_INVALID")
  await validateTargetDraftAssets(
    currentTarget.custom_data_draft,
    targetCard.id,
    targetCard.user_id,
  )

  let prepared = false
  const { error: prepareError } = await supabaseAdmin.rpc("finalize_card_replacement_assets", {
    p_grant_id: grant.grantId,
    p_source_publication_id: grant.predecessorPublicationId,
    p_target_draft: currentTarget.custom_data_draft,
    p_expected_draft_version: currentTarget.draft_version,
  })
  if (!prepareError) prepared = true
  else if (!prepareError.message.includes("DRAFT_VERSION_CONFLICT")) throw new Error(prepareError.message)

  return {
    assetCount: Number(planned?.assetCount ?? plan.length),
    readyCount: Number(planned?.readyCount ?? plan.length),
    prepared,
    draftVersion: currentTarget.draft_version,
  }
}

function mapReplacementError(message: string): Response {
  if (message.includes("FORBIDDEN")) return errorResponse("Forbidden", "FORBIDDEN", 403)
  if (message.includes("CARD_NOT_FOUND") || message.includes("REPLACEMENT_GRANT_NOT_FOUND")) return errorResponse("Replacement source was not found", "NOT_FOUND", 404)
  if (message.includes("RETIRED")) return errorResponse("This invitation has been retired", "RETIRED")
  if (message.includes("REPLACEMENT_PENDING")) return errorResponse("A replacement is already being prepared", "REPLACEMENT_PENDING")
  if (message.includes("DRAFT_VERSION_CONFLICT") || message.includes("PREDECESSOR_PUBLICATION_CHANGED") || message.includes("PREDECESSOR_CHANGED")) return errorResponse("The replacement changed while it was being prepared. Reload and retry.", "REPLACEMENT_STALE")
  if (message.includes("PREDECESSOR_PUBLICATION_REQUIRED")) return errorResponse("The reviewed source publication is required", "REPLACEMENT_STALE", 400)
  if (message.includes("REPLACEMENT_ASSETS_NOT_READY") || message.includes("SOURCE_ASSET_MISSING") || message.includes("SOURCE_ASSET_INVALID") || message.includes("REPLACEMENT_TARGET_ASSET_MISSING") || message.includes("REPLACEMENT_TARGET_ASSET_INVALID")) return errorResponse("Replacement images are not ready yet", "REPLACEMENT_ASSETS_NOT_READY")
  if (message.includes("ASSET_COPY_CONFLICT") || message.includes("ASSET_PLAN_CONFLICT")) return errorResponse("A replacement image changed during copying. Nothing was overwritten.", "ASSET_COPY_CONFLICT")
  if (message.includes("CONTROLLED_REPLACEMENT")) return errorResponse("This operation is not valid for an administrator-granted replacement", "CONTROLLED_REPLACEMENT_INVALID")
  if (message.includes("REASON_INVALID")) return Response.json({ error: "A bounded reason is required" }, { status: 400 })
  console.error("Controlled replacement failed:", message)
  return errorResponse("Controlled replacement could not be completed", "REPLACEMENT_FAILED", 500)
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params
  const sessionClient = await createSupabaseServerClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })
  const { data: profile } = await sessionClient.from("users").select("role").eq("id", user.id).maybeSingle()
  if (profile?.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 })

  let rawBody: unknown
  try { rawBody = await request.json() } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }) }
  const parsed = parseBody(rawBody)
  if (!parsed.ok) return parsed.response
  const body = parsed.body

  try {
    if (body.operation === "grant") {
      let existing: GrantResult | null = null
      const { data: requestGrant } = await supabaseAdmin
        .from("card_replacement_grants")
        .select("id")
        .eq("request_id", body.requestId)
        .maybeSingle<{ id: string }>()
      if (requestGrant?.id) existing = await loadGrant(requestGrant.id)

      const { data: sourceCard, error: sourceError } = await supabaseAdmin
        .from("cards")
        .select("id, user_id, current_publication_id")
        .eq("id", id)
        .maybeSingle<{ id: string; user_id: string | null; current_publication_id: string | null }>()
      if (sourceError || !sourceCard) return errorResponse("Card not found", "NOT_FOUND", 404)
      const grantIds = existing ?? {
        replacementCardId: randomUUID(),
        replacementOrderId: randomUUID(),
      }
      let draft: CardData | null = null
      if (!existing) {
        if (!sourceCard.current_publication_id) return errorResponse("Current publication is missing", "CURRENT_PUBLICATION_MISSING")
        const { data: publication, error: publicationError } = await supabaseAdmin
          .from("card_publications")
          .select("snapshot")
          .eq("id", sourceCard.current_publication_id)
          .eq("card_id", sourceCard.id)
          .maybeSingle<{ snapshot: CardData }>()
        if (publicationError || !publication?.snapshot) return errorResponse("Current publication is missing", "CURRENT_PUBLICATION_MISSING")
        draft = remapReplacementCardData(publication.snapshot, {
          sourceCardId: sourceCard.id,
          sourceUserId: sourceCard.user_id,
          targetCardId: grantIds.replacementCardId!,
          targetUserId: sourceCard.user_id,
        })
      }

      const { data: grantData, error: grantError } = await supabaseAdmin.rpc("create_card_replacement_grant", {
        p_predecessor_card_id: id,
        p_admin_id: user.id,
        p_reason: body.reason,
        p_request_id: body.requestId,
        p_replacement_order_id: grantIds.replacementOrderId,
        p_replacement_card_id: grantIds.replacementCardId,
        p_slug: existing?.replacementCardId ? "replayed" : generateSlug(),
        p_replacement_draft: draft,
        p_expected_source_publication_id: sourceCard.current_publication_id,
      })
      if (grantError) return mapReplacementError(grantError.message)
      const grant = grantData as GrantResult
      if (grant.replayed === true && grant.grantId) {
        const { data: completedCutover, error: cutoverLookupError } = await supabaseAdmin
          .from("card_replacement_cutovers")
          .select("id, replacement_publication_id, created_at, result")
          .eq("grant_id", grant.grantId)
          .maybeSingle()
        if (cutoverLookupError) throw new Error("REPLACEMENT_CUTOVER_LOOKUP_FAILED")
        if (completedCutover) {
          revalidatePath(`/admin/cards/${id}`)
          revalidatePath(`/admin/cards/${grant.replacementCardId}`)
          revalidatePath("/admin/cards")
          revalidatePath("/admin/orders")
          revalidatePath("/dashboard")
          return Response.json({
            ok: true,
            operation: "grant",
            replayed: true,
            grantId: grant.grantId,
            predecessorCardId: grant.predecessorCardId,
            replacementCardId: grant.replacementCardId,
            replacementOrderId: grant.replacementOrderId,
            reason: grant.reason,
            assets: { assetCount: 0, readyCount: 0, prepared: true, draftVersion: null },
            cutover: {
              cutoverId: completedCutover.id,
              replacementPublicationId: completedCutover.replacement_publication_id,
              createdAt: completedCutover.created_at,
              result: completedCutover.result,
            },
          }, { headers: { "Cache-Control": "no-store" } })
        }
      }
      const prepared = await prepareGrant(grant)
      revalidatePath(`/admin/cards/${id}`)
      revalidatePath(`/admin/cards/${grant.replacementCardId}`)
      revalidatePath("/admin/cards")
      revalidatePath("/admin/orders")
      revalidatePath("/dashboard")
      return Response.json({
        ok: true,
        operation: "grant",
        replayed: grant.replayed === true,
        grantId: grant.grantId,
        predecessorCardId: grant.predecessorCardId,
        replacementCardId: grant.replacementCardId,
        replacementOrderId: grant.replacementOrderId,
        reason: grant.reason,
        assets: prepared,
      }, { headers: { "Cache-Control": "no-store" } })
    }

    const grant = await loadGrant(body.grantId as string)
    if (!grant) return errorResponse("Replacement grant was not found", "NOT_FOUND", 404)
    if (grant.predecessorCardId !== id) return errorResponse("Replacement grant does not belong to this invitation", "FORBIDDEN", 403)
    if (!grant.replacementCardId || !grant.ownerId) return errorResponse("Replacement grant is invalid", "REPLACEMENT_TARGET_INVALID")
    const { data: existingCutover } = await supabaseAdmin
      .from("card_replacement_cutovers")
      .select("id, request_id, replacement_publication_id, created_at, result")
      .eq("grant_id", grant.grantId)
      .maybeSingle()
    if (existingCutover) {
      if (existingCutover.request_id !== body.requestId) return errorResponse("This invitation has already been retired", "RETIRED")
      return Response.json({ ok: true, operation: "cutover", replayed: true, ...existingCutover.result }, { headers: { "Cache-Control": "no-store" } })
    }
    const { data: target, error: targetError } = await supabaseAdmin
      .from("cards")
      .select("custom_data_draft, draft_version")
      .eq("id", grant.replacementCardId)
      .maybeSingle<{ custom_data_draft: CardData; draft_version: number }>()
    if (targetError || !target?.custom_data_draft) return errorResponse("Replacement draft is not ready", "REPLACEMENT_TARGET_INVALID")
    await validateTargetDraftAssets(
      target.custom_data_draft,
      grant.replacementCardId,
      grant.ownerId ?? null,
    )
    const expectedSourcePublicationId = body.expectedSourcePublicationId as string
    const expectedDraftVersion = body.expectedReplacementDraftVersion as number
    const { error: prepareError } = await supabaseAdmin.rpc("finalize_card_replacement_assets", {
      p_grant_id: grant.grantId,
      p_source_publication_id: expectedSourcePublicationId,
      p_target_draft: target.custom_data_draft,
      p_expected_draft_version: expectedDraftVersion,
    })
    if (prepareError) return mapReplacementError(prepareError.message)
    const { data: cutover, error: cutoverError } = await supabaseAdmin.rpc("cutover_card_replacement", {
      p_grant_id: grant.grantId,
      p_admin_id: user.id,
      p_reason: body.reason,
      p_request_id: body.requestId,
      p_expected_source_publication_id: expectedSourcePublicationId,
      p_expected_replacement_draft_version: expectedDraftVersion,
    })
    if (cutoverError) return mapReplacementError(cutoverError.message)
    revalidatePath(`/admin/cards/${id}`)
    revalidatePath(`/admin/cards/${grant.replacementCardId}`)
    revalidatePath("/admin/cards")
    revalidatePath("/admin/orders")
    revalidatePath("/dashboard")
    return Response.json({ ok: true, operation: "cutover", ...(cutover as object) }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    return mapReplacementError(error instanceof Error ? error.message : "REPLACEMENT_FAILED")
  }
}
