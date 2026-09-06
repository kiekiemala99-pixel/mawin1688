-- Staff balance adjustments (add/subtract) stay on the same ledger, tied to user_id.
alter table transactions drop constraint if exists transactions_type_ok;
alter table transactions
  add constraint transactions_type_ok
  check (type in ('deposit', 'withdraw', 'bet', 'payout', 'adjust'));
