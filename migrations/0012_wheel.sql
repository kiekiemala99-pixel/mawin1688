create table if not exists coupons (
  id text primary key,
  code text not null unique,
  spins int not null default 1,
  max_claims int not null default 0,
  claimed int not null default 0,
  expires_at timestamptz,
  enabled boolean not null default true,
  note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists coupon_claims (
  id text primary key,
  coupon_id text not null references coupons(id) on delete cascade,
  user_id text not null,
  remaining int not null default 0,
  created_at timestamptz not null default now(),
  unique (coupon_id, user_id)
);

create index if not exists coupon_claims_user_idx on coupon_claims (user_id);

create table if not exists wheel_settings (
  id text primary key,
  enabled boolean not null default true,
  title text not null default 'กงล้อมาวิน1688',
  updated_at timestamptz not null default now()
);

insert into wheel_settings (id, enabled, title)
values ('main', true, 'กงล้อมาวิน1688')
on conflict (id) do nothing;

create table if not exists wheel_segments (
  id text primary key,
  label text not null,
  amount numeric(14, 2) not null default 0,
  weight int not null default 1,
  color text not null default '#c9a44a',
  sort_order int not null default 0,
  enabled boolean not null default true
);

insert into wheel_segments (id, label, amount, weight, color, sort_order) values
  ('w0', '0 บาท', 0, 28, '#4a1d1d', 0),
  ('w5', '5 บาท', 5, 22, '#c9a44a', 1),
  ('w10', '10 บาท', 10, 18, '#8b1e1e', 2),
  ('w20', '20 บาท', 20, 12, '#d4b45a', 3),
  ('w50', '50 บาท', 50, 8, '#6b1520', 4),
  ('w88', '88 บาท', 88, 6, '#e4c35a', 5),
  ('w188', '188 บาท', 188, 4, '#9c781f', 6),
  ('w888', '888 บาท', 888, 2, '#f3e08a', 7)
on conflict (id) do nothing;

create table if not exists wheel_spins (
  id text primary key,
  user_id text not null,
  coupon_id text,
  segment_id text,
  label text not null,
  amount numeric(14, 2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists wheel_spins_user_idx on wheel_spins (user_id, created_at desc);
create index if not exists wheel_spins_created_idx on wheel_spins (created_at desc);

insert into coupons (id, code, spins, max_claims, note, enabled)
values ('cpn_seed', 'MAWIN1688', 3, 0, 'คูปองสาธิต · หมุนได้ 3 ครั้งต่อสมาชิก', true)
on conflict (code) do nothing;
