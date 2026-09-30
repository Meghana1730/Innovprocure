// The independent validator's report for one closed pilot: how the results were checked,
// the value confirmed for each KPI, the findings and the verdict.
import { useState } from 'react'

import { Pill, StatusBadge } from '@/components/badges'
import { Callout } from '@/components/cards'
import { EmptyState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { run } from '@/lib/demo/run'
import { challengeView } from '@/lib/demo/selectors'
import { submitValidation, useDemoState } from '@/lib/demo/store'
import { kpiMet } from '@/lib/domain/rules'
import type { ValidationVerdict } from '@/lib/domain/types'
import { fmtNum } from '@/lib/format'
import { cn } from '@/lib/utils'
import { KpiResult } from '@/pages/experts/KpiTable'

const DEFAULT_METHOD =
  'Checked the system logs against the department records, measured a sample again at the pilot sites, and interviewed the staff who used the solution.'

const VERDICTS: { value: ValidationVerdict; meaning: string }[] = [
  { value: 'VALIDATED', meaning: 'The confirmed values meet every target.' },
  { value: 'PARTLY_VALIDATED', meaning: 'Some targets are met, some are not.' },
  { value: 'NOT_VALIDATED', meaning: 'No target is met, or the results could not be confirmed.' },
]

export function ValidationForm({
  challengeId,
  onDone,
}: {
  challengeId: string
  onDone: () => void
}) {
  const state = useDemoState()
  const view = challengeView(state, challengeId)
  const [method, setMethod] = useState(DEFAULT_METHOD)
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (view?.readings ?? []).map((r) => [r.kpi.id, r.value === null ? '' : String(r.value)]),
    ),
  )
  // null = follow the draft and the verdict worked out from the confirmed values.
  const [findings, setFindings] = useState<string | null>(null)
  const [verdict, setVerdict] = useState<ValidationVerdict | null>(null)

  if (!view) return <EmptyState title="This challenge is no longer available" />
  const { readings } = view

  const confirmed: Record<string, number> = Object.fromEntries(
    readings.map(({ kpi }) => [kpi.id, values[kpi.id]?.trim() ? Number(values[kpi.id]) : NaN]),
  )
  const isMet = (id: string) => {
    const reading = readings.find((r) => r.kpi.id === id)
    return !!reading && Number.isFinite(confirmed[id]) && kpiMet(reading.kpi, confirmed[id])
  }
  const met = readings.filter((r) => isMet(r.kpi.id)).length
  const suggested: ValidationVerdict =
    readings.length > 0 && met === readings.length
      ? 'VALIDATED'
      : met === 0
        ? 'NOT_VALIDATED'
        : 'PARTLY_VALIDATED'
  const draft = [
    `${met} of ${readings.length} KPIs meet the target on the confirmed values.`,
    ...readings
      .filter(({ kpi }) => Number.isFinite(confirmed[kpi.id]))
      .map(({ kpi, value }) => {
        const differs = value !== null && value !== confirmed[kpi.id]
        return `${kpi.name}: confirmed ${fmtNum(confirmed[kpi.id])} ${kpi.unit} against a target of ${fmtNum(kpi.target)} (${isMet(kpi.id) ? 'met' : 'not met'}${differs ? `; the pilot reported ${fmtNum(value)}` : ''}).`
      }),
  ].join(' ')
  const chosen = verdict ?? suggested

  const submit = () => {
    if (
      run(
        () =>
          submitValidation(challengeId, {
            method,
            confirmed,
            findings: findings ?? draft,
            verdict: chosen,
          }),
        'Validation report submitted',
      )
    ) {
      onDone()
    }
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor="validation-method">How the results were checked</Label>
        <Textarea
          id="validation-method"
          value={method}
          onChange={(event) => setMethod(event.target.value)}
        />
        <p className="text-xs text-muted-foreground">An example is filled in. Edit it as needed.</p>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Confirmed value for each KPI</h3>
        <p className="text-sm text-muted-foreground">
          Each field starts with the value reported in the pilot. Replace it with the value you
          confirmed yourself.
        </p>
        {readings.map(({ kpi, value, week }) => {
          const id = `confirmed-${kpi.id}`
          return (
            <div
              key={kpi.id}
              className="grid min-w-0 grid-cols-1 gap-x-4 gap-y-2 rounded-lg border p-3 sm:grid-cols-[minmax(0,1fr)_8rem] sm:items-center"
            >
              <div className="min-w-0 space-y-1">
                <Label htmlFor={id} className="leading-snug">
                  {kpi.name} ({kpi.unit})
                </Label>
                <p className="text-sm text-muted-foreground">
                  Baseline {fmtNum(kpi.baseline)}, target {fmtNum(kpi.target)}, {kpi.better} is
                  better.{' '}
                  {value === null
                    ? 'No value was reported.'
                    : `Reported: ${fmtNum(value)} in week ${week}.`}
                </p>
                <KpiResult kpi={kpi} value={confirmed[kpi.id]} />
              </div>
              <Input
                id={id}
                type="number"
                step="any"
                inputMode="decimal"
                className="tabular"
                value={values[kpi.id] ?? ''}
                onChange={(event) => setValues({ ...values, [kpi.id]: event.target.value })}
              />
            </div>
          )
        })}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="validation-findings">Findings</Label>
        <Textarea
          id="validation-findings"
          value={findings ?? draft}
          onChange={(event) => setFindings(event.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          {findings === null
            ? 'A draft is written from the confirmed values. Edit it to add what you found.'
            : 'You have edited the findings. They no longer follow the confirmed values.'}
        </p>
      </div>

      <fieldset className="min-w-0 space-y-2">
        <legend className="text-sm font-semibold">Verdict</legend>
        <RadioGroup
          aria-label="Verdict"
          value={chosen}
          onValueChange={(value) => setVerdict(value as ValidationVerdict)}
        >
          {VERDICTS.map((option) => {
            const id = `verdict-${option.value}`
            return (
              <Label
                key={option.value}
                htmlFor={id}
                className={cn(
                  'cursor-pointer flex-wrap rounded-lg border px-3 py-2.5 font-normal',
                  chosen === option.value && 'border-primary bg-accent',
                )}
              >
                <RadioGroupItem id={id} value={option.value} />
                <StatusBadge status={option.value} />
                <span className="min-w-0 leading-snug text-muted-foreground">{option.meaning}</span>
                {suggested === option.value && <Pill tone="primary">Suggested</Pill>}
              </Label>
            )
          })}
        </RadioGroup>
        <p className="text-xs text-muted-foreground">
          The suggestion comes from how many confirmed values meet their target ({met} of{' '}
          {readings.length}). The validator decides.
        </p>
      </fieldset>

      <Callout tone="info">
        The report is recorded in the audit trail. After it, the department decides on the
        Government dashboard: scale, extend or stop.
      </Callout>

      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit">Submit validation report</Button>
      </div>
    </form>
  )
}
