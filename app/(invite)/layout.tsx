// Bare layout for guest-facing invitation pages: no marketing Navbar/Footer.
// The invitation card is the entire experience; platform chrome would dilute
// it and (on mobile) cover card content.
export default function InviteLayout({ children }: { children: React.ReactNode }) {
  return <main className="flex-1">{children}</main>
}
