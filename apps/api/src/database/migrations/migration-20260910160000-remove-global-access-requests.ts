import { Migration } from '@mikro-orm/migrations'

export class Migration20260910160000_RemoveGlobalAccessRequests extends Migration {
  override name = 'Migration20260910160000_RemoveGlobalAccessRequests'

  override up(): void | Promise<void> {
    this.addSql(
      `update "users" set "access_status" = 'APPROVED' where "access_status" = 'PENDING';`,
    )
    this.addSql(
      `alter table "users" alter column "access_status" set default 'APPROVED';`,
    )
    this.addSql(
      `alter table "users" drop constraint if exists "users_access_status_check";`,
    )
    this.addSql(
      `alter table "users" add constraint "users_access_status_check" check ("access_status" in ('APPROVED', 'REJECTED', 'SUSPENDED'));`,
    )
    this.addSql(`drop table if exists "access_requests" cascade;`)
  }

  override down(): void | Promise<void> {
    this.addSql(
      `alter table "users" drop constraint if exists "users_access_status_check";`,
    )
    this.addSql(
      `alter table "users" alter column "access_status" set default 'PENDING';`,
    )
    this.addSql(
      `alter table "users" add constraint "users_access_status_check" check ("access_status" in ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'));`,
    )
    this.addSql(
      `create table "access_requests" ("id" uuid not null, "user_id" uuid not null, "reason" text null, "status" text not null default 'PENDING', "reviewed_by" uuid null, "reviewed_at" timestamptz null, "review_note" text null, "created_at" timestamptz not null, "updated_at" timestamptz not null, primary key ("id"));`,
    )
    this.addSql(`create index "access_requests_user_id_status_index" on "access_requests" ("user_id", "status");`)
    this.addSql(
      `alter table "access_requests" add constraint "access_requests_status_check" check ("status" in ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'));`,
    )
  }
}
