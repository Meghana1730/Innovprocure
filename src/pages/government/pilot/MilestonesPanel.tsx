// Milestones and payments: acceptance by the department, approval and release by finance.
import { ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { PaymentTimingBadge, StatusBadge, SyntheticBadge } from '@/components/badges'
import { DoneBy } from '@/components/cards'
import { Panel } from '@/components/headers'
import { EmptyState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { run } from '@/lib/demo/run'
import type { ChallengeView } from '@/lib/demo/selectors'
import {
  acceptMilestone,
  approvePayment,
  releasePayment,
  returnMilestone,
  setActingStartup,
} from '@/lib/demo/store'
import { POLICY } from '@/lib/domain/policy'
import { paymentTiming } from '@/lib/domain/rules'
import type { Milestone } from '@/lib/domain/types'
import { fmtDate, fmtLakh, fmtPct, today } from '@/lib/format'
import { Fact, Field } from '@/pages/government/pilot/fields'

const DEFAULT_REASON =
  'The evidence for the deliverable is incomplete. Please add it and submit again.'

const sum = (milestones: Milestone[]) => milestones.reduce((total, m) => total + m.amountLakh, 0)

export function MilestonesPanel({ view }: { view: ChallengeView }) {
  const { challenge, agreement, milestones, selected } = view
  // The milestone being returned (its reason box is open), if any.
  const [returning, setReturning] = useState<string | null>(null)
  const [reason, setReason] = useState(DEFAULT_REASON)

  const now = today()
  const live = challenge.stage === 'MEASURE' && !challenge.outcome
  const value = agreement?.valueLakh ?? sum(milestones)
  const paid = sum(milestones.filter((m) => m.payment === 'PAID'))
  const pending = sum(
    milestones.filter((m) => m.payment === 'REQUESTED' || m.payment === 'APPROVED'),
  )
  const paidPct = value > 0 ? Math.min(100, Math.round((paid / value) * 100)) : 0
  const firstPlanned = milestones.find((m) => m.status === 'PLANNED')

  return (
    <Panel
      title="Milestones and payments"
      description="The department accepts each delivered milestone. The finance officer approves and releases the payment."
      actions={<SyntheticBadge />}
    >
      {milestones.length === 0 ? (
        <EmptyState
          title="No milestones yet"
          description="Milestones and their payments appear here once the pilot agreement is signed."
        />
      ) : (
        <div className="space-y-5">
          <div className="min-w-0 space-y-3 rounded-lg border bg-muted/40 p-4">
            <dl className="flex flex-wrap gap-x-8 gap-y-3">
              <Fact label="Paid so far">
                {fmtLakh(paid)} of {fmtLakh(value)} ({fmtPct(paidPct)})
              </Fact>
              <Fact label="Payment requests pending">{fmtLakh(pending)}</Fact>
              <Fact label="Not yet due">{fmtLakh(Math.max(0, value - paid - pending))}</Fact>
            </dl>
            <Progress
              value={paidPct}
              className="h-2"
              aria-label={`Paid so far: ${paidPct}% of the contract value`}
            />
            <p className="text-xs text-muted-foreground">
              The payment request is raised automatically when a milestone is accepted. Target:
              payment within {POLICY.paymentTargetDays} days of the request (a configurable default
              of the prototype).
            </p>
          </div>

          <ol className="space-y-3">
            {milestones.map((m) => {
              const timing = paymentTiming(m, now)
              return (
                <li key={m.id} className="min-w-0 space-y-3 rounded-lg border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1 basis-56">
                      <h3 className="font-medium">
                        Milestone {m.order}: {m.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">{m.deliverable}</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <StatusBadge status={m.status} />
                      <StatusBadge status={m.payment} />
                      {timing.state !== 'NOT_DUE' && <PaymentTimingBadge timing={timing} />}
                    </div>
                  </div>

                  <dl className="flex flex-wrap gap-x-8 gap-y-2">
                    <Fact label="Due">{fmtDate(m.dueOn)}</Fact>
                    <Fact label="Amount">
                      {fmtLakh(m.amountLakh)} ({fmtPct(m.paymentPct)})
                    </Fact>
                    {m.submittedOn && <Fact label="Submitted">{fmtDate(m.submittedOn)}</Fact>}
                    {m.acceptedOn && <Fact label="Accepted">{fmtDate(m.acceptedOn)}</Fact>}
                    {m.requestedOn && (
                      <Fact label="Payment requested">{fmtDate(m.requestedOn)}</Fact>
                    )}
                    {m.approvedOn && <Fact label="Payment approved">{fmtDate(m.approvedOn)}</Fact>}
                    {m.paidOn && <Fact label="Paid">{fmtDate(m.paidOn)}</Fact>}
                  </dl>

                  {m.status === 'SUBMITTED' && (
                    <div className="space-y-3 border-t pt-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() =>
                            run(
                              () => acceptMilestone(m.id),
                              `Milestone ${m.order} accepted. The payment request was raised.`,
                            )
                          }
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          aria-expanded={returning === m.id}
                          onClick={() => setReturning(returning === m.id ? null : m.id)}
                        >
                          Return
                        </Button>
                        <DoneBy role="department" />
                      </div>
                      {returning === m.id && (
                        <div className="flex flex-wrap items-end gap-2">
                          <Field
                            id={`return-${m.id}`}
                            label="Reason for returning"
                            className="flex-1 basis-64"
                          >
                            <Input
                              id={`return-${m.id}`}
                              value={reason}
                              onChange={(e) => setReason(e.target.value)}
                            />
                          </Field>
                          <Button
                            variant="destructive"
                            onClick={() => {
                              const done = run(
                                () => returnMilestone(m.id, reason),
                                `Milestone ${m.order} returned to the startup.`,
                              )
                              if (done) {
                                setReturning(null)
                                setReason(DEFAULT_REASON)
                              }
                            }}
                          >
                            Send back
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {(m.payment === 'REQUESTED' || m.payment === 'APPROVED') && (
                    <div className="flex flex-wrap items-center gap-2 border-t pt-3">
                      {m.payment === 'REQUESTED' ? (
                        <Button
                          size="sm"
                          onClick={() =>
                            run(
                              () => approvePayment(m.id),
                              `Payment of ${fmtLakh(m.amountLakh)} approved.`,
                            )
                          }
                        >
                          Approve payment
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() =>
                            run(
                              () => releasePayment(m.id),
                              `Payment of ${fmtLakh(m.amountLakh)} released.`,
                            )
                          }
                        >
                          Release payment
                        </Button>
                      )}
                      <DoneBy role="finance" />
                    </div>
                  )}

                  {live && m.status === 'PLANNED' && (
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t pt-3 text-sm text-muted-foreground">
                      {m.id === firstPlanned?.id ? (
                        <>
                          Waiting for the startup to deliver.
                          <Link
                            to="/startup"
                            // The Startup dashboard opens as the startup of this pilot.
                            onClick={() => selected && setActingStartup(selected.startupId)}
                            className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
                          >
                            Open the Startup dashboard{' '}
                            <ArrowRight className="size-3.5" aria-hidden />
                          </Link>
                        </>
                      ) : (
                        `To be delivered after milestone ${firstPlanned?.order ?? m.order - 1}.`
                      )}
                    </p>
                  )}
                </li>
              )
            })}
          </ol>
        </div>
      )}
    </Panel>
  )
}
