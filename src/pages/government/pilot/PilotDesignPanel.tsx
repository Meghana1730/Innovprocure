// Sandbox / pilot design: the plan form at stage PILOT_DESIGN, the approved plan afterwards.
import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { Pill, StatusBadge } from '@/components/badges'
import { Callout, DoneBy, Facts } from '@/components/cards'
import { Panel } from '@/components/headers'
import { EmptyState } from '@/components/states'
import { statusLabel } from '@/components/status'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { run } from '@/lib/demo/run'
import type { ChallengeView } from '@/lib/demo/selectors'
import {
  approvePilotPlan,
  pilotPlanGaps,
  savePilotPlan,
  type PilotPlanInput,
} from '@/lib/demo/store'
import { DATA_ACCESS_LABELS, SECURITY_CHECKS } from '@/lib/domain/policy'
import type { PilotPlan, Risk, RiskLevel } from '@/lib/domain/types'
import { addDays, fmtDate, fmtNum, plural, today } from '@/lib/format'
import { Field, RadioChoice } from '@/pages/government/pilot/fields'

const LEVELS: RiskLevel[] = ['LOW', 'MEDIUM', 'HIGH']

const WHY =
  'Agreeing the limits, safeguards and success criteria before work starts reduces risk for the department.'

/** Generic pilot risks, so the register never starts empty. The officer edits them. */
const DEFAULT_RISKS: Risk[] = [
  {
    id: 'r1',
    risk: 'Staff at the pilot sites do not use the new system',
    likelihood: 'MEDIUM',
    impact: 'MEDIUM',
    mitigation: 'Training in week 1 and a named contact person at each site',
    owner: 'Department',
  },
  {
    id: 'r2',
    risk: 'The solution does not work reliably in field conditions',
    likelihood: 'MEDIUM',
    impact: 'HIGH',
    mitigation: 'Two-week tuning period; the fallback stays in place for the whole pilot',
    owner: 'Startup',
  },
  {
    id: 'r3',
    risk: 'Data shared for the pilot is exposed or misused',
    likelihood: 'LOW',
    impact: 'HIGH',
    mitigation:
      'Access limited to the sandbox conditions; security checks confirmed before go-live',
    owner: 'Both',
  },
]

function defaultPlan(view: ChallengeView): PilotPlanInput {
  const { challenge, selected, pilot } = view
  if (pilot) {
    return {
      scope: pilot.scope,
      sites: pilot.sites,
      startOn: pilot.startOn,
      weeks: pilot.weeks,
      dataAccess: pilot.dataAccess,
      userLimit: pilot.userLimit,
      fallback: pilot.fallback,
      securityChecks: pilot.securityChecks,
      risks: pilot.risks,
      goNoGo: pilot.goNoGo,
    }
  }
  const weeks = selected?.weeks ?? challenge.brief.pilotWeeks
  const checkWeek = Math.max(2, Math.round(weeks / 2))
  const kpi = challenge.brief.kpis[0]
  // A quarter of the way from baseline to target by the middle of the pilot.
  const quarter = kpi
    ? Math.round((kpi.baseline + (kpi.target - kpi.baseline) * 0.25) * 10) / 10
    : 0
  return {
    scope: selected?.approach ?? '',
    sites: challenge.brief.pilotSites,
    startOn: addDays(today(), 21),
    weeks,
    dataAccess: 'ANONYMISED',
    userLimit: 'Named staff at the pilot sites only',
    fallback:
      'The current process stays in place at every pilot site for the whole pilot, so the service continues if the solution fails.',
    // Nothing is confirmed until the officer ticks it.
    securityChecks: [],
    risks: DEFAULT_RISKS,
    goNoGo: kpi
      ? `Continue after week ${checkWeek} only if "${kpi.name}" is ${
          kpi.better === 'lower' ? 'at or below' : 'at or above'
        } ${fmtNum(quarter)} ${kpi.unit} (baseline ${fmtNum(kpi.baseline)}, target ${fmtNum(kpi.target)}).`
      : `Continue after week ${checkWeek} only if the solution is in daily use at the pilot sites.`,
  }
}

