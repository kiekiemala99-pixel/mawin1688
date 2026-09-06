alter table coupons add column if not exists amount numeric(14, 2) not null default 0;

update coupons set amount = 10 where amount = 0 and code = 'MAWIN1688';
