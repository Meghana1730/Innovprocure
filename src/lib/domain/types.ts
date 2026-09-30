// InnovProcure domain model: the end-to-end innovation-procurement pathway of SIH26136.
//
//   challenge identification -> startup discovery -> eligibility screening -> expert evaluation
//   -> sandbox / pilot design -> milestone-based contracting -> performance measurement
//   (+ milestone payments) -> independent validation -> scale-up decision -> procurement & scale
//
// Everything in the demo is synthetic: departments, startups, people and numbers are fictional.

export type Role = 'department' | 'cell' | 'startup' | 'evaluator' | 'finance' | 'validator'

/** The ten stages of the pathway, in order. */
export const STAGES = [
  'IDENTIFY',
  'DISCOVER',
  'SCREEN',
  'EVALUATE',
  'PILOT_DESIGN',
  'CONTRACT',
  'MEASURE',
  'VALIDATE',
  'DECIDE',
  'SCALE',
] as const
export type Stage = (typeof STAGES)[number]

/** How a challenge ended, once it left the pathway. */
export type Outcome = 'SCALED' | 'EXTENDED' | 'STOPPED' | null

export type Sector =
  'WATER' | 'HEALTH' | 'EDUCATION' | 'WASTE' | 'AGRICULTURE' | 'TRANSPORT' | 'GOVERNANCE' | 'ENERGY'

export type Department = {
  id: string
  name: string
  short: string
  district: string
  sector: Sector
}

export type Kpi = {
  id: string
  name: string
  unit: string
  baseline: number
  target: number
  /** 'lower' = smaller is better (e.g. waiting time), 'higher' = larger is better */
  better: 'lower' | 'higher'
}

export type ChallengeBrief = {
  /** The problem in the department's own words: what hurts today, for whom. */
  problem: string
  /** Who is affected and how many. */
  users: string
  /** What the department does today and why it is not enough. */
  currentApproach: string
  /** Measurable outcomes: the success criteria of the pilot. */
  kpis: Kpi[]
  constraints: string
  dataAvailable: string
  outOfScope: string
  /** Pilot budget ceiling in Rs lakh. */
  budgetCeilingLakh: number
  pilotSites: string
  pilotWeeks: number
  ipPreference: IpOption
}

export type Challenge = {
  id: string
  code: string
  title: string
  departmentId: string
  sector: Sector
  district: string
  stage: Stage
  outcome: Outcome
  brief: ChallengeBrief
  /** Draft brief reviewed by the innovation cell before publishing. */
  reviewStatus: 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED'
  createdOn: string
  publishedOn: string | null
  /** Last day for applications. */
  closesOn: string | null
  selectedApplicationId: string | null
  invitedStartupIds: string[]
  isSynthetic: true
}

export type StartupStage = 'PROTOTYPE' | 'EARLY_REVENUE' | 'GROWTH'

export type Startup = {
  id: string
  name: string
  city: string
  district: string
  sectors: Sector[]
  technologies: string[]
  summary: string
  foundedYear: number
  entityType: 'Private Limited' | 'LLP' | 'Partnership'
  /** Recognised under the national startup recognition scheme (demo flag). */
  recognised: boolean
  /** Demo recognition reference; not a real certificate number. */
  recognitionRef: string | null
  annualTurnoverLakh: number
  teamSize: number
  stage: StartupStage
  /** Technology readiness level 1-9 (self-declared in the demo). */
  trl: number
  womenLed: boolean
  priorGovernmentWork: boolean
  debarred: boolean
  isSynthetic: true
}

export type RuleResult = {
  ruleId: string
  status: 'PASS' | 'FAIL' | 'RELAXED' | 'CLARIFY'
  reason: string
}

export type EligibilityStatus = 'NOT_SCREENED' | 'ELIGIBLE' | 'INELIGIBLE' | 'CLARIFICATION'

export type ApplicationStatus =
  | 'SUBMITTED'
  | 'ELIGIBLE'
  | 'INELIGIBLE'
  | 'CLARIFICATION'
  | 'SHORTLISTED'
  | 'SELECTED'
  | 'NOT_SELECTED'

export type Application = {
  id: string
  challengeId: string
  startupId: string
  submittedOn: string
  approach: string
  claimedResults: string
  /** Pilot cost quoted by the startup in Rs lakh. */
  quoteLakh: number
  weeks: number
  eligibility: EligibilityStatus
  ruleResults: RuleResult[]
  status: ApplicationStatus
  /** How a clarification was settled, when one was asked for. */
  clarificationNote?: string
}

