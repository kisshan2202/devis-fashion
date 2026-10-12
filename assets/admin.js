(function () {
  "use strict";

  var MAX_SIDE = 1600;     // longest side of saved photos, in pixels
  var QUALITY = 0.85;      // JPEG quality for saved photos

  var uid = 0;
  var items = (window.DEVIS_GALLERY || []).filter(function (p) { return p && p.src; }).map(function (p) {
    return { id: ++uid, src: p.src, caption: p.caption || "", price: p.price || "", added: p.added || "", isNew: false };
  });
  var removed = [];
  var changes = 0;

  var list = document.querySelector("[data-list]");
  var empty = document.querySelector("[data-empty]");
  var total = document.querySelector("[data-total]");
  var removedWrap = document.querySelector("[data-removed-wrap]");
  var removedList = document.querySelector("[data-removed]");
  var statusEl = document.querySelector("[data-status]");
  var savebar = document.querySelector("[data-savebar]");
  var exportBtn = document.querySelector("[data-export]");
  var fileInput = document.querySelector("[data-file]");
  var drop = document.querySelector("[data-drop]");
  var whereSel = document.querySelector("[data-where]");
  var addMsg = document.querySelector("[data-add-msg]");

  var ICON = {
    up: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6"/></svg>',
    down: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M6 13l6 6 6-6"/></svg>',
    top: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14M12 20V9M6 14l6-6 6 6"/></svg>',
    del: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/></svg>',
    grip: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>'
  };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function today() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function previewSrc(it) { return it.previewUrl || it.src; }
  function fileName(src) { return String(src).split("/").pop(); }

  function changed() {
    changes++;
    updateStatus();
  }
  function updateStatus() {
    savebar.classList.toggle("is-dirty", changes > 0);
    statusEl.textContent = changes === 0
      ? "No changes yet."
      : changes + (changes === 1 ? " change" : " changes") + " not on the site yet.";
    exportBtn.disabled = changes === 0;
  }

  /* ---------- Rendering ---------- */
  function render() {
    list.innerHTML = "";
    items.forEach(function (it, i) {
      var li = document.createElement("li");
      li.className = "item";
      li.dataset.id = it.id;
      li.innerHTML =
        '<div class="handle" title="Drag to move">' +
          '<span class="handle-pos">' + (i + 1) + "</span>" + ICON.grip +
        "</div>" +
        '<div class="thumb"><img src="' + esc(previewSrc(it)) + '" alt=""></div>' +
        '<div class="fields">' +
          '<label>Caption<input type="text" data-field="caption" maxlength="80" placeholder="e.g. Floral maxi dress" value="' + esc(it.caption) + '"></label>' +
          '<label>Price<input type="text" data-field="price" maxlength="20" placeholder="e.g. Rs 1,200" value="' + esc(it.price) + '"></label>' +
          '<div class="meta">' + (it.isNew ? '<span class="tag-new">New</span>' : "") +
            "<span>" + esc(fileName(it.src)) + "</span>" + (it.added ? "<span>Added " + esc(it.added) + "</span>" : "") +
          "</div>" +
        "</div>" +
        '<div class="actions">' +
          '<button type="button" class="icon-btn" data-act="top" aria-label="Move photo ' + (i + 1) + ' to first place"' + (i === 0 ? " disabled" : "") + ">" + ICON.top + "</button>" +
          '<button type="button" class="icon-btn" data-act="up" aria-label="Move photo ' + (i + 1) + ' up"' + (i === 0 ? " disabled" : "") + ">" + ICON.up + "</button>" +
          '<button type="button" class="icon-btn" data-act="down" aria-label="Move photo ' + (i + 1) + ' down"' + (i === items.length - 1 ? " disabled" : "") + ">" + ICON.down + "</button>" +
          '<button type="button" class="icon-btn danger" data-act="del" aria-label="Delete photo ' + (i + 1) + '">' + ICON.del + "</button>" +
        "</div>";
      list.appendChild(li);
    });
    empty.hidden = items.length > 0;
    total.textContent = items.length + (items.length === 1 ? " photo" : " photos");

    removedWrap.hidden = removed.length === 0;
    removedList.innerHTML = "";
    removed.forEach(function (it) {
      var li = document.createElement("li");
      li.innerHTML = '<img src="' + esc(previewSrc(it)) + '" alt=""><span>' + esc(it.caption || fileName(it.src)) + "</span>" +
        '<button type="button" class="link-btn" data-restore="' + it.id + '">Undo</button>';
      removedList.appendChild(li);
    });
  }

  function indexOfId(id) {
    id = Number(id);
    for (var i = 0; i < items.length; i++) if (items[i].id === id) return i;
    return -1;
  }
  function move(from, to) {
    if (to < 0 || to >= items.length || from === to) return;
    var it = items.splice(from, 1)[0];
    items.splice(to, 0, it);
    changed();
    render();
  }
  function focusAction(id, act) {
    var btn = list.querySelector('[data-id="' + id + '"] [data-act="' + act + '"]');
    if (btn && !btn.disabled) btn.focus();
    else { var any = list.querySelector('[data-id="' + id + '"] .icon-btn:not(:disabled)'); if (any) any.focus(); }
  }

  /* ---------- List actions ---------- */
  list.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-act]");
    if (!btn) return;
    var li = btn.closest(".item");
    var id = Number(li.dataset.id);
    var i = indexOfId(id);
    var act = btn.dataset.act;
    if (act === "up") { move(i, i - 1); focusAction(id, "up"); }
    if (act === "down") { move(i, i + 1); focusAction(id, "down"); }
    if (act === "top") { move(i, 0); focusAction(id, "down"); }
    if (act === "del") {
      var it = items.splice(i, 1)[0];
      if (it.isNew && !it.exported) { if (it.previewUrl) URL.revokeObjectURL(it.previewUrl); changes = Math.max(0, changes - 1); updateStatus(); }
      else { removed.push(it); changed(); }
      render();
      var next = list.children[Math.min(i, items.length - 1)];
      if (next) { var b = next.querySelector('[data-act="del"]'); if (b) b.focus(); }
    }
  });

  list.addEventListener("input", function (e) {
    var f = e.target.dataset.field;
    if (!f) return;
    var it = items[indexOfId(e.target.closest(".item").dataset.id)];
    if (!it._edited) { it._edited = {}; }
    if (!it._edited[f]) { it._edited[f] = true; changed(); }
    it[f] = e.target.value;
  });

  removedList.addEventListener("click", function (e) {
    var b = e.target.closest("[data-restore]");
    if (!b) return;
    var id = Number(b.dataset.restore);
    for (var i = 0; i < removed.length; i++) {
      if (removed[i].id === id) {
        items.push(removed.splice(i, 1)[0]);
        changes = Math.max(0, changes - 1);
        break;
      }
    }
    updateStatus();
    render();
  });

  /* ---------- Drag to reorder ---------- */
  var dragId = null;
  list.addEventListener("pointerdown", function (e) {
    var h = e.target.closest(".handle");
    if (h) h.closest(".item").draggable = true;
  });
  list.addEventListener("dragstart", function (e) {
    var li = e.target.closest && e.target.closest(".item");
    if (!li) return;
    dragId = Number(li.dataset.id);
    li.classList.add("is-dragging");
    e.dataTransfer.effectAllowed = "move";
    try { e.dataTransfer.setData("text/plain", String(dragId)); } catch (_) {}
  });
  function clearMarks() {
    list.querySelectorAll(".drop-before,.drop-after").forEach(function (el) { el.classList.remove("drop-before", "drop-after"); });
  }
  list.addEventListener("dragover", function (e) {
    if (dragId == null) return;
    e.preventDefault();
    var li = e.target.closest(".item");
    clearMarks();
    if (!li || Number(li.dataset.id) === dragId) return;
    var r = li.getBoundingClientRect();
    li.classList.add(e.clientY < r.top + r.height / 2 ? "drop-before" : "drop-after");
  });
  list.addEventListener("drop", function (e) {
    if (dragId == null) return;
    e.preventDefault();
    var li = e.target.closest(".item");
    if (li && Number(li.dataset.id) !== dragId) {
      var r = li.getBoundingClientRect();
      var before = e.clientY < r.top + r.height / 2;
      var from = indexOfId(dragId);
      var it = items.splice(from, 1)[0];
      var to = indexOfId(li.dataset.id) + (before ? 0 : 1);
      items.splice(to, 0, it);
      changed();
    }
    dragId = null;
    render();
  });
  list.addEventListener("dragend", function () {
    dragId = null;
    clearMarks();
    list.querySelectorAll(".item").forEach(function (el) { el.classList.remove("is-dragging"); el.draggable = false; });
  });

  /* ---------- Adding photos ---------- */
  function decode(file) {
    if (window.createImageBitmap) {
      return createImageBitmap(file, { imageOrientation: "from-image" }).catch(function () { return decodeWithImg(file); });
    }
    return decodeWithImg(file);
  }
  function decodeWithImg(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var im = new Image();
      im.onload = function () { resolve(im); };
      im.onerror = function () { URL.revokeObjectURL(url); reject(new Error("decode")); };
      im.src = url;
    });
  }
  function resize(file) {
    return decode(file).then(function (src) {
      var w = src.width, h = src.height;
      var k = Math.min(1, MAX_SIDE / Math.max(w, h));
      var cw = Math.round(w * k), ch = Math.round(h * k);
      var c = document.createElement("canvas");
      c.width = cw; c.height = ch;
      var ctx = c.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, cw, ch);
      ctx.drawImage(src, 0, 0, cw, ch);
      if (src.close) src.close();
      return new Promise(function (resolve, reject) {
        c.toBlob(function (b) { b ? resolve(b) : reject(new Error("encode")); }, "image/jpeg", QUALITY);
      });
    });
  }
  function newName() {
    var used = {};
    items.concat(removed).forEach(function (it) { used[fileName(it.src)] = true; });
    var base = "dress-" + today().replace(/-/g, "");
    var name;
    do { name = base + "-" + Math.random().toString(36).slice(2, 6) + ".jpg"; } while (used[name]);
    return name;
  }

  function addFiles(files) {
    files = Array.prototype.slice.call(files || []);
    if (!files.length) return;
    addMsg.classList.remove("is-error");
    addMsg.textContent = "Adding " + files.length + (files.length === 1 ? " photo…" : " photos…");
    var failed = [];
    var added = [];
    var chain = Promise.resolve();
    files.forEach(function (f) {
      chain = chain.then(function () {
        if (!/^image\//.test(f.type) && !/\.(jpe?g|png|webp)$/i.test(f.name)) { failed.push(f.name); return; }
        return resize(f).then(function (blob) {
          var name = newName();
          added.push({
            id: ++uid, src: "images/" + name, caption: "", price: "", added: today(),
            isNew: true, blob: blob, previewUrl: URL.createObjectURL(blob)
          });
        }).catch(function () { failed.push(f.name); });
      });
    });
    chain.then(function () {
      if (added.length) {
        if (whereSel.value === "start") items = added.concat(items);
        else items = items.concat(added);
        changes += added.length;
        updateStatus();
        render();
      }
      var msg = added.length ? "Added " + added.length + (added.length === 1 ? " photo." : " photos.") : "";
      if (failed.length) {
        msg += (msg ? " " : "") + "Couldn't read " + failed.join(", ") + ". Save it as JPG or PNG and try again.";
        addMsg.classList.add("is-error");
      }
      addMsg.textContent = msg;
      fileInput.value = "";
    });
  }

  fileInput.addEventListener("change", function () { addFiles(fileInput.files); });
  ["dragenter", "dragover"].forEach(function (t) {
    drop.addEventListener(t, function (e) {
      if (!e.dataTransfer || Array.prototype.indexOf.call(e.dataTransfer.types, "Files") < 0) return;
      e.preventDefault(); drop.classList.add("is-over");
    });
  });
  ["dragleave", "drop"].forEach(function (t) {
    drop.addEventListener(t, function () { drop.classList.remove("is-over"); });
  });
  drop.addEventListener("drop", function (e) {
    if (!e.dataTransfer || !e.dataTransfer.files.length) return;
    e.preventDefault();
    addFiles(e.dataTransfer.files);
  });

  /* ---------- Export ---------- */
  function galleryJs() {
    var rows = items.map(function (it) {
      return "  " + JSON.stringify({ src: it.src, caption: it.caption.trim(), price: it.price.trim(), added: it.added });
    });
    return "// Devi's Fashion photo list.\n" +
      "// Edit it with admin.html (recommended) or by hand.\n" +
      "// The order here is the order on the home page: the first photo is shown first.\n" +
      "window.DEVIS_GALLERY = [\n" + rows.join(",\n") + "\n];\n";
  }

  exportBtn.addEventListener("click", function () {
    if (typeof JSZip === "undefined") {
      statusEl.textContent = "The download tool didn't load. Check that assets/jszip.min.js is in your website folder.";
      return;
    }
    exportBtn.disabled = true;
    statusEl.textContent = "Preparing your download…";
    var zip = new JSZip();
    zip.file("gallery.js", galleryJs());
    var imgs = zip.folder("images");
    items.forEach(function (it) { if (it.isNew && it.blob) imgs.file(fileName(it.src), it.blob); });
    var deletable = removed.filter(function (it) { return !it.isNew || it.exported; }).map(function (it) { return it.src; });
    if (deletable.length) {
      zip.file("PHOTOS-YOU-CAN-DELETE.txt",
        "These photos are no longer on the site. You can delete them from your images folder to save space:\n\n" +
        deletable.join("\n") + "\n");
    }
    zip.generateAsync({ type: "blob" }).then(function (blob) {
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "devis-fashion-update-" + today() + ".zip";
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
      changes = 0;
      items.forEach(function (it) { it._edited = null; if (it.isNew) it.exported = true; });
      updateStatus();
      statusEl.textContent = "Downloaded. Unzip it into your website folder, then upload the folder.";
    }).catch(function () {
      exportBtn.disabled = false;
      statusEl.textContent = "The download couldn't be made. Try again, or try another browser.";
    });
  });

  window.addEventListener("beforeunload", function (e) {
    if (changes > 0) { e.preventDefault(); e.returnValue = ""; }
  });

  updateStatus();
  render();
})();
