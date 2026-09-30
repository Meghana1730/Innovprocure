// The demo state and every action of the pathway. The state lives in this browser
// (localStorage); there is no server yet. Each action checks that the step is allowed,
// changes the state, and writes an entry to the challenge's audit timeline.
//
// Actions throw an Error with a plain-English message when a step is not allowed;
// use `run()` from '@/lib/demo/run' to show it as a toast.

import { useSyncExternalStore } from 'react'

import {
  AGREEMENTS,
  APPLICATIONS,
  CHALLENGES,
  DECISIONS,
  DEMO_EVALUATOR_ID,
  DEMO_TODAY,
  DEMO_STARTUP_ID,
  DEPARTMENTS,
  EVALUATORS,
  MEASUREMENTS,
  MILESTONES,
  PILOTS,
  SCORES,
  STARTUPS,
  TIMELINE,
  VALIDATIONS,
} from '@/lib/demo/seed'
import { PATHWAYS, POLICY, ROLE_INFO, RUBRIC } from '@/lib/domain/policy'
import {
  evaluationComplete,
  outcomeStatuses,
  rankApplications,
  screenApplication,
} from '@/lib/domain/rules'
import type {
  Application,
  Challenge,
  ChallengeBrief,
  DataOption,
  Decision,
  DemoState,
  IpOption,
  Milestone,
  PilotPlan,
  Role,
  ScalePlanItem,
  Stage,
  ValidationVerdict,
} from '@/lib/domain/types'
import { addDays, daysBetween, fmtLakh, today } from '@/lib/format'

// Raise the version whenever the seed or the types change, so a browser that holds older
// demo data starts again from the current seed.
const STORAGE_KEY = 'innovprocure.demo.v2'

// ---------------------------------------------------------------- seed

export function seedState(): DemoState {
  const state: DemoState = structuredClone({
    startupId: DEMO_STARTUP_ID,
    evaluatorId: DEMO_EVALUATOR_ID,
    challenges: CHALLENGES,
    applications: APPLICATIONS,
    scores: SCORES,
    pilots: PILOTS,
    agreements: AGREEMENTS,
    milestones: MILESTONES,
    measurements: MEASUREMENTS,
    validations: VALIDATIONS,
    decisions: DECISIONS,
    timeline: TIMELINE,
  })
  // The seed is laid out around DEMO_TODAY. On a later day an open call keeps the days it had
  // left, so it is not already over when the demo starts.
  const daysLater = daysBetween(DEMO_TODAY, today())
  // Fill in what the rules produce, so the seed can never disagree with the rules.
  for (const challenge of state.challenges) {
    if (daysLater > 0 && challenge.stage === 'DISCOVER' && challenge.closesOn) {
      challenge.closesOn = addDays(challenge.closesOn, daysLater)
    }
    const own = state.applications.filter((a) => a.challengeId === challenge.id)
    for (const application of own) {
      if (application.eligibility === 'NOT_SCREENED') continue
      const startup = STARTUPS.find((s) => s.id === application.startupId)
      if (!startup) continue
      const { results, eligibility } = screenApplication(application, startup, challenge)
      application.ruleResults = results
      application.eligibility = eligibility
      application.status = eligibility === 'NOT_SCREENED' ? 'SUBMITTED' : eligibility
    }
    if (challenge.selectedApplicationId) {
      const statuses = outcomeStatuses(rankApplications(own, state.scores))
      for (const application of own) {
        if (statuses[application.id]) application.status = statuses[application.id]
      }
    }
  }
  return state
}

// ---------------------------------------------------------------- storage

function load(): DemoState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const saved = JSON.parse(raw) as DemoState
      if (Array.isArray(saved.challenges) && Array.isArray(saved.timeline)) return saved
    }
  } catch {
    // Storage blocked or corrupted: start from the seed.
  }
  return seedState()
}

let state: DemoState = load()
const listeners = new Set<() => void>()

function commit(next: DemoState) {
  state = next
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // The demo still works for this visit when storage is unavailable.
  }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** The current demo state (outside React). */
export function getState(): DemoState {
  return state
}

/** The demo state; the component re-renders after every action. */
export function useDemoState(): DemoState {
  return useSyncExternalStore(subscribe, getState)
}

