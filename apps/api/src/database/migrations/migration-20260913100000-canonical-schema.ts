import { Migration } from '@mikro-orm/migrations';

/**
 * Canonical schema for the current, not-yet-deployed Phase 1 application.
 *
 * The accepted schema strategy recreates the disposable schema and seeds new
 * data. This migration intentionally contains DDL only: it does not migrate,
 * backfill, or delete records from the former schema.
 */
export class Migration20260913100000_CanonicalSchema extends Migration {
  override name = 'Migration20260913100000_CanonicalSchema';

  override up(): void | Promise<void> {
    this.addSql(
      `create table "users" ("id" uuid not null, "github_user_id" text not null, "github_login" text not null, "name" text null, "avatar_url" text null, "role" text not null default 'USER', "access_status" text not null default 'APPROVED', "is_active" boolean not null default true, "created_at" timestamptz not null, "updated_at" timestamptz not null, primary key ("id"));`,
    );
    this.addSql(
      `alter table "users" add constraint "users_github_user_id_unique" unique ("github_user_id");`,
    );
    this.addSql(
      `alter table "users" add constraint "users_role_check" check ("role" in ('USER', 'ADMIN'));`,
    );
    this.addSql(
      `alter table "users" add constraint "users_access_status_check" check ("access_status" in ('APPROVED', 'REJECTED', 'SUSPENDED'));`,
    );

    this.addSql(
      `create table "profiles" ("id" uuid not null, "user_id" uuid not null, "display_name" text null, "avatar_url" text null, "bio" text null, "timezone" text null, "created_at" timestamptz not null, "updated_at" timestamptz not null, primary key ("id"));`,
    );
    this.addSql(
      `alter table "profiles" add constraint "profiles_user_id_unique" unique ("user_id");`,
    );

    this.addSql(
      `create table "connections" ("id" uuid not null, "user_id" uuid not null, "provider" text not null, "provider_account_id" text not null, "provider_username" text null, "provider_email" text null, "provider_email_verified" boolean not null default false, "provider_verified_emails" jsonb not null, "access_token_ciphertext" text null, "scopes" text null, "connected_at" timestamptz not null, "updated_at" timestamptz not null, primary key ("id"));`,
    );
    this.addSql(
      `alter table "connections" add constraint "connections_provider_provider_account_id_unique" unique ("provider", "provider_account_id");`,
    );
    this.addSql(
      `alter table "connections" add constraint "connections_user_id_provider_unique" unique ("user_id", "provider");`,
    );
    this.addSql(`create index "connections_user_id_index" on "connections" ("user_id");`);

    this.addSql(
      `create table "organizations" ("id" uuid not null, "name" text not null, "slug" text not null, "type" text not null default 'SHARED', "status" text not null default 'ACTIVE', "created_at" timestamptz not null, "updated_at" timestamptz not null, primary key ("id"));`,
    );
    this.addSql(
      `alter table "organizations" add constraint "organizations_slug_unique" unique ("slug");`,
    );
    this.addSql(`create index "organizations_status_index" on "organizations" ("status");`);
    this.addSql(
      `alter table "organizations" add constraint "organizations_type_check" check ("type" in ('PERSONAL', 'SHARED'));`,
    );
    this.addSql(
      `alter table "organizations" add constraint "organizations_status_check" check ("status" in ('ACTIVE', 'ARCHIVED', 'SUSPENDED'));`,
    );

    this.addSql(
      `create table "organization_roles" ("id" uuid not null, "organization_id" uuid not null, "name" text not null, "permissions" jsonb not null, "is_owner" boolean not null default false, "code" text null, "created_at" timestamptz not null, "updated_at" timestamptz not null, primary key ("id"));`,
    );
    this.addSql(
      `alter table "organization_roles" add constraint "organization_roles_organization_id_name_unique" unique ("organization_id", "name");`,
    );
    this.addSql(
      `alter table "organization_roles" add constraint "organization_roles_organization_id_code_unique" unique ("organization_id", "code");`,
    );
    this.addSql(
      `alter table "organization_roles" add constraint "organization_roles_organization_id_id_unique" unique ("organization_id", "id");`,
    );
    this.addSql(
      `alter table "organization_roles" add constraint "organization_roles_code_check" check ("code" is null or "code" in ('OWNER', 'ADMIN', 'MEMBER'));`,
    );
    this.addSql(
      `alter table "organization_roles" add constraint "organization_roles_owner_code_check" check (("is_owner" and "code" = 'OWNER') or (not "is_owner" and "code" is distinct from 'OWNER'));`,
    );
    this.addSql(
      `create index "organization_roles_organization_id_index" on "organization_roles" ("organization_id");`,
    );

    this.addSql(
      `create table "organization_members" ("id" uuid not null, "organization_id" uuid not null, "user_id" uuid not null, "role_id" uuid not null, "status" text not null default 'ACTIVE', "joined_at" timestamptz not null, "updated_at" timestamptz not null, primary key ("id"));`,
    );
    this.addSql(
      `alter table "organization_members" add constraint "organization_members_organization_id_user_id_unique" unique ("organization_id", "user_id");`,
    );
    this.addSql(
      `create index "organization_members_organization_id_status_index" on "organization_members" ("organization_id", "status");`,
    );
    this.addSql(
      `create index "organization_members_user_id_status_index" on "organization_members" ("user_id", "status");`,
    );
    this.addSql(
      `alter table "organization_members" add constraint "organization_members_status_check" check ("status" in ('ACTIVE', 'INVITED', 'SUSPENDED', 'REMOVED'));`,
    );

    this.addSql(
      `create table "organization_invitations" ("id" uuid not null, "organization_id" uuid not null, "invited_by" uuid not null, "email" text not null, "token_hash" text not null, "role_id" uuid not null, "status" text not null default 'PENDING', "expires_at" timestamptz not null, "accepted_by" uuid null, "accepted_at" timestamptz null, "created_at" timestamptz not null, primary key ("id"));`,
    );
    this.addSql(
      `alter table "organization_invitations" add constraint "organization_invitations_token_hash_unique" unique ("token_hash");`,
    );
    this.addSql(
      `create index "organization_invitations_organization_id_status_index" on "organization_invitations" ("organization_id", "status");`,
    );
    this.addSql(
      `create unique index "organization_invitations_pending_organization_email_unique" on "organization_invitations" ("organization_id", lower("email")) where "status" = 'PENDING';`,
    );
    this.addSql(
      `alter table "organization_invitations" add constraint "organization_invitations_status_check" check ("status" in ('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED'));`,
    );

    this.addSql(
      `create table "sessions" ("id" uuid not null, "user_id" uuid not null, "token_hash" text not null, "expires_at" timestamptz not null, "revoked_at" timestamptz null, "created_at" timestamptz not null, "last_seen_at" timestamptz not null, primary key ("id"));`,
    );
    this.addSql(
      `alter table "sessions" add constraint "sessions_token_hash_unique" unique ("token_hash");`,
    );
    this.addSql(`create index "sessions_token_hash_index" on "sessions" ("token_hash");`);

    this.addSql(
      `create table "projects" ("id" uuid not null, "organization_id" uuid not null, "name" text not null, "github_url" text not null, "github_owner" text not null, "github_repo" text not null, "source_branch" text not null default 'main', "target_branch" text not null default 'main', "node_version" text null, "environment_metadata" jsonb null, "status" text not null default 'ACTIVE', "created_at" timestamptz not null, "updated_at" timestamptz not null, "archived_at" timestamptz null, primary key ("id"));`,
    );
    this.addSql(
      `alter table "projects" add constraint "projects_organization_id_github_url_unique" unique ("organization_id", "github_url");`,
    );
    this.addSql(
      `create index "projects_organization_id_status_index" on "projects" ("organization_id", "status");`,
    );
    this.addSql(
      `alter table "projects" add constraint "projects_status_check" check ("status" in ('ACTIVE', 'ARCHIVED'));`,
    );

    this.addSql(
      `create table "audit_logs" ("id" uuid not null, "organization_id" uuid null, "actor_id" uuid null, "target_user_id" uuid null, "action" text not null, "resource_type" text not null, "resource_id" text null, "before_json" jsonb null, "after_json" jsonb null, "reason" text null, "request_id" text null, "created_at" timestamptz not null, primary key ("id"));`,
    );
    this.addSql(`create index "audit_logs_target_user_id_index" on "audit_logs" ("target_user_id");`);
    this.addSql(
      `create index "audit_logs_organization_id_created_at_index" on "audit_logs" ("organization_id", "created_at");`,
    );
    this.addSql(`create index "audit_logs_created_at_index" on "audit_logs" ("created_at");`);

    this.addSql(
      `create table "user_security_logs" ("id" uuid not null, "organization_id" uuid null, "user_id" uuid null, "event" text not null, "provider" text null, "ip_address" text null, "user_agent" text null, "metadata" jsonb null, "created_at" timestamptz not null, primary key ("id"));`,
    );
    this.addSql(
      `create index "user_security_logs_organization_id_created_at_index" on "user_security_logs" ("organization_id", "created_at");`,
    );
    this.addSql(
      `create index "user_security_logs_user_id_created_at_index" on "user_security_logs" ("user_id", "created_at");`,
    );

    this.addSql(
      `alter table "profiles" add constraint "profiles_user_id_users_fk" foreign key ("user_id") references "users" ("id") on update cascade on delete cascade;`,
    );
    this.addSql(
      `alter table "connections" add constraint "connections_user_id_users_fk" foreign key ("user_id") references "users" ("id") on update cascade on delete cascade;`,
    );
    this.addSql(
      `alter table "sessions" add constraint "sessions_user_id_users_fk" foreign key ("user_id") references "users" ("id") on update cascade on delete cascade;`,
    );
    this.addSql(
      `alter table "organization_roles" add constraint "organization_roles_organization_id_fk" foreign key ("organization_id") references "organizations" ("id") on update cascade on delete restrict;`,
    );
    this.addSql(
      `alter table "organization_members" add constraint "organization_members_organization_id_fk" foreign key ("organization_id") references "organizations" ("id") on update cascade on delete restrict;`,
    );
    this.addSql(
      `alter table "organization_members" add constraint "organization_members_user_id_fk" foreign key ("user_id") references "users" ("id") on update cascade on delete cascade;`,
    );
    this.addSql(
      `alter table "organization_members" add constraint "organization_members_organization_role_fk" foreign key ("organization_id", "role_id") references "organization_roles" ("organization_id", "id") on update cascade on delete restrict;`,
    );
    this.addSql(
      `alter table "organization_invitations" add constraint "organization_invitations_organization_id_fk" foreign key ("organization_id") references "organizations" ("id") on update cascade on delete restrict;`,
    );
    this.addSql(
      `alter table "organization_invitations" add constraint "organization_invitations_invited_by_fk" foreign key ("invited_by") references "users" ("id") on update cascade on delete restrict;`,
    );
    this.addSql(
      `alter table "organization_invitations" add constraint "organization_invitations_accepted_by_fk" foreign key ("accepted_by") references "users" ("id") on update cascade on delete set null;`,
    );
    this.addSql(
      `alter table "organization_invitations" add constraint "organization_invitations_organization_role_fk" foreign key ("organization_id", "role_id") references "organization_roles" ("organization_id", "id") on update cascade on delete restrict;`,
    );
    this.addSql(
      `alter table "projects" add constraint "projects_organization_id_fk" foreign key ("organization_id") references "organizations" ("id") on update cascade on delete restrict;`,
    );
    this.addSql(
      `alter table "audit_logs" add constraint "audit_logs_organization_id_fk" foreign key ("organization_id") references "organizations" ("id") on update cascade on delete set null;`,
    );
    this.addSql(
      `alter table "audit_logs" add constraint "audit_logs_actor_id_fk" foreign key ("actor_id") references "users" ("id") on update cascade on delete set null;`,
    );
    this.addSql(
      `alter table "audit_logs" add constraint "audit_logs_target_user_id_fk" foreign key ("target_user_id") references "users" ("id") on update cascade on delete set null;`,
    );
    this.addSql(
      `alter table "user_security_logs" add constraint "user_security_logs_organization_id_fk" foreign key ("organization_id") references "organizations" ("id") on update cascade on delete set null;`,
    );
    this.addSql(
      `alter table "user_security_logs" add constraint "user_security_logs_user_id_fk" foreign key ("user_id") references "users" ("id") on update cascade on delete set null;`,
    );

    this.addSql(`
      create or replace function "enforce_organization_owner_membership"()
      returns trigger
      language plpgsql
      as $$
      declare
        new_is_owner boolean := false;
        old_is_owner boolean := false;
        another_owner boolean := false;
      begin
        if tg_op = 'DELETE' then
          select "is_owner" into old_is_owner
          from "organization_roles"
          where "id" = old."role_id" and "organization_id" = old."organization_id";
          if old."status" = 'ACTIVE' and coalesce(old_is_owner, false) then
            raise exception 'The organization Owner membership is immutable';
          end if;
          return old;
        end if;

        select "is_owner" into new_is_owner
        from "organization_roles"
        where "id" = new."role_id" and "organization_id" = new."organization_id";

        if tg_op = 'UPDATE' then
          select "is_owner" into old_is_owner
          from "organization_roles"
          where "id" = old."role_id" and "organization_id" = old."organization_id";
          if old."status" = 'ACTIVE'
             and coalesce(old_is_owner, false)
             and (new."status" <> 'ACTIVE'
               or new."organization_id" <> old."organization_id"
               or new."role_id" <> old."role_id"
               or new."user_id" <> old."user_id") then
            raise exception 'The organization Owner membership is immutable';
          end if;
        end if;

        if new."status" = 'ACTIVE' and coalesce(new_is_owner, false) then
          select exists (
            select 1
            from "organization_members" "m"
            join "organization_roles" "r"
              on "r"."id" = "m"."role_id"
             and "r"."organization_id" = "m"."organization_id"
            where "m"."organization_id" = new."organization_id"
              and "m"."status" = 'ACTIVE'
              and "r"."is_owner" = true
              and "m"."id" <> new."id"
          ) into another_owner;
          if another_owner then
            raise exception 'An organization can have only one active Owner';
          end if;
        end if;
        return new;
      end;
      $$;
    `);
    this.addSql(
      `create trigger "organization_members_owner_guard" before insert or update or delete on "organization_members" for each row execute function "enforce_organization_owner_membership"();`,
    );
    this.addSql(`
      create or replace function "enforce_organization_invitation_role"()
      returns trigger
      language plpgsql
      as $$
      declare
        assigned_owner boolean := false;
      begin
        select "is_owner" into assigned_owner
        from "organization_roles"
        where "id" = new."role_id" and "organization_id" = new."organization_id";
        if coalesce(assigned_owner, false) then
          raise exception 'An invitation cannot assign the Owner role';
        end if;
        return new;
      end;
      $$;
    `);
    this.addSql(
      `create trigger "organization_invitations_role_guard" before insert or update on "organization_invitations" for each row execute function "enforce_organization_invitation_role"();`,
    );
    this.addSql(`
      create or replace function "enforce_organization_role_ownership"()
      returns trigger
      language plpgsql
      as $$
      begin
        if tg_op = 'UPDATE'
           and (new."is_owner" is distinct from old."is_owner"
             or new."code" is distinct from old."code") then
          raise exception 'Organization role ownership is immutable';
        end if;
        return new;
      end;
      $$;
    `);
    this.addSql(
      `create trigger "organization_roles_ownership_guard" before insert or update on "organization_roles" for each row execute function "enforce_organization_role_ownership"();`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql('drop trigger if exists "organization_roles_ownership_guard" on "organization_roles";');
    this.addSql('drop function if exists "enforce_organization_role_ownership"();');
    this.addSql('drop trigger if exists "organization_invitations_role_guard" on "organization_invitations";');
    this.addSql('drop function if exists "enforce_organization_invitation_role"();');
    this.addSql('drop trigger if exists "organization_members_owner_guard" on "organization_members";');
    this.addSql('drop function if exists "enforce_organization_owner_membership"();');
    this.addSql('drop table if exists "user_security_logs" cascade;');
    this.addSql('drop table if exists "audit_logs" cascade;');
    this.addSql('drop table if exists "projects" cascade;');
    this.addSql('drop table if exists "sessions" cascade;');
    this.addSql('drop table if exists "organization_invitations" cascade;');
    this.addSql('drop table if exists "organization_members" cascade;');
    this.addSql('drop table if exists "organization_roles" cascade;');
    this.addSql('drop table if exists "organizations" cascade;');
    this.addSql('drop table if exists "connections" cascade;');
    this.addSql('drop table if exists "profiles" cascade;');
    this.addSql('drop table if exists "users" cascade;');
  }
}
