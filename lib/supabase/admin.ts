import { createClient, type SupabaseClient } from "@supabase/supabase-js"

// Lazily-initialized service role client
// Only valid at runtime (not build time) when env vars are set
let _adminClient: SupabaseClient | null = null

function getAdminClient(): SupabaseClient {
  if (_adminClient) return _adminClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error("Supabase admin env vars not set")
  }

  _adminClient = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return _adminClient
}

// Use as a Proxy so consumers can call supabaseAdmin.from(...) etc.
// without having to call getAdminClient() explicitly
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getAdminClient()
    const value = (client as unknown as Record<string | symbol, unknown>)[prop]
    return typeof value === "function" ? value.bind(client) : value
  },
})
