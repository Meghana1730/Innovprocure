// Profile of the acting startup and its eligibility against the prototype's default rules,
// worked out for today. The same rules are applied again when an application is screened.
import { StatusBadge } from '@/components/badges'
import { Facts } from '@/components/cards'
import { Panel } from '@/components/headers'
import { ELIGIBILITY_RULES, POLICY, SECTOR_LABELS } from '@/lib/domain/policy'
import type { RuleResult, Startup } from '@/lib/domain/types'
import { fmtInt, fmtNum, today } from '@/lib/format'

const STAGE_LABELS: Record<Startup['stage'], string> = {
  PROTOTYPE: 'Prototype',
  EARLY_REVENUE: 'Early revenue',
  GROWTH: 'Growth',
}

/** The startup-level rules (everything except the quote, which is checked per application). */
function checkToday(startup: Startup): Record<string, Pick<RuleResult, 'status' | 'reason'>> {
  const age = Number(today().slice(0, 4)) - startup.foundedYear
  const turnoverCrore = startup.annualTurnoverLakh / 100
  return {
    recognised: startup.recognised
      ? {
          status: 'PASS',
          reason: `Recognition reference ${startup.recognitionRef} on file (demo reference).`,
        }
      : { status: 'FAIL', reason: 'No startup recognition reference on file.' },
    age: {
      status: age <= POLICY.maxAgeYears ? 'PASS' : 'FAIL',
      reason: `Incorporated in ${startup.foundedYear}: ${age} years old. Limit: ${POLICY.maxAgeYears} years.`,
    },
    'turnover-ceiling': {
      status: turnoverCrore <= POLICY.maxTurnoverCrore ? 'PASS' : 'FAIL',
      reason: `Annual turnover Rs ${fmtNum(turnoverCrore)} crore. Ceiling: Rs ${POLICY.maxTurnoverCrore} crore.`,
    },
    'not-debarred': startup.debarred
      ? { status: 'FAIL', reason: 'The startup is on the debarment list.' }
      : { status: 'PASS', reason: 'Self-declared; not on the debarment list.' },
  }
}

export function ProfilePanel({ startup }: { startup: Startup }) {
  const checks = checkToday(startup)
  const rows = ELIGIBILITY_RULES.map((rule) => ({
    rule,
    result:
      rule.kind === 'relaxed'
        ? ({ status: 'RELAXED', reason: rule.detail } as const)
        : checks[rule.id],
  })).filter((row) => row.result)
  const failed = rows.some((row) => row.result.status === 'FAIL')

  return (
    <Panel
      title="Profile and eligibility"
      description="What departments see about this startup, and how it stands against the eligibility rules today."
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Facts
          className="content-start self-start"
          items={[
            { label: 'City', value: startup.city },
            { label: 'Sectors', value: startup.sectors.map((s) => SECTOR_LABELS[s]).join(', ') },
            { label: 'Technologies', value: startup.technologies.join(', ') },
            { label: 'Founded', value: `${startup.foundedYear} (${startup.entityType})` },
            {
              label: 'Team',
              value: `${fmtInt(startup.teamSize)} people${startup.womenLed ? ', women-led' : ''}`,
            },
            {
              label: 'Readiness',
              value: `Level ${startup.trl} of 9 (self-declared), ${STAGE_LABELS[startup.stage].toLowerCase()} stage`,
            },
            {
              label: 'Recognition',
              value: startup.recognised
                ? `${startup.recognitionRef} (demo reference, not a real certificate)`
                : 'No recognition reference on file',
            },
          ]}
        />
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">Eligibility check for today</h3>
            <StatusBadge status={failed ? 'INELIGIBLE' : 'ELIGIBLE'} />
          </div>
          <ul className="divide-y rounded-lg border">
            {rows.map(({ rule, result }) => (
              <li key={rule.id} className="flex flex-wrap items-start gap-x-3 gap-y-1 px-3 py-2.5">
                <div className="min-w-0 flex-1 basis-48">
                  <p className="text-sm font-medium text-foreground">{rule.label}</p>
                  <p className="text-xs text-muted-foreground">{result.reason}</p>
                </div>
                <StatusBadge status={result.status} />
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            These rules are configurable defaults of the prototype. The quote is checked against the
            budget ceiling of each challenge when the application is screened.
          </p>
        </div>
      </div>
    </Panel>
  )
}
