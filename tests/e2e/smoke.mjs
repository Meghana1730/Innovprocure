// Quick smoke check: opens every dashboard and tab at three widths, saves screenshots,
// and reports console errors and horizontal overflow. Run: node tests/e2e/smoke.mjs [outDir]
import { mkdirSync } from 'node:fs'

import { chromium } from '@playwright/test'

const BASE = process.env.BASE_URL ?? 'http://localhost:5173'
const OUT = process.argv[2] ?? 'test-results/smoke'
mkdirSync(OUT, { recursive: true })

const PAGES = [
  ['login', '/login'],
  ['gov', '/government'],
  ['gov-brief', '/government?c=ch-006&tab=brief'],
  ['gov-startups-discover', '/government?c=ch-005&tab=startups'],
  ['gov-startups-screen', '/government?c=ch-004&tab=startups'],
  ['gov-startups-evaluate', '/government?c=ch-003&tab=startups'],
  ['gov-pilot', '/government?c=ch-002&tab=pilot'],
  ['gov-outcome', '/government?c=ch-001&tab=outcome'],
  ['gov-outcome-scaled', '/government?c=ch-007&tab=outcome'],
  ['gov-audit', '/government?c=ch-001&tab=audit'],
  ['gov-payments', '/government?view=payments'],
  ['gov-templates', '/government?view=templates'],
  ['startup', '/startup'],
  ['experts', '/experts'],
  ['experts-validation', '/experts?view=validation'],
]
const WIDTHS = [390, 1366, 1920]

const browser = await chromium.launch()
let problems = 0
for (const width of WIDTHS) {
  const context = await browser.newContext({ viewport: { width, height: 900 } })
  // Sign in as the account of the dashboard being opened.
  await context.addInitScript(() => {
    const dashboard = window.location.pathname.split('/')[1]
    if (['government', 'startup', 'experts'].includes(dashboard)) {
      window.localStorage.setItem('innovprocure.session.v1', JSON.stringify({ account: dashboard }))
    }
  })
  const page = await context.newPage()
  const errors = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push(String(e)))
  for (const [name, path] of PAGES) {
    errors.length = 0
    await page.goto(BASE + path, { waitUntil: 'networkidle' })
    await page.waitForTimeout(300)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    const h1 = await page.locator('h1').count()
    await page.screenshot({ path: `${OUT}/${name}-${width}.png`, fullPage: true })
    const issues = []
    if (overflow > 1) issues.push(`overflow ${overflow}px`)
    if (h1 !== 1) issues.push(`${h1} h1`)
    if (errors.length) issues.push(`console: ${errors.slice(0, 2).join(' | ').slice(0, 300)}`)
    if (issues.length) {
      problems += 1
      console.log(`${width} ${name}: ${issues.join('; ')}`)
    }
  }
  await context.close()
}
await browser.close()
console.log(problems ? `${problems} page(s) with problems` : 'all pages clean')
