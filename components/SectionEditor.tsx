"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CheckCircle2, CircleAlert, LockKeyhole, Loader2 } from "lucide-react"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"
import { PaymentMethodDialog } from "./PaymentMethodDialog"
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { sectionRegistry, defaultSectionInstance } from "@/lib/sections/registry"
import type {
  SectionCardData,
  SectionInstance,
  SectionType,
  TemplateType,
} from "@/lib/types"
import { SectionInvitationCard } from "./SectionInvitationCard"
import { PhonePreview } from "./PhonePreview"
import {
  THEME_PRESETS,
  presetsForType,
  isRecommendedPreset,
  themeSwatch,
  applyPreset,
  applyGayaSections,
  type ThemePreset,
} from "@/lib/themes/presets"
import { ImageUploadField } from "./sections/_image_upload"
import { SectionEditorTour, useIsDesktopViewport } from "./SectionEditorTour"
import { completeSectionEditorTourAction } from "@/app/actions/editor-help"
import { PAID_DRAFT_PUBLICATION_ACKNOWLEDGEMENT } from "@/lib/publication"
import { restoreSectionEditorCache } from "@/lib/section-editor-cache"
import { saveLatestThenNavigate } from "@/lib/section-editor-navigation"
import { EditWindowLockedNotice } from "./EditWindowLockedNotice"

type Status = "complete" | "draft" | "error"

class DraftSaveError extends Error {
  readonly status: number
  readonly code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = "DraftSaveError"
    this.status = status
    this.code = code
  }
}

type PublishedResult = {
  slug: string
  publishedAt: string | null
  replayed: boolean
  revision: boolean
}

type SaveResult = {
  draftVersion: number
  lastActivityAt: string | null
}

type Props = {
  paidDraft?: boolean
  /** A manual receipt is being reviewed; payment status remains a separate flow. */
  manualReviewActive?: boolean
  /** Administrator-granted replacement: editable by the owner, publishable only by cutover. */
  controlledReplacement?: {
    reason: string
    preparationReady: boolean
  } | null
  stripeAvailable: boolean
  cardId: string
  orderId: string | null
  slug: string
  userId: string
  templateName: string
  templatePriceMyr: number
  templateType: TemplateType | null
  initialData: SectionCardData
  initialDraftVersion: number
  /** Server-read account-level tour marker (`users.section_editor_tour_completed_at`). */
  tourCompleted: boolean
  /** Administrator-approved post-publication edit window. */
  revisionWindow?: {
    id: string
    expiresAt: string
    grantedAt: string
  } | null
}

const LS_KEY = (cardId: string) => `kamy:card-draft:${cardId}`
const PREVIEW_MODE_KEY = "kamy:preview-mode"
const SAVE_DEBOUNCE_MS = 1500

type PreviewMode = "phone" | "wide"

