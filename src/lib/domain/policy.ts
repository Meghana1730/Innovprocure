// Policy settings of the mechanism: eligibility rules, evaluation rubric, security checklist,
// procurement pathways and payment target.
//
// These are CONFIGURABLE DEMO DEFAULTS for the prototype. They are not legal advice and do not
// replace the department's own financial and procurement rules. Where a default follows a
// published rule or scheme, `basis` says which and SOURCES lists where it can be checked.

import type { DataAccess, DataOption, IpOption, Role, Sector, Stage } from '@/lib/domain/types'

export const POLICY = {
  /** A startup must be this young (years since incorporation). */
  maxAgeYears: 10,
  /** Annual turnover ceiling for a startup, in Rs crore. */
  maxTurnoverCrore: 200,
  /** Target number of days from a payment request to payment. */
  paymentTargetDays: 30,
  /** Score (out of 100) an application needs to be shortlisted. */
  shortlistScore: 60,
  /** Evaluators needed before a ranking is final. */
  minEvaluators: 2,
} as const

export type EligibilityRule = {
  id: string
  label: string
  detail: string
  /** mandatory = must pass; relaxed = a usual tender condition that is NOT applied to startups */
  kind: 'mandatory' | 'relaxed'
  basis: string
}

export const ELIGIBILITY_RULES: EligibilityRule[] = [
  {
    id: 'recognised',
    label: 'Recognised startup',
    detail: 'A valid startup recognition reference is on file.',
    kind: 'mandatory',
    basis: 'Startup recognition by DPIIT under the Startup India programme',
  },
  {
    id: 'age',
    label: `Incorporated within the last ${POLICY.maxAgeYears} years`,
    detail: 'Counted from the year of incorporation to the application date.',
    kind: 'mandatory',
    basis: 'Startup definition: DPIIT notification G.S.R. 108(E) of 4 February 2026',
  },
  {
    id: 'turnover-ceiling',
    label: `Annual turnover not above Rs ${POLICY.maxTurnoverCrore} crore`,
    detail: 'Turnover in any financial year since incorporation.',
    kind: 'mandatory',
    basis: 'Startup definition: DPIIT notification G.S.R. 108(E) of 4 February 2026',
  },
  {
    id: 'not-debarred',
    label: 'Not debarred or blacklisted',
    detail: 'Self-declaration by the startup. No debarment list is connected in this prototype.',
    kind: 'mandatory',
    basis: 'Standard procurement integrity condition',
  },
  {
    id: 'within-budget',
    label: 'Quote within the pilot budget ceiling',
    detail: 'The quoted pilot cost does not exceed the ceiling published in the challenge.',
    kind: 'mandatory',
    basis: 'Challenge terms',
  },
  {
    id: 'prior-turnover',
    label: 'Minimum prior turnover',
    detail: 'Not required from startups, so young firms are not excluded.',
    kind: 'relaxed',
    basis:
      'General Financial Rules 2017, Rule 173(i): may be relaxed for startups that meet quality and technical specifications',
  },
  {
    id: 'prior-experience',
    label: 'Prior experience of similar government work',
    detail: 'Not required from startups; quality is judged by expert evaluation and the pilot.',
    kind: 'relaxed',
    basis:
      'General Financial Rules 2017, Rule 173(i): may be relaxed for startups that meet quality and technical specifications',
  },
  {
    id: 'bid-security',
    label: 'Earnest money deposit (bid security)',
    detail: 'Not required from recognised startups, so applying costs nothing.',
    kind: 'relaxed',
    basis:
      'General Financial Rules 2017, Rule 170(i): recognised startups are exempt from bid security',
  },
]

export type Criterion = { id: string; name: string; weight: number; guidance: string }

/** Evaluation rubric: weights add up to 100; each criterion is marked 1-5. */
export const RUBRIC: Criterion[] = [
  {
    id: 'impact',
    name: 'Impact on the problem',
    weight: 25,
    guidance: 'How far does the proposal move the challenge KPIs from baseline to target?',
  },
  {
    id: 'feasibility',
    name: 'Technical feasibility and readiness',
    weight: 20,
    guidance: 'Is the solution ready to pilot in the stated time (technology readiness, evidence)?',
  },
  {
    id: 'innovation',
    name: 'Innovation',
    weight: 15,
    guidance: 'Is it meaningfully better than what the department can buy off the shelf?',
  },
  {
    id: 'value',
    name: 'Cost and value for money',
    weight: 15,
    guidance: 'Is the pilot cost reasonable for the expected result, and the cost at scale clear?',
  },
  {
    id: 'scalability',
    name: 'Scalability and sustainability',
    weight: 15,
    guidance: 'Can it be rolled out to other sites or departments and be maintained?',
  },
  {
    id: 'team',
    name: 'Team capability',
    weight: 10,
    guidance: 'Does the team have the skills and capacity to deliver the pilot?',
  },
]

