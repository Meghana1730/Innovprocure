// Independent validation and the scale-up decision of one challenge: what the third party
// confirmed, the evidence in one place, and the department's decision with its reasons.
import { ArrowRight, CircleCheck, CircleX, Plus, Scale, ShieldCheck, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { Pill, StatusBadge, SyntheticBadge } from '@/components/badges'
import { Callout, DoneBy, Facts, MetricCard } from '@/components/cards'
import { DataTable, type Column } from '@/components/DataTable'
import { Panel } from '@/components/headers'
import { EmptyState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { run } from '@/lib/demo/run'
import { stageIndex, type ChallengeView, type KpiReading } from '@/lib/demo/selectors'
import { recordDecision } from '@/lib/demo/store'
import { PATHWAYS, POLICY, type Pathway } from '@/lib/domain/policy'
import { kpiMet, paymentTiming } from '@/lib/domain/rules'
import type { Decision, ScalePlanItem, ValidationVerdict } from '@/lib/domain/types'
import { fmtDate, fmtLakh, fmtNum, plural, today } from '@/lib/format'
import { cn } from '@/lib/utils'

const VERDICT_TEXT: Record<ValidationVerdict, string> = {
  VALIDATED: 'validated',
  PARTLY_VALIDATED: 'partly validated',
  NOT_VALIDATED: 'not validated',
}

const DECISION_OPTIONS: { id: Decision; label: string; meaning: string }[] = [
  {
    id: 'SCALE',
    label: 'Scale',
    meaning: 'Procure the validated solution through a compliant pathway and roll it out.',
  },
  {
    id: 'EXTEND',
    label: 'Extend the pilot',
    meaning: 'The results are promising but not yet proven. Collect more evidence before buying.',
  },
  {
    id: 'STOP',
    label: 'Stop',
    meaning: 'The results do not support a purchase. The cost stays limited to the pilot value.',
  },
]

/** Preselected on the form: the openly competitive route. The officer can change it. */
const DEFAULT_PATHWAY = PATHWAYS.find((p) => p.id === 'open-tender') ?? PATHWAYS[0]

const SUGGESTION: Record<ValidationVerdict, { decision: Decision; text: string }> = {
  VALIDATED: { decision: 'SCALE', text: 'A validated result suggests Scale.' },
  PARTLY_VALIDATED: {
    decision: 'EXTEND',
    text: 'A partly validated result suggests Extend, or Scale with conditions.',
  },
  NOT_VALIDATED: { decision: 'STOP', text: 'A result that is not validated suggests Stop.' },
}

function YesNo({ yes }: { yes: boolean }) {
  return yes ? (
    <Pill tone="success" icon={<CircleCheck aria-hidden />}>
      Yes
    </Pill>
  ) : (
    <Pill tone="danger" icon={<CircleX aria-hidden />}>
      No
    </Pill>
  )
}

/** One KPI as the validator saw it: reported by the pilot, confirmed independently. */
type KpiRow = {
  reading: KpiReading
  confirmed: number | null
  /** Confirmed minus reported; null when either value is missing. */
  difference: number | null
  met: boolean
}

function kpiRows(view: ChallengeView): KpiRow[] {
  return view.readings.map((reading) => {
    const value: number | undefined = view.validation?.confirmed[reading.kpi.id]
    const confirmed = value === undefined || !Number.isFinite(value) ? null : value
    return {
      reading,
      confirmed,
      difference:
        confirmed === null || reading.value === null
          ? null
          : Math.round((confirmed - reading.value) * 100) / 100,
      met: confirmed !== null && kpiMet(reading.kpi, confirmed),
    }
  })
}

const signed = (value: number) => `${value > 0 ? '+' : ''}${fmtNum(value)}`

const KPI_COLUMNS: Column<KpiRow>[] = [
  {
    key: 'kpi',
    header: 'KPI',
    className: 'min-w-32 whitespace-normal sm:min-w-44',
    cell: ({ reading: { kpi } }) => (
      <div>
        <p className="font-medium text-foreground">{kpi.name}</p>
        <p className="text-xs text-muted-foreground">
          {kpi.unit}, {kpi.better === 'lower' ? 'lower is better' : 'higher is better'}
        </p>
      </div>
    ),
  },
  {
    key: 'baseline',
    header: 'Baseline',
    align: 'right',
    cell: (r) => fmtNum(r.reading.kpi.baseline),
  },
  { key: 'target', header: 'Target', align: 'right', cell: (r) => fmtNum(r.reading.kpi.target) },
  { key: 'reported', header: 'Reported', align: 'right', cell: (r) => fmtNum(r.reading.value) },
  {
    key: 'confirmed',
    header: 'Confirmed',
    align: 'right',
    cell: (r) => <span className="font-semibold text-foreground">{fmtNum(r.confirmed)}</span>,
  },
  {
    key: 'difference',
    header: 'Difference',
    align: 'right',
    cell: (r) => (r.difference === null ? '-' : r.difference === 0 ? 'None' : signed(r.difference)),
  },
  { key: 'met', header: 'Met', cell: (r) => <YesNo yes={r.met} /> },
]

/** On a phone the confirmed value and the result come first; the rest scrolls sideways. */
const KPI_COLUMNS_PHONE = [
  'kpi',
  'confirmed',
  'met',
  'baseline',
  'target',
  'reported',
  'difference',
]
  .map((key) => KPI_COLUMNS.find((column) => column.key === key))
  .filter((column) => column !== undefined)

const PLAN_COLUMNS: Column<ScalePlanItem>[] = [
  {
    key: 'where',
    header: 'Where',
    className: 'min-w-32 whitespace-normal sm:min-w-44',
    cell: (p) => p.where,
  },
  { key: 'when', header: 'When', cell: (p) => p.when },
  { key: 'value', header: 'Value', align: 'right', cell: (p) => fmtLakh(p.valueLakh) },
]

function PathwayDetail({ pathway }: { pathway: Pathway }) {
  return (
    <div className="min-w-0 space-y-2 text-sm">
      <p className="text-muted-foreground">
        <span className="font-medium text-foreground">Fits when:</span> {pathway.fitsWhen}
      </p>
      <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
        {pathway.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <p className="text-muted-foreground">
        <span className="font-medium text-foreground">Caution:</span> {pathway.caution}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------- independent validation

function ValidationPanel({ view, rows }: { view: ChallengeView; rows: KpiRow[] }) {
  const { validation } = view
  if (!validation) {
    return (
      <Panel
        title="Independent validation"
        description="A third party that is neither the department nor the startup checks the pilot results."
        actions={<DoneBy role="validator" />}
      >
        <Callout tone="info" title="The validation report is awaited">
          <p>
            The validator submits the report on the Expert dashboard. Once it is in, the verdict,
            the confirmed value of every KPI and the evidence summary appear here.
          </p>
          <Button asChild size="sm" variant="outline" className="mt-2">
            <Link to="/experts?view=validation">
              Open the Expert dashboard <ArrowRight aria-hidden />
            </Link>
          </Button>
        </Callout>
      </Panel>
    )
  }
  return (
    <Panel
      title="Independent validation"
      description="A third party that is neither the department nor the startup checked the pilot results."
      actions={
        <>
          <StatusBadge status={validation.verdict} />
          <SyntheticBadge />
        </>
      }
      bodyClassName="space-y-5"
    >
      <Facts
        items={[
          { label: 'Verdict', value: <StatusBadge status={validation.verdict} /> },
          { label: 'Validator', value: validation.validator },
          { label: 'Organisation', value: validation.organisation },
          { label: 'Report date', value: fmtDate(validation.reportedOn) },
          { label: 'How it was checked', value: validation.method },
          { label: 'Findings', value: validation.findings },
        ]}
      />
      <div className="min-w-0 space-y-2">
        <h3 className="text-sm font-semibold text-foreground">Reported and confirmed results</h3>
        {[KPI_COLUMNS_PHONE, KPI_COLUMNS].map((columns) => (
          <div
            key={columns === KPI_COLUMNS ? 'wide' : 'phone'}
            className={columns === KPI_COLUMNS ? 'hidden sm:block' : 'sm:hidden'}
          >
            <DataTable
              rows={rows}
              columns={columns}
              rowKey={(r) => r.reading.kpi.id}
              caption="Each KPI: baseline, target, value reported in the pilot, value confirmed by the validator"
              empty={
                <EmptyState
                  title="No KPIs in this challenge"
                  description="The brief has no measurable outcomes, so there is nothing to compare."
                />
              }
            />
          </div>
        ))}
        <p className="text-xs text-muted-foreground sm:hidden">
          Swipe the table sideways to see the baseline, the target, the reported value and the
          difference.
        </p>
        <p className="text-xs text-muted-foreground">
          Reported is the latest reading of the pilot. Difference is confirmed minus reported. Met
          shows whether the target is met on the confirmed value, not on the reported one.
        </p>
      </div>
    </Panel>
  )
}

// ---------------------------------------------------------------- evidence summary

function EvidencePanel({ view, rows }: { view: ChallengeView; rows: KpiRow[] }) {
  const { validation, agreement, milestones, pilot } = view
  if (!validation) return null
  const met = rows.filter((r) => r.met).length
  const paidLakh = milestones
    .filter((m) => m.payment === 'PAID')
    .reduce((sum, m) => sum + m.amountLakh, 0)
  const timings = milestones.map((m) => paymentTiming(m, today()))
  const paid = timings.filter((t) => t.state === 'PAID_ON_TIME' || t.state === 'PAID_LATE').length
  const onTime = timings.filter((t) => t.state === 'PAID_ON_TIME').length
  const waiting = timings.filter((t) => t.state === 'PENDING' || t.state === 'OVERDUE').length
  const highRisks = pilot ? pilot.risks.filter((r) => r.impact === 'HIGH').length : null
  return (
    <Panel
      title="Evidence summary"
      description="This is the evidence the decision is based on."
      actions={<StatusBadge status={validation.verdict} />}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
        <MetricCard
          label="Targets met on confirmed values"
          value={`${met} of ${rows.length}`}
          hint="Counted on the values the validator confirmed."
          tone={met === rows.length ? 'success' : met === 0 ? 'danger' : 'warning'}
          icon={<ShieldCheck aria-hidden />}
        />
        <MetricCard
          label="Pilot cost"
          value={fmtLakh(agreement?.valueLakh)}
          hint={
            agreement
              ? `Agreement value. Paid so far: ${fmtLakh(paidLakh)}.`
              : 'No agreement on record.'
          }
        />
        <MetricCard
          label="Payments made on time"
          value={paid ? `${onTime} of ${paid}` : '-'}
          hint={
            `Target: within ${POLICY.paymentTargetDays} days of the request.` +
            (waiting ? ` ${plural(waiting, 'payment')} still waiting.` : '')
          }
          tone={paid && onTime === paid ? 'success' : 'warning'}
        />
        <MetricCard
          label="High impact risks in the pilot plan"
          value={highRisks === null ? '-' : highRisks}
          hint={
            highRisks === null ? 'No pilot plan on record.' : 'Risks rated high impact at design.'
          }
          tone={highRisks ? 'warning' : 'success'}
        />
      </div>
    </Panel>
  )
}

// ---------------------------------------------------------------- decision form

type PlanRow = { id: number; where: string; when: string; value: string }

/** "2026 Q4" for the quarter `ahead` quarters after the current one. */
function quarterAhead(ahead: number): string {
  const now = today()
  const index = Number(now.slice(0, 4)) * 4 + Math.floor((Number(now.slice(5, 7)) - 1) / 3) + ahead
  return `${Math.floor(index / 4)} Q${(index % 4) + 1}`
}

function defaultRationale(
  decision: Decision,
  verdict: ValidationVerdict,
  met: number,
  total: number,
  costLakh: number | undefined,
): string {
  const evidence = `The independent validator found the results ${VERDICT_TEXT[verdict]}: ${met} of ${total} KPI targets were met on the confirmed values.`
  const cost = costLakh === undefined ? 'the pilot value' : fmtLakh(costLakh)
  if (decision === 'SCALE') {
    return `${evidence} ${
      met === total
        ? 'The solution is ready to be procured and rolled out.'
        : 'Scale-up is approved on the condition that the targets not yet met are written into the scale-up contract as milestones.'
    }`
  }
  if (decision === 'EXTEND') {
    return `${evidence} The pilot is extended so that the targets not yet met can be measured again before any purchase.`
  }
  return `${evidence} The evidence does not support a purchase. The cost was limited to ${cost}.`
}

function DecisionForm({ view, rows }: { view: ChallengeView; rows: KpiRow[] }) {
  const { challenge, validation, agreement } = view
  const verdict = validation?.verdict ?? 'NOT_VALIDATED'
  const suggestion = SUGGESTION[verdict]
  const base = agreement?.valueLakh ?? challenge.brief.budgetCeilingLakh
  const met = rows.filter((r) => r.met).length

  const [decision, setDecision] = useState<Decision>(suggestion.decision)
  // null = the officer has not edited the text, so it follows the chosen decision.
  const [edited, setEdited] = useState<string | null>(null)
  const [pathwayId, setPathwayId] = useState(DEFAULT_PATHWAY.id)
  const nextId = useRef(3)
  const [plan, setPlan] = useState<PlanRow[]>(() => [
    {
      id: 1,
      where: `Rest of ${challenge.district} district`,
      when: quarterAhead(1),
      value: String(Math.round(base * 3)),
    },
    {
      id: 2,
      where: 'One neighbouring district',
      when: quarterAhead(2),
      value: String(Math.round(base * 2)),
    },
  ])

  const rationale =
    edited ?? defaultRationale(decision, verdict, met, rows.length, agreement?.valueLakh)
  const planTotal = plan.reduce((sum, p) => sum + (Number(p.value) || 0), 0)
  const setRow = (id: number, patch: Partial<PlanRow>) =>
    setPlan((current) => current.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  const addRow = () => {
    const id = nextId.current
    nextId.current += 1
    setPlan((current) => [...current, { id, where: '', when: quarterAhead(3), value: '' }])
  }

  const submit = () => {
    const label = DECISION_OPTIONS.find((d) => d.id === decision)?.label ?? decision
    run(() => {
      if (decision === 'SCALE' && plan.some((p) => !(Number(p.value) > 0))) {
        throw new Error('Enter a value in Rs lakh for every rollout step.')
      }
      recordDecision(challenge.id, {
        decision,
        rationale,
        pathwayId: decision === 'SCALE' ? pathwayId : null,
        plan:
          decision === 'SCALE'
            ? plan.map((p) => ({
                where: p.where.trim(),
                when: p.when.trim(),
                valueLakh: Number(p.value),
              }))
            : [],
      })
    }, `Decision recorded: ${label}`)
  }

  return (
    <Panel
      title="Scale-up decision"
      description="The department decides on the evidence above: scale, extend or stop."
      actions={<DoneBy role="department" />}
      bodyClassName="space-y-6"
    >
      <Callout tone="info" title={suggestion.text}>
        This is only a suggestion from the verdict. The officer decides and records the reasons.
        {decision !== 'SCALE' &&
          ' Choose Scale to see the procurement pathways and the rollout plan.'}
      </Callout>

      <fieldset className="min-w-0 space-y-2">
        <legend className="mb-2 text-sm font-semibold text-foreground">Decision</legend>
        <RadioGroup
          value={decision}
          onValueChange={(value) => setDecision(value as Decision)}
          className="grid-cols-1 gap-2 md:grid-cols-3"
        >
          {DECISION_OPTIONS.map((option) => (
            <div
              key={option.id}
              className={cn(
                'flex min-w-0 items-start gap-3 rounded-lg border p-3',
                decision === option.id && 'border-primary bg-accent',
              )}
            >
              <RadioGroupItem id={`decision-${option.id}`} value={option.id} className="mt-0.5" />
              <div className="min-w-0 space-y-1">
                <Label htmlFor={`decision-${option.id}`} className="flex-wrap leading-snug">
                  {option.label}
                  {suggestion.decision === option.id && <Pill tone="info">Suggested</Pill>}
                </Label>
                <p className="text-xs text-muted-foreground">{option.meaning}</p>
              </div>
            </div>
          ))}
        </RadioGroup>
      </fieldset>

      <div className="min-w-0 space-y-2">
        <Label htmlFor="decision-rationale">Reasons for the decision</Label>
        <Textarea
          id="decision-rationale"
          rows={4}
          value={rationale}
          onChange={(event) => setEdited(event.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Drafted from the verdict and the targets met. Edit it to record your own reasons.
        </p>
      </div>

      {decision === 'SCALE' && (
        <>
          <fieldset className="min-w-0 space-y-2">
            <legend className="mb-1 text-sm font-semibold text-foreground">
              Procurement pathway
            </legend>
            <p className="text-xs text-muted-foreground">
              Preselected: {DEFAULT_PATHWAY.name}. Choose the pathway that fits this case.
            </p>
            <RadioGroup
              value={pathwayId}
              onValueChange={setPathwayId}
              className="grid-cols-1 gap-2 xl:grid-cols-2"
            >
              {PATHWAYS.map((pathway) => (
                <div
                  key={pathway.id}
                  className={cn(
                    'flex min-w-0 items-start gap-3 rounded-lg border p-3',
                    pathwayId === pathway.id && 'border-primary bg-accent',
                  )}
                >
                  <RadioGroupItem
                    id={`pathway-${pathway.id}`}
                    value={pathway.id}
                    className="mt-0.5"
                  />
                  <div className="min-w-0 space-y-2">
                    <Label htmlFor={`pathway-${pathway.id}`} className="leading-snug">
                      {pathway.name}
                    </Label>
                    <PathwayDetail pathway={pathway} />
                  </div>
                </div>
              ))}
            </RadioGroup>
          </fieldset>

          <div className="min-w-0 space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Rollout plan</h3>
              <p className="text-xs text-muted-foreground">
                The rows are examples. Edit the places, the periods and the values.
              </p>
            </div>
            {plan.length === 0 ? (
              <EmptyState
                title="No rollout steps"
                description="Add at least one step: where the solution goes next, when, and the expected value."
              />
            ) : (
              <ul className="space-y-3">
                {plan.map((row, index) => (
                  <li
                    key={row.id}
                    className="grid min-w-0 grid-cols-1 items-end gap-3 rounded-lg border p-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
                  >
                    <div className="min-w-0 space-y-1.5">
                      <Label htmlFor={`plan-where-${row.id}`}>Where (step {index + 1})</Label>
                      <Input
                        id={`plan-where-${row.id}`}
                        value={row.where}
                        placeholder="District, department or sites"
                        onChange={(event) => setRow(row.id, { where: event.target.value })}
                      />
                    </div>
                    <div className="min-w-0 space-y-1.5">
                      <Label htmlFor={`plan-when-${row.id}`}>When</Label>
                      <Input
                        id={`plan-when-${row.id}`}
                        value={row.when}
                        placeholder="Year and quarter"
                        onChange={(event) => setRow(row.id, { when: event.target.value })}
                      />
                    </div>
                    <div className="min-w-0 space-y-1.5">
                      <Label htmlFor={`plan-value-${row.id}`}>Value (Rs lakh)</Label>
                      <Input
                        id={`plan-value-${row.id}`}
                        type="number"
                        min={0}
                        step="0.5"
                        inputMode="decimal"
                        value={row.value}
                        onChange={(event) => setRow(row.id, { value: event.target.value })}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="justify-self-start"
                      onClick={() => setPlan((current) => current.filter((p) => p.id !== row.id))}
                    >
                      <Trash2 aria-hidden /> Remove
                      <span className="sr-only"> step {index + 1}</span>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button type="button" variant="outline" size="sm" onClick={addRow}>
                <Plus aria-hidden /> Add a rollout step
              </Button>
              <p className="text-sm text-muted-foreground">
                Total planned value:{' '}
                <span className="tabular font-semibold text-foreground">{fmtLakh(planTotal)}</span>
              </p>
            </div>
          </div>
        </>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t pt-4">
        <Button type="button" onClick={submit}>
          <Scale aria-hidden /> Record decision
        </Button>
        <p className="min-w-0 flex-1 text-xs text-muted-foreground">
          The decision closes this stage and is written to the audit trail with its reasons.
        </p>
      </div>
    </Panel>
  )
}

// ---------------------------------------------------------------- decision record

function DecisionRecord({ view }: { view: ChallengeView }) {
  const { decision, agreement } = view
  if (!decision) return null
  const pathway = PATHWAYS.find((p) => p.id === decision.pathwayId)
  const total = decision.plan.reduce((sum, p) => sum + p.valueLakh, 0)
  const cost = agreement ? fmtLakh(agreement.valueLakh) : 'the pilot value'
  return (
    <Panel
      title="Scale-up decision"
      description="The decision of the department, with its reasons."
      actions={<StatusBadge status={decision.decision} />}
      bodyClassName="space-y-5"
    >
      <Facts
        items={[
          { label: 'Decision', value: <StatusBadge status={decision.decision} /> },
          { label: 'Decided by', value: decision.decidedBy },
          { label: 'Date', value: fmtDate(decision.decidedOn) },
          { label: 'Reasons', value: decision.rationale },
        ]}
      />

      {decision.decision === 'SCALE' ? (
        <>
          <div className="min-w-0 space-y-2 rounded-lg border p-4">
            <h3 className="text-sm font-semibold text-foreground">
              Procurement pathway: {pathway ? pathway.name : 'not recorded'}
            </h3>
            {pathway ? (
              <PathwayDetail pathway={pathway} />
            ) : (
              <p className="text-sm text-muted-foreground">
                No pathway template is attached to this decision.
              </p>
            )}
          </div>
          <div className="min-w-0 space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Rollout plan</h3>
            <DataTable
              rows={decision.plan}
              columns={PLAN_COLUMNS}
              rowKey={(p) => String(decision.plan.indexOf(p))}
              caption="Rollout plan: where, when and the planned value"
              empty={
                <EmptyState
                  title="No rollout steps recorded"
                  description="The decision has no rollout plan attached."
                />
              }
            />
            {decision.plan.length > 0 && (
              <p className="text-sm text-muted-foreground">
                Total planned value of {plural(decision.plan.length, 'rollout step')}:{' '}
                <span className="tabular font-semibold text-foreground">{fmtLakh(total)}</span>. The
                pilot that produced the evidence cost {cost}.
              </p>
            )}
          </div>
        </>
      ) : (
        <Callout
          tone={decision.decision === 'STOP' ? 'warning' : 'info'}
          title={
            decision.decision === 'STOP'
              ? 'No purchase is made'
              : 'More evidence before any purchase'
          }
        >
          {decision.decision === 'STOP'
            ? `The solution is not procured. The cost to the department was limited to the pilot value of ${cost}, instead of a full contract.`
            : `The pilot runs longer so the results can be measured again. No scale-up purchase is made yet, and the cost so far is limited to the pilot value of ${cost}. In this prototype the record of the challenge closes here.`}
        </Callout>
      )}
    </Panel>
  )
}

// ---------------------------------------------------------------- tab

export function OutcomeTab({ view }: { view: ChallengeView }) {
  const { challenge, validation, decision } = view
  if (stageIndex(challenge.stage) < stageIndex('VALIDATE') && !validation && !decision) {
    return (
      <EmptyState
        icon={<ShieldCheck aria-hidden />}
        title="The pilot has not reached validation yet"
        description="When the pilot is closed, a third party that is neither the department nor the startup confirms the results. Then the department decides: scale, extend or stop."
      />
    )
  }
  const rows = kpiRows(view)
  const canDecide = challenge.stage === 'DECIDE' && !challenge.outcome && !!validation
  return (
    <div className="min-w-0 space-y-4">
      <ValidationPanel view={view} rows={rows} />
      <EvidencePanel view={view} rows={rows} />
      {decision ? (
        <DecisionRecord view={view} />
      ) : canDecide ? (
        <DecisionForm key={challenge.id} view={view} rows={rows} />
      ) : (
        <Panel title="Scale-up decision" actions={<DoneBy role="department" />}>
          <p className="text-sm text-muted-foreground">
            The decision form opens here once the validation report is submitted. The department
            then records whether to scale, extend or stop, with its reasons.
          </p>
        </Panel>
      )}
      <p className="text-xs text-muted-foreground">
        The procurement pathways are templates. Each one is applied under the department's own
        financial rules. They are configurable defaults of the prototype, not legal advice.
      </p>
    </div>
  )
}
