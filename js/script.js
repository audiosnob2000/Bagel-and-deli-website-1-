(function(){
"use strict";
var doc = document.documentElement;
doc.setAttribute("data-ready", "1");          // disarm the dead-man's switch
var RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
var EASE = "cubic-bezier(.22,1,.36,1)";
var $ = function(id){ return document.getElementById(id); };
/* every enhancement is independent — one failure must not blank the page */
function safe(fn){ try { fn(); } catch (err) { if (window.console) console.warn(err); } }

/* ---------- headline split into masked words ---------- */
safe(function(){
  var root = $("h1"); if (!root) return;
  function walk(node){
    var out = [];
    Array.prototype.forEach.call(node.childNodes, function(ch){
      if (ch.nodeType === 3){
        ch.textContent.split(/(\s+)/).forEach(function(tok){
          if (!tok) return;
          if (!tok.trim()){ out.push(document.createTextNode(" ")); return; }
          var mask = document.createElement("span"); mask.className = "w";
          var inner = document.createElement("span"); inner.className = "wi"; inner.textContent = tok;
          mask.appendChild(inner); out.push(mask);
        });
      } else if (ch.nodeType === 1){
        var clone = ch.cloneNode(false);
        walk(ch).forEach(function(n){ clone.appendChild(n); });
        out.push(clone);
      }
    });
    return out;
  }
  var nodes = walk(root);
  while (root.firstChild) root.removeChild(root.firstChild);
  nodes.forEach(function(n){ root.appendChild(n); });
  Array.prototype.forEach.call(root.querySelectorAll(".wi"), function(w,i){
    w.style.transitionDelay = (i*46) + "ms";
  });
});

/* ---------- entrance ---------- */
safe(function(){
  var hero = $("hero"), shot = $("shot"), copy = $("heroCopy");
  if (RM){
    document.querySelectorAll(".rv").forEach(function(e){ e.classList.add("in"); });
    hero.classList.add("lit"); shot.classList.add("in"); return;
  }
  requestAnimationFrame(function(){
    setTimeout(function(){
      shot.classList.add("in"); hero.classList.add("lit");
      Array.prototype.forEach.call(copy.querySelectorAll(".rv"), function(el,i){
        el.style.transitionDelay = (140 + i*130) + "ms";
        el.classList.add("in");
      });
    }, 60);
  });
});

/* ---------- scroll reveals ---------- */
safe(function(){
  if (RM || !("IntersectionObserver" in window)){
    document.querySelectorAll(".rv").forEach(function(e){ e.classList.add("in"); });
    return;
  }
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(en){
      if (!en.isIntersecting) return;
      var kids = en.target.querySelectorAll(".rv");
      var list = kids.length ? kids : [en.target];
      Array.prototype.forEach.call(list, function(el,i){
        el.style.transitionDelay = Math.min(i*58, 420) + "ms";
        el.classList.add("in");
      });
      io.unobserve(en.target);
    });
  }, {threshold:0.08, rootMargin:"0px 0px -40px 0px"});
  document.querySelectorAll(".items,.gal,.reviews,.s-head,.about,.visit").forEach(function(g){ io.observe(g); });
  document.querySelectorAll(".rv").forEach(function(el){
    if (!el.closest(".items,.gal,.reviews,.s-head,.about,.visit,.hero-copy")) io.observe(el);
  });
  /* belt and braces: nothing may stay invisible past 4s */
  setTimeout(function(){
    document.querySelectorAll(".rv:not(.in)").forEach(function(e){ e.style.transitionDelay="0ms"; e.classList.add("in"); });
  }, 4000);
});

/* ---------- progress bar, parallax, sticky shadow ---------- */
safe(function(){
  var prog = $("prog"), inner = $("shotInner"), mast = $("mast"), hero = $("hero"), ticking = false;
  function frame(){
    var y = window.scrollY || 0;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    if (prog) prog.style.transform = "scaleX(" + (max > 0 ? Math.min(y/max,1) : 0) + ")";
    if (mast) mast.classList.toggle("stuck", y > 12);
    if (!RM && inner && y < hero.offsetHeight) inner.style.transform = "translate3d(0," + (y*0.11) + "px,0)";
    ticking = false;
  }
  addEventListener("scroll", function(){ if(!ticking){ ticking = true; requestAnimationFrame(frame); } }, {passive:true});
  frame();
});