export type SecurityCheck = { id: string; label: string; detail: string }

export const SECURITY_CHECKS: SecurityCheck[] = [
  {
    id: 'hosting',
    label: 'Data hosted in India',
    detail: 'Pilot data is stored and processed on servers located in India.',
  },
  {
    id: 'access',
    label: 'Access control',
    detail: 'Named user accounts, role-based access and multi-factor sign-in for administrators.',
  },
  { id: 'encryption', label: 'Encryption', detail: 'Data is encrypted in transit and at rest.' },
  {
    id: 'minimise',
    label: 'Personal data minimised',
    detail:
      'Only the personal data needed for the pilot is collected, with notice and consent where required.',
  },
  {
    id: 'testing',
    label: 'Security testing before go-live',
    detail:
      'A vulnerability assessment is done and high-risk findings are fixed before the pilot starts.',
  },
  {
    id: 'incident',
    label: 'Incident reporting',
    detail: 'Security incidents are reported to the department without delay and logged.',
  },
  {
    id: 'logs',
    label: 'Audit logs',
    detail: 'Access and changes are logged and kept for the pilot period.',
  },
  {
    id: 'exit',
    label: 'Exit and deletion',
    detail:
      'At the end of the pilot, data is returned to the department and deleted from the startup systems.',
  },
]

export type Pathway = {
  id: string
  name: string
  fitsWhen: string
  steps: string[]
  caution: string
}

/** Ways a validated pilot can move into compliant procurement at scale. */
export const PATHWAYS: Pathway[] = [
  {
    id: 'marketplace',
    name: 'Government e-marketplace purchase',
    fitsWhen:
      'The validated solution is (or can be) listed as a product or service on the government e-marketplace.',
    steps: [
      'Startup lists the solution on the e-marketplace',
      'Department raises the order or bid using the pilot-validated specification',
      'Order, delivery and payment are tracked on the marketplace',
    ],
    caution:
      'Use the purchase mode and value limits currently allowed by the marketplace and the department rules.',
  },
  {
    id: 'open-tender',
    name: 'Open competitive tender on validated outcomes',
    fitsWhen: 'Several suppliers could meet the outcome; the pilot proved what to ask for.',
    steps: [
      'Write the tender around the outcomes and KPIs validated in the pilot',
      'Apply the startup relaxations on prior turnover and experience',
      'Evaluate on quality and cost; award and contract with milestones',
    ],
    caution:
      'Pilot participation must not give an unfair advantage: publish the pilot results and specifications to all bidders.',
  },
  {
    id: 'limited-tender',
    name: 'Limited tender among validated solutions',
    fitsWhen: 'A small number of solutions were piloted and validated for the same challenge.',
    steps: [
      'Invite the validated suppliers to quote for the scale-up scope',
      'Compare on the validated KPIs and total cost',
      'Record reasons and award',
    ],
    caution:
      'Only where the department rules allow a limited tender for the value involved; record the justification.',
  },
  {
    id: 'single-source',
    name: 'Single-source procurement with justification',
    fitsWhen: 'Only one solution met the validated outcomes and no equivalent exists.',
    steps: [
      'Record the independent validation and why no alternative meets the need',
      'Obtain the competent authority approval',
      'Negotiate price against the pilot cost benchmarks and contract with milestones',
    ],
    caution:
      'Exceptional route: needs a written justification and approval under the applicable financial rules.',
  },
  {
    id: 'framework',
    name: 'Rate contract for other departments and districts',
    fitsWhen:
      'Other departments or districts have the same problem and want the validated solution.',
    steps: [
      'Fix rates and service levels from the scale-up award',
      'Let other departments or districts call off against the rate contract',
      'Track outcomes per site with the same KPIs',
    ],
    caution: 'Rates and validity must follow the rate-contract rules of the procuring authority.',
  },
]

export const STAGE_INFO: Record<
  Stage,
  { label: string; short: string; owner: Role; what: string }
