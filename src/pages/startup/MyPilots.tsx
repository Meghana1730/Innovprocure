// Pilots won by the acting startup: milestones, payments, KPI readings, validation and decision.
import { PackageCheck } from 'lucide-react'
import { useState } from 'react'

import { PaymentTimingBadge, Pill, StageBadge, StatusBadge } from '@/components/badges'
import { Callout, Facts } from '@/components/cards'
import { Panel } from '@/components/headers'
import { EmptyState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { run } from '@/lib/demo/run'
import { challengeView, type ChallengeView } from '@/lib/demo/selectors'
import { recordMeasurement, submitMilestone } from '@/lib/demo/store'
import {
  DATA_ACCESS_LABELS,
  DATA_LABELS,
  IP_LABELS,
  PATHWAYS,
  POLICY,
  SECURITY_CHECKS,
} from '@/lib/domain/policy'
import { paymentTiming } from '@/lib/domain/rules'
import type { DemoState, Startup, TimelineEvent } from '@/lib/domain/types'
import { addDays, fmtDate, fmtLakh, fmtNum, plural, today } from '@/lib/format'
import { returnOf } from '@/pages/startup/helpers'

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border px-3 py-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="tabular text-lg font-semibold text-foreground">{value}</p>
    </div>
  )
}

/** The terms the startup works under: the signed clauses and the approved sandbox conditions. */
function Terms({ view }: { view: ChallengeView }) {
  const { agreement, pilot } = view
  if (!agreement || !pilot) return null
  const confirmed = SECURITY_CHECKS.filter((check) => pilot.securityChecks.includes(check.id))
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-foreground">Terms of this pilot</h4>
      <Facts
        items={[
          { label: 'IP clause', value: IP_LABELS[agreement.ip] },
          { label: 'Data clause', value: DATA_LABELS[agreement.data] },
          { label: 'Data the startup may use', value: DATA_ACCESS_LABELS[pilot.dataAccess] },
          { label: 'User limit', value: pilot.userLimit || '-' },
          { label: 'Go / no-go check', value: pilot.goNoGo },
          {
            label: 'Pilot period',
            value: `${fmtDate(pilot.startOn)} to ${fmtDate(addDays(pilot.startOn, pilot.weeks * 7))} (${plural(pilot.weeks, 'week')})`,
          },
          {
            label: 'Security checks confirmed',
            value:
              confirmed.length > 0
                ? `${confirmed.length} of ${SECURITY_CHECKS.length}: ${confirmed.map((check) => check.label).join(', ')}`
                : 'None',
          },
        ]}
      />
    </div>
  )
}

