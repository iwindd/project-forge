import http from 'node:http';

const profile = {
  id: 'profile-1',
  displayName: 'Ada Lovelace',
  avatarUrl: null,
  bio: 'Analytical engine pioneer',
  timezone: 'UTC',
  platformRole: 'ADMIN',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};
const organization = {
  id: '00000000-0000-0000-0000-000000000001',
  slug: 'acme',
  name: 'Acme Organization',
  type: 'SHARED',
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  role: {
    id: '00000000-0000-0000-0000-000000000002',
    name: 'Admin',
    permissions: ['organization.manage', 'project.manage'],
    isOwner: false,
    code: 'ADMIN',
  },
};
const secondOrganization = {
  id: '00000000-0000-0000-0000-000000000002',
  slug: 'beta',
  name: 'Beta Organization',
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
const members = [
  {
    id: '00000000-0000-0000-0000-000000000011',
    membershipId: '00000000-0000-0000-0000-000000000111',
    name: 'Scoped Admin',
    email: 'admin@example.test',
    role: organization.role,
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
const projects = [
  {
    id: '00000000-0000-0000-0000-000000000021',
    organizationId: organization.id,
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
  },
];
const pendingInvitation = {
  id: '00000000-0000-0000-0000-000000000031',
  organizationId: organization.id,
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
const invitationScenarios = new Map();
const acceptedInvitationTokens = new Set();
const requestLog = [];
const auditRecord = {
  id: '00000000-0000-0000-0000-000000000041',
  createdAt: '2026-01-03T00:00:00.000Z',
  action: 'PROJECT_CREATED',
  resourceType: 'PROJECT',
  resourceId: projects[0].id,
  actorRole: 'ADMIN',
  actor: { id: 'user-1', name: 'Ada Lovelace', email: 'ada@example.test' },
  target: null,
  reason: 'Acceptance fixture',
  hasBefore: false,
  hasAfter: true,
};
let nextProjectId = 22;
const envelope = (data, meta) => JSON.stringify({ data, ...(meta ? { meta } : {}) });
const errorEnvelope = (code, message, requestId) =>
  JSON.stringify({ error: { code, message, details: {}, requestId } });
const readJson = (req, callback) => {
  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
  });
  req.on('end', () => callback(body ? JSON.parse(body) : {}));
};
const requestScenario = (req) =>
  typeof req.headers['x-e2e-scenario'] === 'string' ? req.headers['x-e2e-scenario'] : 'default';
const invitationScenario = (scenario) => {
  if (!invitationScenarios.has(scenario)) {
    invitationScenarios.set(scenario, {
      invitation: { ...pendingInvitation },
      token: `initial-${scenario}-token`,
    });
  }
  return invitationScenarios.get(scenario);
};
const send = (req, res, status, body) => {
  res.writeHead(status, {
    'content-type': 'application/json',
    'access-control-allow-origin': req.headers.origin ?? '*',
    'access-control-allow-credentials': 'true',
    'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'access-control-allow-headers': 'content-type,x-e2e-scenario',
  });
  res.end(body);
};

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') return send(req, res, 204, '');
  const requestUrl = new URL(req.url, 'http://127.0.0.1');
  const path = requestUrl.pathname.replace('/api/v1/', '');
  const scenario = requestScenario(req);
  if (requestUrl.pathname === '/__e2e/requests' && req.method === 'GET') {
    const requestedScenario = requestUrl.searchParams.get('scenario') ?? scenario;
    return send(req, res, 200, JSON.stringify(requestLog.filter((request) => request.scenario === requestedScenario)));
  }
  requestLog.push({ scenario, method: req.method, path: requestUrl.pathname });
  if (path === 'auth/me')
    return send(
      req,
      res,
      200,
      envelope({
        user: {
          id: 'user-1',
          githubUserId: 'github-1',
          githubLogin: 'ada',
          name: 'Ada Lovelace',
          avatarUrl: null,
          role: 'ADMIN',
          accessStatus: 'APPROVED',
          isActive: true,
          createdAt: profile.createdAt,
          updatedAt: profile.updatedAt,
        },
        profile: null,
      }),
    );
  if (path === 'organizations') return send(req, res, 200, envelope([organization, secondOrganization]));
  if (path === 'profile' && req.method === 'GET') return send(req, res, 200, envelope({ profile, connections: [] }));
  if (path === 'profile' && req.method === 'PATCH') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    return req.on('end', () => {
      const input = JSON.parse(body);
      Object.assign(profile, {
        displayName: input.displayName ?? profile.displayName,
        bio: input.bio ?? profile.bio,
        timezone: input.timezone ?? profile.timezone,
        updatedAt: '2026-01-03T00:00:00.000Z',
      });
      send(
        req,
        res,
        200,
        envelope({
          profile: {
            id: profile.id,
            displayName: profile.displayName,
            avatarUrl: profile.avatarUrl,
            bio: profile.bio,
            timezone: profile.timezone,
            updatedAt: profile.updatedAt,
          },
        }),
      );
    });
  }
  if (path === 'organizations/00000000-0000-0000-0000-000000000001/members')
    return send(req, res, 200, envelope(members, { page: 1, pageSize: 100, total: members.length, totalPages: 1 }));
  if (path === 'organizations/00000000-0000-0000-0000-000000000001/roles')
    return send(
      req,
      res,
      200,
      envelope(
        [
          {
            ...organization.role,
            memberCount: members.length,
            invitationCount: 0,
          },
        ],
        { availablePermissions: [{ key: 'organization.manage' }, { key: 'project.manage' }] },
      ),
    );
  if (path === 'organizations/00000000-0000-0000-0000-000000000001/projects' && req.method === 'GET')
    return send(req, res, 200, envelope(projects.filter((project) => project.organizationId === organization.id)));
  if (path === 'organizations/00000000-0000-0000-0000-000000000002/projects' && req.method === 'GET') {
    if (scenario === 'project-access-denied')
      return send(req, res, 403, errorEnvelope('FORBIDDEN', 'Project access is forbidden', 'e2e-project-forbidden'));
    return send(req, res, 200, envelope([]));
  }
  if (path === 'organizations/00000000-0000-0000-0000-000000000001/projects' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    return req.on('end', () => {
      const input = body ? JSON.parse(body) : {};
      const repository = new URL(input.githubUrl);
      const [githubOwner, githubRepo] = repository.pathname.split('/').filter(Boolean);
      const now = new Date().toISOString();
      const project = {
        id: `00000000-0000-0000-0000-${String(nextProjectId++).padStart(12, '0')}`,
        organizationId: organization.id,
        name: input.name || githubRepo,
        githubUrl: input.githubUrl,
        githubOwner,
        githubRepo,
        sourceBranch: input.sourceBranch || 'main',
        targetBranch: input.targetBranch || 'main',
        nodeVersion: input.nodeVersion || null,
        environmentMetadata: input.environmentMetadata || null,
        status: 'ACTIVE',
        createdAt: now,
        updatedAt: now,
        archivedAt: null,
      };
      projects.push(project);
      send(req, res, 200, envelope({ project }));
    });
  }
  const projectAction = path.match(
    /^organizations\/00000000-0000-0000-0000-000000000001\/projects\/([^/]+)\/(archive|restore)$/,
  );
  if (projectAction && req.method === 'POST') {
    const project = projects.find((candidate) => candidate.id === projectAction[1]);
    if (!project)
      return send(
        req,
        res,
        404,
        JSON.stringify({
          error: { code: 'NOT_FOUND', message: 'Project was not found', details: {}, requestId: 'e2e' },
        }),
      );
    project.status = projectAction[2] === 'archive' ? 'ARCHIVED' : 'ACTIVE';
    project.archivedAt = project.status === 'ARCHIVED' ? new Date().toISOString() : null;
    project.updatedAt = new Date().toISOString();
    return send(req, res, 200, envelope({ project }));
  }
  const projectResource = path.match(/^organizations\/00000000-0000-0000-0000-000000000001\/projects\/([^/]+)$/);
  if (projectResource && req.method === 'GET') {
    const project = projects.find((candidate) => candidate.id === projectResource[1]);
    if (!project)
      return send(
        req,
        res,
        404,
        JSON.stringify({
          error: { code: 'NOT_FOUND', message: 'Project was not found', details: {}, requestId: 'e2e' },
        }),
      );
    return send(req, res, 200, envelope({ project }));
  }
  if (path === 'audit-logs/organization/00000000-0000-0000-0000-000000000001') {
    const records = scenario === 'audit-record' ? [auditRecord] : [];
    return send(
      req,
      res,
      200,
      envelope(records, { total: records.length, page: 1, pageSize: 25, totalPages: records.length ? 1 : 0 }),
    );
  }
  const invitationCollection = path.match(/^organizations\/00000000-0000-0000-0000-000000000001\/invitations$/);
  if (invitationCollection && req.method === 'GET') {
    const state = scenario === 'default' ? undefined : invitationScenario(scenario);
    return send(req, res, 200, envelope(state?.invitation ? [state.invitation] : []));
  }
  if (invitationCollection && req.method === 'POST') {
    return readJson(req, (input) => {
      const state = invitationScenario(scenario);
      const previous = state.invitation ?? pendingInvitation;
      state.invitation = {
        ...previous,
        email: input.email ?? previous.email,
        role: { ...previous.role, id: input.roleId ?? previous.role.id },
        createdAt: '2026-01-03T00:00:00.000Z',
        expiresAt: '2026-01-10T00:00:00.000Z',
        status: 'PENDING',
      };
      state.token = `rotated-${scenario}-token`;
      send(req, res, 200, envelope({ invitation: state.invitation, token: state.token }));
    });
  }
  const invitationResource = path.match(/^organizations\/00000000-0000-0000-0000-000000000001\/invitations\/([^/]+)$/);
  if (invitationResource && req.method === 'DELETE') {
    const state = invitationScenarios.get(scenario);
    if (!state?.invitation || state.invitation.id !== invitationResource[1])
      return send(req, res, 404, errorEnvelope('NOT_FOUND', 'Invitation was not found', 'e2e-invitation-not-found'));
    state.invitation = null;
    return send(req, res, 200, envelope(null));
  }
  const invitationAccept = path.match(/^organizations\/invitations\/([^/]+)\/accept$/);
  if (invitationAccept && req.method === 'POST') {
    const token = decodeURIComponent(invitationAccept[1]);
    if (token === 'controlled-no-invitation')
      return send(req, res, 403, errorEnvelope('FORBIDDEN', 'ผู้ใช้ยังไม่ได้รับคำเชิญเข้า Organization นี้', 'e2e-no-invitation'));
    if (token === 'controlled-unverified-email')
      return send(
        req,
        res,
        403,
        errorEnvelope(
          'FORBIDDEN',
          'This invitation requires a matching verified GitHub email address',
          'e2e-controlled-unverified-email',
        ),
      );
    if (token === 'controlled-expired-invitation')
      return send(
        req,
        res,
        409,
        errorEnvelope('CONFLICT', 'Invitation has expired', 'e2e-controlled-expired-invitation'),
      );
    if (token === 'controlled-cancelled-invitation')
      return send(
        req,
        res,
        404,
        errorEnvelope(
          'NOT_FOUND',
          'Invitation was not found or has already been used',
          'e2e-controlled-cancelled-invitation',
        ),
      );
    if (token === 'controlled-one-time-token' || token === 'controlled-single-use-invitation') {
      if (acceptedInvitationTokens.has(token))
        return send(req, res, 403, errorEnvelope('FORBIDDEN', 'คำเชิญนี้ไม่สามารถใช้ได้', 'e2e-one-time-used'));
      acceptedInvitationTokens.add(token);
      return send(req, res, 200, envelope({ organization }));
    }
    return send(req, res, 403, errorEnvelope('FORBIDDEN', 'คำเชิญนี้ไม่สามารถใช้ได้', 'e2e'));
  }
  return send(
    req,
    res,
    404,
    JSON.stringify({ error: { code: 'NOT_FOUND', message: 'not found', details: {}, requestId: 'e2e' } }),
  );
});
server.listen(5052, '127.0.0.1', () => process.stdout.write('mock api listening\n'));
