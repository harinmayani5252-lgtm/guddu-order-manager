/* ==========================================================================
   designs.js — shared Design Library (photos) on Supabase Storage.
   - Photos are compressed to ~1000px JPEG (~120KB) before upload.
   - Files go in the public Storage bucket "designs"; a row in table
     "designs" maps a design number -> public URL (shared by all users).
   - A lightweight metadata cache in localStorage powers offline listing
     and PDF matching (images themselves load/cache from their URL).
   Requires the one-time setup in supabase-designs.sql + a public bucket.
   ========================================================================== */
(function (global) {
  'use strict';

  var CACHE_KEY = 'gom.designs';
  var BUCKET = 'designs';

  function cfg() { return DB.Settings.get().sync || {}; }
  function ready() { return !!(cfg().enabled && cfg().url && cfg().anonKey); }
  function base() { return cfg().url.replace(/\/+$/, ''); }
  function headers(extra) {
    var c = cfg();
    return Object.assign({ 'apikey': c.anonKey, 'Authorization': 'Bearer ' + c.anonKey }, extra || {});
  }

  /* ---- normalization for matching (handles W-412(3), S04(E) …) ---- */
  function norm(dn) { return String(dn || '').toUpperCase().replace(/\s+/g, ''); }
  function baseNorm(dn) { return norm(dn).replace(/\(([^)]*)\)\s*$/, ''); } // drop a trailing (…) group

  /* ---- local metadata cache ---- */
  function readCache() { try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '[]'); } catch (e) { return []; } }
  function writeCache(list) { localStorage.setItem(CACHE_KEY, JSON.stringify(list)); }

  /* ---- image compression (canvas) -> Blob + preview dataURL ---- */
  function compress(file, maxDim, quality) {
    maxDim = maxDim || 1000; quality = quality || 0.72;
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var w = img.width, h = img.height;
        var s = Math.min(1, maxDim / Math.max(w, h));
        var cw = Math.round(w * s), ch = Math.round(h * s);
        var c = document.createElement('canvas'); c.width = cw; c.height = ch;
        var x = c.getContext('2d');
        x.fillStyle = '#fff'; x.fillRect(0, 0, cw, ch);
        x.drawImage(img, 0, 0, cw, ch);
        URL.revokeObjectURL(url);
        c.toBlob(function (blob) {
          if (!blob) { reject(new Error('Could not process image')); return; }
          resolve({ blob: blob, dataUrl: c.toDataURL('image/jpeg', 0.7), w: cw, h: ch });
        }, 'image/jpeg', quality);
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('Not a readable image')); };
      img.src = url;
    });
  }

  async function req(path, opts) {
    var res = await fetch(base() + path, opts);
    if (!res.ok) {
      var msg = 'Error ' + res.status;
      try { var j = await res.json(); if (j && j.message) msg += ': ' + j.message; } catch (e) {}
      throw new Error(msg);
    }
    return res;
  }

  var Designs = {
    ready: ready,
    norm: norm,

    listLocal: function () {
      return readCache().slice().sort(function (a, b) { return (b.created_at || 0) - (a.created_at || 0); });
    },

    /* pull the shared list from Supabase into the local cache */
    refresh: async function () {
      if (!ready()) return readCache();
      var res = await req('/rest/v1/designs?select=*', { headers: headers() });
      var rows = await res.json();
      var list = rows.map(function (r) {
        return { id: r.id, design_number: r.design_number, norm: r.norm, path: r.path, url: r.url, created_at: new Date(r.created_at).getTime() };
      });
      writeCache(list);
      return list;
    },

    /* upload one compressed photo + insert its row */
    add: async function (designNumber, blob) {
      if (!ready()) throw new Error('Cloud not configured.');
      var dn = String(designNumber || '').trim();
      if (!dn) throw new Error('Design number is required.');
      var id = DB.uid();
      var path = id + '.jpg';
      // 1) upload to Storage bucket
      await req('/storage/v1/object/' + BUCKET + '/' + path, {
        method: 'POST',
        headers: headers({ 'Content-Type': 'image/jpeg', 'x-upsert': 'true' }),
        body: blob,
      });
      var url = base() + '/storage/v1/object/public/' + BUCKET + '/' + path;
      // 2) insert row
      var row = { id: id, design_number: dn, norm: norm(dn), path: path, url: url,
                  created_by: (DB.Auth.current() || {}).name || '', created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      await req('/rest/v1/designs', {
        method: 'POST',
        headers: headers({ 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates,return=minimal' }),
        body: JSON.stringify(row),
      });
      var list = readCache();
      list.push({ id: id, design_number: dn, norm: norm(dn), path: path, url: url, created_at: Date.now() });
      writeCache(list);
      return row;
    },

    remove: async function (id) {
      var list = readCache();
      var rec = list.find(function (d) { return d.id === id; });
      if (rec) {
        try { await req('/storage/v1/object/' + BUCKET + '/' + rec.path, { method: 'DELETE', headers: headers() }); } catch (e) {}
        try { await req('/rest/v1/designs?id=eq.' + encodeURIComponent(id), { method: 'DELETE', headers: headers({ 'Prefer': 'return=minimal' }) }); } catch (e) {}
      }
      writeCache(list.filter(function (d) { return d.id !== id; }));
    },

    /* find a photo URL for a design number: exact match first, then base-number */
    match: function (designNumber) {
      var list = readCache();
      var n = norm(designNumber), bn = baseNorm(designNumber);
      var hit = list.find(function (d) { return d.norm === n; });
      if (!hit) hit = list.find(function (d) { return d.norm === bn || baseNorm(d.design_number) === bn; });
      return hit || null;
    },

    /* for an order: return [{design_number, url}] for items that have a photo */
    forOrder: function (order) {
      var out = [], seen = {};
      (order.items || []).forEach(function (it) {
        var m = Designs.match(it.design_number);
        if (m && !seen[m.id]) { seen[m.id] = 1; out.push({ design_number: it.design_number, url: m.url }); }
      });
      return out;
    },

    compress: compress,
    count: function () { return readCache().length; },
  };

  global.Designs = Designs;
})(window);
