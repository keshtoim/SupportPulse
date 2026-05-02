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
