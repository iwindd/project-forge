import { Migration } from '@mikro-orm/migrations'

export class Migration20260910130000_InviteOnlyAdmission extends Migration {
  override name = 'Migration20260910130000_InviteOnlyAdmission'

  override up(): void | Promise<void> {
    this.addSql(
      `alter table "connections" add column "provider_email_verified" boolean not null default false;`,
    )
    this.addSql(
      `update "organization_invitations" set "status" = 'CANCELLED' where "status" = 'PENDING' and "email" is null;`,
    )
  }

  override down(): void | Promise<void> {
    this.addSql(
      `alter table "connections" drop column if exists "provider_email_verified";`,
    )
  }
}
