/* ==========================================================================
   data.js — local persistence, auth, and domain models
   All data lives in localStorage so the app works fully offline.
   (Optional Supabase cloud sync layered on top in sync.js.)
   ========================================================================== */
(function (global) {
  'use strict';

  var KEYS = {
    session: 'gom.session',
    settings: 'gom.settings',
    customers: 'gom.customers',
    orders: 'gom.orders',
    counter: 'gom.counter',
  };

  /* ---- low-level storage helpers ---- */
  function read(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch (e) { return fallback; }
  }
  function write(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

  function uid() {
    return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  /* ---- Auth: 10 local admin accounts, all with admin rights ----
     username: guddu1 .. guddu10   password: guddu<n>guddu            */
  var ACCOUNTS = (function () {
    var list = [];
    for (var n = 1; n <= 10; n++) {
      list.push({ username: 'guddu' + n, password: 'guddu' + n + 'guddu', name: 'Guddu ' + n, role: 'admin' });
    }
    return list;
  })();

  var Auth = {
    accounts: ACCOUNTS,
    login: function (username, password) {
      var u = String(username || '').trim().toLowerCase();
      var acc = ACCOUNTS.find(function (a) { return a.username === u; });
      if (!acc || acc.password !== password) return null;
      var session = { username: acc.username, name: acc.name, role: acc.role, ts: Date.now() };
      write(KEYS.session, session);
      return session;
    },
    current: function () { return read(KEYS.session, null); },
    logout: function () { localStorage.removeItem(KEYS.session); },
  };

  /* ---- Cloud config (baked in so EVERY device auto-connects) ----
     The anon key is a public client key and is meant to ship in the app.
     Access is gated by the app logins + Supabase Row Level Security.
     To change projects later, just edit these two lines and redeploy. */
  var CLOUD = {
    url: 'https://jgfkzjydmgukdsqkvwvb.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpnZmt6anlkbWd1a2RzcWt2d3ZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1NDMxNDQsImV4cCI6MjEwMDExOTE0NH0.bK1TnEFAAIGwKJ4lh7KRqGY9kayfIuum5D_2fqyNVSw',
  };

  /* ---- Settings (company profile + preferences + sync config) ---- */
  var DEFAULT_SETTINGS = {
    company: {
      name: 'GUDDU FASHION PRIVATE LIMITED',
      tagline: 'WHERE POSSIBILITIES ARE INFINITE',
      gst: '24AACCG3656K1ZJ',
      address: '501, 5th Floor, Twin Tower, Sahara Darwaja, Ring Road, Surat - 395002',
      contacts: [
        { label: 'Niravbhai (Account)', phone: '9879069343' },
        { label: 'Jenishbhai', phone: '9099757282' },
      ],
      paymentTerms: 'All Nett Rates',
    },
    theme: 'light',
    orderPrefix: 'ORD-',
    sync: { enabled: !!(CLOUD.url && CLOUD.anonKey), url: CLOUD.url, anonKey: CLOUD.anonKey },
  };

  var Settings = {
    get: function () {
      var s = read(KEYS.settings, null);
      if (!s) { s = JSON.parse(JSON.stringify(DEFAULT_SETTINGS)); }
      else {
        // shallow-merge to pick up new default keys after upgrades
        s.company = Object.assign({}, DEFAULT_SETTINGS.company, s.company || {});
        if (!s.company.name || s.company.name === 'GUDDU GROUP') {
          s.company.name = DEFAULT_SETTINGS.company.name;
        }
        if (!s.company.gst) {
          s.company.gst = DEFAULT_SETTINGS.company.gst;
        }
        s.sync = Object.assign({}, DEFAULT_SETTINGS.sync, s.sync || {});
        if (!s.orderPrefix) s.orderPrefix = DEFAULT_SETTINGS.orderPrefix;
      }
      // Baked-in cloud config always wins, so a fresh device (guddu2, guddu3…)
      // is pre-connected without anyone typing the URL/key.
      if (CLOUD.url && CLOUD.anonKey) {
        s.sync.url = CLOUD.url;
        s.sync.anonKey = CLOUD.anonKey;
        s.sync.enabled = true;
      }
      return s;
    },
    save: function (s) { write(KEYS.settings, s); return s; },
    resetCompany: function () {
      var s = Settings.get();
      s.company = JSON.parse(JSON.stringify(DEFAULT_SETTINGS.company));
      return Settings.save(s);
    },
  };

  /* ---- Customers ---- */
  var Customers = {
    all: function () { return read(KEYS.customers, []); },
    find: function (id) { return Customers.all().find(function (c) { return c.id === id; }) || null; },
    /* upsert by (mobile) or (name) so repeat customers are reused */
    upsert: function (data) {
      var list = Customers.all();
      var key = (data.mobile || '').replace(/\D/g, '');
      var existing = list.find(function (c) {
        return (key && (c.mobile || '').replace(/\D/g, '') === key) ||
               (!key && c.customer_name.toLowerCase() === (data.customer_name || '').toLowerCase());
      });
      if (existing) {
        Object.assign(existing, data, { id: existing.id, created_at: existing.created_at, updated_at: Date.now() });
        write(KEYS.customers, list);
        return existing;
      }
      var rec = Object.assign({ id: uid(), created_at: Date.now(), updated_at: Date.now() }, data);
      list.push(rec);
      write(KEYS.customers, list);
      return rec;
    },
    count: function () { return Customers.all().length; },
  };

  /* ---- Orders ---- */
  function nextOrderNumber() {
    var s = Settings.get();
    var c = read(KEYS.counter, 0) + 1;
    write(KEYS.counter, c);
    return s.orderPrefix + String(c).padStart(6, '0'); // ORD-000001
  }

  function computeTotals(items) {
    var pieces = 0, designs = 0, sets = 0;
    (items || []).forEach(function (it) {
      var p = parseInt(it.pieces, 10);
      var s = parseInt(it.sets, 10);
      if (String(it.design_number || '').trim() !== '' || !isNaN(p) || !isNaN(s)) designs++;
      if (!isNaN(p)) pieces += p;
      if (!isNaN(s)) sets += s;
    });
    return { total_pieces: pieces, total_designs: designs, total_sets: sets };
  }

  var Orders = {
    all: function () {
      return read(KEYS.orders, []).slice().sort(function (a, b) { return b.created_at - a.created_at; });
    },
    find: function (id) { return read(KEYS.orders, []).find(function (o) { return o.id === id; }) || null; },

    create: function (payload) {
      var list = read(KEYS.orders, []);
      var session = Auth.current();
      var items = (payload.items || []).filter(function (it) {
        return String(it.design_number || '').trim() !== '' || String(it.pieces || '').trim() !== '' || String(it.sets || '').trim() !== '';
      }).map(function (it) {
        return {
          design_number: String(it.design_number || '').trim(),
          pieces: it.pieces === '' || it.pieces == null ? null : parseInt(it.pieces, 10),
          sets: it.sets === '' || it.sets == null ? null : parseInt(it.sets, 10),
          rate: it.rate === '' || it.rate == null ? null : Number(it.rate),
          remarks: String(it.remarks || '').trim(),
        };
      });
      var totals = computeTotals(items);
      var customer = Customers.upsert({
        customer_name: payload.customer.customer_name,
        mobile: payload.customer.mobile,
        office_address: payload.customer.office_address,
        delivery_address: payload.customer.delivery_address,
        transport_name: payload.customer.transport_name,
        broker_name: payload.customer.broker_name,
        broker_phone: payload.customer.broker_phone,
      });
      var order = {
        id: uid(),
        order_number: nextOrderNumber(),
        customer_id: customer.id,
        customer: JSON.parse(JSON.stringify(payload.customer)), // snapshot for the PDF
        order_date: payload.order_date,
        notes: String(payload.notes || '').trim(),
        payment_terms: payload.payment_terms || Settings.get().company.paymentTerms,
        items: items,
        total_pieces: totals.total_pieces,
        total_designs: totals.total_designs,
        total_sets: totals.total_sets,
        created_by: session ? session.name : 'Unknown',
        created_by_user: session ? session.username : '',
        created_at: Date.now(),
        updated_at: Date.now(),
      };
      list.push(order);
      write(KEYS.orders, list);
      return order;
    },

    update: function (id, payload) {
      var list = read(KEYS.orders, []);
      var o = list.find(function (x) { return x.id === id; });
      if (!o) return null;
      var items = (payload.items || []).filter(function (it) {
        return String(it.design_number || '').trim() !== '' || String(it.pieces || '').trim() !== '' || String(it.sets || '').trim() !== '';
      }).map(function (it) {
        return {
          design_number: String(it.design_number || '').trim(),
          pieces: it.pieces === '' || it.pieces == null ? null : parseInt(it.pieces, 10),
          sets: it.sets === '' || it.sets == null ? null : parseInt(it.sets, 10),
          rate: it.rate === '' || it.rate == null ? null : Number(it.rate),
          remarks: String(it.remarks || '').trim(),
        };
      });
      var totals = computeTotals(items);
      Customers.upsert(payload.customer);
      o.customer = JSON.parse(JSON.stringify(payload.customer));
      o.order_date = payload.order_date;
      o.notes = String(payload.notes || '').trim();
      o.payment_terms = payload.payment_terms || o.payment_terms;
      o.items = items;
      o.total_pieces = totals.total_pieces;
      o.total_designs = totals.total_designs;
      o.total_sets = totals.total_sets;
      o.updated_at = Date.now();
      write(KEYS.orders, list);
      return o;
    },

    remove: function (id) {
      var list = read(KEYS.orders, []).filter(function (o) { return o.id !== id; });
      write(KEYS.orders, list);
    },

    search: function (q, dateFrom, dateTo) {
      var term = String(q || '').trim().toLowerCase();
      return Orders.all().filter(function (o) {
        if (dateFrom && o.order_date < dateFrom) return false;
        if (dateTo && o.order_date > dateTo) return false;
        if (!term) return true;
        var hay = [
          o.order_number,
          o.customer.customer_name,
          o.customer.mobile,
          (o.items || []).map(function (i) { return i.design_number; }).join(' '),
        ].join(' ').toLowerCase();
        return hay.indexOf(term) !== -1;
      });
    },
  };

  /* ---- Stats for dashboard ---- */
  function todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  var Stats = {
    today: todayStr,
    compute: function () {
      var orders = Orders.all();
      var t = todayStr();
      var todays = orders.filter(function (o) { return o.order_date === t; });
      return {
        totalOrders: orders.length,
        ordersToday: todays.length,
        totalCustomers: Customers.count(),
        piecesToday: todays.reduce(function (s, o) { return s + (o.total_pieces || 0); }, 0),
        totalPieces: orders.reduce(function (s, o) { return s + (o.total_pieces || 0); }, 0),
      };
    },
  };

  /* ---- Backup / restore (reliable cross-device transfer) ---- */
  var Backup = {
    export: function () {
      return {
        _app: 'guddu-order-manager', _v: 1, exported_at: new Date().toISOString(),
        settings: Settings.get(),
        customers: Customers.all(),
        orders: read(KEYS.orders, []),
        counter: read(KEYS.counter, 0),
      };
    },
    import: function (obj, mode) {
      if (!obj || obj._app !== 'guddu-order-manager') throw new Error('Not a valid backup file.');
      if (mode === 'replace') {
        if (obj.settings) write(KEYS.settings, obj.settings);
        write(KEYS.customers, obj.customers || []);
        write(KEYS.orders, obj.orders || []);
        write(KEYS.counter, obj.counter || 0);
      } else { // merge
        var custById = {}; Customers.all().forEach(function (c) { custById[c.id] = c; });
        (obj.customers || []).forEach(function (c) { custById[c.id] = c; });
        write(KEYS.customers, Object.keys(custById).map(function (k) { return custById[k]; }));
        var ordById = {}; read(KEYS.orders, []).forEach(function (o) { ordById[o.id] = o; });
        (obj.orders || []).forEach(function (o) { ordById[o.id] = o; });
        write(KEYS.orders, Object.keys(ordById).map(function (k) { return ordById[k]; }));
        write(KEYS.counter, Math.max(read(KEYS.counter, 0), obj.counter || 0));
      }
    },
  };

  global.DB = { KEYS: KEYS, Auth: Auth, Settings: Settings, Customers: Customers, Orders: Orders, Stats: Stats, Backup: Backup, uid: uid, computeTotals: computeTotals };
})(window);