// ---------------------------------------------------------------- helpers

/** Runs a change on a copy of the state and saves it. */
function mutate<T>(change: (draft: DemoState) => T): T {
  const draft = structuredClone(state)
  const result = change(draft)
  commit(draft)
  return result
}

function need<T>(value: T | undefined | null, message: string): T {
  if (value === undefined || value === null) throw new Error(message)
  return value
}

function challengeOf(draft: DemoState, id: string): Challenge {
  return need(
    draft.challenges.find((c) => c.id === id),
    'This challenge no longer exists.',
  )
}

function requireStage(challenge: Challenge, ...stages: Stage[]) {
  if (challenge.outcome) throw new Error('This challenge is closed.')
  if (!stages.includes(challenge.stage)) {
    throw new Error('This step is not available at the current stage of the challenge.')
  }
}

function startupName(id: string): string {
  return STARTUPS.find((s) => s.id === id)?.name ?? 'Startup'
}

function log(draft: DemoState, challengeId: string, role: Role, action: string, detail = '') {
  const actor =
    role === 'startup'
      ? startupName(draft.startupId)
      : role === 'evaluator'
        ? (EVALUATORS.find((e) => e.id === draft.evaluatorId)?.name ?? ROLE_INFO.evaluator.person)
        : ROLE_INFO[role].person
  draft.timeline.push({
    id: `ev-u-${draft.timeline.length + 1}`,
    challengeId,
    on: today(),
    role,
    actor,
    action,
    detail,
  })
}

// ---------------------------------------------------------------- session-like settings

export function setActingStartup(startupId: string) {
  mutate((draft) => {
    draft.startupId = startupId
  })
}

export function setActingEvaluator(evaluatorId: string) {
  mutate((draft) => {
    draft.evaluatorId = evaluatorId
  })
}

/** Back to the original demo data. */
export function resetDemo() {
  commit(seedState())
}

// ---------------------------------------------------------------- 1. challenge identification

export type ChallengeInput = {
  title: string
  departmentId: string
  brief: ChallengeBrief
}

/** Checks a brief the way the innovation cell does before publishing. Empty list = ready. */
export function briefGaps(title: string, brief: ChallengeBrief): string[] {
  const gaps: string[] = []
  if (title.trim().length < 10)
    gaps.push('Give the challenge a clear title (at least 10 characters).')
  if (brief.problem.trim().length < 40)
    gaps.push('Describe the problem in at least a sentence or two.')
  if (!brief.users.trim()) gaps.push('Say who is affected and how many.')
  if (!brief.currentApproach.trim()) gaps.push('Say what is done today.')
  if (brief.kpis.length === 0) gaps.push('Add at least one measurable outcome (KPI).')
  for (const kpi of brief.kpis) {
    if (!kpi.name.trim() || !kpi.unit.trim()) gaps.push('Every KPI needs a name and a unit.')
    else if (kpi.baseline === kpi.target)
      gaps.push(`KPI "${kpi.name}": the target equals the baseline.`)
    else if ((kpi.better === 'lower') !== kpi.target < kpi.baseline)
      gaps.push(`KPI "${kpi.name}": the target moves the wrong way for "${kpi.better} is better".`)
  }
  if (!brief.dataAvailable.trim())
    gaps.push('List the data the department can share for the pilot.')
  if (!brief.outOfScope.trim()) gaps.push('Say what is out of scope.')
  if (!(brief.budgetCeilingLakh > 0)) gaps.push('Set a pilot budget ceiling.')
  if (!brief.pilotSites.trim()) gaps.push('Name the pilot sites.')
  if (!(brief.pilotWeeks >= 4)) gaps.push('A pilot should run at least 4 weeks.')
  return [...new Set(gaps)]
}

