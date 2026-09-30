// The brief quality check: the points the innovation cell looks at before publishing.
import { CircleCheck, ListChecks } from 'lucide-react'

import { Callout } from '@/components/cards'
import { briefGaps } from '@/lib/demo/store'
import type { ChallengeBrief } from '@/lib/domain/types'
import { plural } from '@/lib/format'

export function BriefQuality({ title, brief }: { title: string; brief: ChallengeBrief }) {
  const gaps = briefGaps(title, brief)
  if (gaps.length === 0) {
    return (
      <Callout
        tone="success"
        icon={<CircleCheck aria-hidden />}
        title="Brief quality check: ready to publish"
      >
        The brief says what should improve, how it is measured and the terms of the pilot.
      </Callout>
    )
  }
  return (
    <Callout
      tone="warning"
      icon={<ListChecks aria-hidden />}
      title={`Brief quality check: ${plural(gaps.length, 'point')} to fix`}
    >
      <ul className="list-disc space-y-0.5 pl-4">
        {gaps.map((gap) => (
          <li key={gap}>{gap}</li>
        ))}
      </ul>
      <p className="mt-2">Describe the outcome you want, not the product you think you need.</p>
    </Callout>
  )
}