function PlanForm({ view }: { view: ChallengeView }) {
  const challengeId = view.challenge.id
  const [plan, setPlan] = useState<PilotPlanInput>(() => defaultPlan(view))
  const set = (patch: Partial<PilotPlanInput>) => setPlan((p) => ({ ...p, ...patch }))
  const setRisk = (id: string, patch: Partial<Risk>) =>
    setPlan((p) => ({ ...p, risks: p.risks.map((r) => (r.id === id ? { ...r, ...patch } : r)) }))
  const addRisk = () =>
    setPlan((p) => ({
      ...p,
      risks: [
        ...p.risks,
        {
          id: `r${Math.max(0, ...p.risks.map((r) => Number(r.id.slice(1)) || 0)) + 1}`,
          risk: '',
          likelihood: 'MEDIUM',
          impact: 'MEDIUM',
          mitigation: '',
          owner: 'Department',
        },
      ],
    }))
  const toggleCheck = (id: string, on: boolean) =>
    setPlan((p) => ({
      ...p,
      securityChecks: on
        ? [...p.securityChecks.filter((c) => c !== id), id]
        : p.securityChecks.filter((c) => c !== id),
    }))

  const gaps = pilotPlanGaps(plan)
  const approve = () =>
    run(() => {
      savePilotPlan(challengeId, plan)
      approvePilotPlan(challengeId)
    }, 'Pilot plan approved. The contract can now be set up.')

  // Approval is a button click only, so Enter in a field cannot approve by accident.
  return (
    <form className="space-y-6" onSubmit={(event) => event.preventDefault()}>
      <p className="text-sm text-muted-foreground">
        The plan is filled in from the selected application and the challenge brief. Check it, edit
        what is needed, then approve. {WHY}
      </p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Field id="plan-scope" label="Pilot scope" className="lg:col-span-2">
          <Textarea
            id="plan-scope"
            value={plan.scope}
            onChange={(e) => set({ scope: e.target.value })}
          />
        </Field>
        <Field id="plan-sites" label="Pilot sites" className="lg:col-span-2">
          <Input
            id="plan-sites"
            value={plan.sites}
            onChange={(e) => set({ sites: e.target.value })}
          />
        </Field>
        <Field id="plan-start" label="Start date">
          <Input
            id="plan-start"
            type="date"
            value={plan.startOn}
            onChange={(e) => set({ startOn: e.target.value })}
          />
        </Field>
        <Field
          id="plan-weeks"
          label="Duration in weeks"
          hint={
            plan.startOn && plan.weeks > 0
              ? `Ends on ${fmtDate(addDays(plan.startOn, plan.weeks * 7))}`
              : undefined
          }
        >
          <Input
            id="plan-weeks"
            type="number"
            min={4}
            value={plan.weeks || ''}
            onChange={(e) => set({ weeks: Number(e.target.value) })}
          />
        </Field>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Sandbox conditions</h3>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <RadioChoice
            id="plan-data"
            legend="Data the startup may use"
            options={DATA_ACCESS_LABELS}
            value={plan.dataAccess}
            onChange={(dataAccess) => set({ dataAccess })}
          />
          <div className="min-w-0 space-y-4">
            <Field id="plan-users" label="User limit">
              <Input
                id="plan-users"
                value={plan.userLimit}
                onChange={(e) => set({ userLimit: e.target.value })}
              />
            </Field>
            <Field id="plan-fallback" label="Fallback if the pilot fails">
              <Textarea
                id="plan-fallback"
                value={plan.fallback}
                onChange={(e) => set({ fallback: e.target.value })}
              />
            </Field>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1 basis-64">
            <h3 className="text-sm font-semibold">
              Cybersecurity checklist ({plan.securityChecks.length} of {SECURITY_CHECKS.length}{' '}
              confirmed)
            </h3>
            <p className="text-xs text-muted-foreground">
              The checklist is a configurable default of the prototype. In real use tick a check
              only after seeing the evidence.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => set({ securityChecks: SECURITY_CHECKS.map((check) => check.id) })}
          >
            Tick all (demo shortcut)
          </Button>
        </div>
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {SECURITY_CHECKS.map((check) => (
            <li key={check.id} className="flex min-w-0 items-start gap-2.5 rounded-lg border p-3">
              <Checkbox
                id={`plan-check-${check.id}`}
                className="mt-0.5"
                checked={plan.securityChecks.includes(check.id)}
                onCheckedChange={(on) => toggleCheck(check.id, on === true)}
              />
              <div className="min-w-0 space-y-0.5">
                <Label htmlFor={`plan-check-${check.id}`} className="leading-snug">
                  {check.label}
                </Label>
                <p className="text-xs text-muted-foreground">{check.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Risk register ({plan.risks.length})</h3>
          <Button type="button" variant="outline" size="sm" onClick={addRisk}>
            <Plus aria-hidden /> Add risk
          </Button>
        </div>
        {plan.risks.length === 0 ? (
          <EmptyState
            title="No risks recorded"
            description="Add at least 2 risks, each with a mitigation and an owner."
            className="py-6"
          />
        ) : (
          <ul className="space-y-3">
            {plan.risks.map((risk, index) => (
              <li key={risk.id} className="min-w-0 space-y-3 rounded-lg border p-3">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Field id={`risk-${risk.id}-text`} label={`Risk ${index + 1}`}>
                    <Textarea
                      id={`risk-${risk.id}-text`}
                      rows={2}
                      value={risk.risk}
                      onChange={(e) => setRisk(risk.id, { risk: e.target.value })}
                    />
                  </Field>
                  <Field id={`risk-${risk.id}-mitigation`} label="Mitigation">
                    <Textarea
                      id={`risk-${risk.id}-mitigation`}
                      rows={2}
                      value={risk.mitigation}
                      onChange={(e) => setRisk(risk.id, { mitigation: e.target.value })}
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-3 lg:grid-cols-[1fr_1fr_1fr_auto]">
                  {(['likelihood', 'impact'] as const).map((field) => (
                    <Field
                      key={field}
                      id={`risk-${risk.id}-${field}`}
                      label={field === 'likelihood' ? 'Likelihood' : 'Impact'}
                      // A gap, not space-y: the select adds a hidden element after its trigger.
                      className="flex flex-col gap-1.5 space-y-0"
                    >
                      <Select
                        value={risk[field]}
                        onValueChange={(level) => setRisk(risk.id, { [field]: level as RiskLevel })}
                      >
                        <SelectTrigger id={`risk-${risk.id}-${field}`} className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LEVELS.map((level) => (
                            <SelectItem key={level} value={level}>
                              {statusLabel(level)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  ))}
                  <Field id={`risk-${risk.id}-owner`} label="Owner">
                    <Input
                      id={`risk-${risk.id}-owner`}
                      value={risk.owner}
                      onChange={(e) => setRisk(risk.id, { owner: e.target.value })}
                    />
                  </Field>
                  <Button
                    type="button"
                    variant="ghost"
                    className="self-end"
                    onClick={() => set({ risks: plan.risks.filter((r) => r.id !== risk.id) })}
                  >
                    <Trash2 aria-hidden /> Remove
                    <span className="sr-only"> risk {index + 1}</span>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Field
        id="plan-gonogo"
        label="Go / no-go check"
        hint="The point in the pilot where the department decides to continue or stop early."
      >
        <Textarea
          id="plan-gonogo"
          value={plan.goNoGo}
          onChange={(e) => set({ goNoGo: e.target.value })}
        />
      </Field>

      {gaps.length > 0 ? (
        <Callout tone="warning" title={`Plan check: ${plural(gaps.length, 'point')} to fix`}>
          <ul className="list-disc space-y-0.5 pl-4">
            {gaps.map((gap) => (
              <li key={gap}>{gap}</li>
            ))}
          </ul>
        </Callout>
      ) : (
        <Callout tone="success" title="Plan check: the plan is complete">
          Approving it moves the challenge to the milestone-based contract.
        </Callout>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" disabled={gaps.length > 0} onClick={approve}>
          Approve pilot plan
        </Button>
        <DoneBy role="department" />
      </div>
    </form>
  )
}

function ApprovedPlan({ pilot, open }: { pilot: PilotPlan; open: boolean }) {
  const confirmed = SECURITY_CHECKS.filter((check) => pilot.securityChecks.includes(check.id))
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{WHY}</p>
      <Facts
        items={[
          { label: 'Scope', value: pilot.scope },
          { label: 'Sites', value: pilot.sites },
          {
            label: 'Start and end',
            value: `${fmtDate(pilot.startOn)} to ${fmtDate(addDays(pilot.startOn, pilot.weeks * 7))} (${plural(pilot.weeks, 'week')})`,
          },
          { label: 'Data the startup may use', value: DATA_ACCESS_LABELS[pilot.dataAccess] },
          { label: 'User limit', value: pilot.userLimit || '-' },
          { label: 'Fallback', value: pilot.fallback },
          { label: 'Go / no-go check', value: pilot.goNoGo },
        ]}
      />
      <details open={open} className="min-w-0 rounded-lg border">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
          Cybersecurity checklist ({confirmed.length} of {SECURITY_CHECKS.length} confirmed) and
          risk register ({plural(pilot.risks.length, 'risk')})
        </summary>
        <div className="space-y-4 border-t p-4">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Cybersecurity checklist</h3>
            <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {SECURITY_CHECKS.map((check) => {
                const done = pilot.securityChecks.includes(check.id)
                return (
                  <li
                    key={check.id}
                    className="flex min-w-0 flex-wrap items-start justify-between gap-2 rounded-lg border p-3"
                  >
                    <div className="min-w-0 flex-1 basis-40">
                      <p className="text-sm font-medium">{check.label}</p>
                      <p className="text-xs text-muted-foreground">{check.detail}</p>
                    </div>
                    <Pill tone={done ? 'success' : 'warning'}>
                      {done ? 'Confirmed' : 'Not confirmed'}
                    </Pill>
                  </li>
                )
              })}
            </ul>
          </div>
          <div className="min-w-0 space-y-2">
            <h3 className="text-sm font-semibold">Risk register</h3>
            {pilot.risks.length === 0 ? (
              <EmptyState title="No risks were recorded for this pilot" className="py-6" />
            ) : (
              <div className="max-w-full min-w-0 overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader className="bg-muted/60">
                    <TableRow>
                      <TableHead>Risk</TableHead>
                      <TableHead>Likelihood</TableHead>
                      <TableHead>Impact</TableHead>
                      <TableHead>Mitigation</TableHead>
                      <TableHead>Owner</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pilot.risks.map((risk) => (
                      <TableRow key={risk.id}>
                        <TableCell className="min-w-48 whitespace-normal">{risk.risk}</TableCell>
                        <TableCell>
                          <StatusBadge status={risk.likelihood} />
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={risk.impact} />
                        </TableCell>
                        <TableCell className="min-w-56 whitespace-normal">
                          {risk.mitigation}
                        </TableCell>
                        <TableCell>{risk.owner}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </details>
    </div>
  )
}

export function PilotDesignPanel({ view }: { view: ChallengeView }) {
  const { challenge, selected, pilot } = view
  const designing = challenge.stage === 'PILOT_DESIGN' && !challenge.outcome
  return (
    <Panel
      title="Pilot design (sandbox)"
      description={
        designing
          ? `Plan the pilot with ${selected?.startup?.name ?? 'the selected startup'} before any work starts.`
          : 'The plan agreed before the pilot started.'
      }
      actions={
        designing ? (
          <DoneBy role="department" />
        ) : (
          pilot?.approved && <Pill tone="success">Approved</Pill>
        )
      }
    >
      {designing && selected ? (
        <PlanForm key={challenge.id} view={view} />
      ) : pilot ? (
        <ApprovedPlan key={challenge.id} pilot={pilot} open={challenge.stage === 'CONTRACT'} />
      ) : (
        <EmptyState
          title="No pilot plan yet"
          description="The pilot plan appears here once a startup is selected and the department approves the plan."
        />
      )}
    </Panel>
  )
}
