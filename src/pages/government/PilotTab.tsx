// Workspace tab "Pilot and payments": sandbox / pilot design, the milestone-based contract,
// milestone acceptance and payments, and performance against the KPI targets.
// Each section appears only when the challenge has reached its stage.
import { EmptyState } from '@/components/states'
import { stageIndex, type ChallengeView } from '@/lib/demo/selectors'
import type { Stage } from '@/lib/domain/types'
import { ContractPanel } from '@/pages/government/pilot/ContractPanel'
import { MilestonesPanel } from '@/pages/government/pilot/MilestonesPanel'
import { PerformancePanel } from '@/pages/government/pilot/PerformancePanel'
import { PilotDesignPanel } from '@/pages/government/pilot/PilotDesignPanel'

export function PilotTab({ view }: { view: ChallengeView }) {
  const { challenge } = view
  const reached = (stage: Stage) => stageIndex(challenge.stage) >= stageIndex(stage)

  if (!reached('PILOT_DESIGN')) {
    return (
      <EmptyState
        title="The pilot has not been designed yet"
        description="The pilot plan, the milestone-based contract, payments and KPI readings appear here once the expert evaluation has selected a startup."
      />
    )
  }

  return (
    <div className="min-w-0 space-y-4">
      <PilotDesignPanel view={view} />
      {reached('CONTRACT') && <ContractPanel view={view} />}
      {reached('MEASURE') && (
        <>
          <MilestonesPanel key={challenge.id} view={view} />
          <PerformancePanel key={`performance-${challenge.id}`} view={view} />
        </>
      )}
      {!reached('MEASURE') && (
        <p className="text-sm text-muted-foreground">
          {reached('CONTRACT')
            ? 'Next: milestones, payments and KPI readings appear here once the agreement is signed.'
            : 'Next: the milestone-based contract appears here once the pilot plan is approved.'}
        </p>
      )}
    </div>
  )
}
