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
      `with ranked as (
        select "id",
          first_value("id") over (
            partition by "organization_id"
            order by "is_owner" desc, "created_at" asc, "id" asc
          ) as "canonical_id",
          row_number() over (
            partition by "organization_id"
            order by "is_owner" desc, "created_at" asc, "id" asc
          ) as "row_number"
        from "organization_roles"
        where "is_owner" = true or "legacy_role" = 'OWNER'
      )
      update "organization_members" "m"
      set "role" = 'OWNER', "role_id" = "ranked"."canonical_id"
      from ranked
      where "m"."role_id" = "ranked"."id" and "ranked"."row_number" > 1;`,
    )
    this.addSql(
      `with ranked as (
        select "id",
          first_value("id") over (
            partition by "organization_id"
            order by "is_owner" desc, "created_at" asc, "id" asc
          ) as "canonical_id",
          row_number() over (
            partition by "organization_id"
            order by "is_owner" desc, "created_at" asc, "id" asc
          ) as "row_number"
        from "organization_roles"
        where "is_owner" = true or "legacy_role" = 'OWNER'
      )
      update "organization_invitations" "i"
      set "role_id" = "ranked"."canonical_id"
      from ranked
      where "i"."role_id" = "ranked"."id" and "ranked"."row_number" > 1;`,
    )
    this.addSql(
      `with ranked as (
        select "id",
          row_number() over (
            partition by "organization_id"
            order by "is_owner" desc, "created_at" asc, "id" asc
          ) as "row_number"
        from "organization_roles"
        where "is_owner" = true or "legacy_role" = 'OWNER'
      )
      delete from "organization_roles" "r"
      using ranked
      where "r"."id" = "ranked"."id" and "ranked"."row_number" > 1;`,
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
      `insert into "organization_roles" ("id", "organization_id", "name", "permissions", "is_owner", "legacy_role", "created_at", "updated_at") select md5('organization-role:owner:' || "o"."id")::uuid, "o"."id", 'เจ้าของ', '["organization.manage","project.manage"]'::jsonb, true, 'OWNER', now(), now() from "organizations" "o" where not exists (select 1 from "organization_roles" "r" where "r"."organization_id" = "o"."id" and ("r"."is_owner" = true or "r"."legacy_role" = 'OWNER')) on conflict ("organization_id", "name") do update set "permissions" = excluded."permissions", "is_owner" = true, "legacy_role" = 'OWNER', "updated_at" = now();`,
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
    this.addSql(
      `update "organization_members" "m" set "role" = 'OWNER', "role_id" = "r"."id" from "organization_roles" "r" where "m"."organization_id" = "r"."organization_id" and ("m"."role" = 'OWNER' or "m"."role_id" = "r"."id") and ("r"."is_owner" = true or "r"."legacy_role" = 'OWNER');`,
    )
    this.addSql(
      `insert into "organization_members" ("id", "organization_id", "user_id", "role", "role_id", "status", "joined_at", "updated_at") select md5('membership:owner:' || "o"."id")::uuid, "o"."id", "o"."owner_id", 'OWNER', "r"."id", 'ACTIVE', "o"."created_at", now() from "organizations" "o" join "organization_roles" "r" on "r"."organization_id" = "o"."id" and ("r"."is_owner" = true or "r"."legacy_role" = 'OWNER') on conflict ("organization_id", "user_id") do update set "role" = 'OWNER', "role_id" = excluded."role_id", "status" = 'ACTIVE', "updated_at" = now();`,
    )
    this.addSql(
      `with ranked as (
        select "m"."id", "m"."organization_id",
          row_number() over (
            partition by "m"."organization_id"
            order by case when "m"."user_id" = "o"."owner_id" then 0 else 1 end, "m"."joined_at" asc, "m"."id" asc
          ) as "owner_rank"
        from "organization_members" "m"
        join "organizations" "o" on "o"."id" = "m"."organization_id"
        where "m"."status" = 'ACTIVE' and "m"."role" = 'OWNER'
      ),
      member_roles as (
        select "organization_id", "id" as "role_id"
        from "organization_roles"
        where "legacy_role" = 'MEMBER'
      )
      update "organization_members" "m"
      set "role" = 'MEMBER', "role_id" = "member_roles"."role_id", "updated_at" = now()
      from ranked
      left join member_roles on member_roles."organization_id" = ranked."organization_id"
      where "m"."id" = ranked."id" and ranked."owner_rank" > 1;`,
    )
    this.addSql(
      `create unique index "organization_members_active_owner_unique" on "organization_members" ("organization_id") where "status" = 'ACTIVE' and "role" = 'OWNER';`,
    )
  }

  override down(): void | Promise<void> {
    this.addSql(
      `drop index if exists "organization_members_active_owner_unique";`,
    )
    this.addSql(
      `drop index if exists "organization_invitations_pending_organization_email_unique";`,
    )
  }
}
