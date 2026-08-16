/* =====================================================
   EVERYTHING J&K — Admin Panel logic
   Login + product/pricing/image editor + data.js export
   ===================================================== */
(function () {
  "use strict";

  /* ---------- Supabase ---------- */
  var SUPABASE_URL = "https://myrshzdfhrxjaqsitjkn.supabase.co";
  var SUPABASE_PUBLISHABLE_KEY = "sb_publishable_C87X56f2AqzWSRQBj2-RQA_lwHdU74B";
  var sb = null;
  if (window.supabase && window.supabase.createClient) {
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  }

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
  var cropState = { img: null, zoom: 1, x: 0, y: 0, baseScale: 1, startX: 0, startY: 0, dragging: false };
  var currentLogo = "";

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function fmt(n) { return n ? "₦" + Number(n).toLocaleString("en-NG") : "₦0"; }
  function statusLabel(s) {
    return { available: ["available", "Available"], sold: ["sold", "Sold Out"], coming: ["coming", "Coming Soon"] }[s] || ["available", "Available"];
  }

  /* ---------- Toast ---------- */
  var toastTimer = null;
  function toast(msg, isErr) {
    var t = $("toast");
    if (!t) return;
    t.textContent = msg;
    t.className = "toast show" + (isErr ? " error" : "");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.className = "toast"; }, 2600);
  }

  /* ---------- Supabase Auth ---------- */
  async function tryLogin(email, pass) {
    if (!sb) {
      $("loginErr").textContent = "❌ Supabase could not load. Check your internet connection.";
      return;
    }
    $("loginErr").textContent = "";
    var result = await sb.auth.signInWithPassword({ email: email.trim(), password: pass });
    if (result.error) {
      $("loginErr").textContent = "❌ " + result.error.message;
      return;
    }
    showDash();
    toast("🔓 Welcome back, boss!");
  }

  async function logout() {
    if (sb) await sb.auth.signOut();
    showLogin();
  }

  function showLogin() {
    $("loginView").classList.remove("hidden");
    $("dashView").classList.add("hidden");
  }

  function showDash() {
    $("loginView").classList.add("hidden");
    $("dashView").classList.remove("hidden");
    renderList();
    fillSettings();
  }

  /* ---------- Product CRUD ---------- */
  function persistProducts() {
    localStorage.setItem("jk_products", JSON.stringify(STORE.products));
  }
  function saveProduct(e) {
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
    persistProducts();
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
  function deleteProduct(id) {
    if (!confirm("Delete this product permanently?")) return;
    STORE.products = STORE.products.filter(function (x) { return x.id !== id; });
    if (editingId === id) resetForm();
    persistProducts();
    renderList();
    toast("🗑 Product deleted.");
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

  /* ---------- Product image upload + exact crop ---------- */
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

  function openCropper(file) {
    if (!file || !file.type.match(/^image\//)) { toast("Please choose an image file.", true); return; }
    var reader = new FileReader();
    reader.onload = function (ev) {
      var img = new Image();
      img.onload = function () {
        cropState.img = img;
        cropState.zoom = 1;
        cropState.x = 0;
        cropState.y = 0;
        $("cropZoom").value = "1";
        $("cropBackdrop").classList.remove("hidden");
        drawCrop();
      };
      img.onerror = function () { toast("Could not read that image.", true); };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  function drawCrop() {
    var c = $("cropCanvas"), ctx = c.getContext("2d"), img = cropState.img;
    if (!img) return;
    var cw = c.width, ch = c.height;
    ctx.clearRect(0, 0, cw, ch);
    ctx.fillStyle = "#05060b";
    ctx.fillRect(0, 0, cw, ch);
    var cover = Math.max(cw / img.width, ch / img.height);
    var scale = cover * cropState.zoom;
    var dw = img.width * scale, dh = img.height * scale;
    var x = (cw - dw) / 2 + cropState.x;
    var y = (ch - dh) / 2 + cropState.y;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, x, y, dw, dh);
  }

  function resetCrop() {
    cropState.zoom = 1; cropState.x = 0; cropState.y = 0;
    $("cropZoom").value = "1";
    drawCrop();
  }

  function applyCrop() {
    var c = $("cropCanvas");
    var dataUrl = c.toDataURL("image/jpeg", 0.86);
    if (dataUrl.length > 2300000) { toast("Crop is still too large — reduce the zoom or use a smaller image.", true); return; }
    setImage(dataUrl);
    $("cropBackdrop").classList.add("hidden");
    toast("✂️ Crop saved exactly as shown.");
  }

  function handleCropPointerDown(e) {
    if (!cropState.img) return;
    cropState.dragging = true;
    cropState.startX = e.clientX - cropState.x;
    cropState.startY = e.clientY - cropState.y;
    $("cropCanvas").classList.add("dragging");
    $("cropCanvas").setPointerCapture(e.pointerId);
  }
  function handleCropPointerMove(e) {
    if (!cropState.dragging) return;
    cropState.x = e.clientX - cropState.startX;
    cropState.y = e.clientY - cropState.startY;
    drawCrop();
  }
  function handleCropPointerUp() {
    cropState.dragging = false;
    $("cropCanvas").classList.remove("dragging");
  }

  /* ---------- Homepage logo upload ---------- */
  function setLogo(src) {
    currentLogo = src || "";
    if (currentLogo) {
      $("sLogoPreview").src = currentLogo;
      $("sLogoPreview").classList.remove("hidden");
      $("logoPh").classList.add("hidden");
    } else {
      $("sLogoPreview").classList.add("hidden");
      $("logoPh").classList.remove("hidden");
    }
  }
  function handleLogoFile(file) {
    if (!file || !file.type.match(/^image\//)) { toast("Please choose an image file.", true); return; }
    var reader = new FileReader();
    reader.onload = function (ev) {
      var img = new Image();
      img.onload = function () {
        var MAX = 1100, w = img.width, h = img.height;
        if (w > MAX || h > MAX) { var r = Math.min(MAX / w, MAX / h); w = Math.round(w * r); h = Math.round(h * r); }
        var cv = document.createElement("canvas"); cv.width = w; cv.height = h;
        var ctx = cv.getContext("2d"); ctx.drawImage(img, 0, 0, w, h);
        var png = cv.toDataURL("image/png");
        if (png.length > 2300000) {
          var jpg = cv.toDataURL("image/jpeg", .86);
          if (jpg.length > 2300000) { toast("Logo is too large after compression.", true); return; }
          setLogo(jpg);
        } else setLogo(png);
        toast("✨ Logo uploaded. Choose an animation and save settings.");
      };
      img.onerror = function () { toast("Could not read that logo.", true); };
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
    $("sLogoAnimation").value = s.heroLogoAnimation || "fade";
    setLogo(s.heroLogo || "");
  }
  function saveSettings() {
    STORE.settings = {
      shopName: $("sShopName").value.trim(),
      tagline: $("sTagline").value.trim(),
      announcement: $("sAnnouncement").value.trim(),
      location: $("sLocation").value.trim(),
      deliveryNote: $("sDeliveryNote").value.trim(),
      instagram: $("sInstagram").value.trim().replace(/^@/, ""),
      tiktok: $("sTikTok").value.trim().replace(/^@/, ""),
      email: $("sEmail").value.trim(),
      whatsapp: $("sWhatsapp").value.trim(),
      heroLogo: currentLogo,
      heroLogoAnimation: $("sLogoAnimation").value || "fade"
    };
    localStorage.setItem("jk_settings", JSON.stringify(STORE.settings));
    toast("✅ Settings saved!");
  }

  /* ---------- Password ---------- */
  async function changePass() {
    var nw = $("newPass").value, nw2 = $("newPass2").value;
    if (!sb) { toast("Supabase is unavailable.", true); return; }
    if (nw.length < 6) { toast("New password must be at least 6 characters.", true); return; }
    if (nw !== nw2) { toast("Passwords don't match.", true); return; }
    var result = await sb.auth.updateUser({ password: nw });
    if (result.error) { toast(result.error.message, true); return; }
    $("curPass").value = $("newPass").value = $("newPass2").value = "";
    toast("🔑 Password updated in Supabase!");
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
    initTabs();
    $("loginBtn").addEventListener("click", function () { tryLogin($("loginEmail").value, $("loginPass").value); });
    $("loginPass").addEventListener("keydown", function (e) { if (e.key === "Enter") tryLogin($("loginEmail").value, $("loginPass").value); });
    $("logoutBtn").addEventListener("click", logout);

    if (!sb) {
      showLogin();
      $("loginErr").textContent = "❌ Supabase could not load.";
      return;
    }

    var sessionResult = await sb.auth.getSession();
    if (sessionResult.data && sessionResult.data.session) showDash();
    else showLogin();

    sb.auth.onAuthStateChange(function (_event, session) {
      if (session) showDash(); else showLogin();
    });
    $("saveBtn").addEventListener("click", saveProduct);
    $("resetFormBtn").addEventListener("click", resetForm);
    $("saveSettingsBtn").addEventListener("click", saveSettings);
    $("changePassBtn").addEventListener("click", changePass);
    $("exportBtn").addEventListener("click", exportData);
    $("imgDrop").addEventListener("click", function () { $("fImgFile").click(); });
    $("fImgFile").addEventListener("change", function (e) { if (e.target.files.length) openCropper(e.target.files[0]); e.target.value = ""; });
    $("cropCancel").addEventListener("click", function () { $("cropBackdrop").classList.add("hidden"); });
    $("cropApply").addEventListener("click", applyCrop);
    $("cropReset").addEventListener("click", resetCrop);
    $("cropZoom").addEventListener("input", function () { cropState.zoom = Number(this.value); drawCrop(); });
    $("cropCanvas").addEventListener("pointerdown", handleCropPointerDown);
    $("cropCanvas").addEventListener("pointermove", handleCropPointerMove);
    $("cropCanvas").addEventListener("pointerup", handleCropPointerUp);
    $("cropCanvas").addEventListener("pointercancel", handleCropPointerUp);
    $("logoDrop").addEventListener("click", function () { $("sLogoFile").click(); });
    $("sLogoFile").addEventListener("change", function (e) { if (e.target.files.length) handleLogoFile(e.target.files[0]); e.target.value = ""; });
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
