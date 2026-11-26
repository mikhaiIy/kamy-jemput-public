import { AdminPageHeader } from "../../AdminPageHeader"
import { SettingsNavigation } from "./SettingsNavigation"

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div>
      <AdminPageHeader
        title="Tetapan"
        description="Urus maklumat pembayaran dan pilihan untuk pelanggan."
      />
      <div className="grid gap-6">
        <SettingsNavigation />
        <div className="admin-panel min-w-0">{children}</div>
      </div>
    </div>
  )
}
