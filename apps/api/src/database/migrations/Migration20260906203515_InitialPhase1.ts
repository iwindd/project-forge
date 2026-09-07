import { Migration } from '@mikro-orm/migrations';

export class Migration20260906203515_InitialPhase1 extends Migration {
  override name = 'Migration20260906203515_InitialPhase1';

  override up(): void | Promise<void> {
    this.addSql(
      `create table "access_requests" ("id" uuid not null, "user_id" uuid not null, "reason" text null, "status" text not null default 'PENDING', "reviewed_by" uuid null, "reviewed_at" timestamptz null, "review_note" text null, "created_at" timestamptz not null, "updated_at" timestamptz not null, primary key ("id"));`,
    );
    this.addSql(`create index "access_requests_user_id_status_index" on "access_requests" ("user_id", "status");`);

    this.addSql(
      `create table "audit_logs" ("id" uuid not null, "actor_id" uuid null, "target_user_id" uuid null, "action" text not null, "resource_type" text not null, "resource_id" text null, "before_json" jsonb null, "after_json" jsonb null, "reason" text null, "request_id" text null, "created_at" timestamptz not null, primary key ("id"));`,
    );
    this.addSql(`create index "audit_logs_target_user_id_index" on "audit_logs" ("target_user_id");`);
    this.addSql(`create index "audit_logs_created_at_index" on "audit_logs" ("created_at");`);

    this.addSql(
      `create table "oauth_accounts" ("id" uuid not null, "user_id" uuid not null, "provider" text not null default 'GITHUB', "provider_account_id" text not null, "access_token_ciphertext" text null, "scope" text null, "expires_at" timestamptz null, "created_at" timestamptz not null, "updated_at" timestamptz not null, primary key ("id"));`,
    );
    this.addSql(
      `alter table "oauth_accounts" add constraint "oauth_accounts_provider_provider_account_id_unique" unique ("provider", "provider_account_id");`,
    );

    this.addSql(
      `create table "projects" ("id" uuid not null, "owner_id" uuid not null, "name" text not null, "github_url" text not null, "github_owner" text not null, "github_repo" text not null, "source_branch" text not null default 'main', "target_branch" text not null default 'main', "node_version" text null, "environment_metadata" jsonb null, "status" text not null default 'ACTIVE', "created_at" timestamptz not null, "updated_at" timestamptz not null, "archived_at" timestamptz null, primary key ("id"));`,
    );
    this.addSql(`create index "projects_owner_id_status_index" on "projects" ("owner_id", "status");`);
    this.addSql(
      `alter table "projects" add constraint "projects_owner_id_github_url_unique" unique ("owner_id", "github_url");`,
    );

    this.addSql(
      `create table "project_members" ("id" uuid not null, "project_id" uuid not null, "user_id" uuid not null, "role" text not null default 'OWNER', "created_at" timestamptz not null, "updated_at" timestamptz not null, primary key ("id"));`,
    );
    this.addSql(
      `alter table "project_members" add constraint "project_members_project_id_user_id_unique" unique ("project_id", "user_id");`,
    );

    this.addSql(
      `create table "sessions" ("id" uuid not null, "user_id" uuid not null, "token_hash" text not null, "expires_at" timestamptz not null, "revoked_at" timestamptz null, "created_at" timestamptz not null, "last_seen_at" timestamptz not null, primary key ("id"));`,
    );
    this.addSql(`alter table "sessions" add constraint "sessions_token_hash_unique" unique ("token_hash");`);
    this.addSql(`create index "sessions_token_hash_index" on "sessions" ("token_hash");`);

    this.addSql(
      `create table "users" ("id" uuid not null, "github_user_id" text not null, "github_login" text not null, "name" text null, "avatar_url" text null, "role" text not null default 'USER', "access_status" text not null default 'PENDING', "is_active" boolean not null default true, "created_at" timestamptz not null, "updated_at" timestamptz not null, primary key ("id"));`,
    );
    this.addSql(`alter table "users" add constraint "users_github_user_id_unique" unique ("github_user_id");`);

    this.addSql(
      `alter table "access_requests" add constraint "access_requests_status_check" check ("status" in ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'));`,
    );

    this.addSql(
      `alter table "projects" add constraint "projects_status_check" check ("status" in ('ACTIVE', 'ARCHIVED'));`,
    );

    this.addSql(
      `alter table "project_members" add constraint "project_members_role_check" check ("role" in ('OWNER', 'CONTRIBUTOR', 'VIEWER'));`,
    );

    this.addSql(`alter table "users" add constraint "users_role_check" check ("role" in ('USER', 'ADMIN'));`);
    this.addSql(
      `alter table "users" add constraint "users_access_status_check" check ("access_status" in ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'));`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "access_requests" cascade;`);
    this.addSql(`drop table if exists "audit_logs" cascade;`);
    this.addSql(`drop table if exists "oauth_accounts" cascade;`);
    this.addSql(`drop table if exists "projects" cascade;`);
    this.addSql(`drop table if exists "project_members" cascade;`);
    this.addSql(`drop table if exists "sessions" cascade;`);
    this.addSql(`drop table if exists "users" cascade;`);
  }
}
