// Loading and empty states.
import { Inbox } from 'lucide-react'
import type { ReactNode } from 'react'

import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export function LoadingState({
  rows = 3,
  label = 'Loading',
  className,
}: {
  rows?: number
  label?: string
  className?: string
}) {
  return (
    <div role="status" aria-live="polite" className={cn('space-y-3 py-2', className)}>
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-10 w-full" style={{ opacity: 1 - i * 0.15 }} />
      ))}
    </div>
  )
}

export function EmptyState({
  title = 'Nothing here yet',
  description,
  icon,
  action,
  className,
}: {
  title?: string
  description?: ReactNode
  icon?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-2 rounded-lg border border-dashed px-6 py-10 text-center',
        className,
      )}
    >
      <div className="text-muted-foreground [&_svg]:size-6">{icon ?? <Inbox aria-hidden />}</div>
      <p className="font-medium">{title}</p>
      {description && <p className="max-w-md text-sm text-muted-foreground">{description}</p>}
      {action}
    </div>
  )
}
