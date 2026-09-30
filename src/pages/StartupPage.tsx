// Startup dashboard: everything one startup sees and does. The presenter picks the startup.
import { PackageCheck, Send } from 'lucide-react'
import { useState } from 'react'

import { SyntheticBadge } from '@/components/badges'
import { NextStep } from '@/components/cards'
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
import { run } from '@/lib/demo/run'
import { STARTUPS } from '@/lib/demo/seed'
import { setActingStartup, submitMilestone, useDemoState } from '@/lib/demo/store'
import type { DemoState, Startup } from '@/lib/domain/types'
import { fmtDate, fmtLakh } from '@/lib/format'
import { isOpenCall, returnOf } from '@/pages/startup/helpers'
import { MyApplications } from '@/pages/startup/MyApplications'
import { MyPilots } from '@/pages/startup/MyPilots'
import { ApplyDrawer, OpenCalls } from '@/pages/startup/OpenCalls'
import { ProfilePanel } from '@/pages/startup/ProfilePanel'

const BY_NAME = [...STARTUPS].sort((a, b) => a.name.localeCompare(b.name))

function WaitingForYou({
  state,
  startup,
  onApply,
}: {
  state: DemoState
  startup: Startup
  onApply: (challengeId: string) => void
}) {
  // A running pilot's next milestone can be delivered even while an earlier payment is in process.
  const deliveries = state.challenges.flatMap((challenge) => {
    if (challenge.stage !== 'MEASURE' || challenge.outcome) return []
    const selected = state.applications.find((a) => a.id === challenge.selectedApplicationId)
    if (selected?.startupId !== startup.id) return []
    const milestone = state.milestones
      .filter((m) => m.challengeId === challenge.id && m.status === 'PLANNED')
      .sort((a, b) => a.order - b.order)[0]
    return milestone ? [{ challenge, milestone }] : []
  })
  const invitations = state.challenges.filter(
    (challenge) =>
      isOpenCall(challenge) &&
      challenge.invitedStartupIds.includes(startup.id) &&
      !state.applications.some((a) => a.challengeId === challenge.id && a.startupId === startup.id),
  )

  return (
    <Panel
      title="Waiting for you"
      description="Steps only this startup can take. Everything else is with the department, the experts or finance."
    >
      {deliveries.length + invitations.length === 0 ? (
        <EmptyState
          title="Nothing is waiting for this startup"
          description="Milestones to deliver and invitations to apply show here."
        />
      ) : (
        <div className="space-y-3">
          {deliveries.map(({ challenge, milestone }) => {
            const earlierOpen = state.milestones.some(
              (m) =>
                m.challengeId === challenge.id &&
                m.order < milestone.order &&
                (m.status === 'SUBMITTED' || m.payment === 'REQUESTED' || m.payment === 'APPROVED'),
            )
            const returned = returnOf(state.timeline, milestone)
            return (
              <NextStep
                key={milestone.id}
                role="startup"
                label={`${challenge.code}: deliver milestone ${milestone.order}, ${milestone.title}`}
                hint={
                  <>
                    {returned && (
                      <span className="block font-medium text-foreground">
                        Returned by the department on {fmtDate(returned.on)}: {returned.detail}
                      </span>
                    )}
                    Due {fmtDate(milestone.dueOn)}. {fmtLakh(milestone.amountLakh)} becomes payable
                    when the department accepts it.
                    {earlierOpen &&
                      ' An earlier milestone or payment is still with the department or finance; you can deliver this one meanwhile.'}
                  </>
                }
              >
                <Button
                  size="sm"
                  onClick={() =>
                    run(
                      () => submitMilestone(milestone.id),
                      `Milestone ${milestone.order} submitted to the department`,
                    )
                  }
                >
                  <PackageCheck aria-hidden /> Submit milestone {milestone.order} as delivered
                </Button>
              </NextStep>
            )
          })}
          {invitations.map((challenge) => (
            <NextStep
              key={challenge.id}
              role="startup"
              label={`${challenge.code}: you are invited to apply, ${challenge.title}`}
              hint={`The call closes on ${fmtDate(challenge.closesOn)}. Pilot ceiling ${fmtLakh(challenge.brief.budgetCeilingLakh)}.`}
            >
              <Button size="sm" onClick={() => onApply(challenge.id)}>
                <Send aria-hidden /> Apply
              </Button>
            </NextStep>
          ))}
        </div>
      )}
    </Panel>
  )
}

export default function StartupPage() {
  const state = useDemoState()
  const [applyId, setApplyId] = useState<string | null>(null)
  const startup = STARTUPS.find((s) => s.id === state.startupId) ?? STARTUPS[0]
  const applyTo = state.challenges.find((c) => c.id === applyId && isOpenCall(c))

  return (
    <div className="min-w-0">
      {/* The container lets the selector take the full header width on phones. */}
      <div className="@container">
        <PageHeader
          eyebrow="Startup dashboard"
          title={startup.name}
          description={startup.summary}
          badges={<SyntheticBadge />}
          actions={
            <div className="w-[100cqw] space-y-1.5 sm:w-72">
              <Label htmlFor="acting-startup">Acting as</Label>
              <Select value={startup.id} onValueChange={setActingStartup}>
                <SelectTrigger id="acting-startup" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BY_NAME.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          }
        />
      </div>

      <div className="space-y-6">
        <ProfilePanel startup={startup} />
        <WaitingForYou state={state} startup={startup} onApply={setApplyId} />
        <OpenCalls state={state} startup={startup} onApply={setApplyId} />
        <MyApplications state={state} startup={startup} />
        <MyPilots state={state} startup={startup} />
      </div>

      {applyTo && (
        <ApplyDrawer
          key={`${applyTo.id}-${startup.id}`}
          challenge={applyTo}
          startup={startup}
          onClose={() => setApplyId(null)}
        />
      )}
    </div>
  )
}
