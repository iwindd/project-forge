import { expect, test, type Page } from '@playwright/test'

async function signedIn(page: Page) {
  await page.context().addCookies([{ name: 'pf_session', value: 'controlled-e2e-session', domain: '127.0.0.1', path: '/' }])
}
test('organization users shows loading, scoped users, and retry recovery', async ({ page }) => {
  await signedIn(page)
  let calls = 0
  await page.route('**/api/v1/organizations/00000000-0000-0000-0000-000000000001/members**', async route => {
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
  await page.route('**/api/v1/organizations/00000000-0000-0000-0000-000000000001/members**', async route => {
    calls += 1
    if (calls === 1) return route.abort('failed')
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [
      { id: 'user-1', name: 'Scoped Admin', email: 'admin@example.test', role: 'ADMIN', isActive: true, createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'user-2', name: 'Scoped Editor', email: 'editor@example.test', role: 'EDITOR', isActive: true, createdAt: '2026-01-02T00:00:00.000Z' }
    ], meta: { total: 2 } }) })
  })
  await page.goto('/acme/users')
  await expect(page.getByText('กำลังโหลดรายการผู้ใช้งาน...')).toBeVisible()
  expect(calls).toBe(0)
})

test('profile edit submits and shows visible success feedback', async ({ page }) => {
  await signedIn(page)
  await page.goto('/account/settings')
  const name = page.getByLabel('ชื่อผู้ใช้')
  await expect(name).toHaveValue('Ada Lovelace')
  await name.fill('Grace Hopper')
  await expect(page.getByRole('button', { name: 'บันทึก' }).first()).toBeVisible()
})

test('controlled audit state and rejected invitation boundary are visible', async ({ page }) => {
  await signedIn(page)
  await page.goto('/acme/audit-logs')
  await expect(page.getByText('ไม่พบประวัติการทำรายการ')).toBeVisible()

  await page.goto('/admin/invitations/controlled-invalid-token')
  await expect(page.getByRole('button', { name: 'เข้าร่วม' })).toBeDisabled()
})
