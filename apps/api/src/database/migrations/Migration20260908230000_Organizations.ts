import { Migration } from '@mikro-orm/migrations';

export class Migration20260908230000_Organizations extends Migration {
  override name = 'Migration20260908230000_Organizations';

  override up(): void | Promise<void> {
    this.addSql(
      `create table "profiles" ("id" uuid not null, "user_id" uuid not null, "display_name" text null, "avatar_url" text null, "bio" text null, "timezone" text null, "created_at" timestamptz not null, "updated_at" timestamptz not null, primary key ("id"));`,
    );
    this.addSql(`alter table "profiles" add constraint "profiles_user_id_unique" unique ("user_id");`);

    this.addSql(
      `create table "connections" ("id" uuid not null, "user_id" uuid not null, "provider" text not null, "provider_account_id" text not null, "provider_username" text null, "provider_email" text null, "access_token_ciphertext" text null, "scopes" text null, "connected_at" timestamptz not null, "updated_at" timestamptz not null, primary key ("id"));`,
    );
    this.addSql(`alter table "connections" add constraint "connections_provider_provider_account_id_unique" unique ("provider", "provider_account_id");`);
    this.addSql(`alter table "connections" add constraint "connections_user_id_provider_unique" unique ("user_id", "provider");`);
    this.addSql(`create index "connections_user_id_index" on "connections" ("user_id");`);

    this.addSql(
      `create table "organizations" ("id" uuid not null, "owner_id" uuid not null, "name" text not null, "slug" text not null, "type" text not null default 'SHARED', "status" text not null default 'ACTIVE', "created_at" timestamptz not null, "updated_at" timestamptz not null, primary key ("id"));`,
    );
    this.addSql(`alter table "organizations" add constraint "organizations_slug_unique" unique ("slug");`);
    this.addSql(`create index "organizations_owner_id_status_index" on "organizations" ("owner_id", "status");`);

    this.addSql(
      `create table "organization_members" ("id" uuid not null, "organization_id" uuid not null, "user_id" uuid not null, "role" text not null default 'MEMBER', "status" text not null default 'ACTIVE', "joined_at" timestamptz not null, "updated_at" timestamptz not null, primary key ("id"));`,
    );
    this.addSql(`alter table "organization_members" add constraint "organization_members_organization_id_user_id_unique" unique ("organization_id", "user_id");`);
    this.addSql(`create index "organization_members_organization_id_status_index" on "organization_members" ("organization_id", "status");`);
    this.addSql(`create index "organization_members_user_id_status_index" on "organization_members" ("user_id", "status");`);

    this.addSql(
      `create table "organization_invitations" ("id" uuid not null, "organization_id" uuid not null, "invited_by" uuid not null, "email" text null, "token_hash" text not null, "role" text not null default 'MEMBER', "status" text not null default 'PENDING', "expires_at" timestamptz not null, "accepted_by" uuid null, "accepted_at" timestamptz null, "created_at" timestamptz not null, primary key ("id"));`,
    );
    this.addSql(`alter table "organization_invitations" add constraint "organization_invitations_token_hash_unique" unique ("token_hash");`);
    this.addSql(`create index "organization_invitations_organization_id_status_index" on "organization_invitations" ("organization_id", "status");`);

    this.addSql(
      `create table "user_security_logs" ("id" uuid not null, "organization_id" uuid null, "user_id" uuid null, "event" text not null, "provider" text null, "ip_address" text null, "user_agent" text null, "metadata" jsonb null, "created_at" timestamptz not null, primary key ("id"));`,
    );
    this.addSql(`create index "user_security_logs_user_id_created_at_index" on "user_security_logs" ("user_id", "created_at");`);
    this.addSql(`create index "user_security_logs_organization_id_created_at_index" on "user_security_logs" ("organization_id", "created_at");`);

    this.addSql(`alter table "audit_logs" add column "organization_id" uuid null;`);
    this.addSql(`create index "audit_logs_organization_id_created_at_index" on "audit_logs" ("organization_id", "created_at");`);
    this.addSql(`alter table "sessions" add column "active_organization_id" uuid null;`);

    this.addSql(
      `insert into "profiles" ("id", "user_id", "display_name", "avatar_url", "created_at", "updated_at") select md5('profile:' || "id")::uuid, "id", "name", "avatar_url", "created_at", "updated_at" from "users" on conflict ("user_id") do nothing;`,
    );
    this.addSql(
      `insert into "connections" ("id", "user_id", "provider", "provider_account_id", "provider_username", "access_token_ciphertext", "scopes", "connected_at", "updated_at") select md5('connection:github:' || "u"."github_user_id")::uuid, "u"."id", 'GITHUB', "u"."github_user_id", "u"."github_login", "o"."access_token_ciphertext", "o"."scope", coalesce("o"."created_at", "u"."created_at"), coalesce("o"."updated_at", "u"."updated_at") from "users" "u" left join "oauth_accounts" "o" on "o"."user_id" = "u"."id" and "o"."provider" = 'GITHUB' on conflict ("provider", "provider_account_id") do nothing;`,
    );
    this.addSql(
      `insert into "organizations" ("id", "owner_id", "name", "slug", "type", "status", "created_at", "updated_at") select md5('organization:personal:' || "id")::uuid, "id", coalesce(nullif(trim("name"), ''), "github_login") || ' Personal Workspace', 'personal-' || "id", 'PERSONAL', 'ACTIVE', "created_at", "updated_at" from "users" on conflict ("slug") do nothing;`,
    );
    this.addSql(
      `insert into "organization_members" ("id", "organization_id", "user_id", "role", "status", "joined_at", "updated_at") select md5('membership:personal:' || "id")::uuid, md5('organization:personal:' || "id")::uuid, "id", 'OWNER', 'ACTIVE', "created_at", "updated_at" from "users" on conflict ("organization_id", "user_id") do nothing;`,
    );
    this.addSql(
      `update "audit_logs" "a" set "organization_id" = md5('organization:personal:' || "a"."actor_id")::uuid where "a"."actor_id" is not null and exists (select 1 from "organizations" "o" where "o"."id" = md5('organization:personal:' || "a"."actor_id")::uuid);`,
    );

    this.addSql(`alter table "organizations" add constraint "organizations_type_check" check ("type" in ('PERSONAL', 'SHARED'));`);
    this.addSql(`alter table "organizations" add constraint "organizations_status_check" check ("status" in ('ACTIVE', 'ARCHIVED', 'SUSPENDED'));`);
    this.addSql(`alter table "organization_members" add constraint "organization_members_role_check" check ("role" in ('OWNER', 'ADMIN', 'MEMBER'));`);
    this.addSql(`alter table "organization_members" add constraint "organization_members_status_check" check ("status" in ('ACTIVE', 'INVITED', 'SUSPENDED', 'REMOVED'));`);
    this.addSql(`alter table "organization_invitations" add constraint "organization_invitations_role_check" check ("role" in ('ADMIN', 'MEMBER'));`);
    this.addSql(`alter table "organization_invitations" add constraint "organization_invitations_status_check" check ("status" in ('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED'));`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "sessions" drop column if exists "active_organization_id";`);
    this.addSql(`alter table "audit_logs" drop column if exists "organization_id";`);
    this.addSql(`drop table if exists "user_security_logs" cascade;`);
    this.addSql(`drop table if exists "organization_invitations" cascade;`);
    this.addSql(`drop table if exists "organization_members" cascade;`);
    this.addSql(`drop table if exists "organizations" cascade;`);
    this.addSql(`drop table if exists "connections" cascade;`);
    this.addSql(`drop table if exists "profiles" cascade;`);
  }
}
