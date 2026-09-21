import { Migration } from '@mikro-orm/migrations';

export class Migration20260920184505_HermesUserSessions extends Migration {
  override name = 'Migration20260920184505_HermesUserSessions';

  override up(): void | Promise<void> {
    this.addSql(
      `create table "hermes_sessions" ("id" uuid not null, "user_id" uuid not null, "agent_handle" text not null, "hermes_session_id" text not null, "closed_at" timestamptz null, "created_at" timestamptz not null, "updated_at" timestamptz not null, primary key ("id"));`,
    );
    this.addSql(
      `alter table "hermes_sessions" add constraint "hermes_sessions_agent_handle_hermes_session_id_unique" unique ("agent_handle", "hermes_session_id");`,
    );
    this.addSql(
      `create index "hermes_sessions_user_id_updated_at_index" on "hermes_sessions" ("user_id", "updated_at");`,
    );
    this.addSql(
      `alter table "hermes_sessions" add constraint "hermes_sessions_user_id_fk" foreign key ("user_id") references "users" ("id") on update cascade on delete cascade;`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql('drop table if exists "hermes_sessions" cascade;');
  }
}