export function createChallenge(input: ChallengeInput): string {
  return mutate((draft) => {
    const department = need(
      DEPARTMENTS.find((d) => d.id === input.departmentId),
      'Choose a department.',
    )
    if (input.title.trim().length < 5) throw new Error('Give the challenge a title.')
    const year = today().slice(0, 4)
    const number = draft.challenges.length + 1
    const id = `ch-u-${number}`
    draft.challenges.push({
      id,
      code: `CH-${year}-${String(number).padStart(3, '0')}`,
      title: input.title.trim(),
      departmentId: department.id,
      sector: department.sector,
      district: department.district,
      stage: 'IDENTIFY',
      outcome: null,
      brief: input.brief,
      reviewStatus: 'DRAFT',
      createdOn: today(),
      publishedOn: null,
      closesOn: null,
      selectedApplicationId: null,
      invitedStartupIds: [],
      isSynthetic: true,
    })
    log(draft, id, 'department', 'Challenge drafted', `${input.brief.kpis.length} KPIs`)
    return id
  })
}

export function updateChallenge(
  challengeId: string,
  input: Pick<ChallengeInput, 'title' | 'brief'>,
) {
  mutate((draft) => {
    const challenge = challengeOf(draft, challengeId)
    requireStage(challenge, 'IDENTIFY')
    challenge.title = input.title.trim() || challenge.title
    challenge.brief = input.brief
    log(draft, challengeId, 'department', 'Brief edited')
  })
}

export function submitForReview(challengeId: string) {
  mutate((draft) => {
    const challenge = challengeOf(draft, challengeId)
    requireStage(challenge, 'IDENTIFY')
    challenge.reviewStatus = 'IN_REVIEW'
    log(draft, challengeId, 'department', 'Sent to the innovation cell for review')
  })
}

/** The cell publishes a reviewed brief as an open call. */
export function publishChallenge(challengeId: string, closesOn: string) {
  mutate((draft) => {
    const challenge = challengeOf(draft, challengeId)
    requireStage(challenge, 'IDENTIFY')
    const gaps = briefGaps(challenge.title, challenge.brief)
    if (gaps.length) throw new Error(`The brief is not ready to publish: ${gaps[0]}`)
    if (closesOn <= today()) throw new Error('The closing date must be in the future.')
    challenge.reviewStatus = 'PUBLISHED'
    challenge.publishedOn = today()
    challenge.closesOn = closesOn
    challenge.stage = 'DISCOVER'
    log(draft, challengeId, 'cell', 'Challenge published', `Open call until ${closesOn}`)
  })
}

// ---------------------------------------------------------------- 2. startup discovery

export function inviteStartup(challengeId: string, startupId: string) {
  mutate((draft) => {
    const challenge = challengeOf(draft, challengeId)
    requireStage(challenge, 'DISCOVER')
    if (challenge.invitedStartupIds.includes(startupId)) return
    challenge.invitedStartupIds.push(startupId)
    log(draft, challengeId, 'cell', 'Startup invited', startupName(startupId))
  })
}

export type ApplicationInput = {
  approach: string
  claimedResults: string
  quoteLakh: number
  weeks: number
}

export function submitApplication(challengeId: string, startupId: string, input: ApplicationInput) {
  mutate((draft) => {
    const challenge = challengeOf(draft, challengeId)
    requireStage(challenge, 'DISCOVER')
    if (
      draft.applications.some((a) => a.challengeId === challengeId && a.startupId === startupId)
    ) {
      throw new Error('This startup has already applied to this challenge.')
    }
    if (input.approach.trim().length < 30)
      throw new Error('Describe the approach in a sentence or two.')
    if (!(input.quoteLakh > 0)) throw new Error('Enter the pilot cost you quote.')
    if (!(input.weeks >= 4)) throw new Error('Enter the pilot duration in weeks (at least 4).')
    draft.applications.push({
      id: `app-${challengeId.replace(/^ch-/, '')}-${startupId.replace(/^s-/, '')}`,
      challengeId,
      startupId,
      submittedOn: today(),
      approach: input.approach.trim(),
      claimedResults: input.claimedResults.trim(),
      quoteLakh: input.quoteLakh,
      weeks: input.weeks,
      eligibility: 'NOT_SCREENED',
      ruleResults: [],
      status: 'SUBMITTED',
    })
    log(
      draft,
      challengeId,
      'startup',
      'Application submitted',
      `${startupName(startupId)}, quote ${fmtLakh(input.quoteLakh)}`,
    )
  })
}

