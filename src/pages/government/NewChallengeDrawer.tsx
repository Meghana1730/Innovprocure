// The outcome-based problem statement template as a form. Used to draft a new challenge and,
// with `challenge` set, to edit a brief that is not published yet.
import { Plus, Sparkles, Trash2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { DoneBy } from '@/components/cards'
import { Drawer } from '@/components/overlays'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { run } from '@/lib/demo/run'
import { DEPARTMENTS } from '@/lib/demo/seed'
import { briefGaps, createChallenge, submitForReview, updateChallenge } from '@/lib/demo/store'
import { IP_LABELS } from '@/lib/domain/policy'
import type { Challenge, ChallengeBrief, IpOption, Kpi } from '@/lib/domain/types'
import { cn } from '@/lib/utils'
import { BriefQuality } from '@/pages/government/BriefQuality'

type KpiRow = {
  id: string
  name: string
  unit: string
  baseline: string
  target: string
  better: Kpi['better']
}

type Form = {
  departmentId: string
  title: string
  problem: string
  users: string
  currentApproach: string
  kpis: KpiRow[]
  constraints: string
  dataAvailable: string
  outOfScope: string
  budget: string
  pilotSites: string
  weeks: string
  ip: IpOption
}

type TextKey = Exclude<keyof Form, 'kpis' | 'ip'>

const kpiRow = (id: string, name = '', unit = '', baseline = '', target = ''): KpiRow => ({
  id,
  name,
  unit,
  baseline,
  target,
  better: 'lower',
})

const BLANK: Form = {
  departmentId: DEPARTMENTS[0]?.id ?? '',
  title: '',
  problem: '',
  users: '',
  currentApproach: '',
  kpis: [kpiRow('k1')],
  constraints: '',
  dataAvailable: '',
  outOfScope: '',
  budget: '10',
  pilotSites: '',
  weeks: '12',
  ip: 'STARTUP_OWNS_GOVT_LICENCE',
}

// A made-up example, so the step takes seconds in a demo.
const EXAMPLE: Form = {
  departmentId: DEPARTMENTS.find((d) => d.sector === 'ENERGY')?.id ?? BLANK.departmentId,
  title: 'Repair failed streetlights within 48 hours of a complaint',
  problem:
    'Residents report a failed streetlight by phone or at the ward office. The complaint reaches the repair crew after several days, and nobody can see which lights are still dark. Dark streets are a safety concern, most of all for women and older residents.',
  users: 'About 1.2 lakh residents in 8 wards, and the 14-person street lighting maintenance team.',
  currentApproach:
    'Complaints are written in a register at the ward office and passed to the repair crew once a week. There is no record of when a light was repaired.',
  kpis: [
    kpiRow('k1', 'Average time to repair a reported streetlight', 'hours', '120', '48'),
    { ...kpiRow('k2', 'Complaints closed within 48 hours', '%', '30', '85'), better: 'higher' },
    { ...kpiRow('k3', 'Streetlights working at night', '%', '82', '95'), better: 'higher' },
  ],
  constraints:
    'Must work with the existing poles and fittings. Residents keep reporting by phone and at the ward office.',
  dataAvailable:
    'List of poles with ward and location, one year of complaint registers, repair bills of the last year.',
  outOfScope: 'Replacing fittings, new poles and the electricity billing system.',
  budget: '12',
  pilotSites: '2 wards (about 2,400 streetlights)',
  weeks: '12',
  ip: 'STARTUP_OWNS_GOVT_LICENCE',
}

/** "12.5" -> 12.5; blank or not a number -> 0. */
function num(text: string): number {
  const value = Number(text.trim())
  return text.trim() !== '' && Number.isFinite(value) ? value : 0
}

function toBrief(form: Form): ChallengeBrief {
  return {
    problem: form.problem.trim(),
    users: form.users.trim(),
    currentApproach: form.currentApproach.trim(),
    kpis: form.kpis.map((k) => ({
      id: k.id,
      name: k.name.trim(),
      unit: k.unit.trim(),
      baseline: num(k.baseline),
      target: num(k.target),
      better: k.better,
    })),
    constraints: form.constraints.trim(),
    dataAvailable: form.dataAvailable.trim(),
    outOfScope: form.outOfScope.trim(),
    budgetCeilingLakh: Math.max(0, num(form.budget)),
    pilotSites: form.pilotSites.trim(),
    pilotWeeks: Math.max(0, Math.round(num(form.weeks))),
    ipPreference: form.ip,
  }
}

function toForm(challenge: Challenge): Form {
  const { brief } = challenge
  return {
    departmentId: challenge.departmentId,
    title: challenge.title,
    problem: brief.problem,
    users: brief.users,
    currentApproach: brief.currentApproach,
    kpis: brief.kpis.map((k) => ({
      ...k,
      baseline: String(k.baseline),
      target: String(k.target),
    })),
    constraints: brief.constraints,
    dataAvailable: brief.dataAvailable,
    outOfScope: brief.outOfScope,
    budget: String(brief.budgetCeilingLakh),
    pilotSites: brief.pilotSites,
    weeks: String(brief.pilotWeeks),
    ip: brief.ipPreference,
  }
}

function nextKpiId(rows: KpiRow[]): string {
  const highest = Math.max(0, ...rows.map((r) => Number(r.id.replace(/\D/g, '')) || 0))
  return `k${highest + 1}`
}

function Field({
  id,
  label,
  hint,
  children,
  className,
}: {
  id: string
  label: string
  hint?: string
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

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called with the id of the new challenge after it is saved. */
  onCreated?: (id: string) => void
  /** Edit the brief of this challenge instead of creating a new one. */
  challenge?: Challenge
}

// The form is mounted only while the drawer is open, so it always starts from fresh values.
export function NewChallengeDrawer(props: Props) {
  return props.open ? <ChallengeForm {...props} /> : null
}

function ChallengeForm({ open, onOpenChange, onCreated, challenge }: Props) {
  const [form, setForm] = useState<Form>(() => (challenge ? toForm(challenge) : BLANK))
  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }))
  const setKpi = (id: string, patch: Partial<KpiRow>) =>
    setForm((f) => ({ ...f, kpis: f.kpis.map((k) => (k.id === id ? { ...k, ...patch } : k)) }))
  const brief = toBrief(form)
  const ready = briefGaps(form.title, brief).length === 0

  const text = (key: TextKey) => ({
    id: `nc-${key}`,
    value: form[key],
    onChange: (event: { target: { value: string } }) =>
      setForm((f) => ({ ...f, [key]: event.target.value })),
  })

  const save = () => {
    if (challenge) {
      const ok = run(
        () => updateChallenge(challenge.id, { title: form.title, brief }),
        'Brief updated',
      )
      if (ok) onOpenChange(false)
      return
    }
    let id = ''
    const ok = run(
      () => {
        id = createChallenge({ title: form.title, departmentId: form.departmentId, brief })
        // Only a complete brief goes to the innovation cell; otherwise it stays a draft.
        if (ready) submitForReview(id)
      },
      ready
        ? 'Challenge saved and sent to the innovation cell for review'
        : 'Challenge saved as a draft. Complete the brief to send it for review',
    )
    if (ok) {
      onOpenChange(false)
      onCreated?.(id)
    }
  }

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title={challenge ? `Edit the brief of ${challenge.code}` : 'New challenge'}
      description="Outcome-based problem statement template. Say what should improve and how you will measure it."
      footer={
        <>
          <DoneBy role="department" />
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save}>{challenge ? 'Save brief' : 'Save challenge'}</Button>
        </>
      }
    >
      <div className="space-y-6">
        {!challenge && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <Button variant="secondary" size="sm" onClick={() => setForm(EXAMPLE)}>
              <Sparkles aria-hidden /> Fill with an example
            </Button>
            <p className="text-xs text-muted-foreground">
              The example is made up for the demo. You can edit every field.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4">
          <Field id="nc-department" label="Department">
            <Select
              value={form.departmentId}
              onValueChange={(departmentId) => set({ departmentId })}
              disabled={Boolean(challenge)}
            >
              <SelectTrigger
                id="nc-department"
                className="w-full min-w-0 *:data-[slot=select-value]:block *:data-[slot=select-value]:truncate"
              >
                <SelectValue placeholder="Choose a department" />
              </SelectTrigger>
              <SelectContent>
                {DEPARTMENTS.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.short} ({d.district})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field
            id="nc-title"
            label="Challenge title"
            hint="State the result, for example: Repair failed streetlights within 48 hours."
          >
            <Input {...text('title')} />
          </Field>
          <Field id="nc-problem" label="The problem" hint="What goes wrong today, and for whom.">
            <Textarea rows={4} {...text('problem')} />
          </Field>
          <Field id="nc-users" label="Who is affected, and how many">
            <Textarea rows={2} {...text('users')} />
          </Field>
          <Field
            id="nc-currentApproach"
            label="What is done today"
            hint="The current approach and why it is not enough."
          >
            <Textarea rows={2} {...text('currentApproach')} />
          </Field>
        </div>

        <fieldset className="min-w-0 space-y-3">
          <legend className="text-sm font-semibold text-foreground">
            Measurable outcomes (KPIs)
          </legend>
          <p className="text-xs text-muted-foreground">
            Each outcome has a baseline (today) and a target (end of the pilot). The pilot is judged
            on these.
          </p>
          {form.kpis.map((k, index) => (
            <div key={k.id} className="min-w-0 space-y-3 rounded-lg border bg-muted/30 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase">
                  Outcome {index + 1}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={form.kpis.length === 1}
                  onClick={() => set({ kpis: form.kpis.filter((row) => row.id !== k.id) })}
                >
                  <Trash2 aria-hidden /> Remove<span className="sr-only"> outcome {index + 1}</span>
                </Button>
              </div>
              <Field id={`nc-kpi-${k.id}-name`} label="What is measured">
                <Input
                  id={`nc-kpi-${k.id}-name`}
                  value={k.name}
                  onChange={(event) => setKpi(k.id, { name: event.target.value })}
                />
              </Field>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field id={`nc-kpi-${k.id}-unit`} label="Unit">
                  <Input
                    id={`nc-kpi-${k.id}-unit`}
                    value={k.unit}
                    placeholder="hours, %, number"
                    onChange={(event) => setKpi(k.id, { unit: event.target.value })}
                  />
                </Field>
                <Field id={`nc-kpi-${k.id}-better`} label="Direction">
                  <Select
                    value={k.better}
                    onValueChange={(better) => setKpi(k.id, { better: better as Kpi['better'] })}
                  >
                    <SelectTrigger id={`nc-kpi-${k.id}-better`} className="w-full min-w-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lower">Lower is better</SelectItem>
                      <SelectItem value="higher">Higher is better</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field id={`nc-kpi-${k.id}-baseline`} label="Baseline (today)">
                  <Input
                    id={`nc-kpi-${k.id}-baseline`}
                    type="number"
                    inputMode="decimal"
                    value={k.baseline}
                    onChange={(event) => setKpi(k.id, { baseline: event.target.value })}
                  />
                </Field>
                <Field id={`nc-kpi-${k.id}-target`} label="Target">
                  <Input
                    id={`nc-kpi-${k.id}-target`}
                    type="number"
                    inputMode="decimal"
                    value={k.target}
                    onChange={(event) => setKpi(k.id, { target: event.target.value })}
                  />
                </Field>
              </div>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => set({ kpis: [...form.kpis, kpiRow(nextKpiId(form.kpis))] })}
          >
            <Plus aria-hidden /> Add an outcome
          </Button>
        </fieldset>

        <div className="grid grid-cols-1 gap-4">
          <Field
            id="nc-constraints"
            label="Constraints"
            hint="What the solution must work with or must not change."
          >
            <Textarea rows={2} {...text('constraints')} />
          </Field>
          <Field id="nc-dataAvailable" label="Data the department can share for the pilot">
            <Textarea rows={2} {...text('dataAvailable')} />
          </Field>
          <Field id="nc-outOfScope" label="Out of scope">
            <Textarea rows={2} {...text('outOfScope')} />
          </Field>
        </div>

        <fieldset className="min-w-0 space-y-3">
          <legend className="text-sm font-semibold text-foreground">Pilot terms</legend>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field id="nc-budget" label="Pilot budget ceiling (Rs lakh)">
              <Input type="number" inputMode="decimal" min={0} {...text('budget')} />
            </Field>
            <Field id="nc-weeks" label="Pilot length (weeks)">
              <Input type="number" inputMode="numeric" min={0} {...text('weeks')} />
            </Field>
            <Field id="nc-pilotSites" label="Pilot sites" className="sm:col-span-2">
              <Input {...text('pilotSites')} />
            </Field>
            <Field id="nc-ip" label="Preference on intellectual property" className="sm:col-span-2">
              <Select value={form.ip} onValueChange={(ip) => set({ ip: ip as IpOption })}>
                <SelectTrigger
                  id="nc-ip"
                  className="min-h-8 w-full min-w-0 py-1.5 text-left whitespace-normal data-[size=default]:h-auto *:data-[slot=select-value]:line-clamp-none"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(IP_LABELS) as IpOption[]).map((option) => (
                    <SelectItem key={option} value={option}>
                      {IP_LABELS[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </fieldset>

        <BriefQuality title={form.title} brief={brief} />
        {!challenge && (
          <p className="text-xs text-muted-foreground">
            {ready
              ? 'Saving sends the brief to the innovation cell, which reviews and publishes it.'
              : 'You can save now as a draft. The brief goes for review once the points above are fixed.'}
          </p>
        )}
      </div>
    </Drawer>
  )
}
