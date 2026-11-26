import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { Navbar } from "@/components/Navbar"
import { Footer } from "@/components/Footer"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  return (
    <>
      <Navbar />
      <main className="flex-1 bg-background">{children}</main>
      <Footer />
    </>
  )
}
