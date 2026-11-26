"use client"

import {
  Fragment,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react"
import { Search, ChevronDown, ChevronRight, RotateCcw } from "lucide-react"
import { useRouter } from "next/navigation"

const mobileQuery = "(max-width: 767px)"
function subscribeViewport(callback: () => void) {
  const media = window.matchMedia(mobileQuery)
  media.addEventListener("change", callback)
  return () => media.removeEventListener("change", callback)
}
const getMobileSnapshot = () => window.matchMedia(mobileQuery).matches
const getServerSnapshot = () => false

export type AdminTableRow = {
  id: string
  search: string
  status: string
  category?: string
  cells?: ReactNode[]
  content?: ReactNode
  details?: ReactNode
  detailLabel?: string
}

export type AdminTableServerPagination = {
  path: string
  page: number
  pageSize: number
  total: number
}

export function AdminTable({
  rows,
  columns,
  label,
  searchPlaceholder,
  statuses,
  categories,
  defaultStatus = "",
  initialSearch = "",
  serverPagination,
}: {
  rows: AdminTableRow[]
  columns: string[]
  label: string
  searchPlaceholder: string
  statuses: { value: string; label: string }[]
  categories?: { value: string; label: string }[]
  defaultStatus?: string
  initialSearch?: string
  serverPagination?: AdminTableServerPagination
}) {
  const router = useRouter()
  const [search, setSearch] = useState(initialSearch)
  const [status, setStatus] = useState(defaultStatus)
  const [category, setCategory] = useState("")
  const [page, setPage] = useState(0)
  const [open, setOpen] = useState<string | null>(null)
  const isMobile = useSyncExternalStore(
    subscribeViewport,
    getMobileSnapshot,
    getServerSnapshot,
  )
  const detailPanel = useRef<HTMLElement>(null)
  useEffect(() => {
    if (isMobile && open) {
      detailPanel.current?.scrollIntoView({ block: "start" })
      detailPanel.current?.focus({ preventScroll: true })
    }
  }, [isMobile, open])
  const query = search.trim().toLocaleLowerCase()
  const matched = rows.filter(
    (r) =>
      (!status || r.status === status) &&
      (!category || r.category === category) &&
      (!query || r.search.toLocaleLowerCase().includes(query)),
  )
  const pageCount = serverPagination
    ? Math.max(1, Math.ceil(serverPagination.total / serverPagination.pageSize))
    : Math.max(1, Math.ceil(matched.length / 20))
  const currentPage = serverPagination
    ? Math.min(Math.max(serverPagination.page - 1, 0), pageCount - 1)
    : Math.min(page, pageCount - 1)
  const visible = serverPagination
    ? matched
    : matched.slice(currentPage * 20, currentPage * 20 + 20)
  const expandedRow = visible.find((row) => row.id === open)
  const hasDetails = rows.some((r) => r.details)

  function navigateServer(
    nextPage: number,
    nextStatus = status,
    nextSearch = search,
  ) {
    if (!serverPagination) return
    const params = new URLSearchParams()
    params.set("status", nextStatus || "all")
    const nextQuery = nextSearch.trim()
    if (nextQuery) params.set("q", nextQuery)
    if (nextPage > 1) params.set("page", String(nextPage))
    router.push(`${serverPagination.path}?${params.toString()}`)
  }

  function reset() {
    setSearch("")
    setStatus("")
    setCategory("")
    setPage(0)
    setOpen(null)
    navigateServer(1, "", "")
  }

  function refreshServerData() {
    if (serverPagination) {
      navigateServer(serverPagination.page, status)
    }
    router.refresh()
  }

  return (
    <div className="admin-panel overflow-hidden">
      <div className="flex flex-wrap items-end gap-3 p-5">
        <div className="min-w-48 flex-1">
          <label className="block">
            <span className="sr-only">{searchPlaceholder}</span>
            <span className="relative block">
              <Search
                size={16}
                aria-hidden
                className="absolute left-3 top-3 text-muted-foreground"
              />
              <input
                type="search"
                className="admin-field w-full pl-10"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(0)
                }}
              />
            </span>
          </label>
          {serverPagination && (
            <p className="mt-1 text-[10px] text-muted-foreground">
              Carian hanya meliputi halaman yang dipaparkan.
            </p>
          )}
        </div>
        <label className="text-[10px] text-muted-foreground">
          Status
          <select
            aria-label="Status"
            className="admin-field ml-2"
            value={status}
            onChange={(e) => {
              const nextStatus = e.target.value
              setStatus(nextStatus)
              setPage(0)
              setOpen(null)
              if (serverPagination) navigateServer(1, nextStatus)
            }}
          >
            <option value="">Semua status</option>
            {statuses.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        {categories && (
          <label className="text-[10px] text-muted-foreground">
            Kategori
            <select
              aria-label="Kategori"
              className="admin-field ml-2"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value)
                setPage(0)
              }}
            >
              <option value="">Semua kategori</option>
              {categories.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <button
          className="admin-secondary"
          onClick={refreshServerData}
          aria-label={`Muat semula ${label}`}
          title="Muat semula"
        >
          <RotateCcw size={15} aria-hidden />
        </button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-4">
        <p className="text-xs text-muted-foreground" role="status">
          {serverPagination
            ? `${matched.length} padanan pada halaman ini daripada ${serverPagination.total} ${label}`
            : `${matched.length} daripada ${rows.length} ${label}`}
        </p>
        {(search || status || category) && (
          <button className="admin-link text-xs" onClick={reset}>
            Kosongkan penapis
          </button>
        )}
      </div>
      <div
        className="overflow-x-auto"
        tabIndex={0}
        role="region"
        aria-label={`Jadual ${label}`}
      >
        <table className="admin-table">
          <caption className="sr-only">{label}</caption>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c} scope="col">
                  {c}
                </th>
              ))}
              {hasDetails && (
                <th scope="col">
                  <span className="sr-only">Butiran</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) =>
              row.content ? (
                <Fragment key={row.id}>{row.content}</Fragment>
              ) : (
                <Fragment key={row.id}>
                  <tr>
                    {row.cells?.map((cell, i) => (
                      <td key={i}>{cell}</td>
                    ))}
                    {hasDetails && (
                      <td className="text-right">
                        {row.details && (
                          <button
                            className="admin-secondary whitespace-nowrap"
                            aria-expanded={open === row.id}
                            aria-controls={`detail-${row.id}`}
                            onClick={() =>
                              setOpen(open === row.id ? null : row.id)
                            }
                          >
                            {open === row.id
                              ? "Tutup"
                              : (row.detailLabel ?? "Lihat butiran")}
                            {open === row.id ? (
                              <ChevronDown size={14} aria-hidden />
                            ) : (
                              <ChevronRight size={14} aria-hidden />
                            )}
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                  {row.details && !isMobile && (
                    <tr
                      id={`detail-${row.id}`}
                      hidden={open !== row.id}
                      className="admin-expanded"
                    >
                      <td colSpan={columns.length + 1}>
                        {open === row.id && row.details}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ),
            )}
          </tbody>
        </table>
      </div>
      {isMobile && expandedRow?.details && (
        <section
          ref={detailPanel}
          id={`detail-${expandedRow.id}`}
          tabIndex={-1}
          aria-label="Butiran rekod terpilih"
          className="scroll-mt-20 border-t border-border bg-muted p-4"
        >
          <div className="mb-5 flex justify-end">
            <button className="admin-secondary" onClick={() => setOpen(null)}>
              Tutup butiran
            </button>
          </div>
          {expandedRow.details}
        </section>
      )}
      {matched.length === 0 && (
        <div className="admin-empty">
          <p className="font-semibold text-foreground">
            {rows.length ? "Tiada hasil yang sepadan" : "Belum ada rekod"}
          </p>
          <p className="mt-2">
            {rows.length
              ? "Cuba kata carian lain atau kosongkan penapis."
              : "Rekod baharu akan muncul di sini."}
          </p>
        </div>
      )}
      <div className="flex items-center justify-between border-t border-border px-5 py-4 text-xs text-muted-foreground">
        <span>
          Halaman {currentPage + 1} / {pageCount}
        </span>
        <div className="flex gap-2">
          <button
            className="admin-secondary"
            disabled={currentPage === 0}
            onClick={() =>
              serverPagination
                ? navigateServer(currentPage, status)
                : setPage(currentPage - 1)
            }
          >
            Sebelum
          </button>
          <button
            className="admin-secondary"
            disabled={currentPage + 1 >= pageCount}
            onClick={() =>
              serverPagination
                ? navigateServer(currentPage + 2, status)
                : setPage(currentPage + 1)
            }
          >
            Seterusnya
          </button>
        </div>
      </div>
    </div>
  )
}
