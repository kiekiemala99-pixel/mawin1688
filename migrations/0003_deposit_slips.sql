-- Slip proof on cash txns + staff flag. First wallet becomes staff for the demo desk.
alter table wallets
  add column if not exists is_staff boolean not null default false;

alter table transactions
  add column if not exists method text not null default '';

alter table transactions
  add column if not exists slip_data text not null default '';

alter table transactions
  add column if not exists reviewed_by text not null default '';

alter table transactions
  add column if not exists reviewed_at timestamptz;

create index if not exists transactions_pending_cash_idx
  on transactions (created_at asc)
  where status = 'pending' and type in ('deposit', 'withdraw');

update wallets
set is_staff = true
where user_id = (select user_id from wallets order by created_at asc limit 1)
  and not exists (select 1 from wallets w2 where w2.is_staff);

update wallets set is_staff = true where username = 'admin';
