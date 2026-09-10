import { Migration } from '@mikro-orm/migrations';

export class Migration20260910140000_OrganizationOwnedProjects extends Migration {
  override name = 'Migration20260910140000_OrganizationOwnedProjects';

  override up(): void | Promise<void> {
    this.addSql('drop index if exists "projects_owner_id_status_index";');
    this.addSql(
      'alter table "projects" drop constraint if exists "projects_owner_id_github_url_unique";',
    );
    this.addSql('alter table "projects" add column "organization_id" uuid;');
    this.addSql('alter table "projects" alter column "organization_id" set not null;');
    this.addSql('alter table "projects" drop column if exists "owner_id";');
    this.addSql(
      'create index "projects_organization_id_status_index" on "projects" ("organization_id", "status");',
    );
    this.addSql(
      'alter table "projects" add constraint "projects_organization_id_github_url_unique" unique ("organization_id", "github_url");',
    );
    this.addSql('drop table if exists "project_members" cascade;');
  }

  override down(): void | Promise<void> {
    this.addSql(
      'alter table "projects" drop constraint if exists "projects_organization_id_github_url_unique";',
    );
    this.addSql('drop index if exists "projects_organization_id_status_index";');
    this.addSql('alter table "projects" add column "owner_id" uuid;');
    this.addSql('alter table "projects" drop column if exists "organization_id";');
    this.addSql(
      'create index "projects_owner_id_status_index" on "projects" ("owner_id", "status");',
    );
    this.addSql(
      'alter table "projects" add constraint "projects_owner_id_github_url_unique" unique ("owner_id", "github_url");',
    );
  }
}
