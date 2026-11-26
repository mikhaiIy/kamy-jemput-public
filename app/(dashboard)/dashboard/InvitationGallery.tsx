"use client"

import { useRef, useState, type ReactNode } from "react"
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type InvitationGroup = {
  id: string
  heading: string
  description: string
  entries: { id: string; searchText: string; content: ReactNode }[]
}

const PAGE_SIZE = 6

export function InvitationGallery({ groups }: { groups: InvitationGroup[] }) {
  const [selected, setSelected] = useState(
    groups.find((group) => group.entries.length)?.id ?? groups[0].id,
  )
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)
  const toolbarStart = useRef<HTMLDivElement>(null)
  const searchInput = useRef<HTMLInputElement>(null)
  const words = query.trim().toLocaleLowerCase("ms-MY").split(/\s+/).filter(Boolean)
  const filtered = groups.map((group) => ({
    ...group,
    entries: group.entries.filter((entry) =>
      words.every((word) => entry.searchText.toLocaleLowerCase("ms-MY").includes(word)),
    ),
  }))
  const active = filtered.find((group) => group.id === selected) ?? filtered[0]
  const pages = Math.max(1, Math.ceil(active.entries.length / PAGE_SIZE))
  const currentPage = Math.min(page, pages)
  const start = (currentPage - 1) * PAGE_SIZE
  const visible = active.entries.slice(start, start + PAGE_SIZE)

  // Keep the controls in view when replacing a long result set. Focus stays on
  // the clicked control; this does not use anchor navigation or focus a heading.
  function returnToResults() {
    const start = toolbarStart.current
    if (start && start.getBoundingClientRect().top < parseFloat(getComputedStyle(start).scrollMarginTop)) {
      start.scrollIntoView({ block: "start", behavior: "instant" })
    }
  }

  function selectGroup(id: string) {
    returnToResults()
    setSelected(id)
    setPage(1)
  }

  return (
    <div>
      <div ref={toolbarStart} className="scroll-mt-[var(--navbar-height)]" />
      {/* Meet the Navbar's content edge, underlapping its border so fractional
          browser zoom cannot expose a strip of scrolling content between bars. */}
      <div className="sticky top-[var(--navbar-height)] z-40 -mx-5 mb-4 border-y bg-background px-5 py-2.5 sm:-mx-8 sm:px-8">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div role="group" aria-label="Kumpulan jemputan" className="grid grid-cols-3 gap-1.5 sm:gap-2">
            {filtered.map((group) => (
              <button
                key={group.id}
                type="button"
                aria-pressed={selected === group.id}
                aria-controls="invitation-results"
                onClick={() => selectGroup(group.id)}
                className={cn(
                  "flex min-h-10 items-center justify-center gap-2 rounded-lg border px-2 py-2 text-[11px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:px-4 sm:text-xs",
                  selected === group.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-secondary hover:text-primary",
                )}
              >
                <span>{group.heading}</span>
                <span className={cn("rounded px-1.5 py-0.5 tabular-nums", selected === group.id ? "bg-white/15" : "bg-secondary")}>
                  {group.entries.length}
                </span>
              </button>
            ))}
          </div>
          <div role="search" className="relative lg:w-72">
            <label htmlFor="invitation-search" className="sr-only">Cari jemputan mengikut nama, pautan atau tarikh</label>
            <Search size={16} aria-hidden className="pointer-events-none absolute top-3 left-3 text-muted-foreground" />
            <Input
              ref={searchInput}
              id="invitation-search"
              type="search"
              value={query}
              onChange={(event) => {
                returnToResults()
                setQuery(event.target.value)
                setPage(1)
              }}
              placeholder="Cari nama, pautan atau tarikh…"
              className="h-10 bg-card pr-10 pl-10 [&::-webkit-search-cancel-button]:appearance-none"
            />
            {query && (
              <button type="button" aria-label="Kosongkan carian" className="absolute top-0 right-0 flex size-10 items-center justify-center rounded-md text-muted-foreground hover:text-primary focus-visible:outline-2 focus-visible:outline-ring" onClick={() => {
                returnToResults()
                setQuery("")
                setPage(1)
                searchInput.current?.focus()
              }}>
                <X size={16} aria-hidden />
              </button>
            )}
          </div>
        </div>
      </div>
      <section id="invitation-results" aria-labelledby="invitation-group-heading">
        <div className="mb-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="invitation-group-heading" className="text-lg font-semibold">{active.heading}</h2>
            <p role="status" className="text-xs text-muted-foreground">
              {visible.length ? `${start + 1}–${start + visible.length} daripada ${active.entries.length} jemputan` : "0 jemputan"}
              {words.length > 0 && " sepadan"}
            </p>
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{active.description}</p>
        </div>
        {visible.length ? (
          <div className="invitation-grid">{visible.map((entry) => <div key={entry.id} className="contents">{entry.content}</div>)}</div>
        ) : (
          <div className="rounded-2xl border border-dashed bg-card px-6 py-12 text-center">
            <h3 className="font-semibold">{words.length ? "Tiada jemputan sepadan dalam kumpulan ini" : "Belum ada jemputan dalam kumpulan ini"}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{words.length ? "Cuba nama atau tarikh lain. Bilangan pada penapis menunjukkan padanan setiap kumpulan." : "Pilih kumpulan lain untuk melihat jemputan anda."}</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {filtered.filter((group) => group.id !== selected && group.entries.length > 0).map((group) => (
                <Button key={group.id} variant="outline" size="sm" onClick={() => selectGroup(group.id)}>{group.heading} ({group.entries.length})</Button>
              ))}
            </div>
          </div>
        )}
        {pages > 1 && (
          <nav aria-label="Halaman jemputan" className="mt-5 flex items-center justify-center gap-4">
            <Button variant="outline" size="icon" disabled={currentPage === 1} aria-label="Halaman sebelumnya" onClick={() => { returnToResults(); setPage(currentPage - 1) }}><ChevronLeft size={18} aria-hidden /></Button>
            <span className="text-xs text-muted-foreground">Halaman {currentPage} daripada {pages}</span>
            <Button variant="outline" size="icon" disabled={currentPage === pages} aria-label="Halaman seterusnya" onClick={() => { returnToResults(); setPage(currentPage + 1) }}><ChevronRight size={18} aria-hidden /></Button>
          </nav>
        )}
      </section>
    </div>
  )
}
