import type { CompareControls } from '@/shared/dedup/DuplicatesTab/types'

/** The `CompareControls` a caller's comparison grid reads, from `useAbrirPendiente`'s own state
 *  and setters. */
export default function buildControls(
  elecciones: Record<string, string>,
  onChoose: (field: string, value: string) => void,
  excludedIds: string[],
  onToggleExcluded: (ids: string[]) => void,
): CompareControls {
  const controls: CompareControls = {
    choices: elecciones,
    onChoose,
    excludedIds,
    onToggleExcluded,
  }
  return controls
}

// Builds `CompareControls`, pulled out of `useAbrirPendiente` so this 4-field literal doesn't
// push the hook over this repo's file-length cap.
