// The whole pathway, driven through the real UI (roles, labels, buttons), not the store.
// Run with:  npx playwright test golden-path
//
// Every test gets a fresh browser context, so the demo store starts from the seed. The first
// four tests walk the seeded challenges stage by stage; the last one takes a brand-new
// challenge through all ten stages in one go.
import { expect, test, type Locator, type Page } from '@playwright/test'

// The seed is written around this day (DEMO_TODAY in src/lib/demo/seed.ts). Fixing the clock
// keeps dates, waiting days and closing dates the same on every run.
const DEMO_NOW = new Date('2026-09-30T12:00:00+05:30')

test.use({ timezoneId: 'Asia/Kolkata', viewport: { width: 1366, height: 900 } })
test.setTimeout(120_000)

// Console errors and uncaught exceptions of the page under test. Any of them fails the test.
const problems = new WeakMap<Page, string[]>()

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(DEMO_NOW)
  const seen: string[] = []
  problems.set(page, seen)
  page.on('console', (message) => {
    if (message.type() === 'error') seen.push(message.text())
  })
  page.on('pageerror', (error) => seen.push(String(error)))
})

test.afterEach(async ({ page }) => {
  expect(problems.get(page) ?? [], 'console errors during the test').toEqual([])
})

// ---------------------------------------------------------------- helpers

const NEW_TITLE = 'Repair failed streetlights within 48 hours of a complaint'
const NEW_CODE = 'CH-2026-009'
const NEW_ID = 'ch-u-9'
const LUMEN = 'Example LumenGrid Energy'

/** Opens one challenge on the government dashboard and returns its workspace. */
async function openChallenge(page: Page, id: string, code: string, tab: string): Promise<Locator> {
  await page.goto(`/government?c=${id}&tab=${tab}`)
  const workspace = page.getByRole('region', { name: `Challenge ${code}` })
  await expect(workspace).toBeVisible()
  return workspace
}

/** The stage badge next to the challenge title, and the pathway tracker. */
async function expectStage(workspace: Locator, label: string) {
  await expect(workspace.locator('header').first()).toContainText(label)
  await expect(
    workspace.getByRole('list', { name: new RegExp(`Pathway: .*${label}`) }),
  ).toBeVisible()
}

async function expectToast(page: Page, text: string | RegExp) {
  await expect(page.locator('[data-sonner-toast]').filter({ hasText: text }).first()).toBeVisible()
}

/** A page panel (a titled section), found by its heading. */
function panel(page: Page, title: string): Locator {
  return page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: title, exact: true }) })
    .last()
}

function milestoneCard(workspace: Locator, order: number): Locator {
  return workspace.getByRole('listitem').filter({
    has: workspace.page().getByRole('heading', { name: new RegExp(`^Milestone ${order}:`) }),
  })
}

/** Department accepts a submitted milestone, finance approves and releases its payment. */
async function acceptAndPay(page: Page, workspace: Locator, order: number) {
  const card = milestoneCard(workspace, order)
  await expect(card.getByText('Submitted', { exact: true }).first()).toBeVisible()
  await card.getByRole('button', { name: 'Accept' }).click()
  await expectToast(page, `Milestone ${order} accepted. The payment request was raised.`)
  await expect(card.getByText('Accepted', { exact: true }).first()).toBeVisible()
  await expect(card.getByText('Payment requested', { exact: true }).first()).toBeVisible()
  await expect(card.getByText('Done by: Finance officer')).toBeVisible()

  await card.getByRole('button', { name: 'Approve payment' }).click()
  await expectToast(page, /Payment of Rs .* approved\./)
  await expect(card.getByText('Payment approved', { exact: true }).first()).toBeVisible()

  await card.getByRole('button', { name: 'Release payment' }).click()
  await expectToast(page, /Payment of Rs .* released\./)
  await expect(card.getByText('Paid', { exact: true }).first()).toBeVisible()
  await expect(card.getByText(/^Paid in \d+ days$/)).toBeVisible()
}

