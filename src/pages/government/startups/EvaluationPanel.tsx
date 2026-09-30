// Expert evaluation: the rubric, the ranking with its reasons, and the result.
import { useState } from 'react'

import { Pill, StatusBadge, SyntheticBadge } from '@/components/badges'
import { Callout, NextStep } from '@/components/cards'
import { BarsChart } from '@/components/charts'
import { DataTable, type Column } from '@/components/DataTable'
import { Panel } from '@/components/headers'
import { ConfirmDialog } from '@/components/overlays'
import { EmptyState } from '@/components/states'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { run } from '@/lib/demo/run'
import { startupOf, type ChallengeView } from '@/lib/demo/selectors'
import { finaliseEvaluation, useDemoState } from '@/lib/demo/store'
import { POLICY, RUBRIC } from '@/lib/domain/policy'
import { evaluationComplete, type RankedApplication } from '@/lib/domain/rules'
import { fmtInt, fmtLakh, fmtNum, plural } from '@/lib/format'

/** Evaluators further apart than this (points out of 100) should discuss before the ranking is final. */
const MODERATION_SPREAD = 15

const nameOf = (row: RankedApplication) =>
  startupOf(row.application.startupId)?.name ?? 'Unknown startup'

const scoreText = (row: RankedApplication) =>
  row.score === null ? 'not scored' : `${fmtNum(row.score)} out of 100`

const COLUMNS: Column<RankedApplication>[] = [
  { key: 'rank', header: 'Rank', cell: (r) => (r.rank === null ? '-' : fmtInt(r.rank)) },
  {
    key: 'startup',
    header: 'Startup',
    className: 'min-w-28 whitespace-normal',
    cell: (r) => <span className="font-medium text-foreground">{nameOf(r)}</span>,
  },
  {
    key: 'score',
    header: 'Score',
    align: 'right',
    cell: (r) => (r.score === null ? 'Not scored' : fmtNum(r.score)),
  },
  {
    key: 'evaluators',
    header: 'Scored by',
    align: 'right',
    cell: (r) =>
      r.evaluators >= POLICY.minEvaluators
        ? fmtInt(r.evaluators)
        : `${fmtInt(r.evaluators)} (needs ${POLICY.minEvaluators})`,
  },
  {
    key: 'spread',
    header: 'Spread',
    cell: (r) => (
      <span className="inline-flex flex-wrap items-center gap-2">
        <span className="tabular">{r.evaluators > 1 ? `${fmtNum(r.spread)} points` : '-'}</span>
        {r.spread > MODERATION_SPREAD && <Pill tone="warning">Needs moderation</Pill>}
      </span>
    ),
  },
  { key: 'quote', header: 'Quote', align: 'right', cell: (r) => fmtLakh(r.application.quoteLakh) },
  { key: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.application.status} /> },
]

