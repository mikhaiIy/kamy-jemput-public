/** Exhaustive, stable pages: never show partial query results as a complete list. */
export async function loadAdminPages<
  T extends { id: string; created_at: string },
>(
  fetchPage: (
    cursor: string | null,
  ) => Promise<{ data: T[] | null; error: { message: string } | null }>,
) {
  const data: T[] = []
  let cursor: string | null = null
  for (;;) {
    const result = await fetchPage(cursor)
    if (result.error) return { data: [] as T[], error: result.error }
    const page = result.data ?? []
    data.push(...page)
    if (page.length < 1000) return { data, error: null }
    const last = page[page.length - 1]
    cursor = `created_at.lt.${last.created_at},and(created_at.eq.${last.created_at},id.lt.${last.id})`
  }
}
