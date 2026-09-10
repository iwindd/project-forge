import { Migration } from '@mikro-orm/migrations';

export class Migration20260910150000_VerifiedGithubEmails extends Migration {
  override name = 'Migration20260910150000_VerifiedGithubEmails';

  override up(): void | Promise<void> {
    this.addSql(
      'alter table "connections" add column "provider_verified_emails" jsonb not null default \'[]\';',
    );
    this.addSql(
      'update "connections" set "provider_verified_emails" = jsonb_build_array(lower("provider_email")) where "provider_email_verified" = true and "provider_email" is not null;',
    );
  }

  override down(): void | Promise<void> {
    this.addSql(
      'alter table "connections" drop column if exists "provider_verified_emails";',
    );
  }
}
