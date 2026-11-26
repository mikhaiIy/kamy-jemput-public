import type { ReactNode } from "react"

export function AdminPageHeader({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-5">
      <div>
        <p className="admin-eyebrow mb-3">Kamy jemput / Pengurusan</p>
        <h1 className="admin-heading">{title}</h1>
        <p className="admin-description">{description}</p>
      </div>
      {action && <div className="flex flex-wrap gap-2">{action}</div>}
    </header>
  )
}
export function AdminStatus({
  children,
  tone,
}: {
  children: ReactNode
  tone?: "success" | "warning" | "danger"
}) {
  return (
    <span className="admin-pill" data-tone={tone}>
      {children}
    </span>
  )
}
