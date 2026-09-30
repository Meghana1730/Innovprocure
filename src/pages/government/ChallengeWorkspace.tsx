// One challenge, end to end: where it is in the pathway, who acts next, and the working tabs.
// Shown on the government dashboard for the selected challenge.
import { Building2, CalendarDays, MapPin, Wallet } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { RoleBadge, StageBadge, SyntheticBadge } from '@/components/badges'
import { Callout } from '@/components/cards'
import { StageTracker } from '@/components/pathway'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { dashboardOf, taskLink, type ChallengeTab, type ChallengeView } from '@/lib/demo/selectors'
import { setActingStartup } from '@/lib/demo/store'
import { SECTOR_LABELS, STAGE_INFO } from '@/lib/domain/policy'
import { fmtDate, fmtLakh, today } from '@/lib/format'
import { AuditTab } from '@/pages/government/AuditTab'
import { BriefTab } from '@/pages/government/BriefTab'
import { OutcomeTab } from '@/pages/government/OutcomeTab'
import { PilotTab } from '@/pages/government/PilotTab'
import { StartupsTab } from '@/pages/government/StartupsTab'

const TABS: { id: ChallengeTab; label: string }[] = [
  { id: 'brief', label: 'Challenge brief' },
  { id: 'startups', label: 'Startups and evaluation' },
  { id: 'pilot', label: 'Pilot and payments' },
  { id: 'outcome', label: 'Validation and decision' },
  { id: 'audit', label: 'Audit trail' },
]

const OTHER_DASHBOARD = { startup: 'Startup dashboard', experts: 'Expert dashboard' } as const

export function ChallengeWorkspace({ view }: { view: ChallengeView }) {
  const { challenge, department, next } = view
  const [params, setParams] = useSearchParams()
  const requested = params.get('tab') as ChallengeTab | null
  // Without ?tab= the workspace opens on the tab where the next step happens. That tab is fixed
  // while the challenge stays open (the page gives this component a key), so the view does not
  // jump to another tab after an action.
  const [openedOn] = useState<ChallengeTab>(() => next?.tab ?? 'outcome')
  const tab = TABS.some((t) => t.id === requested) ? requested! : openedOn
  const openTab = (value: string) => {
    const nextParams = new URLSearchParams(params)
    nextParams.set('tab', value)
    setParams(nextParams, { replace: true })
  }
  const elsewhere = next ? dashboardOf(next.role) : 'government'

  return (
    <section aria-label={`Challenge ${challenge.code}`} className="min-w-0 space-y-4">
      <header className="min-w-0 space-y-1.5">
        <p className="text-xs font-semibold tracking-wider text-primary uppercase">
          {challenge.code} · {SECTOR_LABELS[challenge.sector]}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            {challenge.title}
          </h2>
          <StageBadge challenge={challenge} />
          <SyntheticBadge />
        </div>
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Building2 className="size-3.5" aria-hidden /> {department?.name ?? 'Department'}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-3.5" aria-hidden /> {challenge.district}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Wallet className="size-3.5" aria-hidden /> Pilot ceiling{' '}
            {fmtLakh(challenge.brief.budgetCeilingLakh)}
          </span>
          {challenge.closesOn && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-3.5" aria-hidden />{' '}
              {challenge.stage === 'DISCOVER'
                ? `Call closes ${fmtDate(challenge.closesOn)}`
                : challenge.closesOn > today()
                  ? 'Call closed early'
                  : `Call closed ${fmtDate(challenge.closesOn)}`}
            </span>
          )}
        </p>
      </header>

      <div className="min-w-0 rounded-xl border bg-card p-4 shadow-xs">
        <StageTracker challenge={challenge} />
        <p className="mt-3 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{STAGE_INFO[challenge.stage].label}:</span>{' '}
          {STAGE_INFO[challenge.stage].what}
        </p>
      </div>

      {next ? (
        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-primary/30 bg-accent px-4 py-3">
          <p className="flex flex-wrap items-center gap-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Next step <RoleBadge role={next.role} prefix="Done by:" />
          </p>
          <p className="min-w-0 flex-1 basis-full font-medium sm:basis-0">{next.label}</p>
          {elsewhere !== 'government' ? (
            <Button asChild size="sm" variant="outline">
              <Link
                to={taskLink(next.role, challenge.id, next.tab)}
                // The Startup dashboard opens for the startup that runs this pilot.
                onClick={() => {
                  if (next.role === 'startup' && view.selected)
                    setActingStartup(view.selected.startupId)
                }}
              >
                Open the {OTHER_DASHBOARD[elsewhere]}
              </Link>
            </Button>
          ) : (
            tab !== next.tab && (
              <Button size="sm" variant="outline" onClick={() => openTab(next.tab)}>
                Go to {TABS.find((t) => t.id === next.tab)?.label}
              </Button>
            )
          )}
        </div>
      ) : (
        <Callout
          tone={challenge.outcome === 'SCALED' ? 'success' : 'warning'}
          title="This challenge is closed"
        >
          {challenge.outcome === 'SCALED'
            ? 'The validated solution is being procured and rolled out. See "Validation and decision" for the pathway and plan.'
            : 'See "Validation and decision" for the decision and its reasons.'}
        </Callout>
      )}

      <Tabs value={tab} onValueChange={openTab} className="max-w-full min-w-0">
        <TabsList className="max-w-full flex-wrap justify-start gap-1 group-data-horizontal/tabs:h-auto">
          {TABS.map((t) => (
            <TabsTrigger key={t.id} value={t.id} className="min-h-9 flex-none sm:min-h-0">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="brief" className="mt-4">
          <BriefTab view={view} />
        </TabsContent>
        <TabsContent value="startups" className="mt-4">
          <StartupsTab view={view} />
        </TabsContent>
        <TabsContent value="pilot" className="mt-4">
          <PilotTab view={view} />
        </TabsContent>
        <TabsContent value="outcome" className="mt-4">
          <OutcomeTab view={view} />
        </TabsContent>
        <TabsContent value="audit" className="mt-4">
          <AuditTab view={view} />
        </TabsContent>
      </Tabs>
    </section>
  )
}