export function SectionEditor({
  paidDraft = false,
  manualReviewActive = false,
  controlledReplacement = null,
  stripeAvailable,
  cardId,
  orderId,
  slug,
  userId,
  templateName,
  templatePriceMyr,
  templateType,
  initialData,
  initialDraftVersion,
  tourCompleted: initialTourCompleted,
  revisionWindow = null,
}: Props) {
  const router = useRouter()
  const isRevisionWindow = Boolean(revisionWindow)
  const isControlledReplacement = Boolean(controlledReplacement)

  // Two SSR/CSR mismatch sources sit inside this tree:
  //   1. The localStorage draft cache below — undefined during SSR, populated
  //      on the client, so the rendered HTML diverges on first paint.
  //   2. dnd-kit's useSortable auto-generates `aria-describedby="DndDescribedBy-N"`
  //      from a module-level counter. The counter starts at 0 on the server
  //      and at some other N on the client (the editor's own DndContext bumps
  //      it on mount), so every drag-handle span hits a hydration mismatch.
  // Both are fixed by skipping the first paint and rendering the editor
  // body only after mount. `useSyncExternalStore` returns the server
  // snapshot during SSR and the client snapshot after mount, without
  // triggering the setState-in-effect lint rule.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

  const [data, setData] = useState<SectionCardData>(initialData)
  const [draftVersion, setDraftVersion] = useState(
    Math.max(1, initialDraftVersion),
  )
  const [activeIdx, setActiveIdx] = useState(0)
  // Mobile shell (KJ-1): which screen is shown and how tall the form sheet is.
  // Both are inert while isDesktop, which always renders the three panes.
  const [mobilePane, setMobilePane] = useState<"edit" | "stack">("edit")
  const [sheetDetent, setSheetDetent] = useState<"peek" | "half" | "full">("half")
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle")
  const [payState, setPayState] = useState<"idle" | "submitting" | "error">(
    "idle"
  )
  const [statusNavigationState, setStatusNavigationState] = useState<
    "idle" | "saving" | "error"
  >("idle")
  const [statusNavigationError, setStatusNavigationError] = useState("")
  const [showAddSection, setShowAddSection] = useState(false)
  const [previewMode, setPreviewMode] = useState<PreviewMode>("phone")
  // Editor-only request to scroll the Live preview to the selected Section's
  // rendered Section stack item. Token changes so re-selecting the same row
  // scrolls again; disabled rows have no rendered item and never set a target.
  const [previewScroll, setPreviewScroll] = useState<{
    targetId: string
    token: number
  } | null>(null)
  const previewScrollTokenRef = useRef(0)
  // Mobile shell refs: the sheet's height is driven imperatively while the
  // grabber is dragged, then snapped back to a detent class on release.
  const mobileBodyRef = useRef<HTMLDivElement>(null)
  const mobileSheetRef = useRef<HTMLDivElement>(null)
  const mobileSheetDragRef = useRef<{
    startY: number
    startHeight: number
    bodyHeight: number
  } | null>(null)
  const [validationMessage, setValidationMessage] = useState("")
  const [saveError, setSaveError] = useState("")
  const [draftConflict, setDraftConflict] = useState(false)
  const [publicationOpen, setPublicationOpen] = useState(false)
  const [acknowledged, setAcknowledged] = useState(false)
  const [publicationState, setPublicationState] = useState<
    "idle" | "saving" | "publishing" | "error"
  >("idle")
  const [publicationError, setPublicationError] = useState("")
  const [publishedResult, setPublishedResult] = useState<PublishedResult | null>(
    null,
  )
  const [replacementPreparationReady, setReplacementPreparationReady] = useState(
    controlledReplacement?.preparationReady ?? false,
  )
  const [expiredWindowId, setExpiredWindowId] = useState<string | null>(null)

  useEffect(() => {
    if (!revisionWindow) return
    const remaining = new Date(revisionWindow.expiresAt).getTime() - Date.now()
    const timer = window.setTimeout(
      () => setExpiredWindowId(revisionWindow.id),
      Math.max(0, remaining),
    )
    return () => window.clearTimeout(timer)
  }, [revisionWindow])

  const windowExpired = Boolean(
    revisionWindow && expiredWindowId === revisionWindow.id,
  )

  // Tour state is client-only and fully separate from draft data. It is never
  // inferred from localStorage or the card id; the server-provided account
  // flag is the only first-visit signal.
  const [tourOpen, setTourOpen] = useState(false)

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const draftVersionRef = useRef(Math.max(1, initialDraftVersion))
  const publicationVersionRef = useRef<number | null>(null)
  const latestDataRef = useRef(initialData)
  const saveChainRef = useRef<Promise<SaveResult>>(Promise.resolve({
    draftVersion: Math.max(1, initialDraftVersion),
    lastActivityAt: null,
  }))
  const lastSavedRef = useRef<string>("")
  const hasUnsavedChangesRef = useRef(false)
  const statusNavigationBusyRef = useRef(false)

  const saveDraft = useCallback((next: SectionCardData): Promise<SaveResult> => {
    const payload = JSON.stringify(next)
    // Serialize all saves. A force-save for payment or publication must wait for
    // a debounced save already in flight, then use the version that it returned.
    const task = saveChainRef.current
      .catch(() => ({
        draftVersion: draftVersionRef.current,
        lastActivityAt: null,
      }))
      .then(async () => {
        setSaveState("saving")
        setSaveError("")
        const res = await fetch(`/api/cards/${cardId}/draft`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            draft: next,
            expectedDraftVersion: draftVersionRef.current,
          }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => null)
          throw new DraftSaveError(
            body?.error || "Draf tidak dapat disimpan. Sila cuba lagi.",
            res.status,
            typeof body?.code === "string" ? body.code : undefined,
          )
        }
        const body = (await res.json()) as {
          draftVersion?: unknown
          lastActivityAt?: unknown
        }
        if (
          typeof body.draftVersion !== "number" ||
          !Number.isSafeInteger(body.draftVersion) ||
          body.draftVersion < 1
        ) {
          throw new DraftSaveError("Versi draf tidak sah. Sila cuba lagi.", 500)
        }
        draftVersionRef.current = body.draftVersion
        setDraftVersion(body.draftVersion)
        lastSavedRef.current = payload
        if (JSON.stringify(latestDataRef.current) === payload) {
          hasUnsavedChangesRef.current = false
        }
        setDraftConflict(false)
        setSaveState("saved")
        return {
          draftVersion: body.draftVersion,
          lastActivityAt:
            typeof body.lastActivityAt === "string" ? body.lastActivityAt : null,
        }
      })
    saveChainRef.current = task
    return task
  }, [cardId])

  const showSaveFailure = useCallback((error: unknown, fallback: string) => {
    const message = error instanceof Error ? error.message : fallback
    setSaveState("error")
    setSaveError(message)
    if (error instanceof DraftSaveError && error.status === 409) {
      setDraftConflict(true)
      if (
        error.code === "EDIT_WINDOW_EXPIRED" ||
        error.code === "CARD_UNAVAILABLE" ||
        error.code === "EDIT_WINDOW_CORRUPT"
      ) {
        if (revisionWindow) setExpiredWindowId(revisionWindow.id)
      }
    }
  }, [revisionWindow])

  function clearPendingSaveTimer() {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
  }

  async function handleManualReviewStatus() {
    if (!manualReviewActive || !orderId || statusNavigationBusyRef.current) return

    statusNavigationBusyRef.current = true
    const fallback = "Draf tidak dapat disimpan. Sila cuba lagi."
    try {
      const navigated = await saveLatestThenNavigate({
        clearPendingSave: clearPendingSaveTimer,
        readLatest: () => latestDataRef.current,
        save: (latest) => saveDraft(latest),
        navigate: () => router.push(`/dashboard/checkout/${orderId}/qr`),
        onSaving: () => {
          setStatusNavigationState("saving")
          setStatusNavigationError("")
        },
        onError: (error) => {
          setStatusNavigationState("error")
          setStatusNavigationError(
            error instanceof Error && error.message ? error.message : fallback,
          )
          showSaveFailure(error, fallback)
        },
      })
      if (navigated) setStatusNavigationState("idle")
    } finally {
      statusNavigationBusyRef.current = false
    }
  }

  // Restore the preview framing choice (phone vs wide) from a previous session.
  useEffect(() => {
    if (typeof window === "undefined") return
    const v = window.localStorage.getItem(PREVIEW_MODE_KEY)
    if (v === "phone" || v === "wide") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPreviewMode(v)
    }
  }, [])

  function changePreviewMode(m: PreviewMode) {
    setPreviewMode(m)
    try {
      window.localStorage.setItem(PREVIEW_MODE_KEY, m)
    } catch {
      /* ignore */
    }
  }

  // Hydrate from localStorage after mount so the SSR-rendered HTML matches
  // what the client first paints. Only a structurally valid versioned cache
  // matching the server version can restore edits. Legacy raw caches remain
  // supported for unpaid editing, but never for paid drafts because they have
  // no version proof and must not silently replace newer server content.
  useEffect(() => {
    if (typeof window === "undefined") return
    if (isRevisionWindow) return
    let cached: string | null
    try {
      cached = window.localStorage.getItem(LS_KEY(cardId))
    } catch {
      return
    }
    if (!cached) return
    const cachedData = restoreSectionEditorCache(
      cached,
      paidDraft,
      draftVersionRef.current,
    )
    if (!cachedData) return
    latestDataRef.current = cachedData
    setData(cachedData)
  }, [cardId, paidDraft, isRevisionWindow])

  // Persist to localStorage on every change for resilience.
  useEffect(() => {
    if (typeof window === "undefined") return
    latestDataRef.current = data
    window.localStorage.setItem(
      LS_KEY(cardId),
      JSON.stringify({ data, draftVersion }),
    )
  }, [cardId, data, draftVersion])

  // First-visit tour launch. Runs only after mount so the hydration shell
  // never queries missing target DOM; the server-provided account flag is
  // the only signal, and completing or dismissing the tour marks it locally
  // so a settled tour does not relaunch. The tour picks its own step list per
  // viewport, so it launches on mobile and desktop alike; the mobile shell's
  // default "edit" pane is the state the first-visit launch opens in.
  const isDesktop = useIsDesktopViewport()
  const launchedRef = useRef(false)
  useEffect(() => {
    if (mounted && !paidDraft && !isRevisionWindow && !initialTourCompleted && !launchedRef.current) {
      launchedRef.current = true
      setTourOpen(true)
    }
  }, [mounted, isDesktop, initialTourCompleted, paidDraft, isRevisionWindow])

  // Track the software keyboard via the visual viewport so bottom-pinned
  // chrome (the error banner, and the mobile rail / sheet) can sit above it.
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const sync = () => {
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
      document.documentElement.style.setProperty("--kb-inset", `${inset}px`)
    }
    sync()
    vv.addEventListener("resize", sync)
    vv.addEventListener("scroll", sync)
    return () => {
      vv.removeEventListener("resize", sync)
      vv.removeEventListener("scroll", sync)
      document.documentElement.style.removeProperty("--kb-inset")
    }
  }, [])

  // Isolated completion callback for the tour: stamps the account-level
  // marker via the dedicated server action. It receives no editor data and
  // never calls updateData / scheduleSave / saveDraft. Success only settles
  // the tour's ephemeral state (launched/open refs); card data is untouched.
  const handleTourComplete = useCallback(async (): Promise<boolean> => {
    const res = await completeSectionEditorTourAction()
    return res.ok
  }, [])

  const handleTourSettled = useCallback(() => setTourOpen(false), [setTourOpen])

  // Debounced server-side save.
  const scheduleSave = useCallback(
    (next: SectionCardData) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(async () => {
        const payload = JSON.stringify(next)
        if (payload === lastSavedRef.current) return
        try {
          await saveDraft(next)
        } catch (error) {
          showSaveFailure(error, "Draf tidak dapat disimpan.")
        }
      }, SAVE_DEBOUNCE_MS)
    },
    [saveDraft, showSaveFailure]
  )

  function updateData(next: SectionCardData) {
    hasUnsavedChangesRef.current = true
    if (isControlledReplacement) setReplacementPreparationReady(false)
    // A new edit invalidates a previously prepared publication retry. The next
    // attempt must flush this newer content before calling the publish route.
    publicationVersionRef.current = null
    if (!statusNavigationBusyRef.current) {
      setStatusNavigationState("idle")
      setStatusNavigationError("")
    }
    setData(next)
    latestDataRef.current = next
    scheduleSave(next)
  }

  useEffect(() => {
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChangesRef.current || saveState === "saving" || saveState === "error") {
        event.preventDefault()
        event.returnValue = ""
      }
    }
    window.addEventListener("beforeunload", warnBeforeUnload)
    return () => window.removeEventListener("beforeunload", warnBeforeUnload)
  }, [saveState])

  // Card-level Gaya: swap the whole theme (palette + fonts + background) and
  // re-suggest section variants the customer hasn't manually locked.
  function pickGaya(preset: ThemePreset) {
    updateData({
      ...data,
      theme: applyPreset(data.theme, preset),
      sections: applyGayaSections(data.sections, preset),
    })
  }

  function updateSection(idx: number, patch: Partial<SectionInstance>) {
    const next: SectionCardData = {
      ...data,
      sections: data.sections.map((s, i) =>
        i === idx ? ({ ...s, ...patch } as SectionInstance) : s
      ),
    }
    updateData(next)
  }

  function updateSectionData(
    idx: number,
    newSectionData: SectionInstance["data"]
  ) {
    updateSection(idx, { data: newSectionData })
  }

  function toggleSection(idx: number) {
    updateSection(idx, { enabled: !data.sections[idx].enabled })
  }

  function reorderSections(from: number, to: number) {
    const next: SectionCardData = {
      ...data,
      sections: arrayMove(data.sections, from, to).map((s, i) => ({
        ...s,
        order: i,
      })),
    }
    updateData(next)
    // Keep the active section under the cursor after reorder.
    if (activeIdx === from) setActiveIdx(to)
    else if (from < activeIdx && to >= activeIdx) setActiveIdx(activeIdx - 1)
    else if (from > activeIdx && to <= activeIdx) setActiveIdx(activeIdx + 1)
  }

  // Selecting an enabled row also requests a Live preview scroll to its
  // rendered Section stack item. Disabled rows activate editing only — they
  // have no rendered item to scroll to.
  function activateSectionRow(idx: number) {
    setActiveIdx(idx)
    const s = data.sections[idx]
    if (!s?.enabled) return
    previewScrollTokenRef.current += 1
    setPreviewScroll({ targetId: sectionId(s), token: previewScrollTokenRef.current })
  }

  function removeSection(idx: number) {
    const next: SectionCardData = {
      ...data,
      sections: data.sections
        .filter((_, i) => i !== idx)
        .map((s, i) => ({ ...s, order: i })),
    }
    updateData(next)
    setActiveIdx((p) => Math.min(p, next.sections.length - 1))
  }

  function addSection(type: SectionType) {
    const next: SectionCardData = {
      ...data,
      sections: [
        ...data.sections,
        defaultSectionInstance(type, data.sections.length),
      ],
    }
    updateData(next)
    setActiveIdx(next.sections.length - 1)
    setShowAddSection(false)
  }

  // Mobile stepper walk list: disabled Sections render nothing on the card, so
  // Kembali / Seterusnya skip them. They stay reachable from the ☰ stack.
  const walk = useMemo(
    () => data.sections.map((s, i) => (s.enabled ? i : -1)).filter((i) => i >= 0),
    [data.sections],
  )
  const walkPos = walk.indexOf(activeIdx)

  function stepMobileSection(delta: number) {
    const nextPos = Math.min(walk.length - 1, Math.max(0, walkPos + delta))
    const idx = walk[nextPos]
    if (idx !== undefined) activateSectionRow(idx)
  }

  // Validation: parse each section's data through its schema; build status map.
  const statuses = useMemo<Record<number, Status>>(() => {
    const out: Record<number, Status> = {}
    data.sections.forEach((s, i) => {
      const mod = sectionRegistry[s.type as SectionType]
      if (!mod) {
        out[i] = "error"
        return
      }
      const parsed = mod.schema.safeParse(s.data)
      if (!parsed.success) {
        // Distinguish "empty required field" from "explicit error"
        const hasRequiredButEmpty = parsed.error.issues.some(
          (it) => it.code === "invalid_type" || it.code === "too_small"
        )
        out[i] = hasRequiredButEmpty ? "draft" : "error"
      } else {
        out[i] = "complete"
      }
    })
    return out
  }, [data])

  const fieldErrors = useMemo(() => {
    const s = data.sections[activeIdx]
    if (!s) return {}
    const mod = sectionRegistry[s.type as SectionType]
    if (!mod) return {}
    const parsed = mod.schema.safeParse(s.data)
    if (parsed.success) return {}
    const out: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".")
      out[key] = issue.message
    }
    return out
  }, [data, activeIdx])

  const [paymentChoiceOpen, setPaymentChoiceOpen] = useState(false)

  function showValidationError(): boolean {
    const errored = data.sections
      .map((s, i) => ({ s, i, status: statuses[i] }))
      .filter((x) => x.s.enabled && x.status !== "complete")

    if (errored.length > 0) {
      const first = errored[0]
      const mod = sectionRegistry[first.s.type as SectionType]
      const parsed = mod?.schema.safeParse(first.s.data)
      const fields = parsed && !parsed.success
        ? parsed.error.issues.map((issue) => fieldLabel(issue.path.join("."))).filter(Boolean)
        : []
      setValidationMessage(`Sila lengkapkan ${fields.length ? fields.join(", ") : "maklumat wajib"} dalam ${mod?.label.ms ?? "bahagian ini"} sebelum meneruskan.`)
      setActiveIdx(first.i)
      window.scrollTo({ top: 0, behavior: "smooth" })
      window.setTimeout(() => {
        document.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
          "main input:not([type=hidden]), main textarea, main select"
        )?.focus()
      }, 0)
      return true
    }
    return false
  }

  async function handleContinueToPayment() {
    if (isRevisionWindow || isControlledReplacement) return
    // Block if any section has hard errors. Sections with `draft` status
    // (incomplete but no zod violations) we still allow — the form lets
    // customers proceed and fill in later. Required-empty would show
    // as "draft"; we make required-empty actually block.
    if (showValidationError()) return

    setPayState("submitting")
    try {
      // First, ensure latest draft is on the server.
      clearPendingSaveTimer()
      await saveDraft(data)
      if (!orderId) throw new Error("Missing order")
      setPaymentChoiceOpen(true)
      setPayState("idle")
    } catch (error) {
      setPayState("error")
      showSaveFailure(error, "Pembayaran tidak dapat dibuka.")
    }
  }

  function openPublicationDialog() {
    setAcknowledged(false)
    setPublicationError("")
    setPublicationState("idle")
    setPublicationOpen(true)
  }

  const publicationBusy =
    publicationState === "saving" || publicationState === "publishing"

  async function handlePublishPaidDraft() {
    if (isControlledReplacement || (!paidDraft && !isRevisionWindow)) return
    if (draftConflict) {
      setPublicationError("Muat semula draf ini sebelum menerbitkannya.")
      return
    }
    if (!acknowledged) {
      setPublicationError(
        `Sila tandakan kotak pengesahan: “${PAID_DRAFT_PUBLICATION_ACKNOWLEDGEMENT}”`,
      )
      return
    }
    if (showValidationError()) {
      setPublicationError("Lengkapkan maklumat wajib sebelum menerbitkan jemputan.")
      return
    }

    clearPendingSaveTimer()
    setPublicationError("")
    setPublicationState("saving")
    try {
      // The publication version is taken only after this serialized save. This
      // makes a final keystroke publishable while refusing to publish a failed
      // or stale save. Once the publish request has started, retain that
      // version so a lost response can safely retry the idempotent RPC without
      // attempting another save against an already-published row.
      const savedVersion =
        publicationVersionRef.current ?? (await saveDraft(data)).draftVersion
      publicationVersionRef.current = savedVersion
      setPublicationState("publishing")
      const res = await fetch(`/api/cards/${cardId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acknowledged: true,
          acknowledgement: PAID_DRAFT_PUBLICATION_ACKNOWLEDGEMENT,
          expectedDraftVersion: savedVersion,
          ...(revisionWindow ? { editWindowId: revisionWindow.id } : {}),
        }),
      })
      const body = (await res.json().catch(() => null)) as {
        cardSlug?: unknown
        published?: unknown
        publishedAt?: unknown
        replayed?: unknown
        revision?: unknown
        error?: unknown
        code?: unknown
      } | null
      if (!res.ok) {
        throw new DraftSaveError(
          typeof body?.error === "string"
            ? body.error
            : "Jemputan tidak dapat diterbitkan. Sila cuba lagi.",
          res.status,
          typeof body?.code === "string" ? body.code : undefined,
        )
      }
      if (body?.published !== true || typeof body.cardSlug !== "string") {
        throw new DraftSaveError(
          "Jemputan tidak dapat diterbitkan. Sila cuba lagi.",
          500,
        )
      }
      setPublicationOpen(false)
      setPublishedResult({
        slug: body.cardSlug,
        publishedAt:
          typeof body.publishedAt === "string" ? body.publishedAt : null,
        replayed: body.replayed === true,
        revision: body.revision === true,
      })
    } catch (error) {
      setPublicationState("error")
      setPublicationError(
        error instanceof Error
          ? error.message
          : "Jemputan tidak dapat diterbitkan. Sila cuba lagi.",
      )
      if (error instanceof DraftSaveError && error.status === 409) {
        setDraftConflict(true)
        if (error.code === "EDIT_WINDOW_EXPIRED" || error.code === "CARD_UNAVAILABLE") {
          if (revisionWindow) setExpiredWindowId(revisionWindow.id)
        }
      }
    }
  }

  const active = data.sections[activeIdx]
  const activeModule = active
    ? sectionRegistry[active.type as SectionType]
    : null

  // Pull dnd-kit sensors before any conditional return so rules-of-hooks
  // sees the same hook order on every render.
  const dndSensors = useDndSensors()

  if (!mounted) {
    // Match the top-bar shell so the layout doesn't jump when the editor
    // mounts. The center / sidebar / preview panes are intentionally empty
    // until after hydration to keep dnd-kit and localStorage state SSR-safe.
    return (
      <div className="section-editor se-mobile" style={pageStyle}>
        <header style={topBarStyle}>
          <Link href="/dashboard" style={backLinkStyle}>
            ← Dashboard
          </Link>
          <div>
            <div style={titleStyle}>{templateName}</div>
            <div style={subTitleStyle}>
              <span style={hintStyle}>Memuatkan…</span>
            </div>
          </div>
          <span style={{ ...primaryButtonStyle, opacity: 0.5 }}>
            RM {(templatePriceMyr / 100).toFixed(0)}
          </span>
        </header>
      </div>
    )
  }

  if (windowExpired && revisionWindow) {
    return (
      <EditWindowLockedNotice
        expiresAt={revisionWindow.expiresAt}
        reason="Tetingkap suntingan telah tamat atau pentadbir telah mengunci jemputan ini."
      />
    )
  }

  if (publishedResult) {
    return (
      <PublicationComplete
        slug={publishedResult.slug}
        publishedAt={publishedResult.publishedAt}
        replayed={publishedResult.replayed}
        revision={publishedResult.revision}
      />
    )
  }

  // The Section stack and the active Section's sub-form are shared verbatim by
  // the desktop three-pane shell and the mobile C + D shell.
  const sectionStack = (
    <>
      <GayaPanel
        activeId={data.theme.preset}
        templateType={templateType}
        onPick={pickGaya}
      />
      <SidebarHeader>Bahagian</SidebarHeader>
      <DndContext
        collisionDetection={closestCenter}
        sensors={dndSensors}
        onDragEnd={(e: DragEndEvent) => {
          const { active: a, over } = e
          if (!over || a.id === over.id) return
          const from = data.sections.findIndex((s) => sectionId(s) === a.id)
          const to = data.sections.findIndex((s) => sectionId(s) === over.id)
          if (from === -1 || to === -1) return
          reorderSections(from, to)
        }}
      >
        <SortableContext
          items={data.sections.map(sectionId)}
          strategy={verticalListSortingStrategy}
        >
          <ul style={sidebarListStyle}>
            {data.sections.map((s, i) => (
              <SidebarRow
                key={sectionId(s)}
                sec={s}
                idx={i}
                // "Galeri Foto 2" when the same type appears more than once
                ordinal={
                  data.sections.filter((x) => x.type === s.type).length > 1
                    ? data.sections.slice(0, i + 1).filter((x) => x.type === s.type).length
                    : undefined
                }
                active={i === activeIdx}
                status={statuses[i]}
                onActivate={() => {
                  activateSectionRow(i)
                  // On mobile the ☰ stack is a jump screen: a row tap returns
                  // to the card + sheet. Desktop ignores these (its own panes).
                  if (!isDesktop) {
                    setMobilePane("edit")
                    setSheetDetent("half")
                  }
                }}
                onToggle={() => toggleSection(i)}
                onRemove={() => removeSection(i)}
                // The mobile Section stack's first row is the Susun Bahagian
                // tour target; desktop shows no such hook.
                tourTarget={!isDesktop && i === 0}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      <button
        onClick={() => setShowAddSection(true)}
        style={addSectionButtonStyle}
      >
        + Tambah Bahagian
      </button>
      {showAddSection && (
        <AddSectionPicker
          templateId={data.templateId}
          templateType={templateType}
          existing={data.sections.map((s) => s.type)}
          onPick={(t) => addSection(t)}
          onClose={() => setShowAddSection(false)}
        />
      )}
    </>
  )

  const activeSubForm =
    active && activeModule ? (
      <SubForm
        key={`${active.type}-${activeIdx}`}
        section={active}
        sectionIdx={activeIdx}
        cardId={cardId}
        userId={userId}
        errors={fieldErrors}
        templateType={templateType}
        onChange={(d) => updateSectionData(activeIdx, d)}
        onVariantChange={(v) =>
          // Manual pick locks the section against Gaya auto-suggestion.
          updateSection(activeIdx, { variant: v, variantAuto: false })
        }
      />
    ) : (
      <p style={{ padding: 24, color: "var(--muted-foreground)" }}>
        Pilih bahagian dari kiri untuk mula menyunting.
      </p>
    )

  // Mobile rail's final-step action: the same entitlement handlers as the top
  // bar, mirroring its labels too so a failed / in-flight action reports state.
  const mobilePrimary: {
    label: string
    glyph: string
    disabled: boolean
    onClick: () => void
  } = isControlledReplacement
    ? {
        label: "Menunggu potong ganti",
        glyph: "",
        disabled: true,
        onClick: () => {},
      }
    : paidDraft || isRevisionWindow
      ? {
          label: publicationBusy
            ? publicationState === "saving"
              ? "Menyimpan…"
              : "Menerbitkan…"
            : isRevisionWindow
              ? "Terbitkan Perubahan"
              : "Terbitkan Jemputan",
          glyph: "✓",
          disabled: publicationBusy,
          onClick: openPublicationDialog,
        }
      : manualReviewActive && orderId
        ? {
            label:
              statusNavigationState === "saving"
                ? "Menyimpan…"
                : statusNavigationState === "error"
                  ? "Cuba lagi"
                  : "Semak Status Bayaran",
            glyph: "→",
            disabled: statusNavigationState === "saving",
            onClick: () => void handleManualReviewStatus(),
          }
        : {
            label:
              payState === "submitting"
                ? "Memproses…"
                : payState === "error"
                  ? "Cuba bayar semula"
                  : "Teruskan ke Pembayaran",
            glyph: "→",
            disabled: payState === "submitting",
            onClick: handleContinueToPayment,
          }

  // Grabber drag: resize the sheet live, then snap to the nearest detent.
  function onMobileGrabberDown(e: ReactPointerEvent<HTMLDivElement>) {
    const sheet = mobileSheetRef.current
    const body = mobileBodyRef.current
    if (!sheet || !body) return
    mobileSheetDragRef.current = {
      startY: e.clientY,
      startHeight: sheet.getBoundingClientRect().height,
      bodyHeight: body.getBoundingClientRect().height,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
    sheet.style.transition = "none"
  }

  function onMobileGrabberMove(e: ReactPointerEvent<HTMLDivElement>) {
    const drag = mobileSheetDragRef.current
    const sheet = mobileSheetRef.current
    if (!drag || !sheet) return
    const next = Math.min(
      drag.bodyHeight * 0.92,
      Math.max(drag.bodyHeight * 0.18, drag.startHeight - (e.clientY - drag.startY)),
    )
    sheet.style.height = `${next}px`
  }

  function onMobileGrabberUp() {
    const drag = mobileSheetDragRef.current
    const sheet = mobileSheetRef.current
    if (!drag || !sheet) return
    mobileSheetDragRef.current = null
    const pct = sheet.getBoundingClientRect().height / drag.bodyHeight
    setSheetDetent(pct < 0.42 ? "peek" : pct < 0.74 ? "half" : "full")
    sheet.style.transition = ""
    sheet.style.height = ""
  }

  return (
    <div className={isDesktop ? "section-editor" : "section-editor se-mobile"} style={pageStyle}>
      {/* Top bar */}
      <header style={topBarStyle}>
        <Link href="/dashboard" style={backLinkStyle}>
          ← Dashboard
        </Link>
        <div>
          <div style={titleStyle}>{templateName}</div>
          <div style={subTitleStyle}>
            <span
              data-editor-tour="save-indicator"
              style={{ display: "inline-flex", alignItems: "center" }}
            >
              <SaveIndicator state={saveState} />
            </span>
            {saveState === "error" && (
              <button
                type="button"
                onClick={() => {
                  clearPendingSaveTimer()
                  void saveDraft(data).catch((error) =>
                    showSaveFailure(error, "Draf tidak dapat disimpan."),
                  )
                }}
                style={retryButtonStyle}
              >
                Cuba lagi
              </button>
            )}
            {payState === "error" && (
              <span style={{ ...hintStyle, color: "#c0392b", marginLeft: 12 }}>
                Pembayaran gagal — cuba lagi
              </span>
            )}
          </div>
        </div>
        {!paidDraft && !isRevisionWindow && (
          <button
            type="button"
            onClick={() => setTourOpen(true)}
            style={helpButtonStyle}
            className="se-helpbtn"
            aria-label="Main semula panduan penyunting"
          >
            Bantuan
          </button>
        )}
        {isControlledReplacement ? (
          <div style={replacementActionStyle}>
            <span style={{ ...hintStyle, color: "var(--primary)", fontWeight: 700 }}>
              Administrator-granted replacement · Menunggu potong ganti
            </span>
            <span style={replacementReasonStyle}>
              {controlledReplacement?.reason}
            </span>
            <span style={{ ...hintStyle, color: replacementPreparationReady ? "#286243" : "var(--muted-foreground)" }}>
              {replacementPreparationReady
                ? "Persediaan aset sedia untuk versi ini"
                : "Simpan perubahan; pentadbir perlu menyediakan versi terkini sebelum potong ganti"}
            </span>
          </div>
        ) : paidDraft || isRevisionWindow ? (
          <div style={paidDraftActionStyle}>
            <span style={{ ...hintStyle, color: "#286243", fontWeight: 700 }}>
              {isRevisionWindow
                ? `Suntingan diluluskan · Tamat ${new Date(revisionWindow!.expiresAt).toLocaleString("ms-MY", { timeZone: "Asia/Kuala_Lumpur", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`
                : "Draf Berbayar · Belum diterbitkan"}
            </span>
            <button
              type="button"
              onClick={openPublicationDialog}
              disabled={publicationBusy}
              style={publicationButtonStyle}
              data-editor-tour="publish-button"
            >
              {publicationBusy ? (
                <>
                  <Loader2 size={14} aria-hidden className="animate-spin" />
                  {publicationState === "saving" ? "Menyimpan…" : "Menerbitkan…"}
                </>
              ) : (
                <>
                  <LockKeyhole size={14} aria-hidden />
                  {isRevisionWindow ? "Terbitkan Perubahan" : "Terbitkan Jemputan"}
                </>
              )}
            </button>
          </div>
        ) : manualReviewActive && orderId ? (
          <div style={manualReviewActionStyle}>
            <button
              type="button"
              onClick={() => void handleManualReviewStatus()}
              disabled={statusNavigationState === "saving"}
              aria-busy={statusNavigationState === "saving"}
              style={isDesktop ? { ...primaryButtonStyle, marginLeft: 0 } : primaryButtonStyle}
              data-editor-tour="pay-button"
            >
              {statusNavigationState === "saving" ? (
                <>
                  <Loader2 size={14} aria-hidden className="animate-spin" />
                  Menyimpan…
                </>
              ) : statusNavigationState === "error" ? (
                "Cuba lagi"
              ) : (
                "Semak Status Bayaran"
              )}
            </button>
            {statusNavigationState === "error" && (
              <span role="alert" style={manualReviewErrorStyle}>
                {draftConflict
                  ? "Draf telah berubah di tempat lain. Muat semula sebelum menyemak status bayaran."
                  : statusNavigationError || "Draf tidak dapat disimpan. Sila cuba lagi."}
              </span>
            )}
          </div>
        ) : (
          <button
            onClick={handleContinueToPayment}
            disabled={payState === "submitting"}
            style={isDesktop ? { ...primaryButtonStyle, marginLeft: 0 } : primaryButtonStyle}
            data-editor-tour="pay-button"
          >
            {payState === "submitting"
              ? "Memproses…"
              : payState === "error"
              ? "Cuba bayar semula"
              : `Teruskan ke Pembayaran — RM ${(templatePriceMyr / 100).toFixed(0)}`}
          </button>
        )}
      </header>

      {orderId && !isRevisionWindow && !isControlledReplacement && <PaymentMethodDialog open={paymentChoiceOpen} onOpenChange={setPaymentChoiceOpen} orderId={orderId} stripeAvailable={stripeAvailable} />}
      {!isControlledReplacement && (paidDraft || isRevisionWindow) && (
        <Dialog
          open={publicationOpen}
          onOpenChange={(open) => {
            if (!publicationBusy) setPublicationOpen(open)
          }}
        >
          <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[min(32rem,calc(100vw-1rem))] overflow-y-auto border-[var(--border)] bg-card p-0 text-[var(--foreground)] shadow-2xl sm:rounded-2xl">
            <div className="p-6 sm:p-8">
              <DialogHeader className="space-y-3 text-left">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--secondary)] text-[var(--primary)]">
                    <LockKeyhole size={19} aria-hidden />
                  </span>
                  <div>
                    <DialogTitle className="font-[var(--font-cormorant)] text-3xl font-semibold tracking-[-0.02em] text-[var(--primary)]">
                      {isRevisionWindow ? "Terbitkan perubahan" : "Terbitkan jemputan"}
                    </DialogTitle>
                    <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
                      {isRevisionWindow ? "Tetingkap suntingan" : "Langkah terakhir"}
                    </p>
                  </div>
                </div>
                <DialogDescription className="max-w-prose text-sm leading-6 text-[var(--muted-foreground)]">
                  Kandungan terkini akan disimpan dahulu. Selepas diterbitkan,
                  {isRevisionWindow
                    ? " perubahan ini akan menggantikan versi awam dan menjadi bacaan tetamu."
                    : " jemputan menjadi awam dan tidak lagi boleh disunting."}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-6 rounded-xl border border-[#eadfcf] bg-[#fdf6ec] p-4">
                <div className="flex gap-3">
                  <CircleAlert className="mt-0.5 shrink-0 text-[var(--accent)]" size={18} aria-hidden />
                  <p className="text-sm leading-6 text-[var(--muted-foreground)]">
                    Pastikan nama, tarikh, lokasi, Gaya panel dan semua Section
                    sudah tepat. Penerbitan menggunakan versi draf terakhir yang
                    berjaya disimpan.
                  </p>
                </div>
              </div>

              <label
                htmlFor="publication-acknowledgement"
                className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--border)] bg-white p-4 text-sm leading-6 text-[var(--primary)] transition-colors has-[:focus-visible]:border-[var(--primary)] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--accent)]/40"
              >
                <input
                  id="publication-acknowledgement"
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(event) => {
                    setAcknowledged(event.target.checked)
                    if (event.target.checked) setPublicationError("")
                  }}
                  className="mt-1 h-4 w-4 shrink-0 accent-[var(--primary)]"
                />
                <span>{PAID_DRAFT_PUBLICATION_ACKNOWLEDGEMENT}</span>
              </label>

              {draftConflict && (
                <div role="alert" className="mt-4 rounded-lg border border-[#f0c9c1] bg-[#fff0ee] p-3 text-sm leading-5 text-[#9b2c22]">
                  Draf ini telah berubah di tempat lain. Muat semula untuk
                  mendapatkan versi terkini sebelum menerbitkan.
                  <button
                    type="button"
                    className="ml-2 font-semibold underline underline-offset-2"
                    onClick={() => window.location.reload()}
                  >
                    Muat semula
                  </button>
                </div>
              )}
              {publicationError && !draftConflict && (
                <p role="alert" className="mt-4 rounded-lg border border-[#f0c9c1] bg-[#fff0ee] p-3 text-sm leading-5 text-[#9b2c22]">
                  {publicationError}
                </p>
              )}

              <DialogFooter className="mt-7 gap-2 sm:space-x-2">
                <button
                  type="button"
                  onClick={() => setPublicationOpen(false)}
                  disabled={publicationBusy}
                  className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[var(--border)] bg-transparent px-4 text-sm font-semibold text-[var(--primary)] transition-colors hover:bg-[var(--secondary)]"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => void handlePublishPaidDraft()}
                  disabled={!acknowledged || publicationBusy || draftConflict}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--background)] transition-colors hover:bg-[#402664] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {publicationState === "saving" ? "Menyimpan perubahan…" : publicationState === "publishing" ? "Menerbitkan…" : publicationState === "error" ? "Cuba lagi" : isRevisionWindow ? "Terbitkan perubahan" : "Terbitkan sekarang"}
                </button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      )}
      {validationMessage && (
        <div role="alert" style={validationBannerStyle}>{validationMessage}</div>
      )}
      {isDesktop ? (
        <div style={threePaneStyle}>
          {/* Sidebar */}
          <aside style={sidebarStyle} data-editor-tour="sidebar">
            {sectionStack}
          </aside>

          {/* Center: sub-form */}
          <main style={centerStyle} data-editor-tour="sub-form">
            {activeSubForm}
          </main>

          {/* Right: live preview (standardised phone frame + fallback toggle) */}
          <aside style={previewPaneStyle} data-editor-tour="preview">
            <div style={previewToolbarStyle}>
              <span style={previewToolbarLabelStyle}>Pratonton</span>
              <div style={segmentWrapStyle}>
                <button
                  type="button"
                  onClick={() => changePreviewMode("phone")}
                  style={segmentBtnStyle(previewMode === "phone")}
                  aria-pressed={previewMode === "phone"}
                >
                  Telefon
                </button>
                <button
                  type="button"
                  onClick={() => changePreviewMode("wide")}
                  style={segmentBtnStyle(previewMode === "wide")}
                  aria-pressed={previewMode === "wide"}
                >
                  Lebar
                </button>
              </div>
            </div>
            <PhonePreview mode={previewMode}>
              <SectionInvitationCard
                cardId={cardId}
                userId={userId}
                data={data}
                scrollTargetId={previewScroll?.targetId}
                scrollToken={previewScroll?.token}
              />
            </PhonePreview>
            <p style={previewHintStyle}>Kemas kini secara langsung</p>
          </aside>
        </div>
      ) : (
        <div className="se-mobile-body" ref={mobileBodyRef}>
          {mobilePane === "stack" ? (
            <div className="se-stack">{sectionStack}</div>
          ) : (
            <>
              <div className="se-canvas" data-editor-tour="mobile-canvas">
                <PhonePreview mode="bare">
                  <SectionInvitationCard
                    cardId={cardId}
                    userId={userId}
                    data={data}
                    scrollTargetId={previewScroll?.targetId}
                    scrollToken={previewScroll?.token}
                  />
                </PhonePreview>
              </div>
              <div
                className="se-sheet"
                data-detent={sheetDetent}
                data-editor-tour="mobile-sheet"
                ref={mobileSheetRef}
              >
                <div
                  className="se-grabber"
                  aria-label="Laraskan ketinggian borang"
                  onPointerDown={onMobileGrabberDown}
                  onPointerMove={onMobileGrabberMove}
                  onPointerUp={onMobileGrabberUp}
                  onPointerCancel={onMobileGrabberUp}
                >
                  <span className="se-grabber-bar" />
                </div>
                <div className="se-progress" aria-hidden>
                  {walk.map((_, i) => (
                    <i key={i} className={i < walkPos ? "done" : i === walkPos ? "now" : ""} />
                  ))}
                </div>
                <div className="se-sheethead">
                  <StatusDot status={statuses[activeIdx] ?? "draft"} />
                  <b>{activeModule?.label.ms ?? "Bahagian"}</b>
                  {walk.length > 0 && (
                    <span className="se-count">
                      {walkPos + 1} / {walk.length}
                    </span>
                  )}
                  <div className="se-detents" data-editor-tour="mobile-detents">
                    <button
                      type="button"
                      onClick={() => setSheetDetent("peek")}
                      aria-pressed={sheetDetent === "peek"}
                      aria-label="Petak kecil"
                    >
                      ▁
                    </button>
                    <button
                      type="button"
                      onClick={() => setSheetDetent("half")}
                      aria-pressed={sheetDetent === "half"}
                      aria-label="Separuh"
                    >
                      ▄
                    </button>
                    <button
                      type="button"
                      onClick={() => setSheetDetent("full")}
                      aria-pressed={sheetDetent === "full"}
                      aria-label="Penuh"
                    >
                      █
                    </button>
                  </div>
                </div>
                <div className="se-sheetbody">{activeSubForm}</div>
              </div>
            </>
          )}

          <div className="se-rail" data-editor-tour="mobile-rail">
            {mobilePane === "stack" ? (
              <button
                type="button"
                className="se-rail-btn se-wide se-go"
                onClick={() => setMobilePane("edit")}
              >
                ✎ Kembali ke kad
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="se-rail-btn se-wide"
                  onClick={() => stepMobileSection(-1)}
                  disabled={walkPos <= 0}
                >
                  ← Kembali
                </button>
                <button
                  type="button"
                  className="se-rail-btn se-listbtn"
                  onClick={() => setMobilePane("stack")}
                  aria-label="Semua bahagian"
                  title="Semua bahagian"
                >
                  ☰
                </button>
                {walk.length > 0 && walkPos === walk.length - 1 ? (
                  <button
                    type="button"
                    className="se-rail-btn se-wide se-go se-final"
                    onClick={mobilePrimary.onClick}
                    disabled={mobilePrimary.disabled}
                  >
                    {mobilePrimary.label} {mobilePrimary.glyph}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="se-rail-btn se-wide se-go"
                    onClick={() => stepMobileSection(1)}
                  >
                    Seterusnya →
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {payState === "error" && (
        <div style={errorBannerStyle}>
          {saveError || "Pembayaran tidak dapat dibuka. Sila cuba lagi."}
        </div>
      )}

      <ViewPublishedNotice slug={slug} />
      <SectionEditorTour
        open={tourOpen}
        onComplete={handleTourComplete}
        onSettled={handleTourSettled}
        // The pane callback is a mobile-only affordance; the desktop tour has
        // no pane steps and never asks the editor to switch.
        mobilePane={isDesktop ? undefined : mobilePane}
        onRequestPane={isDesktop ? undefined : setMobilePane}
      />
      <input type="hidden" data-user-id={userId} />
    </div>
  )
}

// ---------- Sidebar -------------------------------------------------------

function useDndSensors() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    // Touch starts a drag only after a held press, so the list can scroll.
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )
}

function sectionId(s: SectionInstance): string {
  return `${s.type}-${s.order}`
}

function SidebarHeader({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: "12px 14px",
        fontSize: 11,
        fontWeight: 700,
        color: "var(--muted-foreground)",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        borderBottom: "1px solid var(--border)",
      }}
    >
      {children}
    </div>
  )
}

function SidebarRow({
  sec,
  idx,
  ordinal,
  active,
  status,
  onActivate,
  onToggle,
  onRemove,
  tourTarget,
}: {
  sec: SectionInstance
  idx: number
  /** 1-based occurrence number, set only when this type appears more than once. */
  ordinal?: number
  active: boolean
  status: Status
  onActivate: () => void
  onToggle: () => void
  onRemove: () => void
  /** Marks the first row of the mobile Section stack as a tour hook target. */
  tourTarget?: boolean
}) {
  const [confirmRemove, setConfirmRemove] = useState(false)
  const sortable = useSortable({ id: sectionId(sec) })
  const mod = sectionRegistry[sec.type as SectionType]
  const label =
    (mod?.label.ms ?? sec.type) + (ordinal !== undefined ? ` ${ordinal}` : "")
  const style: CSSProperties = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 12px",
    background: active ? "#fff" : "transparent",
    borderLeft: active ? "3px solid var(--accent)" : "3px solid transparent",
    cursor: "pointer",
    opacity: sec.enabled ? 1 : 0.5,
  }
  return (
    <li
      // eslint-disable-next-line react-hooks/refs
      ref={sortable.setNodeRef}
      className="se-row"
      style={style}
      onClick={onActivate}
      data-section-idx={idx}
      data-editor-tour={tourTarget ? "mobile-stack-row" : undefined}
    >
      <span
        // eslint-disable-next-line react-hooks/refs
        {...sortable.attributes}
        // eslint-disable-next-line react-hooks/refs
        {...sortable.listeners}
        className="se-handle"
        style={dragHandleStyle}
        aria-label="Susun semula"
        onClick={(e) => e.stopPropagation()}
      >
        ⋮⋮
      </span>
      <StatusDot status={status} />
      <span style={{ flex: 1, fontSize: 13, fontWeight: active ? 700 : 500 }}>
        {label}
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onToggle()
        }}
        className="se-iconbtn"
        style={iconBtnStyle}
        aria-label={sec.enabled ? "Lumpuhkan" : "Aktifkan"}
        title={sec.enabled ? "Lumpuhkan" : "Aktifkan"}
      >
        {sec.enabled ? "👁" : "⊘"}
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setConfirmRemove(true)
        }}
        className="se-iconbtn"
        style={iconBtnStyle}
        aria-label="Buang"
        title="Buang"
      >
        ×
      </button>
      <ConfirmationDialog open={confirmRemove} onOpenChange={setConfirmRemove} title={`Buang bahagian ${label}?`} description="Kandungan dalam bahagian ini akan dibuang daripada draf jemputan anda." confirmLabel="Buang bahagian" destructive onConfirm={() => { setConfirmRemove(false); onRemove() }} />
    </li>
  )
}

function StatusDot({ status }: { status: Status }) {
  const color =
    status === "complete" ? "#27ae60" : status === "draft" ? "var(--accent)" : "#c0392b"
  return (
    <span
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: color,
        flexShrink: 0,
      }}
      aria-label={status}
    />
  )
}

// ---------- Gaya (card-level theme) picker -------------------------------

function GayaPanel({
  activeId,
  templateType,
  onPick,
}: {
  activeId?: string
  templateType: TemplateType | null
  onPick: (p: ThemePreset) => void
}) {
  const [open, setOpen] = useState(false)
  const presets = presetsForType(templateType)
  const active = activeId ? THEME_PRESETS[activeId] : undefined

  return (
    <div style={gayaPanelStyle}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={gayaHeaderStyle}
        aria-expanded={open}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <span
            aria-hidden
            style={{
              ...gayaSwatchStyle,
              background: active ? themeSwatch(active) : "linear-gradient(135deg,var(--accent),var(--primary))",
            }}
          />
          <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.15, minWidth: 0 }}>
            <span style={gayaKickerStyle}>Gaya / Tema</span>
            <span style={gayaActiveLabelStyle}>{active?.label ?? "Tersuai"}</span>
          </span>
        </span>
        <span
          style={{
            color: "var(--muted-foreground)",
            fontSize: 12,
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 150ms ease",
          }}
        >
          ▾
        </span>
      </button>
      {open && (
        <div style={gayaListStyle} className="phone-scroll">
          {presets.map((p) => {
            const selected = p.id === activeId
            const rec = isRecommendedPreset(p, templateType)
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onPick(p)}
                style={gayaTileStyle(selected)}
              >
                <span aria-hidden style={{ ...gayaTileSwatchStyle, background: themeSwatch(p) }}>
                  {selected && <span style={swatchCheckStyle}>✓</span>}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={gayaTileLabelStyle}>{p.label}</span>
                    {rec && (
                      <span style={gayaStarStyle} title="Sesuai untuk majlis ini">
                        ★
                      </span>
                    )}
                  </span>
                  <span style={galleryHintStyle}>{p.hint}</span>
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---------- Sub-form -----------------------------------------------------

function SubForm({
  section,
  sectionIdx,
  cardId,
  userId,
  templateType,
  errors,
  onChange,
  onVariantChange,
}: {
  section: SectionInstance
  sectionIdx: number
  cardId: string
  userId: string
  templateType: TemplateType | null
  errors: Record<string, string>
  onChange: (d: SectionInstance["data"]) => void
  onVariantChange: (v: string) => void
}) {
  const mod = sectionRegistry[section.type as SectionType]
  if (!mod) return null
  const hidden = new Set(mod.hiddenVariants ?? [])
  const variants = Object.keys(mod.variants).filter((v) => !hidden.has(v))
  const CustomForm = mod.customForm
  const sectionPremium = mod.tier === "premium"
  return (
    <div style={subFormStyle}>
      <div style={subFormHeaderStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 18, color: "var(--primary)" }}>
            {mod.label.ms}
          </h2>
          {sectionPremium && <PremiumPill />}
        </div>
        <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--muted-foreground)" }}>
          {mod.label.en} · #{sectionIdx + 1}
        </p>
      </div>

      {variants.length > 1 && (
        <div style={fieldGroupStyle}>
          <label style={labelStyle}>Gaya</label>
          <VariantGallery
            variants={variants}
            active={section.variant}
            meta={mod.variantMeta}
            labels={mod.variantLabels}
            tiers={mod.variantTiers}
            templateType={templateType}
            onPick={onVariantChange}
          />
          <RequestVariantLink sectionType={section.type} />
        </div>
      )}

      {CustomForm ? (
        // Registry guarantees the data type matches at runtime.
        <CustomForm
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data={section.data as any}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onChange={onChange as any}
          cardId={cardId}
          userId={userId}
          errors={errors}
        />
      ) : (
        <GenericForm
          // Pass data by reference; child renders fields per key.
          data={section.data as Record<string, unknown>}
          sectionType={section.type}
          cardId={cardId}
          userId={userId}
          errors={errors}
          onChange={(d) => onChange(d as SectionInstance["data"])}
        />
      )}
    </div>
  )
}

// ---------- Variant gallery ----------------------------------------------

function VariantGallery({
  variants,
  active,
  meta,
  labels,
  tiers,
  templateType,
  onPick,
}: {
  variants: string[]
  active: string
  meta?: Record<
    string,
    { swatch: string; hint?: string; recommendedFor?: TemplateType[] }
  >
  labels?: Record<string, string>
  tiers?: Record<string, "free" | "premium">
  templateType: TemplateType | null
  onPick: (v: string) => void
}) {
  const isRec = (v: string) =>
    !!(templateType && meta?.[v]?.recommendedFor?.includes(templateType))
  // Recommended-first; otherwise preserve declared order.
  const ordered = [...variants].sort((a, b) => Number(isRec(b)) - Number(isRec(a)))

  // Sections without swatch metadata fall back to compact chips.
  if (!meta) {
    return (
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {ordered.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onPick(v)}
            style={variantChipStyle(active === v)}
          >
            {labels?.[v] ?? v}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {ordered.map((v) => {
        const m = meta[v]
        const selected = active === v
        const rec = isRec(v)
        const premium = tiers?.[v] === "premium"
        return (
          <button
            key={v}
            type="button"
            onClick={() => onPick(v)}
            style={galleryTileStyle(selected)}
          >
            <span
              aria-hidden
              style={{ ...swatchStyle, background: m?.swatch ?? "#ccc" }}
            >
              {selected && <span style={swatchCheckStyle}>✓</span>}
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={galleryTitleStyle}>{labels?.[v] ?? v}</span>
                {premium && <span style={proTagStyle}>PRO</span>}
              </span>
              {m?.hint && <span style={galleryHintStyle}>{m.hint}</span>}
            </span>
            {rec && <span style={recBadgeStyle}>★ Sesuai</span>}
          </button>
        )
      })}
    </div>
  )
}

function GenericForm({
  data,
  sectionType,
  cardId,
  userId,
  errors,
  onChange,
}: {
  data: Record<string, unknown>
  sectionType: SectionType
  cardId: string
  userId: string
  errors: Record<string, string>
  onChange: (d: Record<string, unknown>) => void
}) {
  function update(key: string, value: unknown) {
    onChange({ ...data, [key]: value })
  }

  const keys = Object.keys(data)
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {keys.map((key) => {
        const kind = inferFieldKind(key, data[key])
        const label = fieldLabel(key)
        const err = errors[key]
        const common = {
          id: `${sectionType}-${key}`,
          name: key,
          style: inputStyle(!!err),
        }
        return (
          <div key={key} style={fieldGroupStyle}>
            <label htmlFor={common.id} style={labelStyle}>
              {label}
            </label>
            {kind === "textarea" ? (
              <textarea
                {...common}
                value={(data[key] as string) || ""}
                onChange={(e) => update(key, e.target.value)}
                rows={3}
                style={{
                  ...inputStyle(!!err),
                  resize: "vertical",
                  minHeight: 80,
                }}
              />
            ) : kind === "boolean" ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  id={common.id}
                  checked={!!data[key]}
                  onChange={(e) => update(key, e.target.checked)}
                />
                <span style={{ fontSize: 13 }}>{label}</span>
              </div>
            ) : kind === "image" ? (
              <ImageUploadField
                cardId={cardId}
                userId={userId}
                sectionType={sectionType}
                value={(data[key] as string) || ""}
                onChange={(url) => update(key, url)}
              />
            ) : (
              <input
                {...common}
                type={inputTypeFor(kind)}
                inputMode={inputModeFor(key)}
                value={(data[key] as string) || ""}
                onChange={(e) => update(key, e.target.value)}
              />
            )}
            {err && <div style={errorTextStyle}>{err}</div>}
          </div>
        )
      })}
    </div>
  )
}

function inferFieldKind(
  key: string,
  value: unknown
):
  | "text"
  | "textarea"
  | "date"
  | "time"
  | "datetime"
  | "url"
  | "boolean"
  | "image" {
  if (typeof value === "boolean") return "boolean"
  if (Array.isArray(value)) return "text" // shouldn't happen — customForm handles arrays
  const k = key.toLowerCase()
  if (k.includes("photourl") || k.includes("photo") || k === "coverurl")
    return "image"
  if (k.endsWith("url")) return "url"
  if (k === "startsat" || k === "targetdate") return "datetime"
  if (k.includes("date") || k === "deadline") return "date"
  if (k.includes("time")) return "time"
  if (
    k.includes("body") ||
    k.includes("message") ||
    k.includes("address") ||
    k === "greeting"
  )
    return "textarea"
  return "text"
}

function inputTypeFor(kind: string): string {
  if (kind === "date") return "date"
  if (kind === "time") return "time"
  if (kind === "datetime") return "datetime-local"
  if (kind === "url") return "url"
  return "text"
}

/** Soft-keyboard hint for generic text fields. Phone/URL/email keys. */
function inputModeFor(key: string): "tel" | "url" | "email" | undefined {
  if (/phone|tel|no_tel|whatsapp/i.test(key)) return "tel"
  if (/url|link|pautan/i.test(key)) return "url"
  if (/email|emel/i.test(key)) return "email"
  return undefined
}

function fieldLabel(key: string): string {
  const map: Record<string, string> = {
    headline: "Tajuk Utama",
    subhead: "Sub Tajuk",
    tagline: "Tagline",
    coverPhotoUrl: "Foto Sampul",
    eventDate: "Tarikh Majlis",
    greeting: "Sapaan",
    body: "Teks",
    text: "Petikan",
    attribution: "Sumber",
    eventName: "Nama Majlis",
    date: "Tarikh",
    time: "Waktu",
    venue: "Tempat",
    address: "Alamat",
    wazeUrl: "Pautan Waze",
    gmapsUrl: "Pautan Google Maps",
    grabUrl: "Pautan Grab",
    titleOverride: "Tajuk (Pilihan)",
    startsAt: "Mula Pada",
    label: "Label",
    targetDate: "Tarikh Sasaran",
    deadline: "Tarikh Akhir RSVP",
    askPax: "Tanya bilangan tetamu",
    askDietary: "Tanya keperluan makanan",
    message: "Mesej",
    inheritTheme: "Padankan warna kad (ganti warna budaya gaya)",
    ambient: "Latar beranimasi (matikan untuk reka bentuk lama)",
  }
  return map[key] ?? key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())
}

// ---------- Add-section picker -------------------------------------------

function AddSectionPicker({
  templateType,
  existing,
  onPick,
  onClose,
}: {
  templateId: string
  templateType: TemplateType | null
  existing: SectionType[]
  onPick: (t: SectionType) => void
  onClose: () => void
}) {
  // Filter by appliesTo: show only Sections registered as "all" or as
  // applying to the current templateType. When templateType is unknown
  // (legacy card or DB lookup miss), show "all" only. Types already on the
  // card are hidden unless the module is `repeatable` (e.g. gallery).
  const candidates = (Object.keys(sectionRegistry) as SectionType[]).filter(
    (t) => {
      const mod = sectionRegistry[t]
      if (existing.includes(t) && !mod.repeatable) return false
      if (mod.appliesTo === "all") return true
      return templateType ? mod.appliesTo.includes(templateType) : false
    }
  )

  return (
    <div style={modalBackdropStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={modalHeaderStyle}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Tambah Bahagian</h3>
          <button
            onClick={onClose}
            style={iconBtnStyle}
            aria-label="Tutup"
          >
            ×
          </button>
        </div>
        {candidates.length === 0 ? (
          <p style={{ color: "var(--muted-foreground)", fontSize: 13, padding: "16px 0" }}>
            Semua bahagian telah ditambah.
          </p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {candidates.map((t) => {
              const mod = sectionRegistry[t]
              const premium = mod.tier === "premium"
              const already = existing.filter((e) => e === t).length
              return (
                <li
                  key={t}
                  onClick={() => onPick(t)}
                  style={pickerRowStyle}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <strong>{mod.label.ms}</strong>
                    {premium && <PremiumPill />}
                    {already > 0 && (
                      <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>
                        · tambah satu lagi ({already} sudah ada)
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                    {mod.label.en}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

// ---------- Misc subviews ------------------------------------------------

function PublicationComplete({
  slug,
  publishedAt,
  replayed,
  revision,
}: {
  slug: string
  publishedAt: string | null
  replayed: boolean
  revision: boolean
}) {
  const publishedLabel = publishedAt
    ? new Date(publishedAt).toLocaleString("ms-MY", {
        timeZone: "Asia/Kuala_Lumpur",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null
  return (
    <main style={publicationCompletePageStyle}>
      <section style={publicationCompletePanelStyle} aria-labelledby="publication-complete-title">
        <div style={publicationCompleteIconStyle}>
          <CheckCircle2 size={30} aria-hidden />
        </div>
        <p style={publicationEyebrowStyle}>{revision ? "Perubahan diterbitkan" : "Jemputan diterbitkan"}</p>
        <h1 id="publication-complete-title" style={publicationCompleteTitleStyle}>
          {revision ? "Versi terbaharu anda kini awam." : "Jemputan anda kini awam."}
        </h1>
        <p style={publicationCompleteBodyStyle}>
          Kandungan ini sudah menjadi bacaan tetamu dan tidak lagi boleh
          disunting. {replayed ? "Pautan yang sama telah dikekalkan." : "Pautan awam anda sudah tersedia."}
        </p>
        {publishedLabel && <p style={publicationCompleteMetaStyle}>Diterbitkan {publishedLabel}</p>}
        <div style={publicationCompleteActionsStyle}>
          <Link href={`/i/${slug}`} target="_blank" style={publicationPrimaryLinkStyle}>
            Buka Jemputan ↗
          </Link>
          <Link href="/dashboard" style={publicationSecondaryLinkStyle}>
            Kembali ke Dashboard
          </Link>
        </div>
      </section>
    </main>
  )
}

function SaveIndicator({
  state,
}: {
  state: "idle" | "saving" | "saved" | "error"
}) {
  if (state === "idle") return <span style={hintStyle}>Sedia</span>
  if (state === "saving") return <span style={hintStyle}>Menyimpan…</span>
  if (state === "saved") return <span style={{ ...hintStyle, color: "#27ae60" }}>Disimpan ✓</span>
  return <span style={{ ...hintStyle, color: "#c0392b" }}>Ralat menyimpan</span>
}

function ViewPublishedNotice({ slug }: { slug: string }) {
  // Render a tiny "view link" footer; useful for QA in dev.
  if (!slug) return null
  return null
}

function PremiumPill() {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        padding: "2px 8px",
        background: "linear-gradient(90deg, var(--accent), #e0b878)",
        color: "#fff",
        borderRadius: 10,
        letterSpacing: "0.05em",
      }}
    >
      PREMIUM
    </span>
  )
}

function RequestVariantLink({ sectionType }: { sectionType: SectionType }) {
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState("")
  const [state, setState] = useState<"idle" | "ok">("idle")

  function copyAndOpenIntake() {
    const brief = `Saya menggunakan template editor dan ingin gaya berbeza untuk bahagian "${sectionType}". Cadangan saya: ${note || "(tidak dinyatakan)"}`
    try {
      navigator.clipboard.writeText(brief).catch(() => {})
    } catch {
      /* ignore */
    }
    setState("ok")
    setTimeout(() => {
      window.open("/templates/custom", "_blank")
    }, 250)
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          marginTop: 6,
          background: "transparent",
          border: "none",
          color: "var(--accent)",
          fontSize: 11,
          cursor: "pointer",
          textDecoration: "underline",
          padding: 0,
        }}
      >
        Tidak jumpa gaya yang sesuai? Request reka khas
      </button>
    )
  }

  return (
    <div
      style={{
        marginTop: 8,
        padding: 10,
        background: "#fdf6ec",
        border: "1px dashed var(--accent)",
        borderRadius: 8,
      }}
    >
      <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: "0 0 6px" }}>
        Cadangkan gaya yang anda mahu. Kami akan hubungi anda.
      </p>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="cth: gaya lebih moden, atau ikut imej yang akan saya hantar via WhatsApp"
        rows={2}
        style={{
          width: "100%",
          padding: "6px 8px",
          border: "1px solid var(--border)",
          borderRadius: 6,
          fontSize: 12,
          fontFamily: "var(--font-jakarta), sans-serif",
          resize: "vertical",
          boxSizing: "border-box",
        }}
      />
      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
        <button
          type="button"
          onClick={() => setOpen(false)}
          style={{
            padding: "6px 10px",
            border: "1px solid var(--border)",
            background: "transparent",
            borderRadius: 6,
            fontSize: 11,
            cursor: "pointer",
            color: "var(--muted-foreground)",
          }}
        >
          Batal
        </button>
        <button
          type="button"
          onClick={copyAndOpenIntake}
          style={{
            padding: "6px 10px",
            background: "var(--primary)",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {state === "ok" ? "Membuka borang…" : "Hantar ke Tempahan Khas"}
        </button>
      </div>
    </div>
  )
}

// ---------- Styles -------------------------------------------------------

const pageStyle: CSSProperties = {
  minHeight: "100dvh",
  background: "var(--background)",
  display: "flex",
  flexDirection: "column",
}

const topBarStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 16,
  padding: "12px 20px",
  borderBottom: "1px solid var(--border)",
  background: "#fff",
  position: "sticky",
  top: 0,
  zIndex: 20,
}

const backLinkStyle: CSSProperties = {
  color: "var(--muted-foreground)",
  fontSize: 13,
  textDecoration: "none",
}

const titleStyle: CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  color: "var(--primary)",
}

const subTitleStyle: CSSProperties = {
  fontSize: 11,
  color: "var(--muted-foreground)",
}

const primaryButtonStyle: CSSProperties = {
  marginLeft: "auto",
  background: "var(--primary)",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  padding: "10px 18px",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
}

const paidDraftActionStyle: CSSProperties = {
  marginLeft: "auto",
  display: "flex",
  alignItems: "flex-end",
  flexDirection: "column",
  gap: 6,
}

const replacementActionStyle: CSSProperties = {
  marginLeft: "auto",
  display: "flex",
  alignItems: "flex-end",
  flexDirection: "column",
  gap: 4,
  maxWidth: "min(100%, 430px)",
  textAlign: "right",
}

const replacementReasonStyle: CSSProperties = {
  color: "var(--muted-foreground)",
  fontSize: 11,
  lineHeight: 1.35,
  maxWidth: 360,
}

const manualReviewActionStyle: CSSProperties = {
  marginLeft: "auto",
  display: "flex",
  alignItems: "flex-end",
  flexDirection: "column",
  gap: 6,
  maxWidth: "min(100%, 360px)",
}

const manualReviewErrorStyle: CSSProperties = {
  fontSize: 11,
  color: "#c0392b",
  textAlign: "right",
}

const publicationButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 7,
  background: "var(--primary)",
  color: "var(--background)",
  border: "none",
  borderRadius: 10,
  padding: "10px 16px",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
}

const publicationCompletePageStyle: CSSProperties = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  padding: "32px 20px",
  background: "var(--background)",
}

const publicationCompletePanelStyle: CSSProperties = {
  width: "min(100%, 560px)",
  padding: "48px 40px",
  background: "#fff",
  border: "1px solid var(--border)",
  borderRadius: 22,
  boxShadow: "0 20px 60px color-mix(in srgb, var(--primary) 10%, transparent)",
  textAlign: "center",
}

const publicationCompleteIconStyle: CSSProperties = {
  width: 64,
  height: 64,
  margin: "0 auto 18px",
  display: "grid",
  placeItems: "center",
  borderRadius: "50%",
  background: "#e8f3ee",
  color: "#286243",
}

const publicationEyebrowStyle: CSSProperties = {
  margin: 0,
  color: "var(--accent)",
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
}

const publicationCompleteTitleStyle: CSSProperties = {
  margin: "10px 0 12px",
  color: "var(--primary)",
  fontFamily: "var(--font-cormorant), serif",
  fontSize: 38,
  fontWeight: 600,
  lineHeight: 1.05,
}

const publicationCompleteBodyStyle: CSSProperties = {
  margin: "0 auto",
  maxWidth: 420,
  color: "var(--muted-foreground)",
  fontSize: 14,
  lineHeight: 1.7,
}

const publicationCompleteMetaStyle: CSSProperties = {
  margin: "14px 0 0",
  color: "var(--muted-foreground)",
  fontSize: 12,
}

const publicationCompleteActionsStyle: CSSProperties = {
  display: "flex",
  justifyContent: "center",
  flexWrap: "wrap",
  gap: 10,
  marginTop: 28,
}

const publicationPrimaryLinkStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 44,
  padding: "0 18px",
  borderRadius: 9,
  background: "var(--primary)",
  color: "var(--background)",
  fontSize: 13,
  fontWeight: 700,
  textDecoration: "none",
}

const publicationSecondaryLinkStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 44,
  padding: "0 18px",
  borderRadius: 9,
  border: "1.5px solid var(--border)",
  color: "var(--primary)",
  fontSize: 13,
  fontWeight: 700,
  textDecoration: "none",
}

const threePaneStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "260px 1fr 360px",
  gap: 16,
  padding: 16,
  flex: 1,
  minHeight: 0,
}

const sidebarStyle: CSSProperties = {
  background: "#fbf7ef",
  border: "1px solid var(--border)",
  borderRadius: 12,
  overflow: "hidden",
  height: "fit-content",
  position: "sticky",
  top: 80,
}

const sidebarListStyle: CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: 0,
}

const addSectionButtonStyle: CSSProperties = {
  width: "calc(100% - 16px)",
  margin: "10px 8px",
  padding: "10px 0",
  background: "transparent",
  border: "1.5px dashed var(--accent)",
  borderRadius: 8,
  color: "var(--accent)",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600,
}

const dragHandleStyle: CSSProperties = {
  cursor: "grab",
  color: "#bbb",
  fontSize: 14,
  userSelect: "none",
  touchAction: "none",
}

const iconBtnStyle: CSSProperties = {
  background: "transparent",
  border: "none",
  cursor: "pointer",
  color: "var(--muted-foreground)",
  fontSize: 14,
  padding: 4,
}

const centerStyle: CSSProperties = {
  background: "#fff",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: 24,
  minHeight: 400,
}

const subFormStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 16,
}

const subFormHeaderStyle: CSSProperties = {
  paddingBottom: 12,
  borderBottom: "1px solid var(--border)",
}

const fieldGroupStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
}

const labelStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "var(--muted-foreground)",
}

function inputStyle(error: boolean): CSSProperties {
  return {
    width: "100%",
    padding: "10px 12px",
    border: `1.5px solid ${error ? "#c0392b" : "var(--border)"}`,
    borderRadius: 8,
    fontFamily: "var(--font-jakarta), sans-serif",
    fontSize: 14,
    background: "#fff",
    outline: "none",
    boxSizing: "border-box",
  }
}

const errorTextStyle: CSSProperties = {
  fontSize: 12,
  color: "#c0392b",
}

const hintStyle: CSSProperties = {
  fontSize: 11,
  color: "var(--muted-foreground)",
}

function variantChipStyle(active: boolean): CSSProperties {
  return {
    padding: "6px 12px",
    borderRadius: 16,
    border: `1.5px solid ${active ? "var(--primary)" : "var(--border)"}`,
    background: active ? "var(--primary)" : "transparent",
    color: active ? "#fff" : "var(--muted-foreground)",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 600,
  }
}

function galleryTileStyle(selected: boolean): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 12px",
    borderRadius: 12,
    border: `1.5px solid ${selected ? "var(--primary)" : "var(--border)"}`,
    background: selected ? "var(--background)" : "#fff",
    cursor: "pointer",
    textAlign: "left",
    width: "100%",
    transition: "border-color 140ms ease, background 140ms ease",
  }
}

const swatchStyle: CSSProperties = {
  position: "relative",
  width: 40,
  height: 40,
  borderRadius: 10,
  flexShrink: 0,
  boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.06)",
  display: "grid",
  placeItems: "center",
}

const swatchCheckStyle: CSSProperties = {
  color: "#fff",
  fontSize: 16,
  fontWeight: 800,
  textShadow: "0 1px 3px rgba(0,0,0,0.45)",
}

const galleryTitleStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: "var(--primary)",
}

const galleryHintStyle: CSSProperties = {
  display: "block",
  fontSize: 11,
  color: "var(--muted-foreground)",
  marginTop: 1,
}

const recBadgeStyle: CSSProperties = {
  fontSize: 9.5,
  fontWeight: 800,
  letterSpacing: "0.06em",
  color: "#1f6b4f",
  background: "#e8f3ee",
  border: "1px solid #bfe0d1",
  borderRadius: 8,
  padding: "3px 7px",
  whiteSpace: "nowrap",
  flexShrink: 0,
}

const proTagStyle: CSSProperties = {
  fontSize: 9,
  padding: "1px 5px",
  background: "var(--accent)",
  color: "#fff",
  borderRadius: 8,
}

// ---- Gaya panel styles ----
const gayaPanelStyle: CSSProperties = {
  borderBottom: "1px solid var(--border)",
  background: "#fff",
}

const gayaHeaderStyle: CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  padding: "10px 12px",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  textAlign: "left",
}

const gayaSwatchStyle: CSSProperties = {
  width: 26,
  height: 26,
  borderRadius: 8,
  flexShrink: 0,
  boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.08)",
}

const gayaKickerStyle: CSSProperties = {
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--muted-foreground)",
}

const gayaActiveLabelStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: "var(--primary)",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
}

const gayaListStyle: CSSProperties = {
  display: "grid",
  gap: 5,
  padding: "4px 8px 10px",
  maxHeight: 300,
  overflowY: "auto",
}

function gayaTileStyle(selected: boolean): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 9,
    padding: "7px 9px",
    borderRadius: 10,
    border: `1.5px solid ${selected ? "var(--primary)" : "var(--border)"}`,
    background: selected ? "var(--background)" : "#fff",
    cursor: "pointer",
    textAlign: "left",
    width: "100%",
  }
}

const gayaTileSwatchStyle: CSSProperties = {
  position: "relative",
  width: 24,
  height: 24,
  borderRadius: 7,
  flexShrink: 0,
  display: "grid",
  placeItems: "center",
  boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.08)",
}

const gayaTileLabelStyle: CSSProperties = {
  fontSize: 12.5,
  fontWeight: 700,
  color: "var(--primary)",
}

const gayaStarStyle: CSSProperties = {
  color: "var(--accent)",
  fontSize: 11,
}

const previewPaneStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  position: "sticky",
  top: 80,
  height: "fit-content",
}

const previewToolbarStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  width: 340,
  maxWidth: "100%",
  marginBottom: 12,
}

const previewToolbarLabelStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--muted-foreground)",
}

const segmentWrapStyle: CSSProperties = {
  display: "inline-flex",
  padding: 3,
  gap: 2,
  background: "#f1ece2",
  borderRadius: 10,
  border: "1px solid #e7e0d2",
}

function segmentBtnStyle(active: boolean): CSSProperties {
  return {
    border: "none",
    borderRadius: 8,
    padding: "5px 12px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    background: active ? "#fff" : "transparent",
    color: active ? "var(--primary)" : "var(--muted-foreground)",
    boxShadow: active ? "0 1px 3px rgba(0,0,0,0.12)" : "none",
    transition: "all 140ms ease",
  }
}

const previewHintStyle: CSSProperties = {
  marginTop: 12,
  fontSize: 11,
  color: "var(--muted-foreground)",
}

const errorBannerStyle: CSSProperties = {
  position: "fixed",
  bottom: "calc(var(--kb-inset, 0px) + env(safe-area-inset-bottom, 0px) + 24px)",
  left: "50%",
  transform: "translateX(-50%)",
  background: "#c0392b",
  color: "#fff",
  padding: "10px 18px",
  borderRadius: 10,
  fontSize: 13,
  zIndex: 60,
}

const validationBannerStyle: CSSProperties = {
  margin: "12px 24px 0",
  padding: "12px 16px",
  borderRadius: 10,
  background: "#fff0ee",
  border: "1px solid #f5c6c0",
  color: "#9b2c22",
  fontSize: 13,
  fontWeight: 600,
}

const retryButtonStyle: CSSProperties = {
  marginLeft: 10,
  padding: "2px 7px",
  border: "1px solid #c0392b",
  borderRadius: 5,
  background: "transparent",
  color: "#c0392b",
  fontSize: 11,
  fontWeight: 700,
  cursor: "pointer",
}

const helpButtonStyle: CSSProperties = {
  marginLeft: "auto",
  background: "transparent",
  border: "1px solid var(--border)",
  borderRadius: 10,
  padding: "9px 14px",
  fontSize: 13,
  fontWeight: 600,
  color: "var(--muted-foreground)",
  cursor: "pointer",
}

const modalBackdropStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.4)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 50,
}

const modalStyle: CSSProperties = {
  background: "#fff",
  borderRadius: 12,
  padding: 16,
  width: "min(360px, calc(100vw - 32px))",
  maxHeight: "70vh",
  overflow: "auto",
}

const modalHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  paddingBottom: 8,
  borderBottom: "1px solid var(--border)",
  marginBottom: 8,
}

const pickerRowStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  padding: "10px 12px",
  cursor: "pointer",
  borderRadius: 8,
  gap: 2,
}
