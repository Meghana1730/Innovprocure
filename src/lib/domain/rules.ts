// The mechanism's decision logic, as plain functions with a written reason for every result:
// eligibility screening, rubric scoring and ranking, startup matching, KPI progress and
// payment timeliness. Nothing here is a black box.

import { ELIGIBILITY_RULES, POLICY, RUBRIC } from '@/lib/domain/policy'
import type {
  Application,
  ApplicationStatus,
  Challenge,
  EligibilityStatus,
  Kpi,
  Milestone,
  RuleResult,
  Score,
  Startup,
} from '@/lib/domain/types'
import { daysBetween } from '@/lib/format'

// ---------------------------------------------------------------- eligibility screening

/** A quote up to this share above the ceiling is sent back for clarification, not rejected. */
const QUOTE_TOLERANCE = 0.1

export function screenApplication(
  application: Application,
  startup: Startup,
  challenge: Challenge,
): { results: RuleResult[]; eligibility: EligibilityStatus } {
  const year = Number(application.submittedOn.slice(0, 4))
  const age = year - startup.foundedYear
  const turnoverCrore = startup.annualTurnoverLakh / 100
  const ceiling = challenge.brief.budgetCeilingLakh
  const quote = application.quoteLakh

  const results: RuleResult[] = ELIGIBILITY_RULES.map((rule): RuleResult => {
    switch (rule.id) {
      case 'recognised':
        return startup.recognised
          ? {
              ruleId: rule.id,
              status: 'PASS',
              reason: `Recognition reference ${startup.recognitionRef} on file (demo reference).`,
            }
          : { ruleId: rule.id, status: 'FAIL', reason: 'No startup recognition reference on file.' }
      case 'age':
        return age <= POLICY.maxAgeYears
          ? {
              ruleId: rule.id,
              status: 'PASS',
              reason: `Incorporated in ${startup.foundedYear}: ${age} years old.`,
            }
          : {
              ruleId: rule.id,
              status: 'FAIL',
              reason: `Incorporated in ${startup.foundedYear}: ${age} years old, above the ${POLICY.maxAgeYears}-year limit.`,
            }
      case 'turnover-ceiling':
        return turnoverCrore <= POLICY.maxTurnoverCrore
          ? {
              ruleId: rule.id,
              status: 'PASS',
              reason: `Annual turnover Rs ${turnoverCrore} crore.`,
            }
          : {
              ruleId: rule.id,
              status: 'FAIL',
              reason: `Annual turnover Rs ${turnoverCrore} crore is above the Rs ${POLICY.maxTurnoverCrore} crore ceiling for a startup.`,
            }
      case 'not-debarred':
        return startup.debarred
          ? { ruleId: rule.id, status: 'FAIL', reason: 'Marked as debarred in the demo data.' }
          : {
              ruleId: rule.id,
              status: 'PASS',
              reason: 'Self-declared as not debarred (demo flag).',
            }
      case 'within-budget':
        if (quote <= ceiling) {
          return {
            ruleId: rule.id,
            status: 'PASS',
            reason: `Quote Rs ${quote} lakh is within the Rs ${ceiling} lakh ceiling.`,
          }
        }
        if (quote <= ceiling * (1 + QUOTE_TOLERANCE)) {
          return {
            ruleId: rule.id,
            status: 'CLARIFY',
            reason: `Quote Rs ${quote} lakh is slightly above the Rs ${ceiling} lakh ceiling: ask the startup whether it can deliver within the ceiling.`,
          }
        }
        return {
          ruleId: rule.id,
          status: 'FAIL',
          reason: `Quote Rs ${quote} lakh is above the Rs ${ceiling} lakh ceiling.`,
        }
      default:
        // Conditions that usual tenders impose and this mechanism does not apply to startups.
        return { ruleId: rule.id, status: 'RELAXED', reason: rule.detail }
    }
  })

  const eligibility: EligibilityStatus = results.some((r) => r.status === 'FAIL')
    ? 'INELIGIBLE'
    : results.some((r) => r.status === 'CLARIFY')
      ? 'CLARIFICATION'
      : 'ELIGIBLE'
  return { results, eligibility }
}

// ---------------------------------------------------------------- scoring and ranking

/** One evaluator's marks (1-5 per criterion) as a score out of 100, using the rubric weights. */
export function weightedScore(marks: Record<string, number>): number {
  const total = RUBRIC.reduce((sum, c) => sum + (c.weight * (marks[c.id] ?? 0)) / 5, 0)
  return Math.round(total * 10) / 10
}

export type RankedApplication = {
  application: Application
  /** Mean of the evaluators' weighted scores; null when nobody has scored yet. */
  score: number | null
  evaluators: number
  /** Largest gap between two evaluators' scores: a large spread calls for moderation. */
  spread: number
  /** Mean mark (1-5) per criterion. */
  byCriterion: Record<string, number>
  rank: number | null
}

