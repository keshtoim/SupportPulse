create table if not exists knowledge_documents (
  document_id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(tenant_id) on delete cascade,
  file_name text not null,
  mime_type text not null,
  size_bytes integer not null,
  status text not null check (status in ('processed', 'failed')),
  extracted_text text,
  error_message text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_knowledge_documents_tenant_id on knowledge_documents (tenant_id);
