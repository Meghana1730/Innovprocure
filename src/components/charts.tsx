// Charts (Recharts). Each chart has an accessible text summary so the numbers are not locked
// inside the SVG.
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import type { KpiReading } from '@/lib/demo/selectors'
import { fmtNum } from '@/lib/format'

const axis = { fontSize: 12, fill: 'var(--muted-foreground)' }
const tooltipStyle = {
  borderRadius: 8,
  border: '1px solid var(--border)',
  fontSize: 12,
  boxShadow: '0 4px 12px rgb(0 0 0 / 0.06)',
}

/** One KPI over the pilot weeks, with the baseline and the target as reference lines. */
export function KpiTrendChart({ reading, height = 200 }: { reading: KpiReading; height?: number }) {
  const { kpi, series } = reading
  const data = [{ week: 0, value: kpi.baseline }, ...series]
  const values = [...data.map((d) => d.value), kpi.target]
  const pad = (Math.max(...values) - Math.min(...values)) * 0.15 || 1
  const domain: [number, number] = [
    Math.max(0, Math.floor(Math.min(...values) - pad)),
    Math.ceil(Math.max(...values) + pad),
  ]
  const last = series[series.length - 1]
  const summary = `${kpi.name}: baseline ${fmtNum(kpi.baseline)} ${kpi.unit}, target ${fmtNum(kpi.target)} ${kpi.unit}${
    last ? `, latest ${fmtNum(last.value)} ${kpi.unit} in week ${last.week}` : ', no readings yet'
  }.`
  return (
    <figure aria-label={summary} className="w-full min-w-0">
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 12, right: 56, bottom: 0, left: -8 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="week"
            type="number"
            domain={[0, 'dataMax']}
            tick={axis}
            tickLine={false}
            axisLine={false}
            tickFormatter={(w) => (w === 0 ? 'Start' : `Wk ${w}`)}
          />
          <YAxis tick={axis} tickLine={false} axisLine={false} domain={domain} width={44} />
          <Tooltip
            contentStyle={tooltipStyle}
            labelFormatter={(w) => (w === 0 ? 'Baseline' : `Week ${w}`)}
            formatter={(v) => [`${fmtNum(Number(v))} ${kpi.unit}`, kpi.name]}
          />
          <ReferenceLine
            y={kpi.target}
            stroke="var(--success)"
            strokeDasharray="6 4"
            label={{ value: 'Target', position: 'right', fontSize: 11, fill: 'var(--success)' }}
          />
          <ReferenceLine
            y={kpi.baseline}
            stroke="var(--muted-foreground)"
            strokeDasharray="2 4"
            label={{
              value: 'Baseline',
              position: 'right',
              fontSize: 11,
              fill: 'var(--muted-foreground)',
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--chart-1)"
            strokeWidth={2.25}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <figcaption className="sr-only">{summary}</figcaption>
    </figure>
  )
}

/**
 * Simple bars, one row per item with its name on the left, so the names stay readable on
 * narrow screens. `highlight` colours one bar differently.
 */
export function BarsChart({
  data,
  label,
  height = 220,
  highlight,
}: {
  data: { name: string; value: number }[]
  label: string
  height?: number
  highlight?: string
}) {
  const summary = `${label}: ${data.map((d) => `${d.name} ${fmtNum(d.value)}`).join(', ')}`
  return (
    <figure aria-label={summary} className="w-full min-w-0">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            tick={axis}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ ...axis, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            interval={0}
            width={124}
            // Non-breaking spaces keep each name on one line.
            tickFormatter={(name) => String(name).replace(/ /g, ' ')}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(v) => [fmtNum(Number(v)), label]}
            cursor={{ fill: 'var(--muted)' }}
          />
          <Bar dataKey="value" name={label} radius={[0, 4, 4, 0]} isAnimationActive={false}>
            {data.map((d) => (
              <Cell
                key={d.name}
                fill={d.name === highlight ? 'var(--chart-1)' : 'var(--chart-2)'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <figcaption className="sr-only">{summary}</figcaption>
    </figure>
  )
}
