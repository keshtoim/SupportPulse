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
