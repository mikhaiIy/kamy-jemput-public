"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  manageReceiptAction,
  reviewDuitNowSubmissionAction,
  reviewManualPaymentAction,
  uploadReviewEvidenceAction,
} from "./actions"
import { formatMyrFromSen, parseRmAmount, type ManualOutcome } from "@/lib/payments"

type Notice = { kind: "error" | "ok" | "warn"; text: string }

/** Legacy history control. The old path is retained for audit readability. */
export function ReviewControls({ submissionId }: { submissionId: string }) {
  const [note, setNote] = useState("")
  const [confirming, setConfirming] = useState<"confirmed" | "rejected" | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [pending, startTransition] = useTransition()

  function submit() {
    if (!confirming) return
    const outcome = confirming
    startTransition(async () => {
      const result = await reviewDuitNowSubmissionAction(submissionId, outcome, note)
      if (result.error) {
        setNotice({ kind: "error", text: result.error })
        return
      }
      setConfirming(null)
      setNotice({ kind: "ok", text: result.message ?? "Rekod sejarah disimpan." })
    })
  }

  return (
    <div className="mt-4 border-t border-border pt-4">
      <label className="sr-only" htmlFor={`legacy-note-${submissionId}`}>
        Nota sejarah
      </label>
      <textarea
        id={`legacy-note-${submissionId}`}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Nota sejarah (pilihan)…"
        maxLength={1000}
        className="admin-field w-full"
        rows={2}
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button className="admin-button" disabled={pending} onClick={() => setConfirming("confirmed")}>
          Tandakan untuk sejarah
        </button>
        <button className="admin-secondary text-red-700" disabled={pending} onClick={() => setConfirming("rejected")}>
          Tolak rekod lama
        </button>
      </div>
      {notice && <NoticeText notice={notice} />}
      <Dialog open={confirming !== null} onOpenChange={(open) => !open && !pending && setConfirming(null)}>
        <DialogContent busy={pending} className="admin-workspace min-h-0">
          <DialogTitle>{confirming === "rejected" ? "Tolak rekod lama?" : "Simpan rekod lama?"}</DialogTitle>
          <DialogDescription>
            Rekod sejarah akan kekal. Aliran lama tidak menerbitkan jemputan; resit peribadi diperlukan untuk bayaran manual semasa.
          </DialogDescription>
          <DialogFooter>
            <button className="admin-secondary" disabled={pending} onClick={() => setConfirming(null)}>Batal</button>
            <button className="admin-button" disabled={pending} onClick={submit}>{pending ? "Menyimpan…" : "Sahkan"}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

type ReceiptAction = "confirmed" | "insufficient" | "rejected" | "correction" | "quarantined" | "removing"

export function ReceiptControls({
  orderId,
  receiptId,
  attemptId,
  reviewable,
  outcome,
  expectedReviewId,
  remainingSen,
  access,
}: {
  orderId: string
  receiptId: string
  attemptId: string
  reviewable: boolean
  outcome: ManualOutcome
  expectedReviewId: string | null
  remainingSen: number
  access: string
}) {
  const router = useRouter()
  const [amount, setAmount] = useState("")
  const [reason, setReason] = useState("")
  const [evidence, setEvidence] = useState<File | null>(null)
  const [category, setCategory] = useState("operational")
  const [decision, setDecision] = useState<ReceiptAction | null>(null)
  const [correctionOutcome, setCorrectionOutcome] = useState<"confirmed" | "rejected">("confirmed")
  const [notice, setNotice] = useState<Notice | null>(null)
  const [pending, startTransition] = useTransition()

  function request(action: ReceiptAction) {
    setNotice(null)
    if (action === "confirmed" || action === "insufficient" || (action === "correction" && correctionOutcome === "confirmed")) {
      const amountSen = parseRmAmount(amount)
      if (amountSen === null || amountSen <= 0) {
        setNotice({ kind: "error", text: "Masukkan jumlah diterima dalam RM, maksimum dua tempat perpuluhan." })
        return
      }
      if (action === "insufficient" && amountSen >= remainingSen) {
        setNotice({ kind: "error", text: `Jumlah mesti kurang daripada baki semasa ${formatMyrFromSen(remainingSen)}.` })
        return
      }
    }
    if ((action === "rejected" || action === "insufficient" || action === "correction" || action === "quarantined" || action === "removing") && !reason.trim()) {
      setNotice({ kind: "error", text: "Sebab wajib diisi untuk keputusan ini." })
      return
    }
    if (action === "insufficient" && !evidence) {
      setNotice({ kind: "error", text: "Lampirkan bukti peribadi untuk keputusan baki belum dibayar." })
      return
    }
    setDecision(action)
  }

  function run() {
    if (!decision) return
    const action = decision
    startTransition(async () => {
      try {
        if (action === "quarantined" || action === "removing") {
          const result = await manageReceiptAction(receiptId, action, category, reason)
          if (result.error) {
            setNotice({ kind: "error", text: result.error })
            return
          }
          setNotice({ kind: "ok", text: result.message ?? "Tindakan fail direkodkan." })
          setDecision(null)
          router.refresh()
          return
        }

        let evidenceObjectPath: string | null = null
        if (action === "insufficient" && evidence) {
          const form = new FormData()
          form.set("orderId", orderId)
          form.set("file", evidence)
          const uploaded = await uploadReviewEvidenceAction(form)
          if (uploaded.error || !uploaded.path) {
            setNotice({ kind: "error", text: uploaded.error ?? "Bukti peribadi tidak dapat disimpan." })
            return
          }
          evidenceObjectPath = uploaded.path
        }

        const reviewOutcome = action === "correction" ? correctionOutcome : action
        const amountSen = reviewOutcome === "rejected" ? 0 : parseRmAmount(amount) ?? 0
        const result = await reviewManualPaymentAction({
          attemptId,
          outcome: reviewOutcome,
          receivedSen: amountSen,
          remainingSen: null,
          reason,
          evidenceObjectPath,
          expectedReviewId: action === "correction" ? expectedReviewId : null,
        })
        if (result.error) {
          setNotice({ kind: "error", text: result.error })
          return
        }
        setNotice({
          kind: result.duplicate ? "warn" : "ok",
          text: result.message ?? "Keputusan direkodkan.",
        })
        setDecision(null)
        setEvidence(null)
        router.refresh()
      } catch {
        setNotice({ kind: "error", text: "Sambungan gagal. Cuba semula tindakan yang sama." })
      }
    })
  }

  if (!reviewable && access === "removed") return null
  const isCorrection = decision === "correction"
  const title =
    decision === "confirmed"
      ? `Rekod ${amount || "RM 0.00"} diterima?`
      : decision === "insufficient"
        ? "Rekod bayaran separa?"
        : decision === "rejected"
          ? "Tolak resit ini?"
          : decision === "correction"
            ? "Betulkan bayaran tambahan?"
            : decision === "quarantined"
              ? "Kuarantin fail ini?"
              : "Buang fail resit?"

  return (
    <>
      <fieldset disabled={pending} className="mt-5 space-y-4">
        {reviewable && (
          <>
            <label className="block text-xs font-medium">
              Jumlah diterima (RM)
              <input
                className="admin-field mt-2 w-full"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </label>
            {outcome === "duplicate" && (
              <label className="block text-xs font-medium">
                Keputusan pembetulan
                <select className="admin-field mt-2 w-full" value={correctionOutcome} onChange={(event) => setCorrectionOutcome(event.target.value as "confirmed" | "rejected")}>
                  <option value="confirmed">Disahkan (kekal tiada kredit baharu)</option>
                  <option value="rejected">Ditolak</option>
                </select>
              </label>
            )}
            <label className="block text-xs font-medium">
              {outcome === "duplicate" ? "Sebab pembetulan" : "Nota / sebab"}
              <textarea
                className="admin-field mt-2 w-full"
                rows={3}
                value={reason}
                maxLength={1000}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Sebab diperlukan untuk penolakan, bayaran separa atau pembetulan."
              />
            </label>
            {outcome !== "duplicate" && (
              <label className="block text-xs font-medium">
                Bukti peribadi untuk bayaran separa (wajib untuk baki belum dibayar)
                <input
                  className="admin-field mt-2 w-full text-xs file:mr-3 file:border-0 file:bg-secondary file:px-2 file:py-1"
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  onChange={(event) => setEvidence(event.target.files?.[0] ?? null)}
                />
                <span className="mt-1 block text-[10px] font-normal text-muted-foreground">PDF, JPEG, PNG atau WebP · maksimum 5 MB · kekal peribadi.</span>
              </label>
            )}
            <div className="flex flex-wrap gap-2">
              {outcome === "duplicate" ? (
                <button className="admin-button" onClick={() => request("correction")}>Betulkan bayaran tambahan</button>
              ) : (
                <>
                  <button className="admin-button" disabled={access !== "available"} onClick={() => request("confirmed")}>Rekod jumlah diterima</button>
                  <button className="admin-secondary" disabled={access !== "available"} onClick={() => request("insufficient")}>Baki belum dibayar</button>
                  <button className="admin-secondary text-red-700" onClick={() => request("rejected")}>Tolak resit</button>
                </>
              )}
            </div>
          </>
        )}

        {access !== "removed" && (
          <details className="border-t border-border pt-3">
            <summary className="cursor-pointer py-2 text-xs font-semibold">Pengurusan fail resit</summary>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">Kuarantin menyekat akses kepada fail. Pembuangan memadam kandungan; metadata dan keputusan kekal.</p>
            <label className="mt-3 block text-xs">
              Kategori
              <select className="admin-field mt-2 w-full" value={category} onChange={(event) => setCategory(event.target.value)}>
                <option value="operational">Operasi</option>
                <option value="harmful-file">Fail berbahaya</option>
                <option value="legal">Undang-undang</option>
              </select>
            </label>
            <div className="mt-4 flex flex-wrap gap-2">
              {access === "available" && <button className="admin-secondary" onClick={() => request("quarantined")}>Kuarantin</button>}
              <button className="admin-secondary text-red-700" onClick={() => request("removing")}>{access === "removing" ? "Cuba pembuangan semula" : "Buang fail"}</button>
            </div>
          </details>
        )}
      </fieldset>

      {notice && <NoticeText notice={notice} />}
      <Dialog open={decision !== null} onOpenChange={(open) => !open && !pending && setDecision(null)}>
        <DialogContent busy={pending} className="admin-workspace min-h-0" onEscapeKeyDown={(event) => pending && event.preventDefault()} onPointerDownOutside={(event) => pending && event.preventDefault()}>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {decision === "confirmed"
              ? "Jumlah ini akan dikira terhadap harga pesanan. Jika cukup, satu draf berbayar dibuka untuk pemilik; jemputan kekal belum diterbitkan."
              : decision === "insufficient"
                ? `Pelayan akan mengira baki sebenar. Baki semasa yang dipaparkan ialah ${formatMyrFromSen(remainingSen)}; bukti peribadi akan disimpan di luar sejarah keputusan.`
                : decision === "rejected"
                  ? "Pelanggan akan melihat sebab ini dan boleh menghantar resit yang dibetulkan."
                  : isCorrection
                    ? "Pembetulan menambah baris audit baharu. Ia tidak mencipta draf atau kelayakan kedua."
                    : "Fail tidak lagi boleh dibuka. Sejarah keputusan dan sebab tindakan akan dikekalkan."}
          </DialogDescription>
          {(decision === "rejected" || decision === "insufficient" || isCorrection) && <p className="rounded-lg bg-muted p-3 text-sm">{reason}</p>}
          {notice?.kind === "error" && <p role="alert" className="admin-error">{notice.text}</p>}
          <DialogFooter>
            <button className="admin-secondary" disabled={pending} onClick={() => setDecision(null)}>Batal</button>
            <button className="admin-button" disabled={pending} onClick={run}>{pending ? "Memproses…" : "Sahkan tindakan"}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function NoticeText({ notice }: { notice: Notice }) {
  return (
    <p
      role={notice.kind === "error" ? "alert" : "status"}
      className={`mt-4 rounded-lg p-3 text-xs ${notice.kind === "error" ? "admin-error" : notice.kind === "warn" ? "bg-amber-50 text-amber-900" : "bg-[#e6f2e9] text-[#286243]"}`}
    >
      {notice.text}
    </p>
  )
}
