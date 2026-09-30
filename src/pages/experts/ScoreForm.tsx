// One evaluator's score for one application: a mark from 1 to 5 per rubric criterion,
// a comment and the conflict of interest declaration.
import { useState } from 'react'

import { Callout, Facts } from '@/components/cards'
import { EmptyState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { run } from '@/lib/demo/run'
import { evaluatorOf, startupOf } from '@/lib/demo/selectors'
import { submitScore, useDemoState } from '@/lib/demo/store'
import { RUBRIC } from '@/lib/domain/policy'
import { weightedScore } from '@/lib/domain/rules'
import { fmtLakh, fmtNum } from '@/lib/format'
import { cn } from '@/lib/utils'

const MARKS = [
  { value: 1, label: 'Poor' },
  { value: 2, label: 'Weak' },
  { value: 3, label: 'Fair' },
  { value: 4, label: 'Good' },
  { value: 5, label: 'Strong' },
]

/** A new score starts in the middle of the scale, so the default favours nobody. */
const MIDDLE_MARK = 3

export function ScoreForm({
  applicationId,
  onDone,
}: {
  applicationId: string
  onDone: () => void
}) {
  const state = useDemoState()
  const application = state.applications.find((a) => a.id === applicationId)
  const challenge = state.challenges.find((c) => c.id === application?.challengeId)
  const existing = state.scores.find(
    (s) => s.applicationId === applicationId && s.evaluatorId === state.evaluatorId,
  )
  const [marks, setMarks] = useState<Record<string, number>>(() =>
    Object.fromEntries(RUBRIC.map((c) => [c.id, existing?.marks[c.id] ?? MIDDLE_MARK])),
  )
  const [comment, setComment] = useState(existing?.comment ?? '')
  const [noConflict, setNoConflict] = useState(existing?.conflictDeclared ?? false)

  if (!application || !challenge) {
    return <EmptyState title="This application is no longer available" />
  }
  const startup = startupOf(application.startupId)
  const evaluator = evaluatorOf(state.evaluatorId)
  const total = weightedScore(marks)

  const submit = () => {
    if (
      run(
        () => submitScore(applicationId, marks, comment, noConflict),
        existing ? 'Score revised' : 'Score submitted',
      )
    ) {
      onDone()
    }
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <Facts
        items={[
          {
            label: 'Startup',
            value: startup ? `${startup.name}, ${startup.city}` : 'Startup',
          },
          { label: 'Approach', value: application.approach },
          { label: 'Results claimed', value: application.claimedResults || 'None stated' },
          { label: 'Quote', value: fmtLakh(application.quoteLakh) },
          { label: 'Pilot length', value: `${application.weeks} weeks` },
        ]}
      />

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">What the pilot must achieve</h3>
        <ul className="space-y-1 text-sm text-muted-foreground">
          {challenge.brief.kpis.map((kpi) => (
            <li key={kpi.id}>
              <span className="text-foreground">{kpi.name}:</span> from {fmtNum(kpi.baseline)} to{' '}
              {fmtNum(kpi.target)} {kpi.unit}
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Marks: 1 is the lowest, 5 is the highest</h3>
        {!existing && (
          <p className="text-sm text-muted-foreground">
            Every mark starts at 3, the middle of the scale. Change each one to your own assessment.
          </p>
        )}
        {RUBRIC.map((criterion) => (
          <fieldset key={criterion.id} className="min-w-0 space-y-2 rounded-lg border p-3">
            <legend className="px-1 text-sm font-medium">
              {criterion.name}{' '}
              <span className="font-normal text-muted-foreground">
                (weight {criterion.weight} of 100)
              </span>
            </legend>
            <p className="text-sm text-muted-foreground">{criterion.guidance}</p>
            <RadioGroup
              aria-label={`Mark for ${criterion.name}`}
              value={String(marks[criterion.id])}
              onValueChange={(value) => setMarks({ ...marks, [criterion.id]: Number(value) })}
              className="flex flex-wrap gap-2"
            >
              {MARKS.map((mark) => {
                const id = `mark-${criterion.id}-${mark.value}`
                return (
                  <Label
                    key={mark.value}
                    htmlFor={id}
                    className={cn(
                      'cursor-pointer rounded-lg border px-2.5 py-2 font-normal',
                      marks[criterion.id] === mark.value && 'border-primary bg-accent font-medium',
                    )}
                  >
                    <RadioGroupItem id={id} value={String(mark.value)} />
                    <span className="tabular">{mark.value}</span>
                    <span className="text-muted-foreground">{mark.label}</span>
                  </Label>
                )
              })}
            </RadioGroup>
          </fieldset>
        ))}
      </div>

      <div
        role="status"
        aria-live="polite"
        className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-primary/30 bg-accent px-4 py-3"
      >
        <span className="text-sm font-medium">Weighted score</span>
        <span className="tabular text-2xl font-semibold">
          {fmtNum(total)} <span className="text-sm font-normal text-muted-foreground">of 100</span>
        </span>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="score-comment">Comment for the panel (optional)</Label>
        <Textarea
          id="score-comment"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Reasons for the marks, and anything the department should check in the pilot."
        />
      </div>

      <div className="flex items-start gap-2.5">
        <Checkbox
          id="score-no-conflict"
          className="mt-0.5"
          aria-required
          checked={noConflict}
          onCheckedChange={(checked) => setNoConflict(checked === true)}
        />
        <Label htmlFor="score-no-conflict" className="leading-snug">
          I declare that I have no conflict of interest with this startup (required)
        </Label>
      </div>

      <Callout tone="info">
        Scoring is blind: the marks of other evaluators are not shown here. Your score is recorded
        in the audit trail under {evaluator?.name ?? 'the acting evaluator'}.
      </Callout>

      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit">{existing ? 'Save revised score' : 'Submit score'}</Button>
      </div>
    </form>
  )
}