/** The cell closes the call; screening can start. */
export function closeCall(challengeId: string) {
  mutate((draft) => {
    const challenge = challengeOf(draft, challengeId)
    requireStage(challenge, 'DISCOVER')
    const count = draft.applications.filter((a) => a.challengeId === challengeId).length
    if (count === 0) throw new Error('No applications yet: invite startups or keep the call open.')
    challenge.stage = 'SCREEN'
    log(draft, challengeId, 'cell', 'Call closed', `${count} applications received`)
  })
}

// ---------------------------------------------------------------- 3. eligibility screening

function moveOnIfScreened(draft: DemoState, challenge: Challenge) {
  const own = draft.applications.filter((a) => a.challengeId === challenge.id)
  const pending = own.some(
    (a) => a.eligibility === 'NOT_SCREENED' || a.eligibility === 'CLARIFICATION',
  )
  if (!pending && challenge.stage === 'SCREEN' && own.some((a) => a.eligibility === 'ELIGIBLE')) {
    challenge.stage = 'EVALUATE'
  }
}

/** Checks every application against the published rules and records a reason per rule. */
export function runScreening(challengeId: string) {
  mutate((draft) => {
    const challenge = challengeOf(draft, challengeId)
    requireStage(challenge, 'SCREEN')
    const own = draft.applications.filter((a) => a.challengeId === challengeId)
    for (const application of own) {
      const startup = need(
        STARTUPS.find((s) => s.id === application.startupId),
        'Unknown startup in an application.',
      )
      const { results, eligibility } = screenApplication(application, startup, challenge)
      application.ruleResults = results
      application.eligibility = eligibility
      application.status = eligibility === 'NOT_SCREENED' ? 'SUBMITTED' : eligibility
    }
    const count = (e: Application['eligibility']) => own.filter((a) => a.eligibility === e).length
    log(
      draft,
      challengeId,
      'cell',
      'Eligibility screening completed',
      `${count('ELIGIBLE')} eligible, ${count('INELIGIBLE')} ineligible, ${count('CLARIFICATION')} need clarification`,
    )
    moveOnIfScreened(draft, challenge)
  })
}

/**
 * Settles a clarification. accept = the startup confirmed it can deliver within the budget
 * ceiling (its quote is reduced to the ceiling); otherwise the application is ineligible.
 */
export function resolveClarification(applicationId: string, accept: boolean, note: string) {
  mutate((draft) => {
    const application = need(
      draft.applications.find((a) => a.id === applicationId),
      'This application no longer exists.',
    )
    if (application.eligibility !== 'CLARIFICATION') throw new Error('No clarification is pending.')
    const challenge = challengeOf(draft, application.challengeId)
    const rule = application.ruleResults.find((r) => r.status === 'CLARIFY')
    if (accept) {
      application.quoteLakh = Math.min(application.quoteLakh, challenge.brief.budgetCeilingLakh)
      application.eligibility = 'ELIGIBLE'
      application.status = 'ELIGIBLE'
      if (rule) {
        rule.status = 'PASS'
        rule.reason = `After clarification the startup confirmed a quote of Rs ${application.quoteLakh} lakh, within the ceiling.`
      }
    } else {
      application.eligibility = 'INELIGIBLE'
      application.status = 'INELIGIBLE'
      if (rule) {
        rule.status = 'FAIL'
        rule.reason = `The quote stays above the Rs ${challenge.brief.budgetCeilingLakh} lakh ceiling after clarification.`
      }
    }
    application.clarificationNote = note.trim()
    log(
      draft,
      challenge.id,
      'cell',
      accept ? 'Clarification accepted' : 'Clarification closed: ineligible',
      `${startupName(application.startupId)}${note.trim() ? `: ${note.trim()}` : ''}`,
    )
    moveOnIfScreened(draft, challenge)
  })
}

// ---------------------------------------------------------------- 4. expert evaluation

