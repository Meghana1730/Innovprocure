// Read-side helpers: everything a page needs about a challenge, who has to act next,
// and the programme-level numbers. All are pure functions of the demo state.

import { DEPARTMENTS, EVALUATORS, STARTUPS } from '@/lib/demo/seed'
import { POLICY, STAGE_INFO } from '@/lib/domain/policy'
import {
  evaluationComplete,
  kpiMet,
  kpiProgress,
  paymentTiming,
  rankApplications,
  type RankedApplication,
} from '@/lib/domain/rules'
import {
  STAGES,
  type Agreement,
  type Application,
  type Challenge,
  type DemoState,
  type Department,
  type Evaluator,
  type Kpi,
  type Measurement,
  type Milestone,
  type PilotPlan,
  type Role,
  type ScaleDecision,
  type Stage,
  type Startup,
  type TimelineEvent,
  type ValidationReport,
} from '@/lib/domain/types'
import { daysBetween, today } from '@/lib/format'

export function departmentOf(id: string): Department | undefined {
  return DEPARTMENTS.find((d) => d.id === id)
}

export function startupOf(id: string | null | undefined): Startup | undefined {
  return STARTUPS.find((s) => s.id === id)
}

export function evaluatorOf(id: string): Evaluator | undefined {
  return EVALUATORS.find((e) => e.id === id)
}

/** Position of a stage in the pathway, 0-9. */
export function stageIndex(stage: Stage): number {
  return STAGES.indexOf(stage)
}

// ---------------------------------------------------------------- one challenge

export type KpiReading = {
  kpi: Kpi
  /** Latest measured value, or null before the first reading. */
  value: number | null
  week: number | null
  /** Share of the way from baseline to target, 0-100+. */
  progress: number
  met: boolean
  /** All readings in week order, for charts. */
  series: { week: number; value: number }[]
}

export function kpiReadings(challenge: Challenge, measurements: Measurement[]): KpiReading[] {
  return challenge.brief.kpis.map((kpi) => {
    const series = measurements
      .filter((m) => m.challengeId === challenge.id && m.kpiId === kpi.id)
      .sort((a, b) => a.week - b.week)
      .map((m) => ({ week: m.week, value: m.value }))
    const last = series[series.length - 1]
    return {
      kpi,
      value: last?.value ?? null,
      week: last?.week ?? null,
      progress: last ? kpiProgress(kpi, last.value) : 0,
      met: last ? kpiMet(kpi, last.value) : false,
      series,
    }
  })
}

export type ChallengeView = {
  challenge: Challenge
  department: Department | undefined
  applications: (Application & { startup: Startup | undefined })[]
  /** Eligible applications, best score first. */
  ranked: RankedApplication[]
  selected: (Application & { startup: Startup | undefined }) | undefined
  pilot: PilotPlan | undefined
  agreement: Agreement | undefined
  milestones: Milestone[]
  readings: KpiReading[]
  validation: ValidationReport | undefined
  decision: ScaleDecision | undefined
  /** Newest first. */
  timeline: TimelineEvent[]
  next: NextAction | null
}

export function challengeView(state: DemoState, id: string | undefined): ChallengeView | null {
  const challenge = state.challenges.find((c) => c.id === id)
  if (!challenge) return null
  const applications = state.applications
    .filter((a) => a.challengeId === challenge.id)
    .map((a) => ({ ...a, startup: startupOf(a.startupId) }))
  return {
    challenge,
    department: departmentOf(challenge.departmentId),
    applications,
    ranked: rankApplications(applications, state.scores),
    selected: applications.find((a) => a.id === challenge.selectedApplicationId),
    pilot: state.pilots.find((p) => p.challengeId === challenge.id),
    agreement: state.agreements.find((a) => a.challengeId === challenge.id),
    milestones: state.milestones
      .filter((m) => m.challengeId === challenge.id)
      .sort((a, b) => a.order - b.order),
    readings: kpiReadings(challenge, state.measurements),
    validation: state.validations.find((v) => v.challengeId === challenge.id),
    decision: state.decisions.find((d) => d.challengeId === challenge.id),
    timeline: state.timeline
      .filter((e) => e.challengeId === challenge.id)
      .map((e, index) => ({ e, index }))
      .sort((a, b) => b.e.on.localeCompare(a.e.on) || b.index - a.index)
      .map(({ e }) => e),
    next: nextAction(state, challenge),
  }
}

// ---------------------------------------------------------------- who acts next

/** Tabs of the challenge workspace on the government dashboard. */
export type ChallengeTab = 'brief' | 'startups' | 'pilot' | 'outcome' | 'audit'

/** The three dashboards of the app. */
export type Dashboard = 'government' | 'startup' | 'experts'

/** The dashboard on which a role works. */
export function dashboardOf(role: Role): Dashboard {
  if (role === 'startup') return 'startup'
  if (role === 'evaluator' || role === 'validator') return 'experts'
  return 'government'
}