/* ---------- menu nav: sliding indicator + scroll-spy ---------- */
safe(function(){
  var mn = $("menunav"), slider = $("slider"), mast = $("mast");
  var navWrap = document.querySelector(".menunav-wrap");
  var tabs = Array.prototype.slice.call(mn.querySelectorAll("button"));
  if (!tabs.length) return;
  var current = -1;
  var lockUntil = 0;   // while set, the spy stays out of the way

  function moveTo(i, animate){
    if (i < 0 || i >= tabs.length) return;
    var b = tabs[i];
    if (!animate) slider.style.transition = "none";
    slider.style.setProperty("--x", b.offsetLeft + "px");
    slider.style.setProperty("--w", b.offsetWidth + "px");
    slider.classList.add("ready");
    if (!animate){ void slider.offsetHeight; slider.style.transition = ""; }
    tabs.forEach(function(t,n){ t.setAttribute("aria-current", n===i ? "true" : "false"); });
    current = i;
    var l = b.offsetLeft, r = l + b.offsetWidth;
    if (l < mn.scrollLeft || r > mn.scrollLeft + mn.clientWidth)
      mn.scrollTo({left: l - 16, behavior: RM ? "auto" : "smooth"});
  }

  /* Measure the sticky stack at click time rather than trusting a fixed
     offset -- the header and nav change height across breakpoints. */
  function stickyHeight(){
    return (mast ? mast.offsetHeight : 0) + (navWrap ? navWrap.offsetHeight : 0);
  }
  function docTop(el){
    var y = 0;
    while (el){ y += el.offsetTop; el = el.offsetParent; }
    return y;
  }

  /* ---- mobile category filter ----
     On phones the full menu is ~7 screens tall. Below 720px, tapping a tab
     shows only that category instead of jumping within one long list.
     Desktop is untouched: goTo() below branches on isMobile(). */
  var courses = tabs.map(function(t){ return document.getElementById(t.dataset.target); });
  var filterBar = $("menuFilterBar"), filterLabel = $("menuFilterLabel"), showAllBtn = $("menuShowAll");
  var filtering = false;
  var isMobile = function(){ return matchMedia("(max-width:720px)").matches; };

  function applyFilter(i){
    filtering = true;
    courses.forEach(function(c,n){
      if (!c) return;
      var show = n === i;
      c.classList.toggle("m-hide", !show);
      // Correctness (m-hide) happens synchronously above; this class is
      // purely decorative and never gated on -- a second rapid tap just
      // restarts it, it never blocks the real state change.
      c.classList.remove("m-enter");
      if (show && !RM){ void c.offsetWidth; c.classList.add("m-enter"); }
    });
    if (filterBar) filterBar.classList.add("active");
    if (filterLabel && courses[i]){
      var n = courses[i].querySelectorAll(".item").length;
      filterLabel.textContent = n + (n === 1 ? " item" : " items");
    }
  }
  function clearFilter(){
    filtering = false;
    courses.forEach(function(c){ if (c){ c.classList.remove("m-hide"); c.classList.remove("m-enter"); } });
    if (filterBar) filterBar.classList.remove("active");
  }
  function syncResponsive(){
    if (isMobile()){ applyFilter(current < 0 ? 0 : current); }
    else { clearFilter(); }
  }
  if (showAllBtn) showAllBtn.addEventListener("click", function(){
    clearFilter();
    navWrap.scrollIntoView({behavior: RM ? "auto" : "smooth", block:"start"});
  });

  function goTo(i){
    var sec = courses[i];
    if (!sec) return;
    if (isMobile()){
      applyFilter(i);
      moveTo(i, true);
      var head = sec.querySelector(".course-head") || sec;
      var y = docTop(head) - stickyHeight() - 16;
      lockUntil = Date.now() + (RM ? 0 : 700);
      window.scrollTo({top: Math.max(0, y), behavior: RM ? "auto" : "smooth"});
      return;
    }
    var head = sec.querySelector(".course-head") || sec;
    var y = docTop(head) - stickyHeight() - 16;
    lockUntil = Date.now() + (RM ? 0 : 1100);
    moveTo(i, true);                                   // one move, straight to target
    window.scrollTo({top: Math.max(0, y), behavior: RM ? "auto" : "smooth"});
  }
  tabs.forEach(function(b,i){ b.addEventListener("click", function(){ goTo(i); }); });

  function mask(){ mn.classList.toggle("masked", mn.scrollWidth > mn.clientWidth + 2); }
  moveTo(0,false); mask(); syncResponsive();
  addEventListener("resize", function(){ moveTo(current < 0 ? 0 : current, false); mask(); syncResponsive(); });

  if ("IntersectionObserver" in window){
    var ids = tabs.map(function(t){ return t.dataset.target; });
    var spy = new IntersectionObserver(function(entries){
      if (Date.now() < lockUntil) return;              // ignore sections flying past
      if (filtering) return;                            // hidden sections can't intersect anyway, but be explicit
      entries.forEach(function(en){
        if (!en.isIntersecting) return;
        var i = ids.indexOf(en.target.id);
        if (i > -1 && i !== current) moveTo(i, true);
      });
    }, {rootMargin:"-156px 0px -62% 0px", threshold:0});
    ids.forEach(function(id){ var el = document.getElementById(id); if (el) spy.observe(el); });
  }
});

