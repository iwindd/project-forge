import 'dotenv/config';
import { MikroORM } from '@mikro-orm/postgresql';
import config from '../../mikro-orm.config.js';

type Row = Record<string, unknown>;

const canonicalTables = [
  'users',
  'profiles',
  'connections',
  'organizations',
  'organization_roles',
  'organization_members',
  'organization_invitations',
  'sessions',
  'projects',
  'audit_logs',
  'user_security_logs',
  'hermes_sessions',
] as const;

const obsoleteTables = ['access_requests', 'oauth_accounts', 'project_members'] as const;

const obsoleteColumns = [
  ['organizations', 'owner_id'],
  ['projects', 'owner_id'],
  ['sessions', 'active_organization_id'],
  ['organization_roles', 'legacy_role'],
  ['organization_members', 'role'],
  ['organization_invitations', 'role'],
] as const;

const canonicalColumns = [
  ['organization_roles', 'code'],
  ['organization_members', 'role_id'],
  ['organization_invitations', 'email'],
  ['organization_invitations', 'role_id'],
  ['hermes_sessions', 'user_id'],
  ['hermes_sessions', 'agent_handle'],
  ['hermes_sessions', 'hermes_session_id'],
  ['hermes_sessions', 'closed_at'],
  ['hermes_sessions', 'created_at'],
  ['hermes_sessions', 'updated_at'],
] as const;

const foreignKeyConstraints = [
  'profiles_user_id_users_fk',
  'connections_user_id_users_fk',
  'sessions_user_id_users_fk',
  'organization_roles_organization_id_fk',
  'organization_members_organization_id_fk',
  'organization_members_user_id_fk',
  'organization_members_organization_role_fk',
  'organization_invitations_organization_id_fk',
  'organization_invitations_invited_by_fk',
  'organization_invitations_accepted_by_fk',
  'organization_invitations_organization_role_fk',
  'projects_organization_id_fk',
  'audit_logs_organization_id_fk',
  'audit_logs_actor_id_fk',
  'audit_logs_target_user_id_fk',
  'user_security_logs_organization_id_fk',
  'user_security_logs_user_id_fk',
  'hermes_sessions_user_id_fk',
] as const;

const uniqueConstraints = [
  'users_github_user_id_unique',
  'profiles_user_id_unique',
  'connections_provider_provider_account_id_unique',
  'connections_user_id_provider_unique',
  'organizations_slug_unique',
  'organization_roles_organization_id_name_unique',
  'organization_roles_organization_id_code_unique',
  'organization_roles_organization_id_id_unique',
  'organization_members_organization_id_user_id_unique',
  'organization_invitations_token_hash_unique',
  'sessions_token_hash_unique',
  'projects_organization_id_github_url_unique',
  'hermes_sessions_agent_handle_hermes_session_id_unique',
] as const;

const checkConstraints = [
  'users_role_check',
  'users_access_status_check',
  'organizations_type_check',
  'organizations_status_check',
  'organization_roles_code_check',
  'organization_roles_owner_code_check',
  'organization_members_status_check',
  'organization_invitations_status_check',
  'projects_status_check',
] as const;

const canonicalTriggers = [
  'organization_members_owner_guard',
  'organization_invitations_role_guard',
  'organization_roles_ownership_guard',
] as const;

const canonicalIndexes = [
  'connections_user_id_index',
  'organizations_status_index',
  'organization_roles_organization_id_index',
  'organization_members_organization_id_status_index',
  'organization_members_user_id_status_index',
  'organization_invitations_organization_id_status_index',
  'organization_invitations_pending_organization_email_unique',
  'sessions_token_hash_index',
  'projects_organization_id_status_index',
  'audit_logs_target_user_id_index',
  'audit_logs_organization_id_created_at_index',
  'audit_logs_created_at_index',
  'user_security_logs_organization_id_created_at_index',
  'user_security_logs_user_id_created_at_index',
  'hermes_sessions_user_id_updated_at_index',
] as const;

const obsoleteIndexes = [
  'organizations_owner_id_status_index',
  'projects_owner_id_status_index',
  'organization_members_active_owner_unique',
] as const;

function sqlList(values: readonly string[]) {
  return values.map((value) => `'${value.replaceAll("'", "''")}'`).join(', ');
}

async function rows<T extends Row>(
  connection: ReturnType<MikroORM['em']['getConnection']>,
  query: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await connection.execute<T>(query, params, 'all');
  if (Array.isArray(result)) return result as T[];
  if (typeof result === 'object' && result !== null && 'rows' in result) {
    const resultRows = (result as { rows?: unknown }).rows;
    if (Array.isArray(resultRows)) return resultRows as T[];
  }
  return [];
}

