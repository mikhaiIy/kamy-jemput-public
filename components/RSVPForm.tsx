"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface RSVPFormProps {
  cardId: string
}

type FormState = "idle" | "submitting" | "success" | "error"

export function RSVPForm({ cardId }: RSVPFormProps) {
  const [state, setState] = useState<FormState>("idle")
  const [attending, setAttending] = useState<boolean | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setState("submitting")

    try {
      const res = await fetch(`/api/rsvp/${cardId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestName: formData.get("guestName"),
          guestContact: formData.get("guestContact"),
          attending: attending,
          pax: parseInt(formData.get("pax") as string) || 1,
          message: formData.get("message"),
        }),
      })

      if (!res.ok) throw new Error("Failed to submit")
      setState("success")
    } catch {
      setState("error")
    }
  }

  if (state === "success") {
    return (
      <div className="bg-white border-t border-gray-100 px-6 py-10 text-center">
        <div className="text-4xl mb-3">🎉</div>
        <h3 className="text-lg font-semibold text-gray-800 mb-1">Thank you for responding!</h3>
        <p className="text-gray-500 text-sm">Your RSVP has been recorded. We look forward to seeing you.</p>
      </div>
    )
  }

  return (
    <div className="bg-white border-t border-gray-100 px-6 py-8">
      <h3 className="text-lg font-semibold text-gray-800 mb-1">RSVP</h3>
      <p className="text-sm text-gray-500 mb-6">Please let us know if you can make it.</p>

      {state === "error" && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          Something went wrong. Please try again.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="guestName">Your Name *</Label>
          <Input
            id="guestName"
            name="guestName"
            required
            placeholder="Enter your full name"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="guestContact">Phone / Email</Label>
          <Input
            id="guestContact"
            name="guestContact"
            placeholder="Optional contact info"
            className="mt-1"
          />
        </div>

        <div>
          <Label>Attendance *</Label>
          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={() => setAttending(true)}
              className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                attending === true
                  ? "bg-green-500 border-green-500 text-white"
                  : "border-gray-200 text-gray-600 hover:border-green-300"
              }`}
            >
              ✅ Yes, I&apos;ll attend
            </button>
            <button
              type="button"
              onClick={() => setAttending(false)}
              className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                attending === false
                  ? "bg-red-400 border-red-400 text-white"
                  : "border-gray-200 text-gray-600 hover:border-red-300"
              }`}
            >
              ❌ Unable to attend
            </button>
          </div>
        </div>

        {attending && (
          <div>
            <Label htmlFor="pax">Number of Guests (including yourself)</Label>
            <Input
              id="pax"
              name="pax"
              type="number"
              min={1}
              max={10}
              defaultValue={1}
              className="mt-1 w-24"
            />
          </div>
        )}

        <div>
          <Label htmlFor="message">Message (optional)</Label>
          <Textarea
            id="message"
            name="message"
            placeholder="Leave a message for the host..."
            className="mt-1"
            rows={3}
          />
        </div>

        <Button
          type="submit"
          disabled={state === "submitting" || attending === null}
          className="w-full"
        >
          {state === "submitting" ? "Submitting..." : "Send RSVP"}
        </Button>
      </form>
    </div>
  )
}
