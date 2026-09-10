import { Migration } from '@mikro-orm/migrations'

export class Migration20260910120000_OrganizationMembershipInvariants extends Migration {
  override name = 'Migration20260910120000_OrganizationMembershipInvariants'

  override up(): void | Promise<void> {
    this.addSql(
      `update "organization_invitations" set "email" = lower(trim("email")) where "email" is not null;`,
    )
    this.addSql(
      `with ranked as (select "id", row_number() over (partition by "organization_id", lower("email") order by "created_at" desc, "id" desc) as "row_number" from "organization_invitations" where "status" = 'PENDING' and "email" is not null) update "organization_invitations" set "status" = 'CANCELLED' where "id" in (select "id" from ranked where "row_number" > 1);`,
    )
    this.addSql(
      `create unique index "organization_invitations_pending_organization_email_unique" on "organization_invitations" ("organization_id", lower("email")) where "status" = 'PENDING' and "email" is not null;`,
    )

    this.addSql(
      `update "organization_roles" set "name" = 'เจ้าของ', "legacy_role" = 'OWNER', "is_owner" = true, "permissions" = '["organization.manage","project.manage"]'::jsonb, "updated_at" = now() where "is_owner" = true or "legacy_role" = 'OWNER';`,
    )
    this.addSql(
      `update "organization_roles" set "name" = 'แอดมิน', "legacy_role" = 'ADMIN', "is_owner" = false, "permissions" = '["organization.manage","project.manage"]'::jsonb, "updated_at" = now() where "legacy_role" = 'ADMIN';`,
    )
    this.addSql(
      `update "organization_roles" set "name" = 'สมาชิก', "legacy_role" = 'MEMBER', "is_owner" = false, "permissions" = '[]'::jsonb, "updated_at" = now() where "legacy_role" = 'MEMBER';`,
    )
    this.addSql(
      `insert into "organization_roles" ("id", "organization_id", "name", "permissions", "is_owner", "legacy_role", "created_at", "updated_at") select md5('organization-role:owner:' || "o"."id")::uuid, "o"."id", 'เจ้าของ', '["organization.manage","project.manage"]'::jsonb, true, 'OWNER', now(), now() from "organizations" "o" where not exists (select 1 from "organization_roles" "r" where "r"."organization_id" = "o"."id" and ("r"."is_owner" = true or "r"."legacy_role" = 'OWNER'));`,
    )
    this.addSql(
      `insert into "organization_roles" ("id", "organization_id", "name", "permissions", "is_owner", "legacy_role", "created_at", "updated_at") select md5('organization-role:admin:' || "o"."id")::uuid, "o"."id", 'แอดมิน', '["organization.manage","project.manage"]'::jsonb, false, 'ADMIN', now(), now() from "organizations" "o" where "o"."type" = 'SHARED' and not exists (select 1 from "organization_roles" "r" where "r"."organization_id" = "o"."id" and "r"."legacy_role" = 'ADMIN');`,
    )
    this.addSql(
      `insert into "organization_roles" ("id", "organization_id", "name", "permissions", "is_owner", "legacy_role", "created_at", "updated_at") select md5('organization-role:member:' || "o"."id")::uuid, "o"."id", 'สมาชิก', '[]'::jsonb, false, 'MEMBER', now(), now() from "organizations" "o" where "o"."type" = 'SHARED' and not exists (select 1 from "organization_roles" "r" where "r"."organization_id" = "o"."id" and "r"."legacy_role" = 'MEMBER');`,
    )
    this.addSql(
      `update "organization_members" "m" set "role_id" = "r"."id" from "organization_roles" "r" where "m"."organization_id" = "r"."organization_id" and "m"."role_id" is null and ("r"."legacy_role" = "m"."role" or ("m"."role" = 'OWNER' and "r"."is_owner" = true));`,
    )
    this.addSql(
      `update "organization_invitations" "i" set "role_id" = "r"."id" from "organization_roles" "r" where "i"."organization_id" = "r"."organization_id" and "i"."role_id" is null and "r"."legacy_role" = "i"."role";`,
    )
  }

  override down(): void | Promise<void> {
    this.addSql(
      `drop index if exists "organization_invitations_pending_organization_email_unique";`,
    )
  }
}
