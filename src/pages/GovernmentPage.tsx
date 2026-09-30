// The government dashboard: department officers, the innovation cell and finance.
// Programme numbers, the steps waiting for an officer, and the whole pathway of every challenge.
import {
  BadgeCheck,
  CalendarClock,
  ChevronRight,
  FolderKanban,
  Plus,
  Rocket,
  Scale,
  Timer,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { RoleBadge, SyntheticBadge } from '@/components/badges'
import { DoneBy, MetricCard } from '@/components/cards'
import { PageHeader, Panel } from '@/components/headers'
import { EmptyState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { challengeView, dashboardTasks, programmeStats } from '@/lib/demo/selectors'
import { useDemoState } from '@/lib/demo/store'
import { POLICY } from '@/lib/domain/policy'
import { fmtLakh, fmtPct, plural } from '@/lib/format'
import { sortChallenges } from '@/pages/government/challenge-order'
import { ChallengeList } from '@/pages/government/ChallengeList'
import { ChallengeWorkspace } from '@/pages/government/ChallengeWorkspace'
import { NewChallengeDrawer } from '@/pages/government/NewChallengeDrawer'
import { PaymentsPanel } from '@/pages/government/PaymentsPanel'
import { TemplatesPanel } from '@/pages/government/TemplatesPanel'

const SECTIONS = [
  { id: 'pathway', label: 'Challenges and pathway' },
  { id: 'payments', label: 'Payments' },
  { id: 'templates', label: 'Templates and rules' },
] as const

export default function GovernmentPage() {
  const state = useDemoState()
  const [params, setParams] = useSearchParams()
  const [drafting, setDrafting] = useState(false)
  const workspaceRef = useRef<HTMLDivElement>(null)

  const stats = programmeStats(state)
  const tasks = dashboardTasks(state, 'government')
  // Every pilot with a milestone to deliver, for any startup (not only the one acted as).
  const startupSteps = state.challenges.filter(
    (c) =>
      c.stage === 'MEASURE' &&
      !c.outcome &&
      state.milestones.some((m) => m.challengeId === c.id && m.status === 'PLANNED'),
  ).length
  const expertSteps = dashboardTasks(state, 'experts').length
  const verdicts = (verdict: string) =>
    state.validations.filter((v) => v.verdict === verdict).length

  const section = SECTIONS.find((s) => s.id === params.get('view'))?.id ?? 'pathway'
  // The default selection is fixed when the page opens, so it does not jump after an action.
  const [initialId] = useState(
    () => state.challenges.find((c) => tasks.some((t) => t.challenge.id === c.id))?.id,
  )
  const selectedId =
    [params.get('c'), initialId].find((id) => state.challenges.some((c) => c.id === id)) ??
    state.challenges[0]?.id
  const view = challengeView(state, selectedId)

  // Every change keeps the other search params.
  const openSection = (value: string) => {
    const next = new URLSearchParams(params)
    next.set('view', value)
    setParams(next, { replace: true })
  }
  const selectChallenge = (id: string, showPathway = false) => {
    const next = new URLSearchParams(params)
    next.set('c', id)
    next.delete('tab')
    if (showPathway) next.set('view', 'pathway')
    setParams(next)
  }
  const showWorkspace = () =>
    requestAnimationFrame(() =>
      workspaceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    )

  return (
    <>
      <PageHeader
        eyebrow="Innovation procurement pathway"
        title="Government dashboard"
        description="For department officers, the innovation cell and finance: every challenge from problem statement to scale-up decision, and who has to act next."
        badges={<SyntheticBadge />}
        actions={
          <>
            <DoneBy role="department" />
            <Button onClick={() => setDrafting(true)}>
              <Plus aria-hidden /> New challenge
            </Button>
          </>
        }
      />

      <div className="min-w-0 space-y-6">
        <section aria-label="Programme numbers" className="min-w-0">
          {/* Two columns on phones: smaller cards without the hint line, so the waiting steps
              come sooner. The label row has one height, so the values line up in a row. */}
          <div className="grid grid-cols-2 gap-3 max-sm:*:p-4 sm:gap-4 xl:grid-cols-4 [&>div>div:first-child]:min-h-10 max-sm:[&>div>p:last-child]:hidden max-sm:[&_.text-3xl]:text-2xl">
            <MetricCard
              label="Active challenges"
              value={stats.active}
              hint={`${plural(stats.challenges, 'challenge')} in all, ${plural(stats.pilotsStarted, 'pilot')} contracted`}
              icon={<FolderKanban aria-hidden />}
            />
            <MetricCard
              label="Startups engaged"
              value={stats.startupsEngaged}
              hint={`${plural(stats.applications, 'application')} received`}
              icon={<Rocket aria-hidden />}
              tone="info"
            />
            <MetricCard
              label="Days from publishing to pilot start"
              value={stats.daysToPilot ?? '-'}
              hint="Median of the pilots started. Measures faster discovery and testing."
              icon={<Timer aria-hidden />}
              tone="info"
            />
            <MetricCard
              label="Payments on time"
              value={fmtPct(stats.paidOnTimePct)}
              hint={`Average ${stats.avgPaymentDays ?? '-'} days against a target of ${POLICY.paymentTargetDays}. Measures timely startup payments.`}
              icon={<CalendarClock aria-hidden />}
              tone={stats.overduePayments ? 'warning' : 'success'}
            />
            <MetricCard
              label="Contracted for pilots"
              value={fmtLakh(stats.contractedLakh)}
              hint={`${fmtLakh(stats.paidLakh)} paid against milestones, ${
                stats.pendingLakh > 0
                  ? `${fmtLakh(stats.pendingLakh)} waiting for payment`
                  : 'no payment waiting'
              }`}
              icon={<Wallet aria-hidden />}
            />
            <MetricCard
              label="Pilots validated"
              value={verdicts('VALIDATED')}
              hint={`Of ${plural(state.validations.length, 'independent validation report')}: ${verdicts('PARTLY_VALIDATED')} partly validated, ${verdicts('NOT_VALIDATED')} not validated. Measures evidence-based decisions.`}
              icon={<BadgeCheck aria-hidden />}
              tone="success"
            />
            <MetricCard
              label="Scaled / stopped"
              value={`${stats.scaled} / ${stats.stopped}`}
              hint="Decided on pilot evidence. Stopping after a small pilot limits departmental risk."
              icon={<Scale aria-hidden />}
            />
            <MetricCard
              label="Scale-up value planned"
              value={fmtLakh(stats.scaleUpLakh)}
              hint="Measures scaling across departments or districts."
              icon={<TrendingUp aria-hidden />}
              tone="success"
            />
          </div>
        </section>

        <Panel
          title="Waiting for government officers"
          description="Each step shows which officer takes it. Select a step to open the challenge at the right place."
          actions={<SyntheticBadge />}
          bodyClassName="space-y-3"
        >
          {tasks.length === 0 ? (
            <EmptyState
              title="Nothing is waiting for an officer"
              description="Steps appear here when a challenge needs the department, the innovation cell or finance."
            />
          ) : (
            <ul className="grid grid-cols-1 gap-2 xl:grid-cols-2">
              {tasks.map((task) => (
                <li key={`${task.challenge.id}-${task.role}-${task.label}`} className="min-w-0">
                  <Link
                    to={task.to}
                    onClick={showWorkspace}
                    className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border px-3 py-2.5 hover:bg-muted/60"
                  >
                    <RoleBadge role={task.role} />
                    <span className="min-w-0 flex-1 basis-48">
                      <span className="block text-sm font-medium text-foreground">
                        {task.label}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {task.challenge.code}: {task.challenge.title}
                      </span>
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-muted-foreground">
            Steps waiting on the other dashboards:{' '}
            <Link
              to="/startup"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {plural(startupSteps, 'step')} on the Startup dashboard
            </Link>
            ,{' '}
            <Link
              to="/experts"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {plural(expertSteps, 'step')} on the Expert dashboard
            </Link>
            .
          </p>
        </Panel>

        <div ref={workspaceRef} className="min-w-0 scroll-mt-20">
          <Tabs value={section} onValueChange={openSection} className="max-w-full min-w-0 gap-4">
            <TabsList className="max-w-full flex-wrap justify-start gap-1 group-data-horizontal/tabs:h-auto">
              {SECTIONS.map((s) => (
                <TabsTrigger key={s.id} value={s.id} className="min-h-9 flex-none sm:min-h-0">
                  {s.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="pathway" className="min-w-0">
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
                {/* Phones and tablets: a select above the workspace. Wide screens: the list. */}
                <div className="min-w-0 space-y-1.5 xl:hidden">
                  <Label htmlFor="gov-challenge">Challenge</Label>
                  <Select value={selectedId ?? ''} onValueChange={(id) => selectChallenge(id)}>
                    <SelectTrigger
                      id="gov-challenge"
                      className="w-full min-w-0 *:data-[slot=select-value]:block *:data-[slot=select-value]:truncate"
                    >
                      <SelectValue placeholder="Choose a challenge" />
                    </SelectTrigger>
                    <SelectContent>
                      {sortChallenges(state.challenges).map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.code}: {c.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <ChallengeList
                  state={state}
                  selectedId={selectedId}
                  onSelect={(id) => selectChallenge(id)}
                  className="hidden self-start xl:sticky xl:top-20 xl:block xl:max-h-[calc(100vh-6rem)] xl:overflow-y-auto"
                />
                <div className="min-w-0">
                  {view ? (
                    <ChallengeWorkspace key={view.challenge.id} view={view} />
                  ) : (
                    <EmptyState
                      title="No challenge yet"
                      description="Start with a new challenge. Its pathway will appear here, from the brief to the scale-up decision."
                      action={
                        <Button onClick={() => setDrafting(true)}>
                          <Plus aria-hidden /> New challenge
                        </Button>
                      }
                    />
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="payments" className="min-w-0">
              <PaymentsPanel />
            </TabsContent>

            <TabsContent value="templates" className="min-w-0">
              <TemplatesPanel />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <NewChallengeDrawer
        open={drafting}
        onOpenChange={setDrafting}
        onCreated={(id) => {
          selectChallenge(id, true)
          showWorkspace()
        }}
      />
    </>
  )
}