export function submitScore(
  applicationId: string,
  marks: Record<string, number>,
  comment: string,
  noConflict: boolean,
) {
  mutate((draft) => {
    const application = need(
      draft.applications.find((a) => a.id === applicationId),
      'This application no longer exists.',
    )
    const challenge = challengeOf(draft, application.challengeId)
    requireStage(challenge, 'EVALUATE')
    if (application.eligibility !== 'ELIGIBLE')
      throw new Error('Only eligible applications are scored.')
    if (!noConflict)
      throw new Error('Declare that you have no conflict of interest before scoring.')
    for (const criterion of RUBRIC) {
      const mark = marks[criterion.id]
      if (!(mark >= 1 && mark <= 5))
        throw new Error(`Give a mark from 1 to 5 for "${criterion.name}".`)
    }
    const evaluatorId = draft.evaluatorId
    const existing = draft.scores.find(
      (s) => s.applicationId === applicationId && s.evaluatorId === evaluatorId,
    )
    if (existing) {
      existing.marks = marks
      existing.comment = comment.trim()
      existing.submittedOn = today()
    } else {
      draft.scores.push({
        id: `sc-${applicationId}-${evaluatorId}`,
        applicationId,
        evaluatorId,
        marks,
        comment: comment.trim(),
        conflictDeclared: true,
        submittedOn: today(),
      })
    }
    log(
      draft,
      challenge.id,
      'evaluator',
      existing ? 'Score revised' : 'Score submitted',
      startupName(application.startupId),
    )
  })
}

/** The cell closes the evaluation: the ranking becomes final and the top application is selected. */
export function finaliseEvaluation(challengeId: string) {
  mutate((draft) => {
    const challenge = challengeOf(draft, challengeId)
    requireStage(challenge, 'EVALUATE')
    const own = draft.applications.filter((a) => a.challengeId === challengeId)
    if (!evaluationComplete(own, draft.scores)) {
      throw new Error(
        `Every eligible application needs scores from at least ${POLICY.minEvaluators} evaluators.`,
      )
    }
    const ranked = rankApplications(own, draft.scores)
    const statuses = outcomeStatuses(ranked)
    for (const application of own) {
      if (statuses[application.id]) application.status = statuses[application.id]
    }
    const winner = ranked.find((r) => statuses[r.application.id] === 'SELECTED')
    if (!winner) {
      throw new Error(
        `No application reached the shortlist score of ${POLICY.shortlistScore}. Stop the challenge.`,
      )
    }
    challenge.selectedApplicationId = winner.application.id
    challenge.stage = 'PILOT_DESIGN'
    log(
      draft,
      challengeId,
      'cell',
      'Expert evaluation completed',
      `${startupName(winner.application.startupId)} ranked first with ${winner.score} out of 100`,
    )
  })
}

/**
 * The department stops a challenge that cannot go on: no application is eligible, or none
 * reached the shortlist score. Only before a startup is selected; after that the scale-up
 * decision is the place to stop.
 */
export function stopChallenge(challengeId: string, reason: string) {
  mutate((draft) => {
    const challenge = challengeOf(draft, challengeId)
    if (challenge.outcome) throw new Error('This challenge is closed.')
    if (challenge.selectedApplicationId) {
      throw new Error('A startup is already selected. Record the decision on the pilot instead.')
    }
    for (const application of draft.applications) {
      if (application.challengeId === challengeId && application.eligibility === 'ELIGIBLE') {
        application.status = 'NOT_SELECTED'
      }
    }
    challenge.outcome = 'STOPPED'
    log(
      draft,
      challengeId,
      'department',
      'Challenge stopped',
      reason.trim() || 'No application could be taken forward.',
    )
  })
}

// ---------------------------------------------------------------- 5. sandbox / pilot design

export type PilotPlanInput = Omit<PilotPlan, 'challengeId' | 'applicationId' | 'approved'>

/** Gaps in a pilot plan; an empty list means it can be approved. */
export function pilotPlanGaps(plan: PilotPlanInput): string[] {
  const gaps: string[] = []
  if (plan.scope.trim().length < 20) gaps.push('Describe the pilot scope.')
  if (!plan.sites.trim()) gaps.push('Name the pilot sites.')
  if (!plan.startOn) gaps.push('Set the start date.')
  if (!(plan.weeks >= 4)) gaps.push('A pilot should run at least 4 weeks.')
  if (!plan.fallback.trim())
    gaps.push('Say how the service continues if the pilot fails (fallback).')
  if (plan.securityChecks.length < 6) gaps.push('Confirm at least 6 of the 8 cybersecurity checks.')
  if (plan.risks.length < 2) gaps.push('Record at least 2 risks with mitigations.')
  if (plan.risks.some((r) => !r.risk.trim() || !r.mitigation.trim()))
    gaps.push('Every risk needs a description and a mitigation.')
  if (!plan.goNoGo.trim()) gaps.push('Set the go / no-go check.')
  return gaps
}

