-- Official lottery results posted by staff. Settlement reads this table first.
create table if not exists draw_results (
  round_key  text primary key,
  market_id  text not null,
  top3       text not null,
  bottom2    text not null,
  first6     text not null default '',
  posted_by  text not null default '',
  created_at timestamptz not null default now(),
  constraint draw_results_top3_ok check (top3 ~ '^[0-9]{3}$'),
  constraint draw_results_bottom2_ok check (bottom2 ~ '^[0-9]{2}$')
);

create index if not exists draw_results_market_idx
  on draw_results (market_id, created_at desc);
