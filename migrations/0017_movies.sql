create table if not exists movies (
  id text primary key,
  title text not null,
  subtitle text not null default '',
  category text not null default 'ทั่วไป',
  year text not null default '',
  poster_url text not null default '',
  video_url text not null default '',
  description text not null default '',
  published boolean not null default true,
  featured boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists movie_banners (
  id text primary key,
  title text not null default '',
  image_url text not null,
  link_url text not null default '',
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists movies_published_idx on movies (published, sort_order, created_at desc);
create index if not exists movie_banners_active_idx on movie_banners (active, sort_order, created_at desc);
