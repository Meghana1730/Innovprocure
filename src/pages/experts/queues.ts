// What is waiting on the expert dashboard: applications to score and pilots to validate.
import type { Application, Challenge, DemoState } from '@/lib/domain/types'

export type ScoreGroup = { challenge: Challenge; applications: Application[] }

/** Eligible applications the acting evaluator has not scored yet, grouped by challenge. */
export function toScore(state: DemoState): ScoreGroup[] {
  return state.challenges
    .filter((c) => c.stage === 'EVALUATE' && !c.outcome)
    .map((challenge) => ({
      challenge,
      applications: state.applications.filter(
        (a) =>
          a.challengeId === challenge.id &&
          a.eligibility === 'ELIGIBLE' &&
          !state.scores.some(
            (s) => s.applicationId === a.id && s.evaluatorId === state.evaluatorId,
          ),
      ),
    }))
    .filter((group) => group.applications.length > 0)
}

/** Closed pilots waiting for the independent validator. */
export function toValidate(state: DemoState): Challenge[] {
  return state.challenges.filter((c) => c.stage === 'VALIDATE' && !c.outcome)
}
