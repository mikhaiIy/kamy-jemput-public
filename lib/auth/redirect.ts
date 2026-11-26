/** Accept local app destinations only; never treat a supplied URL as trusted. */
export function safeRedirectPath(
  value: string | null | undefined,
): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null
  try {
    const decoded = decodeURIComponent(value)
    if (/^[\/]{2}|[\\\u0000-\u0020\u007f]/.test(decoded)) return null
    const target = new URL(value, "https://kamy.invalid")
    if (target.origin !== "https://kamy.invalid") return null
    // Avoid sending a successful sign-in back into the authentication flow.
    if (["/login", "/register", "/auth/callback"].includes(target.pathname))
      return null
    return target.pathname + target.search + target.hash
  } catch {
    return null
  }
}

export function signInDestination(
  role: string | null | undefined,
  requested?: string | null,
) {
  return (
    safeRedirectPath(requested) ?? (role === "admin" ? "/admin" : "/dashboard")
  )
}