/** Picks the startup the presenter acts as on the startup dashboard. */
async function actAsStartup(page: Page, name: string) {
  await page.goto('/startup')
  await page.getByLabel('Acting as').click()
  await page.getByRole('option', { name, exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()
}

/** Scores one application in the open drawer with the same mark on every criterion. */
async function scoreOpenDrawer(page: Page, mark: number, expected: string) {
  const drawer = page.getByRole('dialog')
  await expect(drawer).toBeVisible()
  for (const group of await drawer.getByRole('radiogroup').all()) {
    await group.getByRole('radio', { name: new RegExp(`^${mark}`) }).click()
  }
  await expect(drawer.getByRole('status')).toContainText(expected)
  await drawer.getByRole('checkbox', { name: /no conflict of interest/ }).check()
  await drawer.getByRole('button', { name: 'Submit score' }).click()
  await expectToast(page, 'Score submitted')
  await expect(drawer).toBeHidden()
}

/** Step 1: draft a challenge from the example and publish it as an open call. */
async function createAndPublish(page: Page): Promise<Locator> {
  await page.goto('/government')
  await page.getByRole('button', { name: 'New challenge' }).click()
  const drawer = page.getByRole('dialog', { name: 'New challenge' })
  await drawer.getByRole('button', { name: 'Fill with an example' }).click()
  await expect(drawer.getByLabel('Challenge title')).toHaveValue(NEW_TITLE)
  await expect(drawer.getByText('Done by: Department officer')).toBeVisible()
  await drawer.getByRole('button', { name: 'Save challenge' }).click()
  await expectToast(page, 'Challenge saved and sent to the innovation cell for review')
  await expect(drawer).toBeHidden()

  const workspace = page.getByRole('region', { name: `Challenge ${NEW_CODE}` })
  await expect(workspace.getByRole('heading', { level: 2, name: NEW_TITLE })).toBeVisible()
  await expectStage(workspace, 'Challenge identification')
  await expect(workspace.getByText('In review', { exact: true })).toBeVisible()
  await expect(workspace.getByText('Demo data').first()).toBeVisible()

  // The innovation cell publishes it from the brief tab.
  await expect(workspace.getByRole('tab', { name: 'Challenge brief' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await expect(workspace.getByText('Done by: Innovation cell').first()).toBeVisible()
  await expect(workspace.getByLabel('Applications close on')).toHaveValue('2026-10-28')
  await workspace.getByRole('button', { name: 'Publish as open call' }).click()
  await expectToast(page, 'Challenge published as an open call')
  await expectStage(workspace, 'Startup discovery')
  return workspace
}

/** Step 2: invite a matching startup, apply as that startup, close the call. */
async function inviteApplyClose(page: Page): Promise<Locator> {
  let workspace = await openChallenge(page, NEW_ID, NEW_CODE, 'startups')
  await expect(workspace.getByText('Published', { exact: false }).first()).toBeVisible()
  const match = workspace.getByRole('listitem').filter({ hasText: LUMEN }).first()
  await expect(match.getByText(/Match \d+ of 100/)).toBeVisible()
  await expect(workspace.getByRole('button', { name: 'Close the call' })).toBeDisabled()
  await match.getByRole('button', { name: `Invite ${LUMEN}` }).click()
  await expectToast(page, `${LUMEN} invited to apply`)
  await expect(match.getByText('Invited', { exact: true })).toBeVisible()
  await expect(workspace.getByText('0 applications received, 1 startup invited')).toBeVisible()

  // The startup sees the invitation and applies.
  await actAsStartup(page, LUMEN)
  const waiting = panel(page, 'Waiting for you')
  await expect(
    waiting.getByText(`${NEW_CODE}: you are invited to apply, ${NEW_TITLE}`),
  ).toBeVisible()
  await waiting.getByRole('button', { name: 'Apply' }).click()
  const drawer = page.getByRole('dialog', { name: `Apply: ${NEW_TITLE}` })
  await drawer.getByRole('button', { name: 'Fill with an example' }).click()
  await expect(drawer.getByLabel('Pilot cost you quote (Rs lakh)')).toHaveValue('11')
  await drawer.getByRole('button', { name: 'Submit application' }).click()
  await expectToast(page, `Application submitted to ${NEW_CODE}`)
  await expect(drawer).toBeHidden()
  const mine = panel(page, 'My applications')
  const application = mine.getByRole('listitem').filter({ hasText: NEW_TITLE })
  await expect(application.getByText('Submitted', { exact: true })).toBeVisible()
  await expect(application.getByText('Startup discovery', { exact: true })).toBeVisible()

  // The innovation cell closes the call.
  workspace = await openChallenge(page, NEW_ID, NEW_CODE, 'startups')
  await expect(workspace.getByText('1 application received, 1 startup invited')).toBeVisible()
  await expect(
    workspace.getByRole('listitem').filter({ hasText: LUMEN }).first().getByText('Applied', {
      exact: true,
    }),
  ).toBeVisible()
  await workspace.getByRole('button', { name: 'Close the call' }).click()
  const confirm = page.getByRole('dialog', { name: 'Close the call?' })
  await expect(confirm).toContainText('1 application received')
  await confirm.getByRole('button', { name: 'Close the call' }).click()
  await expectToast(page, 'Call closed. Eligibility screening can start.')
  await expectStage(workspace, 'Eligibility screening')
  return workspace
}

// ---------------------------------------------------------------- the seeded pathway

test('steps 1 and 2: new challenge, open call, invitation, application, call closed', async ({
  page,
}) => {
  await createAndPublish(page)
  await inviteApplyClose(page)
})

test('step 3: eligibility screening and clarification on CH-2026-004', async ({ page }) => {
  const workspace = await openChallenge(page, 'ch-004', 'CH-2026-004', 'startups')
  await expectStage(workspace, 'Eligibility screening')
  await expect(workspace.getByText('Done by: Innovation cell').first()).toBeVisible()
  await workspace.getByRole('button', { name: 'Run eligibility screening' }).click()
  await expectToast(page, 'Eligibility screening completed')

  // One quote is slightly above the ceiling: the challenge waits for the clarification.
  await expectStage(workspace, 'Eligibility screening')
  await expect(workspace.getByText('Settle the pending clarification').first()).toBeVisible()
  const wasteWise = workspace
    .getByRole('listitem')
    .filter({ has: page.getByRole('heading', { name: 'Example WasteWise Robotics' }) })
  await expect(wasteWise.getByText('Clarification needed', { exact: true })).toBeVisible()
  await expect(wasteWise.getByText(/slightly above the Rs 14 lakh ceiling/)).toBeVisible()
  const cleanLoop = workspace
    .getByRole('listitem')
    .filter({ has: page.getByRole('heading', { name: 'Example CleanLoop Circular' }) })
  await expect(cleanLoop.getByText('Ineligible', { exact: true })).toBeVisible()

  await wasteWise.getByLabel('Note for the record').fill('Confirmed by email on 30 Sep 2026.')
  await wasteWise.getByRole('button', { name: 'Startup confirmed: accept' }).click()
  await expectToast(page, 'Example WasteWise Robotics: clarification accepted, now eligible')
  await expect(wasteWise.getByText('Eligible', { exact: true })).toBeVisible()
  await expect(wasteWise.getByText('Rs 14 lakh against a ceiling of Rs 14 lakh')).toBeVisible()
  await expect(wasteWise.getByText('Confirmed by email on 30 Sep 2026.')).toBeVisible()
  await expectStage(workspace, 'Expert evaluation')
  await expect(workspace.getByText('Score the eligible applications').first()).toBeVisible()
})

test('steps 4 and 5: scoring, ranking, pilot plan and agreement on CH-2026-003', async ({
  page,
}) => {
  // Expert C scores the two applications still waiting.
  await page.goto('/experts')
  await expect(page.getByLabel('Acting as')).toContainText('Expert C')
  const toScore = panel(page, 'To score')
  await expect(toScore.getByRole('button', { name: /^Score / })).toHaveCount(2)

  // The declaration is required.
  await toScore.getByRole('button', { name: 'Score Example LearnLoop Labs' }).click()
  const drawer = page.getByRole('dialog')
  await drawer.getByRole('button', { name: 'Submit score' }).click()
  await expectToast(page, 'Declare that you have no conflict of interest before scoring.')
  await scoreOpenDrawer(page, 3, '60')

  await toScore.getByRole('button', { name: 'Score Example PaathshalaOne' }).click()
  await scoreOpenDrawer(page, 4, '80')
  await expect(toScore.getByText('Nothing is waiting for your score')).toBeVisible()
  await expect(
    page.getByText('CH-2026-003: Close the evaluation and confirm the ranking'),
  ).toBeVisible()

  // The innovation cell closes the evaluation.
  let workspace = await openChallenge(page, 'ch-003', 'CH-2026-003', 'startups')
  await expectStage(workspace, 'Expert evaluation')
  await workspace.getByRole('button', { name: 'Close evaluation and confirm ranking' }).click()
  const confirm = page.getByRole('dialog', { name: 'Close the evaluation?' })
  await expect(confirm).toContainText('Example ShikshaData Labs is ranked first')
  await confirm.getByRole('button', { name: 'Close evaluation and confirm ranking' }).click()
  await expectToast(page, 'Evaluation closed. Ranking confirmed.')
  await expectStage(workspace, 'Sandbox / pilot design')
  await expect(
    workspace.getByText(/Selected for the pilot: Example ShikshaData Labs, .* out of 100/),
  ).toBeVisible()
  await expect(workspace.getByText('Selected for pilot', { exact: true }).first()).toBeVisible()

  // The department approves the prefilled pilot plan and signs the prefilled agreement.
  workspace = await openChallenge(page, 'ch-003', 'CH-2026-003', 'pilot')
  await expect(workspace.getByText('Done by: Department officer').first()).toBeVisible()
  // The officer confirms the cybersecurity checks before approving.
  await workspace.getByRole('button', { name: 'Tick all (demo shortcut)' }).click()
  await expect(workspace.getByText('Plan check: the plan is complete')).toBeVisible()
  await workspace.getByRole('button', { name: 'Approve pilot plan' }).click()
  await expectToast(page, 'Pilot plan approved. The contract can now be set up.')
  await expectStage(workspace, 'Milestone-based contract')
  await expect(workspace.getByText('Approved', { exact: true })).toBeVisible()

  await expect(workspace.getByText('Total 100%')).toBeVisible()
  await workspace.getByRole('button', { name: 'Sign agreement' }).click()
  await expectToast(page, /Agreement recorded as signed\./)
  await expectStage(workspace, 'Pilot and performance')
  await expect(workspace.getByText('Signed', { exact: true })).toBeVisible()
  for (const order of [1, 2, 3]) {
    await expect(
      milestoneCard(workspace, order).getByText('Planned', { exact: true }),
    ).toBeVisible()
  }
  await expect(workspace.getByText('Waiting for the startup to deliver.')).toBeVisible()
})

test('steps 6 to 8: milestones, payments, validation and decision on CH-2026-002', async ({
  page,
}) => {
  // Milestone 2 is submitted in the seed: accept it and pay it.
  let workspace = await openChallenge(page, 'ch-002', 'CH-2026-002', 'pilot')
  await expectStage(workspace, 'Pilot and performance')
  await acceptAndPay(page, workspace, 2)
  await expect(
    workspace.getByRole('button', { name: 'Close pilot and send for validation' }),
  ).toBeDisabled()

  // The startup delivers milestone 3.
  await page.goto('/startup')
  await expect(
    page.getByRole('heading', { level: 1, name: 'Example QueueCare Health' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Submit milestone 3 as delivered' }).click()
  await expectToast(page, 'Milestone 3 submitted to the department')
  await expect(page.getByText('Nothing is waiting for this startup')).toBeVisible()

  // The department accepts it, finance pays, the department records readings and closes the pilot.
  workspace = await openChallenge(page, 'ch-002', 'CH-2026-002', 'pilot')
  await acceptAndPay(page, workspace, 3)
  await expect(workspace.getByText(/Rs 9 lakh of Rs 9 lakh \(100%\)/)).toBeVisible()

  await expect(workspace.getByLabel('Pilot week')).toHaveValue('14')
  await workspace.getByLabel('Average outpatient waiting time (minutes)').fill('44')
  await workspace.getByLabel('Patients seen within 60 minutes (%)').fill('76')
  await workspace.getByLabel('Patient satisfaction (exit survey, out of 5) (score)').fill('4.1')
  await workspace.getByRole('button', { name: 'Record readings' }).click()
  await expectToast(page, 'KPI readings recorded for week 14.')
  await expect(workspace.getByText('3 of 3 targets met at week 14.')).toBeVisible()

  await workspace.getByRole('button', { name: 'Close pilot and send for validation' }).click()
  await page
    .getByRole('dialog', { name: 'Close the pilot?' })
    .getByRole('button', { name: 'Close pilot' })
    .click()
  await expectToast(page, 'Pilot closed and sent for independent validation.')
  await expectStage(workspace, 'Independent validation')

  // The independent validator submits the report.
  await page.goto('/experts?view=validation')
  await expect(page.getByRole('tab', { name: /Validation/ })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await expect(page.getByText('Done by: Independent validator')).toBeVisible()
  await page.getByRole('button', { name: 'Validate CH-2026-002' }).click()
  const report = page.getByRole('dialog', { name: 'Validation report' })
  await expect(report.getByLabel('Average outpatient waiting time (minutes)')).toHaveValue('44')
  await report.getByLabel('Average outpatient waiting time (minutes)').fill('46')
  await expect(report.getByRole('radio', { name: /Partly validated/ })).toBeChecked()
  await report.getByRole('button', { name: 'Submit validation report' }).click()
  await expectToast(page, 'Validation report submitted')
  await expect(report).toBeHidden()
  await expect(page.getByText('No pilot is waiting for validation')).toBeVisible()
  const reports = panel(page, 'Validation reports')
  await expect(
    reports.getByRole('article').filter({ hasText: 'CH-2026-002' }).getByText('Partly validated', {
      exact: true,
    }),
  ).toBeVisible()
  await expect(page.getByText('CH-2026-002: Decide: scale, extend or stop')).toBeVisible()

  // The department decides: scale, with a pathway and a rollout plan.
  workspace = await openChallenge(page, 'ch-002', 'CH-2026-002', 'outcome')
  await expectStage(workspace, 'Scale-up decision')
  await expect(workspace.getByText('Targets met on confirmed values')).toBeVisible()
  await expect(workspace.getByText('2 of 3', { exact: true })).toBeVisible()
  await workspace.getByRole('radio', { name: /^Scale/ }).click()
  await workspace.getByRole('radio', { name: 'Government e-marketplace purchase' }).click()
  await expect(workspace.getByLabel('Where (step 1)')).toHaveValue('Rest of Pune district')
  await workspace.getByLabel('Where (step 2)').fill('Example District Hospital, Satara')
  await workspace.getByRole('button', { name: 'Record decision' }).click()
  await expectToast(page, 'Decision recorded: Scale')
  await expect(workspace.locator('header').first()).toContainText('Scaled')
  await expect(workspace.getByText('This challenge is closed')).toBeVisible()
  await expect(
    workspace.getByRole('heading', {
      name: 'Procurement pathway: Government e-marketplace purchase',
    }),
  ).toBeVisible()
  await expect(
    workspace.getByRole('cell', { name: 'Example District Hospital, Satara' }),
  ).toBeVisible()

  // The audit trail lists the steps, newest first, with who took them.
  await workspace.getByRole('tab', { name: 'Audit trail' }).click()
  const trail = workspace.getByRole('list', { name: 'Audit trail, newest first' })
  for (const step of [
    'Decision recorded: scale',
    'Validation report submitted',
    'Pilot closed',
    'KPI readings recorded for week 14',
    'Milestone 3 paid',
    'Milestone 3 payment approved',
    'Milestone 3 accepted',
    'Milestone 3 submitted',
    'Milestone 2 paid',
    'Milestone 2 accepted',
  ]) {
    await expect(trail.getByText(step, { exact: true })).toBeVisible()
  }
  await expect(trail.getByRole('listitem').first()).toContainText('Decision recorded: scale')
  await expect(trail.getByRole('listitem').first()).toContainText('Demo Department Officer')
  await expect(trail.getByText('Demo Finance Officer').first()).toBeVisible()
  await expect(trail.getByText('Demo Independent Validator').first()).toBeVisible()
  await expect(trail.getByText('Example QueueCare Health').first()).toBeVisible()

  // CH-2026-001 is waiting for its decision too.
  workspace = await openChallenge(page, 'ch-001', 'CH-2026-001', 'outcome')
  await expectStage(workspace, 'Scale-up decision')
  await expect(workspace.getByRole('radio', { name: /^Extend the pilot/ })).toBeChecked()
  await workspace.getByRole('button', { name: 'Record decision' }).click()
  await expectToast(page, 'Decision recorded: Extend the pilot')
  await expect(workspace.locator('header').first()).toContainText('Pilot extended')
  await expect(workspace.getByText('More evidence before any purchase')).toBeVisible()

  // The payments and templates sections render.
  await page.goto('/government?view=payments')
  await expect(page.getByRole('heading', { name: 'Payment queue' })).toBeVisible()
  await expect(page.getByText('No payments waiting')).toBeVisible()
  const history = page.getByRole('table', { name: /Milestone payments/ })
  await expect(
    history
      .getByRole('row')
      .filter({ hasText: '3. Results report and handover' })
      .filter({ hasText: 'CH-2026-002' }),
  ).toContainText('Paid in 0 days')

  await page.goto('/government?view=templates')
  await expect(page.getByRole('heading', { name: 'Standard templates' })).toBeVisible()
  await expect(page.getByRole('heading', { name: /Rules in force/ })).toBeVisible()
})

// ---------------------------------------------------------------- one challenge, all ten stages

test('a brand-new challenge goes through all ten stages', async ({ page }) => {
  await createAndPublish(page)
  let workspace = await inviteApplyClose(page)

  // 3. Screening: the only application is eligible, so the challenge moves on at once.
  await workspace.getByRole('button', { name: 'Run eligibility screening' }).click()
  await expectToast(page, 'Eligibility screening completed')
  await expectStage(workspace, 'Expert evaluation')

  // 4. Two experts score it; the innovation cell closes the evaluation.
  await page.goto('/experts')
  await page.getByRole('button', { name: `Score ${LUMEN}` }).click()
  await scoreOpenDrawer(page, 4, '80')
  await page.getByLabel('Acting as').click()
  await page.getByRole('option', { name: /^Expert A/ }).click()
  await expectToast(page, 'Now acting as Expert A')
  await page.getByRole('button', { name: `Score ${LUMEN}` }).click()
  await scoreOpenDrawer(page, 4, '80')

  workspace = await openChallenge(page, NEW_ID, NEW_CODE, 'startups')
  await workspace.getByRole('button', { name: 'Close evaluation and confirm ranking' }).click()
  await page
    .getByRole('dialog', { name: 'Close the evaluation?' })
    .getByRole('button', { name: 'Close evaluation and confirm ranking' })
    .click()
  await expectToast(page, 'Evaluation closed. Ranking confirmed.')
  await expectStage(workspace, 'Sandbox / pilot design')

  // 5 and 6. Pilot plan and agreement.
  workspace = await openChallenge(page, NEW_ID, NEW_CODE, 'pilot')
  // The officer confirms the cybersecurity checks before approving.
  await workspace.getByRole('button', { name: 'Tick all (demo shortcut)' }).click()
  await workspace.getByRole('button', { name: 'Approve pilot plan' }).click()
  await expectToast(page, 'Pilot plan approved. The contract can now be set up.')
  await expectStage(workspace, 'Milestone-based contract')
  await workspace.getByRole('button', { name: 'Sign agreement' }).click()
  await expectToast(page, /Agreement recorded as signed\./)
  await expectStage(workspace, 'Pilot and performance')

  // 7. Three milestones: delivered by the startup, accepted and paid by the government.
  for (const order of [1, 2, 3]) {
    await page.goto('/startup')
    await expect(page.getByRole('heading', { level: 1, name: LUMEN })).toBeVisible()
    await page.getByRole('button', { name: `Submit milestone ${order} as delivered` }).click()
    await expectToast(page, `Milestone ${order} submitted to the department`)
    workspace = await openChallenge(page, NEW_ID, NEW_CODE, 'pilot')
    await acceptAndPay(page, workspace, order)
  }
  await expect(workspace.getByText(/Rs 11 lakh of Rs 11 lakh \(100%\)/)).toBeVisible()
  await workspace.getByLabel('Pilot week').fill('12')
  await workspace.getByLabel('Average time to repair a reported streetlight (hours)').fill('46')
  await workspace.getByLabel('Complaints closed within 48 hours (%)').fill('88')
  await workspace.getByLabel('Streetlights working at night (%)').fill('96')
  await workspace.getByRole('button', { name: 'Record readings' }).click()
  await expectToast(page, 'KPI readings recorded for week 12.')
  await workspace.getByRole('button', { name: 'Close pilot and send for validation' }).click()
  await page
    .getByRole('dialog', { name: 'Close the pilot?' })
    .getByRole('button', { name: 'Close pilot' })
    .click()
  await expectToast(page, 'Pilot closed and sent for independent validation.')
  await expectStage(workspace, 'Independent validation')

  // 8. Independent validation.
  await page.goto('/experts?view=validation')
  await page.getByRole('button', { name: `Validate ${NEW_CODE}` }).click()
  const report = page.getByRole('dialog', { name: 'Validation report' })
  await expect(report.getByRole('radio', { name: /^Validated/ })).toBeChecked()
  await report.getByRole('button', { name: 'Submit validation report' }).click()
  await expectToast(page, 'Validation report submitted')

  // 9 and 10. Decision and scale-up.
  workspace = await openChallenge(page, NEW_ID, NEW_CODE, 'outcome')
  await expectStage(workspace, 'Scale-up decision')
  await expect(workspace.getByRole('radio', { name: /^Scale/ })).toBeChecked()
  await workspace.getByRole('button', { name: 'Record decision' }).click()
  await expectToast(page, 'Decision recorded: Scale')
  await expect(workspace.locator('header').first()).toContainText('Scaled')
  await expect(workspace.getByRole('list', { name: /Pathway: stage 10 of 10/ })).toBeVisible()

  await workspace.getByRole('tab', { name: 'Audit trail' }).click()
  const trail = workspace.getByRole('list', { name: 'Audit trail, newest first' })
  await expect(trail.getByRole('listitem').last()).toContainText('Challenge drafted')
  await expect(trail.getByRole('listitem').first()).toContainText('Decision recorded: scale')
  await expect(workspace.getByText(/entries by 6 roles/)).toBeVisible()
})

// ---------------------------------------------------------------- phone width

test.describe('at 390 px', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('a challenge is chosen from the select and screened without sideways scrolling', async ({
    page,
  }) => {
    await page.goto('/government')
    await page.getByLabel('Challenge', { exact: true }).click()
    await page.getByRole('option', { name: /^CH-2026-004/ }).click()
    const workspace = page.getByRole('region', { name: 'Challenge CH-2026-004' })
    await expectStage(workspace, 'Eligibility screening')
    await expect(workspace.getByRole('tab', { name: 'Startups and evaluation' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await workspace.getByRole('button', { name: 'Run eligibility screening' }).click()
    await expectToast(page, 'Eligibility screening completed')
    await workspace.getByRole('button', { name: 'Startup confirmed: accept' }).click()
    await expectStage(workspace, 'Expert evaluation')

    // The expert scores in a full-width drawer.
    await page.goto('/experts')
    await page.getByRole('button', { name: 'Score Example WasteWise Robotics' }).click()
    await scoreOpenDrawer(page, 4, '80')

    for (const path of ['/government?c=ch-004&tab=startups', '/startup', '/experts']) {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(overflow, `sideways overflow on ${path}`).toBeLessThanOrEqual(1)
    }
  })
})