> = {
  IDENTIFY: {
    label: 'Challenge identification',
    short: 'Identify',
    owner: 'department',
    what: 'The department writes an outcome-based problem statement; the innovation cell reviews and publishes it.',
  },
  DISCOVER: {
    label: 'Startup discovery',
    short: 'Discover',
    owner: 'cell',
    what: 'The open call reaches matching startups; applications come in.',
  },
  SCREEN: {
    label: 'Eligibility screening',
    short: 'Screen',
    owner: 'cell',
    what: 'Every application is checked against published rules, with a reason for each result.',
  },
  EVALUATE: {
    label: 'Expert evaluation',
    short: 'Evaluate',
    owner: 'evaluator',
    what: 'Independent experts score eligible applications against a weighted rubric.',
  },
  PILOT_DESIGN: {
    label: 'Sandbox / pilot design',
    short: 'Pilot design',
    owner: 'department',
    what: 'Scope, sites, KPIs, data access, security checks and risks are agreed before work starts.',
  },
  CONTRACT: {
    label: 'Milestone-based contract',
    short: 'Contract',
    owner: 'department',
    what: 'A pilot agreement with data and IP terms and payments tied to milestones.',
  },
  MEASURE: {
    label: 'Pilot and performance',
    short: 'Pilot',
    owner: 'startup',
    what: 'The startup delivers milestones; KPIs are measured against baseline and target; payments follow acceptance.',
  },
  VALIDATE: {
    label: 'Independent validation',
    short: 'Validate',
    owner: 'validator',
    what: 'A third party confirms the measured results.',
  },
  DECIDE: {
    label: 'Scale-up decision',
    short: 'Decide',
    owner: 'department',
    what: 'Evidence from the pilot decides: scale, extend or stop.',
  },
  SCALE: {
    label: 'Procurement and scale-up',
    short: 'Scale',
    owner: 'department',
    what: 'The validated solution is procured through a compliant pathway and rolled out.',
  },
}

export const ROLE_INFO: Record<Role, { label: string; who: string; person: string }> = {
  department: {
    label: 'Department officer',
    who: 'Owns the problem, the pilot and the scale-up decision',
    person: 'Demo Department Officer',
  },
  cell: {
    label: 'Innovation cell',
    who: 'Runs the pathway: publishing, screening, panels, templates',
    person: 'Demo Innovation Cell Officer',
  },
  startup: {
    label: 'Startup',
    who: 'Applies, delivers milestones, requests payments',
    person: 'Demo Startup Founder',
  },
  evaluator: {
    label: 'Expert evaluator',
    who: 'Scores applications against the rubric',
    person: 'Demo Expert Evaluator',
  },
  finance: {
    label: 'Finance officer',
    who: 'Approves and releases milestone payments',
    person: 'Demo Finance Officer',
  },
  validator: {
    label: 'Independent validator',
    who: 'Confirms pilot results',
    person: 'Demo Independent Validator',
  },
}

export const SECTOR_LABELS: Record<Sector, string> = {
  WATER: 'Water supply',
  HEALTH: 'Health',
  EDUCATION: 'Education',
  WASTE: 'Waste management',
  AGRICULTURE: 'Agriculture',
  TRANSPORT: 'Transport',
  GOVERNANCE: 'Citizen services',
  ENERGY: 'Energy',
}

export const IP_LABELS: Record<IpOption, string> = {
  STARTUP_OWNS_GOVT_LICENCE: 'Startup keeps the IP; government gets a licence to use',
  JOINT: 'Jointly owned IP',
  GOVT_OWNS: 'Government owns the IP created in the pilot',
}

export const DATA_LABELS: Record<DataOption, string> = {
  GOVT_OWNS_DATA: 'Government owns all pilot data; startup may use it only for the pilot',
  SHARED_ANONYMISED:
    'Government owns the data; startup may keep anonymised data to improve the product',
}

export const DATA_ACCESS_LABELS: Record<DataAccess, string> = {
  SYNTHETIC_ONLY: 'Synthetic or sample data only',
  ANONYMISED: 'Anonymised real data',
  LIVE_LIMITED: 'Live data, limited to the pilot sites',
}

/**
 * Published sources behind the defaults above, each checked against the linked document on
 * 30 September 2026. The General Financial Rules apply to central government bodies: for a
 * Maharashtra department they are a national reference, and the state's own rules govern.
 */
