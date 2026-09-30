// Small form helpers shared by the pilot tab sections.
import type { ReactNode } from 'react'

import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { cn } from '@/lib/utils'

/** A visible label above one input, with an optional hint below it. */
export function Field({
  id,
  label,
  hint,
  children,
  className,
}: {
  id: string
  label: ReactNode
  hint?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('min-w-0 space-y-1.5', className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

/** One choice out of a labelled set (the keys of `options`). */
export function RadioChoice<T extends string>({
  id,
  legend,
  options,
  value,
  onChange,
}: {
  id: string
  legend: string
  options: Record<T, string>
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className="min-w-0 space-y-2">
      <p id={`${id}-legend`} className="text-sm font-medium">
        {legend}
      </p>
      <RadioGroup
        aria-labelledby={`${id}-legend`}
        value={value}
        onValueChange={(next) => onChange(next as T)}
      >
        {(Object.keys(options) as T[]).map((key) => (
          <div key={key} className="flex min-w-0 items-start gap-2">
            <RadioGroupItem id={`${id}-${key}`} value={key} className="mt-0.5" />
            <Label htmlFor={`${id}-${key}`} className="min-w-0 leading-snug font-normal">
              {options[key]}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  )
}

/** A short label and value pair, used in wrapping rows of key facts. */
export function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="tabular text-sm font-medium text-foreground">{children}</dd>
    </div>
  )
}
