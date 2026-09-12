import { expect, test, type Page, type Route } from '@playwright/test';

const apiPrefix = '/api/v1';
const apiOrigin = 'http://127.0.0.1:5052';
const organizationId = '00000000-0000-0000-0000-000000000001';
const projectsPath = `${apiPrefix}/organizations/${organizationId}/projects`;
const invitationsPath = `${apiPrefix}/organizations/${organizationId}/invitations`;

const organization = {
  id: organizationId,
  slug: 'acme',
  name: 'Acme Organization',
  type: 'SHARED',
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
  role: {
    id: '00000000-0000-0000-0000-000000000002',
    name: 'Admin',
    permissions: ['organization.manage', 'project.manage'],
    isOwner: false,
    code: 'ADMIN',
  },
};

const demoProject = {
  id: '00000000-0000-0000-0000-000000000021',
  organizationId,
  name: 'Demo Project',
  githubUrl: 'https://github.com/acme/demo',
  githubOwner: 'acme',
  githubRepo: 'demo',
  sourceBranch: 'main',
  targetBranch: 'main',
  nodeVersion: '22',
  environmentMetadata: { DATABASE_URL: 'configured' },
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
  archivedAt: null,
};

const pendingInvitation = {
  id: '00000000-0000-0000-0000-000000000031',
  organizationId,
  email: 'invitee@example.test',
  role: {
    id: '00000000-0000-0000-0000-000000000003',
    name: 'Member',
    permissions: [],
    isOwner: false,
    code: 'MEMBER',
  },
  status: 'PENDING',
  expiresAt: '2026-01-08T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
};

function envelope(data: unknown, meta?: unknown) {
  return { data, ...(meta ? { meta } : {}) };
}

function errorEnvelope(code: string, message: string, requestId: string) {
  return {
    error: { code, message, details: {}, requestId },
  };
}

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function dismissNotification(page: Page, message: string) {
  const notification = page.getByRole('alert').filter({ hasText: message });
  await notification.locator('button').dispatchEvent('click');
  await expect(notification).toBeHidden();
}

async function signedIn(page: Page) {
  await page.context().addCookies([
    {
      name: 'pf_session',
      value: 'controlled-e2e-session',
      domain: '127.0.0.1',
      path: '/',
    },
  ]);
}

async function expectInvitationFailure(page: Page, token: string, status: number, code: string, message: string) {
  const path = `${apiPrefix}/organizations/invitations/${token}/accept`;
  await page.route(`**${path}`, (route) => fulfillJson(route, errorEnvelope(code, message, `e2e-${token}`), status));
  await page.goto(`/invitations/${token}`);

  const join = page.getByRole('button', { name: 'เข้าร่วม' });
  await expect(join).toBeEnabled();
  const responsePromise = page.waitForResponse(
    (response) => response.request().method() === 'POST' && new URL(response.url()).pathname === path,
  );
  await join.click();
  const response = await responsePromise;
  expect(response.status()).toBe(status);
  await expect(page.getByText('ไม่สามารถเข้าร่วม Organization ได้')).toBeVisible();
  await expect(page.getByText(message)).toBeVisible();
}

test('GitHub authentication keeps the requested same-origin return path', async ({ page }) => {
  await page.goto('/login?returnTo=%2Facme%2Fprojects');

  await expect(page.getByRole('link', { name: 'เข้าสู่ระบบด้วย GitHub' })).toHaveAttribute(
    'href',
    `${apiOrigin}${apiPrefix}/auth/github/start?returnTo=%2Facme%2Fprojects`,
  );
});

test('organization navigation preserves the current section when switching organizations', async ({ page }) => {
  await signedIn(page);
  await page.goto('/acme');
  await expect(page.getByText('Acme Organization').first()).toBeVisible();

  await page.getByRole('button', { name: 'เปลี่ยน Organization' }).click();
  const beta = page.getByRole('menuitem', { name: /Beta Organization/ });
  await expect(beta).toBeVisible();
  await beta.click();

  await expect(page).toHaveURL(/\/beta$/);
  await expect(page.getByText('Beta Organization').first()).toBeVisible();
});