export const SOURCES: { topic: string; note: string; url: string }[] = [
  {
    topic: 'Who counts as a startup',
    note: 'DPIIT notification G.S.R. 108(E) of 4 February 2026: within 10 years of incorporation and turnover not above Rs 200 crore in any financial year (Deep Tech startups: 20 years and Rs 300 crore).',
    url: 'https://www.startupindia.gov.in/content/dam/invest-india/Templates/public/Gazette_060226.pdf',
  },
  {
    topic: 'No prior turnover or prior experience condition',
    note: 'General Financial Rules 2017, Rule 173(i): the condition of prior turnover and prior experience may be relaxed for startups, subject to quality and technical specifications.',
    url: 'https://doe.gov.in/files/circulars_document/GFRupdatedupto31012026.pdf',
  },
  {
    topic: 'No earnest money deposit',
    note: 'General Financial Rules 2017, Rule 170(i): startups recognised by DPIIT are exempt from bid security. Performance security still applies.',
    url: 'https://doe.gov.in/files/circulars_document/GFRupdatedupto31012026.pdf',
  },
  {
    topic: 'Where the General Financial Rules apply',
    note: 'Rule 1: the rules apply to central government ministries, departments and their attached and subordinate bodies. They have no separate mode for innovation pilots, so the pathways in this prototype are templates, not statements of law.',
    url: 'https://doe.gov.in/files/circulars_document/GFRupdatedupto31012026.pdf',
  },
  {
    topic: 'Startups on the government e-marketplace',
    note: 'Startup India describes GeM Startup Runway, which lets recognised startups offer innovative products to government buyers without prior experience, prior turnover or earnest money conditions.',
    url: 'https://www.startupindia.gov.in/content/sih/en/public_procurement.html',
  },
  {
    topic: 'Pilot work orders in Maharashtra',
    note: 'Maharashtra Startup, Entrepreneurship and Innovation Policy 2025: each year 50 startups selected through Maharashtra Startup Week get direct work orders of up to Rs 25 lakh to pilot in government departments. The pilot ceilings in this demo stay within that amount.',
    url: 'https://msins.in/assets/Maharashtra-Startup-Entrepreneurship-_-Innovation-Policy-2025-C5OBUYrd.pdf',
  },
  {
    topic: 'The nodal agency',
    note: 'The same policy names the Maharashtra State Innovation Society, under the Department of Skills, Employment, Entrepreneurship and Innovation, as the apex agency for startups and innovation in the state.',
    url: 'https://msins.in/assets/Maharashtra-Startup-Entrepreneurship-_-Innovation-Policy-2025-C5OBUYrd.pdf',
  },
  {
    topic: 'Paying suppliers on time',
    note: 'The MSMED Act 2006 requires payment to micro and small enterprises within 45 days of acceptance, with interest on delay. The 30-day target in this prototype is a stricter default chosen by the team, not a legal limit.',
    url: 'https://samadhaan.msme.gov.in/MyMsme/MSEFC/MSEFC_Welcome.aspx',
  },
  {
    topic: 'Milestone-based payments: a precedent',
    note: 'iDEX (Innovations for Defence Excellence) releases its grant in six milestones of 10, 20, 20, 20, 20 and 10 percent. The intellectual property stays with the startup.',
    url: 'https://idex.gov.in/faq',
  },
  {
    topic: 'Cyber incident reporting',
    note: 'CERT-In directions of 28 April 2022 require listed cyber incidents to be reported within 6 hours and logs to be kept for 180 days. The cybersecurity checklist asks for incident reporting and audit logs.',
    url: 'https://www.cert-in.org.in/PDF/CERT-In_Directions_70B_28.04.2022.pdf',
  },
  {
    topic: 'Personal data',
    note: 'The Digital Personal Data Protection Act, 2023 (No. 22 of 2023) requires reasonable security safeguards for personal data. The checklist asks pilots to collect only the personal data they need.',
    url: 'https://www.meity.gov.in/static/uploads/2024/06/2bf1f0e9f04e6fb4f8fef35e82c42aa5.pdf',
  },
  {
    topic: 'Staged innovation procurement elsewhere',
    note: 'The United Kingdom runs phased innovation contracts (Innovate UK Contracts for Innovation, earlier called SBRI) in which the supplier keeps the intellectual property and the public body keeps usage rights. Cited as a model, not as Indian law.',
    url: 'https://www.ukri.org/what-we-offer/browse-our-areas-of-investment-and-support/small-business-research-initiative-sbri/',
  },
]
