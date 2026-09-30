// Timely payments: what finance has to approve or release, and how long each payment took.
import { BadgeCheck, Banknote, CalendarClock, Hourglass, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router-dom'

import { PaymentTimingBadge, StatusBadge, SyntheticBadge } from '@/components/badges'
import { Callout, DoneBy, MetricCard } from '@/components/cards'
import { DataTable, type Column } from '@/components/DataTable'
import { Panel } from '@/components/headers'
import { EmptyState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { run } from '@/lib/demo/run'
import { paymentDaysLeft, programmeStats, startupOf, taskLink } from '@/lib/demo/selectors'
import { approvePayment, releasePayment, useDemoState } from '@/lib/demo/store'
import { POLICY } from '@/lib/domain/policy'
import { paymentTiming, type PaymentTiming } from '@/lib/domain/rules'
import type { Challenge, Milestone } from '@/lib/domain/types'
import { fmtDate, fmtLakh, fmtPct, plural, today } from '@/lib/format'

type Row = {
  milestone: Milestone
  challenge: Challenge | undefined
  startup: string
  timing: PaymentTiming
  daysLeft: number | null
}

const HISTORY_COLUMNS: Column<Row>[] = [
  {
    key: 'challenge',
    header: 'Challenge',
    cell: (r) => r.challenge?.code ?? '-',
    sortValue: (r) => r.challenge?.code ?? null,
  },
  { key: 'startup', header: 'Startup', cell: (r) => r.startup, sortValue: (r) => r.startup },
  {
    key: 'milestone',
    header: 'Milestone',
    cell: (r) => `${r.milestone.order}. ${r.milestone.title}`,
    className: 'min-w-36 whitespace-normal',
  },
  {
    key: 'amount',
    header: 'Amount',
    cell: (r) => fmtLakh(r.milestone.amountLakh),
    sortValue: (r) => r.milestone.amountLakh,
    align: 'right',
  },
  // The badge states the days taken, so there is no separate column for them.
  {
    key: 'timing',
    header: 'Against target',
    cell: (r) => <PaymentTimingBadge timing={r.timing} />,
    sortValue: (r) => r.timing.days,
  },
  {
    key: 'requested',
    header: 'Requested',
    cell: (r) => fmtDate(r.milestone.requestedOn),
    sortValue: (r) => r.milestone.requestedOn,
  },
  {
    key: 'paid',
    header: 'Paid',
    cell: (r) =>
      r.milestone.paidOn ? (
        fmtDate(r.milestone.paidOn)
      ) : (
        <StatusBadge status={r.milestone.payment} />
      ),
    sortValue: (r) => r.milestone.paidOn,
  },
]

export function PaymentsPanel() {
  const state = useDemoState()
  const stats = programmeStats(state)
  const now = today()
  const rows: Row[] = state.milestones
    .filter((m) => m.requestedOn)
    .map((milestone) => {
      const challenge = state.challenges.find((c) => c.id === milestone.challengeId)
      const application = state.applications.find((a) => a.id === challenge?.selectedApplicationId)
      return {
        milestone,
        challenge,
        startup: startupOf(application?.startupId)?.name ?? 'Startup',
        timing: paymentTiming(milestone, now),
        daysLeft: paymentDaysLeft(milestone),
      }
    })
  const queue = rows
    .filter((r) => r.milestone.payment === 'REQUESTED' || r.milestone.payment === 'APPROVED')
    .sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0))

  return (
    <div className="min-w-0 space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        <MetricCard
          label="Paid on time"
          value={fmtPct(stats.paidOnTimePct)}
          hint={`${plural(stats.paymentsMade, 'payment')} made so far`}
          icon={<BadgeCheck aria-hidden />}
          tone="success"
        />
        <MetricCard
          label="Average days to pay"
          value={stats.avgPaymentDays ?? '-'}
          hint={`Target: ${POLICY.paymentTargetDays} days from the request`}
          icon={<CalendarClock aria-hidden />}
          tone="info"
        />
        <MetricCard
          label="Waiting for payment"
          value={fmtLakh(stats.pendingLakh)}
          hint={`${plural(queue.length, 'payment')} in the queue`}
          icon={<Hourglass aria-hidden />}
          tone="warning"
        />
        <MetricCard
          label="Overdue"
          value={stats.overduePayments}
          hint="Unpaid and past the target"
          icon={<TriangleAlert aria-hidden />}
          tone={stats.overduePayments ? 'danger' : 'success'}
        />
        <MetricCard
          label="Total paid"
          value={fmtLakh(stats.paidLakh)}
          hint={`Of ${fmtLakh(stats.contractedLakh)} contracted`}
          icon={<Banknote aria-hidden />}
        />
      </div>

      <Callout title="How payments work here">
        The payment request is raised automatically when the department accepts a milestone. The
        startup does not have to send a separate bill. The target is {POLICY.paymentTargetDays} days
        from the request to payment. This is a configurable default of the prototype.
      </Callout>

      <Panel
        title="Payment queue"
        description="Accepted milestones waiting for finance, most urgent first."
        actions={<SyntheticBadge />}
      >
        {queue.length === 0 ? (
          <EmptyState
            title="No payments waiting"
            description="A payment appears here as soon as the department accepts a milestone."
          />
        ) : (
          <ul className="space-y-3">
            {queue.map(({ milestone, challenge, startup, timing, daysLeft }) => {
              const approve = milestone.payment === 'REQUESTED'
              return (
                <li
                  key={milestone.id}
                  className="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-3 rounded-lg border p-4"
                >
                  <div className="min-w-0 flex-1 basis-64 space-y-1">
                    <p className="text-xs text-muted-foreground">
                      {challenge ? (
                        <Link
                          to={taskLink('finance', challenge.id, 'pilot')}
                          className="font-semibold text-primary underline-offset-4 hover:underline"
                        >
                          {challenge.code}
                        </Link>
                      ) : (
                        '-'
                      )}{' '}
                      · {startup}
                    </p>
                    <p className="font-medium break-words text-foreground">
                      Milestone {milestone.order}: {milestone.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Requested on {fmtDate(milestone.requestedOn)}
                      {milestone.approvedOn && `, approved on ${fmtDate(milestone.approvedOn)}`}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="tabular text-lg font-semibold text-foreground">
                      {fmtLakh(milestone.amountLakh)}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <PaymentTimingBadge timing={timing} />
                      {daysLeft !== null && (
                        <span className="text-xs text-muted-foreground">
                          {daysLeft >= 0
                            ? `${plural(daysLeft, 'day')} left to meet the target`
                            : `${plural(-daysLeft, 'day')} past the target`}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <DoneBy role="finance" />
                    <Button
                      variant={approve ? 'outline' : 'default'}
                      onClick={() =>
                        approve
                          ? run(() => approvePayment(milestone.id), 'Payment approved')
                          : run(() => releasePayment(milestone.id), 'Payment released')
                      }
                    >
                      {approve ? 'Approve payment' : 'Release payment'}
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Panel>

      <Panel
        title="Payment history"
        description="Every milestone with a payment request. Select a column heading to sort."
        actions={<SyntheticBadge />}
      >
        <DataTable
          rows={rows}
          columns={HISTORY_COLUMNS}
          rowKey={(r) => r.milestone.id}
          caption="Milestone payments with the days taken against the target"
          initialSort={{ key: 'requested', desc: true }}
          dense
          empty={
            <EmptyState
              title="No payment requests yet"
              description="Payments are listed here once a pilot has an accepted milestone."
            />
          }
        />
      </Panel>
    </div>
  )
}