function assertNoRows(label: string, result: Row[]) {
  if (result.length) {
    throw new Error(`${label}: ${JSON.stringify(result)}`);
  }
}

function assertAllFound(label: string, expected: readonly string[], actual: Row[], key: string) {
  const actualValues = new Set(actual.map((row) => String(row[key])));
  const missing = expected.filter((value) => !actualValues.has(value));
  if (missing.length) throw new Error(`${label} missing: ${missing.join(', ')}`);
}

async function verifySchema() {
  const seedGithubUserId = process.env.SEED_ADMIN_GITHUB_ID?.trim();
  if (!seedGithubUserId) {
    throw new Error('SEED_ADMIN_GITHUB_ID is required for db:verify');
  }
  const seedOrganizationSlug = process.env.SEED_ORGANIZATION_SLUG?.trim() || 'project-forge';

  const orm = await MikroORM.init(config);
  try {
    const connection = orm.em.getConnection();
    const tableRows = await rows<{ table_name: string }>(
      connection,
      `select table_name
       from information_schema.tables
       where table_schema = 'public' and table_type = 'BASE TABLE'
         and table_name in (${sqlList(canonicalTables)});`,
    );
    assertAllFound('Canonical tables', canonicalTables, tableRows, 'table_name');

    const obsoleteTableRows = await rows<{ table_name: string }>(
      connection,
      `select table_name
       from information_schema.tables
       where table_schema = 'public' and table_type = 'BASE TABLE'
         and table_name in (${sqlList(obsoleteTables)});`,
    );
    assertNoRows('Obsolete tables still exist', obsoleteTableRows);

    const columnRows = await rows<{
      table_name: string;
      column_name: string;
      is_nullable: 'YES' | 'NO';
    }>(
      connection,
      `select table_name, column_name, is_nullable
       from information_schema.columns
       where table_schema = 'public'
         and table_name in (${sqlList(canonicalTables)});`,
    );
    const columnKeys = new Set(columnRows.map((row) => `${row.table_name}.${row.column_name}`));
    const missingColumns = canonicalColumns
      .filter(([table, column]) => !columnKeys.has(`${table}.${column}`))
      .map(([table, column]) => `${table}.${column}`);
    if (missingColumns.length) throw new Error(`Canonical columns missing: ${missingColumns.join(', ')}`);
    const presentObsoleteColumns = obsoleteColumns
      .filter(([table, column]) => columnKeys.has(`${table}.${column}`))
      .map(([table, column]) => `${table}.${column}`);
    if (presentObsoleteColumns.length) {
      throw new Error(`Obsolete columns still exist: ${presentObsoleteColumns.join(', ')}`);
    }
    const requiredNotNullColumns = [
      ['organization_members', 'role_id'],
      ['organization_invitations', 'email'],
      ['organization_invitations', 'role_id'],
    ] as const;
    const nullableRequiredColumns = requiredNotNullColumns
      .filter(([table, column]) =>
        columnRows.some((row) => row.table_name === table && row.column_name === column && row.is_nullable !== 'NO'),
      )
      .map(([table, column]) => `${table}.${column}`);
    if (nullableRequiredColumns.length) {
      throw new Error(`Canonical columns must be NOT NULL: ${nullableRequiredColumns.join(', ')}`);
    }

    const foreignKeyRows = await rows<{ name: string }>(
      connection,
      `select c.conname as name
       from pg_constraint c
       join pg_namespace n on n.oid = c.connamespace
       where n.nspname = 'public' and c.contype = 'f'
         and c.conname in (${sqlList(foreignKeyConstraints)});`,
    );
    assertAllFound('Foreign-key constraints', foreignKeyConstraints, foreignKeyRows, 'name');

    const uniqueRows = await rows<{ name: string }>(
      connection,
      `select c.conname as name
       from pg_constraint c
       join pg_namespace n on n.oid = c.connamespace
       where n.nspname = 'public' and c.contype = 'u'
         and c.conname in (${sqlList(uniqueConstraints)});`,
    );
    assertAllFound('Unique constraints', uniqueConstraints, uniqueRows, 'name');

    const checkRows = await rows<{ name: string }>(
      connection,
      `select c.conname as name
       from pg_constraint c
       join pg_namespace n on n.oid = c.connamespace
       where n.nspname = 'public' and c.contype = 'c'
         and c.conname in (${sqlList(checkConstraints)});`,
    );
    assertAllFound('Check constraints', checkConstraints, checkRows, 'name');

    const indexRows = await rows<{ name: string }>(
      connection,
      `select indexname as name
       from pg_indexes
       where schemaname = 'public'
         and indexname in (${sqlList(canonicalIndexes)});`,
    );
    assertAllFound('Canonical indexes', canonicalIndexes, indexRows, 'name');

    const obsoleteIndexRows = await rows<{ name: string }>(
      connection,
      `select indexname as name
       from pg_indexes
       where schemaname = 'public'
         and indexname in (${sqlList(obsoleteIndexes)});`,
    );
    assertNoRows('Obsolete indexes still exist', obsoleteIndexRows);

    const triggerRows = await rows<{ name: string }>(
      connection,
      `select t.tgname as name
       from pg_trigger t
       join pg_class r on r.oid = t.tgrelid
       join pg_namespace n on n.oid = r.relnamespace
       where n.nspname = 'public' and not t.tgisinternal
         and t.tgname in (${sqlList(canonicalTriggers)});`,
    );
    assertAllFound('Canonical triggers', canonicalTriggers, triggerRows, 'name');

    const ownerViolations = await rows(
      connection,
      `select o.id
       from organizations o
       left join organization_members m
         on m.organization_id = o.id and m.status = 'ACTIVE'
       left join organization_roles r
         on r.organization_id = m.organization_id and r.id = m.role_id
       group by o.id
       having count(m.id) filter (where r.is_owner = true) <> 1;`,
    );
    assertNoRows('Organizations without exactly one active Owner', ownerViolations);

    const ownerRoleViolations = await rows(
      connection,
      `select id
       from organization_roles
       where (is_owner = true and code is distinct from 'OWNER')
          or (is_owner = false and code = 'OWNER');`,
    );
    assertNoRows('Organization roles with inconsistent Owner code', ownerRoleViolations);

    const seededUsers = await rows<{ id: string }>(
      connection,
      `select id
       from users
       where github_user_id = ?
         and role = 'ADMIN'
         and access_status = 'APPROVED'
         and is_active = true;`,
      [seedGithubUserId],
    );
    if (seededUsers.length !== 1) {
      throw new Error(`Seed user verification expected one active Admin, found ${seededUsers.length}`);
    }
    const seedUserId = seededUsers[0]?.id;
    if (!seedUserId) throw new Error('Seed user verification returned no user id');

    const seededRoleRows = await rows<{ code: string }>(
      connection,
      `select r.code
       from organization_roles r
       join organizations o on o.id = r.organization_id
       where o.slug = ? and r.code in ('OWNER', 'ADMIN', 'MEMBER');`,
      [seedOrganizationSlug],
    );
    const seededRoleCodes = new Set(seededRoleRows.map((row) => row.code));
    const missingSeededRoleCodes = ['OWNER', 'ADMIN', 'MEMBER'].filter((code) => !seededRoleCodes.has(code));
    if (missingSeededRoleCodes.length) {
      throw new Error(`Seed organization roles missing: ${missingSeededRoleCodes.join(', ')}`);
    }

    const ownerInvitations = await rows(
      connection,
      `select i.id
       from organization_invitations i
       join organization_roles r
         on r.organization_id = i.organization_id and r.id = i.role_id
       where r.is_owner = true;`,
    );
    assertNoRows('Owner invitations still exist', ownerInvitations);

    const seededOwners = await rows(
      connection,
      `select o.id
       from organizations o
       join organization_members m
         on m.organization_id = o.id and m.user_id = ? and m.status = 'ACTIVE'
       join organization_roles r
         on r.organization_id = m.organization_id and r.id = m.role_id and r.code = 'OWNER'
       where o.slug = ?;`,
      [seedUserId, seedOrganizationSlug],
    );
    if (seededOwners.length !== 1) {
      throw new Error(
        `Seed organization verification expected one active Owner membership, found ${seededOwners.length}`,
      );
    }

    const seededConnections = await rows(
      connection,
      `select id
       from connections
       where user_id = ? and provider = 'GITHUB' and provider_account_id = ?;`,
      [seedUserId, seedGithubUserId],
    );
    if (seededConnections.length !== 1) {
      throw new Error(`Seed connection verification expected one GitHub connection, found ${seededConnections.length}`);
    }

    console.log(
      `Canonical schema verification passed for ${canonicalTables.length} named tables and seed ${seedOrganizationSlug}.`,
    );
  } finally {
    await orm.close(true);
  }
}

await verifySchema().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
