-- EVERYTHING J&K — SAFE SUPABASE SETUP / MIGRATION
-- Run this entire file in Supabase SQL Editor.
-- It is designed to preserve existing data and add only missing columns.
-- NEVER put a Supabase secret/service-role key in the website.

create table if not exists public.products (
  id text primary key,
  name text not null,
  category text not null default 'General',
  price integer not null default 0 check (price >= 0),
  old_price integer null check (old_price is null or old_price >= 0),
  status text not null default 'available' check (status in ('available','sold','coming')),
  image text not null default 'assets/hero.jpg',
  description text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- IMPORTANT: add missing columns to an already-created table instead of recreating it.
alter table public.products add column if not exists name text;
alter table public.products add column if not exists category text default 'General';
alter table public.products add column if not exists price integer default 0;
alter table public.products add column if not exists old_price integer;
alter table public.products add column if not exists status text default 'available';
alter table public.products add column if not exists image text default 'assets/hero.jpg';
alter table public.products add column if not exists description text default '';
alter table public.products add column if not exists sort_order integer default 0;
alter table public.products add column if not exists created_at timestamptz default now();
alter table public.products add column if not exists updated_at timestamptz default now();

create table if not exists public.shop_settings (
  id integer primary key default 1 check (id = 1),
  shop_name text not null default 'Everything J&K',
  tagline text not null default '',
  announcement text not null default '',
  instagram text not null default 'everything_j.k',
  tiktok text not null default 'everything_j.k',
  email text not null default '',
  whatsapp text not null default '',
  location text not null default 'Katsina, Nigeria',
  delivery_note text not null default '',
  hero_logo text not null default '',
  hero_logo_animation text not null default 'fade',
  updated_at timestamptz not null default now()
);

alter table public.shop_settings add column if not exists shop_name text default 'Everything J&K';
alter table public.shop_settings add column if not exists tagline text default '';
alter table public.shop_settings add column if not exists announcement text default '';
alter table public.shop_settings add column if not exists instagram text default 'everything_j.k';
alter table public.shop_settings add column if not exists tiktok text default 'everything_j.k';
alter table public.shop_settings add column if not exists email text default '';
alter table public.shop_settings add column if not exists whatsapp text default '';
alter table public.shop_settings add column if not exists location text default 'Katsina, Nigeria';
alter table public.shop_settings add column if not exists delivery_note text default '';
alter table public.shop_settings add column if not exists hero_logo text default '';
alter table public.shop_settings add column if not exists hero_logo_animation text default 'fade';
alter table public.shop_settings add column if not exists updated_at timestamptz default now();

-- Fill nulls introduced by adding columns to an older table.
update public.products set
  name = coalesce(name,'Unnamed product'),
  category = coalesce(category,'General'),
  price = coalesce(price,0),
  status = coalesce(status,'available'),
  image = coalesce(image,'assets/hero.jpg'),
  description = coalesce(description,''),
  sort_order = coalesce(sort_order,0),
  created_at = coalesce(created_at,now()),
  updated_at = coalesce(updated_at,now())
where name is null or category is null or price is null or status is null or image is null or description is null or sort_order is null or created_at is null or updated_at is null;

update public.shop_settings set
  shop_name = coalesce(shop_name,'Everything J&K'),
  tagline = coalesce(tagline,''),
  announcement = coalesce(announcement,''),
  instagram = coalesce(instagram,'everything_j.k'),
  tiktok = coalesce(tiktok,'everything_j.k'),
  email = coalesce(email,''),
  whatsapp = coalesce(whatsapp,''),
  location = coalesce(location,'Katsina, Nigeria'),
  delivery_note = coalesce(delivery_note,''),
  hero_logo = coalesce(hero_logo,''),
  hero_logo_animation = coalesce(hero_logo_animation,'fade'),
  updated_at = coalesce(updated_at,now());

insert into public.shop_settings (id)
values (1)
on conflict (id) do nothing;

-- Keep timestamps current.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_touch_updated_at on public.products;
create trigger products_touch_updated_at
before update on public.products
for each row execute function public.touch_updated_at();

drop trigger if exists settings_touch_updated_at on public.shop_settings;
create trigger settings_touch_updated_at
before update on public.shop_settings
for each row execute function public.touch_updated_at();

-- Admin authorization comes from Auth app_metadata, not user-editable metadata.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

alter table public.products enable row level security;
alter table public.shop_settings enable row level security;

grant select on public.products, public.shop_settings to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant update on public.shop_settings to authenticated;

drop policy if exists "public can read products" on public.products;
create policy "public can read products"
on public.products for select
to anon, authenticated
using (true);

drop policy if exists "public can read settings" on public.shop_settings;
create policy "public can read settings"
on public.shop_settings for select
to anon, authenticated
using (true);

drop policy if exists "admins can insert products" on public.products;
create policy "admins can insert products"
on public.products for insert
to authenticated
with check (public.is_admin());

drop policy if exists "admins can update products" on public.products;
create policy "admins can update products"
on public.products for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admins can delete products" on public.products;
create policy "admins can delete products"
on public.products for delete
to authenticated
using (public.is_admin());

drop policy if exists "admins can update settings" on public.shop_settings;
create policy "admins can update settings"
on public.shop_settings for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Public image bucket; only admins can upload/change/delete.
insert into storage.buckets (id,name,public)
values ('jk-assets','jk-assets',true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "public can read jk assets" on storage.objects;
create policy "public can read jk assets"
on storage.objects for select
to public
using (bucket_id='jk-assets');

drop policy if exists "admins can upload jk assets" on storage.objects;
create policy "admins can upload jk assets"
on storage.objects for insert
to authenticated
with check (bucket_id='jk-assets' and public.is_admin());

drop policy if exists "admins can update jk assets" on storage.objects;
create policy "admins can update jk assets"
on storage.objects for update
to authenticated
using (bucket_id='jk-assets' and public.is_admin())
with check (bucket_id='jk-assets' and public.is_admin());

drop policy if exists "admins can delete jk assets" on storage.objects;
create policy "admins can delete jk assets"
on storage.objects for delete
to authenticated
using (bucket_id='jk-assets' and public.is_admin());

-- Seed only missing products. Existing rows are NEVER overwritten.
insert into public.products (id,name,category,price,old_price,status,image,description,sort_order)
values
('p1','Non-Tarnish Mini Necklace & Wrist Stack','Accessories',8500,10000,'available','assets/hero.jpg','Non-tarnish affordable shine. Stack them, gift them, keep them — the piece everyone keeps asking about.',1),
('p2','New Design Men Slippers','Footwear',15000,null,'sold','assets/slippers.jpg','Fresh import, pure slipper swag. This batch sold out fast — back in the next drop.',2),
('p3','Baby Diaper Basket','Baby & Gift',22500,null,'sold','assets/basket.jpg','Adorable keepsake basket every new mama melts over. Restocking soon.',3),
('p4','Fresh Import Drop','New Arrivals',0,null,'coming','assets/air-shipping.jpg','Last air-shipping batch has landed — new drops land every few weeks. Follow for drop alerts.',4),
('p5','Gift-Ready Packaging','Accessories',0,null,'available','assets/packaging.jpg','Signature handle-with-love branding. Included free with every single order.',5),
('p6','Nationwide Delivery','Services',0,null,'available','assets/order.jpg','From Katsina to every corner of Nigeria 🇳🇬. Packed, sealed and tracked until it lands — shipping quoted after your DM.',6)
on conflict (id) do nothing;

-- Only initialize blank/default settings. Do not overwrite settings you already changed.
update public.shop_settings set
  shop_name = case when coalesce(shop_name,'')='' then 'Everything J&K' else shop_name end,
  tagline = case when coalesce(tagline,'')='' then 'Affordable fashion & lifestyle finds — imported in batches, packed with love, delivered nationwide.' else tagline end,
  announcement = case when coalesce(announcement,'')='' then 'Prices changing soon! Secure your favourites at current prices ✨' else announcement end,
  instagram = case when coalesce(instagram,'')='' then 'everything_j.k' else instagram end,
  tiktok = case when coalesce(tiktok,'')='' then 'everything_j.k' else tiktok end,
  email = case when coalesce(email,'')='' then 'kingkadooh@gmail.com' else email end,
  location = case when coalesce(location,'')='' then 'Katsina, Nigeria' else location end,
  delivery_note = case when coalesce(delivery_note,'')='' then 'Nationwide delivery across Nigeria 🇳🇬 — shipping is quoted after your DM.' else delivery_note end
where id=1;

-- Verification queries: these return data and let you confirm the setup.
select count(*) as products_count from public.products;
select id, shop_name, hero_logo_animation from public.shop_settings where id=1;
