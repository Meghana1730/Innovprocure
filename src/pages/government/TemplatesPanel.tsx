// Standard templates and the rules in force: a section of the Government dashboard.
import { Copy, ExternalLink, FileText, Printer } from 'lucide-react'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'

import { Pill } from '@/components/badges'
import { Callout, Facts } from '@/components/cards'
import { Panel } from '@/components/headers'
import { Drawer } from '@/components/overlays'
import { EmptyState } from '@/components/states'
import { Button } from '@/components/ui/button'
import {
  ELIGIBILITY_RULES,
  type EligibilityRule,
  POLICY,
  SOURCES,
  STAGE_INFO,
} from '@/lib/domain/policy'
import { TEMPLATE_CATEGORIES, TEMPLATES, templateAsText } from '@/lib/domain/templates'
import type { Template } from '@/lib/domain/types'

const usedAt = (template: Template) => `Used at: ${STAGE_INFO[template.usedAt].label}`

async function copyAsText(template: Template) {
  // The clipboard is missing on insecure origins and in some embedded browsers.
  if (typeof navigator === 'undefined' || !navigator.clipboard) {
    toast.error('Copying is not available in this browser. Use Print instead.')
    return
  }
  try {
    await navigator.clipboard.writeText(templateAsText(template))
    toast.success('Template copied as text')
  } catch {
    toast.error('The browser did not allow copying. Use Print instead.')
  }
}

/** The template as a readable document: purpose, numbered sections and clauses. */
function TemplateDocument({ template }: { template: Template }) {
  return (
    <div className="min-w-0 space-y-5 text-sm">
      <p className="text-muted-foreground">{template.purpose}</p>
      <ol className="space-y-5">
        {template.sections.map((section, i) => (
          <li key={section.heading} className="space-y-2">
            <h3 className="font-semibold text-foreground">
              {i + 1}. {section.heading}
            </h3>
            <ol className="space-y-1.5">
              {section.body.map((line, j) => (
                <li key={line} className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-2">
                  <span className="tabular text-muted-foreground">
                    {i + 1}.{j + 1}
                  </span>
                  <span className="min-w-0 break-words">{line}</span>
                </li>
              ))}
            </ol>
          </li>
        ))}
      </ol>
    </div>
  )
}

/** Shown only on paper: while a template is open, Print gives the template and nothing else. */
function PrintCopy({ template }: { template: Template }) {
  return createPortal(
    <div id="template-print" className="hidden bg-white p-6 text-black print:block">
      <style>
        {
          '@media print { html, body { height: auto !important; overflow: visible !important } body > :not(#template-print) { display: none !important } }'
        }
      </style>
      <p className="text-xl font-semibold">{template.title}</p>
      <p className="mb-4 text-sm">
        {template.version}. {usedAt(template)}. InnovProcure prototype.
      </p>
      <TemplateDocument template={template} />
    </div>,
    document.body,
  )
}

function TemplateCard({ template, onOpen }: { template: Template; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full min-w-0 flex-col gap-2 rounded-lg border bg-background p-4 text-left transition-colors outline-none hover:border-primary/40 hover:bg-accent/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span className="flex min-w-0 items-start gap-2">
        <FileText aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
        <span className="min-w-0 font-medium break-words text-foreground">{template.title}</span>
      </span>
      <span className="text-sm text-muted-foreground">{template.purpose}</span>
      <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Pill tone="demo">{template.version}</Pill>
        <span>{usedAt(template)}</span>
      </span>
    </button>
  )
}

