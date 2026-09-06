alter table bets drop constraint if exists bets_kind_ok;
alter table bets
  add constraint bets_kind_ok check (kind in ('lottery', 'football', 'slot', 'mini'));