/* ---------- live open status, New York time ---------- */
safe(function(){
  var HOURS = {0:[300,900],1:[300,930],2:[300,930],3:[300,930],4:[300,930],5:[300,930],6:[300,930]};
  var el = $("status"), tx = $("statusText");
  if (!el || !tx || typeof Intl === "undefined") return;
  function nyNow(){
    var parts = new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",weekday:"short",hour:"numeric",minute:"numeric",hour12:false}).formatToParts(new Date());
    var g = {}; parts.forEach(function(p){ g[p.type] = p.value; });
    var days = {Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6};
    var h = parseInt(g.hour,10); if (h === 24) h = 0;
    return {day: days[g.weekday], mins: h*60 + parseInt(g.minute,10)};
  }
  function fmt(m){
    var h = Math.floor(m/60), mm = m%60, ap = h>=12 ? "PM":"AM", hh = h%12; if (hh===0) hh=12;
    return hh + ":" + (mm<10?"0":"") + mm + " " + ap;
  }
  function paint(){
    var now = nyNow(), span = HOURS[now.day];
    var open = now.mins >= span[0] && now.mins < span[1];
    el.classList.toggle("open", open); el.classList.toggle("shut", !open);
    if (open){ tx.innerHTML = "Open now <b>· closes " + fmt(span[1]) + "</b>"; }
    else {
      var after = now.mins >= span[1], nd = after ? (now.day+1)%7 : now.day;
      tx.innerHTML = "Closed <b>· opens " + fmt(HOURS[nd][0]) + (after ? " tomorrow" : " today") + "</b>";
    }
    document.querySelectorAll("#hours div").forEach(function(row){
      row.classList.toggle("today", (row.dataset.days||"").split(",").indexOf(String(now.day)) > -1);
    });
  }
  paint(); setInterval(paint, 30000);
});

/* ---------- gallery cursor parallax ---------- */
safe(function(){
  var gal = $("gal"); if (!gal || RM) return;
  gal.addEventListener("mousemove", function(ev){
    var t = ev.target.closest(".tile"); if (!t) return;
    var r = t.getBoundingClientRect();
    var px = (ev.clientX - r.left)/r.width, py = (ev.clientY - r.top)/r.height;
    t.style.setProperty("--tx", ((px-.5)*-12).toFixed(2) + "px");
    t.style.setProperty("--ty", ((py-.5)*-12).toFixed(2) + "px");
    t.style.setProperty("--mx", (px*100).toFixed(1) + "%");
    t.style.setProperty("--my", (py*100).toFixed(1) + "%");
  });
  gal.addEventListener("mouseout", function(ev){
    var t = ev.target.closest(".tile"); if (!t) return;
    t.style.setProperty("--tx","0px"); t.style.setProperty("--ty","0px");
  });
});