function RuleList({
  title,
  hint,
  rules,
}: {
  title: string
  hint: string
  rules: EligibilityRule[]
}) {
  return (
    <div className="min-w-0 space-y-2">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground">{hint}</p>
      {rules.length === 0 ? (
        <EmptyState title="No rules in this group" className="py-6" />
      ) : (
        <ul className="divide-y rounded-lg border">
          {rules.map((rule) => (
            <li key={rule.id} className="space-y-0.5 px-4 py-3 text-sm">
              <p className="font-medium break-words text-foreground">{rule.label}</p>
              <p className="text-muted-foreground">{rule.detail}</p>
              <p className="text-xs text-muted-foreground">Basis: {rule.basis}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const POLICY_FACTS = [
  { label: 'Startup age limit', value: `${POLICY.maxAgeYears} years from incorporation` },
  { label: 'Turnover ceiling', value: `Rs ${POLICY.maxTurnoverCrore} crore in a year` },
  {
    label: 'Payment target',
    value: `${POLICY.paymentTargetDays} days from payment request to payment`,
  },
  { label: 'Shortlist score', value: `${POLICY.shortlistScore} out of 100 or more` },
  { label: 'Minimum evaluators', value: `${POLICY.minEvaluators} for each application` },
]

export function TemplatesPanel() {
  // The selected template stays set while the drawer closes, so its text does not vanish early.
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const selected = TEMPLATES.find((template) => template.id === selectedId)

  const groups = TEMPLATE_CATEGORIES.map((category) => ({
    ...category,
    templates: TEMPLATES.filter((template) => template.category === category.id),
  })).filter((group) => group.templates.length > 0)

  return (
    <div className="min-w-0 space-y-6">
      <Panel
        title="Standard templates"
        description="Departments do not start from a blank page, and startups see the same terms in every department. Open a template to read, copy or print it."
        actions={<Pill tone="info">Kept by the innovation cell</Pill>}
      >
        {groups.length === 0 ? (
          <EmptyState
            title="No templates yet"
            description="The standard templates kept by the innovation cell will appear here."
          />
        ) : (
          <div className="grid grid-cols-1 gap-x-5 gap-y-6 lg:grid-cols-2 2xl:grid-cols-3">
            {groups.map((group) => (
              <div key={group.id} className="min-w-0 space-y-2">
                <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  {group.label}
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  {group.templates.map((template) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onOpen={() => {
                        setSelectedId(template.id)
                        setOpen(true)
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel
        title="Rules in force (configurable defaults of the prototype)"
        description="The values the prototype uses for screening, evaluation and payment. In a real deployment the innovation cell would set them. In this prototype they are fixed."
        bodyClassName="space-y-6"
      >
        <Callout tone="warning" title="These defaults do not replace the department's rules">
          The department's financial and procurement rules always apply. Confirm every value with
          the finance officer before using it in a real procurement.
        </Callout>

        <Facts items={POLICY_FACTS} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <RuleList
            title="Must pass"
            hint="An application is eligible only if it passes every one of these."
            rules={ELIGIBILITY_RULES.filter((rule) => rule.kind === 'mandatory')}
          />
          <RuleList
            title="Not required from startups"
            hint="Usual tender conditions that are not applied, so young firms are not excluded."
            rules={ELIGIBILITY_RULES.filter((rule) => rule.kind === 'relaxed')}
          />
        </div>

        <div className="min-w-0 space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Sources</h3>
          {SOURCES.length === 0 ? (
            <Callout tone="demo">
              No sources are attached in this prototype. Treat every value here as a default to
              confirm with the finance officer, not as a statement of law.
            </Callout>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Where each default can be checked. Read the source before relying on a value.
              </p>
              <ul className="divide-y rounded-lg border">
                {SOURCES.map((source) => (
                  <li key={source.topic} className="space-y-0.5 px-4 py-3 text-sm">
                    <p className="font-medium break-words text-foreground">{source.topic}</p>
                    <p className="text-muted-foreground">{source.note}</p>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex max-w-full items-start gap-1 text-xs text-primary underline-offset-4 hover:underline"
                    >
                      <span className="min-w-0 break-all">{source.url}</span>
                      <ExternalLink aria-hidden className="mt-0.5 size-3 shrink-0" />
                      <span className="sr-only">(opens in a new tab)</span>
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </Panel>

      <Drawer
        open={open && !!selected}
        onOpenChange={setOpen}
        title={selected?.title ?? 'Template'}
        description={selected ? `${selected.version}. ${usedAt(selected)}.` : undefined}
        width="data-[side=right]:sm:max-w-2xl"
        footer={
          selected && (
            <>
              <Button variant="outline" onClick={() => void copyAsText(selected)}>
                <Copy aria-hidden /> Copy as text
              </Button>
              <Button variant="outline" onClick={() => window.print()}>
                <Printer aria-hidden /> Print
              </Button>
            </>
          )
        }
      >
        {selected && <TemplateDocument template={selected} />}
      </Drawer>
      {open && selected && <PrintCopy template={selected} />}
    </div>
  )
}
