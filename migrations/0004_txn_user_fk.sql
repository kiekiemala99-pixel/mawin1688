-- Bind every ledger row to exactly one wallet (auth user id).
-- Orphan transactions cannot exist; deleting a wallet with history is blocked.

delete from bets b
where not exists (select 1 from wallets w where w.user_id = b.user_id);

delete from transactions t
where not exists (select 1 from wallets w where w.user_id = t.user_id);

alter table transactions drop constraint if exists transactions_user_fk;
alter table transactions
  add constraint transactions_user_fk
  foreign key (user_id) references wallets(user_id)
  on delete restrict;

alter table bets drop constraint if exists bets_user_fk;
alter table bets
  add constraint bets_user_fk
  foreign key (user_id) references wallets(user_id)
  on delete restrict;

create index if not exists transactions_user_status_idx
  on transactions (user_id, status, created_at desc);

create index if not exists transactions_user_type_idx
  on transactions (user_id, type, created_at desc);
