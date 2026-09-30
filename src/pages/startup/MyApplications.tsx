// Every application of the acting startup, with the reason for each screening result and,
// once the evaluation is closed, its rank and score.
import { StageBadge, StatusBadge } from '@/components/badges'
import { Panel } from '@/components/headers'
import { EmptyState } from '@/components/states'
import { ELIGIBILITY_RULES, POLICY, RUBRIC } from '@/lib/domain/policy'
import { rankApplications } from '@/lib/domain/rules'
import type { Application, Challenge, DemoState, Startup } from '@/lib/domain/types'
import { fmtDate, fmtLakh, fmtNum, plural } from '@/lib/format'

function Screening({ application }: { application: Application }) {
  if (application.eligibility === 'NOT_SCREENED') {
    return (
      <p className="text-sm text-muted-foreground">
        Not screened yet. After the call closes, the innovation cell checks the application against
        the published rules. Each result and its reason will show here.
      </p>
    )
  }
  const rows = ELIGIBILITY_RULES.map((rule) => ({
    rule,
    result: application.ruleResults.find((r) => r.ruleId === rule.id),
  }))
  const count = (status: string) => rows.filter((r) => r.result?.status === status).length
  const summary = [
    `${count('PASS')} passed`,
    count('FAIL') ? `${count('FAIL')} failed` : '',
    count('CLARIFY') ? `${count('CLARIFY')} to clarify` : '',
    `${count('RELAXED')} not required from startups`,
  ]
    .filter(Boolean)
    .join(', ')
  return (
    <details open={application.eligibility !== 'ELIGIBLE'} className="rounded-lg border text-sm">
      <summary className="cursor-pointer px-3 py-2.5 font-medium text-foreground">
        Eligibility check, rule by rule: {summary}
      </summary>
      <ul className="divide-y border-t">
        {rows.map(({ rule, result }) => (
          <li key={rule.id} className="flex flex-wrap items-start gap-x-3 gap-y-1 px-3 py-2.5">
            <div className="min-w-0 flex-1 basis-48">
              <p className="font-medium text-foreground">{rule.label}</p>
              <p className="text-xs text-muted-foreground">
                {result?.reason ?? 'No result recorded.'}
              </p>
            </div>
            {result && <StatusBadge status={result.status} />}
          </li>
        ))}
      </ul>
      {application.clarificationNote && (
        <p className="border-t px-3 py-2.5 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Clarification: </span>
          {application.clarificationNote}
        </p>
      )}
    </details>
  )
}

function Ranking({
  application,
  challenge,
  state,
}: {
  application: Application
  challenge: Challenge
  state: DemoState
}) {
  if (application.eligibility !== 'ELIGIBLE') return null
  if (!challenge.selectedApplicationId) {
    return (
      <p className="text-sm text-muted-foreground">
        {challenge.stage === 'EVALUATE'
          ? 'Evaluation in progress. '
          : 'Expert evaluation starts when screening is complete. '}
        The rank and score show here when the innovation cell closes the evaluation.
      </p>
    )
  }
  const ranked = rankApplications(
    state.applications.filter((a) => a.challengeId === challenge.id),
    state.scores,
  )
  const row = ranked.find((r) => r.application.id === application.id)
  if (!row || row.rank === null || row.score === null) return null
  return (
    <div className="space-y-2 rounded-lg border px-3 py-2.5 text-sm">
      <p className="font-medium text-foreground">
        Rank {row.rank} of {plural(ranked.length, 'eligible application')}, score{' '}
        {fmtNum(row.score)} out of 100
      </p>
      <p className="text-xs text-muted-foreground">
        Mean of {plural(row.evaluators, 'expert evaluator')}. Score needed for the shortlist:{' '}
        {POLICY.shortlistScore}. Average mark per criterion, out of 5:
      </p>
      <ul className="grid grid-cols-1 gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
        {RUBRIC.map((criterion) => (
          <li key={criterion.id} className="flex justify-between gap-3">
            <span className="min-w-0 text-muted-foreground">
              {criterion.name} (weight {criterion.weight})
            </span>
            <span className="tabular font-medium text-foreground">
              {fmtNum(row.byCriterion[criterion.id])}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function MyApplications({ state, startup }: { state: DemoState; startup: Startup }) {
  const applications = state.applications
    .filter((a) => a.startupId === startup.id)
    .sort((a, b) => b.submittedOn.localeCompare(a.submittedOn))
  return (
    <Panel
      title="My applications"
      description="Where each application stands, and why. Screening reasons and evaluation scores are always shown to the startup."
    >
      {applications.length === 0 ? (
        <EmptyState
          title="No applications yet"
          description="Apply to an open call above. The application shows here with its screening result, rank and score."
        />
      ) : (
        <ul className="space-y-4">
          {applications.map((application) => {
            const challenge = state.challenges.find((c) => c.id === application.challengeId)
            if (!challenge) return null
            return (
              <li key={application.id} className="min-w-0 space-y-3 rounded-lg border p-4">
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                  <div className="min-w-0 space-y-1">
                    <p className="text-xs font-semibold tracking-wider text-primary uppercase">
                      {challenge.code}
                    </p>
                    <h3 className="font-semibold text-foreground">{challenge.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      Submitted {fmtDate(application.submittedOn)}, quote{' '}
                      {fmtLakh(application.quoteLakh)}, {application.weeks} weeks
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={application.status} />
                    <StageBadge challenge={challenge} />
                  </div>
                </div>
                <Screening application={application} />
                <Ranking application={application} challenge={challenge} state={state} />
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}