export type Evaluator = {
  id: string
  name: string
  expertise: string
  organisation: string
}

export type Score = {
  id: string
  applicationId: string
  evaluatorId: string
  /** criterion id -> score 1..5 */
  marks: Record<string, number>
  comment: string
  /** The evaluator declared no conflict of interest with this startup. */
  conflictDeclared: boolean
  submittedOn: string
}

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH'

export type Risk = {
  id: string
  risk: string
  likelihood: RiskLevel
  impact: RiskLevel
  mitigation: string
  owner: string
}

export type DataAccess = 'SYNTHETIC_ONLY' | 'ANONYMISED' | 'LIVE_LIMITED'

export type PilotPlan = {
  challengeId: string
  applicationId: string
  scope: string
  sites: string
  startOn: string
  weeks: number
  /** Sandbox conditions: what the startup may touch during the pilot. */
  dataAccess: DataAccess
  userLimit: string
  fallback: string
  /** Ids of cybersecurity checklist items confirmed for this pilot. */
  securityChecks: string[]
  risks: Risk[]
  goNoGo: string
  approved: boolean
}

export type IpOption = 'STARTUP_OWNS_GOVT_LICENCE' | 'JOINT' | 'GOVT_OWNS'
export type DataOption = 'GOVT_OWNS_DATA' | 'SHARED_ANONYMISED'

export type MilestoneStatus = 'PLANNED' | 'SUBMITTED' | 'ACCEPTED'
export type PaymentStatus = 'NOT_DUE' | 'REQUESTED' | 'APPROVED' | 'PAID'

export type Milestone = {
  id: string
  challengeId: string
  order: number
  title: string
  deliverable: string
  dueOn: string
  /** Share of the contract value paid on acceptance. */
  paymentPct: number
  amountLakh: number
  status: MilestoneStatus
  submittedOn: string | null
  acceptedOn: string | null
  payment: PaymentStatus
  requestedOn: string | null
  approvedOn: string | null
  paidOn: string | null
}

export type Agreement = {
  challengeId: string
  applicationId: string
  valueLakh: number
  ip: IpOption
  data: DataOption
  signedOn: string | null
  templateVersion: string
}

export type Measurement = {
  challengeId: string
  kpiId: string
  /** Week number of the pilot (1 = first week). */
  week: number
  value: number
}

export type ValidationVerdict = 'VALIDATED' | 'PARTLY_VALIDATED' | 'NOT_VALIDATED'

export type ValidationReport = {
  challengeId: string
  validator: string
  organisation: string
  method: string
  /** kpi id -> the value the validator confirmed independently */
  confirmed: Record<string, number>
  findings: string
  verdict: ValidationVerdict
  reportedOn: string
}

export type Decision = 'SCALE' | 'EXTEND' | 'STOP'

export type ScalePlanItem = { where: string; when: string; valueLakh: number }

export type ScaleDecision = {
  challengeId: string
  decision: Decision
  rationale: string
  /** Procurement pathway template chosen for scale-up. */
  pathwayId: string | null
  plan: ScalePlanItem[]
  decidedBy: string
  decidedOn: string
}

export type TimelineEvent = {
  id: string
  challengeId: string
  on: string
  role: Role
  actor: string
  action: string
  detail: string
}

export type TemplateCategory =
  | 'PROBLEM_STATEMENT'
  | 'EVALUATION'
  | 'PILOT_AGREEMENT'
  | 'DATA_IP'
  | 'CYBERSECURITY'
  | 'RISK'
  | 'PATHWAY'

export type Template = {
  id: string
  category: TemplateCategory
  title: string
  version: string
  purpose: string
  /** Where in the pathway the template is used. */
  usedAt: Stage
  sections: { heading: string; body: string[] }[]
}

/** The whole mutable demo state (kept in this browser). */
export type DemoState = {
  /** The startup the presenter acts as on the startup dashboard. */
  startupId: string
  /** The evaluator the presenter acts as on the expert dashboard. */
  evaluatorId: string
  challenges: Challenge[]
  applications: Application[]
  scores: Score[]
  pilots: PilotPlan[]
  agreements: Agreement[]
  milestones: Milestone[]
  measurements: Measurement[]
  validations: ValidationReport[]
  decisions: ScaleDecision[]
  timeline: TimelineEvent[]
}