function Rubric() {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">Evaluation rubric</h3>
      <ul className="flex flex-wrap gap-1.5">
        {RUBRIC.map((criterion) => (
          <li key={criterion.id} className="min-w-0">
            <Pill
              className="h-auto min-h-6 shrink py-0.5 whitespace-normal"
              title={criterion.guidance}
            >
              {criterion.name}: {criterion.weight}
            </Pill>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        Each criterion is marked 1 to 5 and the weights add up to 100. An application needs{' '}
        {POLICY.shortlistScore} out of 100 to be shortlisted. Each eligible application is scored by
        at least {POLICY.minEvaluators} evaluators. These are configurable defaults of the
        prototype.
      </p>
    </div>
  )
}

function CriterionTable({ ranked }: { ranked: RankedApplication[] }) {
  return (
    <div className="max-w-full min-w-0 overflow-x-auto rounded-lg border">
      <Table>
        <TableCaption className="sr-only">
          Mean mark per criterion, from 1 to 5, for each application
        </TableCaption>
        <TableHeader className="bg-muted/60">
          <TableRow>
            <TableHead className="text-xs font-semibold text-muted-foreground uppercase">
              Startup
            </TableHead>
            {RUBRIC.map((criterion) => (
              <TableHead
                key={criterion.id}
                className="min-w-20 py-2 text-right text-xs font-semibold whitespace-normal text-muted-foreground"
              >
                {criterion.name} (weight {criterion.weight})
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {ranked.map((row) => (
            <TableRow key={row.application.id}>
              <TableCell className="min-w-40 font-medium whitespace-normal text-foreground 2xl:whitespace-nowrap">
                {nameOf(row)}
              </TableCell>
              {RUBRIC.map((criterion) => (
                <TableCell key={criterion.id} className="tabular text-right">
                  {row.evaluators ? fmtNum(row.byCriterion[criterion.id]) : '-'}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function Result({ view }: { view: ChallengeView }) {
  const { ranked, selected } = view
  const winner = ranked.find((r) => r.application.id === selected?.id)
  const list = (status: string) =>
    ranked
      .filter((r) => r.application.status === status)
      .map((r) => `${nameOf(r)} (${scoreText(r)})`)
  const reserve = list('SHORTLISTED')
  const notSelected = list('NOT_SELECTED')
  if (!winner) {
    return (
      <Callout tone="warning" title="No selected startup on record">
        The evaluation is closed but no selected application is recorded for this challenge.
      </Callout>
    )
  }
  return (
    <Callout
      tone="success"
      title={`Selected for the pilot: ${nameOf(winner)}, ${scoreText(winner)}`}
    >
      <p>
        Ranked first by {plural(winner.evaluators, 'evaluator')} and above the shortlist score of{' '}
        {POLICY.shortlistScore}.
      </p>
      <p>
        <span className="font-medium text-foreground">Reserve list:</span>{' '}
        {reserve.length ? reserve.join(', ') : 'none'}.
      </p>
      <p>
        <span className="font-medium text-foreground">Not selected:</span>{' '}
        {notSelected.length ? notSelected.join(', ') : 'none'}.
      </p>
    </Callout>
  )
}

export function EvaluationPanel({ view }: { view: ChallengeView }) {
  const { challenge, applications, ranked } = view
  const { scores } = useDemoState()
  const [confirm, setConfirm] = useState(false)
  const evaluating = challenge.stage === 'EVALUATE'
  const complete = evaluationComplete(applications, scores)
  const missing = ranked.reduce(
    (sum, r) => sum + Math.max(0, POLICY.minEvaluators - r.evaluators),
    0,
  )
  const top = ranked[0]
  const topPasses = (top?.score ?? 0) >= POLICY.shortlistScore
  const blocked = !complete
    ? `${plural(missing, 'score')} still missing: each eligible application needs ${POLICY.minEvaluators} evaluators.`
    : !topPasses
      ? `No application has reached the shortlist score of ${POLICY.shortlistScore}.`
      : null
  const closeButton = (
    <Button disabled={blocked !== null} onClick={() => setConfirm(true)}>
      Close evaluation and confirm ranking
    </Button>
  )
  const scored = ranked.filter((r) => r.score !== null)
  const barName = (r: RankedApplication) =>
    `${r.rank}. ${
      nameOf(r)
        .replace(/^Example /, '')
        .split(' ')[0]
    }`
  const highlighted =
    scored.find((r) => r.application.id === challenge.selectedApplicationId) ?? scored[0]

  return (
    <Panel
      title="Expert evaluation"
      description="Independent experts score the eligible applications against a weighted rubric."
      actions={<SyntheticBadge />}
    >
      <div className="space-y-5">
        {!evaluating && <Result view={view} />}

        {evaluating &&
          (complete ? (
            <NextStep
              role="cell"
              label="Close the evaluation and confirm the ranking"
              hint={
                blocked ??
                'All scores are in. Closing selects the first ranked application for the pilot.'
              }
            >
              {closeButton}
            </NextStep>
          ) : (
            <>
              <NextStep
                role="evaluator"
                label="Score the eligible applications"
                to="/experts"
                hint={`${plural(missing, 'score')} still missing. Evaluators score on the Expert dashboard.`}
              />
              <NextStep
                role="cell"
                label="Then: close the evaluation and confirm the ranking"
                hint={blocked}
              >
                {closeButton}
              </NextStep>
            </>
          ))}

        <Rubric />

        <div className="min-w-0 space-y-2">
          <h3 className="text-sm font-semibold text-foreground">
            {evaluating ? 'Ranking so far' : 'Final ranking'}
          </h3>
          <DataTable
            rows={ranked}
            columns={COLUMNS}
            rowKey={(r) => r.application.id}
            caption="Ranking of eligible applications"
            dense
            empty={
              <EmptyState
                title="No eligible application"
                description="The ranking appears here once eligible applications are scored."
              />
            }
          />
          <p className="text-xs text-muted-foreground">
            The score is out of 100 and is the mean of the evaluators' weighted scores. Scored by is
            the number of evaluators who scored the application. Spread is the gap between the
            highest and the lowest evaluator score; a spread above {MODERATION_SPREAD} points is
            flagged so the panel can discuss it. Equal scores are ranked by the lower quote.
          </p>
        </div>

        {ranked.length > 0 && (
          <div className="grid grid-cols-1 gap-5">
            <div className="min-w-0 space-y-2">
              <h3 className="text-sm font-semibold text-foreground">
                Why an application ranks where it does
              </h3>
              <p className="text-xs text-muted-foreground">
                Mean mark per criterion, from 1 to 5, across the evaluators who scored.
              </p>
              <CriterionTable ranked={ranked} />
            </div>
            <div className="min-w-0 space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Scores out of 100</h3>
              {scored.length ? (
                <BarsChart
                  label="Score out of 100"
                  data={scored.map((r) => ({ name: barName(r), value: r.score ?? 0 }))}
                  highlight={highlighted ? barName(highlighted) : undefined}
                />
              ) : (
                <EmptyState
                  title="No scores yet"
                  description="The chart appears after the first score."
                />
              )}
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Close the evaluation?"
        description={
          top
            ? `The ranking becomes final. ${nameOf(top)} is ranked first with ${scoreText(top)} and will be selected for the pilot.`
            : 'The ranking becomes final.'
        }
        confirmLabel="Close evaluation and confirm ranking"
        onConfirm={() => {
          run(() => finaliseEvaluation(challenge.id), 'Evaluation closed. Ranking confirmed.')
          setConfirm(false)
        }}
      />
    </Panel>
  )
}
