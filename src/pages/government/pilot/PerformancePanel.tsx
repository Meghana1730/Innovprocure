// Performance against targets: KPI readings over the pilot weeks, recording new readings,
// and closing the pilot for independent validation.
import { CircleCheck } from 'lucide-react'
import { useState } from 'react'

import { Pill, SyntheticBadge } from '@/components/badges'
import { DoneBy } from '@/components/cards'
import { KpiTrendChart } from '@/components/charts'
import { Panel } from '@/components/headers'
import { ConfirmDialog } from '@/components/overlays'
import { EmptyState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { run } from '@/lib/demo/run'
import type { ChallengeView, KpiReading } from '@/lib/demo/selectors'
import { closePilot, recordMeasurement } from '@/lib/demo/store'
import { fmtNum, fmtPct, plural } from '@/lib/format'
import { Fact, Field } from '@/pages/government/pilot/fields'

/** An example next reading: one fifth of the way further towards the target, never past it. */
function exampleReading({ kpi, value }: KpiReading): string {
  const next = (value ?? kpi.baseline) + (kpi.target - kpi.baseline) * 0.2
  const capped = kpi.better === 'lower' ? Math.max(kpi.target, next) : Math.min(kpi.target, next)
  return String(Math.round(capped * 10) / 10)
}

function ReadingsForm({
  challengeId,
  readings,
  lastWeek,
  pilotWeeks,
}: {
  challengeId: string
  readings: KpiReading[]
  lastWeek: number
  /** Length of the pilot in weeks: readings after the last week are not accepted. */
  pilotWeeks: number | undefined
}) {
  const [week, setWeek] = useState(Math.min(lastWeek + 2, pilotWeeks ?? Infinity))
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(readings.map((r) => [r.kpi.id, exampleReading(r)])),
  )
  return (
    <form
      className="space-y-3 rounded-lg border bg-muted/40 p-4"
      onSubmit={(event) => {
        event.preventDefault()
        const numbers = Object.fromEntries(
          Object.entries(values).map(([id, text]) => [id, text.trim() ? Number(text) : NaN]),
        )
        run(() => {
          if (pilotWeeks && week > pilotWeeks)
            throw new Error(
              `The pilot runs for ${pilotWeeks} weeks. Enter a week from 1 to ${pilotWeeks}.`,
            )
          recordMeasurement(challengeId, week, numbers, 'department')
        }, `KPI readings recorded for week ${week}.`)
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Record readings</h3>
        <DoneBy role="department" />
      </div>
      <p className="text-xs text-muted-foreground">
        The boxes hold example readings so the demo is quick. Replace them with the measured values
        before saving.
        {pilotWeeks ? ` Readings can be recorded for weeks 1 to ${pilotWeeks} of the pilot.` : ''}
      </p>
      <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Field id="reading-week" label="Pilot week">
          <Input
            id="reading-week"
            type="number"
            min={1}
            value={week || ''}
            onChange={(e) => setWeek(Number(e.target.value))}
          />
        </Field>
        {readings.map(({ kpi }) => (
          <Field key={kpi.id} id={`reading-${kpi.id}`} label={`${kpi.name} (${kpi.unit})`}>
            <Input
              id={`reading-${kpi.id}`}
              type="number"
              step="any"
              value={values[kpi.id] ?? ''}
              onChange={(e) => setValues((v) => ({ ...v, [kpi.id]: e.target.value }))}
            />
          </Field>
        ))}
      </div>
      <Button type="submit">Record readings</Button>
    </form>
  )
}

function KpiCard({ reading }: { reading: KpiReading }) {
  const { kpi, value, week, progress, met, series } = reading
  return (
    <li className="min-w-0 space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1 basis-40">
          <h3 className="font-medium">{kpi.name}</h3>
          <p className="text-xs text-muted-foreground">
            Measured in {kpi.unit}. {kpi.better === 'lower' ? 'Lower' : 'Higher'} is better.
          </p>
        </div>
        {value === null ? (
          <Pill>No reading yet</Pill>
        ) : met ? (
          <Pill tone="success" icon={<CircleCheck aria-hidden />}>
            Target met
          </Pill>
        ) : (
          <Pill tone="warning">Not yet met</Pill>
        )}
      </div>
      <dl className="flex flex-wrap gap-x-8 gap-y-2">
        <Fact label="Baseline">{fmtNum(kpi.baseline)}</Fact>
        <Fact label="Target">{fmtNum(kpi.target)}</Fact>
        <Fact label={week === null ? 'Latest' : `Latest (week ${week})`}>{fmtNum(value)}</Fact>
      </dl>
      <div className="space-y-1">
        <p className="flex justify-between gap-2 text-xs text-muted-foreground">
          <span>Progress from baseline to target</span>
          <span className="tabular font-medium text-foreground">{fmtPct(progress)}</span>
        </p>
        <Progress
          value={Math.min(100, progress)}
          className="h-2"
          aria-label={`${kpi.name}: ${progress}% of the way from baseline to target`}
        />
      </div>
      {series.length > 0 ? (
        <KpiTrendChart reading={reading} height={180} />
      ) : (
        <p className="text-sm text-muted-foreground">
          The trend chart appears after the first reading.
        </p>
      )}
    </li>
  )
}

export function PerformancePanel({ view }: { view: ChallengeView }) {
  const { challenge, readings, milestones, pilot } = view
  const [closing, setClosing] = useState(false)

  const live = challenge.stage === 'MEASURE' && !challenge.outcome
  const measured = readings.filter((r) => r.value !== null)
  const lastWeek = Math.max(0, ...readings.map((r) => r.week ?? 0))
  const metCount = readings.filter((r) => r.met).length
  const readingCount = readings.reduce((total, r) => total + r.series.length, 0)
  const notAccepted = milestones.filter((m) => m.status !== 'ACCEPTED')
  const blocked =
    milestones.length === 0 || notAccepted.length > 0
      ? `The pilot can be closed once every milestone is accepted (${plural(notAccepted.length, 'milestone')} still open).`
      : measured.length === 0
        ? 'Record KPI readings before closing the pilot.'
        : null

  return (
    <Panel
      title="Performance against targets"
      description="Readings of each KPI from the challenge brief, against its baseline and target."
      actions={<SyntheticBadge />}
    >
      {readings.length === 0 ? (
        <EmptyState
          title="No KPIs in the brief"
          description="KPI readings appear here when the challenge brief sets measurable outcomes."
        />
      ) : (
        <div className="space-y-5">
          <p className="text-sm font-medium">
            {measured.length > 0
              ? `${metCount} of ${plural(readings.length, 'target')} met at week ${lastWeek}.`
              : 'No readings recorded yet. Each KPI shows its trend here after the first reading.'}
          </p>
          <ul className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {readings.map((reading) => (
              <KpiCard key={reading.kpi.id} reading={reading} />
            ))}
          </ul>

          {live && (
            <>
              <ReadingsForm
                key={`${challenge.id}-${readingCount}`}
                challengeId={challenge.id}
                readings={readings}
                lastWeek={lastWeek}
                pilotWeeks={pilot?.weeks}
              />
              <div className="flex flex-wrap items-center gap-3 border-t pt-4">
                <Button disabled={blocked !== null} onClick={() => setClosing(true)}>
                  Close pilot and send for validation
                </Button>
                <DoneBy role="department" />
                {blocked && <p className="min-w-0 text-sm text-muted-foreground">{blocked}</p>}
              </div>
              <ConfirmDialog
                open={closing}
                onOpenChange={setClosing}
                title="Close the pilot?"
                description="No more readings or milestones can be added. The results go to the independent validator, who confirms them before the scale-up decision."
                confirmLabel="Close pilot"
                onConfirm={() => {
                  run(
                    () => closePilot(challenge.id),
                    'Pilot closed and sent for independent validation.',
                  )
                  setClosing(false)
                }}
              />
            </>
          )}
        </div>
      )}
    </Panel>
  )
}
