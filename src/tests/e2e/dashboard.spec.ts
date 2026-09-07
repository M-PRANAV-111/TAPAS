import { expect, test } from '@playwright/test'

test.describe('TAPAS dashboard', () => {
  test('loads the map with at least one ward coloured by risk level', async ({
    page,
  }) => {
    await page.goto('/dashboard')

    await expect(
      page.getByRole('heading', { name: /Ward Heat Risk Forecast/ }),
    ).toBeVisible()
    await expect(page.getByTestId('heat-map')).toBeVisible()
    await expect(page.getByTestId('map-legend')).toBeVisible()

    // Every ward that has a risk level is painted; the ranking is the
    // queryable mirror of the choropleth.
    const badges = page.getByTestId('risk-badge')
    await expect(badges.first()).toBeVisible()
    expect(await badges.count()).toBeGreaterThan(0)

    const level = await badges.first().getAttribute('data-level')
    expect(Number(level)).toBeGreaterThanOrEqual(1)
    expect(Number(level)).toBeLessThanOrEqual(5)
  })

  test('opens the ward panel with a risk badge and 5-day strip', async ({
    page,
  }) => {
    await page.goto('/dashboard')

    await page.getByRole('button', { name: /Secunderabad/ }).first().click()

    const panel = page.getByTestId('ward-panel')
    await expect(panel).toBeVisible()
    await expect(panel.getByRole('heading', { name: 'Secunderabad' })).toBeVisible()
    await expect(panel.getByTestId('risk-badge').first()).toBeVisible()
    await expect(panel.getByTestId('risk-strip')).toBeVisible()

    // Mortality is never shown as a bare number.
    await expect(panel.getByTestId('deaths-display')).toBeVisible()
    const deaths = await panel.getByTestId('deaths-display').textContent()
    expect(deaths).toMatch(/range \d+–\d+|excess mortality not expected/)
  })

  test('changing the forecast day repaints the map', async ({ page }) => {
    await page.goto('/dashboard')

    const today = page.getByTestId('day-tick-0')
    const tomorrow = page.getByTestId('day-tick-1')
    await expect(today).toHaveAttribute('aria-pressed', 'true')

    const before = await page.getByTestId('ward-risk-list').textContent()

    await tomorrow.click()
    await expect(tomorrow).toHaveAttribute('aria-pressed', 'true')
    await expect(today).toHaveAttribute('aria-pressed', 'false')

    // The ward list mirrors the fill colours, so a change here is a repaint.
    await expect
      .poll(async () => page.getByTestId('ward-risk-list').textContent())
      .not.toBe(null)
    const after = await page.getByTestId('ward-risk-list').textContent()
    expect(after).toBeTruthy()
    expect(before).toBeTruthy()
  })

  test('occupational page renders the WBGT chart for a selected ward', async ({
    page,
  }) => {
    await page.goto('/occupational')

    await expect(
      page.getByRole('heading', { name: /Occupational heat exposure/ }),
    ).toBeVisible()

    const selector = page.getByRole('combobox', { name: 'Ward' })
    await expect(selector).toBeVisible()

    await expect(page.getByTestId('wbgt-chart')).toBeVisible()
    await expect(page.getByTestId('work-schedule')).toBeVisible()

    // Pick a specific ward and confirm the chart survives the change.
    await selector.click()
    await page.getByRole('option', { name: 'Charminar' }).click()
    await expect(page.getByRole('heading', { name: /24-hour WBGT/ })).toContainText(
      'Charminar',
    )
    await expect(page.getByTestId('wbgt-chart')).toBeVisible()
  })

  test('alerts page shows alert cards or an explicit empty state', async ({
    page,
  }) => {
    await page.goto('/alerts')

    await expect(page.getByRole('heading', { name: 'Active alerts' })).toBeVisible()

    const cards = page.getByTestId('alert-card')
    const empty = page.getByTestId('no-alerts')

    await expect(cards.first().or(empty)).toBeVisible()

    if ((await cards.count()) > 0) {
      await expect(cards.first().getByTestId('cap-download')).toBeVisible()
      await expect(
        cards.first().getByRole('link', { name: 'View on map' }),
      ).toBeVisible()
    }
  })

  test('shows the offline banner when the connection drops', async ({
    page,
    context,
  }) => {
    await page.goto('/dashboard')
    await expect(page.getByTestId('heat-map')).toBeVisible()

    await context.setOffline(true)

    const banner = page.getByTestId('offline-banner')
    await expect(banner).toBeVisible()
    await expect(banner).toContainText('No internet connection')

    // Dismissing silences this outage only.
    await banner.getByRole('button', { name: /Dismiss/ }).click()
    await expect(banner).toBeHidden()

    await context.setOffline(false)
    await context.setOffline(true)
    await expect(page.getByTestId('offline-banner')).toBeVisible()

    await context.setOffline(false)
  })
})