test('project creation and archive lifecycle have no agent or repository side effects', async ({ page }) => {
  await signedIn(page);
  const apiRequests: string[] = [];
  page.on('request', (request) => {
    if (!request.url().includes('/api/v1/')) return;
    const url = new URL(request.url());
    apiRequests.push(`${request.method()} ${url.pathname}`);
  });

  await page.goto('/acme/projects');
  await expect(page.getByText('Demo Project')).toBeVisible();

  await page.getByLabel('ชื่อโปรเจกต์').fill('Agent-ready project');
  await page.getByLabel('GitHub URL').fill('https://github.com/acme/agent-ready');
  await page.getByLabel('สาขาต้นทาง').fill('feature');
  await page.getByLabel('สาขาปลายทาง').fill('main');
  await page.getByLabel('เวอร์ชัน Node.js').fill('22');
  await page.getByLabel('ตัวแปรสภาพแวดล้อม').fill('DATABASE_URL');
  await page.getByRole('button', { name: 'สร้างโปรเจกต์' }).click();

  await expect(page.getByText('สร้างโปรเจกต์แล้ว')).toBeVisible();
  await expect(page.getByText('Agent-ready project')).toBeVisible();
  await dismissNotification(page, 'สร้างโปรเจกต์แล้ว');

  const sideEffectRequests = apiRequests.filter((request) =>
    /\/(?:clone|clones|sandbox|hermes|ai|issues|pulls|pull-requests)(?:\/|$)/i.test(request),
  );
  expect(sideEffectRequests).toEqual([]);

  await page.getByRole('button', { name: 'การดำเนินการ: Agent-ready project' }).click();
  await page.getByRole('menuitem', { name: 'เก็บโปรเจกต์' }).click();
  await expect(page.getByRole('heading', { name: 'ยืนยันการเก็บโปรเจกต์' })).toBeVisible();
  await page.getByRole('button', { name: 'เก็บโปรเจกต์' }).last().click();
  await expect(page.getByText('เก็บโปรเจกต์แล้ว')).toBeVisible();
  await dismissNotification(page, 'เก็บโปรเจกต์แล้ว');

  await page.getByRole('button', { name: 'การดำเนินการ: Agent-ready project' }).click();
  await page.getByRole('menuitem', { name: 'กู้คืนโปรเจกต์' }).click();
  await expect(page.getByText('กู้คืนโปรเจกต์แล้ว')).toBeVisible();
});

test('project list recovers from a live API failure through the UI retry state', async ({ page }) => {
  await signedIn(page);
  let calls = 0;
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    if (new URL(request.url()).pathname !== projectsPath) return route.continue();
    calls += 1;
    if (calls === 1) {
      return fulfillJson(
        route,
        errorEnvelope('SERVICE_UNAVAILABLE', 'controlled project failure', 'e2e-project-retry'),
        503,
      );
    }
    return fulfillJson(route, envelope([demoProject]));
  });

  await page.goto('/acme/projects');
  await expect(page.getByText('ไม่สามารถโหลดรายการโปรเจกต์ได้')).toBeVisible();
  await page.getByRole('button', { name: 'ลองใหม่' }).click();
  await expect(page.getByText('Demo Project')).toBeVisible();
  expect(calls).toBe(2);
});

test('verified-email mismatch is rejected before an invitation can be accepted', async ({ page }) => {
  await signedIn(page);
  await expectInvitationFailure(
    page,
    'controlled-unverified-email',
    403,
    'FORBIDDEN',
    'This invitation requires a matching verified GitHub email address',
  );
});

test('expired invitations show the conflict returned by the API', async ({ page }) => {
  await signedIn(page);
  await expectInvitationFailure(page, 'controlled-expired-invitation', 409, 'CONFLICT', 'Invitation has expired');
});

test('cancelled invitations are no longer accepted', async ({ page }) => {
  await signedIn(page);
  await expectInvitationFailure(
    page,
    'controlled-cancelled-invitation',
    404,
    'NOT_FOUND',
    'Invitation was not found or has already been used',
  );
});

