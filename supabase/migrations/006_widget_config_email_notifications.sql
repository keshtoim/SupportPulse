alter table widget_configs
  add column if not exists email_notifications_enabled boolean not null default false;
