// The ten-stage pathway as a progress tracker.
import { Check, CircleSlash, Clock } from 'lucide-react'
import { useEffect, useRef } from 'react'

import { STAGE_INFO } from '@/lib/domain/policy'
import { STAGES, type Challenge } from '@/lib/domain/types'
import { cn } from '@/lib/utils'

/**
 * Shows every stage of the pathway with the challenge's position: done, current, to come.
 * Scrolls sideways inside its box on narrow screens and opens on the current stage.
 */
export function StageTracker({
  challenge,
  className,
}: {
  challenge: Pick<Challenge, 'stage' | 'outcome'>
  className?: string
}) {
  const current = STAGES.indexOf(challenge.stage)
  const stopped = challenge.outcome === 'STOPPED'
  const extended = challenge.outcome === 'EXTENDED'
  const finished = challenge.outcome === 'SCALED'
  const box = useRef<HTMLDivElement>(null)
  const currentItem = useRef<HTMLLIElement>(null)

  // Centre the current stage inside the box. Only the box scrolls, never the page.
  useEffect(() => {
    const scroller = box.current
    const item = currentItem.current
    if (!scroller || !item) return
    const left =
      item.getBoundingClientRect().left -
      scroller.getBoundingClientRect().left +
      scroller.scrollLeft
    scroller.scrollLeft = left - (scroller.clientWidth - item.offsetWidth) / 2
  }, [current])

  return (
    <div ref={box} className={cn('max-w-full min-w-0 overflow-x-auto', className)}>
      <ol
        aria-label={`Pathway: stage ${current + 1} of ${STAGES.length}, ${STAGE_INFO[challenge.stage].label}`}
        className="flex min-w-[620px] items-start"
      >
        {STAGES.map((stage, index) => {
          const done = index < current || finished
          const isCurrent = index === current && !finished
          return (
            <li
              key={stage}
              ref={index === current ? currentItem : undefined}
              aria-current={isCurrent ? 'step' : undefined}
              title={STAGE_INFO[stage].what}
              className="relative flex flex-1 flex-col items-center gap-1.5 px-1 text-center"
            >
              {index > 0 && (
                <span
                  aria-hidden
                  className={cn(
                    'absolute top-3.5 right-1/2 h-0.5 w-full -translate-y-1/2',
                    index <= current ? 'bg-primary' : 'bg-border',
                  )}
                />
              )}
              <span
                className={cn(
                  'relative z-10 grid size-7 place-items-center rounded-full text-xs font-semibold ring-4 ring-card',
                  done && 'bg-primary text-primary-foreground',
                  isCurrent &&
                    !stopped &&
                    !extended &&
                    'bg-card text-primary outline-2 outline-primary',
                  isCurrent && stopped && 'bg-danger text-white',
                  isCurrent && extended && 'bg-warning text-white',
                  !done && !isCurrent && 'bg-muted text-muted-foreground',
                )}
              >
                {done ? (
                  <Check className="size-4" aria-hidden />
                ) : isCurrent && stopped ? (
                  <CircleSlash className="size-4" aria-hidden />
                ) : isCurrent && extended ? (
                  <Clock className="size-4" aria-hidden />
                ) : (
                  index + 1
                )}
              </span>
              <span
                className={cn(
                  'text-[11px] leading-tight',
                  isCurrent ? 'font-semibold text-foreground' : 'text-muted-foreground',
                )}
              >
                {STAGE_INFO[stage].short}
                <span className="sr-only">
                  {done
                    ? ' (done)'
                    : !isCurrent
                      ? ' (to come)'
                      : stopped
                        ? ' (stopped here)'
                        : extended
                          ? ' (pilot extended)'
                          : ' (current)'}
                </span>
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
