create table if not exists rtp_configs (
  id text primary key,
  kind text not null check (kind in ('mini', 'slot')),
  title text not null,
  rtp numeric not null default 100,
  enabled boolean not null default true,
  pays jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by text not null default ''
);

create index if not exists rtp_configs_kind_idx on rtp_configs (kind, title);