export function savePilotPlan(challengeId: string, input: PilotPlanInput) {
  mutate((draft) => {
    const challenge = challengeOf(draft, challengeId)
    requireStage(challenge, 'PILOT_DESIGN')
    const applicationId = need(challenge.selectedApplicationId, 'No startup has been selected yet.')
    const plan: PilotPlan = { ...input, challengeId, applicationId, approved: false }
    draft.pilots = [...draft.pilots.filter((p) => p.challengeId !== challengeId), plan]
    log(
      draft,
      challengeId,
      'department',
      'Pilot plan saved',
      `${input.weeks} weeks, ${input.securityChecks.length} security checks, ${input.risks.length} risks`,
    )
  })
}

export function approvePilotPlan(challengeId: string) {
  mutate((draft) => {
    const challenge = challengeOf(draft, challengeId)
    requireStage(challenge, 'PILOT_DESIGN')
    const plan = need(
      draft.pilots.find((p) => p.challengeId === challengeId),
      'Save the pilot plan first.',
    )
    const gaps = pilotPlanGaps(plan)
    if (gaps.length) throw new Error(`The pilot plan is not complete: ${gaps[0]}`)
    plan.approved = true
    challenge.stage = 'CONTRACT'
    log(draft, challengeId, 'department', 'Pilot plan approved', plan.sites)
  })
}

// ---------------------------------------------------------------- 6. milestone-based contract

export type MilestoneInput = {
  title: string
  deliverable: string
  dueOn: string
  paymentPct: number
}

export type AgreementInput = { ip: IpOption; data: DataOption; milestones: MilestoneInput[] }

export function signAgreement(challengeId: string, input: AgreementInput) {
  mutate((draft) => {
    const challenge = challengeOf(draft, challengeId)
    requireStage(challenge, 'CONTRACT')
    const application = need(
      draft.applications.find((a) => a.id === challenge.selectedApplicationId),
      'No startup has been selected yet.',
    )
    if (input.milestones.length < 2) throw new Error('Add at least 2 milestones.')
    if (input.milestones.some((m) => !m.title.trim() || !m.deliverable.trim() || !m.dueOn)) {
      throw new Error('Every milestone needs a title, a deliverable and a due date.')
    }
    const total = input.milestones.reduce((sum, m) => sum + m.paymentPct, 0)
    if (Math.round(total) !== 100)
      throw new Error(`Milestone payments add up to ${total}%; they must add up to 100%.`)
    const value = application.quoteLakh
    draft.agreements = [
      ...draft.agreements.filter((a) => a.challengeId !== challengeId),
      {
        challengeId,
        applicationId: application.id,
        valueLakh: value,
        ip: input.ip,
        data: input.data,
        signedOn: today(),
        templateVersion: 'Pilot agreement v1.0 (prototype draft)',
      },
    ]
    draft.milestones = [
      ...draft.milestones.filter((m) => m.challengeId !== challengeId),
      ...input.milestones.map((m, index): Milestone => ({
        id: `ms-${challengeId.replace(/^ch-/, '')}-${index + 1}`,
        challengeId,
        order: index + 1,
        title: m.title.trim(),
        deliverable: m.deliverable.trim(),
        dueOn: m.dueOn,
        paymentPct: m.paymentPct,
        amountLakh: Math.round(value * m.paymentPct) / 100,
        status: 'PLANNED',
        submittedOn: null,
        acceptedOn: null,
        payment: 'NOT_DUE',
        requestedOn: null,
        approvedOn: null,
        paidOn: null,
      })),
    ]
    challenge.stage = 'MEASURE'
    log(
      draft,
      challengeId,
      'department',
      'Pilot agreement signed',
      `${fmtLakh(value)} in ${input.milestones.length} milestones`,
    )
  })
}

// ---------------------------------------------------------------- 7. pilot, performance and payment

function milestoneOf(draft: DemoState, id: string): Milestone {
  return need(
    draft.milestones.find((m) => m.id === id),
    'This milestone no longer exists.',
  )
}

