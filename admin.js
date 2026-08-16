/* =====================================================
   EVERYTHING J&K — Production Admin
   Supabase Auth + database + Storage + exact cropper
   ===================================================== */
(function () {
  "use strict";

  var SUPABASE_URL = "https://myrshzdfhrxjaqsitjkn.supabase.co";
  var SUPABASE_PUBLISHABLE_KEY = "sb_publishable_C87X56f2AqzWSRQBj2-RQA_lwHdU74B";
  var sb = null;
  var editingId = null;
  var currentImage = "";
  var currentLogo = "";
  var pendingCropData = "";
  var pendingCropBlob = null;
  var cropState = { img:null, zoom:1, x:0, y:0, startX:0, startY:0, dragging:false };
  var toastTimer = null;

  if (window.supabase && window.supabase.createClient) {
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession:true, autoRefreshToken:true, detectSessionInUrl:true }
    });
  }

  var STORE = { products:[], settings:{} };
  function $(id){ return document.getElementById(id); }
  function esc(s){ return String(s == null ? "" : s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;"); }
  function fmt(n){ return n ? "₦" + Number(n).toLocaleString("en-NG") : "₦0"; }
  function toast(msg,isErr){ var t=$("toast"); if(!t)return; t.textContent=msg; t.className="toast"; t.style.display="block"; t.style.visibility="visible"; t.classList.add("show"); if(isErr)t.classList.add("error"); clearTimeout(toastTimer); toastTimer=setTimeout(function(){t.classList.remove("show");t.style.display="none";},2600); }
  function statusLabel(s){ return {available:["available","Available"],sold:["sold","Sold Out"],coming:["coming","Coming Soon"]}[s] || ["available","Available"]; }
  function showLogin(){ $("loginView").classList.remove("hidden"); $("dashView").classList.add("hidden"); }
  function showDash(){ $("loginView").classList.add("hidden"); $("dashView").classList.remove("hidden"); renderList(); fillSettings(); }

  async function loadData(){
    var p = await sb.from("products").select("*").order("sort_order",{ascending:true}).order("created_at",{ascending:true});
    if(p.error) throw p.error;
    STORE.products = (p.data || []).map(function(x){ return {id:x.id,name:x.name,category:x.category,price:x.price,oldPrice:x.old_price,status:x.status,image:x.image,desc:x.description}; });
    var s = await sb.from("shop_settings").select("*").eq("id",1).maybeSingle();
    if(s.error) throw s.error;
    var x=s.data || {};
    STORE.settings = {shopName:x.shop_name||"",tagline:x.tagline||"",announcement:x.announcement||"",instagram:x.instagram||"",tiktok:x.tiktok||"",email:x.email||"",whatsapp:x.whatsapp||"",location:x.location||"",deliveryNote:x.delivery_note||"",heroLogo:x.hero_logo||"",heroLogoAnimation:x.hero_logo_animation||"fade"};
  }

  async function tryLogin(email,pass){
    if(!sb){$("loginErr").textContent="❌ Supabase could not load.";return;}
    email=(email||"").trim();
    if(!email || !pass){$("loginErr").textContent="❌ Enter your admin email and password.";return;}
    $("loginErr").textContent="Signing in…";
    var r=await sb.auth.signInWithPassword({email:email,password:pass});
    if(r.error){$("loginErr").textContent="❌ "+r.error.message;return;}
    try { await loadData(); showDash(); toast("🔓 Welcome back!"); }
    catch(e){ await sb.auth.signOut(); var msg=(e && (e.message || e.details || e.hint)) ? (e.message || e.details || e.hint) : "Unknown database error"; $("loginErr").textContent="❌ Database error: "+msg; console.error("J&K admin database error", e); }
  }
  async function logout(){ if(sb) await sb.auth.signOut(); showLogin(); }

  function renderList(){
    var box=$("productList");
    if(!STORE.products.length){box.innerHTML='<p style="color:var(--muted);font-size:.85rem">No products yet — add your first one! ✨</p>';return;}
    box.innerHTML=STORE.products.map(function(p){var st=statusLabel(p.status);return '<div class="p-row"><img src="'+esc(p.image)+'" alt=""><div><div class="p-name">'+esc(p.name)+'</div><div class="p-meta">'+esc(p.category)+' • '+fmt(p.price)+'</div></div><span class="p-status '+st[0]+'">'+st[1]+'</span><div class="p-actions"><button class="small-btn" data-edit="'+esc(p.id)+'">✏️ Edit</button><button class="small-btn red" data-del="'+esc(p.id)+'">🗑</button></div></div>';}).join("");
    box.querySelectorAll("[data-edit]").forEach(function(b){b.addEventListener("click",function(){editProduct(b.dataset.edit);});});
    box.querySelectorAll("[data-del]").forEach(function(b){b.addEventListener("click",function(){deleteProduct(b.dataset.del);});});
  }

  async function uploadAsset(dataUrl, folder, extension){
    var blob = await (await fetch(dataUrl)).blob();
    return uploadAssetBlob(blob, folder, extension);
  }
  async function uploadAssetBlob(blob, folder, extension){
    var path = folder + "/" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2) + "." + extension;
    var r=await sb.storage.from("jk-assets").upload(path,blob,{contentType:blob.type||("image/"+extension),upsert:false,cacheControl:"31536000"});
    if(r.error) throw r.error;
    return sb.storage.from("jk-assets").getPublicUrl(path).data.publicUrl;
  }

  function setImage(src){ currentImage=src||""; pendingCropData=""; pendingCropBlob=null; if(currentImage){$("fImgPreview").src=currentImage;$("fImgPreview").classList.remove("hidden");$("imgPh").classList.add("hidden");}else{$("fImgPreview").classList.add("hidden");$("imgPh").classList.remove("hidden");} }
  function openCropper(file){
    if(!file || !file.type.match(/^image\//)){toast("Please choose an image file.",true);return;}
    if(file.size > 12 * 1024 * 1024){toast("Please choose an image smaller than 12MB.",true);return;}
    var url=URL.createObjectURL(file);
    var img=new Image();
    img.onload=function(){
      URL.revokeObjectURL(url);
      cropState.img=img;cropState.zoom=1;cropState.x=0;cropState.y=0;
      $("cropZoom").value="1";
      $("cropBackdrop").classList.remove("hidden");
      drawCrop();
    };
    img.onerror=function(){URL.revokeObjectURL(url);toast("Could not open that picture. Please try another image.",true);};
    img.src=url;
  }
  function drawCrop(){
    var c=$("cropCanvas"),ctx=c.getContext("2d"),img=cropState.img;if(!img)return;
    var cw=c.width,ch=c.height;ctx.clearRect(0,0,cw,ch);ctx.fillStyle="#05060b";ctx.fillRect(0,0,cw,ch);
    var cover=Math.max(cw/img.width,ch/img.height),scale=cover*cropState.zoom,dw=img.width*scale,dh=img.height*scale;
    var x=(cw-dw)/2+cropState.x,y=(ch-dh)/2+cropState.y;ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";ctx.drawImage(img,x,y,dw,dh);
  }
  function resetCrop(){cropState.zoom=1;cropState.x=0;cropState.y=0;$("cropZoom").value="1";drawCrop();}
  async function applyCrop(){
    var c=$("cropCanvas");
    if(!cropState.img){toast("Please choose a picture first.",true);return;}
    try{
      /* Keep the cropped product image inside the existing database flow.
         No Storage upload is required, so this does not depend on Storage RLS. */
      var blob=await new Promise(function(resolve,reject){
        c.toBlob(function(b){if(b)resolve(b);else reject(new Error("Could not prepare the cropped picture."));},"image/jpeg",.76);
      });
      if(!blob || blob.size>900000){toast("Picture is too large after cropping. Please zoom/crop a little more and try again.",true);return;}
      var dataUrl=await new Promise(function(resolve,reject){
        var reader=new FileReader();
        reader.onload=function(){resolve(reader.result);};
        reader.onerror=function(){reject(new Error("Could not prepare the picture for saving."));};
        reader.readAsDataURL(blob);
      });
      pendingCropBlob=blob;
      pendingCropData=dataUrl;
      currentImage=dataUrl;
      $("fImgPreview").src=dataUrl;
      $("fImgPreview").classList.remove("hidden");
      $("imgPh").classList.add("hidden");
      $("cropBackdrop").classList.add("hidden");
      toast("📤 Picture uploaded. Now press Save Product.");
    }catch(err){
      console.error("Crop export failed",err);
      toast("Could not prepare the cropped picture. Please try again.",true);
    }
  }
  function handleCropPointerDown(e){if(!cropState.img)return;cropState.dragging=true;cropState.startX=e.clientX-cropState.x;cropState.startY=e.clientY-cropState.y;$("cropCanvas").setPointerCapture(e.pointerId);$("cropCanvas").classList.add("dragging");}
  function handleCropPointerMove(e){if(!cropState.dragging)return;cropState.x=e.clientX-cropState.startX;cropState.y=e.clientY-cropState.startY;drawCrop();}
  function handleCropPointerUp(){cropState.dragging=false;$("cropCanvas").classList.remove("dragging");}

  function editProduct(id){var p=STORE.products.find(function(x){return x.id===id;});if(!p)return;editingId=id;$("fId").value=id;$("fName").value=p.name;$("fCategory").value=p.category||"";$("fPrice").value=p.price||"";$("fOldPrice").value=p.oldPrice||"";$("fStatus").value=p.status||"available";$("fDesc").value=p.desc||"";setImage(p.image);$("tab-products").scrollIntoView({behavior:"smooth",block:"start"});}
  function resetForm(){
    if(pendingCropData && pendingCropData.indexOf("blob:")===0){try{URL.revokeObjectURL(pendingCropData);}catch(e){}}
    editingId=null;pendingCropData="";pendingCropBlob=null;$("fId").value="";$("fName").value="";$("fCategory").value="";$("fPrice").value="";$("fOldPrice").value="";$("fStatus").value="available";$("fDesc").value="";setImage("");}

  async function saveProduct(e){
    e.preventDefault();var name=$("fName").value.trim();if(!name){toast("Please enter a product name.",true);return;}
    var imageUrl=currentImage||"assets/hero.jpg";
    if(pendingCropData){
      /* The crop is already prepared as a compact JPEG data URL.
         Save that exact crop with the product; do not change Auth, schema,
         or Storage configuration. */
      imageUrl=pendingCropData;
    }
    var obj={id:editingId||"p"+Date.now().toString(36),name:name,category:$("fCategory").value.trim()||"General",price:Math.max(0,parseInt($("fPrice").value,10)||0),oldPrice:$("fOldPrice").value?parseInt($("fOldPrice").value,10)||null:null,status:$("fStatus").value,image:imageUrl,desc:$("fDesc").value.trim()};
    var payload={id:obj.id,name:obj.name,category:obj.category,price:obj.price,old_price:obj.oldPrice,status:obj.status,image:obj.image,description:obj.desc};
    var r=editingId?await sb.from("products").update(payload).eq("id",editingId):await sb.from("products").insert(payload);
    if(r.error){toast("Could not save product: "+r.error.message,true);return;}
    await loadData();resetForm();renderList();toast("✅ Product saved globally.");
  }
  async function deleteProduct(id){if(!confirm("Delete this product permanently?"))return;var p=STORE.products.find(function(x){return x.id===id;});var r=await sb.from("products").delete().eq("id",id);if(r.error){toast("Delete failed: "+r.error.message,true);return;}if(p&&p.image&&p.image.indexOf("/storage/v1/object/public/jk-assets/")>-1){try{var path=p.image.split("/jk-assets/")[1];await sb.storage.from("jk-assets").remove([path]);}catch(e){}}if(editingId===id)resetForm();await loadData();renderList();toast("🗑 Product deleted globally.");}

  function setLogo(src){currentLogo=src||"";if(currentLogo){$("sLogoPreview").src=currentLogo;$("sLogoPreview").classList.remove("hidden");$("logoPh").classList.add("hidden");}else{$("sLogoPreview").classList.add("hidden");$("logoPh").classList.remove("hidden");}}
  async function handleLogoFile(file){
    if(!file||!file.type.match(/^image\//)){toast("Please choose an image file.",true);return;}
    if(file.size>12*1024*1024){toast("Please choose a logo smaller than 12MB.",true);return;}
    try{
      var bitmap=await createImageBitmap(file);
      var max=900,w=bitmap.width,h=bitmap.height;
      if(w>max||h>max){var scale=Math.min(max/w,max/h);w=Math.max(1,Math.round(w*scale));h=Math.max(1,Math.round(h*scale));}
      var cv=document.createElement("canvas");cv.width=w;cv.height=h;
      var ctx=cv.getContext("2d");ctx.clearRect(0,0,w,h);ctx.drawImage(bitmap,0,0,w,h);
      if(bitmap.close) bitmap.close();
      var isPng=/png|webp/i.test(file.type);
      var mime=isPng?"image/png":"image/jpeg";
      var quality=isPng?undefined:.82;
      var dataUrl=await new Promise(function(resolve,reject){cv.toBlob(function(blob){
        if(!blob){reject(new Error("Could not prepare the logo."));return;}
        if(blob.size>800000){reject(new Error("Logo is too large after resizing. Please use a smaller image."));return;}
        var r=new FileReader();r.onload=function(){resolve(r.result);};r.onerror=function(){reject(new Error("Could not read the prepared logo."));};r.readAsDataURL(blob);
      },mime,quality);});
      // Keep this frontend-only: store the prepared logo string in the existing hero_logo field.
      // No Storage bucket, SQL, RLS, Auth, or database schema changes are required.
      setLogo(dataUrl);
      toast("✨ Logo uploaded. Choose an animation and save settings.");
    }catch(e){
      console.error("Logo preparation failed",e);
      toast("Logo upload failed: "+(e&&e.message?e.message:"Please try another image."),true);
    }
  }
  function fillSettings(){var s=STORE.settings;$("sShopName").value=s.shopName||"";$("sTagline").value=s.tagline||"";$("sAnnouncement").value=s.announcement||"";$("sLocation").value=s.location||"";$("sDeliveryNote").value=s.deliveryNote||"";$("sInstagram").value=s.instagram||"";$("sTikTok").value=s.tiktok||"";$("sEmail").value=s.email||"";$("sWhatsapp").value=s.whatsapp||"";$("sLogoAnimation").value=s.heroLogoAnimation||"fade";setLogo(s.heroLogo||"");}
  async function saveSettings(){
    var payload={id:1,shop_name:$("sShopName").value.trim(),tagline:$("sTagline").value.trim(),announcement:$("sAnnouncement").value.trim(),location:$("sLocation").value.trim(),delivery_note:$("sDeliveryNote").value.trim(),instagram:$("sInstagram").value.trim().replace(/^@/,""),tiktok:$("sTikTok").value.trim().replace(/^@/,""),email:$("sEmail").value.trim(),whatsapp:$("sWhatsapp").value.trim(),hero_logo:currentLogo,hero_logo_animation:$("sLogoAnimation").value||"fade"};
    var r=await sb.from("shop_settings").upsert(payload,{onConflict:"id"});if(r.error){toast("Settings could not be saved: "+r.error.message,true);return;}await loadData();fillSettings();toast("✅ Settings saved globally.");
  }
  async function changePass(){var cur=$("curPass").value,nw=$("newPass").value,nw2=$("newPass2").value;if(!cur||nw.length<8||nw!==nw2){toast("Enter the current password and a matching new password of at least 8 characters.",true);return;}var u=(await sb.auth.getUser()).data.user;if(!u){showLogin();return;}var re=await sb.auth.signInWithPassword({email:u.email,password:cur});if(re.error){toast("Current password is incorrect.",true);return;}var r=await sb.auth.updateUser({password:nw});if(r.error){toast(r.error.message,true);return;}$("curPass").value=$("newPass").value=$("newPass2").value="";toast("🔑 Password updated securely.");}

  function exportData(){var out='window.JK_PRODUCTS = '+JSON.stringify(STORE.products,null,2)+';\n\nwindow.JK_SETTINGS = '+JSON.stringify(STORE.settings,null,2)+';\n';var blob=new Blob([out],{type:"application/javascript"});var a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="data.js";document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},400);}
  function initTabs(){document.querySelectorAll(".tab").forEach(function(t){t.addEventListener("click",function(){document.querySelectorAll(".tab").forEach(function(x){x.classList.remove("active")});document.querySelectorAll(".tab-pane").forEach(function(x){x.classList.remove("active")});t.classList.add("active");$("tab-"+t.dataset.tab).classList.add("active");});});}

  async function init(){
    initTabs();
    if(!sb){showLogin();$("loginErr").textContent="❌ Supabase could not load.";return;}
    $("loginBtn").addEventListener("click",function(){tryLogin($("loginEmail").value,$("loginPass").value);});
    $("loginPass").addEventListener("keydown",function(e){if(e.key==="Enter")tryLogin($("loginEmail").value,$("loginPass").value);});
    $("logoutBtn").addEventListener("click",logout);$("saveBtn").addEventListener("click",saveProduct);$("resetFormBtn").addEventListener("click",resetForm);$("saveSettingsBtn").addEventListener("click",saveSettings);$("changePassBtn").addEventListener("click",changePass);$("exportBtn").addEventListener("click",exportData);
    $("imgDrop").addEventListener("click",function(){$("fImgFile").click();});$("fImgFile").addEventListener("change",function(e){if(e.target.files[0])openCropper(e.target.files[0]);e.target.value="";});
    $("cropApply").textContent="📤 Upload Picture";
    $("cropCancel").addEventListener("click",function(){$("cropBackdrop").classList.add("hidden");});$("cropApply").addEventListener("click",applyCrop);$("cropReset").addEventListener("click",resetCrop);$("cropZoom").addEventListener("input",function(){cropState.zoom=Number(this.value);drawCrop();});$("cropCanvas").addEventListener("pointerdown",handleCropPointerDown);$("cropCanvas").addEventListener("pointermove",handleCropPointerMove);$("cropCanvas").addEventListener("pointerup",handleCropPointerUp);$("cropCanvas").addEventListener("pointercancel",handleCropPointerUp);
    $("logoDrop").addEventListener("click",function(){$("sLogoFile").click();});$("sLogoFile").addEventListener("change",function(e){if(e.target.files[0])handleLogoFile(e.target.files[0]);e.target.value="";});
    var sr=await sb.auth.getSession();if(sr.data&&sr.data.session){try{await loadData();showDash();}catch(e){showLogin();$("loginErr").textContent="❌ Admin account is authenticated but not authorized yet. Set app_metadata role to admin in Supabase.";}}else showLogin();
    sb.auth.onAuthStateChange(async function(event,session){if(session&&event!=="SIGNED_OUT"){try{await loadData();showDash();}catch(e){showLogin();}}else if(!session)showLogin();});
  }
  document.addEventListener("DOMContentLoaded",init);
})();
