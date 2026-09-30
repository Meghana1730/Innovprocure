// Open calls the acting startup can apply to, with a transparent match, and the application form.
import { Building2, CalendarDays, MapPin, Send, Sparkles, Wallet } from 'lucide-react'
import { useState } from 'react'

import { Pill, StatusBadge } from '@/components/badges'
import { Panel } from '@/components/headers'
import { Drawer } from '@/components/overlays'
import { EmptyState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { run } from '@/lib/demo/run'
import { departmentOf } from '@/lib/demo/selectors'
import { submitApplication } from '@/lib/demo/store'
import { SECTOR_LABELS } from '@/lib/domain/policy'
import { matchStartups } from '@/lib/domain/rules'
import type { Challenge, DemoState, Startup } from '@/lib/domain/types'
import { fmtDate, fmtLakh, fmtNum } from '@/lib/format'
import { isOpenCall } from '@/pages/startup/helpers'

export function OpenCalls({
  state,
  startup,
  onApply,
}: {
  state: DemoState
  startup: Startup
  onApply: (challengeId: string) => void
}) {
  const calls = state.challenges.filter(isOpenCall)
  return (
    <Panel
      title="Open calls"
      description="Challenges published by departments that are accepting applications now. The match is a plain sector and keyword check, not AI."
    >
      {calls.length === 0 ? (
        <EmptyState
          title="No open calls right now"
          description="When the innovation cell publishes a challenge, it shows here with its budget ceiling and closing date."
        />
      ) : (
        <ul className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {calls.map((challenge) => {
            const match = matchStartups(challenge, [startup])[0]
            const applied = state.applications.find(
              (a) => a.challengeId === challenge.id && a.startupId === startup.id,
            )
            const invited = challenge.invitedStartupIds.includes(startup.id)
            return (
              <li key={challenge.id} className="min-w-0 space-y-3 rounded-lg border p-4">
                <div className="space-y-1">
                  <p className="flex flex-wrap items-center gap-2 text-xs font-semibold tracking-wider text-primary uppercase">
                    {challenge.code} · {SECTOR_LABELS[challenge.sector]}
                    {invited && <Pill tone="primary">Invited</Pill>}
                  </p>
                  <h3 className="font-semibold text-foreground">{challenge.title}</h3>
                </div>
                <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Building2 className="size-3.5" aria-hidden />
                    {departmentOf(challenge.departmentId)?.name ?? 'Department'}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-3.5" aria-hidden /> {challenge.district}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Wallet className="size-3.5" aria-hidden /> Ceiling{' '}
                    {fmtLakh(challenge.brief.budgetCeilingLakh)}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="size-3.5" aria-hidden /> Closes{' '}
                    {fmtDate(challenge.closesOn)}
                  </span>
                </p>
                <div className="rounded-md bg-muted/60 px-3 py-2 text-sm">
                  {match ? (
                    <>
                      <p className="font-medium text-foreground">
                        Match for this startup: {match.score} of 100
                      </p>
                      <ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted-foreground">
                        {match.reasons.map((reason) => (
                          <li key={reason}>{reason}</li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <p className="text-muted-foreground">
                      This challenge is outside the sectors of this startup. It may still apply.
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {applied ? (
                    <>
                      <Pill tone="info">Applied on {fmtDate(applied.submittedOn)}</Pill>
                      <StatusBadge status={applied.status} />
                    </>
                  ) : (
                    <Button onClick={() => onApply(challenge.id)}>
                      <Send aria-hidden /> Apply
                    </Button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}

/** The brief in short and the application form. Mount it with a key per challenge and startup. */
export function ApplyDrawer({
  challenge,
  startup,
  onClose,
}: {
  challenge: Challenge
  startup: Startup
  onClose: () => void
}) {
  const { brief } = challenge
  const [approach, setApproach] = useState('')
  const [claimed, setClaimed] = useState('')
  const [quote, setQuote] = useState('')
  const [weeks, setWeeks] = useState(String(brief.pilotWeeks))

  const fillExample = () => {
    setApproach(
      `${startup.summary} For this challenge we will work at ${brief.pilotSites} for ${brief.pilotWeeks} weeks, using ${startup.technologies.join(', ')}. We will report ${brief.kpis.map((k) => k.name.toLowerCase()).join(', ')} against the baseline at every milestone.`,
    )
    setClaimed(
      'Example text for the demo: results of earlier trials and two customer references can be shared with the department on request.',
    )
    setQuote(String(Math.round(brief.budgetCeilingLakh * 0.92 * 10) / 10))
    setWeeks(String(brief.pilotWeeks))
  }

  const submit = () => {
    const ok = run(
      () =>
        submitApplication(challenge.id, startup.id, {
          approach,
          claimedResults: claimed,
          quoteLakh: Number(quote),
          weeks: Number(weeks),
        }),
      `Application submitted to ${challenge.code}`,
    )
    if (ok) onClose()
  }

  return (
    <Drawer
      open
      onOpenChange={(open) => !open && onClose()}
      title={`Apply: ${challenge.title}`}
      description={`${challenge.code}, ${departmentOf(challenge.departmentId)?.name ?? 'Department'}. Applying as ${startup.name}.`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit}>
            <Send aria-hidden /> Submit application
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <section className="space-y-3 text-sm">
          <h3 className="font-semibold text-foreground">The challenge in short</h3>
          <p className="text-muted-foreground">{brief.problem}</p>
          <div>
            <p className="font-medium text-foreground">Outcomes the pilot must show</p>
            <ul className="mt-1 divide-y rounded-lg border">
              {brief.kpis.map((kpi) => (
                <li key={kpi.id} className="flex flex-wrap justify-between gap-x-4 gap-y-1 p-2.5">
                  <span className="min-w-0">{kpi.name}</span>
                  <span className="tabular text-muted-foreground">
                    {fmtNum(kpi.baseline)} to {fmtNum(kpi.target)} {kpi.unit}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">Constraints: </span>
            {brief.constraints || 'None stated.'}
          </p>
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">Pilot: </span>
            {brief.pilotSites}, {brief.pilotWeeks} weeks.
          </p>
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground">Your application</h3>
            <Button variant="outline" size="sm" onClick={fillExample}>
              <Sparkles aria-hidden /> Fill with an example
            </Button>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="apply-approach">Your approach</Label>
            <Textarea
              id="apply-approach"
              rows={5}
              value={approach}
              onChange={(e) => setApproach(e.target.value)}
              placeholder="What you will do, where, and how it moves the outcomes above."
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="apply-claimed">Results or evidence so far</Label>
            <Textarea
              id="apply-claimed"
              rows={3}
              value={claimed}
              onChange={(e) => setClaimed(e.target.value)}
              placeholder="Earlier trials, customers or test results. Prior government work is not required."
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="apply-quote">Pilot cost you quote (Rs lakh)</Label>
              <Input
                id="apply-quote"
                type="number"
                inputMode="decimal"
                min={0}
                step={0.1}
                value={quote}
                onChange={(e) => setQuote(e.target.value)}
                aria-describedby="apply-quote-hint"
              />
              <p id="apply-quote-hint" className="text-xs text-muted-foreground">
                Budget ceiling: {fmtLakh(brief.budgetCeilingLakh)}. A quote above the ceiling is
                sent back or rejected at screening.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="apply-weeks">Pilot duration (weeks)</Label>
              <Input
                id="apply-weeks"
                type="number"
                inputMode="numeric"
                min={4}
                step={1}
                value={weeks}
                onChange={(e) => setWeeks(e.target.value)}
                aria-describedby="apply-weeks-hint"
              />
              <p id="apply-weeks-hint" className="text-xs text-muted-foreground">
                The department planned {brief.pilotWeeks} weeks.
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            No minimum turnover and no prior government work are asked for. After the call closes,
            the innovation cell screens every application against the published rules and records a
            reason for each result.
          </p>
        </section>
      </div>
    </Drawer>
  )
}
