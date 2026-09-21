import { expect, test, type Page } from '@playwright/test';

const expectedAcmeMembersPath = '/api/v1/organizations/00000000-0000-0000-0000-000000000001/members';
const scopedMembers = [
  {
    id: '00000000-0000-0000-0000-000000000011',
    membershipId: '00000000-0000-0000-0000-000000000111',
    name: 'Scoped Admin',
    email: 'admin@example.test',
    role: {
      id: '00000000-0000-0000-0000-000000000002',
      name: 'Admin',
      permissions: ['organization.manage'],
      isOwner: false,
      code: 'ADMIN',
    },
    status: 'ACTIVE',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000012',
    membershipId: '00000000-0000-0000-0000-000000000112',
    name: 'Scoped Editor',
    email: 'editor@example.test',
    role: {
      id: '00000000-0000-0000-0000-000000000003',
      name: 'Member',
      permissions: [],
      isOwner: false,
      code: 'MEMBER',
    },
    status: 'ACTIVE',
    isActive: true,
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  },
];

async function signedIn(page: Page) {
  await page
    .context()
    .addCookies([{ name: 'pf_session', value: 'controlled-e2e-session', domain: '127.0.0.1', path: '/' }]);
}

test('anonymous organization requests return to the canonical login route', async ({ page }) => {
  await page.goto('/acme');
  await expect(page).toHaveURL(/\/login$/);
});

test('the Organization app does not expose the removed System Admin route', async ({ page }) => {
  await page.goto('/admin/users');
  await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'This page could not be found.' })).toBeVisible();
});

test('organization members use the explicit organization scope', async ({ page }) => {
  await signedIn(page);
  let calls = 0;
  await page.route('**/api/v1/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (!pathname.endsWith('/members')) {
      return route.continue();
    }
    calls += 1;
    if (calls === 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: scopedMembers,
        meta: { page: 1, pageSize: 100, total: scopedMembers.length, totalPages: 1 },
      }),
    });
  });
  let membersRequestPath: string | undefined;
  page.on('request', (request) => {
    if (request.method() === 'GET' && request.url().includes('/api/v1/') && request.url().includes('/members'))
      membersRequestPath = new URL(request.url()).pathname;
  });
  await page.goto('/acme/settings/members');
  await expect.poll(() => membersRequestPath, { timeout: 30_000 }).toBe(expectedAcmeMembersPath);
  await expect(page.getByRole('table')).toBeVisible();
  await expect(page.getByText('Scoped Admin')).toBeVisible();
});

test('organization members recover after a forced request failure', async ({ page }) => {
  await signedIn(page);
  let calls = 0;
  await page.route('**/api/v1/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (!pathname.endsWith('/members')) {
      return route.continue();
    }
    calls += 1;
    if (calls === 1) {
      return route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: { code: 'SERVICE_UNAVAILABLE', message: 'controlled failure' } }),
      });
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: scopedMembers,
        meta: { page: 1, pageSize: 100, total: scopedMembers.length, totalPages: 1 },
      }),
    });
  });
  let membersRequestPath: string | undefined;
  page.on('request', (request) => {
    if (request.method() === 'GET' && request.url().includes('/api/v1/') && request.url().includes('/members'))
      membersRequestPath = new URL(request.url()).pathname;
  });
  await page.goto('/acme/settings/members');
  await expect.poll(() => membersRequestPath, { timeout: 30_000 }).toBe(expectedAcmeMembersPath);
  await expect.poll(() => calls, { timeout: 30_000 }).toBe(1);
  await expect(page.getByText('ไม่สามารถโหลดข้อมูลสมาชิกได้')).toBeVisible();
  const retry = page.getByRole('button', { name: 'ลองใหม่' });
  await expect(retry).toBeVisible();
  await retry.click();
  await expect.poll(() => calls).toBe(2);
  await expect(page.getByText('Scoped Admin')).toBeVisible();
  await expect(page.getByText('Scoped Editor')).toBeVisible();
});

