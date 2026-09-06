-- Wallets + ledger. Balance cannot go negative (CHECK + atomic UPDATE).
create table if not exists wallets (
  user_id      text primary key,
  username     text not null unique,
  phone        text not null unique,
  bank_name    text not null default '',
  bank_account text not null default '',
  balance      numeric(14, 2) not null default 0,
  created_at   timestamptz not null default now(),
  constraint wallets_balance_nonnegative check (balance >= 0)
);

create table if not exists transactions (
  id         text primary key,
  user_id    text not null,
  type       text not null,
  amount     numeric(14, 2) not null,
  status     text not null default 'pending',
  note       text not null default '',
  created_at timestamptz not null default now(),
  constraint transactions_amount_positive check (amount > 0),
  constraint transactions_type_ok check (type in ('deposit', 'withdraw', 'bet', 'payout')),
  constraint transactions_status_ok check (status in ('pending', 'approved', 'rejected'))
);

create index if not exists transactions_user_id_idx on transactions (user_id, created_at desc);

create table if not exists bets (
  id         text primary key,
  user_id    text not null,
  kind       text not null,
  payload    jsonb not null,
  stake      numeric(14, 2) not null,
  status     text not null default 'pending',
  payout     numeric(14, 2) not null default 0,
  created_at timestamptz not null default now(),
  constraint bets_kind_ok check (kind in ('lottery', 'football')),
  constraint bets_status_ok check (status in ('pending', 'won', 'lost', 'push')),
  constraint bets_stake_positive check (stake > 0),
  constraint bets_payout_nonnegative check (payout >= 0)
);

create index if not exists bets_user_id_idx on bets (user_id, created_at desc);
create index if not exists bets_pending_idx on bets (user_id) where status = 'pending';
