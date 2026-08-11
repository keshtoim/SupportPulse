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
