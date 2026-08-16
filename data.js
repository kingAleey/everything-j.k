/* =====================================================
   EVERYTHING J&K — Store data
   Seeded from Instagram @everything_j.k (Katsina, Nigeria)
   Initial fallback data only — live products and settings are stored in Supabase
   ===================================================== */
window.JK_PRODUCTS = [
  {
    id: "p1",
    name: "Non-Tarnish Mini Necklace & Wrist Stack",
    category: "Accessories",
    price: 8500,
    oldPrice: 10000,
    status: "available",
    image: "assets/hero.jpg",
    desc: "Non-tarnish affordable shine. Stack them, gift them, keep them — the piece everyone keeps asking about."
  },
  {
    id: "p2",
    name: "New Design Men Slippers",
    category: "Footwear",
    price: 15000,
    oldPrice: null,
    status: "sold",
    image: "assets/slippers.jpg",
    desc: "Fresh import, pure slipper swag. This batch sold out fast — back in the next drop."
  },
  {
    id: "p3",
    name: "Baby Diaper Basket",
    category: "Baby & Gift",
    price: 22500,
    oldPrice: null,
    status: "sold",
    image: "assets/basket.jpg",
    desc: "Adorable keepsake basket every new mama melts over. Restocking soon."
  },
  {
    id: "p4",
    name: "Fresh Import Drop",
    category: "New Arrivals",
    price: 0,
    oldPrice: null,
    status: "coming",
    image: "assets/air-shipping.jpg",
    desc: "Last air-shipping batch has landed — new drops land every few weeks. Follow for drop alerts."
  },
  {
    id: "p5",
    name: "Gift-Ready Packaging",
    category: "Accessories",
    price: 0,
    oldPrice: null,
    status: "available",
    image: "assets/packaging.jpg",
    desc: "Signature handle-with-love branding. Included free with every single order."
  },
  {
    id: "p6",
    name: "Nationwide Delivery",
    category: "Services",
    price: 0,
    oldPrice: null,
    status: "available",
    image: "assets/order.jpg",
    desc: "From Katsina to every corner of Nigeria 🇳🇬. Packed, sealed and tracked until it lands — shipping quoted after your DM."
  }
];

window.JK_SETTINGS = {
  shopName: "Everything J&K",
  tagline: "Affordable fashion & lifestyle finds — imported in batches, packed with love, delivered nationwide.",
  announcement: "Prices changing soon! Secure your favourites at current prices ✨",
  instagram: "everything_j.k",
  tiktok: "everything_j.k",
  email: "kingkadooh@gmail.com",
  whatsapp: "",
  location: "Katsina, Nigeria",
  deliveryNote: "Nationwide delivery across Nigeria 🇳🇬 — shipping is quoted after your DM.",
  heroLogo: "",
  heroLogoAnimation: "fade"
};
