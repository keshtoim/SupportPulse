-- Backend всегда ходит через service_role — он обходит RLS по определению, так что для
-- него ничего не меняется. Но Supabase по умолчанию открывает PostgREST на весь public-schema
-- для ролей anon/authenticated: без RLS и с дефолтными GRANT'ами таблицы вроде users/tickets/
-- audit_logs были бы доступны напрямую через REST API, если anon-ключ когда-либо попадёт
-- во фронтенд или станет известен. Нет собственной Supabase Auth (своя JWT-система), поэтому
-- писать tenant-aware policy бессмысленно — нет auth.uid()/auth.jwt(), под который её вести.
-- Правильная политика в этой архитектуре — включить RLS без единой policy (полный запрет для
-- anon/authenticated) и явно отозвать табличные права; единственный легитимный путь — service_role.

revoke all on
  tenants, users, widget_configs, topics, faq_articles, dialogue_sessions,
  tickets, messages, audit_logs, refresh_tokens, knowledge_documents,
  knowledge_chunks, ticket_notes, response_templates
from anon, authenticated;

alter table tenants enable row level security;
alter table users enable row level security;
alter table widget_configs enable row level security;
alter table topics enable row level security;
alter table faq_articles enable row level security;
alter table dialogue_sessions enable row level security;
alter table tickets enable row level security;
alter table messages enable row level security;
alter table audit_logs enable row level security;
alter table refresh_tokens enable row level security;
alter table knowledge_documents enable row level security;
alter table knowledge_chunks enable row level security;
alter table ticket_notes enable row level security;
alter table response_templates enable row level security;

-- audit_logs существует для последующих разборов инцидентов (FR-072) — запись не должна
-- исчезать вместе с удалением тенанта (сейчас такой операции в приложении нет, но схема
-- не должна закладывать потерю аудиторского следа, если она появится).
alter table audit_logs drop constraint if exists audit_logs_tenant_id_fkey;
alter table audit_logs
  add constraint audit_logs_tenant_id_fkey
  foreign key (tenant_id) references tenants(tenant_id) on delete set null;

-- Недостающие индексы под реальные паттерны запросов приложения
create index if not exists idx_users_tenant_id on users (tenant_id);
create index if not exists idx_tickets_tenant_id_status on tickets (tenant_id, status);
create index if not exists idx_messages_session_id_created_at on messages (session_id, created_at);
create index if not exists idx_ticket_notes_tenant_id on ticket_notes (tenant_id);
