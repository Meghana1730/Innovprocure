import type { Challenge, Milestone, TimelineEvent } from '@/lib/domain/types'

/** A published challenge that still accepts applications. */
export function isOpenCall(challenge: Challenge): boolean {
  return challenge.stage === 'DISCOVER' && !challenge.outcome
}

/**
 * The department's latest return of a milestone that still waits to be delivered again, read
 * from the audit trail (oldest first): `on` is the date, `detail` is the written reason.
 */
export function returnOf(timeline: TimelineEvent[], milestone: Milestone) {
  if (milestone.status !== 'PLANNED') return undefined
  return timeline
    .filter(
      (e) =>
        e.challengeId === milestone.challengeId &&
        e.role === 'department' &&
        e.action === `Milestone ${milestone.order} returned`,
    )
    .pop()
}
