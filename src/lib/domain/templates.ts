// The standard template library of the mechanism: one starting draft for every document a
// department needs on the pathway, so that nobody starts from a blank page.
//
// Wherever a template repeats a policy setting (rubric weights, eligibility rules, security
// checks, pathways, payment target) the text is generated from policy.ts, so it cannot drift.
// Blanks to fill in are written in [square brackets].

import {
  DATA_ACCESS_LABELS,
  DATA_LABELS,
  ELIGIBILITY_RULES,
  IP_LABELS,
  PATHWAYS,
  POLICY,
  RUBRIC,
  SECURITY_CHECKS,
  STAGE_INFO,
} from '@/lib/domain/policy'
import type { Template, TemplateCategory } from '@/lib/domain/types'

type Section = Template['sections'][number]

const VERSION = 'v1.0 (prototype draft)'

/** Opens every template: what the draft is and what it is not. */
const STATUS: Section = {
  heading: 'Status of this template',
  body: [
    'This is a prototype draft. It is not a final document and it is not legal advice.',
    "It must be reviewed by the department's legal and finance officers before it is used.",
    'It must be adapted to the financial and procurement rules that apply to the department.',
    'Text in [square brackets] is to be filled in or chosen for each challenge.',
  ],
}

/** "Option A: ...", "Option B: ..." for a set of labelled choices. */
const options = (labels: Record<string, string>) =>
  Object.values(labels).map((label, i) => `Option ${String.fromCharCode(65 + i)}: ${label}.`)

const choice = (labels: Record<string, string>) => `[${Object.values(labels).join(' / ')}]`

/** What to ask the startup for, per security check id. */
const SECURITY_EVIDENCE: Record<string, string> = {
  hosting: 'a written statement naming the hosting provider and the server location',
  access: 'the list of user accounts and roles, and the sign-in settings for administrators',
  encryption: 'a short note on how data is encrypted in transit and at rest',
  minimise: 'the list of personal data fields collected, with the notice or consent text',
  testing: 'the vulnerability assessment report and proof that high-risk findings were fixed',
  incident: 'the incident reporting procedure with a named contact person',
  logs: 'a sample of the access and change logs',
  exit: 'a written confirmation of return and deletion at the end of the pilot',
}

const mustPass = ELIGIBILITY_RULES.filter((rule) => rule.kind === 'mandatory')
const notRequired = ELIGIBILITY_RULES.filter((rule) => rule.kind === 'relaxed')
const totalWeight = RUBRIC.reduce((sum, criterion) => sum + criterion.weight, 0)