test('profile edit submits and shows visible success feedback', async ({ page }) => {
  await signedIn(page);
  await page.goto('/account/settings');
  const name = page.getByLabel('ชื่อผู้ใช้');
  await expect(name).toHaveValue('Ada Lovelace');
  await name.fill('Grace Hopper');
  await expect(name).toHaveValue('Grace Hopper');
  let patchSeen = false;
  page.on('request', (request) => {
    if (request.method() === 'PATCH' && request.url().includes('/api/v1/profile')) patchSeen = true;
  });
  await page.getByRole('button', { name: 'บันทึก' }).first().click();
  await expect.poll(() => patchSeen, { timeout: 30_000 }).toBe(true);
  await expect(page.getByText('บันทึกชื่อสำเร็จ')).toBeVisible();
});

test('controlled audit state and rejected invitation boundary are visible', async ({ page }) => {
  await signedIn(page);
  await page.goto('/acme/audit-logs');
  await expect(page.getByText('ไม่พบประวัติการทำรายการ')).toBeVisible();

  await page.route('**/api/v1/organizations/invitations/controlled-invalid-token/accept', async (route) => {
    await route.fulfill({
      status: 403,
      contentType: 'application/json',
      body: JSON.stringify({
        error: { code: 'FORBIDDEN', message: 'คำเชิญนี้ไม่สามารถใช้ได้', details: {}, requestId: 'e2e' },
      }),
    });
  });
  await page.goto('/invitations/controlled-invalid-token');
  const join = page.getByRole('button', { name: 'เข้าร่วม' });
  await expect(join).toBeEnabled();
  let rejectedResponseSeen = false;
  page.on('response', (response) => {
    if (
      response.request().method() === 'POST' &&
      response.url().includes('/api/v1/organizations/invitations/controlled-invalid-token/accept') &&
      response.status() === 403
    )
      rejectedResponseSeen = true;
  });
  await join.click();
  await expect.poll(() => rejectedResponseSeen, { timeout: 30_000 }).toBe(true);
  await expect(page.getByText('ไม่สามารถเข้าร่วม Organization ได้')).toBeVisible();
  await expect(page.getByText('คำเชิญนี้ไม่สามารถใช้ได้')).toBeVisible();
});

test('authenticated user without an invitation sees a controlled access denial', async ({ page }) => {
  await signedIn(page);
  await page.goto('/invitations/controlled-no-invitation');
  const join = page.getByRole('button', { name: 'เข้าร่วม' });
  await expect(join).toBeEnabled();
  let deniedResponse: { status: number; requestId?: string } | undefined;
  page.on('response', async (response) => {
    if (
      response.request().method() === 'POST' &&
      response.url().includes('/api/v1/organizations/invitations/controlled-no-invitation/accept')
    ) {
      const body = await response.json();
      deniedResponse = { status: response.status(), requestId: body.error?.requestId };
    }
  });
  await join.click();
  await expect.poll(() => deniedResponse?.status, { timeout: 30_000 }).toBe(403);
  await expect.poll(() => deniedResponse?.requestId, { timeout: 30_000 }).toBe('e2e-no-invitation');
  await expect(page.getByText('ไม่สามารถเข้าร่วม Organization ได้')).toBeVisible();
  await expect(page.getByText('ผู้ใช้ยังไม่ได้รับคำเชิญเข้า Organization นี้')).toBeVisible();
});

test('invited user accepts a controlled one-time invitation and enters the organization', async ({ page }) => {
  await signedIn(page);
  await page.goto('/invitations/controlled-one-time-token');
  const join = page.getByRole('button', { name: 'เข้าร่วม' });
  await expect(join).toBeEnabled();
  let acceptedResponseStatus: number | undefined;
  page.on('response', (response) => {
    if (
      response.request().method() === 'POST' &&
      response.url().includes('/api/v1/organizations/invitations/controlled-one-time-token/accept')
    )
      acceptedResponseStatus = response.status();
  });
  await join.click();
  await expect.poll(() => acceptedResponseStatus, { timeout: 30_000 }).toBe(200);
  await expect(page).toHaveURL(/\/acme$/);
  await expect(page.getByRole('heading', { name: 'Acme Organization' })).toBeVisible();
});