/** `timeline` is the whole audit trail, oldest first: it holds the reason of a returned milestone. */
function Milestones({ view, timeline }: { view: ChallengeView; timeline: TimelineEvent[] }) {
  const { challenge, milestones, agreement } = view
  const now = today()
  const running = challenge.stage === 'MEASURE' && !challenge.outcome
  const nextPlanned = milestones.find((m) => m.status === 'PLANNED')
  const sum = (items: typeof milestones) => items.reduce((total, m) => total + m.amountLakh, 0)
  const paid = sum(milestones.filter((m) => m.payment === 'PAID'))
  const pending = sum(
    milestones.filter((m) => m.payment === 'REQUESTED' || m.payment === 'APPROVED'),
  )
  const contract = agreement?.valueLakh ?? sum(milestones)
  const overdue = milestones.some((m) => paymentTiming(m, now).state === 'OVERDUE')

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-foreground">Milestones and payments</h4>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Contract value" value={fmtLakh(contract)} />
        <Stat label="Paid" value={fmtLakh(paid)} />
        <Stat label="Payment pending" value={fmtLakh(pending)} />
        <Stat label="Still to be earned" value={fmtLakh(Math.max(0, contract - paid - pending))} />
      </div>
      {overdue && (
        <Callout tone="warning" title="A payment has waited longer than the target">
          The finance officer sees it marked as overdue on the government dashboard.
        </Callout>
      )}
      <ol className="divide-y rounded-lg border">
        {milestones.map((m) => {
          const timing = paymentTiming(m, now)
          const returned = returnOf(timeline, m)
          return (
            <li
              key={m.id}
              className="grid grid-cols-1 items-center gap-x-4 gap-y-2 px-3 py-3 lg:grid-cols-[minmax(0,1fr)_auto]"
            >
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-medium text-foreground">
                  Milestone {m.order}: {m.title}
                </p>
                <p className="text-xs text-muted-foreground">{m.deliverable}</p>
                <p className="text-xs text-muted-foreground">
                  Due {fmtDate(m.dueOn)}, {fmtLakh(m.amountLakh)} ({fmtNum(m.paymentPct)}% of the
                  contract)
                  {m.paidOn
                    ? `, paid on ${fmtDate(m.paidOn)}`
                    : m.acceptedOn
                      ? `, accepted on ${fmtDate(m.acceptedOn)}`
                      : m.submittedOn
                        ? `, submitted on ${fmtDate(m.submittedOn)}, waiting for the department`
                        : ''}
                </p>
                {returned && (
                  <p className="text-xs font-medium text-foreground">
                    Returned by the department on {fmtDate(returned.on)}: {returned.detail}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {returned ? (
                  <Pill tone="warning">Returned</Pill>
                ) : (
                  <StatusBadge status={m.status} />
                )}
                <StatusBadge status={m.payment} />
                {timing.state !== 'NOT_DUE' && <PaymentTimingBadge timing={timing} />}
                {running && nextPlanned?.id === m.id && (
                  <Button
                    size="sm"
                    onClick={() =>
                      run(
                        () => submitMilestone(m.id),
                        `Milestone ${m.order} submitted to the department`,
                      )
                    }
                  >
                    <PackageCheck aria-hidden /> Submit as delivered
                  </Button>
                )}
              </div>
            </li>
          )
        })}
      </ol>
      <p className="text-xs text-muted-foreground">
        Payment request is raised automatically when the department accepts the milestone. Target:{' '}
        {POLICY.paymentTargetDays} days from the request to payment. The department officer accepts
        milestones. The finance officer approves and releases payments.
      </p>
    </div>
  )
}

/** Mount with a key per challenge so the inputs start from that pilot's last readings. */
function ReadingsForm({ view }: { view: ChallengeView }) {
  const { challenge, readings } = view
  const lastWeek = Math.max(0, ...readings.map((r) => r.week ?? 0))
  const [week, setWeek] = useState(String(lastWeek + 1))
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(readings.map((r) => [r.kpi.id, String(r.value ?? r.kpi.baseline)])),
  )

  const save = () => {
    const parsed = Object.fromEntries(
      readings.map((r) => {
        const text = (values[r.kpi.id] ?? '').trim()
        return [r.kpi.id, text === '' ? Number.NaN : Number(text)]
      }),
    )
    const weekNumber = Number(week)
    const ok = run(
      () => recordMeasurement(challenge.id, weekNumber, parsed, 'startup'),
      `KPI readings recorded for week ${weekNumber}`,
    )
    if (ok) setWeek(String(weekNumber + 1))
  }

  return (
    <div className="space-y-3 rounded-lg border bg-muted/40 p-3">
      <div>
        <p className="text-sm font-medium text-foreground">Record this week's readings</p>
        <p className="text-xs text-muted-foreground">
          Prefilled with the last reading: change the values before saving. Self-reported readings
          are checked by the independent validator before any decision.
        </p>
      </div>
      <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor={`week-${challenge.id}`}>Pilot week number</Label>
          <Input
            id={`week-${challenge.id}`}
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={week}
            onChange={(e) => setWeek(e.target.value)}
          />
        </div>
        {readings.map(({ kpi }) => (
          <div key={kpi.id} className="min-w-0 space-y-1.5">
            <Label htmlFor={`kpi-${challenge.id}-${kpi.id}`} className="leading-snug">
              {kpi.name} ({kpi.unit})
            </Label>
            <Input
              id={`kpi-${challenge.id}-${kpi.id}`}
              type="number"
              inputMode="decimal"
              step="any"
              value={values[kpi.id] ?? ''}
              onChange={(e) => setValues((old) => ({ ...old, [kpi.id]: e.target.value }))}
            />
          </div>
        ))}
      </div>
      <Button size="sm" onClick={save}>
        Record readings
      </Button>
    </div>
  )
}

function Kpis({ view }: { view: ChallengeView }) {
  const { challenge, readings } = view
  const running = challenge.stage === 'MEASURE' && !challenge.outcome
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-foreground">Results against the targets</h4>
      <ul className="divide-y rounded-lg border">
        {readings.map(({ kpi, value, week, progress, met }) => (
          <li key={kpi.id} className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-3 py-2.5">
            <div className="min-w-0 flex-1 basis-56">
              <p className="text-sm font-medium text-foreground">{kpi.name}</p>
              <p className="text-xs text-muted-foreground">
                Baseline {fmtNum(kpi.baseline)}, target {fmtNum(kpi.target)} {kpi.unit}
                {value !== null && `, latest ${fmtNum(value)} in week ${week}`}
              </p>
            </div>
            {value === null ? (
              <Pill>No reading yet</Pill>
            ) : met ? (
              <Pill tone="success">Target met</Pill>
            ) : (
              <Pill tone="warning">{progress}% of the way to the target</Pill>
            )}
          </li>
        ))}
      </ul>
      {running && <ReadingsForm key={challenge.id} view={view} />}
    </div>
  )
}

