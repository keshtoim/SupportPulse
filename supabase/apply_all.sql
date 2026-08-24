-- ============================================================================
-- SupportPulse — сводный файл для ручного применения в Supabase SQL Editor.
-- Склеивает supabase/migrations/001..007 в порядке накатки + разовый ремонт
-- для БД, где часть таблиц уже была создана по старым версиям 002/003.
--
-- Идемпотентен: безопасно вставлять и запускать целиком как на пустой базе,
-- так и на уже заполненной данными — ничего не удаляет и не перезаписывает
-- существующие строки. seed.sql сюда намеренно не включён — не запускайте
-- его повторно, если в базе уже есть реальные данные.
-- ============================================================================


-- ============================================================
-- 001_init.sql — базовые таблицы
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists tenants (
  tenant_id uuid primary key default gen_random_uuid(),
  name text not null,
  is_blocked boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists users (
  user_id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(tenant_id) on delete cascade,
  name text not null,
  email text not null unique,
  role text not null check (role in ('operator', 'supervisor', 'company_admin', 'platform_admin')),
  password_hash text not null,
  is_blocked boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists widget_configs (
  config_id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null unique references tenants(tenant_id) on delete cascade,
  brand_color text not null,
  welcome_message text not null,
  tone_of_voice text not null,
  show_privacy_notice boolean not null default true,
  privacy_notice text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists topics (
  topic_id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(tenant_id) on delete cascade,
  title text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists faq_articles (
  faq_id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references topics(topic_id) on delete cascade,
  tenant_id uuid not null references tenants(tenant_id) on delete cascade,
  question text not null,
  answer text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists dialogue_sessions (
  session_id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(tenant_id) on delete cascade,
  state text not null check (state in ('ai_active', 'waiting_operator', 'operator_connected', 'closed')),
  customer_name text,
  customer_email text,
  last_knowledge_article_ids uuid[] not null default '{}',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists tickets (
  ticket_id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(tenant_id) on delete cascade,
  session_id uuid not null references dialogue_sessions(session_id) on delete cascade,
  status text not null check (status in ('new', 'in_progress', 'waiting_client', 'closed')),
  assigned_user_id uuid references users(user_id) on delete set null,
  reason text not null,
  requested_by text not null,
  closed_reason text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists messages (
  message_id uuid primary key default gen_random_uuid(),
  session_id uuid not null references dialogue_sessions(session_id) on delete cascade,
  ticket_id uuid references tickets(ticket_id) on delete set null,
  sender_type text not null check (sender_type in ('client', 'ai', 'operator', 'system')),
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists audit_logs (
  audit_id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(tenant_id) on delete cascade,
  actor_user_id uuid references users(user_id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists refresh_tokens (
  token text primary key,
  user_id uuid not null references users(user_id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_topics_tenant_id on topics (tenant_id);
create index if not exists idx_faq_articles_tenant_id on faq_articles (tenant_id);
create index if not exists idx_dialogue_sessions_tenant_id on dialogue_sessions (tenant_id);
create index if not exists idx_tickets_tenant_id on tickets (tenant_id);
create index if not exists idx_tickets_status on tickets (status);
create index if not exists idx_messages_session_id on messages (session_id);
create index if not exists idx_messages_ticket_id on messages (ticket_id);
create index if not exists idx_audit_logs_tenant_id on audit_logs (tenant_id);


-- ============================================================
-- 002_knowledge_documents.sql — загруженные файлы базы знаний
-- ============================================================

create table if not exists knowledge_documents (
  document_id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(tenant_id) on delete cascade,
  file_name text not null,
  mime_type text not null check (mime_type in (
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  )),
  size_bytes integer not null check (size_bytes > 0),
  status text not null check (status in ('processed', 'failed')),
  extracted_text text,
  error_message text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_knowledge_documents_tenant_id on knowledge_documents (tenant_id);


-- ============================================================
-- 003_knowledge_chunks.sql — векторный индекс для RAG
-- ============================================================

create extension if not exists vector;

create table if not exists knowledge_chunks (
  chunk_id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(tenant_id) on delete cascade,
  document_id uuid not null references knowledge_documents(document_id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  embedding vector(1536),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_knowledge_chunks_tenant_id on knowledge_chunks (tenant_id);
create index if not exists idx_knowledge_chunks_document_id on knowledge_chunks (document_id);
-- HNSW вместо IVFFlat: IVFFlat строит кластеры по данным на момент создания индекса и деградирует
-- на пустой/малой таблице (а она пустая при первом накате миграции); HNSW не требует прогрева данными.
create index if not exists idx_knowledge_chunks_embedding on knowledge_chunks using hnsw (embedding vector_cosine_ops);

-- Поиск ближайших фрагментов по косинусному сходству в рамках тенанта.
-- Вычисления на клиенте (supabase-js) невозможны — используем RPC с оператором pgvector <=>.
create or replace function match_knowledge_chunks(
  p_tenant_id uuid,
  p_query_embedding vector(1536),
  p_match_count integer default 5
)
returns table (
  chunk_id uuid,
  document_id uuid,
  content text,
  similarity float
)
language sql stable
as $$
  select
    chunk_id,
    document_id,
    content,
    1 - (embedding <=> p_query_embedding) as similarity
  from knowledge_chunks
  where tenant_id = p_tenant_id and embedding is not null
  order by embedding <=> p_query_embedding
  limit p_match_count;
$$;


-- ============================================================
-- 004_operator_notes_templates.sql — заметки оператора и шаблоны ответов
-- ============================================================

create table if not exists ticket_notes (
  note_id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets(ticket_id) on delete cascade,
  tenant_id uuid not null references tenants(tenant_id) on delete cascade,
  author_user_id uuid references users(user_id) on delete set null,
  author_name text not null,
  content text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_ticket_notes_ticket_id on ticket_notes (ticket_id);

create table if not exists response_templates (
  template_id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(tenant_id) on delete cascade,
  title text not null,
  content text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_response_templates_tenant_id on response_templates (tenant_id);


-- ============================================================
-- 005_ticket_close_category.sql — категория закрытия тикета
-- ============================================================

alter table tickets
  add column if not exists closed_category text
  check (closed_category in ('resolved', 'no_response', 'duplicate', 'out_of_scope', 'other'));


-- ============================================================
-- 006_widget_config_email_notifications.sql — email-уведомления
-- ============================================================

alter table widget_configs
  add column if not exists email_notifications_enabled boolean not null default false;


-- ============================================================
-- 007_security_hardening.sql — RLS, каскады, индексы
-- ============================================================

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


-- ============================================================
-- Разовый ремонт для БД, где knowledge_documents/knowledge_chunks были
-- созданы ДО этого ужесточения (по старым версиям 002/003 без constraint'ов
-- и с IVFFlat вместо HNSW). "create table/index if not exists" выше это не
-- исправит, если объект уже существует. На чистой базе оба блока — безопасный
-- no-op: constraint'ы уже стоят из CREATE TABLE выше, индекс уже HNSW.
-- ============================================================

do $$
begin
  alter table knowledge_documents
    add constraint knowledge_documents_mime_type_check
    check (mime_type in ('application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document'));
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table knowledge_documents
    add constraint knowledge_documents_size_bytes_check
    check (size_bytes > 0);
exception when duplicate_object then null;
end $$;

drop index if exists idx_knowledge_chunks_embedding;
create index if not exists idx_knowledge_chunks_embedding
  on knowledge_chunks using hnsw (embedding vector_cosine_ops);
