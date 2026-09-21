import http from 'node:http';
import crypto from 'node:crypto';

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
const invitationTokens = new Map();
const requestLog = [];
const auditRecordsByScenario = new Map();
let nextProjectId = 22;
let sharedAgent = null;
const hermesSessionsByScenario = new Map();
const hermesCreateAttemptsByScenario = new Map();
const hermesSendAttemptsByScenario = new Map();
let nextHermesSessionId = 1;
const envelope = (data, meta) => JSON.stringify({ data, ...(meta ? { meta } : {}) });
const errorEnvelope = (code, message, requestId) =>
  JSON.stringify({ error: { code, message, details: {}, requestId } });
const cloneInvitation = (overrides = {}) => ({
  ...pendingInvitation,
  role: { ...pendingInvitation.role },
  ...overrides,
});
const createInvitationState = ({ scenario, token, invitation, requiresVerifiedEmail = false }) => ({
  scenario,
  invitation: cloneInvitation(invitation),
  token,
  previousTokens: [],
  membership: null,
  requiresVerifiedEmail,
});
const readJson = (req, callback) => {
  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
  });
  req.on('end', () => callback(body ? JSON.parse(body) : {}));
};
const parseScenarioCookie = (cookieHeader) => {
  const match = cookieHeader?.match(/(?:^|;\s*)pf_e2e_scenario=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : undefined;
};
const requestScenario = (req) =>
  (typeof req.headers['x-e2e-scenario'] === 'string' && req.headers['x-e2e-scenario']) ||
  parseScenarioCookie(req.headers.cookie) ||
  'default';
const invitationScenario = (scenario) => {
  if (!invitationScenarios.has(scenario)) {
    const token = `initial-${scenario}-token`;
    const state = createInvitationState({ scenario, token });
    invitationScenarios.set(scenario, state);
    invitationTokens.set(token, state);
  }
  return invitationScenarios.get(scenario);
};
const tokenInvitationState = (token, options = {}) => {
  if (!invitationTokens.has(token)) {
    invitationTokens.set(token, createInvitationState({ scenario: `token:${token}`, token, ...options }));
  }
  return invitationTokens.get(token);
};
const auditRecordsFor = (scenario) => {
  if (!auditRecordsByScenario.has(scenario)) auditRecordsByScenario.set(scenario, []);
  return auditRecordsByScenario.get(scenario);
};
const recordProjectAudit = (scenario, action, project) => {
  const records = auditRecordsFor(scenario);
  records.push({
    id: `e2e-audit-${scenario}-${records.length + 1}`,
    createdAt: new Date().toISOString(),
    action,
    resourceType: 'PROJECT',
    resourceId: project.id,
    actorRole: 'ADMIN',
    actor: { id: 'user-1', name: 'Ada Lovelace', email: 'ada@example.test' },
    target: null,
    reason: project.name,
    hasBefore: action !== 'PROJECT_CREATED',
    hasAfter: true,
  });
};
const invitationMembership = (state) => ({
  id: `00000000-0000-0000-0000-${String(40 + state.previousTokens.length).padStart(12, '0')}`,
  userId: 'user-1',
  organizationId: organization.id,
  roleId: state.invitation.role.id,
  status: 'ACTIVE',
});
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

const hermesSessionsFor = (scenario) => {
  if (!hermesSessionsByScenario.has(scenario)) {
    const seededSessions =
      scenario === 'chat-sidebar'
        ? [
            {
              id: '00000000-0000-4000-8000-000000000101',
              agentHandle: 'shared-coder',
              title: 'Coding notes',
              preview: 'Shared Coder · refactor',
              messages: [],
              startedAt: '2026-09-21T10:02:00.000Z',
              active: false,
              closedAt: null,
              inflight: null,
            },
            {
              id: '00000000-0000-4000-8000-000000000102',
              agentHandle: 'lyla',
              title: 'Friendly greeting',
              preview: 'lyla · Hi LYla',
              messages: [],
              startedAt: '2026-09-21T10:03:00.000Z',
              active: true,
              closedAt: null,
              inflight: null,
            },
          ]
        : [];
    hermesSessionsByScenario.set(scenario, seededSessions);
  }
  return hermesSessionsByScenario.get(scenario);
};
const hermesSnapshot = (session) => ({
  sessionId: session.id,
  agentHandle: session.agentHandle,
  title: session.title,
  messages: session.messages,
  messageCount: session.messages.length,
  status: session.inflight ? 'streaming' : 'idle',
  inflight: session.inflight,
});
const hermesSummary = (session) => ({
  id: session.id,
  agentHandle: session.agentHandle,
  title: session.title,
  preview: session.preview,
  messageCount: session.messages.length,
  startedAt: session.startedAt,
  active: session.active,
  closedAt: session.closedAt,
});
const createHermesSession = (scenario, agentHandle) => {
  const id = `00000000-0000-4000-8000-${String(nextHermesSessionId++).padStart(12, '0')}`;
  const session = {
    id,
    agentHandle,
    title: '',
    preview: '',
    messages: [],
    startedAt: new Date().toISOString(),
    active: true,
    closedAt: null,
    inflight: null,
  };
  hermesSessionsFor(scenario).unshift(session);
  return session;
};

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') return send(req, res, 204, '');
  const requestUrl = new URL(req.url, 'http://127.0.0.1');
  const path = requestUrl.pathname.replace('/api/v1/', '');
  const scenario = requestScenario(req);
  if (requestUrl.pathname === '/__e2e/requests' && req.method === 'GET') {
    const requestedScenario = requestUrl.searchParams.get('scenario') ?? scenario;
    const records =
      requestedScenario === 'all' ? requestLog : requestLog.filter((request) => request.scenario === requestedScenario);
    return send(req, res, 200, JSON.stringify(records));
  }
  if (requestUrl.pathname === '/__e2e/state' && req.method === 'GET') {
    const requestedScenario = requestUrl.searchParams.get('scenario') ?? scenario;
    const invitation = invitationScenarios.get(requestedScenario);
    return send(
      req,
      res,
      200,
      JSON.stringify({
        invitation: invitation?.invitation ?? null,
        activeToken: invitation?.token ?? null,
        previousTokens: invitation?.previousTokens ?? [],
        membership: invitation?.membership ?? null,
        auditRecords: auditRecordsFor(requestedScenario),
      }),
    );
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
          role: scenario === 'regular-user' ? 'USER' : 'ADMIN',
          accessStatus: 'APPROVED',
          isActive: true,
          createdAt: profile.createdAt,
          updatedAt: profile.updatedAt,
        },
        profile: null,
      }),
    );
  if (path === 'hermes/sessions' && req.method === 'GET') {
    return send(req, res, 200, envelope({ sessions: hermesSessionsFor(scenario).map(hermesSummary) }));
  }
  if (path === 'hermes/sessions' && req.method === 'POST') {
    const attempts = (hermesCreateAttemptsByScenario.get(scenario) ?? 0) + 1;
    hermesCreateAttemptsByScenario.set(scenario, attempts);
    if (scenario === 'chat-create-retry' && attempts === 1) {
      return send(req, res, 503, errorEnvelope('SERVICE_UNAVAILABLE', 'Session service unavailable', 'e2e-create-retry'));
    }
    return readJson(req, (input) => {
      const session = createHermesSession(scenario, input.agentHandle ?? 'shared-coder');
      send(req, res, 200, envelope({ session: hermesSummary(session), snapshot: hermesSnapshot(session) }));
    });
  }
  const hermesSessionRoute = path.match(/^hermes\/sessions\/([^/]+)(?:\/(resume|close))?$/);
  if (hermesSessionRoute) {
    const session = hermesSessionsFor(scenario).find((candidate) => candidate.id === hermesSessionRoute[1]);
    if (!session) return send(req, res, 404, errorEnvelope('NOT_FOUND', 'Session was not found', 'e2e-session'));
    if (hermesSessionRoute[2] === 'resume' && req.method === 'POST') {
      session.active = true;
      session.closedAt = null;
      return send(req, res, 200, envelope({ session: hermesSummary(session), snapshot: hermesSnapshot(session) }));
    }
    if (hermesSessionRoute[2] === 'close' && req.method === 'POST') {
      session.active = false;
      session.closedAt = new Date().toISOString();
      return send(req, res, 200, envelope(null));
    }
    if (!hermesSessionRoute[2] && req.method === 'PATCH') {
      return readJson(req, (input) => {
        session.title = String(input.title ?? '').trim();
        send(req, res, 200, envelope(null));
      });
    }
  }
  if (path === 'hermes/agents/options' && req.method === 'GET')
    return send(
      req,
      res,
      200,
      envelope({
        models: [{ provider: 'openai-codex', name: 'OpenAI Codex', models: ['gpt-5.6-luna'] }],
        skills: ['skill-a'],
        toolsets: [{ name: 'coding', label: 'Coding', description: 'Coding tools', toolCount: 4 }],
        runtime: { state: 'ready', message: 'Hermes is ready', action: null },
        refreshedAt: '2026-09-20T00:00:00.000Z',
      }),
    );
  if (path === 'hermes/agents' && req.method === 'POST')
    return readJson(req, (input) => {
      sharedAgent = {
        handle: input.handle,
        displayName: input.displayName,
        description: input.description,
        isDefault: false,
        model: input.model,
        provider: input.provider,
        skillCount: input.skills?.length ?? 0,
        hasAvatar: Boolean(input.avatar),
        readiness: 'ready',
        message: 'Ready to use',
        action: 'use',
      };
      send(
        req,
        res,
        200,
        envelope({
          handle: input.handle,
          status: 'ready',
          agent: sharedAgent,
          sections: {
            identity: { status: 'applied' },
            role: { status: 'applied' },
            personality: { status: 'applied' },
            model: { status: 'applied' },
            skills: { status: 'applied' },
            toolsets: { status: 'applied' },
            avatar: { status: input.avatar ? 'applied' : 'skipped' },
            readback: { status: 'applied' },
            runtime: { status: 'applied' },
            audit: { status: 'applied' },
          },
          requiresConfirmation: false,
          refreshedAt: '2026-09-20T00:00:00.000Z',
        }),
      );
    });
  if (path === 'hermes/agents' && req.method === 'GET')
    return send(
      req,
      res,
      200,
      envelope({
        agents: [
          {
            handle: 'shared-coder',
            displayName: 'Shared Coder',
            description: 'Shared local coding Agent',
            isDefault: true,
            model: 'gpt-5.6-luna',
            provider: 'openai-codex',
            skillCount: 3,
            hasAvatar: false,
            readiness: 'ready',
            message: 'Ready to use',
            action: 'use',
          },
          {
            handle: 'offline-agent',
            displayName: 'Offline Agent',
            description: '',
            isDefault: false,
            model: 'gpt-5.6-luna',
            provider: 'openai-codex',
            skillCount: 0,
            hasAvatar: false,
            readiness: 'unavailable',
            message: 'The configured provider is not available on this local runtime',
            action: 'retry',
          },
          ...(scenario === 'chat-sidebar'
            ? [
                {
                  handle: 'lyla',
                  displayName: 'lyla',
                  description: 'Shared local conversation Agent',
                  isDefault: false,
                  model: 'gpt-5.6-luna',
                  provider: 'openai-codex',
                  skillCount: 2,
                  hasAvatar: false,
                  readiness: 'ready',
                  message: 'Ready to use',
                  action: 'use',
                },
              ]
            : []),
          ...(sharedAgent ? [sharedAgent] : []),
        ],
        runtime: { state: 'ready', message: 'Hermes is ready', action: null },
        permissions: { canConfigure: scenario !== 'regular-user' },
        refreshedAt: '2026-09-20T00:00:00.000Z',
      }),
    );
  if (path === 'hermes/runtime' && req.method === 'GET')
    return send(
      req,
      res,
      200,
      envelope({
        state: 'ready',
        endpoint: { host: '127.0.0.1', port: 9119, path: '/api/ws', managed: true },
        version: '0.21.3',
        capabilities: ['gateway.ping'],
        backendEpoch: 'e2e-epoch',
        serverRequests: 'legacy',
        checkedAt: '2026-09-20T00:00:00.000Z',
        message: 'Hermes is ready',
        action: null,
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
  const rolesPath = path.match(/^organizations\/([^/]+)\/roles$/);
  if (rolesPath && req.method === 'GET' && [organization.id, secondOrganization.id].includes(rolesPath[1])) {
    const scopedOrganization = rolesPath[1] === secondOrganization.id ? secondOrganization : organization;
    return send(
      req,
      res,
      200,
      envelope(
        [
          {
            ...scopedOrganization.role,
            memberCount: members.length,
            invitationCount: 0,
          },
        ],
        { availablePermissions: [{ key: 'organization.manage' }, { key: 'project.manage' }] },
      ),
    );
  }
  if (path === 'organizations/00000000-0000-0000-0000-000000000001/projects' && req.method === 'GET')
    return send(req, res, 200, envelope(projects.filter((project) => project.organizationId === organization.id)));
  if (path === 'organizations/00000000-0000-0000-0000-000000000002/projects' && req.method === 'GET')
    return send(
      req,
      res,
      200,
      envelope(projects.filter((project) => project.organizationId === secondOrganization.id)),
    );
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
      recordProjectAudit(scenario, 'PROJECT_CREATED', project);
      send(req, res, 200, envelope({ project }));
    });
  }
  const projectAction = path.match(/^organizations\/([^/]+)\/projects\/([^/]+)\/(archive|restore)$/);
  if (projectAction && req.method === 'POST') {
    const project = projects.find((candidate) => candidate.id === projectAction[2]);
    if (!project) return send(req, res, 404, errorEnvelope('NOT_FOUND', 'Project was not found', 'e2e'));
    if (project.organizationId !== projectAction[1])
      return send(req, res, 403, errorEnvelope('FORBIDDEN', 'Project access is forbidden', 'e2e-project-forbidden'));
    project.status = projectAction[3] === 'archive' ? 'ARCHIVED' : 'ACTIVE';
    project.archivedAt = project.status === 'ARCHIVED' ? new Date().toISOString() : null;
    project.updatedAt = new Date().toISOString();
    recordProjectAudit(scenario, project.status === 'ARCHIVED' ? 'PROJECT_ARCHIVED' : 'PROJECT_RESTORED', project);
    return send(req, res, 200, envelope({ project }));
  }
  const projectResource = path.match(/^organizations\/([^/]+)\/projects\/([^/]+)$/);
  if (projectResource && req.method === 'GET') {
    const project = projects.find((candidate) => candidate.id === projectResource[2]);
    if (!project) return send(req, res, 404, errorEnvelope('NOT_FOUND', 'Project was not found', 'e2e'));
    if (project.organizationId !== projectResource[1])
      return send(req, res, 403, errorEnvelope('FORBIDDEN', 'Project access is forbidden', 'e2e-project-forbidden'));
    return send(req, res, 200, envelope({ project }));
  }
  if (path === 'audit-logs/organization/00000000-0000-0000-0000-000000000001') {
    const records = auditRecordsFor(scenario);
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
    const invitations = state?.invitation?.status === 'PENDING' ? [state.invitation] : [];
    return send(req, res, 200, envelope(invitations));
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
      state.previousTokens.push(state.token);
      state.token = `rotated-${scenario}-token`;
      invitationTokens.set(state.token, state);
      send(req, res, 200, envelope({ invitation: state.invitation, token: state.token }));
    });
  }
  const invitationResource = path.match(/^organizations\/00000000-0000-0000-0000-000000000001\/invitations\/([^/]+)$/);
  if (invitationResource && req.method === 'DELETE') {
    const state = invitationScenarios.get(scenario);
    if (!state?.invitation || state.invitation.id !== invitationResource[1])
      return send(req, res, 404, errorEnvelope('NOT_FOUND', 'Invitation was not found', 'e2e-invitation-not-found'));
    state.invitation = { ...state.invitation, status: 'CANCELLED' };
    return send(req, res, 200, envelope(null));
  }
  const invitationAccept = path.match(/^organizations\/invitations\/([^/]+)\/accept$/);
  if (invitationAccept && req.method === 'POST') {
    const token = decodeURIComponent(invitationAccept[1]);
    if (token === 'controlled-no-invitation')
      return send(req, res, 403, errorEnvelope('FORBIDDEN', 'ผู้ใช้ยังไม่ได้รับคำเชิญเข้า Organization นี้', 'e2e-no-invitation'));
    if (token === 'controlled-unverified-email') {
      tokenInvitationState(token, {
        invitation: { status: 'PENDING' },
        requiresVerifiedEmail: true,
      });
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
    }
    if (token === 'controlled-expired-invitation') {
      tokenInvitationState(token, { invitation: { status: 'EXPIRED' } });
      return send(
        req,
        res,
        409,
        errorEnvelope('CONFLICT', 'Invitation has expired', 'e2e-controlled-expired-invitation'),
      );
    }
    if (token === 'controlled-cancelled-invitation') {
      tokenInvitationState(token, { invitation: { status: 'CANCELLED' } });
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
    }
    const state =
      invitationTokens.get(token) ??
      (token === 'controlled-one-time-token' || token === 'controlled-single-use-invitation'
        ? tokenInvitationState(token, { scenario })
        : undefined);
    if (state) {
      if (scenario !== 'default' && !invitationScenarios.has(scenario)) invitationScenarios.set(scenario, state);
      if (state.invitation.status === 'EXPIRED')
        return send(req, res, 409, errorEnvelope('CONFLICT', 'Invitation has expired', 'e2e-expired'));
      if (state.invitation.status === 'CANCELLED')
        return send(
          req,
          res,
          404,
          errorEnvelope('NOT_FOUND', 'Invitation was not found or has already been used', 'e2e-cancelled'),
        );
      if (state.requiresVerifiedEmail)
        return send(
          req,
          res,
          403,
          errorEnvelope(
            'FORBIDDEN',
            'This invitation requires a matching verified GitHub email address',
            'e2e-unverified-email',
          ),
        );
      if (token !== state.token || state.invitation.status !== 'PENDING')
        return send(req, res, 403, errorEnvelope('FORBIDDEN', 'คำเชิญนี้ไม่สามารถใช้ได้', 'e2e-one-time-used'));
      state.invitation = {
        ...state.invitation,
        status: 'ACCEPTED',
        acceptedBy: 'user-1',
        acceptedAt: new Date().toISOString(),
      };
      state.membership = invitationMembership(state);
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

const websocketClients = new Set();
const sendWebSocketFrame = (socket, frame) => {
  const payload = Buffer.from(JSON.stringify(frame));
  let header;
  if (payload.length < 126) {
    header = Buffer.from([0x81, payload.length]);
  } else if (payload.length < 65_536) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(payload.length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(payload.length), 2);
  }
  socket.write(Buffer.concat([header, payload]));
};
const handleWebSocketFrame = (client, frame) => {
  if (frame.type === 'attach') {
    const session = hermesSessionsFor(client.scenario).find((candidate) => candidate.id === frame.sessionId);
    if (!session) return sendWebSocketFrame(client.socket, { type: 'error', code: 'SESSION_UNAVAILABLE' });
    if (client.scenario === 'chat-reconnect' && session.inflight) {
      const reply = `รับทราบหลังเชื่อมต่อใหม่ครับ: ${session.inflight.user}`;
      session.inflight = null;
      session.messages.push({ role: 'assistant', text: reply, timestamp: new Date().toISOString(), rowId: session.messages.length + 1 });
      session.preview = reply;
    }
    client.session = session;
    session.active = true;
    session.closedAt = null;
    return sendWebSocketFrame(client.socket, { type: 'snapshot', session: hermesSnapshot(session) });
  }
  if (frame.type !== 'message' || !client.session || frame.sessionId !== client.session.id) return;
  const session = client.session;
  const text = String(frame.text ?? '').trim();
  if (!text) return;
  const sendAttempts = (hermesSendAttemptsByScenario.get(client.scenario) ?? 0) + 1;
  hermesSendAttemptsByScenario.set(client.scenario, sendAttempts);
  if (client.scenario === 'chat-send-retry' && sendAttempts === 1) {
    return sendWebSocketFrame(client.socket, {
      type: 'error',
      code: 'MESSAGE_FAILED',
      sessionId: session.id,
    });
  }
  const timestamp = new Date().toISOString();
  session.messages.push({ role: 'user', text, timestamp, rowId: session.messages.length + 1 });
  session.title ||= text.slice(0, 40);
  session.inflight = { user: text, assistant: '', streaming: true, status: 'streaming' };
  sendWebSocketFrame(client.socket, {
    type: 'message.accepted',
    sessionId: session.id,
    clientMessageId: frame.clientMessageId ?? null,
    status: 'streaming',
  });
  sendWebSocketFrame(client.socket, { type: 'assistant.start', sessionId: session.id });
  if (client.scenario === 'chat-reconnect' && sendAttempts === 1) {
    setTimeout(() => client.socket.destroy(), 20);
    return;
  }
  const reply = `รับทราบครับ: ${text}`;
  const firstChunk = reply.slice(0, Math.ceil(reply.length / 2));
  const secondChunk = reply.slice(firstChunk.length);
  setTimeout(() => {
    if (!client.socket.destroyed) {
      session.inflight = { ...session.inflight, assistant: firstChunk };
      sendWebSocketFrame(client.socket, { type: 'assistant.delta', sessionId: session.id, text: firstChunk });
    }
  }, 10);
  setTimeout(() => {
    if (client.socket.destroyed) return;
    session.inflight = null;
    session.messages.push({ role: 'assistant', text: reply, timestamp: new Date().toISOString(), rowId: session.messages.length + 1 });
    session.preview = reply;
    sendWebSocketFrame(client.socket, { type: 'assistant.delta', sessionId: session.id, text: secondChunk });
    sendWebSocketFrame(client.socket, {
      type: 'assistant.complete',
      sessionId: session.id,
      text: reply,
      status: 'complete',
      partial: false,
    });
    sendWebSocketFrame(client.socket, { type: 'session.updated', sessionId: session.id, title: session.title });
  }, 40);
};
const consumeWebSocketFrames = (client, chunk) => {
  client.buffer = Buffer.concat([client.buffer, chunk]);
  while (client.buffer.length >= 2) {
    const first = client.buffer[0];
    const second = client.buffer[1];
    const opcode = first & 0x0f;
    const masked = (second & 0x80) !== 0;
    let length = second & 0x7f;
    let offset = 2;
    if (length === 126) {
      if (client.buffer.length < 4) return;
      length = client.buffer.readUInt16BE(2);
      offset = 4;
    } else if (length === 127) {
      if (client.buffer.length < 10) return;
      length = Number(client.buffer.readBigUInt64BE(2));
      offset = 10;
    }
    if (!masked || client.buffer.length < offset + 4 + length) return;
    const mask = client.buffer.subarray(offset, offset + 4);
    offset += 4;
    const payload = Buffer.alloc(length);
    for (let index = 0; index < length; index += 1) payload[index] = client.buffer[offset + index] ^ mask[index % 4];
    client.buffer = client.buffer.subarray(offset + length);
    if (opcode === 8) {
      client.socket.end();
      return;
    }
    if (opcode === 1) {
      try {
        handleWebSocketFrame(client, JSON.parse(payload.toString('utf8')));
      } catch {
        sendWebSocketFrame(client.socket, { type: 'error', code: 'INVALID_FRAME' });
      }
    }
  }
};
server.on('upgrade', (req, socket) => {
  const requestUrl = new URL(req.url, 'http://127.0.0.1');
  if (requestUrl.pathname !== '/api/v1/hermes/chat') return socket.destroy();
  const key = req.headers['sec-websocket-key'];
  if (typeof key !== 'string') return socket.destroy();
  const accept = crypto.createHash('sha1').update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`).digest('base64');
  socket.write(
    `HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`,
  );
  const client = { socket, scenario: requestScenario(req), session: null, buffer: Buffer.alloc(0) };
  websocketClients.add(client);
  sendWebSocketFrame(socket, { type: 'ready' });
  socket.on('data', (chunk) => consumeWebSocketFrames(client, chunk));
  socket.on('close', () => websocketClients.delete(client));
  socket.on('error', () => websocketClients.delete(client));
});
server.listen(5052, '127.0.0.1', () => process.stdout.write('mock api listening\n'));
