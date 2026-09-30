// Sign-in with the demo accounts: each account opens its own dashboard only.
// Run with:  npx playwright test sign-in
import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 1366, height: 900 } })

test('a signed-out visitor is sent to the sign-in page', async ({ page }) => {
  await page.goto('/government?view=payments')
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'Sign in', level: 2 })).toBeVisible()
})

test('a wrong password is refused with a message', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill('officer@innovprocure.demo')
  await page.getByLabel('Password').fill('wrong')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('alert')).toHaveText('The email or password is not correct.')
  await expect(page).toHaveURL(/\/login$/)
})

test('each demo account opens its own dashboard', async ({ page }) => {
  const accounts = [
    ['officer@innovprocure.demo', 'Govt@2026', '/government', 'Government dashboard'],
    ['startup@innovprocure.demo', 'Startup@2026', '/startup', 'Example QueueCare Health'],
    ['expert@innovprocure.demo', 'Expert@2026', '/experts', 'Expert dashboard'],
  ] as const
  for (const [email, password, path, heading] of accounts) {
    await page.goto('/login')
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password').fill(password)
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`${path}$`))
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible()
    // The menu lists only this account's dashboard.
    await expect(
      page.getByRole('navigation', { name: 'Dashboards' }).getByRole('link'),
    ).toHaveCount(1)
    await page.getByRole('button', { name: /^Account:/ }).click()
    await page.getByRole('menuitem', { name: 'Sign out' }).click()
    await expect(page).toHaveURL(/\/login$/)
  }
})

test('another dashboard asks to switch account, and the switch works', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('button', { name: 'Sign in to the Government dashboard' }).click()
  await expect(page).toHaveURL(/\/government$/)

  await page.goto('/startup')
  await expect(
    page.getByRole('heading', { level: 1, name: 'This is the Startup dashboard' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Switch to Demo Startup Founder' }).click()
  await expect(
    page.getByRole('heading', { level: 1, name: 'Example QueueCare Health' }),
  ).toBeVisible()

  // The account menu switches back in one click.
  await page.getByRole('button', { name: /^Account:/ }).click()
  await page.getByRole('menuitem', { name: 'Government dashboard' }).click()
  await expect(page).toHaveURL(/\/government$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Government dashboard' })).toBeVisible()
})

test('the sign-in page fits a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'Sign in', level: 2 })).toBeVisible()
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(1)
})