test('resending an invitation rotates its token and expiry in the Organization UI', async ({ page }) => {
  await signedIn(page);
  let currentInvitation: typeof pendingInvitation | null = { ...pendingInvitation };
  let requestBody: unknown;
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (pathname !== invitationsPath) return route.continue();

    if (request.method() === 'GET') {
      return fulfillJson(route, envelope(currentInvitation ? [currentInvitation] : []));
    }

    requestBody = request.postDataJSON();
    currentInvitation = {
      ...pendingInvitation,
      createdAt: '2026-01-03T00:00:00.000Z',
      expiresAt: '2026-01-10T00:00:00.000Z',
    };
    return fulfillJson(route, envelope({ invitation: currentInvitation, token: 'rotated-invitation-token' }));
  });

  await page.goto('/acme/settings/members');
  await page.getByRole('tab', { name: 'คำเชิญที่รอดำเนินการ' }).click();
  await expect(page.getByText(pendingInvitation.email)).toBeVisible();
  const responsePromise = page.waitForResponse(
    (response) => response.request().method() === 'POST' && new URL(response.url()).pathname === invitationsPath,
  );
  await page.getByRole('button', { name: 'ส่งอีกครั้ง' }).click();
  const response = await responsePromise;
  expect(requestBody).toEqual({
    email: pendingInvitation.email,
    roleId: pendingInvitation.role.id,
  });
  expect(await response.json()).toMatchObject({
    data: {
      token: 'rotated-invitation-token',
      invitation: { createdAt: '2026-01-03T00:00:00.000Z', expiresAt: '2026-01-10T00:00:00.000Z' },
    },
  });
  await expect(page.getByText('หมุนเวียนคำเชิญและส่งอีกครั้งแล้ว')).toBeVisible();
});

test('cancelling a pending invitation removes it from the Organization UI', async ({ page }) => {
  await signedIn(page);
  let currentInvitation: typeof pendingInvitation | null = { ...pendingInvitation };
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (pathname === invitationsPath && request.method() === 'GET') {
      return fulfillJson(route, envelope(currentInvitation ? [currentInvitation] : []));
    }
    if (pathname === `${invitationsPath}/${pendingInvitation.id}` && request.method() === 'DELETE') {
      currentInvitation = null;
      return fulfillJson(route, envelope(null));
    }
    return route.continue();
  });
  page.on('dialog', (dialog) => dialog.accept());

  await page.goto('/acme/settings/members');
  await page.getByRole('tab', { name: 'คำเชิญที่รอดำเนินการ' }).click();
  await expect(page.getByText(pendingInvitation.email)).toBeVisible();
  await page.getByRole('button', { name: 'ยกเลิกคำเชิญ' }).click();

  await expect(page.getByText('ยกเลิกคำเชิญแล้ว')).toBeVisible();
  await expect(page.getByText('ไม่มีคำเชิญที่รอดำเนินการ')).toBeVisible();
});

test('an accepted invitation cannot be used a second time', async ({ page }) => {
  await signedIn(page);
  const token = 'controlled-single-use-invitation';
  const path = `${apiPrefix}/organizations/invitations/${token}/accept`;
  let uses = 0;
  await page.route(`**${path}`, async (route) => {
    uses += 1;
    if (uses === 1) {
      return fulfillJson(route, envelope({ organization }));
    }
    return fulfillJson(route, errorEnvelope('FORBIDDEN', 'คำเชิญนี้ไม่สามารถใช้ได้', 'e2e-single-use'), 403);
  });

  await page.goto(`/invitations/${token}`);
  const firstResponsePromise = page.waitForResponse(
    (response) => response.request().method() === 'POST' && new URL(response.url()).pathname === path,
  );
  await page.getByRole('button', { name: 'เข้าร่วม' }).click();
  expect((await firstResponsePromise).status()).toBe(200);
  await expect(page).toHaveURL(/\/acme$/);

  await page.goto(`/invitations/${token}`);
  const secondResponsePromise = page.waitForResponse(
    (response) => response.request().method() === 'POST' && new URL(response.url()).pathname === path,
  );
  await page.getByRole('button', { name: 'เข้าร่วม' }).click();
  expect((await secondResponsePromise).status()).toBe(403);
  await expect(page.getByText('คำเชิญนี้ไม่สามารถใช้ได้')).toBeVisible();
});