/** The startup reports a milestone as delivered. Milestones are delivered in order. */
export function submitMilestone(milestoneId: string) {
  mutate((draft) => {
    const milestone = milestoneOf(draft, milestoneId)
    const challenge = challengeOf(draft, milestone.challengeId)
    requireStage(challenge, 'MEASURE')
    if (milestone.status !== 'PLANNED')
      throw new Error('This milestone has already been submitted.')
    const earlier = draft.milestones.find(
      (m) =>
        m.challengeId === milestone.challengeId &&
        m.order < milestone.order &&
        m.status === 'PLANNED',
    )
    if (earlier) throw new Error(`Submit milestone ${earlier.order} first.`)
    milestone.status = 'SUBMITTED'
    milestone.submittedOn = today()
    log(draft, challenge.id, 'startup', `Milestone ${milestone.order} submitted`, milestone.title)
  })
}

/** The department accepts a delivered milestone; the payment request is raised automatically. */
export function acceptMilestone(milestoneId: string) {
  mutate((draft) => {
    const milestone = milestoneOf(draft, milestoneId)
    const challenge = challengeOf(draft, milestone.challengeId)
    if (milestone.status !== 'SUBMITTED')
      throw new Error('Only a submitted milestone can be accepted.')
    milestone.status = 'ACCEPTED'
    milestone.acceptedOn = today()
    milestone.payment = 'REQUESTED'
    milestone.requestedOn = today()
    log(
      draft,
      challenge.id,
      'department',
      `Milestone ${milestone.order} accepted`,
      `Payment request of ${fmtLakh(milestone.amountLakh)} raised automatically`,
    )
  })
}

/** The department sends a milestone back with a reason. */
export function returnMilestone(milestoneId: string, reason: string) {
  mutate((draft) => {
    const milestone = milestoneOf(draft, milestoneId)
    if (milestone.status !== 'SUBMITTED')
      throw new Error('Only a submitted milestone can be returned.')
    if (!reason.trim()) throw new Error('Give the reason for returning the milestone.')
    milestone.status = 'PLANNED'
    milestone.submittedOn = null
    log(
      draft,
      milestone.challengeId,
      'department',
      `Milestone ${milestone.order} returned`,
      reason.trim(),
    )
  })
}

export function approvePayment(milestoneId: string) {
  mutate((draft) => {
    const milestone = milestoneOf(draft, milestoneId)
    if (milestone.payment !== 'REQUESTED')
      throw new Error('There is no payment request to approve.')
    milestone.payment = 'APPROVED'
    milestone.approvedOn = today()
    log(
      draft,
      milestone.challengeId,
      'finance',
      `Milestone ${milestone.order} payment approved`,
      fmtLakh(milestone.amountLakh),
    )
  })
}

export function releasePayment(milestoneId: string) {
  mutate((draft) => {
    const milestone = milestoneOf(draft, milestoneId)
    if (milestone.payment !== 'APPROVED')
      throw new Error('Approve the payment before releasing it.')
    milestone.payment = 'PAID'
    milestone.paidOn = today()
    log(
      draft,
      milestone.challengeId,
      'finance',
      `Milestone ${milestone.order} paid`,
      fmtLakh(milestone.amountLakh),
    )
  })
}

/** Records the KPI readings of one pilot week (replaces earlier readings of that week). */
export function recordMeasurement(
  challengeId: string,
  week: number,
  values: Record<string, number>,
  by: 'department' | 'startup' = 'department',
) {
  mutate((draft) => {
    const challenge = challengeOf(draft, challengeId)
    requireStage(challenge, 'MEASURE')
    if (!(week >= 1)) throw new Error('Enter the pilot week number.')
    const entries = Object.entries(values).filter(([, value]) => Number.isFinite(value))
    if (entries.length === 0) throw new Error('Enter at least one KPI reading.')
    draft.measurements = draft.measurements.filter(
      (m) =>
        !(
          m.challengeId === challengeId &&
          m.week === week &&
          entries.some(([kpiId]) => kpiId === m.kpiId)
        ),
    )
    for (const [kpiId, value] of entries)
      draft.measurements.push({ challengeId, kpiId, week, value })
    log(draft, challengeId, by, `KPI readings recorded for week ${week}`)
  })
}

