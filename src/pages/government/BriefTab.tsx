// The challenge brief as a readable document, with the review and publishing step.
import { Pencil, Send } from 'lucide-react'
import { useState } from 'react'

import { StatusBadge } from '@/components/badges'
import { Callout, DoneBy, Facts } from '@/components/cards'
import { DataTable, type Column } from '@/components/DataTable'
import { Panel } from '@/components/headers'
import { EmptyState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { run } from '@/lib/demo/run'
import type { ChallengeView } from '@/lib/demo/selectors'
import { briefGaps, publishChallenge, submitForReview } from '@/lib/demo/store'
import { IP_LABELS } from '@/lib/domain/policy'
import type { Kpi } from '@/lib/domain/types'
import { addDays, fmtDate, fmtLakh, fmtNum, plural, today } from '@/lib/format'
import { BriefQuality } from '@/pages/government/BriefQuality'
import { NewChallengeDrawer } from '@/pages/government/NewChallengeDrawer'

const KPI_COLUMNS: Column<Kpi>[] = [
  { key: 'name', header: 'Outcome', cell: (k) => k.name, className: 'min-w-48 whitespace-normal' },
  { key: 'unit', header: 'Unit', cell: (k) => k.unit },
  { key: 'baseline', header: 'Baseline', cell: (k) => fmtNum(k.baseline), align: 'right' },
  { key: 'target', header: 'Target', cell: (k) => fmtNum(k.target), align: 'right' },
  {
    key: 'better',
    header: 'Direction',
    cell: (k) => (k.better === 'lower' ? 'Lower is better' : 'Higher is better'),
  },
]

function Passage({ heading, text }: { heading: string; text: string }) {
  return (
    <div className="min-w-0 space-y-1">
      <h3 className="text-sm font-semibold text-foreground">{heading}</h3>
      <p className="text-sm break-words text-muted-foreground">{text.trim() || 'Not stated.'}</p>
    </div>
  )
}

export function BriefTab({ view }: { view: ChallengeView }) {
  const { challenge } = view
  const { brief } = challenge
  const [closesOn, setClosesOn] = useState(() => addDays(today(), 28))
  const [editing, setEditing] = useState(false)
  const drafting = challenge.stage === 'IDENTIFY' && !challenge.outcome
  const ready = briefGaps(challenge.title, brief).length === 0
  // The innovation cell can close the call before the planned date.
  const closedEarly =
    challenge.stage !== 'DISCOVER' && Boolean(challenge.closesOn) && challenge.closesOn! > today()

  return (
    <div className="min-w-0 space-y-4">
      {drafting ? (
        <>
          <BriefQuality title={challenge.title} brief={brief} />
          <div className="min-w-0 space-y-3 rounded-xl border bg-card p-4 shadow-xs">
            {challenge.reviewStatus === 'IN_REVIEW' ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground">Publish as open call</h3>
                  <DoneBy role="cell" />
                </div>
                <p className="text-sm text-muted-foreground">
                  The innovation cell reviews the brief and publishes it. Startups can apply until
                  the closing date.
                </p>
                <div className="flex flex-wrap items-end gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="brief-closes-on">Applications close on</Label>
                    <Input
                      id="brief-closes-on"
                      type="date"
                      className="w-44"
                      min={addDays(today(), 1)}
                      value={closesOn}
                      onChange={(event) => setClosesOn(event.target.value)}
                    />
                  </div>
                  <Button
                    disabled={!ready || !closesOn}
                    onClick={() =>
                      run(
                        () => publishChallenge(challenge.id, closesOn),
                        'Challenge published as an open call',
                      )
                    }
                  >
                    <Send aria-hidden /> Publish as open call
                  </Button>
                </div>
                {!ready && (
                  <p className="text-xs text-muted-foreground">
                    Publishing is possible once the department fixes the points in the quality
                    check.
                  </p>
                )}
              </>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground">Send for review</h3>
                  <DoneBy role="department" />
                </div>
                <p className="text-sm text-muted-foreground">
                  The brief is a draft. When the quality check is clear, send it to the innovation
                  cell for review.
                </p>
                <Button
                  disabled={!ready}
                  onClick={() =>
                    run(
                      () => submitForReview(challenge.id),
                      'Brief sent to the innovation cell for review',
                    )
                  }
                >
                  <Send aria-hidden /> Send for review
                </Button>
              </>
            )}
            <div className="flex flex-wrap items-center gap-2 border-t pt-3">
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil aria-hidden /> Edit the brief
              </Button>
              <DoneBy role="department" />
            </div>
          </div>
          <NewChallengeDrawer open={editing} onOpenChange={setEditing} challenge={challenge} />
        </>
      ) : (
        <Callout tone="success" title={`Published on ${fmtDate(challenge.publishedOn)}`}>
          {closedEarly
            ? 'The call was closed before the planned closing date.'
            : `Applications ${challenge.closesOn && challenge.closesOn >= today() ? 'close' : 'closed'} on ${fmtDate(challenge.closesOn)}.`}{' '}
          The brief is fixed once it is published, so every startup applies against the same terms.
        </Callout>
      )}

      <Panel
        title="Problem statement"
        description="Written by the department as an outcome, not as a product specification."
        actions={<StatusBadge status={challenge.reviewStatus} />}
        bodyClassName="space-y-4"
      >
        <Passage heading="The problem" text={brief.problem} />
        <Passage heading="Who is affected" text={brief.users} />
        <Passage heading="What is done today" text={brief.currentApproach} />
      </Panel>

      <Panel
        title="Measurable outcomes (KPIs)"
        description={`${plural(brief.kpis.length, 'outcome')}. The pilot is judged on the move from baseline to target.`}
      >
        <DataTable
          rows={brief.kpis}
          columns={KPI_COLUMNS}
          rowKey={(k) => k.id}
          caption="Outcomes with baseline and target"
          dense
          empty={
            <EmptyState
              title="No outcomes yet"
              description="The department adds at least one measurable outcome before the brief can be published."
            />
          }
        />
      </Panel>

      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
        <Panel title="Boundaries" bodyClassName="space-y-4">
          <Passage heading="Constraints" text={brief.constraints} />
          <Passage heading="Data the department can share" text={brief.dataAvailable} />
          <Passage heading="Out of scope" text={brief.outOfScope} />
        </Panel>
        <Panel title="Pilot terms and key dates">
          <Facts
            items={[
              { label: 'Pilot budget ceiling', value: fmtLakh(brief.budgetCeilingLakh) },
              { label: 'Pilot sites', value: brief.pilotSites || 'Not stated.' },
              { label: 'Pilot length', value: plural(brief.pilotWeeks, 'week') },
              { label: 'IP preference', value: IP_LABELS[brief.ipPreference] },
              { label: 'Brief created', value: fmtDate(challenge.createdOn) },
              {
                label: 'Published',
                value: challenge.publishedOn ? fmtDate(challenge.publishedOn) : 'Not published yet',
              },
              {
                label: 'Applications close',
                value: closedEarly
                  ? `Closed early (planned for ${fmtDate(challenge.closesOn)})`
                  : challenge.closesOn
                    ? fmtDate(challenge.closesOn)
                    : 'Set by the innovation cell when it publishes',
              },
            ]}
          />
        </Panel>
      </div>
    </div>
  )
}
