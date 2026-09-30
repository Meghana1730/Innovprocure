// Milestone-based contract: the agreement form at stage CONTRACT, the signed summary afterwards.
import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { Pill } from '@/components/badges'
import { Callout, DoneBy, Facts } from '@/components/cards'
import { Panel } from '@/components/headers'
import { EmptyState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { run } from '@/lib/demo/run'
import type { ChallengeView } from '@/lib/demo/selectors'
import { signAgreement, type MilestoneInput } from '@/lib/demo/store'
import { DATA_LABELS, IP_LABELS } from '@/lib/domain/policy'
import type { DataOption, IpOption } from '@/lib/domain/types'
import { addDays, fmtDate, fmtLakh, fmtNum, plural, today } from '@/lib/format'
import { Field, RadioChoice } from '@/pages/government/pilot/fields'

/** Three payments tied to delivery: installed, live in use, results and handover. */
function defaultMilestones(startOn: string, weeks: number): MilestoneInput[] {
  const due = (share: number) => addDays(startOn, Math.max(1, Math.round(weeks * share)) * 7)
  return [
    {
      title: 'Solution installed at the pilot sites',
      deliverable:
        'Installed and working at every pilot site; staff trained; security checks shown',
      dueOn: due(0.25),
      paymentPct: 20,
    },
    {
      title: 'Solution live in daily use',
      deliverable: 'In daily use at the pilot sites; KPI readings reported every two weeks',
      dueOn: due(0.6),
      paymentPct: 40,
    },
    {
      title: 'Results report and handover',
      deliverable: 'Final KPI report against baseline and target; data and documents handed over',
      dueOn: due(1),
      paymentPct: 40,
    },
  ]
}

function ContractForm({ view }: { view: ChallengeView }) {
  const { challenge, selected, pilot } = view
  const value = selected?.quoteLakh ?? 0
  const startOn = pilot?.startOn ?? addDays(today(), 21)
  const weeks = pilot?.weeks ?? selected?.weeks ?? challenge.brief.pilotWeeks
  const [ip, setIp] = useState<IpOption>(challenge.brief.ipPreference)
  const [data, setData] = useState<DataOption>('GOVT_OWNS_DATA')
  const [milestones, setMilestones] = useState<MilestoneInput[]>(() =>
    defaultMilestones(startOn, weeks),
  )
  const setRow = (index: number, patch: Partial<MilestoneInput>) =>
    setMilestones((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))

  const total = milestones.reduce((sum, m) => sum + (m.paymentPct || 0), 0)
  const fullValue = Math.abs(total - 100) < 0.01
  const problem =
    milestones.length < 2
      ? 'Add at least 2 milestones.'
      : milestones.some((m) => !m.title.trim() || !m.deliverable.trim() || !m.dueOn)
        ? 'Every milestone needs a title, a deliverable and a due date.'
        : milestones.some((m) => !(m.paymentPct > 0))
          ? 'Every milestone needs a payment share above 0%.'
          : !fullValue
            ? `The payments add up to ${fmtNum(total)}%. They must add up to 100%.`
            : null

  const sign = () =>
    run(
      () => signAgreement(challenge.id, { ip, data, milestones }),
      startOn > today()
        ? `Agreement recorded as signed. The pilot starts on ${fmtDate(startOn)}.`
        : 'Agreement recorded as signed. The pilot has started.',
    )

  // Signing is a button click only, so Enter in a field cannot sign by accident.
  return (
    <form className="space-y-6" onSubmit={(event) => event.preventDefault()}>
      <p className="text-sm text-muted-foreground">
        The startup is paid only when a milestone is delivered and accepted. This keeps the risk low
        for the department and gives the startup a clear payment schedule.
      </p>
      <Facts
        items={[
          { label: 'Startup', value: selected?.startup?.name ?? 'Selected startup' },
          {
            label: 'Contract value',
            value: `${fmtLakh(value)} (the quote in the selected application; not editable here)`,
          },
          {
            label: 'Pilot period',
            value: `${fmtDate(startOn)} to ${fmtDate(addDays(startOn, weeks * 7))} (${plural(weeks, 'week')})`,
          },
        ]}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <RadioChoice
          id="contract-ip"
          legend="Intellectual property (IP) clause"
          options={IP_LABELS}
          value={ip}
          onChange={setIp}
        />
        <RadioChoice
          id="contract-data"
          legend="Data clause"
          options={DATA_LABELS}
          value={data}
          onChange={setData}
        />
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Milestones and payment shares</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setMilestones((rows) => [
                ...rows,
                {
                  title: '',
                  deliverable: '',
                  dueOn: addDays(startOn, weeks * 7),
                  paymentPct: Math.max(0, 100 - total),
                },
              ])
            }
          >
            <Plus aria-hidden /> Add milestone
          </Button>
        </div>
        {milestones.length === 0 ? (
          <EmptyState
            title="No milestones"
            description="Add at least 2 milestones. Their payment shares must add up to 100%."
            className="py-6"
          />
        ) : (
          <ol className="space-y-3">
            {milestones.map((m, index) => (
              <li key={index} className="min-w-0 space-y-3 rounded-lg border p-3">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Field id={`ms-${index}-title`} label={`Milestone ${index + 1}`}>
                    <Input
                      id={`ms-${index}-title`}
                      value={m.title}
                      onChange={(e) => setRow(index, { title: e.target.value })}
                    />
                  </Field>
                  <Field id={`ms-${index}-deliverable`} label="Deliverable">
                    <Input
                      id={`ms-${index}-deliverable`}
                      value={m.deliverable}
                      onChange={(e) => setRow(index, { deliverable: e.target.value })}
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-3 lg:grid-cols-[1fr_1fr_1fr_auto]">
                  <Field id={`ms-${index}-due`} label="Due date">
                    <Input
                      id={`ms-${index}-due`}
                      type="date"
                      value={m.dueOn}
                      onChange={(e) => setRow(index, { dueOn: e.target.value })}
                    />
                  </Field>
                  <Field id={`ms-${index}-pct`} label="Payment %">
                    <Input
                      id={`ms-${index}-pct`}
                      type="number"
                      min={0}
                      max={100}
                      value={m.paymentPct || ''}
                      onChange={(e) => setRow(index, { paymentPct: Number(e.target.value) })}
                    />
                  </Field>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Amount</p>
                    <p className="tabular flex h-8 items-center text-sm font-medium">
                      {fmtLakh(Math.round(value * (m.paymentPct || 0)) / 100)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setMilestones((rows) => rows.filter((_, i) => i !== index))}
                  >
                    <Trash2 aria-hidden /> Remove
                    <span className="sr-only"> milestone {index + 1}</span>
                  </Button>
                </div>
              </li>
            ))}
          </ol>
        )}
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <Pill tone={fullValue ? 'success' : 'danger'}>Total {fmtNum(total)}%</Pill>
          <span className="text-muted-foreground">
            {fullValue
              ? `The milestones cover the full contract value of ${fmtLakh(value)}.`
              : 'The payment shares must add up to 100%.'}
          </span>
        </p>
      </div>

      {problem && (
        <Callout tone="warning" title="Not ready to sign">
          {problem}
        </Callout>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" disabled={problem !== null} onClick={sign}>
          Sign agreement
        </Button>
        <DoneBy role="department" />
      </div>
      <p className="text-xs text-muted-foreground">
        In this prototype the department records the signature of both parties.
      </p>
    </form>
  )
}

export function ContractPanel({ view }: { view: ChallengeView }) {
  const { challenge, selected, agreement } = view
  const contracting = challenge.stage === 'CONTRACT' && !challenge.outcome
  return (
    <Panel
      title="Milestone-based contract"
      description={
        contracting
          ? 'Set the IP and data terms and tie every payment to a milestone.'
          : 'The signed pilot agreement.'
      }
      actions={
        contracting ? (
          <DoneBy role="department" />
        ) : (
          agreement?.signedOn && <Pill tone="success">Signed</Pill>
        )
      }
    >
      {contracting && selected ? (
        <ContractForm key={challenge.id} view={view} />
      ) : agreement ? (
        <Facts
          items={[
            { label: 'Startup', value: selected?.startup?.name ?? 'Selected startup' },
            { label: 'Contract value', value: fmtLakh(agreement.valueLakh) },
            { label: 'IP clause', value: IP_LABELS[agreement.ip] },
            { label: 'Data clause', value: DATA_LABELS[agreement.data] },
            { label: 'Signed on', value: fmtDate(agreement.signedOn) },
            { label: 'Template version', value: agreement.templateVersion },
          ]}
        />
      ) : (
        <EmptyState
          title="No agreement yet"
          description="The signed agreement and its milestones appear here once the department signs the pilot agreement."
        />
      )}
    </Panel>
  )
}
