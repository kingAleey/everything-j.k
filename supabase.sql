-- EVERYTHING J&K — Supabase setup
-- Run this whole file in Supabase SQL Editor.

create table if not exists public.products (
  id text primary key,
  name text not null,
  category text not null default 'General',
  price numeric not null default 0,
  old_price numeric,
  status text not null default 'available' check (status in ('available','sold','coming')),
  image text not null default '',
  description text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.shop_settings (
  id integer primary key default 1 check (id = 1),
  shop_name text not null default 'Everything J&K',
  tagline text not null default '',
  announcement text not null default '',
  instagram text not null default '',
  tiktok text not null default '',
  email text not null default '',
  whatsapp text not null default '',
  location text not null default '',
  delivery_note text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.products enable row level security;
alter table public.shop_settings enable row level security;

-- Public visitors can read the catalogue and shop settings.
drop policy if exists "Public can read products" on public.products;
create policy "Public can read products"
on public.products for select
to anon, authenticated
using (true);

drop policy if exists "Public can read shop settings" on public.shop_settings;
create policy "Public can read shop settings"
on public.shop_settings for select
to anon, authenticated
using (true);

-- Only signed-in Supabase Auth users can change the store.
drop policy if exists "Authenticated can insert products" on public.products;
create policy "Authenticated can insert products"
on public.products for insert
to authenticated
with check (true);

drop policy if exists "Authenticated can update products" on public.products;
create policy "Authenticated can update products"
on public.products for update
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated can delete products" on public.products;
create policy "Authenticated can delete products"
on public.products for delete
to authenticated
using (true);

drop policy if exists "Authenticated can update shop settings" on public.shop_settings;
create policy "Authenticated can update shop settings"
on public.shop_settings for update
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated can insert shop settings" on public.shop_settings;
create policy "Authenticated can insert shop settings"
on public.shop_settings for insert
to authenticated
with check (true);

-- Least-privilege Data API grants.
grant select on public.products to anon, authenticated;
grant select on public.shop_settings to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant insert, update on public.shop_settings to authenticated;


-- Seed your existing catalogue.
insert into public.products (id,name,category,price,old_price,status,image,description)
values
('p1','Non-Tarnish Mini Necklace & Wrist Stack','Accessories',8500,10000,'available','assets/hero.jpg','Non-tarnish affordable shine. Stack them, gift them, keep them — the piece everyone keeps asking about.'),
('p2','New Design Men Slippers','Footwear',15000,null,'sold','assets/slippers.jpg','Fresh import, pure slipper swag. This batch sold out fast — back in the next drop.'),
('p3','Baby Diaper Basket','Baby & Gift',22500,null,'sold','assets/basket.jpg','Adorable keepsake basket every new mama melts over. Restocking soon.'),
('p4','Fresh Import Drop','New Arrivals',0,null,'coming','assets/air-shipping.jpg','Last air-shipping batch has landed — new drops land every few weeks. Follow for drop alerts.'),
('p5','Gift-Ready Packaging','Accessories',0,null,'available','assets/packaging.jpg','Signature handle-with-love branding. Included free with every single order.'),
('p6','Nationwide Delivery','Services',0,null,'available','assets/order.jpg','From Katsina to every corner of Nigeria 🇳🇬. Packed, sealed and tracked until it lands — shipping quoted after your DM.')
on conflict (id) do update set
name=excluded.name, category=excluded.category, price=excluded.price, old_price=excluded.old_price,
status=excluded.status, image=excluded.image, description=excluded.description, updated_at=now();

insert into public.shop_settings (id,shop_name,tagline,announcement,instagram,tiktok,email,whatsapp,location,delivery_note)
values (1,'Everything J&K','Affordable fashion & lifestyle finds — imported in batches, packed with love, delivered nationwide.','Prices changing soon! Secure your favourites at current prices ✨','everything_j.k','everything_j.k','kingkadooh@gmail.com','','Katsina, Nigeria','Nationwide delivery across Nigeria 🇳🇬 — shipping is quoted after your DM.')
on conflict (id) do update set
shop_name=excluded.shop_name, tagline=excluded.tagline, announcement=excluded.announcement,
instagram=excluded.instagram, tiktok=excluded.tiktok, email=excluded.email, whatsapp=excluded.whatsapp,
location=excluded.location, delivery_note=excluded.delivery_note, updated_at=now();
