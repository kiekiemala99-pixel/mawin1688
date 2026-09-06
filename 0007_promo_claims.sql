-- Promo claim queue: member taps รับโปร → pending for staff review.
create table if not exists promo_claims (
  id          text primary key,
  user_id     text not null references wallets(user_id),
  promo_code  text not null,
  amount      numeric(14, 2) not null,
  status      text not null default 'pending',
  note        text not null default '',
  created_at  timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by text,
  constraint promo_claims_code_ok check (promo_code in ('deposit200', 'welcome50')),
  constraint promo_claims_status_ok check (status in ('pending', 'approved', 'rejected')),
  constraint promo_claims_amount_positive check (amount > 0)
);

create unique index if not exists promo_claims_one_open
  on promo_claims (user_id, promo_code)
  where status in ('pending', 'approved');

create index if not exists promo_claims_pending_idx
  on promo_claims (status, created_at desc);
