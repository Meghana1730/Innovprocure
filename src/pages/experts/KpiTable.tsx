// KPI values of a pilot against baseline and target: as reported, or as confirmed by the validator.
import { Pill } from '@/components/badges'
import { DataTable, type Column } from '@/components/DataTable'
import { kpiMet } from '@/lib/domain/rules'
import type { Kpi } from '@/lib/domain/types'
import { fmtNum } from '@/lib/format'

export type KpiRow = { kpi: Kpi; value: number | null; note?: string }

/** "Target met" or "Target not met" for one value (never colour only). */
export function KpiResult({ kpi, value }: { kpi: Kpi; value: number | null }) {
  if (value === null || !Number.isFinite(value)) return <Pill>No value</Pill>
  return kpiMet(kpi, value) ? (
    <Pill tone="success">Target met</Pill>
  ) : (
    <Pill tone="warning">Target not met</Pill>
  )
}

export function KpiTable({
  rows,
  valueLabel,
  caption,
}: {
  rows: KpiRow[]
  valueLabel: string
  caption: string
}) {
  const columns: Column<KpiRow>[] = [
    {
      key: 'kpi',
      header: 'KPI',
      className: 'min-w-44 whitespace-normal',
      cell: ({ kpi }) => (
        <>
          <span className="font-medium">{kpi.name}</span>
          <span className="block text-xs text-muted-foreground">
            {kpi.unit}, {kpi.better} is better
          </span>
        </>
      ),
    },
    {
      key: 'baseline',
      header: 'Baseline',
      align: 'right',
      cell: ({ kpi }) => fmtNum(kpi.baseline),
    },
    { key: 'target', header: 'Target', align: 'right', cell: ({ kpi }) => fmtNum(kpi.target) },
    {
      key: 'value',
      header: valueLabel,
      align: 'right',
      cell: ({ value, note }) => (
        <>
          <span className="font-medium">{fmtNum(value)}</span>
          {note && <span className="block text-xs text-muted-foreground">{note}</span>}
        </>
      ),
    },
    {
      key: 'result',
      header: 'Result',
      cell: ({ kpi, value }) => <KpiResult kpi={kpi} value={value} />,
    },
  ]
  return (
    <DataTable rows={rows} columns={columns} rowKey={(row) => row.kpi.id} caption={caption} dense />
  )
}
