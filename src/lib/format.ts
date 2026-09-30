// Number, money and date formatting shared by all pages.

const integer = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })
const twoDecimals = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 })

export function fmtInt(value: number | null | undefined): string {
  return value === null || value === undefined || Number.isNaN(value) ? '-' : integer.format(value)
}

/** A plain number with up to two decimals: 12.5, 3.1, 86. */
export function fmtNum(value: number | null | undefined): string {
  return value === null || value === undefined || Number.isNaN(value)
    ? '-'
    : twoDecimals.format(value)
}

/** Rs lakh: 12.5 -> "Rs 12.5 lakh"; 140 -> "Rs 1.4 crore". */
export function fmtLakh(lakh: number | null | undefined): string {
  if (lakh === null || lakh === undefined || Number.isNaN(lakh)) return '-'
  if (Math.abs(lakh) >= 100) return `Rs ${twoDecimals.format(lakh / 100)} crore`
  return `Rs ${twoDecimals.format(lakh)} lakh`
}

export function fmtPct(value: number | null | undefined): string {
  return value === null || value === undefined || Number.isNaN(value)
    ? '-'
    : `${Math.round(value)}%`
}

/** "2026-09-30" -> "30 Sep 2026". */
export function fmtDate(value: string | null | undefined): string {
  if (!value) return '-'
  const date = new Date(`${value.slice(0, 10)}T00:00:00`)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Today as "YYYY-MM-DD" in local time. */
export function today(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

/** Whole days from `from` to `to` (both "YYYY-MM-DD"); negative when `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  const a = Date.UTC(+from.slice(0, 4), +from.slice(5, 7) - 1, +from.slice(8, 10))
  const b = Date.UTC(+to.slice(0, 4), +to.slice(5, 7) - 1, +to.slice(8, 10))
  return Math.round((b - a) / 86_400_000)
}

/** "YYYY-MM-DD" plus a number of days. */
export function addDays(date: string, days: number): string {
  const t =
    Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10)) + days * 86_400_000
  return new Date(t).toISOString().slice(0, 10)
}

export function plural(count: number, one: string, many = `${one}s`): string {
  return `${fmtInt(count)} ${count === 1 ? one : many}`
}
