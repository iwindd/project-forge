import { expect, test, type Page, type Route } from '@playwright/test';

const apiPrefix = '/api/v1';
const apiOrigin = 'http://127.0.0.1:5052';
const organizationId = '00000000-0000-0000-0000-000000000001';
const projectsPath = `${apiPrefix}/organizations/${organizationId}/projects`;
const invitationsPath = `${apiPrefix}/organizations/${organizationId}/invitations`;

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
const betaOrganizationId = '00000000-0000-0000-0000-000000000002';

type FixtureState = {
  invitation: { status: string; acceptedBy?: string; acceptedAt?: string } | null;
  activeToken: string | null;
  previousTokens: string[];
  membership: { status: string } | null;
  auditRecords: Array<{ action: string; resourceId: string; reason: string | null }>;
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

async function signedIn(page: Page, scenario = 'default') {
  if (scenario !== 'default') {
    await page.setExtraHTTPHeaders({ 'x-e2e-scenario': scenario });
  }
  await page.context().addCookies([
    {
      name: 'pf_session',
      value: 'controlled-e2e-session',
      domain: '127.0.0.1',
      path: '/',
    },
    {
      name: 'pf_e2e_scenario',
      value: scenario,
      domain: '127.0.0.1',
      path: '/',
    },
  ]);
}

async function readFixtureState(page: Page, query: string) {
  const response = await page.request.get(`${apiOrigin}/__e2e/state?${query}`);
  expect(response.ok()).toBe(true);
  return (await response.json()) as FixtureState;
}

async function expectInvitationFailure(page: Page, token: string, status: number, code: string, message: string) {
  const path = `${apiPrefix}/organizations/invitations/${token}/accept`;
  await page.goto(`/invitations/${token}`);

  const join = page.getByRole('button', { name: 'เข้าร่วม' });
  await expect(join).toBeEnabled();
  const responsePromise = page.waitForResponse(
    (response) => response.request().method() === 'POST' && new URL(response.url()).pathname === path,
  );
  await join.click();
  const response = await responsePromise;
  expect(response.status()).toBe(status);
  expect(await response.json()).toMatchObject({ error: { code, message } });
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

test('shared Agent roster is available across Organizations without exposing server-only metadata', async ({
  page,
}) => {
  await signedIn(page);
  const browserErrors: string[] = [];
  const resourceErrors: string[] = [];
  page.on('pageerror', (error) => browserErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') browserErrors.push(message.text());
  });
  page.on('response', (response) => {
    if (response.status() >= 400) resourceErrors.push(`${response.status()} ${response.url()}`);
  });
  const rosterRequests: string[] = [];
  page.on('request', (request) => {
    if (request.method() === 'GET' && request.url().includes('/api/v1/hermes/agents')) {
      rosterRequests.push(new URL(request.url()).pathname);
    }
  });

  await page.goto('/acme');
  const agentsNavLink = page.getByRole('link', { name: 'Agents', exact: true });
  await expect(agentsNavLink).toBeVisible();
  await agentsNavLink.click();
  await expect(page).toHaveURL(/\/acme\/agents$/);
  await expect(page.getByRole('heading', { name: 'Shared Local Agents' })).toBeVisible();
  await expect(page.getByText('Shared Coder')).toBeVisible();
  await expect(page.getByText('Offline Agent')).toBeVisible();
  await expect(page.getByText('must-not-reach-browser')).toHaveCount(0);
  await expect(page.getByText('C:\\Users\\freew')).toHaveCount(0);

  await page.getByRole('button', { name: 'เลือกใช้ Agent' }).click();
  await expect(page.getByText('เลือก Shared Coder สำหรับการใช้งานในขั้นตอนถัดไป')).toBeVisible();

  await page.goto('/beta/agents');
  await expect(page.getByText('Shared Coder')).toBeVisible();
  await expect.poll(() => rosterRequests.length).toBe(2);
  expect(rosterRequests).toEqual(['/api/v1/hermes/agents', '/api/v1/hermes/agents']);
  expect(resourceErrors).toEqual([]);
  expect(browserErrors).toEqual([]);
});

test('Platform Admin can create a shared Agent through the validated Hermes configuration flow', async ({ page }) => {
  await signedIn(page);
  await page.goto('/acme/agents');
  await expect(page.getByRole('heading', { name: 'Shared Local Agents' })).toBeVisible();

  await page.getByRole('button', { name: 'สร้าง Agent' }).click();
  await expect(page.getByText('สร้าง Shared Local Agent')).toBeVisible();
  await page.getByLabel('Handle').fill('workflow-agent');
  await page.getByLabel('ชื่อที่แสดง').fill('Workflow Agent');
  await page.getByLabel('บทบาท').fill('Workflow builder');
  await page.getByLabel('คำอธิบาย').fill('Created through the shared Agent administration flow');
  await page.getByLabel('Personality').fill('You are a careful workflow implementation assistant.');
  await page.locator('input[type="file"]').setInputFiles({
    name: 'workflow-agent.png',
    mimeType: 'image/png',
    buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  });

  const requestPromise = page.waitForRequest(
    (request) => request.method() === 'POST' && new URL(request.url()).pathname === '/api/v1/hermes/agents',
  );
  await page.getByRole('button', { name: 'สร้างและตรวจสอบ Agent' }).click();
  const request = await requestPromise;
  const requestBody = request.postDataJSON() as Record<string, unknown>;
  expect(requestBody).toMatchObject({
    handle: 'workflow-agent',
    displayName: 'Workflow Agent',
    provider: 'openai-codex',
    model: 'gpt-5.6-luna',
    skills: [],
    toolsets: [],
  });
  expect(requestBody.avatar).toMatch(/^data:image\/png;base64,/);
  expect(JSON.stringify(requestBody)).not.toContain('token');
  expect(JSON.stringify(requestBody)).not.toContain('C:\\Users\\freew');

  await expect(page.getByText('Workflow Agent')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Workflow Agent')).toBeVisible();
  await expect(page.locator('[data-agent-handle="workflow-agent"]')).toHaveAttribute('data-readiness', 'ready');
  await expect(page.locator('[data-agent-handle="workflow-agent"]')).toHaveAttribute('data-has-avatar', 'true');
});

test('regular authenticated Users can discover shared Agents without configuration controls', async ({ page }) => {
  await signedIn(page, 'regular-user');
  await page.goto('/acme/agents');
  await expect(page.getByText('Shared Coder')).toBeVisible();
  await expect(page.getByRole('button', { name: 'สร้าง Agent' })).toHaveCount(0);
  await expect(page.getByText(/การตั้งค่าจำกัดเฉพาะ Platform Admin/)).toBeVisible();
});

test('project creation and archive lifecycle have no agent or repository side effects', async ({ page }) => {
  await signedIn(page, 'project-side-effects');

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
  await expect(page.getByText('Agent-ready project').first()).toBeVisible();
  await dismissNotification(page, 'สร้างโปรเจกต์แล้ว');

  await page.getByRole('button', { name: 'การดำเนินการ: Agent-ready project' }).click();
  await page.getByRole('menuitem', { name: 'เก็บโปรเจกต์' }).click();
  await expect(page.getByRole('heading', { name: 'ยืนยันการเก็บโปรเจกต์' })).toBeVisible();
  await page.getByRole('button', { name: 'เก็บโปรเจกต์' }).last().click();
  await expect(page.getByText('เก็บโปรเจกต์แล้ว')).toBeVisible();
  await dismissNotification(page, 'เก็บโปรเจกต์แล้ว');

  await page.getByRole('button', { name: 'การดำเนินการ: Agent-ready project' }).click();
  await page.getByRole('menuitem', { name: 'กู้คืนโปรเจกต์' }).click();
  await expect(page.getByText('กู้คืนโปรเจกต์แล้ว')).toBeVisible();

  await page.goto('/acme/audit-logs');
  await expect(page.getByText('สร้าง Project')).toBeVisible();
  await expect(page.getByText('เก็บ Project')).toBeVisible();
  await expect(page.getByText('กู้คืน Project')).toBeVisible();
  await expect(page.getByText('Agent-ready project').first()).toBeVisible();

  const fixtureState = await readFixtureState(page, 'scenario=project-side-effects');
  expect(fixtureState.auditRecords.map((record) => record.action)).toEqual([
    'PROJECT_CREATED',
    'PROJECT_ARCHIVED',
    'PROJECT_RESTORED',
  ]);

  const diagnostics = await page.request.get(`${apiOrigin}/__e2e/requests?scenario=project-side-effects`);
  expect(diagnostics.ok()).toBe(true);
  const apiRequests = (await diagnostics.json()) as Array<{ method: string; path: string; scenario: string }>;
  const sideEffectRequests = apiRequests.filter((request) =>
    /\/(?:clone|clones|sandbox|hermes|ai|issues|pulls|pull-requests)(?:\/|$)/i.test(request.path),
  );
  expect(sideEffectRequests).toEqual([]);
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

test('cross-organization project access is denied from resource ownership', async ({ page }) => {
  await signedIn(page);
  const response = await page.request.get(
    `${apiOrigin}${apiPrefix}/organizations/${betaOrganizationId}/projects/${demoProject.id}`,
  );
  expect(response.status()).toBe(403);
  expect(await response.json()).toMatchObject({
    error: { code: 'FORBIDDEN', message: 'Project access is forbidden' },
  });
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
  await signedIn(page, 'invitation-resend');

  await page.goto('/acme/settings/members');
  await page.getByRole('tab', { name: 'คำเชิญที่รอดำเนินการ' }).click();
  await expect(page.getByText(pendingInvitation.email)).toBeVisible();
  const responsePromise = page.waitForResponse(
    (response) => response.request().method() === 'POST' && new URL(response.url()).pathname === invitationsPath,
  );
  await page.getByRole('button', { name: 'ส่งอีกครั้ง' }).click();
  const response = await responsePromise;
  expect(response.request().postDataJSON()).toEqual({
    email: pendingInvitation.email,
    roleId: pendingInvitation.role.id,
  });
  expect(await response.json()).toMatchObject({
    data: {
      token: 'rotated-invitation-resend-token',
      invitation: { createdAt: '2026-01-03T00:00:00.000Z', expiresAt: '2026-01-10T00:00:00.000Z' },
    },
  });
  await expect(page.getByText('หมุนเวียนคำเชิญและส่งอีกครั้งแล้ว')).toBeVisible();

  const oldTokenResponse = await page.request.post(
    `${apiOrigin}${apiPrefix}/organizations/invitations/initial-invitation-resend-token/accept`,
  );
  expect(oldTokenResponse.status()).toBe(403);

  await page.goto('/invitations/rotated-invitation-resend-token');
  const acceptanceResponsePromise = page.waitForResponse(
    (candidate) =>
      candidate.request().method() === 'POST' &&
      new URL(candidate.url()).pathname ===
        `${apiPrefix}/organizations/invitations/rotated-invitation-resend-token/accept`,
  );
  await page.getByRole('button', { name: 'เข้าร่วม' }).click();
  expect((await acceptanceResponsePromise).status()).toBe(200);
  await expect(page).toHaveURL(/\/acme$/);

  const fixtureState = await readFixtureState(page, 'scenario=invitation-resend');
  expect(fixtureState.invitation?.status).toBe('ACCEPTED');
  expect(fixtureState.previousTokens).toContain('initial-invitation-resend-token');
  expect(fixtureState.activeToken).toBe('rotated-invitation-resend-token');
  expect(fixtureState.membership?.status).toBe('ACTIVE');
});

test('cancelling a pending invitation removes it from the Organization UI', async ({ page }) => {
  await signedIn(page, 'invitation-cancel');
  page.on('dialog', (dialog) => dialog.accept());

  await page.goto('/acme/settings/members');
  await page.getByRole('tab', { name: 'คำเชิญที่รอดำเนินการ' }).click();
  await expect(page.getByText(pendingInvitation.email)).toBeVisible();
  await page.getByRole('button', { name: 'ยกเลิกคำเชิญ' }).click();

  await expect(page.getByText('ยกเลิกคำเชิญแล้ว')).toBeVisible();
  await expect(page.getByText('ไม่มีคำเชิญที่รอดำเนินการ')).toBeVisible();

  const fixtureState = await readFixtureState(page, 'scenario=invitation-cancel');
  expect(fixtureState.invitation?.status).toBe('CANCELLED');
  const acceptanceResponse = await page.request.post(
    `${apiOrigin}${apiPrefix}/organizations/invitations/initial-invitation-cancel-token/accept`,
  );
  expect(acceptanceResponse.status()).toBe(404);
});

test('an accepted invitation cannot be used a second time', async ({ page }) => {
  await signedIn(page, 'invitation-single-use');
  const token = 'controlled-single-use-invitation';
  const path = `${apiPrefix}/organizations/invitations/${token}/accept`;

  await page.goto(`/invitations/${token}`);
  const firstResponsePromise = page.waitForResponse(
    (response) => response.request().method() === 'POST' && new URL(response.url()).pathname === path,
  );
  await page.getByRole('button', { name: 'เข้าร่วม' }).click();
  expect((await firstResponsePromise).status()).toBe(200);
  await expect(page).toHaveURL(/\/acme$/);
  const fixtureState = await readFixtureState(page, 'scenario=invitation-single-use');
  expect(fixtureState.invitation?.status).toBe('ACCEPTED');
  expect(fixtureState.membership?.status).toBe('ACTIVE');

  await page.goto(`/invitations/${token}`);
  const secondResponsePromise = page.waitForResponse(
    (response) => response.request().method() === 'POST' && new URL(response.url()).pathname === path,
  );
  await page.getByRole('button', { name: 'เข้าร่วม' }).click();
  const secondResponse = await secondResponsePromise;
  expect(secondResponse.status()).toBe(403);
  expect(await secondResponse.json()).toMatchObject({
    error: { code: 'FORBIDDEN', message: 'คำเชิญนี้ไม่สามารถใช้ได้' },
  });
  await expect(page.getByText('คำเชิญนี้ไม่สามารถใช้ได้')).toBeVisible();
});
