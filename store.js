/* =====================================================
   EVERYTHING J&K — Storefront
   Public data from Supabase; cart remains local to each visitor.
   ===================================================== */
(function(){
  "use strict";
  var SUPABASE_URL="https://myrshzdfhrxjaqsitjkn.supabase.co";
  var SUPABASE_PUBLISHABLE_KEY="sb_publishable_C87X56f2AqzWSRQBj2-RQA_lwHdU74B";
  var sb=(window.supabase&&window.supabase.createClient)?window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY):null;
  var PRODUCTS=[],SETTINGS={},CATEGORIES=["All"],activeCat="All",cart=loadCart();
  var FALLBACK_PRODUCTS=window.JK_PRODUCTS||[],FALLBACK_SETTINGS=window.JK_SETTINGS||{};
  function $(id){return document.getElementById(id);}
  function esc(s){return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");}
  function fmt(n){return "₦"+Number(n||0).toLocaleString("en-NG");}
  function priceLabel(p){if(!p.price)return '<span class="price-on-dm">PRICE ON DM 💬</span>';return '<span class="price">'+fmt(p.price)+'</span>'+(p.oldPrice?'<span class="old-price">'+fmt(p.oldPrice)+'</span>':"");}
  function statusLabel(s){if(s==="sold")return '<span class="tag sold">Sold Out</span>';if(s==="coming")return '<span class="tag coming">Coming Soon</span>';return '<span class="tag available">Available</span>';}
  function canOrder(p){return p.status!=="sold";}
  function loadCart(){try{return JSON.parse(localStorage.getItem("jk_cart")||"[]");}catch(e){return[];}}
  function saveCart(){localStorage.setItem("jk_cart",JSON.stringify(cart));}
  function cartCount(){return cart.reduce(function(a,i){return a+i.qty;},0);}
  function cartSubtotal(){return cart.reduce(function(a,i){var p=PRODUCTS.find(function(x){return x.id===i.id;});return a+(p&&p.price?p.price*i.qty:0);},0);}
  function toast(msg,isErr){var t=$("toast");if(!t)return;t.textContent=msg;t.className="toast show"+(isErr?" error":"");clearTimeout(window.__jkToast);window.__jkToast=setTimeout(function(){t.className="toast";},2200);}

  var CACHE_KEY="jk_public_store_cache_v1";
  var CACHE_TTL=60000;
  function readCachedData(){
    try{
      var raw=localStorage.getItem(CACHE_KEY);if(!raw)return false;
      var c=JSON.parse(raw);if(!c||!c.products)return false;
      PRODUCTS=c.products||[];SETTINGS=c.settings||{};return true;
    }catch(e){return false;}
  }
  function writeCachedData(){
    try{localStorage.setItem(CACHE_KEY,JSON.stringify({time:Date.now(),products:PRODUCTS,settings:SETTINGS}));}catch(e){}
  }
  function renderPublic(){rebuildCategories();renderSettings();renderCats();renderProducts();renderCart();reveal();}

  async function loadRemoteData(){
    if(!sb)throw new Error("Supabase client unavailable");
    var p=await sb.from("products").select("id,name,category,price,old_price,status,image,description,sort_order").order("sort_order",{ascending:true}).order("created_at",{ascending:true});
    if(p.error)throw p.error;
    var s=await sb.from("shop_settings").select("*").eq("id",1).maybeSingle();if(s.error)throw s.error;
    PRODUCTS=(p.data||[]).map(function(x){return{id:x.id,name:x.name,category:x.category,price:x.price,oldPrice:x.old_price,status:x.status,image:x.image,desc:x.description};});
    var x=s.data||{};SETTINGS={shopName:x.shop_name||"",tagline:x.tagline||"",announcement:x.announcement||"",instagram:x.instagram||"",tiktok:x.tiktok||"",email:x.email||"",whatsapp:x.whatsapp||"",location:x.location||"",deliveryNote:x.delivery_note||"",heroLogo:x.hero_logo||"",heroLogoAnimation:x.hero_logo_animation||"fade"};
    writeCachedData();
  }
  function rebuildCategories(){CATEGORIES=["All"];PRODUCTS.forEach(function(p){if(p.category&&CATEGORIES.indexOf(p.category)<0)CATEGORIES.push(p.category);});}
  function goSection(id){var el=$(id);if(!el)return;var nav=document.querySelector("nav"),off=nav?nav.getBoundingClientRect().height+14:14;window.scrollTo({top:Math.max(0,el.getBoundingClientRect().top+window.scrollY-off),behavior:"smooth"});}
  function navButton(label,target,extra){return '<button type="button" class="nav-action '+(extra||"")+'" data-nav-section="'+target+'">'+label+'</button>';}
  function renderCats(){
    var desktop=CATEGORIES.map(function(c){return '<li><button data-cat="'+esc(c)+'" class="'+(c===activeCat?"active":"")+'">'+esc(c)+"</button></li>";}).join("");
    desktop+= '<li class="nav-section-item">'+navButton("Services","how")+'</li><li class="nav-section-item">'+navButton("Contact Us","contact")+'</li>';
    $("catNav").innerHTML=desktop;
    $("mobileCats").innerHTML=CATEGORIES.map(function(c){return '<button data-cat="'+esc(c)+'" class="pill '+(c===activeCat?"active":"")+'">'+esc(c)+"</button>";}).join("")+navButton("⚙ Services","how")+navButton("✉ Contact Us","contact");
    document.querySelectorAll("#catNav [data-cat],#mobileCats [data-cat]").forEach(function(b){b.addEventListener("click",function(){var c=b.dataset.cat;activeCat=c;renderCats();renderProducts();if(window.innerWidth<=900)$("mobileCats").classList.remove("open");goSection("shop");});});
    document.querySelectorAll("[data-nav-section]").forEach(function(b){b.addEventListener("click",function(){goSection(b.dataset.navSection);if(window.innerWidth<=900)$("mobileCats").classList.remove("open");});});
  }
  function renderProducts(){
    var list=activeCat==="All"?PRODUCTS:PRODUCTS.filter(function(p){return p.category===activeCat;});
    $("resultCount").textContent=list.length+" item"+(list.length===1?"":"s");
    if(!list.length){$("productGrid").innerHTML='<p style="grid-column:1/-1;text-align:center;color:var(--muted)">Nothing here yet — check back soon. ✨</p>';return;}
    $("productGrid").innerHTML=list.map(function(p){return '<div class="card reveal" data-id="'+esc(p.id)+'">'+statusLabel(p.status)+'<div class="img-wrap"><img src="'+esc(p.image)+'" alt="'+esc(p.name)+'" loading="lazy"><button class="quick-add" data-add="'+esc(p.id)+'"'+(canOrder(p)?"":" disabled")+'>'+(canOrder(p)?"ADD TO CART +":"UNAVAILABLE")+'</button></div><div class="card-body"><span class="cat">'+esc(p.category)+'</span><h3>'+esc(p.name)+'</h3><p class="desc">'+esc((p.desc||"").slice(0,120))+(p.desc&&p.desc.length>120?"…":"")+'</p><div class="price-row">'+priceLabel(p)+"</div></div></div>";}).join("");
    document.querySelectorAll("#productGrid .card").forEach(function(card){card.addEventListener("click",function(e){if(e.target.closest(".quick-add"))return;openQuickView(card.dataset.id);});});
    document.querySelectorAll("#productGrid .quick-add").forEach(function(b){b.addEventListener("click",function(){addToCart(b.dataset.add,1);});});reveal();
  }
  function openQuickView(id){var p=PRODUCTS.find(function(x){return x.id===id;});if(!p)return;$("qvModal").innerHTML='<button class="modal-close" id="qvClose">✕</button><div class="modal-grid"><img src="'+esc(p.image)+'" alt="'+esc(p.name)+'"><div class="modal-info"><span class="cat">'+esc(p.category)+'</span><h3>'+esc(p.name)+'</h3><div class="price-row" style="margin-bottom:.8rem">'+priceLabel(p)+'</div><p class="desc">'+esc(p.desc||"")+'</p><div class="qty-row"><div class="qty-stepper"><button id="qvMinus">−</button><span id="qvQty">1</span><button id="qvPlus">+</button></div><span style="color:var(--muted);font-size:.85rem">Quantity</span></div><div class="modal-actions"><button class="glow-btn btn-primary" id="qvAdd"'+(canOrder(p)?"":" disabled")+'>'+(canOrder(p)?"ADD TO CART — "+fmt(p.price||0):"SOLD OUT")+'</button><a class="glow-btn btn-ghost" href="https://ig.me/m/'+encodeURIComponent(SETTINGS.instagram||"everything_j.k")+'" target="_blank" rel="noopener">Ask a question 📩</a></div></div></div>';$('qvBackdrop').classList.add('open');var q=1;$('qvQty').textContent=q;$('qvMinus').onclick=function(){q=Math.max(1,q-1);$('qvQty').textContent=q;};$('qvPlus').onclick=function(){q=Math.min(99,q+1);$('qvQty').textContent=q;};$('qvAdd').onclick=function(){addToCart(id,q);closeQuickView();};$('qvClose').onclick=closeQuickView;}
  function closeQuickView(){$("qvBackdrop").classList.remove("open");}
  function addToCart(id,qty){var p=PRODUCTS.find(function(x){return x.id===id;});if(!p||!canOrder(p))return;var item=cart.find(function(x){return x.id===id;});if(item)item.qty=Math.min(99,item.qty+qty);else cart.push({id:id,qty:qty});saveCart();renderCart();toast("🛒 Added to cart");}
  function changeQty(id,d){var x=cart.find(function(i){return i.id===id;});if(!x)return;x.qty+=d;if(x.qty<=0)cart=cart.filter(function(i){return i.id!==id;});saveCart();renderCart();}
  function removeItem(id){cart=cart.filter(function(i){return i.id!==id;});saveCart();renderCart();}
  function renderCart(){
    $("cartCount").textContent=cartCount();$("cartCount").style.display=cartCount()?"grid":"none";$("cartTotal").textContent=fmt(cartSubtotal());
    var box=$("cartItems");if(!cart.length){box.innerHTML='<div style="padding:2rem 1rem;text-align:center;color:var(--muted)">Your cart is empty ✨</div>';}else{box.innerHTML=cart.map(function(i){var p=PRODUCTS.find(function(x){return x.id===i.id;});if(!p)return"";return '<div class="cart-item"><img src="'+esc(p.image)+'" alt=""><div><div class="ci-name">'+esc(p.name)+'</div><div class="ci-price">'+(p.price?fmt(p.price):"Price on DM")+'</div><div class="ci-qty"><button data-q="'+p.id+'" data-d="-1">−</button><span>'+i.qty+'</span><button data-q="'+p.id+'" data-d="1">+</button></div></div><button class="ci-remove" data-rm="'+p.id+'">×</button></div>';}).join("");box.querySelectorAll("[data-q]").forEach(function(b){b.onclick=function(){changeQty(b.dataset.q,Number(b.dataset.d));};});box.querySelectorAll("[data-rm]").forEach(function(b){b.onclick=function(){removeItem(b.dataset.rm);};});}
    $("subtotalAmt").textContent=fmt(cartSubtotal());$("checkoutBtn").disabled=!cart.length;
  }
  function openCheckout(){
    if(!cart.length)return;
    $("checkoutModal").innerHTML='<button class="modal-close" id="ckClose">✕</button><div class="modal-info" style="padding:2rem"><span class="cat">// Checkout</span><h3>Place Your <span class="grad-text">Order</span> 💜</h3><p class="desc" style="margin-bottom:1.4rem">Enter your details below. Your order will be saved securely before WhatsApp opens.</p><label style="font-size:.78rem;color:var(--muted);letter-spacing:.08em;display:block;margin-bottom:.35rem">YOUR NAME</label><input id="ckName" class="admin-input" style="margin-bottom:1rem" placeholder="e.g. Aisha B." autocomplete="name"><label style="font-size:.78rem;color:var(--muted);letter-spacing:.08em;display:block;margin-bottom:.35rem">PHONE NUMBER</label><input id="ckPhone" class="admin-input" style="margin-bottom:1rem" placeholder="e.g. 08012345678" inputmode="tel" autocomplete="tel"><label style="font-size:.78rem;color:var(--muted);letter-spacing:.08em;display:block;margin-bottom:.35rem">DELIVERY ADDRESS</label><textarea id="ckAddress" class="admin-input" style="margin-bottom:1rem;min-height:100px;resize:vertical" placeholder="Enter your full delivery address" autocomplete="street-address"></textarea><div class="modal-actions" style="margin-top:1.4rem"><button class="glow-btn btn-primary" id="ckGo" style="width:100%">🛒 PLACE ORDER</button></div><p id="ckError" style="display:none;color:#ff7b9c;font-size:.82rem;margin-top:.9rem"></p></div>';
    $("checkoutBackdrop").classList.add("open");
    $("ckClose").onclick=function(){$("checkoutBackdrop").classList.remove("open");};
    $("ckGo").onclick=createOrder;
  }
  async function createOrder(){
    var name=($("ckName").value||"").trim();
    var phone=($("ckPhone").value||"").trim();
    var address=($("ckAddress").value||"").trim();
    var errorBox=$("ckError");
    var button=$("ckGo");
    function showCheckoutError(message){errorBox.textContent=message;errorBox.style.display="block";button.disabled=false;button.textContent="🛒 PLACE ORDER";}
    errorBox.style.display="none";
    if(!name){showCheckoutError("Please enter your name.");return;}
    if(!phone){showCheckoutError("Please enter your phone number.");return;}
    if(!address){showCheckoutError("Please enter your delivery address.");return;}
    if(!cart.length){showCheckoutError("Your cart is empty.");return;}
    var payload={customer_name:name,customer_phone:phone,delivery_address:address,items:cart.map(function(item){return{product_id:item.id,quantity:item.qty};})};
    button.disabled=true;
    button.textContent="⏳ PLACING ORDER...";
    try{
      if(!sb)throw new Error("Store connection is unavailable. Please refresh and try again.");
      var result=await sb.functions.invoke("create-order",{body:payload});
      if(result.error){
        var detail=result.error.message||"";
        throw new Error(detail||"We couldn't create your order. Please try again.");
      }
      var data=result.data||{};
      if(!data.success||!data.order_id||!data.whatsapp_url){throw new Error(data.error||"We couldn't confirm your order. Please try again.");}
      toast("✅ Order "+data.order_id+" saved successfully!");
      cart=[];
      saveCart();
      renderCart();
      $("checkoutBackdrop").classList.remove("open");
      window.location.href=data.whatsapp_url;
    }catch(error){
      console.error("Order submission failed:",error);
      showCheckoutError(error&&error.message?error.message:"We couldn't create your order. Please try again.");
    }
  }
  function buildOrderMessage(){
    /* Kept as a compatibility shim for any older code that calls this function. */
    createOrder();
  }
  function showSummary(msg){$('summaryModal').innerHTML='<button class="modal-close" id="smClose">✕</button><div class="modal-info" style="padding:2rem"><span class="cat">// Order ready</span><h3>Open Instagram & <span class="grad-text">Paste</span> 📋</h3><p class="desc" style="margin-bottom:1rem">We opened Instagram in a new tab and copied your order summary.</p><div style="background:rgba(139,92,246,.08);border:1px solid rgba(139,92,246,.3);border-radius:14px;padding:1rem;font-size:.82rem;white-space:pre-wrap;color:var(--text);margin-bottom:1.2rem;max-height:240px;overflow-y:auto">'+esc(msg)+'</div><div class="modal-actions"><button class="glow-btn btn-ghost" id="smCopy">📋 Copy Again</button><a class="glow-btn btn-primary" href="https://ig.me/m/'+encodeURIComponent(SETTINGS.instagram||"everything_j.k")+'" target="_blank" rel="noopener">📲 Open Instagram DM</a></div></div>';$('summaryBackdrop').classList.add('open');$('smClose').onclick=function(){$('summaryBackdrop').classList.remove('open');};$('smCopy').onclick=function(){copyText(msg);toast("✅ Order summary copied again!");};cart=[];saveCart();renderCart();}
  function copyText(txt){function legacy(){var ta=document.createElement("textarea");ta.value=txt;ta.style.position="fixed";ta.style.opacity="0";document.body.appendChild(ta);ta.select();try{document.execCommand("copy");}catch(e){}ta.remove();}if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(txt).catch(legacy);else legacy();}
  function renderSettings(){var ig=SETTINGS.instagram||"everything_j.k",tk=SETTINGS.tiktok||"",em=SETTINGS.email||"",ws=SETTINGS.whatsapp||"";$('announceBar').innerHTML='<i>✨</i> '+esc(SETTINGS.announcement||"");$('navShopName').textContent=(SETTINGS.shopName||"Everything J&K").replace(/^Everything\s*/i,"");$('heroShopName').textContent=SETTINGS.shopName||"J&K";$('heroTagline').textContent=SETTINGS.tagline||"";$('heroLocation').textContent=SETTINGS.location||"";var wrap=$('heroLogoWrap'),title=$('heroTitle'),logo=$('heroLogo');if(wrap&&title&&logo){if(SETTINGS.heroLogo){logo.src=SETTINGS.heroLogo;wrap.className="hero-logo-wrap logo-anim-"+(SETTINGS.heroLogoAnimation||"fade");title.classList.add("has-custom-logo");}else{wrap.className="hero-logo-wrap hidden";title.classList.remove("has-custom-logo");}}$('heroIgLink').href="https://ig.me/m/"+encodeURIComponent(ig);$('contactIg').href="https://ig.me/m/"+encodeURIComponent(ig);$('contactIg').innerHTML="📲 DM @"+esc(ig);$('contactTikTok').href=tk?"https://www.tiktok.com/@"+encodeURIComponent(tk):"#";$('contactTikTok').style.display=tk?"":"none";$('deliveryNote').textContent=SETTINGS.deliveryNote||"";var links='<a href="mailto:'+esc(em)+'">✉️ '+esc(em)+"</a>";links+='<a href="https://www.instagram.com/'+encodeURIComponent(ig)+'" target="_blank" rel="noopener">📸 instagram.com/'+esc(ig)+"</a>";if(tk)links+='<a href="https://www.tiktok.com/@'+encodeURIComponent(tk)+'" target="_blank" rel="noopener">🎵 tiktok.com/@'+esc(tk)+"</a>";$('contactLinks').innerHTML=links;var soc='<a href="https://www.instagram.com/'+encodeURIComponent(ig)+'" target="_blank" rel="noopener">📸</a>';if(tk)soc+='<a href="https://www.tiktok.com/@'+encodeURIComponent(tk)+'" target="_blank" rel="noopener">🎵</a>';soc+='<a href="mailto:'+esc(em)+'">✉️</a>';if(ws)soc+='<a href="https://wa.me/'+encodeURIComponent(ws.replace(/\D/g,""))+'" target="_blank" rel="noopener">💬</a>';$('socialLinks').innerHTML=soc;$('footerShopName').textContent=SETTINGS.shopName||"Everything J&K";$('footerLocation').textContent=SETTINGS.location||"";$('footerIg').href="https://www.instagram.com/"+encodeURIComponent(ig);$('footerIg').textContent="@"+ig;}
  function renderTicker(){var words=["#AffordableFashion","#Preorder","Nationwide Delivery","#BrandIdentity","Handle With Love","Fresh Imports","#SmallBusinessOwner"],h='<span>'+words.map(function(w){return w+" ✦ ";}).join("")+"</span>";$('tickerTrack').innerHTML=h+h;}
  function reveal(){if(!window.IntersectionObserver){document.querySelectorAll('.reveal').forEach(function(e){e.classList.add('show');});return;}var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('show');io.unobserve(e.target);}});},{threshold:.1});document.querySelectorAll('.reveal:not(.show)').forEach(function(e){io.observe(e);});}
  function init(){
    $('year').textContent=new Date().getFullYear();renderSettings();renderTicker();renderCats();renderProducts();renderCart();reveal();
    $('cartBtn').onclick=function(){$('cartDrawer').classList.add('open');$('drawerBackdrop').classList.add('open');};function closeDrawer(){$('cartDrawer').classList.remove('open');$('drawerBackdrop').classList.remove('open');}$('drawerClose').onclick=closeDrawer;$('drawerBackdrop').onclick=closeDrawer;$('checkoutBtn').onclick=function(){closeDrawer();openCheckout();};$('burger').onclick=function(){$('mobileCats').classList.toggle('open');};
    document.addEventListener('keydown',function(e){if(e.key==='Escape'){closeQuickView();$('checkoutBackdrop').classList.remove('open');$('summaryBackdrop').classList.remove('open');closeDrawer();}});[$('qvBackdrop'),$('checkoutBackdrop'),$('summaryBackdrop')].forEach(function(bd){bd.onclick=function(e){if(e.target===bd)bd.classList.remove('open');};});
    var hv=$('heroVisual');document.addEventListener('mousemove',function(e){if(!hv||window.innerWidth<920)return;var r=hv.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;hv.style.transform='perspective(900px) rotateY('+(x*7)+'deg) rotateX('+(-y*7)+'deg)';});
  }
  async function start(){
    /* Bind the cart/menu/modal controls immediately.
       The fast data refresh must never delay or disable storefront interactions. */
    try{ init(); }catch(e){ console.error("J&K interaction init failed",e); }
    var hadCache=readCachedData();
    if(!hadCache){PRODUCTS=FALLBACK_PRODUCTS.slice();SETTINGS=Object.assign({},FALLBACK_SETTINGS);}
    renderPublic();
    try{
      await loadRemoteData();
      renderPublic();
    }catch(e){
      if(!hadCache && !PRODUCTS.length){PRODUCTS=FALLBACK_PRODUCTS.slice();SETTINGS=Object.assign({},FALLBACK_SETTINGS);renderPublic();}
      console.warn("J&K live data refresh failed; showing cached/fallback data.",e);
    }
  }
  document.addEventListener('DOMContentLoaded',start);
})();