/* ---------- lightbox with shared-element transition ---------- */
safe(function(){
  var gal = $("gal"), lb = $("lb"), lbImg = $("lbImg"), lbCount = $("lbCount");
  if (!gal || !lb) return;
  var tiles = Array.prototype.slice.call(gal.querySelectorAll(".tile"));
  var order = tiles, shots = [];
  var idx = 0, from = null, anim = null;

  /* photos can be visually reordered per breakpoint via CSS `order` —
     always navigate in the order they actually appear on screen */
  function sync(){
    order = tiles.map(function(t, i){ return {t:t, o:parseInt(getComputedStyle(t).order,10) || 0, i:i}; })
      .sort(function(a,b){ return a.o - b.o || a.i - b.i; })
      .map(function(x){ return x.t; });
    shots = order.map(function(t){ var im = t.querySelector("img"); return {s:im.src, a:im.alt}; });
  }
  sync();

  function show(i){
    idx = (i + shots.length) % shots.length;
    lbImg.src = shots[idx].s; lbImg.alt = shots[idx].a;
    lbCount.textContent = (idx+1) + " / " + shots.length;
  }
  function flip(tileImg, reverse){
    if (RM || !tileImg || !lbImg.animate) return null;
    var a = tileImg.getBoundingClientRect(), b = lbImg.getBoundingClientRect();
    if (!b.width || !b.height) return null;
    var s = Math.max(a.width/b.width, a.height/b.height);
    var dx = (a.left + a.width/2) - (b.left + b.width/2);
    var dy = (a.top + a.height/2) - (b.top + b.height/2);
    var small = {transform:"translate("+dx+"px,"+dy+"px) scale("+s+")", opacity:.45};
    var full  = {transform:"none", opacity:1};
    return lbImg.animate(reverse ? [full, small] : [small, full],
      {duration: reverse ? 300 : 480, easing: EASE, fill:"both"});
  }
  function reset(){ if (anim){ anim.cancel(); anim = null; } }
  function open(tile){
    sync();
    from = tile; show(order.indexOf(tile));
    lb.classList.add("on"); document.body.style.overflow = "hidden";
    var img = tile.querySelector("img");
    var run = function(){ reset(); anim = flip(img, false); };
    if (lbImg.complete) requestAnimationFrame(run);
    else lbImg.addEventListener("load", function h(){ lbImg.removeEventListener("load",h); requestAnimationFrame(run); });
    $("lbX").focus();
  }
  function close(){
    var tile = from, img = tile && tile.querySelector("img");
    var done = function(){
      lb.classList.remove("on"); document.body.style.overflow = ""; reset();
      if (tile && tile.focus) tile.focus();
    };
    reset();
    var back = flip(img, true);
    if (back){ back.onfinish = done; anim = back; } else done();
  }
  function step(d){ reset(); lbImg.style.transform = ""; show(idx + d); }

  gal.addEventListener("click", function(ev){
    var t = ev.target.closest(".tile"); if (t) open(t);
  });
  gal.addEventListener("keydown", function(ev){
    if (ev.key !== "Enter" && ev.key !== " ") return;
    var t = ev.target.closest(".tile"); if (!t) return;
    ev.preventDefault(); open(t);
  });
  $("lbX").addEventListener("click", close);
  $("lbP").addEventListener("click", function(){ step(-1); });
  $("lbN").addEventListener("click", function(){ step(1); });
  lb.addEventListener("click", function(ev){ if (ev.target === lb) close(); });
  document.addEventListener("keydown", function(ev){
    if (!lb.classList.contains("on")) return;
    if (ev.key === "Escape") close();
    if (ev.key === "ArrowLeft") step(-1);
    if (ev.key === "ArrowRight") step(1);
  });

  /* swipe left/right to move between photos */
  var tx = null, ty = null;
  lb.addEventListener("touchstart", function(ev){
    if (ev.touches.length !== 1) return;
    tx = ev.touches[0].clientX; ty = ev.touches[0].clientY;
  }, {passive:true});
  lb.addEventListener("touchend", function(ev){
    if (tx === null) return;
    var dx = ev.changedTouches[0].clientX - tx;
    var dy = ev.changedTouches[0].clientY - ty;
    tx = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
  }, {passive:true});
});

/* ---------- theme ---------- */
safe(function(){
  var SUN = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/></svg>';
  var MOON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5z"/></svg>';
  var btn = $("theme"); if (!btn) return;
  function dark(){
    var s = doc.getAttribute("data-theme");
    return s ? s === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  }
  function paint(){ btn.innerHTML = dark() ? SUN : MOON; }
  btn.addEventListener("click", function(){ doc.setAttribute("data-theme", dark() ? "light" : "dark"); paint(); });
  paint();
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", paint);
});

/* ---------- mobile nav + year ---------- */
safe(function(){
  var nav = $("nav"), burger = $("burger");
  burger.addEventListener("click", function(){
    burger.setAttribute("aria-expanded", String(nav.classList.toggle("open")));
  });
  nav.addEventListener("click", function(ev){
    if (ev.target.tagName === "A"){ nav.classList.remove("open"); burger.setAttribute("aria-expanded","false"); }
  });
});
safe(function(){ $("yr").textContent = new Date().getFullYear(); });
})();
