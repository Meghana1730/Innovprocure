// Evaluation tab of the expert dashboard: what the acting evaluator has to score,
// what they have scored, and how scoring works.
import { useState } from 'react'

import { SyntheticBadge } from '@/components/badges'
import { Callout, DoneBy, NextStep } from '@/components/cards'
import { DataTable, type Column } from '@/components/DataTable'
import { Panel } from '@/components/headers'
import { Drawer } from '@/components/overlays'
import { EmptyState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { run } from '@/lib/demo/run'
import { EVALUATORS } from '@/lib/demo/seed'
import { evaluatorOf, openTasks, startupOf } from '@/lib/demo/selectors'
import { setActingEvaluator, useDemoState } from '@/lib/demo/store'
import { POLICY, RUBRIC } from '@/lib/domain/policy'
import { weightedScore } from '@/lib/domain/rules'
import type { Challenge } from '@/lib/domain/types'
import { fmtDate, fmtLakh, fmtNum, plural } from '@/lib/format'
import { toScore } from '@/pages/experts/queues'
import { ScoreForm } from '@/pages/experts/ScoreForm'

type ScoredRow = {
  applicationId: string
  challenge: Challenge
  startupName: string
  total: number
  on: string
  /** The score can still be revised: the evaluation has not been closed. */
  open: boolean
}

const HOW_IT_WORKS = [
  'Each criterion gets a mark from 1 (lowest) to 5 (highest). The weights turn the marks into a score out of 100.',
  'Before scoring, the evaluator declares that there is no conflict of interest with the startup.',
  'Scoring is blind: an evaluator does not see the marks of other evaluators while scoring.',
  `Every eligible application needs scores from at least ${POLICY.minEvaluators} evaluators.`,
  'When the scores of two evaluators differ widely, the panel discusses the application before the ranking is final (moderation).',
  `The innovation cell closes the evaluation on the Government dashboard. An application needs ${POLICY.shortlistScore} out of 100 to be shortlisted.`,
]

export function EvaluationView() {
  const state = useDemoState()
  const [drawer, setDrawer] = useState({ id: '', open: false })
  const openScore = (id: string) => setDrawer({ id, open: true })
  const evaluator = evaluatorOf(state.evaluatorId)
  const groups = toScore(state)
  const toClose = openTasks(state, 'cell').filter((task) => task.challenge.stage === 'EVALUATE')
  // Challenges that still need scores. In the other challenges a further score is optional.
  const needScores = openTasks(state, 'evaluator').map((task) => task.challenge)

  const scored: ScoredRow[] = state.scores
    .filter((s) => s.evaluatorId === state.evaluatorId)
    .sort((a, b) => b.submittedOn.localeCompare(a.submittedOn))
    .flatMap((s) => {
      const application = state.applications.find((a) => a.id === s.applicationId)
      const challenge = state.challenges.find((c) => c.id === application?.challengeId)
      if (!application || !challenge) return []
      return [
        {
          applicationId: application.id,
          challenge,
          startupName: startupOf(application.startupId)?.name ?? 'Startup',
          total: weightedScore(s.marks),
          on: s.submittedOn,
          open: challenge.stage === 'EVALUATE' && !challenge.outcome,
        },
      ]
    })

  const columns: Column<ScoredRow>[] = [
    // Few columns, so the table and its Action column fit a narrow panel and a phone.
    {
      key: 'application',
      header: 'Application',
      className: 'min-w-36 whitespace-normal',
      sortValue: (row) => row.startupName,
      cell: (row) => (
        <>
          <span className="font-medium">{row.startupName}</span>
          <span className="block text-xs text-muted-foreground">
            {row.challenge.code}: {row.challenge.title}
          </span>
          <span className="block text-xs text-muted-foreground">Scored on {fmtDate(row.on)}</span>
        </>
      ),
    },
    {
      key: 'score',
      header: 'My score',
      align: 'right',
      sortValue: (row) => row.total,
      cell: (row) => `${fmtNum(row.total)} of 100`,
    },
    {
      key: 'action',
      header: 'Action',
      className: 'whitespace-normal',
      cell: (row) =>
        row.open ? (
          <Button
            size="sm"
            variant="outline"
            aria-label={`Revise the score of ${row.startupName}`}
            onClick={() => openScore(row.applicationId)}
          >
            Revise
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground sm:whitespace-nowrap">
            Evaluation closed
          </span>
        ),
    },
  ]

  const scoringApplication = state.applications.find((a) => a.id === drawer.id)
  const scoringChallenge = state.challenges.find((c) => c.id === scoringApplication?.challengeId)

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <div className="min-w-0 space-y-4 xl:col-span-2">
        <Panel>
          <div className="flex min-w-0 flex-wrap items-end gap-x-6 gap-y-3">
            <div className="grid w-full min-w-0 gap-1.5 sm:w-80">
              <Label htmlFor="acting-evaluator">Acting as</Label>
              <Select
                value={state.evaluatorId}
                onValueChange={(id) =>
                  run(
                    () => setActingEvaluator(id),
                    `Now acting as ${evaluatorOf(id)?.name ?? 'this evaluator'}`,
                  )
                }
              >
                <SelectTrigger id="acting-evaluator" className="w-full min-w-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVALUATORS.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}: {e.expertise}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="min-w-0 flex-1 basis-56 text-sm text-muted-foreground">
              {evaluator ? `${evaluator.organisation}. ` : ''}The prototype has no sign-in: choose
              the expert you act as. Each expert sees only their own scores.
            </p>
          </div>
        </Panel>

        {toClose.map((task) => (
          <NextStep
            key={task.challenge.id}
            role={task.role}
            label={`${task.challenge.code}: ${task.label}`}
            hint="Every eligible application now has enough scores. This step is taken on the Government dashboard."
            to={task.to}
          />
        ))}

        <Panel
          title="To score"
          description="Eligible applications you have not scored yet, by challenge."
          actions={<SyntheticBadge />}
          bodyClassName="space-y-4"
        >
          {groups.length === 0 ? (
            <EmptyState
              title="Nothing is waiting for your score"
              description={
                needScores.length > 0
                  ? `You have scored every application open to you. ${needScores.map((c) => c.code).join(', ')} still ${needScores.length === 1 ? 'needs' : 'need'} scores from another evaluator: choose another expert under "Acting as".`
                  : 'Applications appear here when a challenge reaches expert evaluation, after the innovation cell has screened them for eligibility on the Government dashboard.'
              }
            />
          ) : (
            groups.map(({ challenge, applications }) => (
              <div key={challenge.id} className="min-w-0 rounded-lg border">
                <div className="space-y-1 border-b bg-muted/40 px-4 py-3">
                  <h3 className="text-sm font-semibold">
                    {challenge.code}: {challenge.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {plural(challenge.brief.kpis.length, 'KPI')} to meet, pilot ceiling{' '}
                    {fmtLakh(challenge.brief.budgetCeilingLakh)}
                  </p>
                  {!needScores.includes(challenge) && (
                    <p className="text-sm text-muted-foreground">
                      Optional: every application already has enough scores. You can still add your
                      score until the innovation cell closes the evaluation.
                    </p>
                  )}
                </div>
                <ul className="divide-y">
                  {applications.map((application) => {
                    const name = startupOf(application.startupId)?.name ?? 'Startup'
                    const received = state.scores.filter(
                      (s) => s.applicationId === application.id,
                    ).length
                    return (
                      <li
                        key={application.id}
                        className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3"
                      >
                        <div className="min-w-0 flex-1 basis-48">
                          <p className="font-medium">{name}</p>
                          <p className="text-sm text-muted-foreground">
                            Quote {fmtLakh(application.quoteLakh)}, {application.weeks} weeks.{' '}
                            {plural(received, 'score')} from other evaluators so far.
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <DoneBy role="evaluator" />
                          <Button
                            size="sm"
                            aria-label={`Score ${name}`}
                            onClick={() => openScore(application.id)}
                          >
                            Score
                          </Button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))
          )}
        </Panel>

        <Panel
          title="Scored by me"
          description={`Scores submitted by ${evaluator?.name ?? 'the acting evaluator'}. A score can be revised until the innovation cell closes the evaluation.`}
          actions={<SyntheticBadge />}
        >
          <DataTable
            rows={scored}
            columns={columns}
            rowKey={(row) => row.applicationId}
            caption="Applications scored by the acting evaluator"
            dense
            empty={
              <EmptyState
                title="No scores yet"
                description="The applications you score will be listed here with your weighted score."
              />
            }
          />
        </Panel>
      </div>

      <Panel
        title="How scoring works"
        description="The same rubric is used for every application of a challenge."
        bodyClassName="space-y-4"
      >
        <ul className="space-y-3">
          {RUBRIC.map((criterion) => (
            <li key={criterion.id} className="min-w-0 text-sm">
              <p className="flex flex-wrap items-baseline justify-between gap-x-3 font-medium">
                {criterion.name}
                <span className="tabular text-xs font-semibold text-primary">
                  Weight {criterion.weight}
                </span>
              </p>
              <p className="text-muted-foreground">{criterion.guidance}</p>
            </li>
          ))}
        </ul>
        <ul className="list-disc space-y-1.5 border-t pt-4 pl-5 text-sm text-muted-foreground">
          {HOW_IT_WORKS.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <Callout tone="demo">
          The criteria, weights and thresholds are configurable defaults of the prototype, not
          statements of law.
        </Callout>
      </Panel>

      <Drawer
        open={drawer.open}
        onOpenChange={(open) => setDrawer((d) => ({ ...d, open }))}
        title={`Score: ${startupOf(scoringApplication?.startupId)?.name ?? 'application'}`}
        description={
          scoringChallenge ? `${scoringChallenge.code}: ${scoringChallenge.title}` : undefined
        }
      >
        {drawer.id && (
          <ScoreForm
            key={drawer.id}
            applicationId={drawer.id}
            onDone={() => setDrawer((d) => ({ ...d, open: false }))}
          />
        )}
      </Drawer>
    </div>
  )
}
