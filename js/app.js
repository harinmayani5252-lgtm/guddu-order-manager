/* ==========================================================================
   app.js — UI, hash routing, and all screens.
   Depends on data.js, pdf.js, sync.js.
   ========================================================================== */
(function () {
  'use strict';

  var app = document.getElementById('app');

  /* ---------- tiny helpers ---------- */
  function h(html) { var t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function fmtDate(iso) { return PDFGen.formatDate(iso); }

  var ICONS = {
    dash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
    pdf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.6" y1="13.5" x2="15.4" y2="17.5"/><line x1="15.4" y1="6.5" x2="8.6" y2="10.5"/></svg>',
    box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
    users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    layers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>',
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.2" y1="4.2" x2="5.6" y2="5.6"/><line x1="18.4" y1="18.4" x2="19.8" y2="19.8"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.2" y1="19.8" x2="5.6" y2="18.4"/><line x1="18.4" y1="5.6" x2="19.8" y2="4.2"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    out: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>',
    wa: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 14.4c-.3-.2-1.7-.9-2-1-.3-.1-.5-.2-.6.2-.2.3-.7 1-.9 1.1-.2.2-.3.2-.6.1-1.6-.8-2.6-1.4-3.7-3.2-.3-.5.3-.5.8-1.5.1-.2 0-.3 0-.5s-.6-1.6-.9-2.2c-.2-.5-.4-.5-.6-.5h-.5c-.2 0-.5.1-.7.3-.8.8-1 1.9-.6 3.1.6 1.9 1.9 3.5 3.6 4.6 2.4 1.5 3.3 1.4 4.5 1.2.7-.1 1.7-.7 2-1.4.2-.5.2-1 .1-1.1-.1-.1-.3-.2-.6-.3zM12 2a10 10 0 0 0-8.6 15l-1.3 4.8 4.9-1.3A10 10 0 1 0 12 2z"/></svg>',
    tg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.9 4.3 18.6 19c-.2 1-.9 1.3-1.8.8l-4.9-3.6-2.4 2.3c-.3.3-.5.5-1 .5l.3-4.9 8.9-8c.4-.3-.1-.5-.6-.2L6.9 12.7l-4.7-1.5c-1-.3-1-1 .2-1.5L20.6 3c.9-.3 1.6.2 1.3 1.3z"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22,6 12,13 2,6"/></svg>',
    inbox: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>',
    cloud: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"/><polyline points="8 16 12 12 16 16"/><line x1="12" y1="12" x2="12" y2="21"/></svg>',
    printer: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>',
  };

  /* ---------- toast ---------- */
  var toastWrap = h('<div class="toast-wrap"></div>'); document.body.appendChild(toastWrap);
  function toast(msg, kind) {
    var t = h('<div class="toast ' + (kind || 'ok') + '">' + esc(msg) + '</div>');
    toastWrap.appendChild(t);
    setTimeout(function () { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(function () { t.remove(); }, 300); }, 2600);
  }

  /* ---------- modal ---------- */
  function modal(node) {
    var back = h('<div class="modal-back"></div>');
    var card = h('<div class="card card-pad modal"></div>');
    card.appendChild(node);
    back.appendChild(card);
    back.addEventListener('click', function (e) { if (e.target === back) back.remove(); });
    document.body.appendChild(back);
    return { close: function () { back.remove(); }, el: card };
  }
  function confirmDialog(opts) {
    return new Promise(function (resolve) {
      var node = h('<div class="stack gap-16">' +
        '<h3>' + esc(opts.title) + '</h3>' +
        '<p class="muted small" style="margin:0">' + esc(opts.body) + '</p>' +
        '<div class="row gap-8" style="justify-content:flex-end">' +
        '<button class="btn btn-ghost" data-x>Cancel</button>' +
        '<button class="btn ' + (opts.danger ? 'btn-danger' : 'btn-primary') + '" data-ok>' + esc(opts.ok || 'Confirm') + '</button>' +
        '</div></div>');
      var m = modal(node);
      qs('[data-x]', node).onclick = function () { m.close(); resolve(false); };
      qs('[data-ok]', node).onclick = function () { m.close(); resolve(true); };
    });
  }

  /* ---------- theme ---------- */
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    var meta = qs('meta[name="theme-color"]'); if (meta) meta.setAttribute('content', t === 'dark' ? '#141726' : '#4f46e5');
  }
  function toggleTheme() {
    var s = DB.Settings.get(); s.theme = s.theme === 'dark' ? 'light' : 'dark'; DB.Settings.save(s); applyTheme(s.theme);
  }

  /* ================= ROUTER ================= */
  var routes = {};
  function route(path, fn) { routes[path] = fn; }
  function navigate(hash) { if (location.hash === hash) render(); else location.hash = hash; }
  window.addEventListener('hashchange', render);

  function currentRoute() {
    var hash = location.hash.replace(/^#/, '') || '/dashboard';
    var parts = hash.split('/').filter(Boolean);
    return { base: '/' + (parts[0] || 'dashboard'), param: parts[1] || null };
  }

  function render() {
    if (!DB.Auth.current()) { renderLogin(); return; }
    var r = currentRoute();
    var view = routes[r.base] || routes['/dashboard'];
    renderShell(r, function (content) { view(content, r.param); });
  }

  /* ================= LOGIN ================= */
  function renderLogin() {
    app.innerHTML = '';
    var wrap = h('<div class="auth-wrap"><div class="auth-card card card-pad stack gap-16"></div></div>');
    var card = qs('.auth-card', wrap);
    card.appendChild(h(
      '<div class="stack gap-12" style="align-items:center;text-align:center">' +
      '<span class="logo-mark auth-emblem">' + (window.LOGO_SVG || '') + '</span>' +
      '<div><h2 style="font-size:20px">Guddu Order Manager</h2>' +
      '<div class="muted small">Sign in to create & manage orders</div></div></div>'));
    var form = h(
      '<form class="stack gap-12" autocomplete="on">' +
      '<div class="field"><label>Username</label>' +
      '<input class="input" name="username" placeholder="guddu1" autocapitalize="none" autocomplete="username" required></div>' +
      '<div class="field"><label>Password</label>' +
      '<input class="input" name="password" type="password" placeholder="••••••••" autocomplete="current-password" required></div>' +
      '<div class="err-msg" data-err></div>' +
      '<button class="btn btn-primary btn-block" type="submit">Sign in</button>' +
      '</form>');
    form.onsubmit = function (e) {
      e.preventDefault();
      var u = form.username.value, p = form.password.value;
      var s = DB.Auth.login(u, p);
      if (!s) { qs('[data-err]', form).textContent = 'Incorrect username or password.'; return; }
      applyTheme(DB.Settings.get().theme);
      navigate('#/dashboard');
      render();
      toast('Welcome, ' + s.name);
      autoSync(true);
    };
    card.appendChild(form);
    card.appendChild(h('<div class="app-foot" style="padding-top:4px">Accounts: <b>guddu1–guddu10</b> • Created by <b>Keval Mayani</b></div>'));
    app.appendChild(wrap);
  }

  /* ================= SHELL ================= */
  var NAVS = [
    { path: '#/dashboard', base: '/dashboard', label: 'Dashboard', icon: 'dash' },
    { path: '#/new', base: '/new', label: 'New Order', icon: 'plus' },
    { path: '#/orders', base: '/orders', label: 'Orders', icon: 'list' },
    { path: '#/settings', base: '/settings', label: 'Settings', icon: 'gear' },
  ];

  function renderShell(r, fillContent) {
    var s = DB.Settings.get();
    var session = DB.Auth.current();
    var initials = (session.name || 'G').split(' ').map(function (x) { return x[0]; }).join('').slice(0, 2).toUpperCase();

    app.innerHTML = '';
    var shell = h('<div class="shell"></div>');

    // sidebar (desktop)
    var side = h('<aside class="sidebar"></aside>');
    side.appendChild(h(
      '<div class="brand"><span class="logo-mark brand-emblem">' + (window.LOGO_SVG || '') + '</span>' +
      '<div><div class="brand-name">' + esc(s.company.name) + '</div>' +
      '<div class="brand-sub">Order Manager</div></div></div>'));
    var nav = h('<nav class="nav"></nav>');
    NAVS.forEach(function (n) {
      var a = h('<a href="' + n.path + '" class="' + (r.base === n.base ? 'active' : '') + '">' + ICONS[n.icon] + '<span>' + n.label + '</span></a>');
      nav.appendChild(a);
    });
    side.appendChild(nav);
    var foot = h('<div class="sidebar-foot"></div>');
    foot.appendChild(h('<div class="user-chip"><div class="avatar">' + esc(initials) + '</div><div class="grow"><div style="font-weight:650;font-size:13px">' + esc(session.name) + '</div><div class="muted" style="font-size:11px">' + esc(session.username) + ' • admin</div></div></div>'));
    var logoutBtn = h('<button class="btn btn-ghost btn-block btn-sm">' + ICONS.out + ' Sign out</button>');
    logoutBtn.onclick = doLogout;
    foot.appendChild(logoutBtn);
    side.appendChild(foot);
    shell.appendChild(side);

    // main
    var main = h('<div class="main"></div>');
    var top = h('<div class="topbar"></div>');
    var pageTitle = { '/dashboard': 'Dashboard', '/new': 'New Order', '/orders': 'Order History', '/order': 'Order', '/settings': 'Settings' }[r.base] || '';
    top.appendChild(h('<h1>' + pageTitle + '</h1>'));
    top.appendChild(h('<div class="spacer"></div>'));
    var themeBtn = h('<button class="btn btn-icon btn-ghost" title="Toggle theme">' + (s.theme === 'dark' ? ICONS.sun : ICONS.moon) + '</button>');
    themeBtn.onclick = function () { toggleTheme(); render(); };
    top.appendChild(themeBtn);
    if (Sync.enabled()) {
      var syncBtn = h('<button class="btn btn-icon btn-ghost" title="Sync now (auto-syncs too)">' + ICONS.cloud + '</button>');
      syncBtn.onclick = function () {
        toast('Syncing…');
        Sync.fullSync().then(function (r) { toast('Synced ' + r.count + ' orders'); render(); }).catch(function (e) { toast(e.message, 'err'); });
      };
      top.appendChild(syncBtn);
    }
    var newBtn = h('<a href="#/new" class="btn btn-primary btn-sm hide-mobile">' + ICONS.plus + ' New Order</a>');
    top.appendChild(newBtn);
    main.appendChild(top);

    var content = h('<div class="content"></div>');
    main.appendChild(content);
    main.appendChild(h('<div class="app-foot">Guddu Order Manager • Created by <b>Keval Mayani</b></div>'));
    shell.appendChild(main);

    // mobile bottom nav
    var mnav = h('<nav class="mobile-nav"></nav>');
    NAVS.forEach(function (n) {
      mnav.appendChild(h('<a href="' + n.path + '" class="' + (r.base === n.base ? 'active' : '') + '">' + ICONS[n.icon] + '<span>' + n.label.replace('New Order', 'New') + '</span></a>'));
    });
    shell.appendChild(mnav);

    app.appendChild(shell);
    fillContent(content);
  }

  function doLogout() {
    confirmDialog({ title: 'Sign out?', body: 'You can sign back in with any guddu account.', ok: 'Sign out' }).then(function (ok) {
      if (ok) { DB.Auth.logout(); location.hash = ''; renderLogin(); }
    });
  }

  /* ================= DASHBOARD ================= */
  route('/dashboard', function (content) {
    var st = DB.Stats.compute();
    var cards = [
      { label: 'Total Orders', value: st.totalOrders, icon: 'box' },
      { label: 'Orders Today', value: st.ordersToday, icon: 'plus' },
      { label: 'Total Customers', value: st.totalCustomers, icon: 'users' },
      { label: 'Pieces Today', value: st.piecesToday, icon: 'layers' },
    ];
    var stats = h('<div class="stats"></div>');
    cards.forEach(function (c) {
      stats.appendChild(h(
        '<div class="card stat"><div class="stat-head"><span class="label">' + c.label + '</span>' +
        '<span class="ico">' + ICONS[c.icon] + '</span></div>' +
        '<div class="value">' + c.value + '</div></div>'));
    });
    content.appendChild(stats);

    content.appendChild(h('<div class="row between mt-24" style="margin-bottom:12px"><h3 style="font-size:16px">Recent Orders</h3><a href="#/orders" class="small">View all →</a></div>'));
    var recent = DB.Orders.all().slice(0, 8);
    content.appendChild(ordersTable(recent, true));
  });

  function ordersTable(orders, compact) {
    if (!orders.length) {
      return h('<div class="card empty">' + ICONS.inbox + '<div>No orders yet.</div>' +
        '<a href="#/new" class="btn btn-primary btn-sm mt-16" style="display:inline-flex">' + ICONS.plus + ' Create first order</a></div>');
    }
    var card = h('<div class="card"><div class="tbl-wrap"></div></div>');
    var tbl = h('<table class="tbl"><thead><tr>' +
      '<th>Order #</th><th>Customer</th><th>Date</th><th>Designs</th><th>Pieces</th><th></th>' +
      '</tr></thead><tbody></tbody></table>');
    var tb = qs('tbody', tbl);
    orders.forEach(function (o) {
      var tr = h('<tr style="cursor:pointer">' +
        '<td><span class="mono">' + esc(o.order_number) + '</span></td>' +
        '<td><div style="font-weight:600">' + esc(o.customer.customer_name || '-') + '</div>' +
        '<div class="muted" style="font-size:12px">' + esc(o.customer.mobile || '') + '</div></td>' +
        '<td class="muted">' + fmtDate(o.order_date) + '</td>' +
        '<td>' + (o.total_designs || 0) + '</td>' +
        '<td><span class="badge pill-num">' + (o.total_pieces || 0) + '</span></td>' +
        '<td style="text-align:right;white-space:nowrap"></td></tr>');
      var viewBtn = h('<button class="btn btn-ghost btn-icon btn-sm" title="Open">' + ICONS.share + '</button>');
      viewBtn.onclick = function (e) { e.stopPropagation(); navigate('#/order/' + o.id); };
      qs('td:last-child', tr).appendChild(viewBtn);
      tr.onclick = function () { navigate('#/order/' + o.id); };
      tb.appendChild(tr);
    });
    qs('.tbl-wrap', card).appendChild(tbl);
    return card;
  }

  /* ================= ORDER ENTRY (new + edit) ================= */
  route('/new', function (content) { orderForm(content, null); });
  route('/edit', function (content, id) { orderForm(content, DB.Orders.find(id)); });

  function orderForm(content, existing) {
    var s = DB.Settings.get();
    var c = existing ? existing.customer : {};
    var state = { items: existing ? existing.items.map(function (i) { return Object.assign({}, i); }) : [emptyItem(), emptyItem(), emptyItem()] };

    var form = h('<form class="stack gap-20" novalidate></form>');

    // --- Customer info ---
    var cust = h('<div class="card card-pad stack gap-16"></div>');
    cust.appendChild(h('<div class="section-title">Customer Information</div>'));
    cust.appendChild(h('<div class="grid-2">' +
      field('customer_name', 'Customer Name (M/s) *', c.customer_name, 'text', 'RMKV') +
      field('mobile', 'Mobile Number', c.mobile, 'tel', '98765 43210') +
      '</div>'));
    cust.appendChild(h('<div class="grid-2">' +
      field('office_address', 'Office Address', c.office_address, 'text', 'City') +
      field('delivery_address', 'Delivery Address', c.delivery_address, 'text', 'Chennai') +
      '</div>'));
    cust.appendChild(h('<div class="grid-2">' +
      field('transport_name', 'Transport Name', c.transport_name, 'text', 'Laxmi Cargo') +
      field('broker_name', 'Broker Name', c.broker_name, 'text', 'A-5') +
      '</div>'));
    cust.appendChild(h('<div class="grid-2">' +
      field('broker_phone', 'Broker Phone', c.broker_phone, 'tel', '') +
      '<div></div></div>'));
    form.appendChild(cust);

    // --- Order info ---
    var oinfo = h('<div class="card card-pad stack gap-16"></div>');
    oinfo.appendChild(h('<div class="section-title">Order Information</div>'));
    oinfo.appendChild(h('<div class="grid-2">' +
      field('order_date', 'Order Date *', existing ? existing.order_date : DB.Stats.today(), 'date') +
      field('payment_terms', 'Payment Terms', existing ? existing.payment_terms : s.company.paymentTerms, 'text', 'All Nett Rates') +
      '</div>'));
    oinfo.appendChild(h('<div class="field"><label>Notes</label><textarea class="textarea" name="notes" placeholder="Any special instructions...">' + esc(existing ? existing.notes : '') + '</textarea></div>'));
    form.appendChild(oinfo);

    // --- Products ---
    var prod = h('<div class="card card-pad stack gap-12"></div>');
    prod.appendChild(h('<div class="row between"><div class="section-title">Product Table</div></div>'));
    prod.appendChild(h('<div class="rows-head"><span>#</span><span>Design No.</span><span>Pieces</span><span>Rate</span><span>Remarks</span><span></span></div>'));
    var rowsEl = h('<div class="rows"></div>');
    prod.appendChild(rowsEl);
    var addBtn = h('<button type="button" class="btn btn-outline btn-sm" style="align-self:flex-start">' + ICONS.plus + ' Add Product</button>');
    prod.appendChild(addBtn);
    form.appendChild(prod);

    // --- Summary ---
    var summary = h('<div class="card card-pad"><div class="section-title" style="margin-bottom:12px">Summary</div>' +
      '<div class="summary"><div class="box"><div class="k">Total Designs</div><div class="v" data-sum-designs>0</div></div>' +
      '<div class="box"><div class="k">Total Pieces</div><div class="v" data-sum-pieces>0</div></div></div></div>');
    form.appendChild(summary);

    // --- Actions ---
    var actions = h('<div class="row gap-8 wrap" style="justify-content:flex-end">' +
      '<a href="#/orders" class="btn btn-ghost">Cancel</a>' +
      '<button type="submit" class="btn btn-primary">' + ICONS.pdf + ' ' + (existing ? 'Save & Generate PDF' : 'Create Order & PDF') + '</button></div>');
    form.appendChild(actions);

    content.appendChild(form);

    function renderRows() {
      rowsEl.innerHTML = '';
      state.items.forEach(function (item, idx) {
        var row = h('<div class="prod-row">' +
          '<div class="sr">' + (idx + 1) + '</div>' +
          '<div class="c-design"><input class="input" data-k="design_number" placeholder="Design No." value="' + esc(item.design_number) + '"></div>' +
          '<div class="c-pieces"><input class="input" data-k="pieces" type="number" inputmode="numeric" min="0" placeholder="Pieces" value="' + esc(item.pieces) + '"></div>' +
          '<div class="c-rate"><input class="input" data-k="rate" type="number" inputmode="decimal" min="0" placeholder="Rate" value="' + esc(item.rate) + '"></div>' +
          '<div class="c-remarks"><input class="input" data-k="remarks" placeholder="Remarks" value="' + esc(item.remarks) + '"></div>' +
          '<button type="button" class="del" title="Remove">' + ICONS.trash + '</button></div>');
        qsa('input', row).forEach(function (inp) {
          inp.oninput = function () { item[inp.getAttribute('data-k')] = inp.value; recompute(); };
        });
        qs('.del', row).onclick = function () {
          state.items.splice(idx, 1);
          if (!state.items.length) state.items.push(emptyItem());
          renderRows();
        };
        rowsEl.appendChild(row);
      });
      recompute();
    }
    function recompute() {
      var t = DB.computeTotals(state.items);
      qs('[data-sum-designs]', summary).textContent = t.total_designs;
      qs('[data-sum-pieces]', summary).textContent = t.total_pieces;
    }
    addBtn.onclick = function () { state.items.push(emptyItem()); renderRows(); qsa('.prod-row input', rowsEl).slice(-4)[0].focus(); };
    renderRows();

    form.onsubmit = function (e) {
      e.preventDefault();
      var payload = collect(form, state);
      if (!payload.customer.customer_name.trim()) { toast('Customer name is required.', 'err'); qs('[name=customer_name]', form).focus(); return; }
      if (!payload.order_date) { toast('Order date is required.', 'err'); return; }
      if (!payload.items.length) { toast('Add at least one product row.', 'err'); return; }
      var order = existing ? DB.Orders.update(existing.id, payload) : DB.Orders.create(payload);
      toast(existing ? 'Order updated' : 'Order created: ' + order.order_number);
      navigate('#/order/' + order.id);
      if (Sync.enabled()) Sync.pushChange(function (err) {
        if (err) toast('Saved locally — cloud sync will retry', 'err');
        else { toast('Synced to cloud'); render(); }
      });
    };
  }

  function emptyItem() { return { design_number: '', pieces: '', rate: '', remarks: '' }; }
  function field(name, label, val, type, ph) {
    return '<div class="field"><label>' + label + '</label>' +
      '<input class="input" name="' + name + '" type="' + (type || 'text') + '" placeholder="' + esc(ph || '') + '" value="' + esc(val) + '"></div>';
  }
  function collect(form, state) {
    return {
      customer: {
        customer_name: form.customer_name.value.trim(),
        mobile: form.mobile.value.trim(),
        office_address: form.office_address.value.trim(),
        delivery_address: form.delivery_address.value.trim(),
        transport_name: form.transport_name.value.trim(),
        broker_name: form.broker_name.value.trim(),
        broker_phone: form.broker_phone.value.trim(),
      },
      order_date: form.order_date.value,
      payment_terms: form.payment_terms.value.trim(),
      notes: form.notes.value.trim(),
      items: state.items,
    };
  }

  /* ================= ORDERS LIST ================= */
  route('/orders', function (content) {
    var st = { q: '', from: '', to: '' };
    var bar = h('<div class="card card-pad stack gap-12" style="margin-bottom:16px"></div>');
    var searchRow = h('<div class="row gap-8" style="position:relative">' +
      '<span style="position:absolute;left:12px;top:13px;color:var(--text-3)">' + ICONS.search + '</span>' +
      '<input class="input" style="padding-left:38px" placeholder="Search customer, mobile, order # or design no." data-q></div>');
    bar.appendChild(searchRow);
    var dates = h('<div class="grid-2"><div class="field"><label>From date</label><input class="input" type="date" data-from></div>' +
      '<div class="field"><label>To date</label><input class="input" type="date" data-to></div></div>');
    bar.appendChild(dates);
    content.appendChild(bar);

    var listWrap = h('<div></div>');
    content.appendChild(listWrap);

    function refresh() {
      var results = DB.Orders.search(st.q, st.from, st.to);
      listWrap.innerHTML = '';
      listWrap.appendChild(h('<div class="muted small" style="margin-bottom:8px">' + results.length + ' order' + (results.length === 1 ? '' : 's') + '</div>'));
      listWrap.appendChild(ordersTable(results));
    }
    qs('[data-q]', bar).oninput = function (e) { st.q = e.target.value; refresh(); };
    qs('[data-from]', bar).onchange = function (e) { st.from = e.target.value; refresh(); };
    qs('[data-to]', bar).onchange = function (e) { st.to = e.target.value; refresh(); };
    refresh();
  });

  /* ================= ORDER VIEW + SHARE ================= */
  route('/order', function (content, id) {
    var o = DB.Orders.find(id);
    if (!o) { content.appendChild(h('<div class="card empty">Order not found.</div>')); return; }

    content.appendChild(h('<a href="#/orders" class="btn btn-ghost btn-sm" style="margin-bottom:12px">' + ICONS.back + ' Back to orders</a>'));

    var head = h('<div class="card card-pad stack gap-16"></div>');
    head.appendChild(h('<div class="row between wrap gap-8">' +
      '<div><div class="mono" style="color:var(--brand-600);font-weight:700">' + esc(o.order_number) + '</div>' +
      '<h2 style="font-size:20px;margin-top:2px">' + esc(o.customer.customer_name) + '</h2></div>' +
      '<span class="badge" style="font-size:13px">' + (o.total_pieces || 0) + ' pieces</span></div>'));

    var kv = h('<dl class="kv"></dl>');
    [['Order Date', fmtDate(o.order_date)], ['Mobile', o.customer.mobile], ['Office', o.customer.office_address],
     ['Delivery', o.customer.delivery_address], ['Transport', o.customer.transport_name],
     ['Broker', o.customer.broker_name], ['Broker Phone', o.customer.broker_phone],
     ['Payment', o.payment_terms], ['Notes', o.notes], ['Created by', o.created_by]]
      .forEach(function (p) { if (p[1]) kv.appendChild(h('<dt>' + p[0] + '</dt><dd>' + esc(p[1]) + '</dd>')); });
    head.appendChild(kv);
    content.appendChild(head);

    // items
    var itemsCard = h('<div class="card mt-16"><div class="card-pad" style="padding-bottom:0"><div class="section-title">Items (' + o.items.length + ')</div></div><div class="tbl-wrap"></div></div>');
    var hasRate = o.items.some(function (i) { return i.rate != null; });
    var tbl = h('<table class="tbl"><thead><tr><th>#</th><th>Design No.</th><th>Pieces</th>' + (hasRate ? '<th>Rate</th>' : '') + '<th>Remarks</th></tr></thead><tbody></tbody></table>');
    var tb = qs('tbody', tbl);
    o.items.forEach(function (it, i) {
      tb.appendChild(h('<tr><td class="muted">' + (i + 1) + '</td><td style="font-weight:600">' + esc(it.design_number) + '</td>' +
        '<td>' + (it.pieces == null ? '' : it.pieces) + '</td>' + (hasRate ? '<td>' + (it.rate == null ? '' : Number(it.rate).toLocaleString('en-IN')) + '</td>' : '') +
        '<td class="muted">' + esc(it.remarks) + '</td></tr>'));
    });
    qs('.tbl-wrap', itemsCard).appendChild(tbl);
    content.appendChild(itemsCard);

    // actions
    var actions = h('<div class="card card-pad mt-16 stack gap-16"></div>');
    actions.appendChild(h('<div class="section-title">PDF & Share</div>'));
    var row1 = h('<div class="row gap-8 wrap"></div>');
    var dl = h('<button class="btn btn-primary">' + ICONS.pdf + ' Download PDF</button>');
    dl.onclick = function () { withPDF(o, function (r) { downloadBlob(r.blob, r.filename); toast('Saved ' + r.filename); }); };
    var printBtn = h('<button class="btn btn-outline">' + ICONS.printer + ' Print</button>');
    printBtn.onclick = function () { printPDF(o); };
    var viewPdf = h('<button class="btn btn-outline">' + ICONS.pdf + ' Preview PDF</button>');
    viewPdf.onclick = function () { withPDF(o, function (r) { window.open(URL.createObjectURL(r.blob), '_blank'); }); };
    var edit = h('<a href="#/edit/' + o.id + '" class="btn btn-ghost">' + ICONS.edit + ' Edit</a>');
    var del = h('<button class="btn btn-danger">' + ICONS.trash + ' Delete</button>');
    del.onclick = function () {
      confirmDialog({ title: 'Delete order?', body: o.order_number + ' will be permanently removed from this device.', ok: 'Delete', danger: true }).then(function (ok) {
        if (ok) {
          DB.Orders.remove(o.id);
          if (Sync.enabled()) Sync.remove(o.id).then(function () { autoSync(true); }).catch(function () { toast('Deleted locally — cloud delete will retry on next sync', 'err'); });
          toast('Order deleted');
          navigate('#/orders');
        }
      });
    };
    row1.appendChild(dl); row1.appendChild(printBtn); row1.appendChild(viewPdf); row1.appendChild(edit); row1.appendChild(del);
    actions.appendChild(row1);

    actions.appendChild(h('<div class="divider"></div>'));
    var shareTip = h('<div class="muted small">On phones, “Share PDF” attaches the file directly. On desktop the PDF downloads first, then the chat opens with a ready message to attach it.</div>');
    var row2 = h('<div class="row gap-8 wrap"></div>');
    var nativeShare = h('<button class="btn btn-outline">' + ICONS.share + ' Share PDF</button>');
    nativeShare.onclick = function () { withPDF(o, function (r) { sharePDF(o, r); }); };
    var wa = h('<button class="btn btn-wa">' + ICONS.wa + ' WhatsApp</button>');
    wa.onclick = function () { withPDF(o, function (r) { downloadBlob(r.blob, r.filename); window.open('https://wa.me/?text=' + encodeURIComponent(shareText(o)), '_blank'); }); };
    var tg = h('<button class="btn btn-tg">' + ICONS.tg + ' Telegram</button>');
    tg.onclick = function () { withPDF(o, function (r) { downloadBlob(r.blob, r.filename); window.open('https://t.me/share/url?url=&text=' + encodeURIComponent(shareText(o)), '_blank'); }); };
    var mail = h('<button class="btn btn-mail">' + ICONS.mail + ' Email</button>');
    mail.onclick = function () { withPDF(o, function (r) { downloadBlob(r.blob, r.filename); window.location.href = 'mailto:?subject=' + encodeURIComponent('Order ' + o.order_number + ' — ' + o.customer.customer_name) + '&body=' + encodeURIComponent(shareText(o) + '\n\n(Please attach the downloaded PDF: ' + r.filename + ')'); }); };
    row2.appendChild(nativeShare); row2.appendChild(wa); row2.appendChild(tg); row2.appendChild(mail);
    actions.appendChild(row2);
    actions.appendChild(shareTip);
    content.appendChild(actions);
  });

  function shareText(o) {
    var s = DB.Settings.get();
    return s.company.name + '\nOrder ' + o.order_number + '\nCustomer: ' + o.customer.customer_name +
      '\nDate: ' + fmtDate(o.order_date) + '\nTotal: ' + (o.total_designs || 0) + ' designs, ' + (o.total_pieces || 0) + ' pieces.';
  }

  function withPDF(order, cb) {
    try { var r = PDFGen.build(order, DB.Settings.get()); cb(r); }
    catch (e) { toast(e.message || 'Could not generate PDF', 'err'); }
  }
  /* Print the A4 PDF: load it in a hidden iframe and open the print dialog.
     Falls back to opening the PDF in a new tab if inline printing is blocked. */
  function printPDF(order) {
    try {
      var r = PDFGen.build(order, DB.Settings.get(), { print: true });
      var url = URL.createObjectURL(r.blob);
      var prev = document.getElementById('print-frame'); if (prev) prev.remove();
      var frame = document.createElement('iframe');
      frame.id = 'print-frame';
      frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
      frame.src = url;
      frame.onload = function () {
        try { frame.contentWindow.focus(); frame.contentWindow.print(); }
        catch (e) { window.open(url, '_blank'); }
      };
      document.body.appendChild(frame);
      toast('Opening print…');
      setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
    } catch (e) { toast(e.message || 'Could not print', 'err'); }
  }
  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a'); a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }
  async function sharePDF(order, r) {
    var file = new File([r.blob], r.filename, { type: 'application/pdf' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Order ' + order.order_number, text: shareText(order) });
        return;
      } catch (e) { if (e && e.name === 'AbortError') return; }
    }
    downloadBlob(r.blob, r.filename);
    toast('Sharing not supported here — PDF downloaded instead.');
  }

  /* ================= SETTINGS ================= */
  route('/settings', function (content) {
    var s = DB.Settings.get();

    // Company
    var comp = h('<div class="card card-pad stack gap-16"></div>');
    comp.appendChild(h('<div class="section-title">Company Details (used on screen & PDF)</div>'));
    comp.appendChild(h('<div class="field"><label>Company Name</label><input class="input" data-c="name" value="' + esc(s.company.name) + '"></div>'));
    comp.appendChild(h('<div class="field"><label>Tagline</label><input class="input" data-c="tagline" value="' + esc(s.company.tagline) + '"></div>'));
    comp.appendChild(h('<div class="field"><label>Address</label><textarea class="textarea" data-c="address">' + esc(s.company.address) + '</textarea></div>'));
    comp.appendChild(h('<div class="grid-2">' +
      '<div class="field"><label>Contact 1 label</label><input class="input" data-cc="0-label" value="' + esc((s.company.contacts[0] || {}).label) + '"></div>' +
      '<div class="field"><label>Contact 1 phone</label><input class="input" data-cc="0-phone" value="' + esc((s.company.contacts[0] || {}).phone) + '"></div>' +
      '<div class="field"><label>Contact 2 label</label><input class="input" data-cc="1-label" value="' + esc((s.company.contacts[1] || {}).label) + '"></div>' +
      '<div class="field"><label>Contact 2 phone</label><input class="input" data-cc="1-phone" value="' + esc((s.company.contacts[1] || {}).phone) + '"></div>' +
      '</div>'));
    comp.appendChild(h('<div class="field"><label>Default Payment Terms</label><input class="input" data-c="paymentTerms" value="' + esc(s.company.paymentTerms) + '"></div>'));
    var saveComp = h('<button class="btn btn-primary" style="align-self:flex-start">Save company details</button>');
    saveComp.onclick = function () {
      var cur = DB.Settings.get();
      qsa('[data-c]', comp).forEach(function (el) { cur.company[el.getAttribute('data-c')] = el.value.trim(); });
      cur.company.contacts = [
        { label: qs('[data-cc="0-label"]', comp).value.trim(), phone: qs('[data-cc="0-phone"]', comp).value.trim() },
        { label: qs('[data-cc="1-label"]', comp).value.trim(), phone: qs('[data-cc="1-phone"]', comp).value.trim() },
      ].filter(function (c) { return c.label || c.phone; });
      DB.Settings.save(cur); toast('Company details saved'); render();
    };
    var resetComp = h('<button class="btn btn-ghost" style="align-self:flex-start">Reset to Guddu Group defaults</button>');
    resetComp.onclick = function () { DB.Settings.resetCompany(); toast('Reset to defaults'); render(); };
    comp.appendChild(h('<div class="row gap-8 wrap"></div>'));
    qs('.row:last-child', comp).appendChild(saveComp); qs('.row:last-child', comp).appendChild(resetComp);
    content.appendChild(comp);

    // Accounts (info) — only guddu1 (the owner) may see the full credentials list
    if (DB.Auth.current().username === 'guddu1') {
      var acc = h('<div class="card card-pad stack gap-12 mt-16"></div>');
      acc.appendChild(h('<div class="section-title">Login Accounts (10 admins)</div>'));
      acc.appendChild(h('<div class="muted small">Only you (guddu1) can see this list. Give each user one of these. All have full admin access.</div>'));
      var accTbl = h('<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Username</th><th>Password</th></tr></thead><tbody></tbody></table></div>');
      var atb = qs('tbody', accTbl);
      DB.Auth.accounts.forEach(function (a) { atb.appendChild(h('<tr><td class="mono">' + a.username + '</td><td class="mono">' + a.password + '</td></tr>')); });
      acc.appendChild(accTbl);
      content.appendChild(acc);
    }

    // Backup / restore
    var bk = h('<div class="card card-pad stack gap-12 mt-16"></div>');
    bk.appendChild(h('<div class="section-title">Backup & Restore</div>'));
    bk.appendChild(h('<div class="muted small">Export a backup file to move all orders to another phone/computer, then import it there.</div>'));
    var bkRow = h('<div class="row gap-8 wrap"></div>');
    var exp = h('<button class="btn btn-outline btn-sm">Export backup (.json)</button>');
    exp.onclick = function () {
      var data = DB.Backup.export();
      downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), 'guddu-backup-' + DB.Stats.today() + '.json');
      toast('Backup exported');
    };
    var impLabel = h('<label class="btn btn-outline btn-sm" style="cursor:pointer">Import backup<input type="file" accept="application/json,.json" hidden></label>');
    qs('input', impLabel).onchange = function (e) {
      var f = e.target.files[0]; if (!f) return;
      var reader = new FileReader();
      reader.onload = function () {
        try { DB.Backup.import(JSON.parse(reader.result), 'merge'); toast('Backup imported'); render(); }
        catch (err) { toast(err.message || 'Invalid backup file', 'err'); }
      };
      reader.readAsText(f);
    };
    bkRow.appendChild(exp); bkRow.appendChild(impLabel);
    bk.appendChild(bkRow);
    content.appendChild(bk);

    // Cloud sync (optional)
    var sync = h('<div class="card card-pad stack gap-12 mt-16"></div>');
    sync.appendChild(h('<div class="row between"><div class="section-title">Cloud Sync (optional • Supabase)</div></div>'));
    sync.appendChild(h('<div class="muted small">Turn this on so all 10 users share one common list of orders. Create a free Supabase project, run <span class="mono">supabase-schema.sql</span>, then paste the Project URL and anon key below. Once enabled the app <b>auto-syncs</b> on sign-in and after every order — the ☁ button up top forces a manual sync.</div>'));
    var toggleRow = h('<div class="row between" style="padding:4px 0"><span style="font-weight:600">Enable cloud sync</span></div>');
    var tog = h('<div class="toggle ' + (s.sync.enabled ? 'on' : '') + '"></div>');
    toggleRow.appendChild(tog); sync.appendChild(toggleRow);
    var syncFields = h('<div class="stack gap-12" ' + (s.sync.enabled ? '' : 'hidden') + '>' +
      '<div class="field"><label>Supabase URL</label><input class="input" data-s="url" placeholder="https://xxxx.supabase.co" value="' + esc(s.sync.url) + '"></div>' +
      '<div class="field"><label>Anon public key</label><input class="input" data-s="anonKey" placeholder="eyJhbGci..." value="' + esc(s.sync.anonKey) + '"></div>' +
      '</div>');
    sync.appendChild(syncFields);
    var syncBtns = h('<div class="row gap-8 wrap"></div>');
    var saveSync = h('<button class="btn btn-primary btn-sm">Save</button>');
    var testSync = h('<button class="btn btn-outline btn-sm">Test connection</button>');
    var doSync = h('<button class="btn btn-outline btn-sm">Sync now</button>');
    syncBtns.appendChild(saveSync); syncBtns.appendChild(testSync); syncBtns.appendChild(doSync);
    sync.appendChild(syncBtns);
    var enabled = s.sync.enabled;
    tog.onclick = function () { enabled = !enabled; tog.classList.toggle('on', enabled); syncFields.hidden = !enabled; };
    function saveSyncCfg() {
      var cur = DB.Settings.get();
      cur.sync = { enabled: enabled, url: qs('[data-s="url"]', sync).value.trim(), anonKey: qs('[data-s="anonKey"]', sync).value.trim() };
      DB.Settings.save(cur); return cur;
    }
    saveSync.onclick = function () { saveSyncCfg(); toast('Sync settings saved'); };
    testSync.onclick = function () { saveSyncCfg(); testSync.disabled = true; Sync.test().then(function () { toast('Connection OK'); }).catch(function (e) { toast(e.message, 'err'); }).finally(function () { testSync.disabled = false; }); };
    doSync.onclick = function () { saveSyncCfg(); if (!Sync.enabled()) { toast('Enable sync & fill URL/key first', 'err'); return; } doSync.disabled = true; Sync.fullSync().then(function (r) { toast('Synced ' + r.count + ' orders'); render(); }).catch(function (e) { toast(e.message, 'err'); }).finally(function () { doSync.disabled = false; }); };
    content.appendChild(sync);

    // About
    content.appendChild(h('<div class="card card-pad mt-16 stack gap-8"><div class="section-title">About</div>' +
      '<div class="muted small">Guddu Order Manager — installable PWA. Works offline; data stored on your device.<br>Created by <b style="color:var(--text-2)">Keval Mayani</b>.</div></div>'));

    // Account + sign out (reachable on phones, where the sidebar is hidden)
    var sess = DB.Auth.current();
    var acct = h('<div class="card card-pad mt-16 stack gap-12"></div>');
    acct.appendChild(h('<div class="section-title">Account</div>'));
    acct.appendChild(h('<div class="muted small">Signed in as <b style="color:var(--text-2)">' + esc(sess.name) + '</b> (' + esc(sess.username) + ')</div>'));
    var soBtn = h('<button class="btn btn-danger" style="align-self:flex-start">' + ICONS.out + ' Sign out</button>');
    soBtn.onclick = doLogout;
    acct.appendChild(soBtn);
    content.appendChild(acct);
  });

  /* ---------- cloud auto-sync helper ---------- */
  function autoSync(silent) {
    if (!Sync.enabled()) return;
    Sync.background(function (err) {
      if (err) { if (!silent) toast('Cloud sync failed — data is safe locally', 'err'); return; }
      // refresh with merged team data, but never clobber a form the user is filling
      var r = currentRoute();
      if (r.base !== '/new' && r.base !== '/edit') render();
    });
  }

  /* ---------- boot ---------- */
  applyTheme(DB.Settings.get().theme);
  render();
  autoSync(true);

  // register service worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }
})();
