import { createSupabaseServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { signInDestination } from "@/lib/auth/redirect"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  if (!code) return NextResponse.redirect(new URL("/login", url.origin))
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)
  if (error || !data.user)
    return NextResponse.redirect(new URL("/login", url.origin))
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", data.user.id)
    .single()
  return NextResponse.redirect(
    new URL(
      signInDestination(profile?.role, url.searchParams.get("redirectTo")),
      url.origin,
    ),
  )
}