function Outcome({ view }: { view: ChallengeView }) {
  const { challenge, validation, decision } = view
  const pathway = PATHWAYS.find((p) => p.id === decision?.pathwayId)
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-foreground">Validation and decision</h4>
      {!validation && !decision && (
        <p className="text-sm text-muted-foreground">
          After the department closes the pilot, the independent validator checks the results. The
          verdict and the department's decision (scale, extend or stop) will show here.
        </p>
      )}
      {validation && (
        <div className="space-y-1.5 rounded-lg border px-3 py-2.5 text-sm">
          <p className="flex flex-wrap items-center gap-2 font-medium text-foreground">
            Independent validation <StatusBadge status={validation.verdict} />
          </p>
          <p className="text-xs text-muted-foreground">
            {validation.validator}, {validation.organisation}, reported on{' '}
            {fmtDate(validation.reportedOn)}
          </p>
          <p className="text-muted-foreground">{validation.findings}</p>
          <ul className="text-xs text-muted-foreground">
            {challenge.brief.kpis
              .filter((kpi) => Number.isFinite(validation.confirmed[kpi.id]))
              .map((kpi) => (
                <li key={kpi.id}>
                  {kpi.name}: confirmed {fmtNum(validation.confirmed[kpi.id])} {kpi.unit} (target{' '}
                  {fmtNum(kpi.target)})
                </li>
              ))}
          </ul>
        </div>
      )}
      {validation && !decision && (
        <p className="text-sm text-muted-foreground">
          The department officer now decides on the evidence: scale, extend or stop. The decision
          and its reasons will show here.
        </p>
      )}
      {decision && (
        <div className="space-y-1.5 rounded-lg border px-3 py-2.5 text-sm">
          <p className="flex flex-wrap items-center gap-2 font-medium text-foreground">
            Department decision <StatusBadge status={decision.decision} />
          </p>
          <p className="text-xs text-muted-foreground">
            {decision.decidedBy}, {fmtDate(decision.decidedOn)}
          </p>
          <p className="text-muted-foreground">{decision.rationale}</p>
          {pathway && (
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">Procurement pathway: </span>
              {pathway.name}
            </p>
          )}
          {decision.plan.length > 0 && (
            <ul className="text-xs text-muted-foreground">
              {decision.plan.map((item) => (
                <li key={`${item.where}-${item.when}`}>
                  {item.where}, {item.when}: {fmtLakh(item.valueLakh)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

const BEFORE_CONTRACT: Partial<Record<ChallengeView['challenge']['stage'], string>> = {
  PILOT_DESIGN:
    'The department is designing the pilot with you: scope, sites, data access, security checks and risks.',
  CONTRACT: 'The pilot plan is approved. The department is preparing the pilot agreement.',
}

export function MyPilots({ state, startup }: { state: DemoState; startup: Startup }) {
  const views = state.challenges
    .map((challenge) => challengeView(state, challenge.id))
    .filter((view): view is ChallengeView => view?.selected?.startupId === startup.id)
  return (
    <Panel
      title="My pilots and payments"
      description="Pilots this startup was selected for: what to deliver, what has been paid, and how the results are judged."
    >
      {views.length === 0 ? (
        <EmptyState
          title="No pilots yet"
          description="When an application of this startup is ranked first, the pilot shows here with its milestones, payments and results."
        />
      ) : (
        <ul className="space-y-5">
          {views.map((view) => {
            const { challenge, department, agreement, milestones } = view
            return (
              <li key={challenge.id} className="min-w-0 space-y-4 rounded-lg border p-4">
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                  <div className="min-w-0 space-y-1">
                    <p className="text-xs font-semibold tracking-wider text-primary uppercase">
                      {challenge.code}
                    </p>
                    <h3 className="font-semibold text-foreground">{challenge.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {department?.name ?? 'Department'}, {challenge.district}
                      {agreement?.signedOn &&
                        `. Agreement signed on ${fmtDate(agreement.signedOn)}`}
                    </p>
                  </div>
                  <StageBadge challenge={challenge} />
                </div>
                {milestones.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {BEFORE_CONTRACT[challenge.stage] ?? 'Selected for the pilot.'} Milestones and
                    payments show here once the agreement is signed.
                  </p>
                ) : (
                  <>
                    <Terms view={view} />
                    <Milestones view={view} timeline={state.timeline} />
                    <Kpis view={view} />
                    <Outcome view={view} />
                  </>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}
