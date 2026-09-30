// The audit trail of one challenge: every step, who took it and when, newest first.
import { History } from 'lucide-react'

import { RoleBadge, SyntheticBadge } from '@/components/badges'
import { Facts } from '@/components/cards'
import { Panel } from '@/components/headers'
import { EmptyState } from '@/components/states'
import type { ChallengeView } from '@/lib/demo/selectors'
import { fmtDate, plural } from '@/lib/format'

export function AuditTab({ view }: { view: ChallengeView }) {
  const { timeline } = view
  const latest = timeline[0]
  const first = timeline[timeline.length - 1]
  const roles = new Set(timeline.map((event) => event.role)).size
  return (
    <Panel
      title="Audit trail"
      description="Every step is recorded with who did it and when, so decisions can be explained later."
      actions={<SyntheticBadge />}
      bodyClassName="space-y-5"
    >
      {timeline.length === 0 ? (
        <EmptyState
          icon={<History aria-hidden />}
          title="No steps recorded yet"
          description="Each action on this challenge will appear here with its date, the role and the person who took it."
        />
      ) : (
        <>
          <Facts
            className="rounded-lg border bg-muted/40 p-4"
            items={[
              {
                label: 'Entries',
                value: `${plural(timeline.length, 'entry', 'entries')} by ${plural(roles, 'role')}`,
              },
              { label: 'First entry', value: fmtDate(first.on) },
              { label: 'Latest entry', value: fmtDate(latest.on) },
            ]}
          />
          <ol aria-label="Audit trail, newest first" className="min-w-0">
            {timeline.map((event, index) => (
              <li key={event.id} className="relative flex min-w-0 gap-3 pb-5 last:pb-0">
                {index < timeline.length - 1 && (
                  <span aria-hidden className="absolute top-3 bottom-0 left-[5px] w-px bg-border" />
                )}
                <span
                  aria-hidden
                  className="relative mt-1.5 size-[11px] shrink-0 rounded-full border-2 border-primary bg-card"
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <time dateTime={event.on} className="tabular font-medium text-foreground">
                      {fmtDate(event.on)}
                    </time>
                    <RoleBadge role={event.role} />
                    <span className="min-w-0 break-words">{event.actor}</span>
                  </p>
                  <p className="text-sm font-medium break-words text-foreground">{event.action}</p>
                  {event.detail && (
                    <p className="text-sm break-words text-muted-foreground">{event.detail}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </>
      )}
    </Panel>
  )
}
