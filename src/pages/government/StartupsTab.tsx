// Workspace tab: startup discovery, eligibility screening and expert evaluation of one challenge.
import { Panel } from '@/components/headers'
import { EmptyState } from '@/components/states'
import { stageIndex, type ChallengeView } from '@/lib/demo/selectors'
import { ApplicationsPanel } from '@/pages/government/startups/ApplicationsPanel'
import { DiscoveryPanel } from '@/pages/government/startups/DiscoveryPanel'
import { EvaluationPanel } from '@/pages/government/startups/EvaluationPanel'

export function StartupsTab({ view }: { view: ChallengeView }) {
  const { stage } = view.challenge

  if (stage === 'IDENTIFY') {
    return (
      <Panel title="Startups and evaluation">
        <EmptyState
          title="The challenge is not published yet"
          description="Matching startups and applications appear here once the innovation cell publishes the challenge."
        />
      </Panel>
    )
  }

  return (
    <div className="min-w-0 space-y-4">
      <DiscoveryPanel view={view} />
      <ApplicationsPanel view={view} />
      {stageIndex(stage) >= stageIndex('EVALUATE') ? (
        <EvaluationPanel view={view} />
      ) : (
        <Panel title="Expert evaluation">
          <p className="text-sm text-muted-foreground">
            The rubric, the evaluators' scores and the ranking appear here once eligibility
            screening is complete.
          </p>
        </Panel>
      )}
    </div>
  )
}