export type NextAction = {
  /** The role that has to act. */
  role: Role
  /** What has to be done, as an instruction: "Run eligibility screening". */
  label: string
  tab: ChallengeTab
}

/** The single next step of a challenge, or null when it is closed. */
export function nextAction(state: DemoState, challenge: Challenge): NextAction | null {
  if (challenge.outcome) return null
  const applications = state.applications.filter((a) => a.challengeId === challenge.id)
  const milestones = state.milestones
    .filter((m) => m.challengeId === challenge.id)
    .sort((a, b) => a.order - b.order)
  switch (challenge.stage) {
    case 'IDENTIFY':
      return challenge.reviewStatus === 'IN_REVIEW'
        ? { role: 'cell', label: 'Review the brief and publish the challenge', tab: 'brief' }
        : { role: 'department', label: 'Complete the brief and send it for review', tab: 'brief' }
    case 'DISCOVER':
      return {
        role: 'cell',
        label: 'Invite matching startups, then close the call',
        tab: 'startups',
      }
    case 'SCREEN':
      if (applications.some((a) => a.eligibility === 'CLARIFICATION'))
        return { role: 'cell', label: 'Settle the pending clarification', tab: 'startups' }
      // Screening has run and nothing passed: the challenge cannot move to evaluation.
      if (applications.length > 0 && applications.every((a) => a.eligibility === 'INELIGIBLE'))
        return {
          role: 'department',
          label: 'No eligible application: stop the challenge',
          tab: 'startups',
        }
      return { role: 'cell', label: 'Run eligibility screening', tab: 'startups' }
    case 'EVALUATE': {
      if (!evaluationComplete(applications, state.scores))
        return { role: 'evaluator', label: 'Score the eligible applications', tab: 'startups' }
      const top = rankApplications(applications, state.scores)[0]
      return (top?.score ?? 0) >= POLICY.shortlistScore
        ? { role: 'cell', label: 'Close the evaluation and confirm the ranking', tab: 'startups' }
        : {
            role: 'department',
            label: 'No application reached the shortlist score: stop the challenge',
            tab: 'startups',
          }
    }
    case 'PILOT_DESIGN':
      return { role: 'department', label: 'Design and approve the pilot plan', tab: 'pilot' }
    case 'CONTRACT':
      return {
        role: 'department',
        label: 'Set milestones and sign the pilot agreement',
        tab: 'pilot',
      }
    case 'MEASURE': {
      const toAccept = milestones.find((m) => m.status === 'SUBMITTED')
      if (toAccept)
        return { role: 'department', label: `Review milestone ${toAccept.order}`, tab: 'pilot' }
      const toApprove = milestones.find((m) => m.payment === 'REQUESTED')
      if (toApprove)
        return {
          role: 'finance',
          label: `Approve the payment for milestone ${toApprove.order}`,
          tab: 'pilot',
        }
      const toPay = milestones.find((m) => m.payment === 'APPROVED')
      if (toPay)
        return {
          role: 'finance',
          label: `Release the payment for milestone ${toPay.order}`,
          tab: 'pilot',
        }
      const toDeliver = milestones.find((m) => m.status === 'PLANNED')
      if (toDeliver)
        return { role: 'startup', label: `Deliver milestone ${toDeliver.order}`, tab: 'pilot' }
      return {
        role: 'department',
        label: 'Close the pilot and send it for validation',
        tab: 'pilot',
      }
    }
    case 'VALIDATE':
      return {
        role: 'validator',
        label: 'Check the results and submit the validation report',
        tab: 'outcome',
      }
    case 'DECIDE':
      return { role: 'department', label: 'Decide: scale, extend or stop', tab: 'outcome' }
    case 'SCALE':
      return null
  }
}

export type Task = NextAction & { challenge: Challenge; to: string }

/** Where a step is done: the challenge workspace for officers, their own dashboard for others. */
export function taskLink(role: Role, challengeId: string, tab: ChallengeTab): string {
  const dashboard = dashboardOf(role)
  if (dashboard === 'government') return `/government?c=${challengeId}&tab=${tab}`
  return role === 'validator' ? '/experts?view=validation' : `/${dashboard}`
}

/** Open steps across all challenges, optionally only those waiting for one role. */
export function openTasks(state: DemoState, role?: Role): Task[] {
  const tasks: Task[] = []
  for (const challenge of state.challenges) {
    const next = nextAction(state, challenge)
    if (next) tasks.push({ ...next, challenge, to: taskLink(next.role, challenge.id, next.tab) })
    // Payments run in parallel with delivery, so finance may have more than the "next" step.
    for (const m of state.milestones.filter((x) => x.challengeId === challenge.id)) {
      const label =
        m.payment === 'REQUESTED'
          ? `Approve the payment for milestone ${m.order}`
          : m.payment === 'APPROVED'
            ? `Release the payment for milestone ${m.order}`
            : null
      if (label && !(next?.role === 'finance' && next.label === label)) {
        tasks.push({
          role: 'finance',
          label,
          tab: 'pilot',
          challenge,
          to: taskLink('finance', challenge.id, 'pilot'),
        })
      }
    }
  }
  const filtered = role ? tasks.filter((t) => t.role === role) : tasks
  return filtered.sort((a, b) => stageIndex(b.challenge.stage) - stageIndex(a.challenge.stage))
}

