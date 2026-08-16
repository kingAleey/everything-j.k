-- EVERYTHING J&K — Supabase production setup
-- Run once in Supabase SQL Editor.
-- After creating your admin Auth user, set its app_metadata to:
-- { "role": "admin" }
-- Then the dashboard can write to products/settings and storage.

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

insert into public.shop_settings (id)
values (1)
on conflict (id) do nothing;

-- Timestamp helpers.
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

-- Admin role helper. Role is stored in Supabase Auth app_metadata,
-- which normal users cannot edit from the browser.
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

-- Least-privilege Data API grants. RLS remains the final authorization layer.
grant select on public.products, public.shop_settings to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant update on public.shop_settings to authenticated;

-- Public storefront: read only.
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

-- Admin-only writes.
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

-- Public product/logo storage.
insert into storage.buckets (id, name, public)
values ('jk-assets', 'jk-assets', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "public can read jk assets" on storage.objects;
create policy "public can read jk assets"
on storage.objects for select
to public
using (bucket_id = 'jk-assets');

drop policy if exists "admins can upload jk assets" on storage.objects;
create policy "admins can upload jk assets"
on storage.objects for insert
to authenticated
with check (bucket_id = 'jk-assets' and public.is_admin());

drop policy if exists "admins can update jk assets" on storage.objects;
create policy "admins can update jk assets"
on storage.objects for update
to authenticated
using (bucket_id = 'jk-assets' and public.is_admin())
with check (bucket_id = 'jk-assets' and public.is_admin());

drop policy if exists "admins can delete jk assets" on storage.objects;
create policy "admins can delete jk assets"
on storage.objects for delete
to authenticated
using (bucket_id = 'jk-assets' and public.is_admin());

-- Initial products/settings seed. Existing IDs are preserved so carts/bookmarks remain stable.
insert into public.products (id,name,category,price,old_price,status,image,description,sort_order)
values
('p1','Non-Tarnish Mini Necklace & Wrist Stack','Accessories',8500,10000,'available','assets/hero.jpg','Non-tarnish affordable shine. Stack them, gift them, keep them — the piece everyone keeps asking about.',1),
('p2','New Design Men Slippers','Footwear',15000,null,'sold','assets/slippers.jpg','Fresh import, pure slipper swag. This batch sold out fast — back in the next drop.',2),
('p3','Baby Diaper Basket','Baby & Gift',22500,null,'sold','assets/basket.jpg','Adorable keepsake basket every new mama melts over. Restocking soon.',3),
('p4','Fresh Import Drop','New Arrivals',0,null,'coming','assets/air-shipping.jpg','Last air-shipping batch has landed — new drops land every few weeks. Follow for drop alerts.',4),
('p5','Gift-Ready Packaging','Accessories',0,null,'available','assets/packaging.jpg','Signature handle-with-love branding. Included free with every single order.',5),
('p6','Nationwide Delivery','Services',0,null,'available','assets/order.jpg','From Katsina to every corner of Nigeria 🇳🇬. Packed, sealed and tracked until it lands — shipping quoted after your DM.',6)
on conflict (id) do nothing;

update public.shop_settings set
  shop_name='Everything J&K',
  tagline='Affordable fashion & lifestyle finds — imported in batches, packed with love, delivered nationwide.',
  announcement='Prices changing soon! Secure your favourites at current prices ✨',
  instagram='everything_j.k',
  tiktok='everything_j.k',
  email='kingkadooh@gmail.com',
  whatsapp='',
  location='Katsina, Nigeria',
  delivery_note='Nationwide delivery across Nigeria 🇳🇬 — shipping is quoted after your DM.'
where id=1;
