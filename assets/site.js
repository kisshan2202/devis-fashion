(function () {
  "use strict";

  var photos = (window.DEVIS_GALLERY || []).filter(function (p) { return p && p.src; });
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  var SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL", "6XL"];
  var FB_PAGE = "https://www.facebook.com/profile.php?id=100064059729236";
  var MESSENGER = "https://m.me/100064059729236";
  var SETTINGS = window.DEVIS_SETTINGS || {};
  var WA = String(SETTINGS.whatsapp || "").replace(/\D/g, "");
  if (WA.length < 8) WA = "";
  // No sizes ticked in the admin page means every size can be ordered.
  function sizesOf(p) {
    var list = Array.isArray(p.sizes) ? p.sizes : [];
    var picked = SIZES.filter(function (sz) { return list.indexOf(sz) >= 0; });
    return picked.length ? picked : SIZES.slice();
  }
  function sizesLine(p) {
    var sz = sizesOf(p);
    return sz.length === SIZES.length ? "Sizes XS to 6XL" : "Sizes " + sz.join(", ");
  }
  function captionHTML(p) {
    var out = esc(p.caption || "");
    if (p.price) out += '<span class="price">' + esc(p.price) + "</span>";
    return out;
  }
  function altText(p, i) {
    return p.caption ? p.caption : "Dress photo " + (i + 1);
  }

  /* ================= Carousel ================= */
  var rail = document.querySelector("[data-rail]");
  var capEl = document.querySelector("[data-caption]");
  var countEl = document.querySelector("[data-count]");
  var railSizes = document.querySelector("[data-rail-sizes]");
  var playBtn = document.querySelector("[data-play]");
  var prevBtn = document.querySelector("[data-prev]");
  var nextBtn = document.querySelector("[data-next]");
  var slides = [];
  var active = 0;
  var timer = null;
  var playing = !reduceMotion;
  var paused = false; // temporary pause (hover, focus, lightbox)

  if (!photos.length) {
    rail.innerHTML = '<div class="rail-empty">New dresses are on the way.</div>';
    [prevBtn, nextBtn, playBtn].forEach(function (b) { b.hidden = true; });
  } else {
    photos.forEach(function (p, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "slide";
      b.setAttribute("aria-roledescription", "slide");
      b.innerHTML = '<img src="' + esc(p.src) + '" alt="' + esc(altText(p, i)) + '"' + (i > 2 ? ' loading="lazy"' : "") + ">";
      rail.appendChild(b);
      slides.push(b);
    });
    if (photos.length < 2) { prevBtn.hidden = nextBtn.hidden = playBtn.hidden = true; playing = false; }
    render();
    updatePlayBtn();
    schedule();
  }

  function offsetOf(i) {
    var n = photos.length, off = i - active;
    if (n > 2) {
      if (off > n / 2) off -= n;
      if (off < -n / 2) off += n;
    }
    return off;
  }

  function render() {
    slides.forEach(function (el, i) {
      var off = offsetOf(i);
      var abs = Math.abs(off);
      var x = off === 0 ? 0 : Math.sign(off) * (abs === 1 ? 74 : 132);
      var s = abs === 0 ? 1 : abs === 1 ? 0.8 : 0.64;
      el.style.transform = "translateX(-50%) translateX(" + x + "%) scale(" + s + ")";
      el.style.opacity = abs === 0 ? 1 : abs === 1 ? 0.55 : abs === 2 ? 0.22 : 0;
      el.style.zIndex = 10 - abs;
      el.style.visibility = abs > 2 ? "hidden" : "visible";
      el.classList.toggle("is-active", off === 0);
      el.tabIndex = off === 0 ? 0 : -1;
      el.setAttribute("aria-label", off === 0 ? "Open " + altText(photos[i], i) + " full screen" : "Show " + altText(photos[i], i));
      el.setAttribute("aria-hidden", abs > 1 ? "true" : "false");
    });
    var p = photos[active];
    capEl.innerHTML = captionHTML(p) || "&nbsp;";
    railSizes.textContent = sizesLine(p);
    countEl.textContent = (active + 1) + " of " + photos.length;
  }

  function go(i) {
    var n = photos.length;
    active = ((i % n) + n) % n;
    render();
    schedule();
  }

  function schedule() {
    clearTimeout(timer);
    if (playing && !paused && photos.length > 1) timer = setTimeout(function () { go(active + 1); }, 4500);
  }
  function updatePlayBtn() {
    playBtn.textContent = playing ? "Pause slideshow" : "Play slideshow";
    playBtn.setAttribute("aria-pressed", playing ? "true" : "false");
  }

  if (photos.length) {
    prevBtn.addEventListener("click", function () { go(active - 1); });
    nextBtn.addEventListener("click", function () { go(active + 1); });
    playBtn.addEventListener("click", function () { playing = !playing; updatePlayBtn(); schedule(); });

    var showcase = document.querySelector(".showcase");
    showcase.addEventListener("mouseenter", function () { paused = true; schedule(); });
    showcase.addEventListener("mouseleave", function () { paused = false; schedule(); });
    showcase.addEventListener("focusin", function () { paused = true; schedule(); });
    showcase.addEventListener("focusout", function () { paused = false; schedule(); });

    rail.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { go(active - 1); slides[active].focus(); e.preventDefault(); }
      if (e.key === "ArrowRight") { go(active + 1); slides[active].focus(); e.preventDefault(); }
    });

    // Swipe + click
    var startX = 0, startY = 0, dragging = false, moved = false, pid = null;
    rail.addEventListener("pointerdown", function (e) {
      if (e.button !== 0) return;
      startX = e.clientX; startY = e.clientY; dragging = true; moved = false; pid = e.pointerId;
    });
    rail.addEventListener("pointermove", function (e) {
      if (!dragging || e.pointerId !== pid) return;
      if (Math.abs(e.clientX - startX) > 8) moved = true;
    });
    rail.addEventListener("pointerup", function (e) {
      if (!dragging || e.pointerId !== pid) return;
      dragging = false;
      var dx = e.clientX - startX, dy = e.clientY - startY;
      if (moved && Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) go(active + (dx < 0 ? 1 : -1));
    });
    rail.addEventListener("pointercancel", function () { dragging = false; });
    rail.addEventListener("click", function (e) {
      if (moved) { moved = false; return; }
      var el = e.target.closest(".slide");
      if (!el) return;
      var i = slides.indexOf(el);
      if (i === active) openLightbox(i); else go(i);
    });
  }

  /* ================= Grid ================= */
  var grid = document.querySelector("[data-grid]");
  if (!photos.length) {
    grid.innerHTML = '<p class="grid-empty">No photos yet. Follow us on Facebook to see new dresses first.</p>';
  } else {
    photos.forEach(function (p, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "tile";
      b.setAttribute("aria-label", "Open " + altText(p, i) + " full screen");
      b.innerHTML = '<img src="' + esc(p.src) + '" alt="" loading="lazy">' +
        (p.caption || p.price ? '<span class="tile-cap">' + captionHTML(p) + "</span>" : "");
      b.addEventListener("click", function () { openLightbox(i); });
      grid.appendChild(b);
    });
  }

  /* ================= Lightbox with zoom ================= */
  var lb = document.querySelector("[data-lightbox]");
  var stage = lb.querySelector("[data-stage]");
  var img = lb.querySelector("[data-lb-img]");
  var lbCount = lb.querySelector("[data-lb-count]");
  var lbCap = lb.querySelector("[data-lb-caption]");
  var lbPrev = lb.querySelector("[data-lb-prev]");
  var lbNext = lb.querySelector("[data-lb-next]");
  var zoomInBtn = lb.querySelector("[data-zoom-in]");
  var zoomOutBtn = lb.querySelector("[data-zoom-out]");
  var closeBtn = lb.querySelector("[data-close]");
  var lbIndex = 0, scale = 1, tx = 0, ty = 0, lastFocus = null;
  var MIN = 1, MAX = 4, STEP = 2.5;

  function apply() {
    img.style.transform = "translate(" + tx + "px," + ty + "px) scale(" + scale + ")";
    lb.classList.toggle("is-zoomed", scale > 1.01);
    zoomOutBtn.disabled = scale <= MIN + 0.01;
    zoomInBtn.disabled = scale >= MAX - 0.01;
  }
  function clampPan() {
    var r = stage.getBoundingClientRect();
    var w = img.offsetWidth * scale, h = img.offsetHeight * scale;
    var mx = Math.max(0, (w - r.width) / 2), my = Math.max(0, (h - r.height) / 2);
    tx = Math.min(mx, Math.max(-mx, tx));
    ty = Math.min(my, Math.max(-my, ty));
  }
  // Zoom so the point (cx, cy) on screen stays under the finger/cursor.
  function zoomTo(next, cx, cy) {
    next = Math.min(MAX, Math.max(MIN, next));
    var r = stage.getBoundingClientRect();
    var px = (cx == null ? r.left + r.width / 2 : cx) - (r.left + r.width / 2);
    var py = (cy == null ? r.top + r.height / 2 : cy) - (r.top + r.height / 2);
    tx = px - (px - tx) * (next / scale);
    ty = py - (py - ty) * (next / scale);
    scale = next;
    if (scale <= MIN + 0.01) { scale = 1; tx = 0; ty = 0; }
    clampPan();
    apply();
  }
  function resetZoom() { scale = 1; tx = 0; ty = 0; apply(); }

  function showLb(i) {
    var n = photos.length;
    lbIndex = ((i % n) + n) % n;
    var p = photos[lbIndex];
    resetZoom();
    img.src = p.src;
    img.alt = altText(p, lbIndex);
    lbCount.textContent = (lbIndex + 1) + " of " + n;
    lbCap.innerHTML = captionHTML(p);
    setupOrder(p);
    lbPrev.hidden = lbNext.hidden = n < 2;
  }
  function openLightbox(i) {
    lastFocus = document.activeElement;
    paused = true; schedule();
    showLb(i);
    lb.hidden = false;
    document.documentElement.style.overflow = "hidden";
    closeBtn.focus();
  }
  function closeLightbox() {
    lb.hidden = true;
    document.documentElement.style.overflow = "";
    paused = false;
    if (photos.length) { go(lbIndex); }
    if (lastFocus && lastFocus.focus) {
      var target = lastFocus.classList && lastFocus.classList.contains("slide") ? slides[active] : lastFocus;
      target.focus();
    }
  }

  closeBtn.addEventListener("click", closeLightbox);
  lbPrev.addEventListener("click", function () { showLb(lbIndex - 1); });
  lbNext.addEventListener("click", function () { showLb(lbIndex + 1); });
  zoomInBtn.addEventListener("click", function () { zoomTo(scale * 1.5); });
  zoomOutBtn.addEventListener("click", function () { zoomTo(scale / 1.5); });

  lb.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { closeLightbox(); return; }
    if (e.target.closest && e.target.closest("[data-order]") && (e.key === "ArrowLeft" || e.key === "ArrowRight")) return;
    if (e.key === "ArrowLeft" && scale === 1) showLb(lbIndex - 1);
    if (e.key === "ArrowRight" && scale === 1) showLb(lbIndex + 1);
    if (e.key === "+" || e.key === "=") zoomTo(scale * 1.5);
    if (e.key === "-") zoomTo(scale / 1.5);
    if (e.key === "Tab") { // keep focus inside the lightbox
      var f = Array.prototype.filter.call(lb.querySelectorAll("button"), function (b) { return !b.hidden && !b.disabled && b.offsetParent !== null; });
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
      else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
    }
  });

  stage.addEventListener("wheel", function (e) {
    e.preventDefault();
    zoomTo(scale * Math.exp(-e.deltaY * 0.0022), e.clientX, e.clientY);
  }, { passive: false });

  var pointers = new Map();
  var gesture = null; // {type, ...}
  stage.addEventListener("pointerdown", function (e) {
    stage.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      gesture = { type: "one", sx: e.clientX, sy: e.clientY, tx: tx, ty: ty, moved: false };
    } else if (pointers.size === 2) {
      var pts = Array.from(pointers.values());
      gesture = { type: "pinch", dist: dist(pts[0], pts[1]), scale: scale };
      lb.classList.add("is-dragging");
    }
  });
  stage.addEventListener("pointermove", function (e) {
    if (!pointers.has(e.pointerId) || !gesture) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (gesture.type === "pinch" && pointers.size >= 2) {
      var pts = Array.from(pointers.values());
      var mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      zoomTo(gesture.scale * dist(pts[0], pts[1]) / gesture.dist, mid.x, mid.y);
    } else if (gesture.type === "one") {
      var dx = e.clientX - gesture.sx, dy = e.clientY - gesture.sy;
      if (Math.abs(dx) + Math.abs(dy) > 6) gesture.moved = true;
      if (scale > 1 && gesture.moved) {
        lb.classList.add("is-dragging");
        tx = gesture.tx + dx; ty = gesture.ty + dy;
        clampPan(); apply();
      }
    }
  });
  function endPointer(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    if (!gesture) return;
    if (gesture.type === "one" && pointers.size === 0) {
      var dx = e.clientX - gesture.sx;
      if (!gesture.moved && e.type === "pointerup") {
        // tap / click toggles zoom at that spot
        if (scale > 1) resetZoom(); else zoomTo(STEP, e.clientX, e.clientY);
      } else if (scale === 1 && Math.abs(dx) > 60 && photos.length > 1) {
        showLb(lbIndex + (dx < 0 ? 1 : -1));
      }
      gesture = null;
    } else if (gesture.type === "pinch" && pointers.size < 2) {
      gesture = pointers.size === 1 ? (function () {
        var p = Array.from(pointers.values())[0];
        return { type: "one", sx: p.x, sy: p.y, tx: tx, ty: ty, moved: true };
      })() : null;
    }
    if (!pointers.size) lb.classList.remove("is-dragging");
  }
  stage.addEventListener("pointerup", endPointer);
  stage.addEventListener("pointercancel", endPointer);
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y) || 1; }


  /* ================= Size, quantity and ordering ================= */
  var sizePick = document.querySelector("[data-size-pick]");
  var qtyEl = document.querySelector("[data-qty]");
  var qtyMinus = document.querySelector("[data-qty-minus]");
  var qtyPlus = document.querySelector("[data-qty-plus]");
  var orderBtn = document.querySelector("[data-order-btn]");
  var orderMsg = document.querySelector("[data-order-msg]");
  var MAX_QTY = 20;
  orderBtn.textContent = WA ? "Order on WhatsApp" : "Order on Messenger";

  // Header and footer order links follow the same choice.
  if (WA) {
    var hello = "https://wa.me/" + WA + "?text=" + encodeURIComponent("Hello Devi's Fashion, I'd like to ask about a dress.");
    document.querySelectorAll("[data-order-link]").forEach(function (a) {
      a.href = hello;
      if (a.dataset.waText) a.textContent = a.dataset.waText;
    });
    var waFoot = document.querySelector("[data-wa-footer]");
    if (waFoot) waFoot.hidden = false;
  }
  var order = { size: null, qty: 1, sizes: [] };

  function setupOrder(p) {
    order.sizes = sizesOf(p);
    order.size = order.sizes.length === 1 ? order.sizes[0] : null;
    order.qty = 1;
    orderMsg.textContent = "";
    orderMsg.classList.remove("is-error");
    sizePick.innerHTML = order.sizes.map(function (sz) {
      return '<button type="button" class="size-btn" data-pick="' + sz + '" aria-pressed="' + (sz === order.size) + '">' + sz + "</button>";
    }).join("");
    showQty();
  }
  function showQty() {
    qtyEl.textContent = order.qty;
    qtyMinus.disabled = order.qty <= 1;
    qtyPlus.disabled = order.qty >= MAX_QTY;
  }
  sizePick.addEventListener("click", function (e) {
    var b = e.target.closest("[data-pick]");
    if (!b) return;
    order.size = b.dataset.pick;
    sizePick.querySelectorAll("[data-pick]").forEach(function (x) {
      x.setAttribute("aria-pressed", x === b ? "true" : "false");
    });
    if (orderMsg.classList.contains("is-error")) { orderMsg.textContent = ""; orderMsg.classList.remove("is-error"); }
  });
  qtyMinus.addEventListener("click", function () { if (order.qty > 1) { order.qty--; showQty(); } });
  qtyPlus.addEventListener("click", function () { if (order.qty < MAX_QTY) { order.qty++; showQty(); } });

  function photoUrl(p) {
    try { return new URL(p.src, location.href).href; } catch (_) { return p.src; }
  }
  function orderText(p) {
    var lines = ["Hello Devi's Fashion, I'd like to order:"];
    lines.push("Dress: " + (p.caption || "Photo " + (lbIndex + 1)));
    if (order.size) lines.push("Size: " + order.size);
    else lines.push("Size: please tell me which sizes you have");
    lines.push("Quantity: " + order.qty);
    if (p.price) lines.push("Price: " + p.price + (order.qty > 1 ? " each" : ""));
    lines.push("Photo: " + photoUrl(p));
    return lines.join("\n");
  }
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return fallbackCopy(text); });
    }
    return Promise.resolve(fallbackCopy(text));
  }
  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed"; ta.style.opacity = "0";
    lb.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand("copy"); } catch (_) {}
    ta.remove();
    return ok;
  }
  orderBtn.addEventListener("click", function () {
    var p = photos[lbIndex];
    if (order.sizes.length && !order.size) {
      orderMsg.classList.add("is-error");
      orderMsg.textContent = "Choose a size first.";
      var first = sizePick.querySelector("[data-pick]");
      if (first) first.focus();
      return;
    }
    var text = orderText(p);
    if (WA) {
      var waUrl = "https://wa.me/" + WA + "?text=" + encodeURIComponent(text);
      var w = window.open(waUrl, "_blank");
      if (w) { try { w.opener = null; } catch (_) {} } else { location.href = waUrl; }
      orderMsg.classList.remove("is-error");
      orderMsg.textContent = "WhatsApp is opening with your order typed in. Tap send to place it.";
      return;
    }
    // Start the copy and open Messenger in the same tap, so phones allow both.
    var copied = copyText(text);
    var win = window.open(MESSENGER, "_blank");
    if (win) { try { win.opener = null; } catch (_) {} }
    copied.then(function (ok) {
      orderMsg.classList.remove("is-error");
      orderMsg.textContent = ok
        ? "Your order is copied. Paste it in the Messenger chat and send it."
        : "Messenger is opening. Tell us the dress, size " + (order.size || "") + " and quantity " + order.qty + ".";
    });
    if (!win) copied.then(function () { location.href = MESSENGER; });
  });

  /* ================= Size chart ================= */
  var chart = document.querySelector("[data-chart]");
  var chartClose = chart.querySelector("[data-chart-close]");
  var chartReturn = null;
  function openChart(e) {
    chartReturn = e && e.currentTarget ? e.currentTarget : document.activeElement;
    paused = true; schedule();
    chart.hidden = false;
    document.documentElement.style.overflow = "hidden";
    chartClose.focus();
  }
  function closeChart() {
    chart.hidden = true;
    if (lb.hidden) { document.documentElement.style.overflow = ""; paused = false; schedule(); }
    if (chartReturn && chartReturn.focus) chartReturn.focus();
  }
  document.querySelectorAll("[data-chart-open]").forEach(function (b) { b.addEventListener("click", openChart); });
  chartClose.addEventListener("click", closeChart);
  chart.addEventListener("click", function (e) { if (e.target === chart) closeChart(); });
  chart.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { e.stopPropagation(); closeChart(); }
    if (e.key === "Tab") { e.preventDefault(); chartClose.focus(); }
  });

  window.addEventListener("resize", function () { if (!lb.hidden) { clampPan(); apply(); } });
})();