/** Eligible applications of one challenge, best score first. */
export function rankApplications(
  applications: Application[],
  scores: Score[],
): RankedApplication[] {
  const rows = applications
    .filter((a) => a.eligibility === 'ELIGIBLE')
    .map((application): RankedApplication => {
      const own = scores.filter((s) => s.applicationId === application.id)
      const totals = own.map((s) => weightedScore(s.marks))
      const byCriterion: Record<string, number> = {}
      for (const c of RUBRIC) {
        byCriterion[c.id] = own.length
          ? Math.round((own.reduce((sum, s) => sum + (s.marks[c.id] ?? 0), 0) / own.length) * 10) /
            10
          : 0
      }
      return {
        application,
        score: totals.length
          ? Math.round((totals.reduce((a, b) => a + b, 0) / totals.length) * 10) / 10
          : null,
        evaluators: own.length,
        spread:
          totals.length > 1 ? Math.round((Math.max(...totals) - Math.min(...totals)) * 10) / 10 : 0,
        byCriterion,
        rank: null,
      }
    })
    .sort(
      (a, b) =>
        (b.score ?? -1) - (a.score ?? -1) || a.application.quoteLakh - b.application.quoteLakh,
    )
  rows.forEach((row, index) => {
    row.rank = row.score === null ? null : index + 1
  })
  return rows
}

/** True when every eligible application has the minimum number of evaluator scores. */
export function evaluationComplete(applications: Application[], scores: Score[]): boolean {
  const ranked = rankApplications(applications, scores)
  return ranked.length > 0 && ranked.every((r) => r.evaluators >= POLICY.minEvaluators)
}

/** Status of each eligible application once the ranking is final. */
export function outcomeStatuses(ranked: RankedApplication[]): Record<string, ApplicationStatus> {
  const out: Record<string, ApplicationStatus> = {}
  ranked.forEach((row, index) => {
    const score = row.score ?? 0
    out[row.application.id] =
      index === 0 && score >= POLICY.shortlistScore
        ? 'SELECTED'
        : score >= POLICY.shortlistScore
          ? 'SHORTLISTED'
          : 'NOT_SELECTED'
  })
  return out
}

// ---------------------------------------------------------------- startup discovery

export type StartupMatch = { startup: Startup; score: number; reasons: string[] }

/**
 * Startups that fit a challenge, best first. A transparent keyword-and-sector match (no AI):
 * sector 50, technology names that share a whole word with the brief up to 30, same district
 * 10, readiness 10. The shared words are shown, so the match never claims more than it found.
 */
export function matchStartups(challenge: Challenge, startups: Startup[]): StartupMatch[] {
  const text = [
    challenge.title,
    challenge.brief.problem,
    challenge.brief.currentApproach,
    challenge.brief.constraints,
    challenge.brief.dataAvailable,
  ]
    .join(' ')
    .toLowerCase()
  const briefWords = new Set(text.split(/[^a-z0-9]+/))
  // Whole words only, so "leak" matches "leak" or "leaks" but not a longer word that contains it.
  const inBrief = (word: string) =>
    word.length > 3 &&
    (briefWords.has(word) ||
      briefWords.has(`${word}s`) ||
      (word.endsWith('s') && briefWords.has(word.slice(0, -1))))
  return startups
    .map((startup): StartupMatch => {
      const reasons: string[] = []
      let score = 0
      if (startup.sectors.includes(challenge.sector)) {
        score += 50
        reasons.push('Works in the same sector')
      }
      const words = new Set<string>()
      const hits = startup.technologies.filter((technology) => {
        const shared = technology
          .toLowerCase()
          .split(/[^a-z0-9]+/)
          .filter(inBrief)
        shared.forEach((word) => words.add(word))
        return shared.length > 0
      })
      if (hits.length) {
        score += Math.min(30, hits.length * 15)
        reasons.push(
          `${words.size === 1 ? 'Keyword' : 'Keywords'} shared with the brief: ${[...words].join(', ')} (${hits.join(', ')})`,
        )
      }
      if (startup.district === challenge.district) {
        score += 10
        reasons.push(`Based in ${challenge.district}`)
      }
      if (startup.trl >= 6) {
        score += 10
        reasons.push(`Ready to pilot (readiness level ${startup.trl} of 9)`)
      }
      return { startup, score, reasons }
    })
    .filter((m) => m.score >= 50)
    .sort((a, b) => b.score - a.score || a.startup.name.localeCompare(b.startup.name))
}

// ---------------------------------------------------------------- KPI progress

/** Share of the way from baseline to target, 0-100 (can exceed 100 when the target is beaten). */
export function kpiProgress(kpi: Kpi, value: number): number {
  const span = kpi.target - kpi.baseline
  if (span === 0) return 100
  return Math.max(0, Math.round(((value - kpi.baseline) / span) * 100))
}

export function kpiMet(kpi: Kpi, value: number): boolean {
  return kpi.better === 'lower' ? value <= kpi.target : value >= kpi.target
}

// ---------------------------------------------------------------- payments

export type PaymentTiming = {
  /** Days from the payment request to payment (or to today when still unpaid). */
  days: number
  state: 'PAID_ON_TIME' | 'PAID_LATE' | 'PENDING' | 'OVERDUE' | 'NOT_DUE'
}

export function paymentTiming(milestone: Milestone, todayIso: string): PaymentTiming {
  if (!milestone.requestedOn) return { days: 0, state: 'NOT_DUE' }
  if (milestone.paidOn) {
    const days = daysBetween(milestone.requestedOn, milestone.paidOn)
    return { days, state: days <= POLICY.paymentTargetDays ? 'PAID_ON_TIME' : 'PAID_LATE' }
  }
  const days = Math.max(0, daysBetween(milestone.requestedOn, todayIso))
  return { days, state: days <= POLICY.paymentTargetDays ? 'PENDING' : 'OVERDUE' }
}
