// Small building blocks used on every page: metric cards, callouts, label/value lists and
// the "who acts next" banner. Roots carry min-w-0 so they shrink inside grids on phones.
import { ArrowRight, Info } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { RoleBadge } from '@/components/badges'
import { Button } from '@/components/ui/button'
import type { Role } from '@/lib/domain/types'
import { cn } from '@/lib/utils'

export function MetricCard({
  label,
  value,
  hint,
  icon,
  tone = 'primary',
  footer,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  icon?: ReactNode
  tone?: 'primary' | 'danger' | 'warning' | 'success' | 'info'
  footer?: ReactNode
}) {
  const iconTone = {
    primary: 'bg-accent text-primary',
    danger: 'bg-danger-soft text-danger',
    warning: 'bg-warning-soft text-warning',
    success: 'bg-success-soft text-success',
    info: 'bg-info-soft text-info',
  }[tone]
  return (
    <div className="animate-in-up flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-5 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 text-sm font-medium text-muted-foreground">{label}</p>
        {icon && (
          <span
            className={cn(
              'grid size-9 shrink-0 place-items-center rounded-lg [&_svg]:size-4.5',
              iconTone,
            )}
          >
            {icon}
          </span>
        )}
      </div>
      <p className="tabular text-3xl font-semibold tracking-tight text-foreground">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {footer}
    </div>
  )
}

export function Callout({
  tone = 'info',
  title,
  children,
  icon,
  className,
}: {
  tone?: 'info' | 'warning' | 'demo' | 'danger' | 'success'
  title?: ReactNode
  children?: ReactNode
  icon?: ReactNode
  className?: string
}) {
  const styles = {
    info: 'border-info/25 bg-info-soft',
    warning: 'border-warning/30 bg-warning-soft',
    demo: 'border-demo/25 bg-demo-soft',
    danger: 'border-danger/25 bg-danger-soft',
    success: 'border-success/25 bg-success-soft',
  }[tone]
  const iconColor = {
    info: 'text-info',
    warning: 'text-warning',
    demo: 'text-demo',
    danger: 'text-danger',
    success: 'text-success',
  }[tone]
  return (
    <div
      className={cn('flex min-w-0 gap-3 rounded-lg border px-4 py-3 text-sm', styles, className)}
    >
      <span className={cn('mt-0.5 shrink-0 [&_svg]:size-4', iconColor)}>
        {icon ?? <Info aria-hidden />}
      </span>
      <div className="min-w-0 space-y-0.5">
        {title && <p className="font-medium text-foreground">{title}</p>}
        {children && <div className="text-muted-foreground">{children}</div>}
      </div>
    </div>
  )
}

/** A definition list: label on the left (or above on phones), value on the right. */
export function Facts({
  items,
  className,
}: {
  items: { label: string; value: ReactNode }[]
  className?: string
}) {
  return (
    <dl
      className={cn(
        'grid min-w-0 grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]',
        className,
      )}
    >
      {items.map((item) => (
        <div key={item.label} className="contents">
          <dt className="text-muted-foreground">{item.label}</dt>
          <dd className="min-w-0 break-words text-foreground">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** The next step of a challenge, who takes it, and the action buttons (children). */
export function NextStep({
  role,
  label,
  children,
  to,
  hint,
}: {
  role: Role
  label: string
  /** Action buttons for the step. */
  children?: ReactNode
  /** Link to the place where the step is done (used when it happens on another dashboard). */
  to?: string
  hint?: ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border border-primary/30 bg-accent px-4 py-3">
      {/* basis-56: on a phone the buttons wrap below the text instead of squeezing it. */}
      <div className="min-w-0 flex-1 basis-56 space-y-1">
        <p className="flex flex-wrap items-center gap-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Next step <RoleBadge role={role} prefix="Done by:" />
        </p>
        <p className="font-medium text-foreground">{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
      {to && (
        <Button asChild variant="outline" size="sm">
          <Link to={to}>
            Open <ArrowRight aria-hidden />
          </Link>
        </Button>
      )}
    </div>
  )
}

/** "Done by: Finance officer": shows which officer takes an action (separation of duties). */
export function DoneBy({ role }: { role: Role }) {
  return <RoleBadge role={role} prefix="Done by:" />
}
