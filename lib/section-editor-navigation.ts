/**
 * Flush the latest editor value before leaving the editor.
 *
 * The caller owns the serialized save queue. If the value changes while an
 * earlier save is in flight, save the newer value too before navigating. This
 * helper deliberately has no validation hook: payment review is a separate
 * flow from invitation completeness.
 */
export type SaveLatestThenNavigateOptions<T> = {
  clearPendingSave: () => void
  readLatest: () => T
  save: (draft: T) => Promise<unknown>
  navigate: () => void
  onSaving: () => void
  onError: (error: unknown) => void
  serialize?: (draft: T) => string
}

export async function saveLatestThenNavigate<T>({
  clearPendingSave,
  readLatest,
  save,
  navigate,
  onSaving,
  onError,
  serialize = (draft) => JSON.stringify(draft),
}: SaveLatestThenNavigateOptions<T>): Promise<boolean> {
  clearPendingSave()
  onSaving()

  try {
    let draft = readLatest()
    while (true) {
      await save(draft)
      const latest = readLatest()
      if (serialize(latest) === serialize(draft)) {
        navigate()
        return true
      }
      draft = latest
    }
  } catch (error) {
    onError(error)
    return false
  }
}
