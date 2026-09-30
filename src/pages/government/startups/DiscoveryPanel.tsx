// Startup discovery: which startups fit the challenge, who was invited, who applied.
import { ArrowRight, Send } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { Pill, SyntheticBadge } from '@/components/badges'
import { DoneBy } from '@/components/cards'
import { Panel } from '@/components/headers'
import { ConfirmDialog } from '@/components/overlays'
import { EmptyState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { run } from '@/lib/demo/run'
import { STARTUPS } from '@/lib/demo/seed'
import type { ChallengeView } from '@/lib/demo/selectors'
import { closeCall, inviteStartup } from '@/lib/demo/store'
import { matchStartups } from '@/lib/domain/rules'
import { plural } from '@/lib/format'

export function DiscoveryPanel({ view }: { view: ChallengeView }) {
  const { challenge, applications } = view
  const [confirmClose, setConfirmClose] = useState(false)
  const open = challenge.stage === 'DISCOVER'
  const matches = matchStartups(challenge, STARTUPS)
  const applied = new Set(applications.map((a) => a.startupId))
  const invited = new Set(challenge.invitedStartupIds)

  return (
    <Panel
      title="Startup discovery"
      description={
        open
          ? 'Startups that fit this challenge. Invite them, then close the call.'
          : 'The call is closed. This is the list of startups that fitted the challenge.'
      }
      actions={<SyntheticBadge />}
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Matching is a transparent sector and keyword match, not AI. The reasons are shown for each
          startup. In production the list would come from recognised startup registries, which are
          not connected in this prototype.
        </p>

        {matches.length === 0 ? (
          <EmptyState
            title="No matching startup in the demo list"
            description="No startup in the demo list works in this sector. Any startup can still apply on the Startup dashboard."
          />
        ) : (
          <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {matches.map(({ startup, score, reasons }) => (
              <li key={startup.id} className="min-w-0 space-y-2 rounded-lg border p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium break-words text-foreground">{startup.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {startup.city} · Recognised startup: {startup.recognised ? 'yes' : 'no'}
                    </p>
                  </div>
                  <Pill
                    tone="primary"
                    title="Sector 50, technology words 30, district 10, readiness 10"
                  >
                    Match {score} of 100
                  </Pill>
                </div>
                <ul className="flex flex-wrap gap-1.5" aria-label="Why this startup matches">
                  {reasons.map((reason) => (
                    <li key={reason} className="min-w-0">
                      <Pill className="h-auto min-h-6 shrink py-0.5 whitespace-normal">
                        {reason}
                      </Pill>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap items-center gap-2">
                  {applied.has(startup.id) ? (
                    <Pill tone="success">Applied</Pill>
                  ) : invited.has(startup.id) ? (
                    <Pill tone="info">Invited</Pill>
                  ) : open ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        run(
                          () => inviteStartup(challenge.id, startup.id),
                          `${startup.name} invited to apply`,
                        )
                      }
                    >
                      <Send aria-hidden /> Invite
                      <span className="sr-only"> {startup.name}</span>
                    </Button>
                  ) : (
                    <Pill>Did not apply</Pill>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        <p className="text-sm text-muted-foreground">
          Startups apply on the Startup dashboard.{' '}
          <Link
            to="/startup"
            className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
          >
            Open the Startup dashboard <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </p>

        {open && (
          <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border border-primary/30 bg-accent px-4 py-3">
            <div className="min-w-0 flex-1 basis-56 space-y-1">
              <p className="flex flex-wrap items-center gap-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Actions on this panel <DoneBy role="cell" />
              </p>
              <p className="font-medium text-foreground">
                {plural(applications.length, 'application')} received,{' '}
                {plural(invited.size, 'startup')} invited
              </p>
              {applications.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  The call cannot be closed before at least one application is received.
                </p>
              )}
            </div>
            <Button disabled={applications.length === 0} onClick={() => setConfirmClose(true)}>
              Close the call
            </Button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmClose}
        onOpenChange={setConfirmClose}
        title="Close the call?"
        description={`${plural(applications.length, 'application')} received. After closing, no new application is accepted and eligibility screening can start.`}
        confirmLabel="Close the call"
        onConfirm={() => {
          run(() => closeCall(challenge.id), 'Call closed. Eligibility screening can start.')
          setConfirmClose(false)
        }}
      />
    </Panel>
  )
}
