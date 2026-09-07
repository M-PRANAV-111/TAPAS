import { expect, test } from '@playwright/test'
import { mockProviders } from './fixtures'
for (const width of [320, 360, 375, 390, 412]) test(`role sessions and responsive dashboards at ${width}px`, async ({ page }) => {
  await mockProviders(page); await page.setViewportSize({ width, height: 844 })
  const checkWidth = async () => expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
  await page.goto('/officer'); await expect(page).toHaveURL(/\/login/); await checkWidth()
  await page.getByRole('button', { name: 'Use Demo Account · Mandal Officer' }).click()
  await expect(page.getByRole('heading', { name: 'Mandal Officer · local heat operations' })).toBeVisible(); await checkWidth()
  await page.reload(); await expect(page.getByRole('heading', { name: 'Mandal Officer · local heat operations' })).toBeVisible()
  await page.getByRole('link', { name: 'Switch demo role' }).click()
  await page.getByRole('button', { name: 'Use Demo Account · Higher Authority' }).click()
  await expect(page.getByRole('heading', { name: 'Higher Authority · regional overview' })).toBeVisible()
  await expect(page.getByTestId('national-ranking')).not.toBeEmpty(); await checkWidth()
  await page.getByRole('button', { name: 'Log out', exact: true }).click(); await expect(page).toHaveURL(/\/login/)
  await page.goto('/authority'); await expect(page).toHaveURL(/\/login/)
  await page.getByRole('link', { name: 'Continue as citizen' }).click()
  await expect(page.getByRole('heading', { name: 'India Heat & Safety Dashboard' })).toBeVisible()
})
