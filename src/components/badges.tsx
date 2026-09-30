// Status, stage, role and demo-data badges. Colour is never the only signal: every badge
// carries a text label (and an icon where it helps).
import { CircleAlert, CircleCheck, Clock, FlaskConical, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'

import { STATUS, statusLabel, type Tone } from '@/components/status'
import { ROLE_INFO, STAGE_INFO } from '@/lib/domain/policy'
import type { PaymentTiming } from '@/lib/domain/rules'
import type { Challenge, Role, Stage } from '@/lib/domain/types'
import { plural } from '@/lib/format'
import { cn } from '@/lib/utils'

const TONES: Record<Tone, string> = {
  danger: 'bg-danger-soft text-danger ring-danger/25',
  warning: 'bg-warning-soft text-warning ring-warning/30',
  success: 'bg-success-soft text-success ring-success/25',
  info: 'bg-info-soft text-info ring-info/25',
  neutral: 'bg-muted text-muted-foreground ring-border',
  demo: 'bg-demo-soft text-demo ring-demo/25',
  primary: 'bg-accent text-accent-foreground ring-primary/20',
}

export function Pill({
  tone = 'neutral',
  icon,
  children,
  className,
  title,
}: {
  tone?: Tone
  icon?: ReactNode
  children: ReactNode
  className?: string
  title?: string
}) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex h-6 shrink-0 items-center gap-1 rounded-md px-2 text-xs font-medium whitespace-nowrap ring-1 ring-inset [&_svg]:size-3.5',
        TONES[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  )
}

const TONE_ICON: Partial<Record<Tone, ReactNode>> = {
  danger: <CircleAlert aria-hidden />,
  warning: <TriangleAlert aria-hidden />,
  success: <CircleCheck aria-hidden />,
}

/** A badge for any status code of the domain (eligibility, milestone, payment, verdict, ...). */
export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const { label, tone } = STATUS[status] ?? { label: statusLabel(status), tone: 'neutral' as Tone }
  return (
    <Pill tone={tone} icon={TONE_ICON[tone]} className={className}>
      {label}
    </Pill>
  )
}

/** Where a challenge is in the pathway, or how it ended. */
export function StageBadge({ challenge }: { challenge: Pick<Challenge, 'stage' | 'outcome'> }) {
  if (challenge.outcome) return <StatusBadge status={challenge.outcome} />
  return <Pill tone="primary">{STAGE_INFO[challenge.stage].label}</Pill>
}

export function StagePill({ stage }: { stage: Stage }) {
  return <Pill tone="primary">{STAGE_INFO[stage].short}</Pill>
}

export function RoleBadge({ role, prefix }: { role: Role; prefix?: string }) {
  return (
    <Pill tone="info">
      {prefix ? `${prefix} ` : ''}
      {ROLE_INFO[role].label}
    </Pill>
  )
}

/** Marks a record as made up for the demo. */
export function SyntheticBadge({ className }: { className?: string }) {
  return (
    <Pill
      tone="demo"
      icon={<FlaskConical aria-hidden />}
      className={className}
      title="Made up for the demo: not a real department, startup, tender or payment"
    >
      Demo data
    </Pill>
  )
}

const TIMING: Record<PaymentTiming['state'], { tone: Tone; text: (days: number) => string }> = {
  PAID_ON_TIME: { tone: 'success', text: (d) => `Paid in ${plural(d, 'day')}` },
  PAID_LATE: { tone: 'danger', text: (d) => `Paid late: ${plural(d, 'day')}` },
  PENDING: {
    tone: 'warning',
    text: (d) => (d === 0 ? 'Requested today' : `Waiting ${plural(d, 'day')}`),
  },
  OVERDUE: { tone: 'danger', text: (d) => `Overdue: ${plural(d, 'day')}` },
  NOT_DUE: { tone: 'neutral', text: () => 'Not due' },
}

/** How long a payment took (or has been waiting) against the payment target. */
export function PaymentTimingBadge({ timing }: { timing: PaymentTiming }) {
  const { tone, text } = TIMING[timing.state]
  return (
    <Pill tone={tone} icon={timing.state === 'NOT_DUE' ? undefined : <Clock aria-hidden />}>
      {text(timing.days)}
    </Pill>
  )
}
