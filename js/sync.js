/* ==========================================================================
   sync.js — Supabase cloud sync (shared team data).
   When enabled, all 10 users read/write ONE common set of orders.

   Design:
   - Auto-sync on app boot and after every create / edit / delete.
   - fullSync() = push all local rows (upsert) then pull the cloud as the
     source of truth (so remote deletes and other users' orders appear).
   - Order-number counter is bumped to the cloud max on every pull so
     sequential numbers stay in step across devices.
   The app still works 100% offline; sync silently no-ops when offline or
   disabled and retries on the next action.
   Run supabase-schema.sql once in your Supabase project first.
   ========================================================================== */
(function (global) {
  'use strict';

  function cfg() { return DB.Settings.get().sync || {}; }
  function enabled() { var c = cfg(); return !!(c.enabled && c.url && c.anonKey); }

  function headers(extra) {
    var c = cfg();
    return Object.assign({
      'Content-Type': 'application/json',
      'apikey': c.anonKey,
      'Authorization': 'Bearer ' + c.anonKey,
    }, extra || {});
  }
  function base() { return cfg().url.replace(/\/+$/, '') + '/rest/v1'; }

  /* ---- row mappers (JS timestamps <-> ISO) ---- */
  function orderToRow(o) {
    return {
      id: o.id, order_number: o.order_number, customer: o.customer, order_date: o.order_date,
      notes: o.notes, payment_terms: o.payment_terms, items: o.items,
      total_pieces: o.total_pieces, total_designs: o.total_designs,
      created_by: o.created_by, created_by_user: o.created_by_user,
      created_at: new Date(o.created_at).toISOString(),
      updated_at: new Date(o.updated_at).toISOString(),
    };
  }
  function rowToOrder(r) {
    return Object.assign({}, r, {
      created_at: new Date(r.created_at).getTime(),
      updated_at: new Date(r.updated_at).getTime(),
    });
  }
  function custToRow(c) {
    return Object.assign({}, c, {
      created_at: new Date(c.created_at).toISOString(),
      updated_at: new Date(c.updated_at || c.created_at).toISOString(),
    });
  }
  function rowToCust(r) {
    return Object.assign({}, r, {
      created_at: new Date(r.created_at).getTime(),
      updated_at: new Date(r.updated_at || r.created_at).getTime(),
    });
  }

  async function req(path, opts) {
    var res = await fetch(base() + path, opts);
    if (!res.ok) {
      var msg = 'Sync error (' + res.status + ')';
      try { var j = await res.json(); if (j && j.message) msg += ': ' + j.message; } catch (e) {}
      throw new Error(msg);
    }
    return res;
  }

  async function test() {
    await req('/orders?select=id&limit=1', { headers: headers() });
    return true;
  }

  /* ---- push local -> cloud (upsert) ---- */
  async function pushAll() {
    var customers = DB.Customers.all().map(custToRow);
    var orders = JSON.parse(localStorage.getItem(DB.KEYS.orders) || '[]').map(orderToRow);
    var opt = { method: 'POST', headers: headers({ 'Prefer': 'resolution=merge-duplicates,return=minimal' }) };
    if (customers.length) await req('/customers', Object.assign({ body: JSON.stringify(customers) }, opt));
    if (orders.length) await req('/orders', Object.assign({ body: JSON.stringify(orders) }, opt));
  }

  /* ---- pull cloud -> local (cloud is source of truth) ---- */
  async function pullReplace() {
    var oRes = await req('/orders?select=*', { headers: headers() });
    var orders = (await oRes.json()).map(rowToOrder);
    localStorage.setItem(DB.KEYS.orders, JSON.stringify(orders));

    var cRes = await req('/customers?select=*', { headers: headers() });
    var custs = (await cRes.json()).map(rowToCust);
    localStorage.setItem(DB.KEYS.customers, JSON.stringify(custs));

    // keep the sequential order-number counter ahead of the cloud max
    var maxNum = 0;
    orders.forEach(function (o) {
      var m = String(o.order_number || '').match(/(\d+)\s*$/);
      if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
    });
    var local = parseInt(localStorage.getItem(DB.KEYS.counter) || '0', 10);
    localStorage.setItem(DB.KEYS.counter, JSON.stringify(Math.max(local, maxNum)));
    return orders.length;
  }

  /* ---- delete one order remotely ---- */
  async function remove(id) {
    if (!enabled()) return;
    await req('/orders?id=eq.' + encodeURIComponent(id), { method: 'DELETE', headers: headers({ 'Prefer': 'return=minimal' }) });
  }

  async function fullSync() {
    if (!enabled()) throw new Error('Sync is not enabled.');
    await pushAll();
    var count = await pullReplace();
    var s = DB.Settings.get(); s.sync.lastSync = Date.now(); DB.Settings.save(s);
    return { count: count, at: new Date() };
  }

  /* ---- fire-and-forget helpers used by the UI ---- */
  var busy = false;
  function background(after) {
    if (!enabled() || busy) return;
    busy = true;
    fullSync()
      .then(function (r) { if (typeof after === 'function') after(null, r); })
      .catch(function (e) { if (typeof after === 'function') after(e); })
      .finally(function () { busy = false; });
  }
  // push a single change quickly, then reconcile in the background
  function pushChange(after) {
    if (!enabled()) return;
    background(after);
  }

  global.Sync = {
    enabled: enabled, test: test, pushAll: pushAll, pullReplace: pullReplace,
    remove: remove, fullSync: fullSync, background: background, pushChange: pushChange,
    isBusy: function () { return busy; },
  };
})(window);
