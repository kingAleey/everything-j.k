/* =====================================================
   EVERYTHING J&K — Admin Panel logic
   Login + product/pricing/image editor + data.js export
   ===================================================== */
(function () {
  "use strict";

  var DEFAULT_PASS = "jk2026";
  var STORE = {
    products: (function () {
      try { return JSON.parse(localStorage.getItem("jk_products") || "null") || window.JK_PRODUCTS; }
      catch (e) { return window.JK_PRODUCTS; }
    })(),
    settings: (function () {
      try { return Object.assign({}, window.JK_SETTINGS, JSON.parse(localStorage.getItem("jk_settings") || "{}")); }
      catch (e) { return window.JK_SETTINGS; }
    })()
  };
  var editingId = null;

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function fmt(n) { return n ? "₦" + Number(n).toLocaleString("en-NG") : "₦0"; }
  function statusLabel(s) {
    return { available: ["available", "Available"], sold: ["sold", "Sold Out"], coming: ["coming", "Coming Soon"] }[s] || ["available", "Available"];
  }

  /* ---------- Hashing (SHA-256) ---------- */
  async function sha256(str) {
    if (crypto.subtle) {
      var buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
      return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
    }
    var h = 0, i, chr;
    for (i = 0; i < str.length; i++) { chr = str.charCodeAt(i); h = ((h << 5) - h) + chr; h |= 0; }
    return "fallback-" + Math.abs(h);
  }
  function getStoredHash() { return localStorage.getItem("jk_admin_hash") || ""; }

  /* ---------- Toast ---------- */
  var toastTimer = null;
  function toast(msg, isErr) {
    var t = $("toast");
    t.textContent = msg;
    t.className = "toast show" + (isErr ? " error" : "");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.className = "toast"; }, 2600);
  }

  /* ---------- Supabase data + Auth ---------- */
  async function loadRemoteData() {
    if (!window.jkSupabase) return;
    var pr = await window.jkSupabase.from("products").select("*").order("updated_at", { ascending: false });
    if (pr.error) throw pr.error;
    STORE.products = (pr.data || []).map(function (p) {
      return { id:p.id, name:p.name, category:p.category, price:Number(p.price)||0, oldPrice:p.old_price == null ? null : Number(p.old_price), status:p.status, image:p.image, desc:p.description || "" };
    });
    var sr = await window.jkSupabase.from("shop_settings").select("*").eq("id",1).maybeSingle();
    if (sr.error) throw sr.error;
    if (sr.data) {
      STORE.settings = {
        shopName:sr.data.shop_name, tagline:sr.data.tagline, announcement:sr.data.announcement,
        location:sr.data.location, deliveryNote:sr.data.delivery_note, instagram:sr.data.instagram,
        tiktok:sr.data.tiktok, email:sr.data.email, whatsapp:sr.data.whatsapp
      };
    }
  }

  async function tryLogin(email, pass) {
    if (window.jkSupabase) {
      var result = await window.jkSupabase.auth.signInWithPassword({ email: email, password: pass });
      if (result.error) {
        $("loginErr").textContent = "❌ " + result.error.message;
        return;
      }
      sessionStorage.setItem("jk_admin_ok", "1");
      try { await loadRemoteData(); } catch (e) { toast("Could not load the online store data.", true); }
      showDash();
      toast("🔓 Welcome back, boss!");
      return;
    }
    /* Local fallback for offline development only. */
    var hash = getStoredHash();
    var ok = hash ? (await sha256(pass)) === hash : pass === DEFAULT_PASS;
    if (ok) { sessionStorage.setItem("jk_admin_ok", "1"); showDash(); }
    else $("loginErr").textContent = "❌ Wrong password. Try again.";
  }

  async function logout() {
    if (window.jkSupabase) await window.jkSupabase.auth.signOut();
    sessionStorage.removeItem("jk_admin_ok");
    showLogin();
  }
  function showLogin() {
    $("loginView").classList.remove("hidden");
    $("dashView").classList.add("hidden");
  }
  async function showDash() {
    $("loginView").classList.add("hidden");
    $("dashView").classList.remove("hidden");
    try { await loadRemoteData(); } catch (e) { console.warn(e); }
    renderList();
    fillSettings();
  }

  /* ---------- Product CRUD ---------- */
  async function persistProducts() {
    if (!window.jkSupabase) { localStorage.setItem("jk_products", JSON.stringify(STORE.products)); return; }
    var rows = STORE.products.map(function (p) {
      return { id:p.id, name:p.name, category:p.category || "General", price:Number(p.price)||0, old_price:p.oldPrice == null ? null : Number(p.oldPrice), status:p.status || "available", image:p.image || "", description:p.desc || "", updated_at:new Date().toISOString() };
    });
    var result = await window.jkSupabase.from("products").upsert(rows, { onConflict:"id" });
    if (result.error) throw result.error;
  }
  async function saveProduct(e) {
    e.preventDefault();
    var name = $("fName").value.trim();
    if (!name) { toast("Please enter a product name.", true); return; }
    var price = Math.max(0, parseInt($("fPrice").value, 10) || 0);
    var oldPrice = $("fOldPrice").value ? parseInt($("fOldPrice").value, 10) || null : null;
    var obj = {
      id: editingId || "p" + Date.now().toString(36),
      name: name,
      category: $("fCategory").value.trim() || "General",
      price: price,
      oldPrice: oldPrice,
      status: $("fStatus").value,
      image: currentImage || "assets/hero.jpg",
      desc: $("fDesc").value.trim()
    };
    if (editingId) {
      var i = STORE.products.findIndex(function (p) { return p.id === editingId; });
      if (i >= 0) STORE.products[i] = obj; else STORE.products.push(obj);
    } else {
      STORE.products.push(obj);
    }
    try { await persistProducts(); } catch (err) { toast("❌ Could not save to the online database: " + err.message, true); return; }
    editingId = null;
    resetForm();
    renderList();
    toast("✅ Product saved!");
  }
  function editProduct(id) {
    var p = STORE.products.find(function (x) { return x.id === id; });
    if (!p) return;
    editingId = id;
    $("fId").value = id;
    $("fName").value = p.name;
    $("fCategory").value = p.category || "";
    $("fPrice").value = p.price || "";
    $("fOldPrice").value = p.oldPrice || "";
    $("fStatus").value = p.status || "available";
    $("fDesc").value = p.desc || "";
    setImage(p.image);
    $("tab-products").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  async function deleteProduct(id) {
    if (!confirm("Delete this product permanently?")) return;
    STORE.products = STORE.products.filter(function (x) { return x.id !== id; });
    if (editingId === id) resetForm();
    try {
      if (window.jkSupabase) {
        var result = await window.jkSupabase.from("products").delete().eq("id", id);
        if (result.error) throw result.error;
      } else {
        await persistProducts();
      }
      renderList();
      toast("🗑 Product deleted.");
    } catch (err) { toast("❌ Could not delete online: " + err.message, true); }
  }
  function resetForm() {
    editingId = null;
    $("fId").value = "";
    $("fName").value = "";
    $("fCategory").value = "";
    $("fPrice").value = "";
    $("fOldPrice").value = "";
    $("fStatus").value = "available";
    $("fDesc").value = "";
    setImage("");
  }
  function renderList() {
    var box = $("productList");
    if (!STORE.products.length) {
      box.innerHTML = '<p style="color:var(--muted);font-size:.85rem">No products yet — add your first one! ✨</p>';
      return;
    }
    box.innerHTML = STORE.products.map(function (p) {
      var st = statusLabel(p.status);
      return (
        '<div class="p-row">' +
          '<img src="' + esc(p.image) + '" alt="">' +
          '<div><div class="p-name">' + esc(p.name) + "</div>" +
          '<div class="p-meta">' + esc(p.category) + " • " + fmt(p.price) + "</div></div>" +
          '<span class="p-status ' + st[0] + '">' + st[1] + "</span>" +
          '<div class="p-actions">' +
            '<button class="small-btn" data-edit="' + esc(p.id) + '">✏️ Edit</button>' +
            '<button class="small-btn red" data-del="' + esc(p.id) + '">🗑</button>' +
          "</div>" +
        "</div>"
      );
    }).join("");
    box.querySelectorAll("[data-edit]").forEach(function (b) {
      b.addEventListener("click", function () { editProduct(b.getAttribute("data-edit")); });
    });
    box.querySelectorAll("[data-del]").forEach(function (b) {
      b.addEventListener("click", function () { deleteProduct(b.getAttribute("data-del")); });
    });
  }

  /* ---------- Image upload + compression ---------- */
  var currentImage = "";
  function setImage(src) {
    currentImage = src || "";
    if (currentImage) {
      $("fImgPreview").src = currentImage;
      $("fImgPreview").classList.remove("hidden");
      $("imgPh").classList.add("hidden");
    } else {
      $("fImgPreview").classList.add("hidden");
      $("imgPh").classList.remove("hidden");
    }
  }
  function handleFile(file) {
    if (!file || !file.type.match(/^image\//)) { toast("Please choose an image file.", true); return; }
    var reader = new FileReader();
    reader.onload = function (ev) {
      var img = new Image();
      img.onload = function () {
        var MAX = 900;
        var w = img.width, h = img.height;
        if (w > MAX || h > MAX) {
          var r = Math.min(MAX / w, MAX / h);
          w = Math.round(w * r); h = Math.round(h * r);
        }
        var cv = document.createElement("canvas");
        cv.width = w; cv.height = h;
        cv.getContext("2d").drawImage(img, 0, 0, w, h);
        var dataUrl = cv.toDataURL("image/jpeg", 0.82);
        if (dataUrl.length > 2300000) { toast("Image too big after compression — try a smaller one.", true); return; }
        setImage(dataUrl);
        toast("🖼 Image added (compressed).");
      };
      img.onerror = function () { toast("Could not read that image.", true); };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  /* ---------- Settings ---------- */
  function fillSettings() {
    var s = STORE.settings;
    $("sShopName").value = s.shopName || "";
    $("sTagline").value = s.tagline || "";
    $("sAnnouncement").value = s.announcement || "";
    $("sLocation").value = s.location || "";
    $("sDeliveryNote").value = s.deliveryNote || "";
    $("sInstagram").value = s.instagram || "";
    $("sTikTok").value = s.tiktok || "";
    $("sEmail").value = s.email || "";
    $("sWhatsapp").value = s.whatsapp || "";
  }
  async function saveSettings() {
    STORE.settings = {
      shopName: $("sShopName").value.trim(),
      tagline: $("sTagline").value.trim(),
      announcement: $("sAnnouncement").value.trim(),
      location: $("sLocation").value.trim(),
      deliveryNote: $("sDeliveryNote").value.trim(),
      instagram: $("sInstagram").value.trim().replace(/^@/, ""),
      tiktok: $("sTikTok").value.trim().replace(/^@/, ""),
      email: $("sEmail").value.trim(),
      whatsapp: $("sWhatsapp").value.trim()
    };
    try {
      if (window.jkSupabase) {
        var result = await window.jkSupabase.from("shop_settings").upsert({
          id:1, shop_name:STORE.settings.shopName, tagline:STORE.settings.tagline, announcement:STORE.settings.announcement,
          location:STORE.settings.location, delivery_note:STORE.settings.deliveryNote, instagram:STORE.settings.instagram,
          tiktok:STORE.settings.tiktok, email:STORE.settings.email, whatsapp:STORE.settings.whatsapp, updated_at:new Date().toISOString()
        }, { onConflict:"id" });
        if (result.error) throw result.error;
      } else {
        localStorage.setItem("jk_settings", JSON.stringify(STORE.settings));
      }
      toast("✅ Settings saved online!");
    } catch (err) { toast("❌ Could not save settings online: " + err.message, true); }
  }

  /* ---------- Password ---------- */
  async function changePass() {
    var nw = $("newPass").value, nw2 = $("newPass2").value;
    if (nw.length < 6) { toast("New password must be at least 6 characters.", true); return; }
    if (nw !== nw2) { toast("Passwords don't match.", true); return; }
    if (window.jkSupabase) {
      var result = await window.jkSupabase.auth.updateUser({ password: nw });
      if (result.error) { toast("Could not update password: " + result.error.message, true); return; }
    } else {
      localStorage.setItem("jk_admin_hash", await sha256(nw));
    }
    $("newPass").value = $("newPass2").value = "";
    toast("🔑 Password updated!");
  }

  /* ---------- Export data.js ---------- */
  function exportData() {
    var out =
      '/* =====================================================\n' +
      '   EVERYTHING J&K — Store data (exported from admin panel)\n' +
      '   Generated ' + new Date().toISOString().slice(0, 10) + '\n' +
      '   ===================================================== */\n' +
      "window.JK_PRODUCTS = " + JSON.stringify(STORE.products, null, 2) + ";\n\n" +
      "window.JK_SETTINGS = " + JSON.stringify(STORE.settings, null, 2) + ";\n";
    var blob = new Blob([out], { type: "application/javascript" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "data.js";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); document.body.removeChild(a); }, 400);
    toast("⬇ data.js downloaded — replace the old file in your folder to publish changes.");
  }

  /* ---------- Tabs ---------- */
  function initTabs() {
    document.querySelectorAll(".tab").forEach(function (t) {
      t.addEventListener("click", function () {
        document.querySelectorAll(".tab").forEach(function (x) { x.classList.remove("active"); });
        document.querySelectorAll(".tab-pane").forEach(function (x) { x.classList.remove("active"); });
        t.classList.add("active");
        $("tab-" + t.getAttribute("data-tab")).classList.add("active");
      });
    });
  }

  /* ---------- Init ---------- */
  async function init() {
    var session = window.jkSupabase ? (await window.jkSupabase.auth.getSession()).data.session : null;
    if (session) { sessionStorage.setItem("jk_admin_ok", "1"); await showDash(); }
    else showLogin();
    initTabs();
    $("loginBtn").addEventListener("click", function () { tryLogin($("loginEmail").value.trim(), $("loginPass").value); });
    $("loginPass").addEventListener("keydown", function (e) { if (e.key === "Enter") tryLogin($("loginEmail").value.trim(), $("loginPass").value); });
    $("logoutBtn").addEventListener("click", logout);
    $("saveBtn").addEventListener("click", saveProduct);
    $("resetFormBtn").addEventListener("click", resetForm);
    $("saveSettingsBtn").addEventListener("click", saveSettings);
    $("changePassBtn").addEventListener("click", changePass);
    $("exportBtn").addEventListener("click", exportData);
    $("imgDrop").addEventListener("click", function () { $("fImgFile").click(); });
    $("fImgFile").addEventListener("change", function (e) { if (e.target.files.length) handleFile(e.target.files[0]); });
    // paste an image URL straight into the form? Support drag & drop:
    ["dragover", "drop"].forEach(function (ev) {
      $("imgDrop").addEventListener(ev, function (e) {
        e.preventDefault();
        if (ev === "drop" && e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
      });
    });
  }
  document.addEventListener("DOMContentLoaded", init);
})();