/** Open steps of one dashboard (for the startup dashboard use startupTasks). */
export function dashboardTasks(state: DemoState, dashboard: Dashboard): Task[] {
  return openTasks(state).filter((task) => dashboardOf(task.role) === dashboard)
}

/** Tasks of the startup the presenter acts as (only its own pilots). */
export function startupTasks(state: DemoState): Task[] {
  const tasks: Task[] = []
  for (const challenge of state.challenges) {
    if (challenge.stage !== 'MEASURE' || challenge.outcome) continue
    const selected = state.applications.find((a) => a.id === challenge.selectedApplicationId)
    if (selected?.startupId !== state.startupId) continue
    // Milestones are delivered in order; the next one can be submitted while earlier
    // payments are still with finance.
    const next = state.milestones
      .filter((m) => m.challengeId === challenge.id && m.status === 'PLANNED')
      .sort((a, b) => a.order - b.order)[0]
    if (next) {
      tasks.push({
        role: 'startup',
        label: `Deliver milestone ${next.order}`,
        tab: 'pilot',
        challenge,
        to: '/startup',
      })
    }
  }
  return tasks
}

// ---------------------------------------------------------------- programme numbers

export type ProgrammeStats = {
  challenges: number
  /** Challenges per stage, in pathway order (closed challenges counted at their last stage). */
  byStage: { stage: Stage; label: string; count: number }[]
  active: number
  scaled: number
  stopped: number
  applications: number
  startupsEngaged: number
  pilotsStarted: number
  /** Median days from publishing a challenge to the pilot start; null when no pilot yet. */
  daysToPilot: number | null
  contractedLakh: number
  paidLakh: number
  pendingLakh: number
  paymentsMade: number
  /** Share of completed payments made within the target, 0-100; null when none yet. */
  paidOnTimePct: number | null
  /** Mean days from payment request to payment; null when none yet. */
  avgPaymentDays: number | null
  overduePayments: number
  validated: number
  /** Value of scale-up plans recorded, Rs lakh. */
  scaleUpLakh: number
}

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2)
}

export function programmeStats(state: DemoState): ProgrammeStats {
  const now = today()
  const timings = state.milestones.map((m) => paymentTiming(m, now))
  const paid = timings.filter((t) => t.state === 'PAID_ON_TIME' || t.state === 'PAID_LATE')
  const daysToPilot = state.pilots
    .map((pilot) => {
      const challenge = state.challenges.find((c) => c.id === pilot.challengeId)
      return challenge?.publishedOn && pilot.approved
        ? daysBetween(challenge.publishedOn, pilot.startOn)
        : null
    })
    .filter((d): d is number => d !== null)
  return {
    challenges: state.challenges.length,
    byStage: STAGES.map((stage) => ({
      stage,
      label: STAGE_INFO[stage].short,
      count: state.challenges.filter((c) => c.stage === stage).length,
    })),
    active: state.challenges.filter((c) => !c.outcome).length,
    scaled: state.challenges.filter((c) => c.outcome === 'SCALED').length,
    stopped: state.challenges.filter((c) => c.outcome === 'STOPPED').length,
    applications: state.applications.length,
    startupsEngaged: new Set(state.applications.map((a) => a.startupId)).size,
    pilotsStarted: state.agreements.length,
    daysToPilot: median(daysToPilot),
    contractedLakh: state.agreements.reduce((sum, a) => sum + a.valueLakh, 0),
    paidLakh: state.milestones
      .filter((m) => m.payment === 'PAID')
      .reduce((sum, m) => sum + m.amountLakh, 0),
    pendingLakh: state.milestones
      .filter((m) => m.payment === 'REQUESTED' || m.payment === 'APPROVED')
      .reduce((sum, m) => sum + m.amountLakh, 0),
    paymentsMade: paid.length,
    paidOnTimePct: paid.length
      ? Math.round((paid.filter((t) => t.state === 'PAID_ON_TIME').length / paid.length) * 100)
      : null,
    avgPaymentDays: paid.length
      ? Math.round(paid.reduce((sum, t) => sum + t.days, 0) / paid.length)
      : null,
    overduePayments: timings.filter((t) => t.state === 'OVERDUE').length,
    validated: state.validations.filter((v) => v.verdict !== 'NOT_VALIDATED').length,
    scaleUpLakh: state.decisions.reduce(
      (sum, d) => sum + d.plan.reduce((s, p) => s + p.valueLakh, 0),
      0,
    ),
  }
}

/** Days a payment may still take before it misses the target (negative = overdue). */
export function paymentDaysLeft(milestone: Milestone): number | null {
  if (!milestone.requestedOn || milestone.paidOn) return null
  return POLICY.paymentTargetDays - daysBetween(milestone.requestedOn, today())
}