export const TEMPLATES: Template[] = [
  {
    id: 'problem-statement',
    category: 'PROBLEM_STATEMENT',
    title: 'Outcome-based problem statement',
    version: VERSION,
    purpose:
      'Helps a department describe the problem and the result it wants, not the product to buy. Startups then propose how to reach the result.',
    usedAt: 'IDENTIFY',
    sections: [
      STATUS,
      {
        heading: 'The problem',
        body: [
          'Title: [short name of the challenge].',
          "Problem: [what hurts today and for whom, in the department's own words].",
          'Who is affected: [users and how many].',
          'What is done today: [current approach and why it is not enough].',
          'Describe the result wanted. Do not name a product, brand or technology.',
        ],
      },
      {
        heading: 'Outcomes and KPIs',
        body: [
          'KPI: [name]. Unit: [unit]. Baseline: [value today]. Target: [value at the end of the pilot]. Better when: [lower / higher].',
          'Repeat the line above for each KPI. Keep the list short.',
          'Every KPI needs a baseline and a target that can be measured at the pilot sites.',
          'Good example: "Average waiting time at the counter falls from 45 minutes to 20 minutes by the end of the pilot, measured from the token system."',
          'Poor example: "Improve service delivery using the latest technology." It has no number, no baseline and no way to measure it.',
        ],
      },
      {
        heading: 'Constraints, data and scope',
        body: [
          'Constraints: [rules, systems, languages or site conditions the solution must respect].',
          'Data available: [what data the department can share, and in what form].',
          'Out of scope: [what the pilot will not cover].',
        ],
      },
      {
        heading: 'Pilot envelope',
        body: [
          'Budget ceiling for the pilot: Rs [amount] lakh.',
          'Pilot sites: [sites].',
          'Pilot duration: [number] weeks.',
          `Intellectual property preference: ${choice(IP_LABELS)}.`,
        ],
      },
      {
        heading: 'Review and publishing',
        body: [
          'Drafted by: [department officer, date].',
          'Reviewed by the innovation cell: [name, date].',
          'The review checks that every KPI has a baseline, a target and a way to measure it.',
          'Published on: [date]. Applications close on: [date].',
        ],
      },
    ],
  },
  {
    id: 'evaluation-scoring-sheet',
    category: 'EVALUATION',
    title: 'Evaluation criteria and scoring sheet',
    version: VERSION,
    purpose:
      'Gives every expert the same criteria, weights and marking scale, so that applications are compared fairly and the reasons are on record.',
    usedAt: 'EVALUATE',
    sections: [
      STATUS,
      {
        heading: 'Criteria and weights',
        body: [
          ...RUBRIC.map(
            (criterion) => `${criterion.name} (weight ${criterion.weight}): ${criterion.guidance}`,
          ),
          `The weights add up to ${totalWeight}.`,
        ],
      },
      {
        heading: 'Marking scale',
        body: [
          'Each criterion is marked from 1 to 5.',
          '1: does not meet the need. 2: weak. 3: acceptable. 4: good. 5: very good, with evidence.',
          'Weighted score out of 100: for each criterion take the weight times the mark divided by 5, then add them up.',
        ],
      },
      {
        heading: 'Scoring sheet',
        body: [
          'Application: [startup name, challenge code].',
          'For each criterion: mark [1 to 5] and reason [one line].',
          'Overall comment: [strengths, weaknesses and points to check in the pilot].',
          'Evaluator: [name, organisation, date].',
        ],
      },
      {
        heading: 'Conflict of interest declaration',
        body: [
          'I have no financial, family or professional interest in this startup or in any other applicant to this challenge.',
          'If I have such an interest, I will declare it and I will not score the application.',
          'I will keep the applications and the scores confidential.',
          'Declared by: [name, signature, date].',
        ],
      },
      {
        heading: 'Moderation and ranking',
        body: [
          `At least ${POLICY.minEvaluators} evaluators score every eligible application before the ranking is final.`,
          'Each evaluator scores alone, before seeing the marks of the others.',
          "The score of an application is the average of its evaluators' weighted scores.",
          'Where the scores of two evaluators differ by more than [number] points, the panel discusses the application and records the outcome.',
          `An application needs ${POLICY.shortlistScore} or more out of 100 to be shortlisted.`,
          'The ranking, the scores and the reasons are kept on record.',
        ],
      },
    ],
  },
  {
    id: 'eligibility-checklist',
    category: 'EVALUATION',
    title: 'Eligibility checklist',
    version: VERSION,
    purpose:
      'Lists the checks every application must pass and the usual tender conditions that are not asked from startups. Each result carries a written reason.',
    usedAt: 'SCREEN',
    sections: [
      STATUS,
      {
        heading: 'How screening works',
        body: [
          'Every application is checked against the same published rules.',
          'Each rule gets a result with a written reason: [pass / fail / clarify].',
          'An application is eligible only if it passes every rule under "Must pass".',
          'Where a document is unclear, ask the startup for a clarification before deciding.',
          'The rules and numbers below are configurable defaults of the prototype.',
        ],
      },
      {
        heading: 'Must pass',
        body: mustPass.map(
          (rule) => `${rule.label}. ${rule.detail} Result: [result]. Reason: [reason].`,
        ),
      },
      {
        heading: 'Not required from startups',
        body: [
          ...notRequired.map((rule) => `${rule.label}. ${rule.detail}`),
          'Do not reject an application because one of these is missing.',
        ],
      },
      {
        heading: 'Screening record',
        body: [
          'Application: [startup name, challenge code].',
          'Overall result: [eligible / ineligible / clarification needed].',
          'Screened by: [name, role, date].',
          'The startup is told the result and the reason for each rule.',
        ],
      },
    ],
  },
  {
    id: 'pilot-agreement',
    category: 'PILOT_AGREEMENT',
    title: 'Pilot agreement',
    version: VERSION,
    purpose:
      'A short agreement for a time-bound pilot: what is tested, where, for how long, and which payment follows which accepted milestone.',
    usedAt: 'CONTRACT',
    sections: [
      STATUS,
      {
        heading: 'Parties, scope and duration',
        body: [
          'This pilot agreement is between [department name] (the department) and [startup name] (the startup).',
          'Scope of the pilot: [what will be tested and for which users].',
          'Pilot sites: [sites].',
          'Duration: [number] weeks from [start date]. Any extension is agreed in writing.',
          'Success is measured by the KPIs, baselines and targets of the published problem statement.',
        ],
      },
      {
        heading: 'Deliverables, milestones and payment schedule',
        body: [
          'Milestone [number]: [title]. Deliverable: [what is handed over]. Due on: [date]. Payment: [share] percent of the pilot value.',
          'Repeat the line above for each milestone. The payment shares add up to 100 percent.',
          'Total pilot value: Rs [amount] lakh.',
          'Payment is tied to accepted milestones, not to time spent.',
        ],
      },
      {
        heading: 'Acceptance and payment',
        body: [
          'The department accepts or returns each submitted milestone within [number] working days.',
          'A milestone that is returned comes with written reasons and a date to resubmit.',
          'On acceptance the payment request is raised automatically. The startup does not send a separate bill.',
          `The department pays within ${POLICY.paymentTargetDays} days of the payment request that follows acceptance.`,
          'The finance officer approves and releases the payment. A delay beyond the target is recorded with its reason.',
        ],
      },
      {
        heading: 'Change control and termination',
        body: [
          'A change to scope, sites, milestones or value is made only by a written change note signed by both parties.',
          'Either party may end the pilot with [number] days of written notice.',
          'The department may stop the pilot at once if the go / no-go gate fails or a serious security incident occurs.',
          'On termination the department pays for the milestones already accepted.',
          'Data is returned and deleted as set out in the data and intellectual property clauses.',
        ],
      },
      {
        heading: 'Liability and later procurement',
        body: [
          'The liability of the startup is proportionate to the pilot and is limited to [the pilot value or another agreed cap].',
          'This agreement covers a pilot only. It does not commit the department to buy the solution at scale.',
          'A scale-up decision is taken on the validated results and follows a compliant procurement pathway.',
          'Taking part in the pilot gives the startup no unfair advantage and no disadvantage in any later procurement.',
          'The department may share the pilot results and the validated specification with all bidders in a later procurement.',
        ],
      },
      {
        heading: 'Attachments and signatures',
        body: [
          'Attached: problem statement, pilot plan, data and intellectual property clauses, cybersecurity checklist, risk register.',
          'For the department: [name, designation, date].',
          'For the startup: [name, designation, date].',
        ],
      },
    ],
  },
  {
    id: 'data-and-ip-clauses',
    category: 'DATA_IP',
    title: 'Data and intellectual property clauses',
    version: VERSION,
    purpose:
      'Standard choices for who owns what after the pilot, how data is used and what happens to it at the end. Startups see the same options in every department.',
    usedAt: 'CONTRACT',
    sections: [
      STATUS,
      {
        heading: 'Intellectual property',
        body: [
          'Background intellectual property, meaning what each party owned before the pilot, stays with its owner.',
          'For intellectual property created in the pilot, choose one option.',
          ...options(IP_LABELS),
          'Under every option the department may keep using the pilot outputs at the pilot sites for [period].',
        ],
      },
      {
        heading: 'Pilot data',
        body: [
          'For data used or produced in the pilot, choose one option.',
          ...options(DATA_LABELS),
          `Data the startup may access during the pilot: ${choice(DATA_ACCESS_LABELS)}.`,
        ],
      },
      {
        heading: 'Confidentiality and personal data',
        body: [
          'Each party keeps the confidential information of the other party secret and uses it only for the pilot.',
          'Confidentiality continues for [number] years after the pilot ends.',
          'The startup collects and uses only the personal data needed for the pilot, with notice and consent where required.',
          'Personal data is handled under the data protection law that applies and is not shared with a third party without written approval.',
        ],
      },
      {
        heading: 'Return and deletion at exit',
        body: [
          'At the end of the pilot the startup returns all pilot data to the department in [format] within [number] days.',
          'The startup then deletes the data from its systems and confirms the deletion in writing.',
          'Where the option to keep anonymised data is chosen, only anonymised data may be kept.',
        ],
      },
      {
        heading: 'Publishing pilot results',
        body: [
          'The department may publish the pilot results, including the KPI values and the independent validation.',
          'The startup may refer to the pilot in public only with facts confirmed by the validation report and with the written consent of the department.',
          'Trade secrets and source code of the startup are not published.',
        ],
      },
    ],
  },
  {
    id: 'cybersecurity-checklist',
    category: 'CYBERSECURITY',
    title: 'Cybersecurity and data protection checklist',
    version: VERSION,
    purpose:
      'The checks to confirm before a pilot touches department systems or data, with the evidence to ask the startup for.',
    usedAt: 'PILOT_DESIGN',
    sections: [
      STATUS,
      {
        heading: 'How to use the checklist',
        body: [
          'Complete the checklist during pilot design, before the pilot plan is approved.',
          'Mark each check as confirmed only when the evidence has been seen.',
          'A check that does not apply is marked "not applicable" with a reason.',
          'Start with synthetic or anonymised data where possible. Move to live data only when the checks are confirmed.',
        ],
      },
      {
        heading: 'Checks and evidence',
        body: SECURITY_CHECKS.map(
          (check) =>
            `${check.label}: ${check.detail} Evidence to ask for: ${
              SECURITY_EVIDENCE[check.id] ?? '[evidence agreed with the department]'
            }. Confirmed: [yes / no / not applicable].`,
        ),
      },
      {
        heading: 'Sign-off',
        body: [
          'Open points and the date by which each is closed: [list].',
          'Confirmed for the startup by: [name, role, date].',
          "Checked for the department by: [name, role, date]. Where the department has an information security officer, that officer's advice is recorded here.",
        ],
      },
    ],
  },
  {
    id: 'risk-register-and-gate',
    category: 'RISK',
    title: 'Risk register and go / no-go gate',
    version: VERSION,
    purpose:
      'Records what could go wrong in the pilot, who owns each risk, and the conditions under which the pilot starts, continues or stops.',
    usedAt: 'PILOT_DESIGN',
    sections: [
      STATUS,
      {
        heading: 'Risk register fields',
        body: [
          'Risk: [what could go wrong].',
          'Likelihood: [low / medium / high]. Impact: [low / medium / high].',
          'Mitigation: [what is done to reduce the risk].',
          'Owner: [name and role].',
          'Review the register at every milestone and add new risks as they appear.',
        ],
      },
      {
        heading: 'Likelihood and impact scale',
        body: [
          'Likelihood low: not expected during the pilot.',
          'Likelihood medium: could happen once during the pilot.',
          'Likelihood high: expected to happen unless action is taken.',
          'Impact low: a short delay, with no effect on users or data.',
          'Impact medium: a milestone slips or a KPI cannot be measured for some time.',
          'Impact high: users are harmed, data is exposed or the pilot has to stop.',
        ],
      },
      {
        heading: 'Common pilot risks and mitigations',
        body: [
          'Baseline data is missing or weak: measure the baseline before the pilot starts.',
          'Staff at the pilot site do not use the solution: name a site owner and train users in the first week.',
          'The solution fails during service hours: keep the current process ready as a fallback.',
          'Personal data is exposed: start with synthetic or anonymised data and complete the cybersecurity checklist.',
          'Payment is delayed: tie payment to accepted milestones and track the days against the payment target.',
          'The startup cannot deliver at scale: test capacity in the pilot and ask for a scale-up plan.',
        ],
      },
      {
        heading: 'Go / no-go gate',
        body: [
          'The gate is checked before the pilot starts and again at [milestone].',
          'Go only if the pilot plan is approved, the cybersecurity checklist is confirmed and the fallback is in place.',
          'Go only if no risk rated high on both likelihood and impact is left without a mitigation.',
          'No-go if: [condition, for example a safety incident or a KPI moving the wrong way].',
          'Decision: [go / no-go]. Reason: [reason]. Decided by: [name, role, date].',
        ],
      },
    ],
  },
  {
    id: 'procurement-pathway-selector',
    category: 'PATHWAY',
    title: 'Procurement pathway selector',
    version: VERSION,
    purpose:
      'Helps the department pick a compliant way to procure a solution after its pilot results are independently validated, and to record why that way was chosen.',
    usedAt: 'DECIDE',
    sections: [
      STATUS,
      ...PATHWAYS.map((pathway): Section => ({
        heading: `Pathway: ${pathway.name}`,
        body: [
          `Fits when: ${pathway.fitsWhen}`,
          ...pathway.steps.map((step, i) => `Step ${i + 1}: ${step}.`),
          `Caution: ${pathway.caution}`,
        ],
      })),
      {
        heading: 'Decision record',
        body: [
          'Challenge: [code and title]. Validated solution: [startup and solution].',
          'Validation verdict: [validated / partly validated / not validated]. Report date: [date].',
          'Pathway chosen: [pathway name]. Why it fits: [reason].',
          'Pathways considered and not chosen: [names and reasons].',
          'Scale-up plan: [where, when, value in Rs lakh].',
          'Decided by: [name, designation, date]. Finance officer consulted: [name, date].',
        ],
      },
    ],
  },
]

/** Readable category names, in the order the library shows them. */
export const TEMPLATE_CATEGORIES: { id: TemplateCategory; label: string }[] = [
  { id: 'PROBLEM_STATEMENT', label: 'Problem statement' },
  { id: 'EVALUATION', label: 'Eligibility and evaluation' },
  { id: 'PILOT_AGREEMENT', label: 'Pilot agreement' },
  { id: 'DATA_IP', label: 'Data and intellectual property' },
  { id: 'CYBERSECURITY', label: 'Cybersecurity and data protection' },
  { id: 'RISK', label: 'Risk and go / no-go' },
  { id: 'PATHWAY', label: 'Procurement pathway' },
]

/** Plain-text rendering of a template, for copying into a document or an email. */
export function templateAsText(template: Template): string {
  const sections = template.sections.map((section, i) =>
    [
      `${i + 1}. ${section.heading}`,
      ...section.body.map((line, j) => `${i + 1}.${j + 1} ${line}`),
    ].join('\n'),
  )
  return [
    template.title,
    `Version: ${template.version}`,
    `Used at: ${STAGE_INFO[template.usedAt].label}`,
    `Purpose: ${template.purpose}`,
    ...sections,
  ].join('\n\n')
}
