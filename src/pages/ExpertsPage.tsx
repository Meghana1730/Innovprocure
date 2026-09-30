// The dashboard of the two independent roles: expert evaluators score applications,
// the independent validator confirms pilot results.
import { useSearchParams } from 'react-router-dom'

import { SyntheticBadge } from '@/components/badges'
import { PageHeader } from '@/components/headers'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { openTasks } from '@/lib/demo/selectors'
import { useDemoState } from '@/lib/demo/store'
import { EvaluationView } from '@/pages/experts/EvaluationView'
import { ValidationView } from '@/pages/experts/ValidationView'

const VIEWS = ['evaluation', 'validation'] as const
type View = (typeof VIEWS)[number]

function Count({ value }: { value: number }) {
  return (
    <span className="tabular rounded-md bg-accent px-1.5 text-xs font-semibold text-accent-foreground">
      {value}
      <span className="sr-only"> open steps</span>
    </span>
  )
}

export default function ExpertsPage() {
  const state = useDemoState()
  const [params, setParams] = useSearchParams()
  const requested = params.get('view')?.toLowerCase()
  const view: View = VIEWS.find((v) => v === requested) ?? 'evaluation'
  const openView = (value: string) => {
    const next = new URLSearchParams(params)
    next.set('view', value)
    setParams(next, { replace: true })
  }
  // Open steps, one per challenge: the same numbers as the sidebar and the Government dashboard.
  const waitingScores = openTasks(state, 'evaluator').length
  const waitingPilots = openTasks(state, 'validator').length

  return (
    <>
      <PageHeader
        eyebrow="Independent experts"
        title="Expert dashboard"
        description="Expert evaluators score eligible applications. The independent validator confirms pilot results before the department decides."
        badges={<SyntheticBadge />}
      />
      <Tabs value={view} onValueChange={openView} className="max-w-full min-w-0">
        <TabsList className="no-scrollbar h-auto max-w-full justify-start overflow-x-auto overflow-y-hidden">
          <TabsTrigger value="evaluation" className="px-3 py-1.5">
            Evaluation <Count value={waitingScores} />
          </TabsTrigger>
          <TabsTrigger value="validation" className="px-3 py-1.5">
            Validation <Count value={waitingPilots} />
          </TabsTrigger>
        </TabsList>
        <TabsContent value="evaluation" className="mt-4">
          <EvaluationView />
        </TabsContent>
        <TabsContent value="validation" className="mt-4">
          <ValidationView />
        </TabsContent>
      </Tabs>
    </>
  )
}
