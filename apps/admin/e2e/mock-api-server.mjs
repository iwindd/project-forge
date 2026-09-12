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
    permissions: ['organization.manage'],
    isOwner: false,
    legacyRole: 'ADMIN',
  },
};
const users = [
  {
    id: 'user-1',
    name: 'Scoped Admin',
    email: 'admin@example.test',
    role: 'ADMIN',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'user-2',
    name: 'Scoped Editor',
    email: 'editor@example.test',
    role: 'EDITOR',
    isActive: true,
    createdAt: '2026-01-02T00:00:00.000Z',
  },
];
let controlledInvitationAccepted = false;
const envelope = (data, meta) => JSON.stringify({ data, ...(meta ? { meta } : {}) });
const send = (req, res, status, body) => {
  res.writeHead(status, {
    'content-type': 'application/json',
    'access-control-allow-origin': req.headers.origin ?? '*',
    'access-control-allow-credentials': 'true',
    'access-control-allow-methods': 'GET,POST,PATCH,OPTIONS',
    'access-control-allow-headers': 'content-type',
  });
  res.end(body);
};

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') return send(req, res, 204, '');
  const path = new URL(req.url, 'http://127.0.0.1').pathname.replace('/api/v1/', '');
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
  if (path === 'organizations') return send(req, res, 200, envelope([organization]));
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
    return send(req, res, 200, envelope(users, { total: users.length }));
  if (path === 'audit-logs/organization/00000000-0000-0000-0000-000000000001')
    return send(req, res, 200, envelope([], { total: 0, page: 1, pageSize: 25, totalPages: 0 }));
  if (path === 'organizations/invitations/controlled-no-invitation/accept')
    return send(
      req,
      res,
      403,
      JSON.stringify({
        error: {
          code: 'FORBIDDEN',
          message: 'ผู้ใช้ยังไม่ได้รับคำเชิญเข้า Organization นี้',
          details: {},
          requestId: 'e2e-no-invitation',
        },
      }),
    );
  if (path === 'organizations/invitations/controlled-one-time-token/accept') {
    if (controlledInvitationAccepted)
      return send(
        req,
        res,
        403,
        JSON.stringify({
          error: {
            code: 'FORBIDDEN',
            message: 'คำเชิญนี้ไม่สามารถใช้ได้',
            details: {},
            requestId: 'e2e-one-time-used',
          },
        }),
      );
    controlledInvitationAccepted = true;
    return send(req, res, 200, envelope({ organization }));
  }
  if (path.startsWith('organizations/invitations/') && path.endsWith('/accept'))
    return send(
      req,
      res,
      403,
      JSON.stringify({ error: { code: 'FORBIDDEN', message: 'คำเชิญนี้ไม่สามารถใช้ได้', details: {}, requestId: 'e2e' } }),
    );
  return send(
    req,
    res,
    404,
    JSON.stringify({ error: { code: 'NOT_FOUND', message: 'not found', details: {}, requestId: 'e2e' } }),
  );
});
server.listen(5052, '127.0.0.1', () => process.stdout.write('mock api listening\n'));
