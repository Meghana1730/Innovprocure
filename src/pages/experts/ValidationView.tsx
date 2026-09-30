// Validation tab of the expert dashboard: closed pilots waiting for the independent validator,
// and the validation reports already submitted.
import { ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { StatusBadge, SyntheticBadge } from '@/components/badges'
import { Callout, DoneBy, Facts, NextStep } from '@/components/cards'
import { Panel } from '@/components/headers'
import { Drawer } from '@/components/overlays'
import { EmptyState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { challengeView, openTasks, taskLink, type ChallengeView } from '@/lib/demo/selectors'
import { useDemoState } from '@/lib/demo/store'
import { fmtDate, plural } from '@/lib/format'
import { KpiTable } from '@/pages/experts/KpiTable'
import { toValidate } from '@/pages/experts/queues'
import { ValidationForm } from '@/pages/experts/ValidationForm'

export function ValidationView() {
  const state = useDemoState()
  const [drawer, setDrawer] = useState({ id: '', open: false })
  const views = (ids: string[]) =>
    ids.map((id) => challengeView(state, id)).filter((v): v is ChallengeView => v !== null)

  const waiting = views(toValidate(state).map((c) => c.id))
  const running = state.challenges.filter((c) => c.stage === 'MEASURE' && !c.outcome)
  const toDecide = openTasks(state, 'department').filter((t) => t.challenge.stage === 'DECIDE')
  const reports = views(
    [...state.validations]
      .sort((a, b) => b.reportedOn.localeCompare(a.reportedOn))
      .map((v) => v.challengeId),
  )
  const drawerChallenge = state.challenges.find((c) => c.id === drawer.id)

  return (
    <div className="min-w-0 space-y-4">
      <Callout tone="info" icon={<ShieldCheck aria-hidden />} title="Independent of both sides">
        The validator is independent of both the department and the startup. The department cannot
        decide on scale-up before this report.
      </Callout>

      {toDecide.map((task) => (
        <NextStep
          key={task.challenge.id}
          role={task.role}
          label={`${task.challenge.code}: ${task.label}`}
          hint="The validation report is in. This step is taken on the Government dashboard."
          to={task.to}
        />
      ))}

      <Panel
        title="Pilots waiting for validation"
        description="Closed pilots whose measured results have to be confirmed by the validator."
        actions={<SyntheticBadge />}
        bodyClassName="space-y-4"
      >
        {waiting.length === 0 ? (
          <EmptyState
            title="No pilot is waiting for validation"
            description={`A pilot appears here after the department closes it on the Government dashboard. To close a pilot, all its milestones must be accepted and KPI readings recorded. ${plural(running.length, 'pilot is', 'pilots are')} still running.`}
            action={
              running.length > 0 && (
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="h-auto max-w-full py-1.5 whitespace-normal"
                >
                  <Link to={taskLink('department', running[0].id, 'pilot')}>
                    Open {running[0].code} on the Government dashboard
                  </Link>
                </Button>
              )
            }
          />
        ) : (
          waiting.map(({ challenge, department, selected, pilot, readings }) => (
            <article key={challenge.id} className="min-w-0 space-y-4 rounded-lg border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold">
                    {challenge.code}: {challenge.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {department?.name ?? 'Department'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <DoneBy role="validator" />
                  <Button
                    size="sm"
                    aria-label={`Validate ${challenge.code}`}
                    onClick={() => setDrawer({ id: challenge.id, open: true })}
                  >
                    Validate
                  </Button>
                </div>
              </div>
              <Facts
                items={[
                  { label: 'Startup', value: selected?.startup?.name ?? 'Not selected' },
                  { label: 'Pilot sites', value: pilot?.sites ?? challenge.brief.pilotSites },
                ]}
              />
              <KpiTable
                caption={`KPI values reported in the pilot of ${challenge.code}`}
                valueLabel="Latest reported"
                rows={readings.map((r) => ({
                  kpi: r.kpi,
                  value: r.value,
                  note: r.week === null ? undefined : `Week ${r.week}`,
                }))}
              />
            </article>
          ))
        )}
      </Panel>

      <Panel
        title="Validation reports"
        description="Reports already submitted, with the confirmed values against the targets."
        actions={<SyntheticBadge />}
        bodyClassName="space-y-4"
      >
        {reports.length === 0 ? (
          <EmptyState
            title="No validation report yet"
            description="A report is listed here as soon as the validator submits it for a closed pilot."
          />
        ) : (
          reports.map(({ challenge, selected, validation }) =>
            validation ? (
              <article key={challenge.id} className="min-w-0 space-y-4 rounded-lg border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold">
                      {challenge.code}: {challenge.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Reported on {fmtDate(validation.reportedOn)}
                    </p>
                  </div>
                  <StatusBadge status={validation.verdict} />
                </div>
                <Facts
                  items={[
                    { label: 'Startup', value: selected?.startup?.name ?? 'Not selected' },
                    {
                      label: 'Validator',
                      value: `${validation.validator}, ${validation.organisation}`,
                    },
                    { label: 'How it was checked', value: validation.method },
                    { label: 'Findings', value: validation.findings },
                  ]}
                />
                <KpiTable
                  caption={`Values confirmed by the validator for ${challenge.code}`}
                  valueLabel="Confirmed"
                  rows={challenge.brief.kpis.map((kpi) => ({
                    kpi,
                    value: validation.confirmed[kpi.id] ?? null,
                  }))}
                />
              </article>
            ) : null,
          )
        )}
      </Panel>

      <Drawer
        open={drawer.open}
        onOpenChange={(open) => setDrawer((d) => ({ ...d, open }))}
        title="Validation report"
        description={
          drawerChallenge ? `${drawerChallenge.code}: ${drawerChallenge.title}` : undefined
        }
      >
        {drawer.id && (
          <ValidationForm
            key={drawer.id}
            challengeId={drawer.id}
            onDone={() => setDrawer((d) => ({ ...d, open: false }))}
          />
        )}
      </Drawer>
    </div>
  )
}
