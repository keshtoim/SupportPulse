alter table tickets
  add column if not exists closed_category text
  check (closed_category in ('resolved', 'no_response', 'duplicate', 'out_of_scope', 'other'));