/** The department closes the pilot and hands it to the independent validator. */
export function closePilot(challengeId: string) {
  mutate((draft) => {
    const challenge = challengeOf(draft, challengeId)
    requireStage(challenge, 'MEASURE')
    const own = draft.milestones.filter((m) => m.challengeId === challengeId)
    if (own.some((m) => m.status !== 'ACCEPTED'))
      throw new Error('All milestones must be accepted before the pilot is closed.')
    if (!draft.measurements.some((m) => m.challengeId === challengeId))
      throw new Error('Record KPI readings before closing the pilot.')
    challenge.stage = 'VALIDATE'
    log(draft, challengeId, 'department', 'Pilot closed', 'Sent for independent validation')
  })
}

// ---------------------------------------------------------------- 8. independent validation

export type ValidationInput = {
  method: string
  confirmed: Record<string, number>
  findings: string
  verdict: ValidationVerdict
}

export function submitValidation(challengeId: string, input: ValidationInput) {
  mutate((draft) => {
    const challenge = challengeOf(draft, challengeId)
    requireStage(challenge, 'VALIDATE')
    if (input.method.trim().length < 20) throw new Error('Describe how the results were checked.')
    if (input.findings.trim().length < 20) throw new Error('Write the findings.')
    for (const kpi of challenge.brief.kpis) {
      if (!Number.isFinite(input.confirmed[kpi.id]))
        throw new Error(`Enter the confirmed value for "${kpi.name}".`)
    }
    draft.validations = [
      ...draft.validations.filter((v) => v.challengeId !== challengeId),
      {
        challengeId,
        validator: ROLE_INFO.validator.person,
        organisation: 'Example third-party assessor (demo)',
        method: input.method.trim(),
        confirmed: input.confirmed,
        findings: input.findings.trim(),
        verdict: input.verdict,
        reportedOn: today(),
      },
    ]
    challenge.stage = 'DECIDE'
    log(
      draft,
      challengeId,
      'validator',
      'Validation report submitted',
      input.verdict.replace(/_/g, ' ').toLowerCase(),
    )
  })
}

// ---------------------------------------------------------------- 9-10. decision and scale-up

export type DecisionInput = {
  decision: Decision
  rationale: string
  pathwayId: string | null
  plan: ScalePlanItem[]
}

export function recordDecision(challengeId: string, input: DecisionInput) {
  mutate((draft) => {
    const challenge = challengeOf(draft, challengeId)
    requireStage(challenge, 'DECIDE')
    need(
      draft.validations.find((v) => v.challengeId === challengeId),
      'The independent validation report is needed before a decision.',
    )
    if (input.rationale.trim().length < 20) throw new Error('Write the reasons for the decision.')
    let pathwayName = ''
    if (input.decision === 'SCALE') {
      const pathway = need(
        PATHWAYS.find((p) => p.id === input.pathwayId),
        'Choose the procurement pathway for the scale-up.',
      )
      pathwayName = pathway.name
      if (input.plan.length === 0)
        throw new Error('Add at least one rollout step to the scale-up plan.')
      if (input.plan.some((p) => !p.where.trim() || !p.when.trim()))
        throw new Error('Every rollout step needs a place and a time.')
    }
    draft.decisions = [
      ...draft.decisions.filter((d) => d.challengeId !== challengeId),
      {
        challengeId,
        decision: input.decision,
        rationale: input.rationale.trim(),
        pathwayId: input.decision === 'SCALE' ? input.pathwayId : null,
        plan: input.decision === 'SCALE' ? input.plan : [],
        decidedBy: ROLE_INFO.department.person,
        decidedOn: today(),
      },
    ]
    if (input.decision === 'SCALE') {
      challenge.stage = 'SCALE'
      challenge.outcome = 'SCALED'
    } else {
      challenge.outcome = input.decision === 'EXTEND' ? 'EXTENDED' : 'STOPPED'
    }
    log(
      draft,
      challengeId,
      'department',
      `Decision recorded: ${input.decision.toLowerCase()}`,
      input.decision === 'SCALE'
        ? `${pathwayName}; ${input.plan.length} rollouts planned`
        : input.rationale.trim().slice(0, 120),
    )
  })
}
