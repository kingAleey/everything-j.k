/* =====================================================
   EVERYTHING J&K — Storefront logic
   Cart + checkout that redirects to Instagram DM
   ===================================================== */
(function () {
  "use strict";

  /* ---------- Data ---------- */
  var SAVED_PRODUCTS = null, SAVED_SETTINGS = null;
  try {
    SAVED_PRODUCTS = JSON.parse(localStorage.getItem("jk_products") || "null");
    SAVED_SETTINGS = JSON.parse(localStorage.getItem("jk_settings") || "null");
  } catch (e) {}
  var PRODUCTS = SAVED_PRODUCTS || (window.JK_PRODUCTS || []);
  var SETTINGS = Object.assign({}, window.JK_SETTINGS || {}, SAVED_SETTINGS || {});
  var CATEGORIES = ["All"];
  PRODUCTS.forEach(function (p) { if (CATEGORIES.indexOf(p.category) < 0) CATEGORIES.push(p.category); });
  var activeCat = "All";
  var cart = loadCart();

  /* ---------- Helpers ---------- */
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function fmt(n) {
    if (n == null) return "₦0";
    return "₦" + Number(n).toLocaleString("en-NG");
  }
  function priceLabel(p) {
    if (!p.price) return '<span class="price-on-dm">PRICE ON DM 💬</span>';
    var o = p.oldPrice ? '<span class="old-price">' + fmt(p.oldPrice) + "</span>" : "";
    return '<span class="price">' + fmt(p.price) + "</span>" + o;
  }
  function statusLabel(s) {
    if (s === "sold") return '<span class="tag sold">Sold Out</span>';
    if (s === "coming") return '<span class="tag coming">Coming Soon</span>';
    return '<span class="tag available">Available</span>';
  }
  function canOrder(p) { return p.status !== "sold" && p.status !== "coming"; }

  /* ---------- Cart persistence ---------- */
  function loadCart() {
    try { return JSON.parse(localStorage.getItem("jk_cart") || "[]"); } catch (e) { return []; }
  }
  function saveCart() { localStorage.setItem("jk_cart", JSON.stringify(cart)); }
  function cartCount() { return cart.reduce(function (a, i) { return a + i.qty; }, 0); }
  function cartSubtotal() {
    return cart.reduce(function (a, i) {
      var p = PRODUCTS.find(function (x) { return x.id === i.id; });
      return a + (p && p.price ? p.price * i.qty : 0);
    }, 0);
  }

  /* ---------- Toast ---------- */
  var toastTimer = null;
  function toast(msg, isErr) {
    var t = $("toast");
    t.textContent = msg;
    t.className = "toast show" + (isErr ? " error" : "");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.className = "toast"; }, 2600);
  }

  /* ---------- Render: nav categories ---------- */
  function renderCats() {
    var html = "";
    CATEGORIES.forEach(function (c) {
      html += '<li><button data-cat="' + esc(c) + '" class="' + (c === activeCat ? "active" : "") + '">' + esc(c) + "</button></li>";
    });
    $("catNav").innerHTML = html;
    var mhtml = "";
    CATEGORIES.forEach(function (c) {
      mhtml += '<button data-cat="' + esc(c) + '" class="pill' + (c === activeCat ? '" style="background:rgba(139,92,246,.3)"' : '"') + ">" + esc(c) + "</button>";
    });
    $("mobileCats").innerHTML = mhtml;
    document.querySelectorAll("#catNav button, #mobileCats button").forEach(function (b) {
      b.addEventListener("click", function () {
        activeCat = b.getAttribute("data-cat");
        document.querySelectorAll("#catNav button").forEach(function (x) { x.classList.toggle("active", x === b); });
        var mc = document.querySelector(".mobile-cats");
        if (mc) mc.classList.remove("open");
        renderCats();
        renderProducts();
      });
    });
  }

  /* ---------- Render: products ---------- */
  function renderProducts() {
    var list = activeCat === "All" ? PRODUCTS : PRODUCTS.filter(function (p) { return p.category === activeCat; });
    $("resultCount").textContent = list.length + " item" + (list.length === 1 ? "" : "s");
    if (!list.length) {
      $("productGrid").innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--muted)">Nothing here yet — check back soon. ✨</p>';
      return;
    }
    $("productGrid").innerHTML = list.map(function (p) {
      return (
        '<div class="card reveal" data-id="' + esc(p.id) + '">' +
          statusLabel(p.status) +
          '<div class="img-wrap">' +
            '<img src="' + esc(p.image) + '" alt="' + esc(p.name) + '" loading="lazy">' +
            '<button class="quick-add" data-add="' + esc(p.id) + '"' + (canOrder(p) ? "" : " disabled") + ">" +
              (canOrder(p) ? "ADD TO CART +" : "UNAVAILABLE") +
            "</button>" +
          "</div>" +
          '<div class="card-body">' +
            '<span class="cat">' + esc(p.category) + "</span>" +
            "<h3>" + esc(p.name) + "</h3>" +
            '<p class="desc">' + esc((p.desc || "").slice(0, 90)) + (p.desc && p.desc.length > 90 ? "…" : "") + "</p>" +
            '<div class="price-row">' + priceLabel(p) + "</div>" +
          "</div>" +
        "</div>"
      );
    }).join("");
    document.querySelectorAll("#productGrid .card").forEach(function (card) {
      card.addEventListener("click", function (e) {
        if (e.target.closest(".quick-add")) return;
        openQuickView(card.getAttribute("data-id"));
      });
    });
    document.querySelectorAll("#productGrid .quick-add").forEach(function (b) {
      b.addEventListener("click", function () { addToCart(b.getAttribute("data-add"), 1); });
    });
    reveal();
  }

  /* ---------- Quick view ---------- */
  function openQuickView(id) {
    var p = PRODUCTS.find(function (x) { return x.id === id; });
    if (!p) return;
    $("qvModal").innerHTML =
      '<button class="modal-close" id="qvClose">✕</button>' +
      '<div class="modal-grid">' +
        '<img src="' + esc(p.image) + '" alt="' + esc(p.name) + '">' +
        '<div class="modal-info">' +
          '<span class="cat">' + esc(p.category) + "</span>" +
          "<h3>" + esc(p.name) + "</h3>" +
          '<div class="price-row" style="margin-bottom:.8rem">' + priceLabel(p) + "</div>" +
          '<p class="desc">' + esc(p.desc || "") + "</p>" +
          '<div class="qty-row">' +
            '<div class="qty-stepper">' +
              '<button id="qvMinus">−</button><span id="qvQty">1</span><button id="qvPlus">+</button>' +
            "</div>" +
            "<span style='color:var(--muted);font-size:.85rem'>Quantity</span>" +
          "</div>" +
          '<div class="modal-actions">' +
            '<button class="glow-btn btn-primary" id="qvAdd"' + (canOrder(p) ? "" : " disabled") + ">" +
              (canOrder(p) ? "ADD TO CART — " + fmt(p.price || 0) : "SOLD OUT") +
            "</button>" +
            '<a class="glow-btn btn-ghost" href="https://ig.me/m/' + encodeURIComponent(SETTINGS.instagram || "everything_j.k") +
              '" target="_blank" rel="noopener">Ask a question 📩</a>' +
          "</div>" +
        "</div>" +
      "</div>";
    $("qvBackdrop").classList.add("open");
    var qty = 1;
    var qtyEl = $("qvQty");
    $("qvMinus").addEventListener("click", function () { qty = Math.max(1, qty - 1); qtyEl.textContent = qty; });
    $("qvPlus").addEventListener("click", function () { qty = Math.min(99, qty + 1); qtyEl.textContent = qty; });
    $("qvAdd").addEventListener("click", function () {
      addToCart(id, qty);
      closeQuickView();
    });
    $("qvClose").addEventListener("click", closeQuickView);
  }
  function closeQuickView() { $("qvBackdrop").classList.remove("open"); }

  /* ---------- Cart ---------- */
  function addToCart(id, qty) {
    var p = PRODUCTS.find(function (x) { return x.id === id; });
    if (!p || !canOrder(p)) return;
    var line = cart.find(function (i) { return i.id === id; });
    if (line) line.qty = Math.min(99, line.qty + qty);
    else cart.push({ id: id, qty: qty });
    saveCart();
    renderCart();
    toast("✅ Added to cart — " + p.name);
  }
  function changeQty(id, d) {
    var line = cart.find(function (i) { return i.id === id; });
    if (!line) return;
    line.qty += d;
    if (line.qty <= 0) cart = cart.filter(function (i) { return i.id !== id; });
    saveCart();
    renderCart();
  }
  function removeItem(id) {
    cart = cart.filter(function (i) { return i.id !== id; });
    saveCart();
    renderCart();
  }
  function renderCart() {
    var count = cartCount();
    $("cartCount").style.display = count ? "grid" : "none";
    $("cartCount").textContent = count;
    $("cartTotal").textContent = fmt(cartSubtotal());
    var box = $("cartItems");
    if (!cart.length) {
      box.innerHTML = '<div class="cart-empty"><b>🛒</b>Your cart is empty.<br>Add something you love from the drops!</div>';
      $("drawerFoot").style.display = "none";
      $("checkoutBtn").disabled = true;
      return;
    }
    $("drawerFoot").style.display = "flex";
    box.innerHTML = cart.map(function (line) {
      var p = PRODUCTS.find(function (x) { return x.id === line.id; });
      if (!p) return "";
      return (
        '<div class="cart-item">' +
          '<img src="' + esc(p.image) + '" alt="">' +
          '<div>' +
            '<div class="ci-name">' + esc(p.name) + "</div>" +
            '<div class="ci-price">' + fmt(p.price || 0) + "</div>" +
          "</div>" +
          '<div class="ci-controls">' +
            '<div class="ci-qty">' +
              '<button data-q="' + esc(p.id) + '" data-d="-1">−</button>' +
              "<span>" + line.qty + "</span>" +
              '<button data-q="' + esc(p.id) + '" data-d="1">+</button>' +
            "</div>" +
            '<button class="ci-remove" data-rm="' + esc(p.id) + '">REMOVE</button>' +
          "</div>" +
        "</div>"
      );
    }).join("");
    box.querySelectorAll("[data-q]").forEach(function (b) {
      b.addEventListener("click", function () { changeQty(b.getAttribute("data-q"), +b.getAttribute("data-d")); });
    });
    box.querySelectorAll("[data-rm]").forEach(function (b) {
      b.addEventListener("click", function () { removeItem(b.getAttribute("data-rm")); });
    });
    $("subtotalAmt").textContent = fmt(cartSubtotal());
    $("checkoutBtn").disabled = !cart.length;
  }

  /* ---------- Checkout ---------- */
  function openCheckout() {
    if (!cart.length) return;
    $("checkoutModal").innerHTML =
      '<button class="modal-close" id="ckClose">✕</button>' +
      '<div class="modal-info" style="padding:2rem">' +
        '<span class="cat">// Almost there</span>' +
        "<h3>Final Step — Your <span class='grad-text'>Details</span></h3>" +
        '<p class="desc" style="margin-bottom:1.2rem">Add your name and delivery state so your order summary is ready to paste into our Instagram DM. 💌</p>' +
        '<label style="font-size:.78rem;color:var(--muted);letter-spacing:.08em;display:block;margin-bottom:.35rem">YOUR NAME</label>' +
        '<input id="ckName" class="admin-input" style="margin-bottom:1rem" placeholder="e.g. Aisha B.">' +
        '<label style="font-size:.78rem;color:var(--muted);letter-spacing:.08em;display:block;margin-bottom:.35rem">DELIVERY STATE</label>' +
        '<input id="ckState" class="admin-input" placeholder="e.g. Katsina, Kaduna, Lagos…">' +
        '<div class="modal-actions" style="margin-top:1.4rem">' +
          '<button class="glow-btn btn-primary" id="ckGo" style="width:100%">📲 CONTINUE TO INSTAGRAM DM</button>' +
        "</div>" +
      "</div>";
    $("checkoutBackdrop").classList.add("open");
    $("ckClose").addEventListener("click", function () { $("checkoutBackdrop").classList.remove("open"); });
    $("ckGo").addEventListener("click", buildOrderMessage);
    setTimeout(function () { var n = $("ckName"); if (n) n.focus(); }, 60);
  }

  function buildOrderMessage() {
    var name = ($("ckName").value || "").trim();
    var state = ($("ckState").value || "").trim();
    var lines = cart.map(function (line) {
      var p = PRODUCTS.find(function (x) { return x.id === line.id; });
      var priceTxt = p.price ? "₦" + (p.price * line.qty).toLocaleString("en-NG") : "price on DM";
      return "• " + line.qty + "x " + p.name + " — " + priceTxt;
    });
    var msg =
      "Hi Everything J&K! 🤩 I'd like to place an order:\n\n" +
      lines.join("\n") +
      "\n\n💰 Subtotal: " + fmt(cartSubtotal()) +
      (name ? "\n👤 Name: " + name : "") +
      (state ? "\n📍 Delivery to: " + state : "") +
      "\n\nPlease confirm availability & total. Thank you! 💜";
    copyText(msg);
    var ig = "https://ig.me/m/" + encodeURIComponent(SETTINGS.instagram || "everything_j.k");
    window.open(ig, "_blank");
    $("checkoutBackdrop").classList.remove("open");
    showSummary(msg);
  }

  function showSummary(msg) {
    $("summaryModal").innerHTML =
      '<button class="modal-close" id="smClose">✕</button>' +
      '<div class="modal-info" style="padding:2rem">' +
        '<span class="cat">// Order ready</span>' +
        "<h3>Open Instagram & <span class='grad-text'>Paste</span> 📋</h3>" +
        '<p class="desc" style="margin-bottom:1rem">We opened Instagram in a new tab and copied your order summary to the clipboard. Open the chat with <b>@' + esc(SETTINGS.instagram || "everything_j.k") + '</b> and paste it there. If the copy didn\'t work, use the button below:</p>' +
        '<div style="background:rgba(139,92,246,.08);border:1px solid rgba(139,92,246,.3);border-radius:14px;padding:1rem;font-size:.82rem;white-space:pre-wrap;color:var(--text);margin-bottom:1.2rem;max-height:240px;overflow-y:auto">' + esc(msg) + "</div>" +
        '<div class="modal-actions">' +
          '<button class="glow-btn btn-ghost" id="smCopy">📋 Copy Again</button>' +
          '<a class="glow-btn btn-primary" href="' + esc("https://ig.me/m/" + encodeURIComponent(SETTINGS.instagram || "everything_j.k")) + '" target="_blank" rel="noopener">📲 Open Instagram DM</a>' +
        "</div>" +
      "</div>";
    $("summaryBackdrop").classList.add("open");
    $("smClose").addEventListener("click", function () { $("summaryBackdrop").classList.remove("open"); });
    $("smCopy").addEventListener("click", function () {
      copyText(msg);
      toast("✅ Order summary copied again!");
    });
    cart = [];
    saveCart();
    renderCart();
  }

  function copyText(txt) {
    function legacy() {
      var ta = document.createElement("textarea");
      ta.value = txt;
      ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch (e) {}
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).catch(legacy);
    } else legacy();
  }

  /* ---------- Settings render ---------- */
  function renderSettings() {
    var ig = SETTINGS.instagram || "everything_j.k";
    var tk = SETTINGS.tiktok || "";
    var em = SETTINGS.email || "";
    var ws = SETTINGS.whatsapp || "";
    $("announceBar").innerHTML = '<i>✨</i> ' + esc(SETTINGS.announcement || "");
    $("heroShopName").textContent = SETTINGS.shopName || "J&K";
    $("heroTagline").textContent = SETTINGS.tagline || "";
    var heroLogo = $("heroLogo"), heroLogoWrap = $("heroLogoWrap"), heroTitle = $("heroTitle");
    if (heroLogo && heroLogoWrap && heroTitle) {
      if (SETTINGS.heroLogo) {
        heroLogo.src = SETTINGS.heroLogo;
        heroLogoWrap.className = "hero-logo-wrap logo-anim-" + (SETTINGS.heroLogoAnimation || "fade");
        heroLogoWrap.classList.remove("hidden");
        heroTitle.classList.add("has-custom-logo");
      } else {
        heroLogoWrap.className = "hero-logo-wrap hidden";
        heroTitle.classList.remove("has-custom-logo");
      }
    }
    var heroLogo = $("heroLogo"), heroLogoWrap = $("heroLogoWrap"), heroTitle = $("heroTitle");
    if (heroLogo && heroLogoWrap && heroTitle) {
      if (SETTINGS.heroLogo) {
        heroLogo.src = SETTINGS.heroLogo;
        heroLogoWrap.className = "hero-logo-wrap " + "logo-anim-" + (SETTINGS.heroLogoAnimation || "fade");
        heroLogoWrap.classList.remove("hidden");
        heroTitle.classList.add("has-custom-logo");
      } else {
        heroLogoWrap.className = "hero-logo-wrap hidden";
        heroTitle.classList.remove("has-custom-logo");
      }
    }
    $("heroLocation").textContent = SETTINGS.location || "";
    $("heroIgLink").href = "https://ig.me/m/" + encodeURIComponent(ig);
    $("heroIgLink").innerHTML = "📲 Preorder on Instagram";
    $("contactIg").href = "https://ig.me/m/" + encodeURIComponent(ig);
    $("contactIg").innerHTML = "📲 DM @" + esc(ig);
    $("contactTikTok").href = tk ? "https://www.tiktok.com/@" + encodeURIComponent(tk) : "#";
    $("contactTikTok").style.display = tk ? "" : "none";
    $("deliveryNote").textContent = SETTINGS.deliveryNote || "";
    var links = '<a href="mailto:' + esc(em) + '">✉️ ' + esc(em) + "</a>";
    links += '<a href="https://www.instagram.com/' + encodeURIComponent(ig) + '" target="_blank" rel="noopener">📸 instagram.com/' + esc(ig) + "</a>";
    if (tk) links += `<a href="https://www.tiktok.com/@${encodeURIComponent(tk)}" target="_blank" rel="noopener">🎵 tiktok.com/@${esc(tk)}</a>`;
    $("contactLinks").innerHTML = links;
    var soc = '<a href="https://www.instagram.com/' + encodeURIComponent(ig) + '" target="_blank" rel="noopener" aria-label="Instagram">📸</a>';
    if (tk) soc += `<a href="https://www.tiktok.com/@${encodeURIComponent(tk)}" target="_blank" rel="noopener" aria-label="TikTok">🎵</a>`;
    soc += '<a href="mailto:' + esc(em) + '" aria-label="Email">✉️</a>';
    if (ws) soc += '<a href="https://wa.me/' + encodeURIComponent(ws.replace(/\D/g, "")) + '" target="_blank" rel="noopener" aria-label="WhatsApp">💬</a>';
    $("socialLinks").innerHTML = soc;
    $("footerShopName").textContent = SETTINGS.shopName || "Everything J&K";
    $("footerLocation").textContent = SETTINGS.location || "";
    $("footerIg").href = "https://www.instagram.com/" + encodeURIComponent(ig);
    $("footerIg").textContent = "@" + ig;
  }

  /* ---------- Ticker ---------- */
  function renderTicker() {
    var words = ["#AffordableFashion", "#Preorder", "Nationwide Delivery", "#BrandIdentity", "Handle With Love", "Fresh Imports", "#SmallBusinessOwner"];
    var html = '<span>' + words.map(function (w) { return w + " ✦ "; }).join("") + "</span>";
    $("tickerTrack").innerHTML = html + html;
  }

  /* ---------- Reveal on scroll ---------- */
  function reveal() {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("show"); io.unobserve(e.target); } });
    }, { threshold: 0.1 });
    document.querySelectorAll(".reveal:not(.show)").forEach(function (el) { io.observe(el); });
  }

  /* ---------- Init ---------- */
  function init() {
    $("year").textContent = new Date().getFullYear();
    renderSettings();
    renderTicker();
    renderCats();
    renderProducts();
    renderCart();
    reveal();

    // drawer
    $("cartBtn").addEventListener("click", function () {
      $("cartDrawer").classList.add("open");
      $("drawerBackdrop").classList.add("open");
    });
    function closeDrawer() {
      $("cartDrawer").classList.remove("open");
      $("drawerBackdrop").classList.remove("open");
    }
    $("drawerClose").addEventListener("click", closeDrawer);
    $("drawerBackdrop").addEventListener("click", closeDrawer);
    $("checkoutBtn").addEventListener("click", function () {
      closeDrawer();
      openCheckout();
    });

    // mobile burger → scroll to cats
    $("burger").addEventListener("click", function () {
      var mc = document.querySelector(".mobile-cats");
      mc.classList.toggle("open");
    });

    // esc closes modals
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        $("qvBackdrop").classList.remove("open");
        $("checkoutBackdrop").classList.remove("open");
        $("summaryBackdrop").classList.remove("open");
        closeDrawer();
      }
    });
    // click outside modal
    [$("qvBackdrop"), $("checkoutBackdrop"), $("summaryBackdrop")].forEach(function (bd) {
      bd.addEventListener("click", function (e) { if (e.target === bd) bd.classList.remove("open"); });
    });

    // hero tilt
    var hv = $("heroVisual");
    document.addEventListener("mousemove", function (e) {
      if (!hv || window.innerWidth < 920) return;
      var r = hv.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5;
      var y = (e.clientY - r.top) / r.height - 0.5;
      hv.style.transform = "perspective(900px) rotateY(" + (x * 7) + "deg) rotateX(" + (-y * 7) + "deg)";
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
