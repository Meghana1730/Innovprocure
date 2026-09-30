import { stageIndex } from '@/lib/demo/selectors'
import type { Challenge } from '@/lib/domain/types'

/** Open challenges in pathway order, then the closed ones. */
export function sortChallenges(challenges: Challenge[]): Challenge[] {
  return [...challenges].sort(
    (a, b) =>
      Number(Boolean(a.outcome)) - Number(Boolean(b.outcome)) ||
      stageIndex(a.stage) - stageIndex(b.stage) ||
      a.code.localeCompare(b.code),
  )
}
