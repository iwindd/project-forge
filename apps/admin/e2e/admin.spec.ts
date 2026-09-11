import { expect, test, type Page } from '@playwright/test'

async function signedIn(page: Page) {
  await page.context().addCookies([{ name: 'pf_session', value: 'controlled-e2e-session', domain: '127.0.0.1', path: '/' }])
}
test('organization users shows loading, scoped users, and retry recovery', async ({ page }) => {
  await signedIn(page)
  let calls = 0
  await page.route('**/api/v1/**', async route => {
    const pathname = new URL(route.request().url()).pathname
    if (!pathname.endsWith('/members') && !pathname.endsWith('/admin/users')) {
      return route.continue()
    }
    calls += 1
    if (calls === 1) {
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [
      { id: 'user-1', name: 'Scoped Admin', email: 'admin@example.test', role: 'ADMIN', isActive: true, createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'user-2', name: 'Scoped Editor', email: 'editor@example.test', role: 'EDITOR', isActive: true, createdAt: '2026-01-02T00:00:00.000Z' }
    ], meta: { total: 2 } }) })
  })
  await page.goto('/acme/users')
  await expect(page.getByText('กำลังโหลดรายการผู้ใช้งาน...')).toBeVisible()
  await expect(page.getByRole('table')).toBeVisible()
})

test('organization users recovers after a forced request failure', async ({ page }) => {
  await signedIn(page)
  let calls = 0
  await page.route('**/api/v1/**', async route => {
    const pathname = new URL(route.request().url()).pathname
    if (!pathname.endsWith('/members') && !pathname.endsWith('/admin/users')) {
      return route.continue()
    }
    calls += 1
    if (calls === 1) {
      return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { code: 'SERVICE_UNAVAILABLE', message: 'controlled failure' } }) })
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [
      { id: 'user-1', name: 'Scoped Admin', email: 'admin@example.test', role: 'ADMIN', isActive: true, createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'user-2', name: 'Scoped Editor', email: 'editor@example.test', role: 'EDITOR', isActive: true, createdAt: '2026-01-02T00:00:00.000Z' }
    ], meta: { total: 2 } }) })
  })
  await page.goto('/acme/users')
  await expect.poll(() => calls).toBe(1)
  await expect(page.getByText('ไม่สามารถโหลดรายการผู้ใช้งานได้')).toBeVisible()
  const retry = page.getByRole('button', { name: 'ลองใหม่' })
  await expect(retry).toBeVisible()
  await retry.click()
  await expect.poll(() => calls).toBe(2)
  await expect(page.getByText('Scoped Admin')).toBeVisible()
  await expect(page.getByText('Scoped Editor')).toBeVisible()
})

test('profile edit submits and shows visible success feedback', async ({ page }) => {
  await signedIn(page)
  await page.goto('/account/settings')
  const name = page.getByLabel('ชื่อผู้ใช้')
  await expect(name).toHaveValue('Ada Lovelace')
  await name.click()
  await page.keyboard.press('ControlOrMeta+A')
  await page.keyboard.type('Grace Hopper')
  await name.blur()
  const patchRequest = page.waitForRequest(request =>
    request.method() === 'PATCH' && request.url().includes('/api/v1/profile'),
  )
  await page.getByRole('button', { name: 'บันทึก' }).first().click()
  await patchRequest
  await expect(page.getByText('บันทึกชื่อสำเร็จ')).toBeVisible()
})

test('controlled audit state and rejected invitation boundary are visible', async ({ page }) => {
  await signedIn(page)
  await page.goto('/acme/audit-logs')
  await expect(page.getByText('ไม่พบประวัติการทำรายการ')).toBeVisible()

  await page.goto('/admin/invitations/controlled-invalid-token')
  await page.route('**/api/v1/organizations/invitations/controlled-invalid-token/accept', async route => {
    await route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ error: { code: 'FORBIDDEN', message: 'คำเชิญนี้ไม่สามารถใช้ได้', details: {}, requestId: 'e2e' } }) })
  })
  const join = page.getByRole('button', { name: 'เข้าร่วม' })
  await expect(join).toBeEnabled()
  const rejectedResponse = page.waitForResponse(response =>
    response.request().method() === 'POST' &&
    response.url().includes('/api/v1/organizations/invitations/controlled-invalid-token/accept') &&
    response.status() === 403,
  )
  await join.click()
  await rejectedResponse
  await expect(page.getByText('ไม่สามารถเข้าร่วม Organization ได้')).toBeVisible()
  await expect(page.getByText('คำเชิญนี้ไม่สามารถใช้ได้')).toBeVisible()
})
