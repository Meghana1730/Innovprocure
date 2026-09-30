// The list of challenges on the government dashboard: pathway order, open ones first.
import { useEffect, useRef, useState } from 'react'

import { RoleBadge, StageBadge } from '@/components/badges'
import { EmptyState } from '@/components/states'
import { departmentOf, nextAction } from '@/lib/demo/selectors'
import type { DemoState } from '@/lib/domain/types'
import { plural } from '@/lib/format'
import { cn } from '@/lib/utils'
import { sortChallenges } from '@/pages/government/challenge-order'

type Filter = 'all' | 'open' | 'closed'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'closed', label: 'Closed' },
]

export function ChallengeList({
  state,
  selectedId,
  onSelect,
  className,
}: {
  state: DemoState
  selectedId: string | undefined
  onSelect: (id: string) => void
  className?: string
}) {
  const [filter, setFilter] = useState<Filter>('all')
  const listRef = useRef<HTMLElement>(null)
  // Keep the selected challenge in view when the list scrolls inside its own box. Only the
  // list is scrolled, never the page.
  useEffect(() => {
    const box = listRef.current
    const row = box?.querySelector('[aria-current="true"]')
    if (!box || !row) return
    const outer = box.getBoundingClientRect()
    const inner = row.getBoundingClientRect()
    if (inner.top < outer.top) box.scrollTop -= outer.top - inner.top
    // 24 px more, so the row clears the fade at the bottom of the list.
    else if (inner.bottom > outer.bottom - 24) box.scrollTop += inner.bottom - outer.bottom + 24
  }, [selectedId, filter])
  const rows = sortChallenges(state.challenges).filter(
    (c) => filter === 'all' || (filter === 'closed') === Boolean(c.outcome),
  )

  return (
    <nav
      ref={listRef}
      aria-label="Challenges"
      className={cn(
        // The fade at the bottom shows that the list scrolls when it is taller than the screen.
        'min-w-0 rounded-xl border bg-card after:pointer-events-none after:sticky after:bottom-0 after:block after:h-6 after:bg-linear-to-t after:from-card after:to-transparent',
        className,
      )}
    >
      <div className="space-y-2 border-b px-4 py-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">Challenges</h2>
          <p className="text-xs text-muted-foreground">{plural(rows.length, 'challenge')}</p>
        </div>
        <div role="group" aria-label="Show challenges" className="flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
                filter === f.id
                  ? 'bg-primary text-primary-foreground ring-primary'
                  : 'bg-card text-muted-foreground ring-border hover:text-foreground',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      {rows.length === 0 ? (
        <EmptyState
          className="m-3"
          title="No challenges here"
          description="Challenges appear here when they match the filter."
        />
      ) : (
        <ul className="divide-y">
          {rows.map((challenge) => {
            const next = nextAction(state, challenge)
            const selected = challenge.id === selectedId
            return (
              <li key={challenge.id}>
                <button
                  type="button"
                  aria-current={selected ? 'true' : undefined}
                  onClick={() => onSelect(challenge.id)}
                  className={cn(
                    'block w-full min-w-0 space-y-1.5 border-l-4 px-3 py-3 text-left hover:bg-muted/60',
                    selected ? 'border-l-primary bg-accent' : 'border-l-transparent',
                  )}
                >
                  <span className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span className="font-semibold text-primary">{challenge.code}</span>
                    <span className="min-w-0 truncate">
                      {departmentOf(challenge.departmentId)?.short}
                    </span>
                  </span>
                  <span className="line-clamp-2 text-sm font-medium text-foreground">
                    {challenge.title}
                  </span>
                  <span className="flex flex-wrap items-center gap-1.5">
                    <StageBadge challenge={challenge} />
                  </span>
                  {next && (
                    <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      <RoleBadge role={next.role} />
                      <span className="min-w-0">{next.label}</span>
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </nav>
  )
}
