alter table wallets add column if not exists referrer_id text;
alter table wallets add column if not exists ref_code text;

update wallets
set ref_code = username
where ref_code is null or ref_code = '';

create unique index if not exists wallets_ref_code_uidx on wallets (ref_code);

create table if not exists referral_settings (
  id text primary key,
  percent numeric(6, 2) not null default 35,
  enabled boolean not null default true,
  min_deposit numeric(14, 2) not null default 1,
  updated_at timestamptz not null default now()
);

insert into referral_settings (id, percent, enabled, min_deposit)
values ('main', 35, true, 1)
on conflict (id) do nothing;

create table if not exists referral_rewards (
  id text primary key,
  referrer_id text not null,
  referred_id text not null,
  deposit_id text not null,
  amount numeric(14, 2) not null,
  percent numeric(6, 2) not null,
  created_at timestamptz not null default now(),
  unique (deposit_id)
);

create index if not exists referral_rewards_referrer_idx
  on referral_rewards (referrer_id, created_at desc);
