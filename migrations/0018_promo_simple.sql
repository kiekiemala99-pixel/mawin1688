alter table promotions add column if not exists image_url text not null default '';
alter table promotions add column if not exists play_need numeric(14, 2) not null default 0;
alter table promotions add column if not exists withdraw_max numeric(14, 2) not null default 0;
