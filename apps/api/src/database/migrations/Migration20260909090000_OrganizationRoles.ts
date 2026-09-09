import { Migration } from '@mikro-orm/migrations'

export class Migration20260909090000_OrganizationRoles extends Migration {
  override name = 'Migration20260909090000_OrganizationRoles'

  override up(): void | Promise<void> {
    this.addSql(
      `create table "organization_roles" ("id" uuid not null, "organization_id" uuid not null, "name" text not null, "permissions" jsonb not null default '[]', "is_owner" boolean not null default false, "legacy_role" text null, "created_at" timestamptz not null, "updated_at" timestamptz not null, primary key ("id"));`
    )
    this.addSql(
      `alter table "organization_roles" add constraint "organization_roles_organization_id_name_unique" unique ("organization_id", "name");`
    )
    this.addSql(
      `create index "organization_roles_organization_id_index" on "organization_roles" ("organization_id");`
    )

    this.addSql(
      `alter table "organization_members" add column "role_id" uuid null;`
    )
    this.addSql(
      `alter table "organization_invitations" add column "role_id" uuid null;`
    )
    this.addSql(
      `create index "organization_members_role_id_index" on "organization_members" ("role_id");`
    )
    this.addSql(
      `create index "organization_invitations_role_id_index" on "organization_invitations" ("role_id");`
    )
  }

  override down(): void | Promise<void> {
    this.addSql(
      `drop index if exists "organization_invitations_role_id_index";`
    )
    this.addSql(`drop index if exists "organization_members_role_id_index";`)
    this.addSql(
      `alter table "organization_invitations" drop column if exists "role_id";`
    )
    this.addSql(
      `alter table "organization_members" drop column if exists "role_id";`
    )
    this.addSql(`drop table if exists "organization_roles" cascade;`)
  }
}
