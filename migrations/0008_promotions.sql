-- Admin-managed promotion catalog. Claims keep promo_code as the promotion id.
create table if not exists promotions (
  id             text primary key,
  title          text not null,
  subtitle       text not null default '',
  kind           text not null default 'deposit',
  bonus_type     text not null default 'fixed',
  bonus_percent  numeric(8, 2) not null default 0,
  bonus_amount   numeric(14, 2) not null default 0,
  min_deposit    numeric(14, 2) not null default 0,
  turnover_x     numeric(8, 2) not null default 0,
  max_bonus      numeric(14, 2) not null default 0,
  starts_at      timestamptz,
  ends_at        timestamptz,
  rules          text not null default '',
  enabled        boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint promotions_kind_ok check (kind in ('welcome', 'deposit', 'daily_first', 'cashback', 'timed')),
  constraint promotions_bonus_type_ok check (bonus_type in ('fixed', 'percent'))
);

alter table promo_claims drop constraint if exists promo_claims_code_ok;
alter table promo_claims add column if not exists turnover_need numeric(14, 2) not null default 0;

insert into promotions (
  id, title, subtitle, kind, bonus_type, bonus_amount, min_deposit, turnover_x, rules, enabled
) values
  (
    'deposit200',
    'ฝาก 200 ฟรี 200',
    'เล่นได้ทุกอย่าง',
    'deposit',
    'fixed',
    200,
    200,
    1,
    'ฝากขั้นต่ำ 200 บาท แล้วกดรับโปร ระบบแจ้งแอดมินตรวจยอด เมื่ออนุมัติได้โบนัส 200 ใช้แทงหวยและบอลได้ทั้งหมด',
    true
  ),
  (
    'welcome50',
    'สมัครใหม่รับฟรี 50',
    'โบนัสต้อนรับสมาชิกใหม่',
    'welcome',
    'fixed',
    50,
    0,
    1,
    'กดรับได้ครั้งเดียวต่อบัญชี ระบบแจ้งแอดมิน เมื่ออนุมัติได้เครดิต 50 บาท',
    true
  )
on conflict (id) do nothing;
