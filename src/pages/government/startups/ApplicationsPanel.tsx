// Applications and eligibility screening: every rule result carries a written reason.
import { useState } from 'react'

import { StatusBadge, SyntheticBadge } from '@/components/badges'
import { Callout, DoneBy, Facts, NextStep } from '@/components/cards'
import { Panel } from '@/components/headers'
import { EmptyState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { run } from '@/lib/demo/run'
import type { ChallengeView } from '@/lib/demo/selectors'
import { resolveClarification, runScreening } from '@/lib/demo/store'
import { ELIGIBILITY_RULES } from '@/lib/domain/policy'
import type { ApplicationStatus, EligibilityStatus } from '@/lib/domain/types'
import { fmtDate, fmtInt, fmtLakh } from '@/lib/format'

type Row = ChallengeView['applications'][number]

const STATUS_ORDER: ApplicationStatus[] = [
  'SELECTED',
  'SHORTLISTED',
  'ELIGIBLE',
  'CLARIFICATION',
  'SUBMITTED',
  'NOT_SELECTED',
  'INELIGIBLE',
]

const COUNTS: { status: EligibilityStatus; label: string }[] = [
  { status: 'ELIGIBLE', label: 'Eligible' },
  { status: 'INELIGIBLE', label: 'Ineligible' },
  { status: 'CLARIFICATION', label: 'Clarification needed' },
  { status: 'NOT_SCREENED', label: 'Not screened yet' },
]

const ACCEPT_NOTE =
  'Recorded by the innovation cell: the startup agreed to deliver within the ceiling. In this prototype the confirmation of the startup is not captured.'
const REJECT_NOTE = 'The startup did not confirm a quote within the ceiling.'

function RulesApplied({ open }: { open: boolean }) {
  const groups = [
    { title: 'Must pass', rules: ELIGIBILITY_RULES.filter((r) => r.kind === 'mandatory') },
    {
      title: 'Usual tender conditions not required from startups',
      rules: ELIGIBILITY_RULES.filter((r) => r.kind === 'relaxed'),
    },
  ]
  return (
    <details open={open} className="rounded-lg border px-4 py-3 text-sm">
      <summary className="cursor-pointer font-medium text-foreground">
        Rules applied (configurable defaults of the prototype)
      </summary>
      <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
        {groups.map((group) => (
          <div key={group.title} className="min-w-0">
            <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              {group.title}
            </h3>
            <ul className="mt-2 space-y-2">
              {group.rules.map((rule) => (
                <li key={rule.id} className="min-w-0">
                  <p className="text-foreground">{rule.label}</p>
                  <p className="text-xs text-muted-foreground">{rule.detail}</p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </details>
  )
}

function ClarificationForm({ application }: { application: Row }) {
  const [note, setNote] = useState('')
  const inputId = `clarify-${application.id}`
  const name = application.startup?.name ?? 'The startup'
  const settle = (accept: boolean) =>
    run(
      () =>
        resolveClarification(
          application.id,
          accept,
          note.trim() || (accept ? ACCEPT_NOTE : REJECT_NOTE),
        ),
      accept ? `${name}: clarification accepted, now eligible` : `${name}: marked ineligible`,
    )
  return (
    <div className="space-y-3 rounded-lg border border-warning/30 bg-warning-soft p-3">
      <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
        Settle clarification <DoneBy role="cell" />
      </p>
      <div className="space-y-1.5">
        <Label htmlFor={inputId}>Note for the record</Label>
        <Input
          id={inputId}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="How the clarification was settled"
          className="bg-card"
        />
        <p className="text-xs text-muted-foreground">
          Leave blank to record a standard note. Accepting sets the quote to the budget ceiling. The
          innovation cell records the answer of the startup. In this prototype the confirmation of
          the startup is not captured.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => settle(true)}>
          Startup confirmed: accept
        </Button>
        <Button size="sm" variant="destructive" onClick={() => settle(false)}>
          Not resolved: mark ineligible
        </Button>
      </div>
    </div>
  )
}

function ApplicationCard({
  application,
  ceilingLakh,
  openRules,
}: {
  application: Row
  ceilingLakh: number
  openRules: boolean
}) {
  const { startup } = application
  const screened = application.ruleResults.length > 0
  return (
    <li className="min-w-0 space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-medium break-words text-foreground">
            {startup?.name ?? 'Unknown startup'}
          </h3>
          <p className="text-xs text-muted-foreground">
            {startup?.city ?? '-'} · Submitted {fmtDate(application.submittedOn)}
          </p>
        </div>
        <StatusBadge status={application.status} />
      </div>
      <Facts
        className="sm:grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)]"
        items={[
          {
            label: 'Quote',
            value: `${fmtLakh(application.quoteLakh)} against a ceiling of ${fmtLakh(ceilingLakh)}`,
          },
          { label: 'Pilot duration', value: `${fmtInt(application.weeks)} weeks` },
          { label: 'Approach', value: application.approach },
          { label: 'Claimed results', value: application.claimedResults || '-' },
        ]}
      />
      {screened ? (
        <details
          open={openRules || application.eligibility !== 'ELIGIBLE'}
          className="rounded-lg bg-muted/50 px-3 py-2 text-sm"
        >
          <summary className="cursor-pointer font-medium text-foreground">
            Rule by rule result
          </summary>
          <ul className="mt-2 space-y-2">
            {application.ruleResults.map((result) => (
              <li
                key={result.ruleId}
                className="flex min-w-0 flex-wrap items-start gap-x-2 gap-y-1"
              >
                <StatusBadge status={result.status} />
                <p className="min-w-0 flex-1 basis-48">
                  <span className="text-foreground">
                    {ELIGIBILITY_RULES.find((r) => r.id === result.ruleId)?.label ?? result.ruleId}
                  </span>
                  <span className="block text-xs text-muted-foreground">{result.reason}</span>
                </p>
              </li>
            ))}
          </ul>
        </details>
      ) : (
        <p className="text-xs text-muted-foreground">
          Not screened yet. The rule by rule result appears here after screening.
        </p>
      )}
      {application.clarificationNote && (
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Clarification note:</span>{' '}
          {application.clarificationNote}
        </p>
      )}
      {application.eligibility === 'CLARIFICATION' && (
        <ClarificationForm application={application} />
      )}
    </li>
  )
}

export function ApplicationsPanel({ view }: { view: ChallengeView }) {
  const { challenge, applications } = view
  const screening = challenge.stage === 'SCREEN'
  const count = (status: EligibilityStatus) =>
    applications.filter((a) => a.eligibility === status).length
  const notScreened = count('NOT_SCREENED')
  const clarifications = count('CLARIFICATION')
  const sorted = [...applications].sort(
    (a, b) =>
      Number(b.id === challenge.selectedApplicationId) -
        Number(a.id === challenge.selectedApplicationId) ||
      STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) ||
      a.submittedOn.localeCompare(b.submittedOn),
  )

  return (
    <Panel
      title="Applications and eligibility"
      description="Every application is checked against the same published rules, with a reason for each result."
      actions={<SyntheticBadge />}
    >
      <div className="space-y-4">
        <dl className="grid grid-cols-1 gap-3 min-[340px]:grid-cols-2 sm:grid-cols-4">
          {COUNTS.map(({ status, label }) => (
            <div key={status} className="min-w-0 rounded-lg border px-3 py-2">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="tabular text-2xl font-semibold text-foreground">
                {fmtInt(count(status))}
              </dd>
            </div>
          ))}
        </dl>

        {challenge.stage === 'DISCOVER' && (
          <p className="text-sm text-muted-foreground">
            The call is still open. Screening starts after the innovation cell closes the call.
          </p>
        )}

        {screening && notScreened > 0 && (
          <NextStep
            role="cell"
            label="Run eligibility screening"
            hint="Checks every application against the rules below and records a reason for each rule."
          >
            <Button
              onClick={() =>
                run(() => runScreening(challenge.id), 'Eligibility screening completed')
              }
            >
              Run eligibility screening
            </Button>
          </NextStep>
        )}
        {screening && notScreened === 0 && clarifications > 0 && (
          <NextStep
            role="cell"
            label="Settle the pending clarification"
            hint="Use the form on the application below. The challenge moves to expert evaluation when no clarification is pending."
          />
        )}
        {screening && applications.length > 0 && notScreened === 0 && clarifications === 0 && (
          <Callout tone="warning" title="No application is eligible">
            The challenge cannot move to expert evaluation. The reasons are recorded on each
            application below.
          </Callout>
        )}

        <RulesApplied open={screening} />

        {sorted.length === 0 ? (
          <EmptyState
            title="No applications yet"
            description="Applications appear here as soon as startups apply on the Startup dashboard."
          />
        ) : (
          <ul className="grid grid-cols-1 gap-3 2xl:grid-cols-2">
            {sorted.map((application) => (
              <ApplicationCard
                key={application.id}
                application={application}
                ceilingLakh={challenge.brief.budgetCeilingLakh}
                openRules={screening}
              />
            ))}
          </ul>
        )}
      </div>
    </Panel>
  )
}
