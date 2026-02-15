/* ═══════════════════════════════════════════════════════════════════
   TFXS Admin Control Center — js/admin-settings.js  v2.0
   Full CRUD, searchable dropdowns, server-side pagination,
   KPI timeseries charts, bulk endpoints. JWT Bearer auth.
   ═══════════════════════════════════════════════════════════════════ */

// ── Guard ─────────────────────────────────────────────
if (localStorage.getItem("is_admin") !== "true") {
  window.location.replace("/");
}

const API = window.TFXS_API?.API_BASE || "https://tfxs-affiliates-backend.onrender.com";
const PER_PAGE = 25;

// ══════════════════════════════════════════════════════
// UTILITIES
// ══════════════════════════════════════════════════════

function $(id) { return document.getElementById(id); }

function esc(s) {
  if (!s) return "";
  const d = document.createElement("div"); d.textContent = s; return d.innerHTML;
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtTime(d) {
  if (!d) return "—";
  const dt = new Date(d);
  return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) + " " +
    dt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

// ── Multi-Currency Support ──
let currencyRates = {};
let activeCurrency = localStorage.getItem("tfxs_currency") || "USD";

async function loadCurrencyRates() {
  try {
    const res = await fetch(API + "/api/currencies");
    const data = await res.json();
    if (data.ok && data.data) currencyRates = data.data.rates || {};
  } catch (_) {}
  // Restore saved currency
  const sel = $("currency-select");
  if (sel) sel.value = activeCurrency;
}

function setCurrency(code) {
  activeCurrency = code;
  localStorage.setItem("tfxs_currency", code);
  // Re-render all money values
  loadStats();
  const active = document.querySelector(".admin-tab.active")?.dataset.tab;
  if (active === "analytics") loadAnalytics();
}

function fmtMoney(n) {
  const usd = Number(n || 0);
  if (activeCurrency === "USD" || !currencyRates[activeCurrency]) {
    return "$" + usd.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  const rate = currencyRates[activeCurrency] || 1;
  const converted = usd * rate;
  const symbols = { EUR: "€", GBP: "£", CAD: "C$", AUD: "A$", CHF: "CHF ", JPY: "¥", AED: "AED ", SAR: "SAR ", ZAR: "R", NGN: "₦", BRL: "R$", INR: "₹", TRY: "₺", MXN: "MX$", BTC: "₿", ETH: "Ξ", USDT: "₮" };
  const sym = symbols[activeCurrency] || activeCurrency + " ";
  const decimals = ["BTC", "ETH"].includes(activeCurrency) ? 6 : ["JPY", "NGN"].includes(activeCurrency) ? 0 : 2;
  return sym + converted.toLocaleString("en", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function statusBadge(s) {
  const map = {
    pending: "bg-amber-500/20 text-amber-400",
    approved: "bg-green-500/20 text-green-400",
    rejected: "bg-red-500/20 text-red-400",
    paid: "bg-blue-500/20 text-blue-400",
  };
  return `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${map[s] || 'bg-gray-500/20 text-gray-400'}">${esc(s)}</span>`;
}

const CRYPTO_LABELS = {
  "trc20": "USDT TRC-20", "bep20": "USDT BEP-20", "btc": "BTC Native",
  "USDT-TRC20": "USDT TRC-20", "USDT-BEP20": "USDT BEP-20", "USDT-ERC20": "USDT ERC-20",
  "BTC-Native": "BTC Native", "ETH-ERC20": "ETH ERC-20", "LTC-Native": "LTC Native"
};

// ── API helper (JWT auth) ──────────────────────────────
async function api(path, opts = {}) {
  const jwt = localStorage.getItem("tfxs_jwt");
  const headers = { "Content-Type": "application/json", ...opts.headers };
  if (jwt) headers["Authorization"] = `Bearer ${jwt}`;
  try {
    const res = await fetch(API + path, { ...opts, headers });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
    return json;
  } catch (e) {
    toast(e.message, "err");
    throw e;
  }
}

// ── Toast ──────────────────────────────────────────────
function toast(msg, type = "ok") {
  const colors = { ok: "bg-green-600", err: "bg-red-600", warn: "bg-amber-600" };
  const el = document.createElement("div");
  el.className = `toast pointer-events-auto px-4 py-2.5 rounded-lg text-xs font-semibold text-white shadow-xl ${colors[type] || colors.ok}`;
  el.textContent = msg;
  $("toast-container").appendChild(el);
  setTimeout(() => el.remove(), 4200);
}

// ── Modal helpers ──────────────────────────────────────
function openModal(id) { $(id).classList.remove("hidden"); }
function closeModal(id) { $(id).classList.add("hidden"); }

// ── Styled confirm/prompt (replaces browser confirm/prompt) ──
function styledConfirm({ title, message, okText = "Confirm", type = "success", input = false, inputLabel = "", inputPlaceholder = "" }) {
  return new Promise((resolve) => {
    const modal = $("confirm-modal");
    const iconWrap = $("confirm-icon");
    $("confirm-title").textContent = title;
    $("confirm-message").textContent = message;
    $("confirm-ok-btn").textContent = okText;
    // icon & colors by type
    const wrapClasses = {
      success: "w-10 h-10 rounded-xl flex items-center justify-center bg-green-500/10 border border-green-500/20",
      danger: "w-10 h-10 rounded-xl flex items-center justify-center bg-red-500/10 border border-red-500/20",
      warning: "w-10 h-10 rounded-xl flex items-center justify-center bg-yellow-500/10 border border-yellow-500/20",
    };
    iconWrap.className = wrapClasses[type] || wrapClasses.success;
    const icons = {
      success: '<svg class="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>',
      danger: '<svg class="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>',
      warning: '<svg class="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M12 3l9.66 16.5H2.34L12 3z"/></svg>',
    };
    iconWrap.innerHTML = icons[type] || icons.success;
    // ok btn color
    const okBtn = $("confirm-ok-btn");
    if (type === "danger") { okBtn.className = "flex-1 py-2.5 rounded-lg text-[10px] font-bold text-white uppercase tracking-wider bg-red-600 hover:bg-red-500 transition"; }
    else { okBtn.className = "btn-gradient flex-1 py-2.5 rounded-lg text-[10px] font-bold text-white uppercase tracking-wider"; }
    // input field
    const inputWrap = $("confirm-input-wrap");
    const inputEl = $("confirm-input");
    if (input) { inputWrap.classList.remove("hidden"); inputEl.value = ""; inputEl.placeholder = inputPlaceholder; $("confirm-input-label").textContent = inputLabel; }
    else { inputWrap.classList.add("hidden"); }
    // show
    openModal("confirm-modal");
    if (input) setTimeout(() => inputEl.focus(), 100);
    // handlers
    function cleanup() { closeModal("confirm-modal"); okBtn.removeEventListener("click", onOk); $("confirm-cancel-btn").removeEventListener("click", onCancel); }
    function onOk() { cleanup(); resolve(input ? (inputEl.value || true) : true); }
    function onCancel() { cleanup(); resolve(false); }
    okBtn.addEventListener("click", onOk);
    $("confirm-cancel-btn").addEventListener("click", onCancel);
  });
}

// ══════════════════════════════════════════════════════
// SEARCHABLE AFP DROPDOWN (reusable)
// ══════════════════════════════════════════════════════

function setupAfpSearch(inputId, dropdownId, valueId, onSelect) {
  const input = $(inputId);
  const dropdown = $(dropdownId);
  const hidden = $(valueId);
  if (!input || !dropdown) return;

  let debounce;
  input.addEventListener("input", () => {
    clearTimeout(debounce);
    if (hidden) hidden.value = "";
    debounce = setTimeout(async () => {
      const q = input.value.trim();
      if (q.length < 1) { dropdown.classList.add("hidden"); return; }
      try {
        const res = await api(`/admin/affiliates/search?q=${encodeURIComponent(q)}`);
        const rows = res.data || [];
        if (!rows.length) {
          dropdown.innerHTML = '<div class="px-3 py-2 text-xs text-gray-500">No results</div>';
          dropdown.classList.remove("hidden");
          return;
        }
        dropdown.innerHTML = rows.map(r => `
          <div class="afp-opt px-3 py-2 text-xs hover:bg-white/10 cursor-pointer transition flex justify-between items-center" data-afp="${esc(r.afp)}" data-id="${r.id}" data-name="${esc(r.display_name || '')}" data-email="${esc(r.email || '')}">
            <span class="font-mono text-brand-500 font-bold">${esc(r.afp)}</span>
            <span class="text-gray-500 truncate ml-2">${esc(r.display_name || r.email || "")}</span>
          </div>
        `).join("");
        dropdown.classList.remove("hidden");
        dropdown.querySelectorAll(".afp-opt").forEach(opt => {
          opt.addEventListener("click", () => {
            if (hidden) hidden.value = opt.dataset.afp;
            input.value = opt.dataset.afp;
            dropdown.classList.add("hidden");
            if (onSelect) onSelect({
              id: opt.dataset.id,
              afp: opt.dataset.afp,
              name: opt.dataset.name,
              email: opt.dataset.email
            });
          });
        });
      } catch (_) { dropdown.classList.add("hidden"); }
    }, 250);
  });

  // Close on click outside
  document.addEventListener("click", (e) => {
    if (!input.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.add("hidden");
    }
  });
}

// ══════════════════════════════════════════════════════
// PAGINATION (client-side)
// ══════════════════════════════════════════════════════

const pageState = {};

function renderPagination(containerId, total, page, perPage, onPage) {
  const el = $(containerId);
  if (!el) return;
  const totalPages = Math.ceil(total / perPage);
  if (totalPages <= 1) { el.innerHTML = `<span class="text-[10px] text-gray-600">${total} row${total !== 1 ? "s" : ""}</span>`; return; }

  const start = (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);

  el.innerHTML = `
    <div class="flex items-center justify-between">
      <span class="text-[10px] text-gray-500">${start}–${end} of ${total}</span>
      <div class="flex gap-1">
        <button class="px-2.5 py-1 rounded text-[10px] font-bold ${page <= 1 ? 'text-gray-700 cursor-default' : 'text-gray-400 hover:text-white hover:bg-white/5'} transition" ${page <= 1 ? 'disabled' : ''} data-p="${page - 1}">‹ Prev</button>
        <button class="px-2.5 py-1 rounded text-[10px] font-bold ${page >= totalPages ? 'text-gray-700 cursor-default' : 'text-gray-400 hover:text-white hover:bg-white/5'} transition" ${page >= totalPages ? 'disabled' : ''} data-p="${page + 1}">Next ›</button>
      </div>
    </div>`;

  el.querySelectorAll("button[data-p]").forEach(btn => {
    btn.addEventListener("click", () => {
      const p = parseInt(btn.dataset.p);
      if (p >= 1 && p <= totalPages) onPage(p);
    });
  });
}

// ══════════════════════════════════════════════════════
// TABS
// ══════════════════════════════════════════════════════

const tabBtns = document.querySelectorAll(".admin-tab");
tabBtns.forEach(btn => btn.addEventListener("click", () => switchTab(btn.dataset.tab)));

function switchTab(name) {
  tabBtns.forEach(b => b.classList.toggle("active", b.dataset.tab === name));
  document.querySelectorAll(".tab-content").forEach(c => c.classList.toggle("hidden", c.id !== "tab-" + name));
  // Hide bulk bars when switching tabs
  $("conv-bulk-bar")?.classList.add("hidden");
  $("pay-bulk-bar")?.classList.add("hidden");
  loadActiveTab();
}

async function loadActiveTab() {
  const active = document.querySelector(".admin-tab.active")?.dataset.tab;
  if (active === "affiliates") await loadAffiliates();
  else if (active === "deals") await loadDeals();
  else if (active === "conversions") { await loadConversions(); loadAutoApproveState(); }
  else if (active === "payouts") await loadPayouts();
  else if (active === "kyc") await loadKycSubmissions();
  else if (active === "users") await loadUsers();
  else if (active === "audit") await loadAudit();
  else if (active === "notifications") await loadNotificationSettings();
  else if (active === "integrations") await loadIntegrations();
  else if (active === "analytics") await loadAnalytics();
}

// ══════════════════════════════════════════════════════
// KPI STATS + TIMESERIES CHART
// ══════════════════════════════════════════════════════

let kpiChart = null;
let chartDays = 30;

async function loadStats() {
  try {
    const res = await api(`/admin/kpis?days=${chartDays}`);
    const d = res.data || {};
    const s = d.summary || {};
    // Row 1 — Operational KPIs
    $("stat-commission").textContent = fmtMoney(s.total_commission);
    $("stat-regs").textContent = s.registrations ?? "—";
    $("stat-ftds").textContent = s.ftds ?? "—";
    if ($("stat-qftds")) $("stat-qftds").textContent = s.qftds ?? "—";
    if ($("stat-deposits")) $("stat-deposits").textContent = fmtMoney(s.total_deposit);
    // Row 2 — Business Overview
    if ($("stat-revenue")) $("stat-revenue").textContent = fmtMoney(s.raw_revenue);
    if ($("stat-aff-cost")) $("stat-aff-cost").textContent = fmtMoney(s.affiliate_cost);
    if ($("stat-profit")) {
      $("stat-profit").textContent = fmtMoney(s.net_profit);
      $("stat-profit").className = $("stat-profit").className.replace(/text-(red|green|white|emerald)-\d+/g, '');
      $("stat-profit").classList.add(s.net_profit >= 0 ? "text-emerald-400" : "text-red-400");
    }
    if ($("stat-margin")) $("stat-margin").textContent = (s.margin ?? 0).toFixed(1) + "%";
    // Secondary stats
    $("stat-affiliates").textContent = s.total_affiliates ?? "—";
    $("stat-unpaid").textContent = fmtMoney(s.unpaid_commission);
    $("stat-paid").textContent = fmtMoney(s.paid_payouts);
    $("stat-pending").textContent = s.pending_conversions ?? "—";

    // Render timeseries chart
    renderKpiChart(d.timeseries || []);

    // Render top affiliates
    renderTopAffiliates(d.top_affiliates || []);
  } catch (_) {}
}

function renderKpiChart(ts) {
  const el = $("kpi-chart");
  if (!el || typeof Highcharts === "undefined") return;

  const isLt = document.documentElement.classList.contains('light-theme');
  const categories = ts.map(t => {
    const d = new Date(t.date);
    return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
  });

  const regData = ts.map(t => t.registrations || 0);
  const ftdData = ts.map(t => t.ftd || 0);
  const commData = ts.map(t => Math.round(t.commission || 0));

  const maxReg = Math.max(...regData, ...ftdData, 1);
  const regTick = maxReg <= 5 ? 1 : maxReg <= 20 ? 2 : maxReg <= 50 ? 5 : 10;

  Highcharts.setOptions({
    chart: { style: { fontFamily: 'JetBrains Mono, Inter, system-ui, sans-serif' } },
    credits: { enabled: false },
    exporting: { enabled: false }
  });

  const opts = {
    chart: {
      type: 'areaspline',
      height: 240,
      backgroundColor: 'transparent',
      spacing: window.innerWidth < 640 ? [8, 4, 6, 4] : [4, 8, 0, 8],
      animation: { duration: 300 },
      reflow: true,
      zooming: { type: 'x' },
      resetZoomButton: {
        theme: {
          fill: isLt ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)',
          stroke: isLt ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.15)',
          style: { color: isLt ? '#6b7280' : '#a1a1aa', fontSize: '10px' },
          r: 6,
          states: { hover: { fill: isLt ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.15)' } }
        },
        position: { align: 'right', y: -4 }
      }
    },
    title: { text: null },
    legend: {
      enabled: true,
      align: 'right',
      verticalAlign: 'top',
      floating: true,
      y: -5,
      itemStyle: { color: isLt ? '#374151' : '#a1a1aa', fontSize: '10px', fontWeight: 500 },
      itemHoverStyle: { color: isLt ? '#000' : '#fff' },
      symbolHeight: 8, symbolWidth: 8, symbolRadius: 2
    },
    xAxis: {
      categories,
      crosshair: { width: 1, color: isLt ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.15)', dashStyle: 'ShortDash' },
      labels: {
        style: { color: isLt ? '#9ca3af' : '#71717a', fontSize: window.innerWidth < 640 ? '8px' : '10px' },
        rotation: window.innerWidth < 640 ? -45 : 0,
        step: ts.length > 30 ? 2 : (window.innerWidth < 640 ? 2 : 0),
        overflow: 'allow', allowOverlap: false
      },
      lineColor: isLt ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)',
      lineWidth: 1, tickLength: 0, gridLineWidth: 0
    },
    yAxis: [
      { // Left — Commission $
        title: { text: 'Commission ($)', style: { color: isLt ? 'rgba(220,38,38,0.7)' : 'rgba(229,57,53,0.7)', fontSize: '10px', fontWeight: '600' } },
        labels: {
          style: { color: isLt ? 'rgba(220,38,38,0.65)' : 'rgba(229,57,53,0.65)', fontSize: '10px' },
          formatter: function() { return this.value >= 1000 ? '$' + (this.value / 1000).toFixed(1) + 'K' : '$' + Math.round(this.value); }
        },
        min: 0,
        gridLineColor: isLt ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)',
        gridLineDashStyle: 'Dot', gridLineWidth: 1,
        lineWidth: 0, tickWidth: 0, opposite: false
      },
      { // Right — Registrations / FTDs
        title: { text: 'Count', style: { color: isLt ? 'rgba(37,99,235,0.7)' : 'rgba(96,165,250,0.7)', fontSize: '10px', fontWeight: '600' } },
        labels: { style: { color: isLt ? 'rgba(37,99,235,0.65)' : 'rgba(96,165,250,0.65)', fontSize: '10px' }, formatter: function() { return Math.round(this.value); } },
        min: 0, allowDecimals: false,
        tickInterval: regTick, max: Math.ceil(maxReg / regTick) * regTick + regTick,
        gridLineWidth: 0, lineWidth: 0, tickWidth: 0, opposite: true
      }
    ],
    tooltip: {
      shared: true, useHTML: true, backgroundColor: 'transparent', borderWidth: 0, shadow: false, style: { padding: '0' },
      formatter: function() {
        const bg = isLt ? 'rgba(255,255,255,0.96)' : 'rgba(15,15,20,0.94)';
        const border = isLt ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.08)';
        const shadow = isLt ? '0 4px 12px rgba(0,0,0,0.1)' : '0 4px 12px rgba(0,0,0,0.4)';
        const hdrColor = isLt ? '#6b7280' : '#a1a1aa';
        const valColor = isLt ? '#1d1d1f' : '#fff';
        let rows = '';
        this.points.forEach(p => {
          const val = p.series.name === 'Commission $' ? '$' + p.y.toLocaleString() : p.y;
          rows += `<div style="display:flex;align-items:center;gap:6px;margin:3px 0;"><span style="width:6px;height:6px;border-radius:50%;background:${p.color};display:inline-block;"></span><span style="color:${hdrColor};font-size:10px;">${p.series.name}:</span><span style="color:${valColor};font-weight:700;font-size:11px;">${val}</span></div>`;
        });
        return `<div style="background:${bg};border:1px solid ${border};border-radius:10px;padding:10px 14px;box-shadow:${shadow};"><div style="color:${hdrColor};font-size:9px;font-weight:700;margin-bottom:6px;text-transform:uppercase;letter-spacing:1px;">${this.x}</div>${rows}</div>`;
      }
    },
    plotOptions: {
      areaspline: {
        lineWidth: 2,
        marker: { enabled: false, radius: 3, symbol: 'circle', states: { hover: { enabled: true, lineWidth: 0 } } },
        states: { hover: { lineWidth: 2.5 } }
      }
    },
    series: [
      {
        name: 'Registrations', data: regData, yAxis: 1,
        color: '#60a5fa',
        fillColor: { linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 }, stops: [[0, 'rgba(96,165,250,0.25)'], [1, 'rgba(96,165,250,0)']] }
      },
      {
        name: 'FTDs', data: ftdData, yAxis: 1,
        color: '#4ade80',
        fillColor: { linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 }, stops: [[0, 'rgba(74,222,128,0.25)'], [1, 'rgba(74,222,128,0)']] }
      },
      {
        name: 'Commission $', data: commData, yAxis: 0,
        color: '#ef4444',
        fillColor: { linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 }, stops: [[0, 'rgba(239,68,68,0.2)'], [1, 'rgba(239,68,68,0)']] }
      }
    ]
  };

  if (kpiChart) { kpiChart.destroy(); kpiChart = null; }
  kpiChart = Highcharts.chart(el, opts);
}

function renderTopAffiliates(topAff) {
  const el = $("top-affiliates");
  if (!el) return;
  if (!topAff.length) { el.innerHTML = '<p class="text-xs text-gray-600 col-span-full text-center py-2">No data yet</p>'; return; }
  el.innerHTML = topAff.map((a, i) => `
    <div class="flex items-center gap-2 p-2 rounded-lg ${i === 0 ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-white/[0.02]'}">
      <span class="text-[10px] font-bold ${i === 0 ? 'text-amber-400' : 'text-gray-600'}">#${i + 1}</span>
      <div class="flex-1 min-w-0">
        <p class="font-mono text-[10px] text-brand-500 font-bold truncate">${esc(a.afp)}</p>
        <p class="text-[10px] text-green-400 font-bold font-mono">${fmtMoney(a.commission)}</p>
      </div>
    </div>
  `).join("");
}

function setChartDays(days) {
  chartDays = days;
  document.querySelectorAll(".chart-range").forEach(b => {
    b.classList.toggle("active", parseInt(b.dataset.days) === days);
    b.classList.toggle("text-brand-500", parseInt(b.dataset.days) === days);
    b.classList.toggle("bg-white/10", parseInt(b.dataset.days) === days);
    b.classList.toggle("text-gray-500", parseInt(b.dataset.days) !== days);
  });
  loadStats();
}

// ══════════════════════════════════════════════════════
// AFFILIATES
// ══════════════════════════════════════════════════════

let allAffiliates = [];
let affTotalCount = 0;
let affCurrentPage = 1;

async function loadAffiliates(page) {
  page = page || 1;
  affCurrentPage = page;
  const q = $("aff-search").value.trim();
  const statusFilter = $("aff-status-filter") ? $("aff-status-filter").value : "";
  const params = new URLSearchParams();
  if (q) params.set("search", q);
  if (statusFilter) params.set("status", statusFilter);
  params.set("page", page);
  params.set("limit", PER_PAGE);
  try {
    const res = await api("/admin/affiliates?" + params);
    allAffiliates = res.data || [];
    affTotalCount = res.total || allAffiliates.length;
    renderAffPage(page);
  } catch (_) {}
}

function renderAffPage(page) {
  const rows = allAffiliates;
  const tbody = $("aff-tbody");

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="px-4 py-12 text-center text-gray-600">No affiliates found</td></tr>`;
    $("aff-pagination").innerHTML = "";
    return;
  }

  const statusBadge = (s) => {
    if (s === "pending") return '<span class="bg-amber-500/20 text-amber-400 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">Pending</span>';
    if (s === "rejected") return '<span class="bg-red-500/20 text-red-400 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">Rejected</span>';
    return '<span class="bg-green-500/20 text-green-400 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">Approved</span>';
  };
  const kycBadge = (s) => {
    if (s === "pending") return '<span class="bg-amber-500/20 text-amber-400 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">Pending</span>';
    if (s === "approved") return '<span class="bg-green-500/20 text-green-400 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">Verified</span>';
    if (s === "rejected") return '<span class="bg-red-500/20 text-red-400 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">Rejected</span>';
    return '<span class="text-gray-700 text-[9px] uppercase">None</span>';
  };

  tbody.innerHTML = rows.map(r => {
    const st = r.status || "approved";
    const approveBtn = st === "pending" ? `<button onclick="approveAffiliate('${r.id}')" class="text-[10px] text-green-400 hover:text-green-300 transition font-bold uppercase mr-2">Approve</button><button onclick="rejectAffiliate('${r.id}')" class="text-[10px] text-red-400 hover:text-red-300 transition font-bold uppercase mr-2">Reject</button>` : "";
    return `
    <tr class="border-t border-white/5 hover:bg-white/[0.02] transition ${st === "pending" ? "bg-amber-500/[0.03]" : ""}">
      <td class="px-4 py-3 font-mono text-brand-500 font-bold">${esc(r.afp)}</td>
      <td class="px-4 py-3 text-white">${esc(r.display_name || "—")}</td>
      <td class="px-4 py-3 text-gray-400">${esc(r.email)}</td>
      <td class="px-4 py-3">${statusBadge(st)}</td>
      <td class="px-4 py-3">${kycBadge(r.kyc_status)}</td>
      <td class="px-4 py-3">${r.is_admin ? '<span class="bg-purple-500/20 text-purple-400 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">Admin</span>' : '<span class="text-gray-700 text-[10px]">Affiliate</span>'}</td>
      <td class="px-4 py-3 text-gray-500">${fmtDate(r.created_at)}</td>
      <td class="px-4 py-3 text-right whitespace-nowrap">
        ${approveBtn}
        <button onclick="openAffModal(${JSON.stringify(r).replace(/"/g, '&quot;')})" class="text-[10px] text-blue-400 hover:text-blue-300 transition font-bold uppercase mr-2">Edit</button>
        ${!r.is_admin ? `<button onclick="deleteAffiliate('${r.id}')" class="text-[10px] text-red-400 hover:text-red-300 transition font-bold uppercase">Del</button>` : ''}
      </td>
    </tr>`;
  }).join("");

  renderPagination("aff-pagination", affTotalCount, page, PER_PAGE, p => loadAffiliates(p));
}

// ── Auto-Payout Lock (Admin) ───────────────────────────
let _affAutoPayoutLocked = false;
let _affAutoPayoutAffId = null;   // DB id (for PATCH endpoint)
let _affAutoPayoutAfp = null;     // AFP code (for settings fetch)

function renderAffAutoPayoutLock() {
  const btn = $("aff-autopayout-lock-btn");
  const icon = $("aff-ap-lock-icon");
  const label = $("aff-ap-lock-label");
  if (!btn || !icon || !label) return;

  if (_affAutoPayoutLocked) {
    btn.className = "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-red-600/20 border border-red-500/40 text-red-400 hover:bg-red-600/30 transition";
    icon.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
    label.textContent = "Payout Locked";
  } else {
    btn.className = "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-600/30 transition";
    icon.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 5-5 5 5 0 0 1 5 5"/></svg>`;
    label.textContent = "Payout Unlocked";
  }
}

async function loadAffAutoPayoutState(dbId, afpCode) {
  _affAutoPayoutAffId = dbId;
  _affAutoPayoutAfp = afpCode;
  _affAutoPayoutLocked = false;
  try {
    const res = await api(`/api/settings?affiliate_id=${afpCode}`);
    if (res && res.data && res.data.auto_payout_locked === "true") _affAutoPayoutLocked = true;
  } catch (e) { /* settings may not exist yet */ }
  renderAffAutoPayoutLock();
}

async function toggleAffAutoPayoutLock() {
  if (!_affAutoPayoutAffId) return;
  const newLocked = !_affAutoPayoutLocked;
  try {
    await api(`/admin/affiliates/${_affAutoPayoutAffId}/auto-payout`, {
      method: "PATCH",
      body: JSON.stringify({ locked: newLocked })
    });
    _affAutoPayoutLocked = newLocked;
    renderAffAutoPayoutLock();
    toast(newLocked ? "Auto-payout locked for affiliate" : "Auto-payout unlocked for affiliate", "ok");
  } catch (e) { /* error already toasted by api() */ }
}

// ── Telegram Unlock (Admin per-affiliate) ────────────
let _affTelegramUnlocked = false;
let _affTelegramAffId = null;
let _affTelegramAfp = null;

function renderAffTelegramUnlock() {
  const btn = $("aff-telegram-lock-btn");
  const icon = $("aff-tg-lock-icon");
  const label = $("aff-tg-lock-label");
  if (!btn || !icon || !label) return;

  if (_affTelegramUnlocked) {
    btn.className = "flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border bg-blue-600/20 border-blue-500/40 text-blue-400 hover:bg-blue-600/30";
    icon.innerHTML = `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>`;
    label.textContent = "Telegram Enabled";
  } else {
    btn.className = "flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border bg-gray-600/20 border-gray-500/40 text-gray-400 hover:bg-gray-600/30";
    icon.innerHTML = `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
    label.textContent = "Telegram Locked";
  }
}

async function loadAffTelegramState(dbId, afpCode) {
  _affTelegramAffId = dbId;
  _affTelegramAfp = afpCode;
  _affTelegramUnlocked = false;
  try {
    const res = await api(`/api/settings?affiliate_id=${afpCode}`);
    if (res?.data?.telegram_unlocked === "true" || res?.data?.telegram_unlocked === true) _affTelegramUnlocked = true;
  } catch (_) {}
  renderAffTelegramUnlock();
}

async function toggleAffTelegramUnlock() {
  if (!_affTelegramAffId) return;
  const newUnlocked = !_affTelegramUnlocked;
  try {
    await api(`/admin/affiliates/${_affTelegramAffId}/telegram-unlock`, {
      method: "PATCH",
      body: JSON.stringify({ unlocked: newUnlocked })
    });
    _affTelegramUnlocked = newUnlocked;
    renderAffTelegramUnlock();
    toast(newUnlocked ? "Telegram enabled for affiliate" : "Telegram locked for affiliate", "ok");
  } catch (e) { /* error already toasted by api() */ }
}

// ── Per-Affiliate Channel Unlock (Discord, Slack, WhatsApp, Email) ──
let _affChannelStates = { discord: false, slack: false, whatsapp: false, email: false };

function renderAffChannelUnlock(channel) {
  const btn = $(`aff-${channel}-lock-btn`);
  const icon = $(`aff-${channel}-lock-icon`);
  const label = $(`aff-${channel}-lock-label`);
  if (!btn || !icon || !label) return;
  const unlocked = _affChannelStates[channel];
  const colors = { discord: "indigo", slack: "green", whatsapp: "emerald", email: "amber" };
  const col = colors[channel] || "gray";
  const names = { discord: "Discord", slack: "Slack", whatsapp: "WhatsApp", email: "Email" };
  if (unlocked) {
    btn.className = `flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border bg-${col}-600/20 border-${col}-500/40 text-${col}-400 hover:bg-${col}-600/30`;
    icon.innerHTML = `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>`;
    label.textContent = `${names[channel]} Enabled`;
  } else {
    btn.className = "flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border bg-gray-600/20 border-gray-500/40 text-gray-400 hover:bg-gray-600/30";
    icon.innerHTML = `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
    label.textContent = `${names[channel]} Locked`;
  }
}

async function loadAffChannelStates(afpCode) {
  try {
    const res = await api(`/api/settings?affiliate_id=${afpCode}`);
    const d = res?.data || {};
    _affChannelStates.discord = d.discord_unlocked === true || d.discord_unlocked === "true";
    _affChannelStates.slack = d.slack_unlocked === true || d.slack_unlocked === "true";
    _affChannelStates.whatsapp = d.whatsapp_unlocked === true || d.whatsapp_unlocked === "true";
    _affChannelStates.email = d.email_unlocked === true || d.email_unlocked === "true";
  } catch (_) {}
  ["discord", "slack", "whatsapp", "email"].forEach(renderAffChannelUnlock);
}

async function toggleAffChannelUnlock(channel) {
  if (!_affTelegramAffId) return;
  const newVal = !_affChannelStates[channel];
  try {
    await api(`/admin/affiliates/${_affTelegramAffId}/channel-unlock`, {
      method: "PATCH",
      body: JSON.stringify({ channel, unlocked: newVal })
    });
    _affChannelStates[channel] = newVal;
    renderAffChannelUnlock(channel);
    const names = { discord: "Discord", slack: "Slack", whatsapp: "WhatsApp", email: "Email" };
    toast(newVal ? `${names[channel]} enabled for affiliate` : `${names[channel]} locked for affiliate`, "ok");
  } catch (e) { toast("Failed: " + (e.message || ""), "err"); }
}

function openAffModal(data) {
  affDealChips = [];
  if (data) {
    $("aff-modal-title").textContent = "Edit Affiliate";
    $("aff-edit-id").value = data.id;
    $("aff-form-afp").value = data.afp || "";
    $("aff-form-name").value = data.display_name || "";
    $("aff-form-email").value = data.email || "";
    $("aff-form-email").disabled = true;
    $("aff-form-email").classList.add("opacity-50", "cursor-not-allowed");
    $("aff-password-row").classList.add("hidden");
    $("aff-form-afp").disabled = true;
    loadAffDeals(data.afp);
    // Auto-payout lock
    const apRow = $("aff-autopayout-row");
    if (apRow) { apRow.classList.remove("hidden"); }
    loadAffAutoPayoutState(data.id, data.afp);
    // Telegram unlock
    const tgRow = $("aff-telegram-row");
    if (tgRow) { tgRow.classList.remove("hidden"); }
    loadAffTelegramState(data.id, data.afp);
    // Other channel unlocks (Discord, Slack, WhatsApp, Email)
    ["discord", "slack", "whatsapp", "email"].forEach(ch => {
      const row = $(`aff-${ch}-row`);
      if (row) row.classList.remove("hidden");
    });
    loadAffChannelStates(data.afp);
    // Payment settings
    const payRow = $("aff-payment-row");
    if (payRow) { payRow.classList.remove("hidden"); }
    loadAffPaymentSettings(data.afp);
  } else {
    $("aff-modal-title").textContent = "Create Affiliate";
    $("aff-edit-id").value = "";
    $("aff-form-afp").value = "";
    $("aff-form-name").value = "";
    $("aff-form-email").value = "";
    $("aff-form-email").disabled = false;
    $("aff-form-email").classList.remove("opacity-50", "cursor-not-allowed");
    $("aff-password-row").classList.add("hidden");
    $("aff-form-afp").disabled = false;
    $("aff-deals-row")?.classList.add("hidden");
    // Hide auto-payout lock for create mode
    const apRow = $("aff-autopayout-row");
    if (apRow) { apRow.classList.add("hidden"); }
    // Hide telegram for create mode
    const tgRow = $("aff-telegram-row");
    if (tgRow) { tgRow.classList.add("hidden"); }
    // Hide payment settings for create mode
    const payRow = $("aff-payment-row");
    if (payRow) { payRow.classList.add("hidden"); }
    if ($("aff-payment-method")) setCustomSelectValue("aff-payment-method", "");
    if ($("aff-wallet-address")) $("aff-wallet-address").value = "";
    // Hide contact info for create mode
    const contactRow = $("aff-contact-row");
    if (contactRow) { contactRow.classList.add("hidden"); }
  }
  openModal("affiliate-modal");
}

async function loadAffPaymentSettings(afp) {
  try {
    const res = await api(`/admin/affiliates/${encodeURIComponent(afp)}/payment-settings`);
    const d = (res.ok && res.data) ? res.data : {};
    setCustomSelectValue("aff-payment-method", d.payment_method || "");
    $("aff-wallet-address").value = d.wallet_address || "";
    // Show phone & structured address
    const contactRow = $("aff-contact-row");
    if (contactRow) {
      contactRow.classList.remove("hidden");
      $("aff-phone").value = d.phone || "—";
      $("aff-street").value = d.address_street || "—";
      $("aff-city").value = d.address_city || "—";
      $("aff-state").value = d.address_state || "—";
      $("aff-zip").value = d.address_zip || "—";
      $("aff-country").value = d.address_country || "—";
    }
  } catch (_) {
    setCustomSelectValue("aff-payment-method", "");
    $("aff-wallet-address").value = "";
  }
}

async function submitAffiliate() {
  const id = $("aff-edit-id").value;
  if (id) {
    // EDIT
    try {
      await api(`/admin/affiliates/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: $("aff-form-name").value.trim() || null
        })
      });

      const afp = $("aff-form-afp").value.trim();
      if (afp && affDealChips.length >= 0) {
        const dealsRes = await api("/admin/deals?limit=100");
        const allDeals_sync = dealsRes.data || [];
        const wantedDealIds = new Set(affDealChips.map(c => c.id));
        for (const deal of allDeals_sync) {
          const currentAffiliates = deal.assigned_affiliates || [];
          const isAssigned = currentAffiliates.includes(afp);
          const shouldAssign = wantedDealIds.has(deal.id);
          if (shouldAssign && !isAssigned) await api(`/admin/deals/${deal.id}/affiliates`, { method: "POST", body: JSON.stringify({ affiliate_codes: [afp] }) });
          else if (!shouldAssign && isAssigned) await api(`/admin/deals/${deal.id}/affiliates/${afp}`, { method: "DELETE" });
        }
      }

      // Save payment settings if changed
      if (afp && $("aff-payment-method")) {
        const payMethod = $("aff-payment-method").value || null;
        const walletAddr = $("aff-wallet-address").value.trim() || null;
        await api(`/admin/affiliates/${encodeURIComponent(afp)}/payment-settings`, {
          method: "PUT",
          body: JSON.stringify({ payment_method: payMethod, wallet_address: walletAddr })
        });
      }

      toast("Affiliate updated");
      closeModal("affiliate-modal");
      loadAffiliates(affCurrentPage); loadDeals(); loadStats();
    } catch (_) {}
  } else {
    // CREATE via admin endpoint — generates temp password + sends email
    const email = $("aff-form-email").value.trim();
    if (!email) return toast("Email is required", "warn");
    try {
      const body = { email, name: $("aff-form-name").value.trim() || null };
      const res = await api("/admin/affiliates", { method: "POST", body: JSON.stringify(body) });
      const tempPw = res.temp_password;
      if (tempPw) {
        await tfxsAlert(`Account created!\n\nAffiliate ID: ${res.data?.afp}\nTemp Password: ${tempPw}\n\nCredentials have been emailed to the affiliate.`, { title: "Affiliate Created", variant: "info" });
      } else {
        toast("Affiliate created — credentials emailed");
      }
      closeModal("affiliate-modal");
      loadAffiliates(); loadStats();
    } catch (_) {}
  }
}

async function deleteAffiliate(id) {
  if (!await tfxsConfirm("This affiliate and all associated data will be permanently deleted.", { title: "Delete Affiliate", okText: "Delete", variant: "danger" })) return;
  try {
    await api(`/admin/affiliates/${id}`, { method: "DELETE" });
    toast("Affiliate deleted");
    loadAffiliates(affCurrentPage); loadStats();
  } catch (_) {}
}

// ══════════════════════════════════════════════════════
// DEALS
// ══════════════════════════════════════════════════════

let allDeals = [];
let dealTotalCount = 0;
let dealCurrentPage = 1;

async function loadDeals(page) {
  page = page || 1;
  dealCurrentPage = page;
  const broker = $("deal-broker-filter")?.value || "";
  const active = $("deal-active").value;
  const p = new URLSearchParams();
  if (broker) p.set("broker", broker);
  if (active) p.set("active", active);
  p.set("page", page);
  p.set("limit", PER_PAGE);
  try {
    const res = await api("/admin/deals?" + p);
    allDeals = res.data || [];
    dealTotalCount = res.total || allDeals.length;
    renderDealPage(page);
  } catch (_) {}
}

function renderDealPage(page) {
  const rows = allDeals;
  const tbody = $("deal-tbody");

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="px-4 py-12 text-center text-gray-600">No deals found</td></tr>`;
    $("deal-pagination").innerHTML = "";
    return;
  }

  tbody.innerHTML = rows.map(r => {
    const afps = (r.assigned_affiliates || []);
    const afpBadge = a => `<span class="bg-brand-500/10 text-brand-400 text-[9px] px-1.5 py-0.5 rounded font-mono">${esc(a)}</span>`;
    let afpDisplay;
    if (!afps.length) { afpDisplay = '<span class="text-gray-700 text-[10px]">General</span>'; }
    else if (afps.length <= 3) { afpDisplay = afps.map(afpBadge).join(' '); }
    else {
      const dealId = r.id;
      const visible = afps.slice(0, 3).map(afpBadge).join(' ');
      const rest = afps.length - 3;
      afpDisplay = `${visible} <button onclick="showAllAffiliates('${dealId}')" class="bg-white/5 hover:bg-white/10 text-gray-300 text-[9px] px-1.5 py-0.5 rounded cursor-pointer transition font-mono">+${rest} more</button>`;
    }
    const tiers = r.tiers || [];
    const tierCount = tiers.length;
    const tierSummary = tierCount ? tiers.map(t => `<span class="text-[9px] bg-white/5 px-1.5 py-0.5 rounded">${esc(t.tier_name)} <span class="text-green-400 font-mono">$${Number(t.commission||0)}</span></span>`).join(' ') : '<span class="text-gray-700 text-[10px]">No tiers</span>';
    return `
    <tr class="border-t border-white/5 hover:bg-white/[0.02] transition">
      <td class="px-4 py-3 text-white font-medium">${esc(r.title || r.broker || r.brand)}</td>
      <td class="px-4 py-3 text-gray-400">${esc(r.deal_type || "CPA")}</td>
      <td class="px-4 py-3">${tierSummary}</td>
      <td class="px-4 py-3">${r.is_active === false ? '<span class="text-red-400 text-[10px] font-bold">INACTIVE</span>' : '<span class="text-green-400 text-[10px] font-bold">ACTIVE</span>'}</td>
      <td class="px-4 py-3">${afpDisplay}</td>
      <td class="px-4 py-3 text-right whitespace-nowrap">
        <button onclick='openDealModal(${JSON.stringify(r).replace(/'/g, "&#39;")})' class="text-[10px] text-blue-400 hover:text-blue-300 transition font-bold uppercase mr-1">Edit</button>
        <button onclick="toggleDeal('${r.id}', ${!!r.is_active})" class="text-[10px] ${r.is_active === false ? 'text-green-400' : 'text-amber-400'} hover:text-white transition font-bold uppercase mr-1">${r.is_active === false ? 'On' : 'Off'}</button>
        <button onclick="deleteDeal('${r.id}')" class="text-[10px] text-red-400 hover:text-red-300 transition font-bold uppercase">Del</button>
      </td>
    </tr>
  `}).join("");

  renderPagination("deal-pagination", dealTotalCount, page, PER_PAGE, p => loadDeals(p));
}

// ── Multi-affiliate chip state for deal modal ──
let dealAfpChips = [];

function renderDealAfpChips() {
  const container = $("deal-afp-chips");
  if (!container) return;
  container.innerHTML = dealAfpChips.map(code =>
    `<span class="inline-flex items-center gap-1 bg-brand-500/10 text-brand-400 px-2 py-1 rounded-lg text-[10px] font-mono font-bold border border-brand-500/20">
      ${esc(code)}
      <button onclick="removeDealAfpChip('${code}')" class="text-brand-300 hover:text-white ml-0.5">&times;</button>
    </span>`
  ).join("");
}

function addDealAfpChip(code) {
  if (!code || dealAfpChips.includes(code)) return;
  dealAfpChips.push(code);
  renderDealAfpChips();
}

function removeDealAfpChip(code) {
  dealAfpChips = dealAfpChips.filter(c => c !== code);
  renderDealAfpChips();
}

function openDealModal(data) {
  dealAfpChips = [];
  loadBrokerDropdown();
  // Clear tier rows
  $("deal-tiers-list").innerHTML = "";
  if (data) {
    $("deal-modal-title").textContent = "Edit Deal";
    $("deal-edit-id").value = data.id;
    setCustomSelectValue("deal-broker", data.broker || "");
    // Defer setting broker value until dropdown is loaded
    setTimeout(() => { setCustomSelectValue("deal-broker", data.broker || ""); }, 200);
    $("deal-notes").value = data.notes || "";
    $("deal-title").value = data.title || "";
    setCustomSelectValue("deal-type", data.deal_type || "CPA");
    $("deal-logo").value = data.logo_url || "";
    $("deal-broker-link").value = data.broker_link || "";
    $("deal-description").value = data.description || "";
    // Load assigned affiliates as chips
    dealAfpChips = [...(data.assigned_affiliates || [])];
    renderDealAfpChips();
    // Load tiers
    (data.tiers || []).forEach(t => addTierRow(t));
  } else {
    $("deal-modal-title").textContent = "Add Deal";
    $("deal-edit-id").value = "";
    setCustomSelectValue("deal-broker", "");
    $("deal-notes").value = "";
    $("deal-title").value = "";
    setCustomSelectValue("deal-type", "CPA");
    $("deal-logo").value = "";
    $("deal-broker-link").value = "";
    $("deal-description").value = "";
    renderDealAfpChips();
  }
  $("deal-afp-input").value = "";
  openModal("deal-modal");
}

async function submitDeal() {
  const broker = $("deal-broker").value.trim();
  if (!broker) return toast("Select a broker", "warn");
  // Collect tiers from the DOM
  const tierRows = $("deal-tiers-list").querySelectorAll(".tier-row");
  const tiers = [];
  tierRows.forEach(row => {
    tiers.push({
      tier_name: row.querySelector(".tier-name").value.trim() || `Tier ${tiers.length + 1}`,
      tier_min: parseInt(row.querySelector(".tier-min").value) || 0,
      tier_max: row.querySelector(".tier-max").value !== "" ? parseInt(row.querySelector(".tier-max").value) : null,
      commission: parseFloat(row.querySelector(".tier-commission").value) || 0,
      trigger_condition: row.querySelector(".tier-trigger").value.trim() || null,
      description: row.querySelector(".tier-description").value.trim() || null,
      is_elite: row.querySelector(".tier-elite").checked,
      style_color: row.querySelector(".tier-color").value.trim() || null,
    });
  });
  if (!tiers.length) return toast("Add at least one commission tier", "warn");
  const body = {
    broker,
    affiliate_codes: dealAfpChips,
    notes: $("deal-notes").value.trim() || null,
    title: $("deal-title").value.trim() || null,
    description: $("deal-description").value.trim() || null,
    deal_type: $("deal-type").value || "CPA",
    logo_url: $("deal-logo").value.trim() || null,
    broker_link: $("deal-broker-link").value.trim() || null,
    tiers,
  };
  const id = $("deal-edit-id").value;
  try {
    let result;
    if (id) {
      result = await api(`/admin/deals/${id}`, { method: "PATCH", body: JSON.stringify(body) });
    } else {
      result = await api("/admin/deals", { method: "POST", body: JSON.stringify(body) });
    }
    // Check tier save result
    if (result.tier_result && !result.tier_result.ok) {
      toast(`Deal saved but tiers FAILED: ${result.tier_result.error}`, "warn");
    } else {
      const tierCount = result.tier_result?.saved || 0;
      toast(id ? `Deal updated (${tierCount} tiers saved)` : `Deal created (${tierCount} tiers saved)`);
    }
    // Warn about missing DB columns
    if (result._stripped && result._stripped.length) {
      toast(`Database migration needed! Columns not saved: ${result._stripped.join(", ")}. Go to Admin → Migrate.`, "error");
    }
    closeModal("deal-modal");
    loadDeals(); loadStats();
  } catch (e) {
    toast(`Save failed: ${e.message || e}`, "error");
  }
}

// ── Tier row builder for deal modal ──
let tierRowCounter = 0;
function addTierRow(data) {
  tierRowCounter++;
  const list = $("deal-tiers-list");
  const row = document.createElement("div");
  row.className = "tier-row bg-white/[0.02] border border-white/5 rounded-lg p-3 space-y-2";
  row.innerHTML = `
    <div class="flex items-center justify-between">
      <input type="text" class="tier-name form-input w-32 px-2 py-1 rounded text-[11px]" placeholder="Tier name" value="${esc(data?.tier_name || "")}">
      <label class="flex items-center gap-1.5 text-[10px] text-amber-400">
        <input type="checkbox" class="tier-elite" ${data?.is_elite ? "checked" : ""}> Elite
      </label>
      <button type="button" onclick="this.closest('.tier-row').remove()" class="text-red-400 hover:text-red-300 text-[10px] font-bold">✕ Remove</button>
    </div>
    <div class="grid grid-cols-4 gap-2">
      <div><label class="text-[9px] text-gray-600 block">Min Amount</label><input type="number" class="tier-min form-input w-full px-2 py-1.5 rounded text-[11px]" value="${data?.tier_min ?? ""}" placeholder="0"></div>
      <div><label class="text-[9px] text-gray-600 block">Max Amount</label><input type="number" class="tier-max form-input w-full px-2 py-1.5 rounded text-[11px]" value="${data?.tier_max ?? ""}" placeholder="∞"></div>
      <div><label class="text-[9px] text-gray-600 block">Commission $</label><input type="number" class="tier-commission form-input w-full px-2 py-1.5 rounded text-[11px]" step="0.01" value="${data?.commission ?? ""}"></div>
      <div><label class="text-[9px] text-gray-600 block">Trigger</label><input type="text" class="tier-trigger form-input w-full px-2 py-1.5 rounded text-[11px]" value="${esc(data?.trigger_condition || "")}" placeholder="1 Lot"></div>
    </div>
    <div class="grid grid-cols-2 gap-2">
      <div><label class="text-[9px] text-gray-600 block">Description</label><input type="text" class="tier-description form-input w-full px-2 py-1.5 rounded text-[11px]" value="${esc(data?.description || "")}" placeholder="Optional tier description..."></div>
      <div><label class="text-[9px] text-gray-600 block">Color</label><input type="text" class="tier-color form-input w-full px-2 py-1.5 rounded text-[11px]" placeholder="#dc2626" value="${esc(data?.style_color || "")}"></div>
    </div>
  `;
  list.appendChild(row);
}

async function toggleDeal(id, isActive) {
  try {
    await api(`/admin/deals/${id}`, { method: "PATCH", body: JSON.stringify({ is_active: !isActive }) });
    toast(isActive ? "Deal deactivated" : "Deal activated");
    loadDeals();
  } catch (_) {}
}

async function deleteDeal(id) {
  if (!await tfxsConfirm("This deal will be permanently removed.", { title: "Delete Deal", okText: "Delete", variant: "danger" })) return;
  try {
    await api(`/admin/deals/${id}`, { method: "DELETE" });
    toast("Deal deleted");
    loadDeals(); loadStats();
  } catch (_) {}
}

// ══════════════════════════════════════════════════════
// CONVERSIONS
// ══════════════════════════════════════════════════════

let allConversions = [];
let selectedConvIds = new Set();
let convTotalCount = 0;
let convCurrentPage = 1;
let convUnlinkedOnly = false;

function toggleUnlinkedFilter() {
  convUnlinkedOnly = !convUnlinkedOnly;
  const btn = $("conv-unlinked-btn");
  if (btn) {
    if (convUnlinkedOnly) {
      btn.className = "text-[10px] font-bold text-black uppercase tracking-wider border border-amber-400 rounded-lg px-3 py-2 bg-amber-400";
    } else {
      btn.className = "text-[10px] font-bold text-amber-400 hover:text-amber-300 transition uppercase tracking-wider border border-amber-500/20 rounded-lg px-3 py-2 hover:bg-amber-500/10";
    }
  }
  loadConversions(1);
}

// ── Auto-Approve Toggle ──
async function loadAutoApproveState() {
  try {
    const res = await api("/admin/auto-approve");
    const toggle = $("auto-approve-toggle");
    if (toggle) toggle.checked = res.enabled || false;
  } catch (_) {}
}
async function toggleAutoApprove(enabled) {
  try {
    await api("/admin/auto-approve", { method: "PUT", body: JSON.stringify({ enabled }) });
    toast(enabled ? "Auto-approve enabled — new conversions will be auto-approved" : "Auto-approve disabled — new conversions stay pending");
  } catch (err) {
    toast("Failed: " + err.message, "err");
    const toggle = $("auto-approve-toggle");
    if (toggle) toggle.checked = !enabled;
  }
}

async function loadConversions(page) {
  page = page || 1;
  convCurrentPage = page;
  const params = new URLSearchParams();
  const afp = convUnlinkedOnly ? "__UNLINKED__" : ($("conv-filter-afp-value")?.value || $("conv-filter-afp-input")?.value.trim() || "");
  const status = $("conv-status").value;
  const type = $("conv-type").value;
  const from = $("conv-from").value;
  const to = $("conv-to").value;
  if (afp) params.set("affiliate_code", afp);
  if (status) params.set("status", status);
  if (type) params.set("event_type", type);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  params.set("page", page);
  params.set("limit", PER_PAGE);
  try {
    const res = await api("/admin/conversions?" + params);
    allConversions = res.data || [];
    convTotalCount = res.total || allConversions.length;
    selectedConvIds.clear();
    updateConvBulkBar();
    renderConvPage(page);
  } catch (_) {}
}

function renderConvPage(page) {
  const rows = allConversions;
  const tbody = $("conv-tbody");

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="10" class="px-3 py-12 text-center text-gray-600">No conversions found</td></tr>`;
    $("conv-pagination").innerHTML = "";
    return;
  }

  tbody.innerHTML = rows.map(r => {
    const st = r.rejected_at ? "rejected" : r.approved_at ? "approved" : (r.status || "pending");
    const checked = selectedConvIds.has(r.id) ? "checked" : "";
    let actions = "";
    if (st === "pending") {
      actions += `<button onclick="convAction('${r.id}','approve')" class="text-green-400 hover:text-green-300 mr-1" title="Approve">✓</button>`;
      actions += `<button onclick="convAction('${r.id}','reject')" class="text-red-400 hover:text-red-300 mr-1" title="Reject">✗</button>`;
    }
    actions += `<button onclick="openOverride('${r.id}', ${Number(r.commission_amount || 0)})" class="text-amber-400 hover:text-amber-300 mr-1" title="Override"><svg class="w-3.5 h-3.5 inline" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>`;
    actions += `<button onclick="openConvModal(${JSON.stringify(r).replace(/"/g, '&quot;')})" class="text-blue-400 hover:text-blue-300 mr-1" title="Edit"><svg class="w-3.5 h-3.5 inline" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></button>`;
    actions += `<button onclick="deleteConversion('${r.id}')" class="text-red-400 hover:text-red-300" title="Delete"><svg class="w-3.5 h-3.5 inline" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button>`;
    return `
    <tr class="border-t border-white/5 hover:bg-white/[0.02] transition">
      <td class="px-2 py-2.5 text-center"><input type="checkbox" ${checked} onchange="toggleConvSelect('${r.id}', this.checked)" class="cursor-pointer"></td>
      <td class="px-3 py-2.5 text-gray-500">${fmtDate(r.occurred_at || r.created_at)}</td>
      <td class="px-3 py-2.5 font-mono text-[10px] font-bold">${r.affiliate_code === "__UNLINKED__" ? '<span class="text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded text-[9px]">⚠ NO AFP</span>' : '<span class="text-brand-500">' + esc(r.affiliate_code) + '</span>'}</td>
      <td class="px-3 py-2.5 text-gray-300">${esc(r.event_type)}</td>
      <td class="px-3 py-2.5 text-white">${esc(r.user_id || "—")}</td>
      <td class="px-3 py-2.5 text-gray-400">${esc(r.country || "—")}</td>
      <td class="px-3 py-2.5 text-right font-mono text-gray-300">$${Number(r.deposit_amount || 0).toFixed(2)}</td>
      <td class="px-3 py-2.5 text-right font-mono text-green-400 font-bold">$${Number(r.commission_amount || 0).toFixed(2)}</td>
      <td class="px-3 py-2.5 text-center">${statusBadge(st)}</td>
      <td class="px-3 py-2.5 text-right whitespace-nowrap">${actions}</td>
    </tr>`;
  }).join("");

  renderPagination("conv-pagination", convTotalCount, page, PER_PAGE, p => loadConversions(p));
}

// ── Type-specific conversion form logic ──
function onConvTypeChange() {
  const type = $("conv-event-type").value;
  const uidFree = $("conv-uid-free");
  const uidSearch = $("conv-uid-search");
  const countryRow = $("conv-country-row");
  const brokerRow = $("conv-broker-row");
  const depositRow = $("conv-deposit-row");
  const commissionRow = $("conv-commission-row");
  const prereqLabel = $("conv-uid-prereq");
  const validMsg = $("conv-validation-msg");
  if (validMsg) { validMsg.classList.add("hidden"); validMsg.textContent = ""; }

  // Reset
  if (uidFree) uidFree.classList.remove("hidden");
  if (uidSearch) uidSearch.classList.add("hidden");
  if (countryRow) countryRow.classList.remove("hidden");
  if (brokerRow) brokerRow.classList.remove("hidden");
  if (depositRow) depositRow.classList.add("hidden");
  if (commissionRow) commissionRow.classList.add("hidden");

  if (type === "registration") {
    // Free user ID, show country + broker, no deposit/commission
  } else if (type === "ftd") {
    // Search existing user (must have registration), show deposit
    if (uidFree) uidFree.classList.add("hidden");
    if (uidSearch) uidSearch.classList.remove("hidden");
    if (prereqLabel) prereqLabel.textContent = "(must have Registration)";
    if (depositRow) depositRow.classList.remove("hidden");
    if (brokerRow) brokerRow.classList.add("hidden");
  } else if (type === "qualified_cpa") {
    // Search existing user (must have FTD), hide deposit/commission/country/broker
    if (uidFree) uidFree.classList.add("hidden");
    if (uidSearch) uidSearch.classList.remove("hidden");
    if (prereqLabel) prereqLabel.textContent = "(must have FTD)";
    if (countryRow) countryRow.classList.add("hidden");
  } else if (type === "commission") {
    // Search existing user (must have QFTD), show commission
    if (uidFree) uidFree.classList.add("hidden");
    if (uidSearch) uidSearch.classList.remove("hidden");
    if (prereqLabel) prereqLabel.textContent = "(must have QFTD)";
    if (countryRow) countryRow.classList.add("hidden");
    if (commissionRow) commissionRow.classList.remove("hidden");
  }
}

// User ID search for existing conversions
let _convUserSearchTimer = null;
document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("conv-user-search");
  if (searchInput) {
    searchInput.addEventListener("input", function() {
      clearTimeout(_convUserSearchTimer);
      const q = this.value.trim();
      if (q.length < 2) { $("conv-user-dropdown").classList.add("hidden"); return; }
      _convUserSearchTimer = setTimeout(async () => {
        const type = $("conv-event-type").value;
        // Search for users that have the prerequisite type
        let prereqType = "";
        if (type === "ftd") prereqType = "registration";
        else if (type === "qualified_cpa") prereqType = "ftd";
        else if (type === "commission") prereqType = "qualified_cpa";
        try {
          const res = await api(`/admin/conversions/user-search?q=${encodeURIComponent(q)}&event_type=${prereqType}`);
          const dd = $("conv-user-dropdown");
          if (!res.data || !res.data.length) {
            dd.innerHTML = '<div class="px-3 py-2 text-xs text-gray-500">No matching users found</div>';
            dd.classList.remove("hidden");
            return;
          }
          dd.innerHTML = res.data.map(u => `
            <div class="px-3 py-2 text-xs hover:bg-white/10 cursor-pointer transition flex justify-between items-center"
                 onclick="selectConvUser('${esc(u.user_id)}', '${esc(u.country || "")}', ${u.deposit_amount || 0})">
              <span class="text-white font-mono">${esc(u.user_id)}</span>
              <span class="text-gray-500">${esc(u.country || "")} ${u.deposit_amount ? '· $' + Number(u.deposit_amount).toFixed(2) : ''}</span>
            </div>`).join("");
          dd.classList.remove("hidden");
        } catch(e) { console.warn("User search failed:", e); }
      }, 300);
    });
    // Close dropdown on outside click
    document.addEventListener("click", (e) => {
      if (!e.target.closest("#conv-uid-search")) $("conv-user-dropdown")?.classList.add("hidden");
    });
  }
});

function selectConvUser(userId, country, deposit) {
  $("conv-user-search").value = userId;
  $("conv-user-id").value = userId;
  $("conv-user-dropdown").classList.add("hidden");
  // Auto-fill country if available
  if (country && $("conv-country")) $("conv-country").value = country;
  // Show info
  const info = $("conv-uid-info");
  if (info) {
    info.classList.remove("hidden");
    info.textContent = `User: ${userId}${country ? ' · ' + country : ''}${deposit ? ' · Deposit: $' + Number(deposit).toFixed(2) : ''}`;
  }
}

function openConvModal(data) {
  // Populate broker dropdown from allBrokers
  const brokerSel = $("conv-broker");
  if (brokerSel && brokerSel.tagName === "SELECT") {
    const currentVal = data ? ((data.broker || "").trim() || (data.admin_note || "").replace(/^broker:/, "").trim()) : "";
    brokerSel.innerHTML = '<option value="">Select a broker...</option>' +
      allBrokers.map(b => `<option value="${esc(b.name)}"${b.name === currentVal ? ' selected' : ''}>${esc(b.name)}</option>`).join('');
  }

  if (data && data.id) {
    $("conv-modal-title").textContent = "Edit Conversion";
    $("conv-edit-id").value = data.id;
    $("conv-afp-input").value = data.affiliate_code || "";
    $("conv-afp-value").value = data.affiliate_code || "";
    setCustomSelectValue("conv-event-type", data.event_type || "registration");
    setCustomSelectValue("conv-form-status", data.status || "pending");
    $("conv-user-id").value = data.user_id || "";
    if ($("conv-user-search")) $("conv-user-search").value = data.user_id || "";
    $("conv-country").value = data.country || "";
    $("conv-deposit").value = data.deposit_amount || "";
    $("conv-commission").value = data.commission_amount || "";
    // broker already set above via dropdown population
    // Set date via Flatpickr
    if (data.occurred_at && $("conv-date")) {
      const d = new Date(data.occurred_at);
      if ($("conv-date")._flatpickr) {
        $("conv-date")._flatpickr.setDate(d, true);
      } else {
        $("conv-date").value = d.toISOString().slice(0, 16);
      }
    }
  } else {
    $("conv-modal-title").textContent = "Add Conversion";
    $("conv-edit-id").value = "";
    $("conv-afp-input").value = "";
    $("conv-afp-value").value = "";
    setCustomSelectValue("conv-event-type", "registration");
    setCustomSelectValue("conv-form-status", "pending");
    $("conv-user-id").value = "";
    if ($("conv-user-search")) $("conv-user-search").value = "";
    $("conv-country").value = "";
    $("conv-deposit").value = "";
    $("conv-commission").value = "";
    if (brokerSel) brokerSel.value = "";
    // Default date to now via Flatpickr
    if ($("conv-date")) {
      if ($("conv-date")._flatpickr) {
        $("conv-date")._flatpickr.setDate(new Date(), true);
      } else {
        $("conv-date").value = new Date().toISOString().slice(0, 16);
      }
    }
  }
  onConvTypeChange();
  if ($("conv-uid-info")) $("conv-uid-info").classList.add("hidden");
  if ($("conv-validation-msg")) { $("conv-validation-msg").classList.add("hidden"); $("conv-validation-msg").textContent = ""; }
  openModal("conv-modal");
}

async function submitConversion() {
  const afp = $("conv-afp-value").value.trim() || $("conv-afp-input").value.trim();
  if (!afp) return toast("Affiliate required", "warn");
  const type = $("conv-event-type").value;
  const userId = $("conv-user-id").value.trim() || ($("conv-user-search") ? $("conv-user-search").value.trim() : "") || null;
  const body = {
    affiliate_code: afp,
    event_type: type,
    status: $("conv-form-status").value,
    user_id: userId,
    country: $("conv-country").value.trim().toUpperCase() || null,
    deposit_amount: Number($("conv-deposit").value) || 0,
    commission_amount: Number($("conv-commission").value) || 0,
  };
  // Add custom date (from Flatpickr or raw value)
  if ($("conv-date")) {
    const fp = $("conv-date")._flatpickr;
    if (fp && fp.selectedDates.length) {
      body.occurred_at = fp.selectedDates[0].toISOString();
    } else if ($("conv-date").value) {
      body.occurred_at = new Date($("conv-date").value).toISOString();
    }
  }
  // Add broker
  if ($("conv-broker") && $("conv-broker").value.trim()) {
    body.broker = $("conv-broker").value.trim();
  }
  const id = $("conv-edit-id").value;
  const validMsg = $("conv-validation-msg");
  if (validMsg) { validMsg.classList.add("hidden"); validMsg.textContent = ""; }
  try {
    if (id) {
      await api(`/admin/conversions/${id}`, { method: "PATCH", body: JSON.stringify(body) });
      toast("Conversion updated");
    } else {
      await api("/admin/conversions", { method: "POST", body: JSON.stringify(body) });
      toast("Conversion created");
    }
    closeModal("conv-modal");
    loadConversions(); loadStats();
  } catch (err) {
    // Show validation error from backend in the modal
    const msg = err?.message || "Failed to create conversion";
    if (validMsg) { validMsg.textContent = msg; validMsg.classList.remove("hidden"); }
  }
}

async function convAction(id, action) {
  const label = action.replace("-", " ");
  const variant = action === "reject" ? "danger" : "warning";
  if (!await tfxsConfirm(`Are you sure you want to ${label} this conversion?`, { title: `${label.charAt(0).toUpperCase() + label.slice(1)} Conversion`, okText: label.charAt(0).toUpperCase() + label.slice(1), variant })) return;
  try {
    await api(`/admin/conversions/${id}/${action}`, { method: "PATCH", body: JSON.stringify({}) });
    toast(`Conversion ${label}d`);
    loadConversions(); loadStats();
  } catch (_) {}
}

async function deleteConversion(id) {
  if (!await tfxsConfirm("This conversion record will be permanently deleted.", { title: "Delete Conversion", okText: "Delete", variant: "danger" })) return;
  try {
    await api(`/admin/conversions/${id}`, { method: "DELETE" });
    toast("Conversion deleted");
    loadConversions(); loadStats();
  } catch (_) {}
}

function openOverride(id, current) {
  $("override-id").value = id;
  $("override-amount").value = current;
  $("override-note").value = "";
  openModal("override-modal");
}

async function submitOverride() {
  const id = $("override-id").value;
  const amount = Number($("override-amount").value);
  const note = $("override-note").value.trim();
  if (isNaN(amount) || amount < 0) return toast("Enter valid amount", "warn");
  try {
    await api(`/admin/conversions/${id}/override`, { method: "PATCH", body: JSON.stringify({ commission_override: amount, admin_note: note }) });
    toast("Commission overridden");
    closeModal("override-modal");
    loadConversions(); loadStats();
  } catch (_) {}
}

// ── Bulk selection (conversions) ───────────────────────
function toggleConvSelect(id, checked) {
  if (checked) selectedConvIds.add(id); else selectedConvIds.delete(id);
  updateConvBulkBar();
}

function toggleAllConv(checked) {
  const rows = allConversions;
  rows.forEach(r => { if (checked) selectedConvIds.add(r.id); else selectedConvIds.delete(r.id); });
  renderConvPage(convCurrentPage);
  updateConvBulkBar();
}

function clearConvSelection() {
  selectedConvIds.clear();
  $("conv-check-all").checked = false;
  updateConvBulkBar();
  renderConvPage(convCurrentPage);
}

function updateConvBulkBar() {
  const bar = $("conv-bulk-bar");
  const count = selectedConvIds.size;
  $("conv-sel-count").textContent = count;
  bar.classList.toggle("hidden", count === 0);
  // Add padding to page so bulk bar doesn't hide last rows on mobile
  const tab = $("tab-conversions");
  if (tab) tab.style.paddingBottom = count > 0 ? '80px' : '';
}

async function bulkConvAction(action) {
  const ids = [...selectedConvIds];
  if (!ids.length) return;
  const label = action.replace("-", " ");
  const variant = action === "reject" ? "danger" : "warning";
  if (!await tfxsConfirm(`${label.charAt(0).toUpperCase() + label.slice(1)} ${ids.length} selected conversion(s)?`, { title: "Bulk Action", okText: `${label.charAt(0).toUpperCase() + label.slice(1)} All`, variant })) return;
  try {
    const res = await api("/admin/conversions/bulk", { method: "POST", body: JSON.stringify({ ids, action }) });
    toast(`${res.updated || 0}/${ids.length} conversions ${label}d`);
  } catch (_) {}
  selectedConvIds.clear();
  updateConvBulkBar();
  loadConversions(convCurrentPage); loadStats();
}

// ══════════════════════════════════════════════════════
// PAYOUTS
// ══════════════════════════════════════════════════════

let allPayouts = [];
let selectedPayIds = new Set();
let payTotalCount = 0;
let payCurrentPage = 1;

async function loadPayouts(page) {
  page = page || 1;
  payCurrentPage = page;
  const params = new URLSearchParams();
  const afp = $("pay-filter-afp-value")?.value || $("pay-filter-afp-input")?.value.trim() || "";
  const status = $("pay-status").value;
  if (afp) params.set("affiliate_code", afp);
  if (status) params.set("status", status);
  params.set("page", page);
  params.set("limit", PER_PAGE);
  try {
    const res = await api("/admin/payouts?" + params);
    allPayouts = res.data || [];
    payTotalCount = res.total || allPayouts.length;
    selectedPayIds.clear();
    updatePayBulkBar();
    renderPayPage(page);
  } catch (_) {}
}

function renderPayPage(page) {
  const rows = allPayouts;
  const tbody = $("pay-tbody");

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="9" class="px-4 py-12 text-center text-gray-600">No payouts found</td></tr>`;
    $("pay-pagination").innerHTML = "";
    return;
  }

  tbody.innerHTML = rows.map(r => {
    const checked = selectedPayIds.has(r.id) ? "checked" : "";
    let actions = "";
    if (r.status === "pending" || r.status === "approved") {
      actions += `<button onclick="payoutAction('${r.id}','mark-paid')" class="text-green-400 hover:text-green-300 mr-1 text-[10px] font-bold uppercase">Pay</button>`;
      actions += `<button onclick="payoutAction('${r.id}','cancel')" class="text-red-400 hover:text-red-300 mr-1 text-[10px] font-bold uppercase">Cancel</button>`;
    }
    actions += `<button onclick="deletePayout('${r.id}')" class="text-gray-500 hover:text-red-400 text-[10px] font-bold uppercase">Del</button>`;
    return `
    <tr class="border-t border-white/5 hover:bg-white/[0.02] transition">
      <td class="px-2 py-3 text-center"><input type="checkbox" ${checked} onchange="togglePaySelect('${r.id}', this.checked)" class="cursor-pointer"></td>
      <td class="px-4 py-3 text-gray-500">${fmtDate(r.requested_at || r.created_at)}</td>
      <td class="px-4 py-3 font-mono text-brand-500 text-[10px] font-bold">${esc(r.affiliate_id || r.affiliate_code)}</td>
      <td class="px-4 py-3 text-right font-mono text-white font-bold">${fmtMoney(r.amount)}</td>
      <td class="px-4 py-3 text-gray-400 whitespace-nowrap"><span class="text-[10px] font-bold text-white">${esc(CRYPTO_LABELS[r.payment_method] || r.payment_method || r.currency || "—")}</span></td>
      <td class="px-4 py-3 text-gray-500 font-mono text-[10px] truncate max-w-[160px]" title="${esc(r.wallet_address || '')}">${esc(r.wallet_address || "—")}</td>
      <td class="px-4 py-3 text-center">${statusBadge(r.status)}</td>
      <td class="px-4 py-3 text-gray-500 truncate max-w-[120px]">${esc(r.notes || r.admin_note || "—")}</td>
      <td class="px-4 py-3 text-right whitespace-nowrap">${actions}</td>
    </tr>`;
  }).join("");

  renderPagination("pay-pagination", payTotalCount, page, PER_PAGE, p => loadPayouts(p));
}

function openPayoutModal(data) {
  if (data && data.id) {
    $("payout-modal-title").textContent = "Edit Payout";
    $("payout-edit-id").value = data.id;
    $("payout-afp-input").value = data.affiliate_id || data.affiliate_code || "";
    $("payout-afp-value").value = data.affiliate_id || data.affiliate_code || "";
    $("payout-amount").value = data.amount || "";
    setCustomSelectValue("payout-currency", data.payment_method || "USDT-TRC20");
    $("payout-wallet-admin").value = data.wallet_address || "";
    $("payout-note").value = data.notes || "";
  } else {
    $("payout-modal-title").textContent = "Create Payout";
    $("payout-edit-id").value = "";
    $("payout-afp-input").value = "";
    $("payout-afp-value").value = "";
    $("payout-amount").value = "";
    setCustomSelectValue("payout-currency", "USDT-TRC20");
    $("payout-wallet-admin").value = "";
    $("payout-note").value = "";
  }
  // Init flatpickr on payout date
  const dateEl = $("payout-date");
  if (dateEl && !dateEl._flatpickr) {
    flatpickr(dateEl, { dateFormat: "Y-m-d", theme: "dark", allowInput: true, disableMobile: true });
  }
  if (dateEl._flatpickr) {
    dateEl._flatpickr.setDate(data && data.payout_date ? data.payout_date : null, true);
  }
  openModal("payout-modal");
}

async function submitPayout() {
  const afp = $("payout-afp-value").value.trim() || $("payout-afp-input").value.trim();
  const amount = Number($("payout-amount").value);
  if (!afp || !amount) return toast("Affiliate ID and Amount required", "warn");
  const walletAddr = $("payout-wallet-admin").value.trim();
  if (!walletAddr) return toast("Wallet address required", "warn");
  const payoutDateVal = $("payout-date").value.trim();
  const body = {
    affiliate_code: afp,
    amount,
    currency: $("payout-currency").value.trim() || "USDT-TRC20",
    wallet_address: walletAddr,
    note: $("payout-note").value.trim() || null,
    payout_date: payoutDateVal || null
  };
  const id = $("payout-edit-id").value;
  try {
    if (id) {
      await api(`/admin/payouts/${id}`, { method: "PATCH", body: JSON.stringify({
        amount: body.amount,
        payment_method: body.currency,
        wallet_address: body.wallet_address,
        notes: body.note,
        payout_date: body.payout_date
      })});
      toast("Payout updated");
    } else {
      await api("/admin/payouts", { method: "POST", body: JSON.stringify(body) });
      toast("Payout created");
    }
    closeModal("payout-modal");
    loadPayouts(); loadStats();
  } catch (_) {}
}

async function payoutAction(id, action) {
  const label = action === "mark-paid" ? "mark as paid" : "cancel";
  const variant = action === "cancel" ? "danger" : "warning";
  if (!await tfxsConfirm(`Are you sure you want to ${label} this payout?`, { title: `${label.charAt(0).toUpperCase() + label.slice(1)} Payout`, okText: label.charAt(0).toUpperCase() + label.slice(1), variant })) return;
  // Prompt for optional note
  const adminNote = prompt("Add an optional note (leave blank to skip):", "") || "";
  try {
    await api(`/admin/payouts/${id}/${action}`, { method: "PATCH", body: JSON.stringify({ admin_note: adminNote || undefined }) });
    toast(`Payout ${action === "mark-paid" ? "paid" : "cancelled"}`);
    loadPayouts(); loadStats();
  } catch (_) {}
}

async function deletePayout(id) {
  if (!await tfxsConfirm("This payout record will be permanently deleted.", { title: "Delete Payout", okText: "Delete", variant: "danger" })) return;
  try {
    await api(`/admin/payouts/${id}`, { method: "DELETE" });
    toast("Payout deleted");
    loadPayouts(); loadStats();
  } catch (_) {}
}

// ── Bulk selection (payouts) ───────────────────────────
function togglePaySelect(id, checked) {
  if (checked) selectedPayIds.add(id); else selectedPayIds.delete(id);
  updatePayBulkBar();
}

function toggleAllPay(checked) {
  const rows = allPayouts;
  rows.forEach(r => { if (checked) selectedPayIds.add(r.id); else selectedPayIds.delete(r.id); });
  renderPayPage(payCurrentPage);
  updatePayBulkBar();
}

function clearPaySelection() {
  selectedPayIds.clear();
  $("pay-check-all").checked = false;
  updatePayBulkBar();
  renderPayPage(payCurrentPage);
}

function updatePayBulkBar() {
  const bar = $("pay-bulk-bar");
  const count = selectedPayIds.size;
  $("pay-sel-count").textContent = count;
  bar.classList.toggle("hidden", count === 0);
  // Add padding to page so bulk bar doesn't hide last rows on mobile
  const tab = $("tab-payouts");
  if (tab) tab.style.paddingBottom = count > 0 ? '80px' : '';
}

async function bulkPayAction(action) {
  const ids = [...selectedPayIds];
  if (!ids.length) return;
  const label = action.replace("-", " ");
  const variant = action === "cancel" ? "danger" : "warning";
  if (!await tfxsConfirm(`${label.charAt(0).toUpperCase() + label.slice(1)} ${ids.length} selected payout(s)?`, { title: "Bulk Action", okText: `${label.charAt(0).toUpperCase() + label.slice(1)} All`, variant })) return;
  try {
    const res = await api("/admin/payouts/bulk", { method: "POST", body: JSON.stringify({ ids, action }) });
    toast(`${res.updated || 0}/${ids.length} payouts ${label}d`);
  } catch (_) {}
  selectedPayIds.clear();
  updatePayBulkBar();
  loadPayouts(payCurrentPage); loadStats();
}

// ══════════════════════════════════════════════════════
// USERS & ROLES
// ══════════════════════════════════════════════════════

async function loadUsers() {
  try {
    const res = await api("/admin/users");
    const rows = res.data || [];
    const tbody = $("users-tbody");

    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="4" class="px-4 py-12 text-center text-gray-600">No admin users</td></tr>`;
      return;
    }

    tbody.innerHTML = rows.map(r => `
      <tr class="border-t border-white/5 hover:bg-white/[0.02] transition">
        <td class="px-4 py-3 font-mono text-brand-500 font-bold">${esc(r.afp)}</td>
        <td class="px-4 py-3 text-white">${esc(r.display_name || "—")}</td>
        <td class="px-4 py-3 text-gray-400">${esc(r.email)}</td>
        <td class="px-4 py-3 text-right">
          <button onclick="demoteUser('${r.id}', '${esc(r.afp)}')" class="text-[10px] text-red-400 hover:text-red-300 transition font-bold uppercase">Demote</button>
        </td>
      </tr>
    `).join("");
  } catch (_) {}
}

async function promoteUser() {
  const id = $("user-promote-id").value;
  if (!id) return toast("Select an affiliate first", "warn");
  try {
    await api(`/admin/users/${id}/promote`, { method: "PATCH", body: JSON.stringify({}) });
    toast("User promoted to admin");
    $("user-search-input").value = "";
    $("user-search-result").classList.add("hidden");
    $("user-promote-id").value = "";
    loadUsers(); loadStats();
  } catch (_) {}
}

async function demoteUser(id, afp) {
  if (!await tfxsConfirm(`Remove admin privileges from ${afp}? They will lose access to the Control Center.`, { title: "Demote Admin", okText: "Demote", variant: "warning" })) return;
  try {
    await api(`/admin/users/${id}/demote`, { method: "PATCH", body: JSON.stringify({}) });
    toast("Admin rights removed");
    loadUsers(); loadStats();
  } catch (_) {}
}

// ══════════════════════════════════════════════════════
// AUDIT LOG
// ══════════════════════════════════════════════════════

let allAuditRows = [];
let auditTotalCount = 0;
let auditCurrentPage = 1;

async function loadAudit(page) {
  page = page || 1;
  auditCurrentPage = page;
  const params = new URLSearchParams();
  const entity = $("audit-entity").value;
  const from = $("audit-from").value;
  const to = $("audit-to").value;
  if (entity) params.set("entity", entity);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  params.set("page", page);
  params.set("limit", PER_PAGE);
  try {
    const res = await api("/admin/audit?" + params);
    allAuditRows = res.data || [];
    auditTotalCount = res.total || allAuditRows.length;
    renderAuditPage(page);
  } catch (_) {}
}

function renderAuditPage(page) {
  const rows = allAuditRows;
  const tbody = $("audit-tbody");

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="px-4 py-12 text-center text-gray-600">No audit entries</td></tr>`;
    $("audit-pagination").innerHTML = "";
    return;
  }

  tbody.innerHTML = rows.map(r => {
    let payloadStr = "—";
    if (r.payload) {
      try { const full = JSON.stringify(r.payload); payloadStr = full.substring(0, 140); if (full.length > 140) payloadStr += "…"; } catch (_) {}
    }
    const actionColor = r.action?.includes("delete") ? "text-red-400" : r.action?.includes("create") ? "text-green-400" : r.action?.includes("promote") ? "text-purple-400" : "text-amber-400";
    return `
    <tr class="border-t border-white/5 hover:bg-white/[0.02] transition">
      <td class="px-4 py-3 text-gray-500">${fmtTime(r.created_at)}</td>
      <td class="px-4 py-3 font-bold text-[10px] uppercase ${actionColor}">${esc(r.action)}</td>
      <td class="px-4 py-3 text-gray-300">${esc(r.entity)}</td>
      <td class="px-4 py-3 font-mono text-gray-500 text-[10px]">${esc(r.entity_id || "—")}</td>
      <td class="px-4 py-3 text-gray-600 font-mono text-[10px] max-w-xs truncate" title="${esc(JSON.stringify(r.payload))}">${esc(payloadStr)}</td>
    </tr>`;
  }).join("");

  renderPagination("audit-pagination", auditTotalCount, page, PER_PAGE, p => loadAudit(p));
}

// ══════════════════════════════════════════════════════
// BROKERS
// ══════════════════════════════════════════════════════

let allBrokers = [];

async function loadBrokers() {
  try {
    const res = await api("/admin/brokers");
    allBrokers = res.data || [];
    // Populate the broker filter dropdown in deals tab
    rebuildCustomSelectOptions('deal-broker-filter',
      [{ value: '', label: 'All Brokers' }, ...allBrokers.map(b => ({ value: b.name, label: b.name }))],
      $("deal-broker-filter")?.value || '');
    // Render broker cards in Deals & Brokers tab
    renderBrokerCards();
    // Refresh prefix mapping broker dropdown
    if (typeof populatePrefixBrokerDropdown === 'function') populatePrefixBrokerDropdown();
  } catch (_) {}
}

async function loadBrokerDropdown() {
  try {
    const res = await api("/admin/brokers");
    allBrokers = res.data || [];
    rebuildCustomSelectOptions('deal-broker',
      [{ value: '', label: 'Select a broker...' }, ...allBrokers.map(b => ({ value: b.name, label: b.name }))],
      $("deal-broker")?.value || '');
  } catch (_) {}
}

// ── Broker logo file upload & resize ──
function handleBrokerLogoFile(input) {
  const file = input.files?.[0];
  if (!file) return;
  if (file.size > 500 * 1024) {
    toast('Image too large — max 500 KB', 'warn');
    input.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      // Resize to max 128x128
      const MAX = 128;
      let w = img.width, h = img.height;
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
        else       { w = Math.round(w * MAX / h); h = MAX; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL('image/png', 0.9);
      // Store and preview
      const dataInput = $('broker-logo-data');
      if (dataInput) dataInput.value = dataUrl;
      const preview = $('broker-logo-preview');
      const previewImg = $('broker-logo-preview-img');
      if (preview && previewImg) {
        previewImg.src = dataUrl;
        preview.classList.remove('hidden');
      }
      const label = $('broker-logo-label');
      if (label) label.textContent = '✓ ' + file.name.substring(0, 18);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function resetBrokerLogoUpload() {
  const fileInput = $('broker-logo-file');
  const dataInput = $('broker-logo-data');
  const preview = $('broker-logo-preview');
  const label = $('broker-logo-label');
  if (fileInput) fileInput.value = '';
  if (dataInput) dataInput.value = '';
  if (preview) preview.classList.add('hidden');
  if (label) label.innerHTML = '<svg class="w-3.5 h-3.5 inline mr-1 -mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>Upload image';
}

function openBrokerModal() {
  editingBrokerId = null;
  resetBrokerLogoUpload();
  if ($("broker-name-input")) $("broker-name-input").value = "";
  if ($("broker-contact-input")) $("broker-contact-input").value = "";
  if ($("broker-color-text")) $("broker-color-text").value = "#dc2626";
  if ($("broker-color-input")) $("broker-color-input").value = "#dc2626";
  // Reset button text back to Add
  const addBtn = document.querySelector('#broker-modal .btn-gradient');
  if (addBtn) {
    addBtn.textContent = "Add Broker";
    addBtn.setAttribute("onclick", "addBroker()");
  }
  const title = document.querySelector('#broker-modal h3');
  if (title) title.textContent = "Manage Brokers";
  renderBrokerList();
  openModal("broker-modal");
}

async function addBroker() {
  const name = $("broker-name-input")?.value.trim();
  if (!name) return toast("Enter a broker name", "warn");
  const logo_url = $("broker-logo-data")?.value || null;
  const theme_color = $("broker-color-text")?.value.trim() || null;
  const contact = $("broker-contact-input")?.value.trim() || null;
  try {
    const res = await api("/admin/brokers", { method: "POST", body: JSON.stringify({ name, logo_url, theme_color, contact }) });
    toast("Broker added");
    // Warn about missing DB columns
    if (res._stripped && res._stripped.length) {
      toast(`DB migration needed! Broker columns not saved: ${res._stripped.join(", ")}`, "error");
    }
    if ($("broker-name-input")) $("broker-name-input").value = "";
    resetBrokerLogoUpload();
    if ($("broker-contact-input")) $("broker-contact-input").value = "";
    await loadBrokers();
    renderBrokerList();
    renderBrokerCards();
  } catch (_) {}
}

async function deleteBrokerItem(id) {
  if (!await tfxsConfirm("Remove this broker?", { title: "Delete Broker", okText: "Delete", variant: "danger" })) return;
  try {
    await api(`/admin/brokers/${id}`, { method: "DELETE" });
    toast("Broker removed");
    await loadBrokers();
    renderBrokerList();
    renderBrokerCards();
  } catch (_) {}
}

function renderBrokerList() {
  const container = $("broker-list");
  if (!container) return;
  if (!allBrokers.length) {
    container.innerHTML = '<p class="text-xs text-gray-600 text-center py-4">No brokers yet. Add one above.</p>';
    return;
  }
  container.innerHTML = allBrokers.map(b => {
    const colorDot = b.theme_color ? `<span class="w-3 h-3 rounded-full inline-block flex-shrink-0" style="background:${esc(b.theme_color)}"></span>` : '';
    const logoImg = b.logo_url ? `<img src="${esc(b.logo_url)}" class="w-6 h-6 rounded object-contain flex-shrink-0" onerror="this.style.display='none'">` : '';
    const contactTxt = b.contact ? `<span class="text-[9px] text-gray-500 truncate max-w-[120px]">${esc(b.contact)}</span>` : '';
    return `
      <div class="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
        ${logoImg}${colorDot}
        <span class="text-sm text-white font-medium flex-1">${esc(b.name)}</span>
        ${contactTxt}
        <button onclick="deleteBrokerItem('${b.id}')" class="text-[10px] text-red-400 hover:text-red-300 font-bold uppercase transition ml-2">Remove</button>
      </div>
    `;
  }).join("");
}

// ── Broker Cards Grid (in Deals & Brokers tab) ──
function renderBrokerCards() {
  const container = $("broker-cards-grid");
  if (!container) return;
  if (!allBrokers.length) {
    container.innerHTML = '<div class="text-center py-8 col-span-full text-gray-600 text-xs">No brokers yet. Click "+ New Broker" to add one.</div>';
    return;
  }
  container.innerHTML = allBrokers.map(b => {
    const logoHtml = b.logo_url
      ? `<img src="${esc(b.logo_url)}" class="w-10 h-10 rounded-lg object-contain" onerror="this.onerror=null;this.parentElement.innerHTML='<span class=\\'text-white font-bold text-lg\\'>${esc(b.name[0])}</span>'">`
      : `<span class="text-white font-bold text-lg">${esc(b.name[0])}</span>`;
    const colorBorder = b.theme_color ? `border-color: ${b.theme_color}4d` : '';
    const colorDot = b.theme_color ? `<span class="w-3 h-3 rounded-full inline-block" style="background:${esc(b.theme_color)}"></span><span class="text-[10px] text-gray-500 font-mono">${esc(b.theme_color)}</span>` : '<span class="text-[10px] text-gray-600">No color</span>';
    const contactTxt = b.contact ? `<span class="text-[10px] text-gray-500 truncate">${esc(b.contact)}</span>` : '';
    return `
      <div class="glass-panel rounded-xl p-4 border border-white/10 hover:border-white/20 transition" ${colorBorder ? `style="${colorBorder}"` : ''}>
        <div class="flex items-center gap-3 mb-3">
          <div class="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center overflow-hidden flex-shrink-0" ${b.theme_color ? `style="box-shadow:0 0 10px ${b.theme_color}33"` : ''}>${logoHtml}</div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-bold text-white truncate">${esc(b.name)}</p>
            ${contactTxt}
          </div>
        </div>
        <div class="flex items-center gap-2 mb-3">
          ${colorDot}
        </div>
        <div class="flex items-center gap-2">
          <button onclick="editBrokerItem('${b.id}')" class="flex-1 text-[10px] font-bold text-blue-400 hover:text-blue-300 uppercase tracking-wider py-1.5 rounded-lg border border-white/10 hover:bg-white/5 transition text-center">Edit</button>
          <button onclick="deleteBrokerItem('${b.id}')" class="flex-1 text-[10px] font-bold text-red-400 hover:text-red-300 uppercase tracking-wider py-1.5 rounded-lg border border-white/10 hover:bg-white/5 transition text-center">Delete</button>
        </div>
      </div>
    `;
  }).join("");
}

// ── Edit Broker ──
let editingBrokerId = null;

function editBrokerItem(id) {
  const broker = allBrokers.find(b => b.id === id);
  if (!broker) return toast("Broker not found", "warn");
  editingBrokerId = id;
  // Pre-fill the broker modal fields
  if ($("broker-name-input")) $("broker-name-input").value = broker.name || "";
  if ($("broker-contact-input")) $("broker-contact-input").value = broker.contact || "";
  if ($("broker-color-text")) $("broker-color-text").value = broker.theme_color || "#dc2626";
  if ($("broker-color-input")) $("broker-color-input").value = broker.theme_color || "#dc2626";
  // Reset logo upload
  resetBrokerLogoUpload();
  // Show existing logo preview if available
  if (broker.logo_url) {
    const dataInput = $("broker-logo-data");
    const preview = $("broker-logo-preview");
    const previewImg = $("broker-logo-preview-img");
    const label = $("broker-logo-label");
    if (dataInput) dataInput.value = broker.logo_url;
    if (preview && previewImg) {
      previewImg.src = broker.logo_url;
      preview.classList.remove("hidden");
    }
    if (label) label.textContent = "✓ Current logo";
  }
  // Change button text to Update
  const addBtn = document.querySelector('#broker-modal .btn-gradient[onclick="addBroker()"]');
  if (addBtn) {
    addBtn.textContent = "Update Broker";
    addBtn.setAttribute("onclick", "submitBrokerEdit()");
  }
  const title = document.querySelector('#broker-modal h3');
  if (title) title.textContent = "Edit Broker";
  renderBrokerList();
  openModal("broker-modal");
}

async function submitBrokerEdit() {
  if (!editingBrokerId) return;
  const name = $("broker-name-input")?.value.trim();
  if (!name) return toast("Enter a broker name", "warn");
  const logo_url = $("broker-logo-data")?.value || null;
  const theme_color = $("broker-color-text")?.value.trim() || null;
  const contact = $("broker-contact-input")?.value.trim() || null;
  try {
    await api(`/admin/brokers/${editingBrokerId}`, {
      method: "PATCH",
      body: JSON.stringify({ name, logo_url, theme_color, contact })
    });
    toast("Broker updated");
    editingBrokerId = null;
    await loadBrokers();
    renderBrokerList();
    renderBrokerCards();
    closeModal("broker-modal");
  } catch (_) { toast("Failed to update broker", "error"); }
}

// ══════════════════════════════════════════════════════
// BROKER UID PREFIX MAPPING
// ══════════════════════════════════════════════════════

let _brokerPrefixes = [];

async function loadBrokerPrefixes() {
  try {
    const { fetchBrokerPrefixes } = window.TFXS_API;
    const res = await fetchBrokerPrefixes();
    _brokerPrefixes = res.data || res || [];
    renderBrokerPrefixes();
    populatePrefixBrokerDropdown();
  } catch (e) {
    console.warn("[Admin] Failed to load broker prefixes:", e.message);
    const tbody = $("prefix-tbody");
    if (tbody) tbody.innerHTML = '<tr><td colspan="3" class="px-4 py-8 text-center text-red-400 text-xs">Failed to load prefixes</td></tr>';
  }
}

function populatePrefixBrokerDropdown() {
  const sel = $("prefix-broker-select");
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = '<option value="" disabled selected>Select a broker...</option>' +
    allBrokers.map(b => `<option value="${esc(b.name)}"${b.name === current ? ' selected' : ''}>${esc(b.name)}</option>`).join('');
}

function renderBrokerPrefixes() {
  const tbody = $("prefix-tbody");
  if (!tbody) return;
  if (!_brokerPrefixes.length) {
    tbody.innerHTML = '<tr><td colspan="3" class="px-4 py-8 text-center text-gray-600 text-xs">No prefix rules configured yet. Add one above.</td></tr>';
    return;
  }
  tbody.innerHTML = _brokerPrefixes.map(p => `
    <tr class="border-b border-white/5 hover:bg-white/[0.02] transition">
      <td class="px-4 py-3 text-sm font-mono text-purple-400">${esc(p.prefix)}</td>
      <td class="px-4 py-3 text-sm text-white">${esc(p.broker_name)}</td>
      <td class="px-4 py-3 text-right">
        <button onclick="deleteBrokerPrefix('${p.id}')" class="text-red-400 hover:text-red-300 text-[10px] font-bold uppercase tracking-wider transition">
          <svg class="w-4 h-4 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        </button>
      </td>
    </tr>
  `).join('');
}

async function addBrokerPrefix() {
  const prefix = $("prefix-input")?.value.trim();
  const sel = $("prefix-broker-select");
  const broker_name = sel?.value;
  if (!prefix) return toast("Enter a prefix pattern", "warn");
  if (!broker_name) return toast("Select a broker", "warn");
  try {
    const { addBrokerPrefixAPI } = window.TFXS_API;
    await addBrokerPrefixAPI(prefix, broker_name);
    toast("Prefix rule added");
    $("prefix-input").value = "";
    sel.selectedIndex = 0;
    await loadBrokerPrefixes();
  } catch (e) { toast("Failed to add prefix: " + e.message, "error"); }
}

async function deleteBrokerPrefix(id) {
  if (!await tfxsConfirm("This prefix mapping will be removed.", { title: "Delete Prefix Mapping", okText: "Delete", variant: "danger" })) return;
  try {
    const { deleteBrokerPrefixAPI } = window.TFXS_API;
    await deleteBrokerPrefixAPI(id);
    toast("Prefix rule deleted");
    await loadBrokerPrefixes();
  } catch (e) { toast("Failed to delete prefix: " + e.message, "error"); }
}

async function normalizeBrokerNames() {
  const btn = $("normalize-brokers-btn");
  if (btn) { btn.disabled = true; btn.textContent = "Normalizing..."; }
  try {
    const { normalizeBrokersAPI } = window.TFXS_API;
    const res = await normalizeBrokersAPI();
    toast(`Broker names normalized — ${res.updated || 0} conversion(s) updated`);
  } catch (e) { toast("Normalization failed: " + e.message, "error"); }
  if (btn) { btn.disabled = false; btn.textContent = "Normalize"; }
}

// ══════════════════════════════════════════════════════
// AFFILIATE DEAL ASSIGNMENT (from affiliate edit modal)
// ══════════════════════════════════════════════════════

let affDealChips = []; // deal IDs assigned to this affiliate
let _affAllDeals = []; // cached deals list for multi-assignment

async function loadAffDeals(afp) {
  affDealChips = [];
  _affAllDeals = [];
  const dealsRow = $("aff-deals-row");
  const chipContainer = $("aff-deal-chips");
  const selectEl = $("aff-deal-select");
  if (!dealsRow || !selectEl) return;

  try {
    // Load all deals for the dropdown
    const res = await api("/admin/deals");
    const allDeals_aff = res.data || [];
    _affAllDeals = allDeals_aff;

    // Find which deals are assigned to this affiliate
    affDealChips = allDeals_aff
      .filter(d => (d.assigned_affiliates || []).includes(afp))
      .map(d => ({ id: d.id, label: `${d.broker} — ${d.deal_type || 'CPA'}${d.tiers?.length ? ` (${d.tiers.length} tier${d.tiers.length !== 1 ? 's' : ''})` : ''}` }));

    // Build select options (exclude already assigned)
    renderAffDealUI(allDeals_aff);
    dealsRow.classList.remove("hidden");
  } catch (_) {}
}

function renderAffDealUI(allDeals_aff) {
  const chipContainer = $("aff-deal-chips");
  const selectEl = $("aff-deal-select");
  if (!chipContainer || !selectEl) return;

  const assignedIds = new Set(affDealChips.map(c => c.id));

  chipContainer.innerHTML = affDealChips.map(c =>
    `<span class="inline-flex items-center gap-1 bg-green-500/10 text-green-400 px-2 py-1 rounded-lg text-[10px] font-bold border border-green-500/20">
      ${esc(c.label)}
      <button onclick="removeAffDeal('${c.id}')" class="text-green-300 hover:text-white ml-0.5">&times;</button>
    </span>`
  ).join("") || '<span class="text-gray-700 text-[10px]">No deals assigned</span>';

  // Rebuild select with unassigned deals
  const available = (allDeals_aff || _affAllDeals || []).filter(d => !assignedIds.has(d.id) && d.is_active !== false);
  const opts = [{ value: '', label: '+ Assign a deal...' }].concat(
    available.map(d => ({ value: d.id, label: `${esc(d.broker)} — ${d.deal_type||'CPA'}${d.tiers?.length ? ` (${d.tiers.length} tiers)` : ''}`, dataLabel: `${esc(d.broker)} — ${d.deal_type||'CPA'}` }))
  );
  rebuildCustomSelectOptions('aff-deal-select', opts, '');
}

function addDealToAffiliate() {
  const selectEl = $("aff-deal-select");
  if (!selectEl || !selectEl.value) return;
  const id = selectEl.value;
  const label = selectEl.dataset.selectedLabel || id;
  if (affDealChips.find(c => c.id === id)) return;
  affDealChips.push({ id, label });
  renderAffDealUI();
  setCustomSelectValue("aff-deal-select", "");
}

function removeAffDeal(id) {
  affDealChips = affDealChips.filter(c => c.id !== id);
  renderAffDealUI();
}

// ══════════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════════

// Setup AFP search for deal modal — add as chips instead of single value
setupAfpSearch("deal-afp-input", "deal-afp-dropdown", null, (selected) => {
  addDealAfpChip(selected.afp);
  $("deal-afp-input").value = "";
});
setupAfpSearch("conv-afp-input", "conv-afp-dropdown", "conv-afp-value");
setupAfpSearch("payout-afp-input", "payout-afp-dropdown", "payout-afp-value");
setupAfpSearch("conv-filter-afp-input", "conv-filter-afp-dropdown", "conv-filter-afp-value");
setupAfpSearch("pay-filter-afp-input", "pay-filter-afp-dropdown", "pay-filter-afp-value");

// Special: user search for promote
setupAfpSearch("user-search-input", "user-search-dropdown", null, (selected) => {
  $("user-promote-id").value = selected.id;
  $("user-result-name").textContent = selected.name || "—";
  $("user-result-afp").textContent = selected.afp;
  $("user-result-email").textContent = selected.email || "—";
  $("user-search-result").classList.remove("hidden");
});

// Init flatpickr on admin date inputs
const fpOpts = { dateFormat: "Y-m-d", theme: "dark", disableMobile: true, monthSelectorType: "static" };
["conv-from", "conv-to", "audit-from", "audit-to"].forEach(id => {
  const el = $(id);
  if (el) flatpickr(el, fpOpts);
});

// Init flatpickr on conversion date (datetime picker)
const convDateEl = $("conv-date");
if (convDateEl && !convDateEl._flatpickr) {
  flatpickr(convDateEl, {
    enableTime: true,
    time_24hr: true,
    dateFormat: "Y-m-d H:i",
    theme: "dark",
    disableMobile: true,
    monthSelectorType: "static",
    allowInput: false,
    defaultHour: new Date().getHours(),
    defaultMinute: new Date().getMinutes()
  });
}

// ══════════════════════════════════════════════════════
// BROKER COLOR PICKER SYNC
// ══════════════════════════════════════════════════════
(() => {
  const colorPicker = $("broker-color-input");
  const colorText = $("broker-color-text");
  if (colorPicker && colorText) {
    colorPicker.addEventListener("input", () => { colorText.value = colorPicker.value; });
    colorText.addEventListener("input", () => {
      if (/^#[0-9a-fA-F]{6}$/.test(colorText.value)) colorPicker.value = colorText.value;
    });
  }
})();

// ══════════════════════════════════════════════════════
// PAYOUT SCHEDULE MANAGEMENT
// ══════════════════════════════════════════════════════

const SCHEDULE_LABELS = {
  "1,15": "1st & 15th of each month",
  "1": "1st of each month",
  "15": "15th of each month",
  "weekly": "Weekly (every Monday)",
  "end_of_month": "End of month",
  "end_of_month_26": "End of month (26th)",
  "sm_daily": "Same Month — Daily",
  "sm_weekly": "Same Month — Weekly",
  "sm_biweekly": "Same Month — Biweekly",
  "sm_1,15": "Same Month — 1st & 15th",
  "sm_1": "Same Month — 1st",
  "sm_15": "Same Month — 15th",
  "sm_end_of_month_26": "Same Month — End of month (26th)"
};

async function loadPayoutScheduleSettings() {
  try {
    const res = await api("/admin/payout-schedule");
    if (res.ok) {
      const sel = $("payout-schedule-system");
      const sysVal = res.system_schedule || "1,15";
      if (sel) {
        sel.value = sysVal;
        // Update the custom-select label to match the loaded value
        const wrap = sel.closest(".custom-select");
        if (wrap) {
          const label = wrap.querySelector("[data-cs-label]");
          const opt = wrap.querySelector(`.custom-select-opt[data-value="${CSS.escape(sysVal)}"]`);
          if (label && opt) label.textContent = opt.textContent;
          // Update active highlight
          wrap.querySelectorAll(".custom-select-opt").forEach(o => {
            o.classList.toggle("bg-white/5", o.dataset.value === sysVal);
            o.classList.toggle("font-medium", o.dataset.value === sysVal);
          });
        }
      }
      renderScheduleOverrides(res.overrides || []);
    }
  } catch (_) {}
}

let _scheduleOverrides = [];
function renderScheduleOverrides(overrides) {
  _scheduleOverrides = overrides || [];
  const container = $("payout-schedule-overrides");
  const countEl = $("payout-override-count");
  const filterInput = $("payout-override-filter");
  if (countEl) countEl.textContent = _scheduleOverrides.length;
  if (filterInput) {
    if (_scheduleOverrides.length >= 5) { filterInput.classList.remove("hidden"); } else { filterInput.classList.add("hidden"); filterInput.value = ""; }
  }
  if (!container) return;
  renderFilteredOverrides("");
}
function renderFilteredOverrides(filter) {
  const container = $("payout-schedule-overrides");
  if (!container) return;
  const f = (filter || "").toLowerCase().trim();
  const list = f ? _scheduleOverrides.filter(o => o.affiliate_id.toLowerCase().includes(f)) : _scheduleOverrides;
  if (!list.length) {
    container.innerHTML = f
      ? '<p class="text-[10px] text-gray-600 text-center py-2">No matches</p>'
      : '<p class="text-[10px] text-gray-600 text-center py-2">No per-affiliate overrides</p>';
    return;
  }
  container.innerHTML = list.map(o => `
    <div class="flex items-center justify-between bg-white/5 rounded-lg px-3 py-1.5">
      <span class="text-[11px] font-mono text-brand-400">${esc(o.affiliate_id)}</span>
      <span class="text-[10px] text-gray-400">${SCHEDULE_LABELS[o.payout_schedule] || o.payout_schedule}</span>
      <button onclick="removeScheduleOverride('${esc(o.affiliate_id)}')" class="text-[9px] text-red-400 hover:text-red-300 font-bold uppercase">✕</button>
    </div>
  `).join("");
}
function filterScheduleOverrides(val) { renderFilteredOverrides(val); }

async function savePayoutSchedule(affiliateId) {
  const schedule = affiliateId === "_system_"
    ? $("payout-schedule-system")?.value
    : $("payout-schedule-affiliate")?.value;
  if (!schedule) return;
  try {
    await api("/admin/payout-schedule", {
      method: "PUT",
      body: JSON.stringify({ affiliate_id: affiliateId, payout_schedule: schedule })
    });
    toast(affiliateId === "_system_" ? "System schedule saved" : `Schedule set for ${affiliateId}`);
    loadPayoutScheduleSettings();
  } catch (_) {}
}

async function saveAffiliatePayoutSchedule() {
  const afp = $("payout-sched-afp-value")?.value;
  if (!afp) return toast("Select an affiliate first", "warn");
  await savePayoutSchedule(afp);
  if ($("payout-sched-afp-input")) $("payout-sched-afp-input").value = "";
  if ($("payout-sched-afp-value")) $("payout-sched-afp-value").value = "";
}

async function removeScheduleOverride(afp) {
  try {
    await api("/admin/payout-schedule", {
      method: "PUT",
      body: JSON.stringify({ affiliate_id: afp, payout_schedule: null })
    });
    toast(`Override removed for ${afp}`);
    loadPayoutScheduleSettings();
  } catch (_) {}
}

// Wire up AFP search in payout schedule section
setupAfpSearch("payout-sched-afp-input", "payout-sched-afp-dropdown", "payout-sched-afp-value");

// Load brokers on startup
loadBrokers();
loadBrokerPrefixes();

// Load payout schedule settings
loadPayoutScheduleSettings();

// ── ROI Calculation Settings ────────────────────────────────────
// ── Contact Info Settings ─────────────────────────────────────
async function loadContactSettings() {
  try {
    const res = await api("/admin/contact-settings");
    if (res.ok) {
      const emailInput = $("contact-email-input");
      const telegramInput = $("contact-telegram-input");
      if (emailInput) emailInput.value = res.contact_email || "";
      if (telegramInput) telegramInput.value = (res.contact_telegram || "").replace(/^@/, "");
    }
  } catch (_) {}
}

async function saveContactSettings() {
  const email = ($("contact-email-input")?.value || "").trim();
  const telegram = ($("contact-telegram-input")?.value || "").trim().replace(/^@/, "");
  try {
    await api("/admin/contact-settings", {
      method: "PUT",
      body: JSON.stringify({ contact_email: email, contact_telegram: telegram })
    });
    toast("Contact info saved", "success");
  } catch (e) { toast(e.message || "Failed to save", "error"); }
}

// Load contact settings on init
loadContactSettings();

// ── ROI Formula Settings ──────────────────────────────────────
const ROI_FORMULA_LABELS = {
  "deposit_div_commission": "Total Deposit ÷ Commission",
  "net_deposit_div_commission": "Net Deposit ÷ Commission",
  "commission_div_deposit": "Commission ÷ Total Deposit",
  "commission_div_deposit_pct": "Commission ÷ Total Deposit × 100%",
  "profit_margin": "(Deposit − Commission) ÷ Deposit × 100%",
  "fixed_ratio": "Fixed Ratio (manual)"
};

const ROI_FORMULA_PREVIEWS = {
  "deposit_div_commission": "ROI = Total Deposit ÷ Commission",
  "net_deposit_div_commission": "ROI = (Deposits − Withdrawals) ÷ Commission",
  "commission_div_deposit": "ROI = Commission ÷ Total Deposit",
  "commission_div_deposit_pct": "ROI = (Commission ÷ Total Deposit) × 100%",
  "profit_margin": "ROI = ((Deposit − Commission) ÷ Deposit) × 100%",
  "fixed_ratio": "ROI = Manually set value"
};

async function loadRoiSettings() {
  try {
    const res = await api("/admin/roi-settings");
    if (res.ok) {
      const sel = $("roi-formula-system");
      if (sel) sel.value = res.system_formula || "deposit_div_commission";
      updateRoiPreview();
      renderRoiOverrides(res.overrides || []);
    }
  } catch (_) {}
}

let _roiOverrides = [];
function renderRoiOverrides(overrides) {
  _roiOverrides = overrides || [];
  const countEl = $("roi-override-count");
  const filterInput = $("roi-override-filter");
  if (countEl) countEl.textContent = _roiOverrides.length;
  if (filterInput) {
    if (_roiOverrides.length >= 5) { filterInput.classList.remove("hidden"); } else { filterInput.classList.add("hidden"); filterInput.value = ""; }
  }
  renderFilteredRoiOverrides("");
}

function renderFilteredRoiOverrides(filter) {
  const container = $("roi-overrides-list");
  if (!container) return;
  const f = (filter || "").toLowerCase().trim();
  const list = f ? _roiOverrides.filter(o => o.affiliate_id.toLowerCase().includes(f)) : _roiOverrides;
  if (!list.length) {
    container.innerHTML = f
      ? '<p class="text-[10px] text-gray-600 text-center py-2">No matches</p>'
      : '<p class="text-[10px] text-gray-600 text-center py-2">No per-affiliate overrides</p>';
    return;
  }
  container.innerHTML = list.map(o => `
    <div class="flex items-center justify-between bg-white/5 rounded-lg px-3 py-1.5">
      <span class="text-[11px] font-mono text-purple-400">${esc(o.affiliate_id)}</span>
      <span class="text-[10px] text-gray-400">${ROI_FORMULA_LABELS[o.roi_formula] || o.roi_formula}</span>
      <button onclick="removeRoiOverride('${esc(o.affiliate_id)}')" class="text-[9px] text-red-400 hover:text-red-300 font-bold uppercase">✕</button>
    </div>
  `).join("");
}

function filterRoiOverrides(val) { renderFilteredRoiOverrides(val); }

function updateRoiPreview() {
  const sel = $("roi-formula-system");
  const preview = $("roi-formula-preview");
  if (sel && preview) {
    preview.textContent = ROI_FORMULA_PREVIEWS[sel.value] || sel.value;
  }
}
// Bind preview update on change
document.addEventListener("DOMContentLoaded", () => {
  const sel = $("roi-formula-system");
  if (sel) sel.addEventListener("change", updateRoiPreview);
});

async function saveRoiFormula(affiliateId) {
  const formula = affiliateId === "_system_"
    ? $("roi-formula-system")?.value
    : $("roi-formula-affiliate")?.value;
  if (!formula) return;
  try {
    await api("/admin/roi-settings", {
      method: "PUT",
      body: JSON.stringify({ affiliate_id: affiliateId, roi_formula: formula })
    });
    toast(affiliateId === "_system_" ? "Global ROI formula saved" : `ROI formula set for ${affiliateId}`);
    loadRoiSettings();
  } catch (_) {}
}

async function saveAffiliateRoiFormula() {
  const afp = $("roi-afp-value")?.value;
  if (!afp) return toast("Select an affiliate first", "warn");
  await saveRoiFormula(afp);
  if ($("roi-afp-input")) $("roi-afp-input").value = "";
  if ($("roi-afp-value")) $("roi-afp-value").value = "";
}

async function removeRoiOverride(afp) {
  try {
    await api("/admin/roi-settings", {
      method: "PUT",
      body: JSON.stringify({ affiliate_id: afp, roi_formula: null })
    });
    toast(`ROI override removed for ${afp}`);
    loadRoiSettings();
  } catch (_) {}
}

// Wire up AFP search for ROI section
setupAfpSearch("roi-afp-input", "roi-afp-dropdown", "roi-afp-value");

// Load ROI settings
loadRoiSettings();

// ── Affiliate Approve / Reject ────────────────────────────────
async function approveAffiliate(id) {
  const ok = await styledConfirm({ title: "Approve Affiliate", message: "This affiliate will be able to log in and access the dashboard.", okText: "Approve", type: "success" });
  if (!ok) return;
  try {
    await api(`/admin/affiliates/${id}/approve`, { method: "PATCH" });
    toast("Affiliate approved", "success");
    loadAffiliates(affCurrentPage);
    loadPendingCounts();
  } catch (e) { toast(e.message || "Failed", "error"); }
}
async function rejectAffiliate(id) {
  const ok = await styledConfirm({ title: "Reject Affiliate", message: "This affiliate application will be declined.", okText: "Reject", type: "danger" });
  if (!ok) return;
  try {
    await api(`/admin/affiliates/${id}/reject`, { method: "PATCH", body: JSON.stringify({ reason: "Application declined" }) });
    toast("Affiliate rejected", "success");
    loadAffiliates(affCurrentPage);
    loadPendingCounts();
  } catch (e) { toast(e.message || "Failed", "error"); }
}

// ── Pending notifications ─────────────────────────────────────
async function loadPendingCounts() {
  try {
    const res = await api("/admin/pending-count");
    const total = (res.pending_affiliates || 0) + (res.pending_kyc || 0);
    const bell = $("admin-notif-bell");
    const badge = $("admin-notif-badge");
    const kycBadge = $("kyc-tab-badge");
    if (bell) { bell.classList.toggle("hidden", total === 0); }
    if (badge) { badge.textContent = total > 9 ? "9+" : total; badge.classList.toggle("hidden", total === 0); }
    if (kycBadge) { kycBadge.textContent = res.pending_kyc || 0; kycBadge.classList.toggle("hidden", !res.pending_kyc); }
    // Auto-set affiliates filter to pending if there are pending ones
    const pendingIndicator = $("stat-affiliates");
    if (pendingIndicator && res.pending_affiliates > 0) {
      pendingIndicator.title = `${res.pending_affiliates} pending approval`;
    }
  } catch (_) {}
}

function showPendingTab() {
  // Switch to affiliates tab, filter by pending
  document.querySelectorAll(".admin-tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".tab-content").forEach(t => t.classList.add("hidden"));
  const affTab = document.querySelector('[data-tab="affiliates"]');
  if (affTab) affTab.classList.add("active");
  $("tab-affiliates").classList.remove("hidden");
  // Set filter to pending
  const filter = $("aff-status-filter");
  if (filter) filter.value = "pending";
  loadAffiliates(1);
}

// ── KYC Review Functions ──────────────────────────────────────
async function loadKycSubmissions() {
  const container = $("kyc-list");
  if (!container) return;
  const statusFilter = $("kyc-status-filter") ? $("kyc-status-filter").value : "";
  const params = statusFilter ? `?status=${statusFilter}` : "";
  try {
    const res = await api("/admin/kyc" + params);
    const docs = res.data || [];
    if (!docs.length) {
      container.innerHTML = '<p class="text-xs text-gray-600 text-center py-8">No KYC submissions found</p>';
      return;
    }
    container.innerHTML = docs.map(d => {
      const aff = d.affiliate || {};
      const imgs = Array.isArray(d.images) ? d.images : [];
      const statusClass = d.status === "approved" ? "text-green-400 bg-green-500/10 border-green-500/20" : d.status === "rejected" ? "text-red-400 bg-red-500/10 border-red-500/20" : "text-amber-400 bg-amber-500/10 border-amber-500/20";
      return `
      <div class="glass-panel rounded-xl p-5 border border-white/5">
        <div class="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <p class="text-sm font-bold text-white">${esc(aff.display_name || aff.afp || d.affiliate_id)}</p>
            <p class="text-[10px] text-gray-500 font-mono">${esc(aff.email || "—")} · ${esc(d.affiliate_id)}</p>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-[9px] font-bold px-2 py-1 rounded-full uppercase border ${statusClass}">${esc(d.status)}</span>
            <span class="text-[9px] text-gray-600">${d.submitted_at ? new Date(d.submitted_at).toLocaleDateString() : "—"}</span>
          </div>
        </div>
        <p class="text-[10px] text-gray-400 mb-3 uppercase tracking-wider">Document: <strong class="text-white">${esc(d.document_type || "—")}</strong></p>
        <div class="flex flex-wrap gap-3 mb-4">
          ${imgs.map((img, i) => `<img src="${img}" alt="KYC Doc ${i+1}" class="h-32 rounded-lg border border-white/10 cursor-pointer hover:opacity-80 hover:border-brand-500/40 transition" data-kyc-img="${i}" onclick="openKycLightbox(this.src)">`).join("")}
        </div>
        ${d.status === "pending" ? `
          <div class="flex items-center gap-2 pt-3 border-t border-white/5">
            <button onclick="approveKyc('${esc(d.affiliate_id)}')" class="text-[10px] font-bold text-green-400 hover:text-green-300 uppercase tracking-wider px-3 py-1.5 rounded-lg border border-green-500/20 hover:bg-green-500/10 transition">Approve KYC</button>
            <button onclick="rejectKyc('${esc(d.affiliate_id)}')" class="text-[10px] font-bold text-red-400 hover:text-red-300 uppercase tracking-wider px-3 py-1.5 rounded-lg border border-red-500/20 hover:bg-red-500/10 transition">Reject KYC</button>
          </div>` : d.admin_note ? `<p class="text-[10px] text-gray-500 pt-3 border-t border-white/5">Note: ${esc(d.admin_note)}</p>` : ""}
      </div>`;
    }).join("");
  } catch (e) { container.innerHTML = `<p class="text-xs text-red-400 text-center py-8">${e.message}</p>`; }
}

// KYC Image Lightbox
function openKycLightbox(src) {
  const lb = $("kyc-lightbox");
  const img = $("kyc-lightbox-img");
  if (!lb || !img) return;
  img.src = src;
  lb.classList.remove("hidden");
  lb.classList.add("flex");
}

// Show all affiliates for a deal
function showAllAffiliates(dealId) {
  const deal = allDeals.find(d => String(d.id) === String(dealId));
  if (!deal) return;
  const afps = deal.assigned_affiliates || [];
  const list = afps.map(a => `<span class="bg-brand-500/10 text-brand-400 text-[10px] px-2 py-1 rounded font-mono inline-block">${esc(a)}</span>`).join(" ");
  const content = `<div class="mb-4"><p class="text-xs text-gray-400 mb-3">${afps.length} affiliate(s) assigned to <strong class="text-white">${esc(deal.title || deal.broker || deal.brand)}</strong></p><div class="flex flex-wrap gap-2 max-h-[60vh] overflow-y-auto">${list}</div></div>`;
  $("confirm-title").textContent = "Assigned Affiliates";
  $("confirm-message").innerHTML = content;
  $("confirm-input-wrap").classList.add("hidden");
  $("confirm-ok-btn").textContent = "Close";
  $("confirm-ok-btn").className = "flex-1 py-2.5 rounded-lg text-[10px] font-bold text-white uppercase tracking-wider border border-white/10 hover:bg-white/5 transition";
  $("confirm-cancel-btn").classList.add("hidden");
  const iconEl = $("confirm-icon");
  if (iconEl) { iconEl.className = "w-10 h-10 rounded-xl flex items-center justify-center bg-red-500/10 border border-red-500/20"; iconEl.innerHTML = '<svg class="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>'; }
  openModal("confirm-modal");
  const onClose = () => { closeModal("confirm-modal"); $("confirm-cancel-btn").classList.remove("hidden"); $("confirm-ok-btn").removeEventListener("click", onClose); };
  $("confirm-ok-btn").addEventListener("click", onClose);
}

async function approveKyc(affiliateId) {
  const ok = await styledConfirm({ title: "Approve KYC", message: "This affiliate's identity will be verified and they will be able to request payouts.", okText: "Approve", type: "success" });
  if (!ok) return;
  try {
    await api(`/admin/kyc/${affiliateId}`, { method: "PATCH", body: JSON.stringify({ status: "approved" }) });
    toast("KYC approved", "success");
    loadKycSubmissions();
    loadPendingCounts();
  } catch (e) { toast(e.message || "Failed", "error"); }
}

async function rejectKyc(affiliateId) {
  const result = await styledConfirm({ title: "Reject KYC", message: "This identity verification will be rejected. The affiliate will need to re-submit.", okText: "Reject", type: "danger", input: true, inputLabel: "Reason (optional)", inputPlaceholder: "e.g. Document unreadable, expired ID..." });
  if (result === false) return;
  const note = typeof result === "string" ? result : null;
  try {
    await api(`/admin/kyc/${affiliateId}`, { method: "PATCH", body: JSON.stringify({ status: "rejected", admin_note: note || null }) });
    toast("KYC rejected", "success");
    loadKycSubmissions();
    loadPendingCounts();
  } catch (e) { toast(e.message || "Failed", "error"); }
}

// Load initial data — then update status
(async function initAdmin() {
  const dot = $("admin-status-dot");
  const txt = $("admin-status-text");
  const icon = $("admin-refresh-icon");
  function setConnected() { if(dot){dot.className="w-2 h-2 rounded-full bg-green-500 animate-pulse";} if(txt){txt.textContent="Connected";txt.className="text-[10px] font-mono text-green-400 uppercase tracking-wider";} }
  function setDisconnected() { if(dot){dot.className="w-2 h-2 rounded-full bg-red-500";} if(txt){txt.textContent="Offline";txt.className="text-[10px] font-mono text-red-400 uppercase tracking-wider";} }
  function setLoading() { if(dot){dot.className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse";} if(txt){txt.textContent="Loading...";txt.className="text-[10px] font-mono text-yellow-400 uppercase tracking-wider";} if(icon) icon.style.animation="spin 0.8s linear infinite"; }
  function stopLoading() { if(icon) icon.style.animation=""; }
  // Add spin keyframe if not present
  if (!document.getElementById("admin-spin-style")) { const s = document.createElement("style"); s.id="admin-spin-style"; s.textContent="@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}"; document.head.appendChild(s); }
  // Initial load
  try { setLoading(); await loadCurrencyRates(); await loadStats(); await loadAffiliates(); loadPendingCounts(); setConnected(); stopLoading(); } catch(e) { setDisconnected(); stopLoading(); }
  // Hash-based tab routing (e.g. /admin-settings#kyc, #affiliates, #payouts)
  const hash = window.location.hash.replace("#", "");
  if (hash) {
    const validTabs = ["affiliates", "deals", "conversions", "payouts", "kyc", "users", "audit", "notifications", "integrations", "analytics"];
    if (validTabs.includes(hash)) {
      switchTab(hash);
      // If navigating to affiliates from notification, auto-filter pending
      if (hash === "affiliates") {
        const filter = $("aff-status-filter");
        if (filter) { filter.value = "pending"; loadAffiliates(1); }
      }
    }
  }
  // Refresh button
  const refreshBtn = $("admin-refresh-btn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", async () => {
      try { setLoading(); await loadStats(); await loadActiveTab(); loadPendingCounts(); setConnected(); stopLoading(); toast("Data refreshed"); }
      catch(e) { setDisconnected(); stopLoading(); toast("Refresh failed", "err"); }
    });
  }
})();

// ══════════════════════════════════════════════════════════════
// NOTIFICATION SETTINGS
// ══════════════════════════════════════════════════════════════

let _notifSettingsLoaded = false;

async function loadNotificationSettings() {
  const loading = $("notif-loading");
  const content = $("notif-content");
  if (!loading || !content) return;

  try {
    loading.classList.remove("hidden");
    content.classList.add("hidden");

    const res = await api("/admin/notification-settings");
    const channels = res.data || [];

    const tg = channels.find(c => c.channel === "telegram") || { enabled: false, config: {}, events: [] };
    const email = channels.find(c => c.channel === "email") || { enabled: false, config: {}, events: [] };
    const discord = channels.find(c => c.channel === "discord") || { enabled: false, config: {}, events: [] };
    const slack = channels.find(c => c.channel === "slack") || { enabled: false, config: {}, events: [] };
    const whatsapp = channels.find(c => c.channel === "whatsapp") || { enabled: false, config: {}, events: [] };

    // Telegram
    $("tg-enabled").checked = tg.enabled;
    $("tg-bot-token").value = tg.config?.bot_token || "";
    $("tg-chat-regs").value = tg.config?.registrations_chat_id || "";
    $("tg-chat-deps").value = tg.config?.deposits_chat_id || "";
    $("tg-chat-general").value = tg.config?.general_chat_id || "";
    $("tg-evt-reg").checked = (tg.events || []).includes("registration");
    $("tg-evt-dep").checked = (tg.events || []).includes("deposit");
    // General group events
    const genEvts = tg.config?.general_events || [];
    $("tg-gen-evt-reg").checked = genEvts.includes("registration");
    $("tg-gen-evt-dep").checked = genEvts.includes("deposit");
    $("tg-gen-evt-signup").checked = genEvts.includes("affiliate_signup");
    $("tg-gen-evt-payout").checked = genEvts.includes("payout_request");
    $("tg-gen-evt-kyc").checked = genEvts.includes("kyc_submitted");
    $("tg-gen-evt-commission").checked = genEvts.includes("commission");

    // Email
    $("email-enabled").checked = email.enabled;
    $("notif-admin-email").value = email.config?.admin_email || "";
    $("email-evt-reg").checked = (email.events || []).includes("registration");
    $("email-evt-dep").checked = (email.events || []).includes("deposit");
    $("email-evt-signup").checked = (email.events || []).includes("affiliate_signup");
    $("email-evt-payout").checked = (email.events || []).includes("payout_request");
    $("email-evt-kyc").checked = (email.events || []).includes("kyc_submitted");
    $("email-evt-commission").checked = (email.events || []).includes("commission");

    // Discord
    $("discord-enabled").checked = discord.enabled;
    if ($("discord-webhook-url")) $("discord-webhook-url").value = discord.config?.webhook_url || "";
    $("discord-evt-reg").checked = (discord.events || []).includes("registration");
    $("discord-evt-dep").checked = (discord.events || []).includes("deposit");
    $("discord-evt-signup").checked = (discord.events || []).includes("affiliate_signup");
    $("discord-evt-payout").checked = (discord.events || []).includes("payout_request");
    $("discord-evt-commission").checked = (discord.events || []).includes("commission");

    // Slack
    $("slack-enabled").checked = slack.enabled;
    if ($("slack-webhook-url")) $("slack-webhook-url").value = slack.config?.webhook_url || "";
    $("slack-evt-reg").checked = (slack.events || []).includes("registration");
    $("slack-evt-dep").checked = (slack.events || []).includes("deposit");
    $("slack-evt-signup").checked = (slack.events || []).includes("affiliate_signup");
    $("slack-evt-payout").checked = (slack.events || []).includes("payout_request");
    $("slack-evt-commission").checked = (slack.events || []).includes("commission");

    // WhatsApp
    $("whatsapp-enabled").checked = whatsapp.enabled;
    if ($("whatsapp-api-url")) $("whatsapp-api-url").value = whatsapp.config?.api_url || "";
    if ($("whatsapp-api-key")) $("whatsapp-api-key").value = whatsapp.config?.api_key || "";
    if ($("whatsapp-phone")) $("whatsapp-phone").value = whatsapp.config?.phone || "";
    $("whatsapp-evt-reg").checked = (whatsapp.events || []).includes("registration");
    $("whatsapp-evt-dep").checked = (whatsapp.events || []).includes("deposit");
    $("whatsapp-evt-signup").checked = (whatsapp.events || []).includes("affiliate_signup");
    $("whatsapp-evt-payout").checked = (whatsapp.events || []).includes("payout_request");
    $("whatsapp-evt-commission").checked = (whatsapp.events || []).includes("commission");

    _notifSettingsLoaded = true;
    loading.classList.add("hidden");
    content.classList.remove("hidden");
  } catch (err) {
    loading.textContent = "Failed to load notification settings.";
    console.error("[NOTIF]", err);
  }
}

async function saveNotificationSettings() {
  const statusEl = $("notif-save-status");
  if (statusEl) { statusEl.textContent = "Saving..."; statusEl.className = "text-[10px] text-yellow-400"; }

  try {
    const tgEvents = [];
    if ($("tg-evt-reg").checked) tgEvents.push("registration");
    if ($("tg-evt-dep").checked) tgEvents.push("deposit");

    // General group events
    const generalEvents = [];
    if ($("tg-gen-evt-reg").checked) generalEvents.push("registration");
    if ($("tg-gen-evt-dep").checked) generalEvents.push("deposit");
    if ($("tg-gen-evt-signup").checked) generalEvents.push("affiliate_signup");
    if ($("tg-gen-evt-payout").checked) generalEvents.push("payout_request");
    if ($("tg-gen-evt-kyc").checked) generalEvents.push("kyc_submitted");
    if ($("tg-gen-evt-commission").checked) generalEvents.push("commission");

    const emailEvents = [];
    if ($("email-evt-reg").checked) emailEvents.push("registration");
    if ($("email-evt-dep").checked) emailEvents.push("deposit");
    if ($("email-evt-signup").checked) emailEvents.push("affiliate_signup");
    if ($("email-evt-payout").checked) emailEvents.push("payout_request");
    if ($("email-evt-kyc").checked) emailEvents.push("kyc_submitted");
    if ($("email-evt-commission").checked) emailEvents.push("commission");

    // Discord events
    const discordEvents = [];
    if ($("discord-evt-reg")?.checked) discordEvents.push("registration");
    if ($("discord-evt-dep")?.checked) discordEvents.push("deposit");
    if ($("discord-evt-signup")?.checked) discordEvents.push("affiliate_signup");
    if ($("discord-evt-payout")?.checked) discordEvents.push("payout_request");
    if ($("discord-evt-commission")?.checked) discordEvents.push("commission");

    // Slack events
    const slackEvents = [];
    if ($("slack-evt-reg")?.checked) slackEvents.push("registration");
    if ($("slack-evt-dep")?.checked) slackEvents.push("deposit");
    if ($("slack-evt-signup")?.checked) slackEvents.push("affiliate_signup");
    if ($("slack-evt-payout")?.checked) slackEvents.push("payout_request");
    if ($("slack-evt-commission")?.checked) slackEvents.push("commission");

    // WhatsApp events
    const whatsappEvents = [];
    if ($("whatsapp-evt-reg")?.checked) whatsappEvents.push("registration");
    if ($("whatsapp-evt-dep")?.checked) whatsappEvents.push("deposit");
    if ($("whatsapp-evt-signup")?.checked) whatsappEvents.push("affiliate_signup");
    if ($("whatsapp-evt-payout")?.checked) whatsappEvents.push("payout_request");
    if ($("whatsapp-evt-commission")?.checked) whatsappEvents.push("commission");

    const payload = {
      channels: [
        {
          channel: "telegram",
          enabled: $("tg-enabled").checked,
          config: {
            bot_token: $("tg-bot-token").value.trim(),
            registrations_chat_id: $("tg-chat-regs").value.trim(),
            deposits_chat_id: $("tg-chat-deps").value.trim(),
            general_chat_id: $("tg-chat-general").value.trim(),
            general_events: generalEvents
          },
          events: tgEvents
        },
        {
          channel: "email",
          enabled: $("email-enabled").checked,
          config: {
            admin_email: $("notif-admin-email").value.trim()
          },
          events: emailEvents
        },
        {
          channel: "discord",
          enabled: $("discord-enabled").checked,
          config: {
            webhook_url: $("discord-webhook-url")?.value.trim() || ""
          },
          events: discordEvents
        },
        {
          channel: "slack",
          enabled: $("slack-enabled").checked,
          config: {
            webhook_url: $("slack-webhook-url")?.value.trim() || ""
          },
          events: slackEvents
        },
        {
          channel: "whatsapp",
          enabled: $("whatsapp-enabled").checked,
          config: {
            api_url: $("whatsapp-api-url")?.value.trim() || "",
            api_key: $("whatsapp-api-key")?.value.trim() || "",
            phone: $("whatsapp-phone")?.value.trim() || ""
          },
          events: whatsappEvents
        }
      ]
    };

    await api("/admin/notification-settings", {
      method: "PUT",
      body: JSON.stringify(payload)
    });

    toast("Notification settings saved");
    if (statusEl) { statusEl.textContent = "Saved ✔"; statusEl.className = "text-[10px] text-green-400"; }
    setTimeout(() => { if (statusEl) statusEl.textContent = ""; }, 3000);
  } catch (err) {
    toast("Failed to save: " + err.message, "err");
    if (statusEl) { statusEl.textContent = "Error"; statusEl.className = "text-[10px] text-red-400"; }
  }
}

async function testTelegram(type) {
  const statusMap = { regs: "tg-regs-status", deps: "tg-deps-status", general: "tg-general-status" };
  const chatMap = { regs: "tg-chat-regs", deps: "tg-chat-deps", general: "tg-chat-general" };
  const statusEl = $(statusMap[type]);
  const chatId = $(chatMap[type])?.value.trim();
  const token = $("tg-bot-token").value.trim();

  if (!token) { toast("Enter a bot token first", "err"); return; }
  if (!chatId) { toast("Enter a chat ID first", "err"); return; }

  if (statusEl) { statusEl.textContent = "Sending..."; statusEl.className = "text-[9px] text-yellow-400"; }

  try {
    await api("/admin/notification-settings/test-telegram", {
      method: "POST",
      body: JSON.stringify({ bot_token: token, chat_id: chatId })
    });
    if (statusEl) { statusEl.textContent = "✔ Sent!"; statusEl.className = "text-[9px] text-green-400"; }
    setTimeout(() => { if (statusEl) statusEl.textContent = ""; }, 4000);
  } catch (err) {
    if (statusEl) { statusEl.textContent = "✘ Failed"; statusEl.className = "text-[9px] text-red-400"; }
  }
}

async function adminDiscoverTgGroups() {
  const token = $("tg-bot-token")?.value.trim();
  if (!token) { toast("Enter a bot token first", "err"); return; }
  const btn = $("tg-discover-btn");
  const list = $("tg-discover-list");
  if (btn) btn.innerHTML = '<svg class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg> Searching...';
  try {
    const res = await api("/admin/notification-settings/discover-groups", {
      method: "POST",
      body: JSON.stringify({ bot_token: token })
    });
    if (!res?.ok) throw new Error(res?.error || "Failed");
    const groups = res.groups || [];
    if (!groups.length) {
      if (list) { list.innerHTML = '<div class="px-3 py-3 text-xs text-gray-500 text-center">No groups found. Add the bot to a group and send a message first.</div>'; list.classList.remove("hidden"); }
    } else {
      if (list) {
        list.innerHTML = groups.map(g => `
          <div class="px-3 py-2.5 text-xs hover:bg-white/10 cursor-pointer transition flex items-center justify-between border-b border-white/5 last:border-0" onclick="pickTgGroup('${g.id}')">
            <span class="text-white font-medium">${g.title}</span>
            <span class="text-gray-500 font-mono text-[10px]">${g.id}</span>
          </div>
        `).join("");
        list.classList.remove("hidden");
      }
    }
  } catch (err) {
    if (list) { list.innerHTML = `<div class="px-3 py-3 text-xs text-red-400 text-center">${err.message || "Error discovering groups"}</div>`; list.classList.remove("hidden"); }
  }
  if (btn) btn.innerHTML = '<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg> Find Groups from Bot';
}

function pickTgGroup(chatId) {
  // Show a styled selection modal instead of browser prompt()
  const list = $("tg-discover-list");
  if (list) list.classList.add("hidden");

  // Build a custom 3-button selection modal via styledConfirm infrastructure
  const modal = $("confirm-modal");
  const iconWrap = $("confirm-icon");
  $("confirm-title").textContent = "Assign Telegram Group";
  $("confirm-message").textContent = "Choose which notification channel this group should receive:";
  $("confirm-ok-btn").textContent = "Cancel";
  // Telegram-style icon
  iconWrap.className = "w-10 h-10 rounded-xl flex items-center justify-center bg-blue-500/10 border border-blue-500/20";
  iconWrap.innerHTML = '<svg class="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.03-1.99 1.27-5.62 3.72-.53.36-1.01.54-1.44.53-.47-.01-1.38-.27-2.06-.49-.83-.27-1.49-.42-1.43-.88.03-.24.37-.49 1.02-.74 3.98-1.73 6.64-2.88 7.97-3.44 3.79-1.58 4.58-1.86 5.09-1.87.11 0 .37.03.54.17.14.12.18.28.2.45-.01.06.01.24 0 .38z"/></svg>';
  // Hide the default input wrap
  $("confirm-input-wrap").classList.add("hidden");
  // Replace the button area with 3 selection buttons
  const okBtn = $("confirm-ok-btn");
  const cancelBtn = $("confirm-cancel-btn");
  const btnContainer = okBtn.parentElement;
  // Inject selection buttons before the existing buttons
  const selId = "tg-assign-selection";
  let selDiv = document.getElementById(selId);
  if (selDiv) selDiv.remove();
  selDiv = document.createElement("div");
  selDiv.id = selId;
  selDiv.className = "flex flex-col gap-2 mb-3 w-full";
  selDiv.innerHTML = `
    <button data-tg-target="1" class="w-full py-2.5 rounded-lg text-[11px] font-bold text-white uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 transition flex items-center justify-center gap-2">
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg>
      Registrations
    </button>
    <button data-tg-target="2" class="w-full py-2.5 rounded-lg text-[11px] font-bold text-white uppercase tracking-wider bg-blue-600 hover:bg-blue-500 transition flex items-center justify-center gap-2">
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
      Deposits
    </button>
    <button data-tg-target="3" class="w-full py-2.5 rounded-lg text-[11px] font-bold text-white uppercase tracking-wider bg-purple-600 hover:bg-purple-500 transition flex items-center justify-center gap-2">
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
      General
    </button>`;
  btnContainer.parentElement.insertBefore(selDiv, btnContainer);
  // Style the cancel button, hide the ok button (we use the 3 buttons above)
  okBtn.classList.add("hidden");
  cancelBtn.className = "w-full py-2 rounded-lg text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-white/5 hover:bg-white/10 border border-white/10 transition";
  cancelBtn.textContent = "Cancel";

  openModal("confirm-modal");

  function cleanup() {
    closeModal("confirm-modal");
    if (selDiv) selDiv.remove();
    okBtn.classList.remove("hidden");
    cancelBtn.removeEventListener("click", onCancel);
  }
  function onCancel() { cleanup(); }
  cancelBtn.addEventListener("click", onCancel);

  selDiv.querySelectorAll("button[data-tg-target]").forEach(btn => {
    btn.addEventListener("click", () => {
      const t = btn.getAttribute("data-tg-target");
      if (t === "1") { $("tg-chat-regs").value = chatId; toast("✅ Set as Registrations group"); }
      else if (t === "2") { $("tg-chat-deps").value = chatId; toast("✅ Set as Deposits group"); }
      else if (t === "3") { $("tg-chat-general").value = chatId; toast("✅ Set as General group"); }
      cleanup();
    });
  });
}

async function testEmail() {
  const email = $("notif-admin-email").value.trim();
  const statusEl = $("email-test-status");
  if (!email) { toast("Enter an email address first", "err"); return; }

  if (statusEl) { statusEl.textContent = "Sending..."; statusEl.className = "text-[9px] text-yellow-400"; }

  try {
    await api("/admin/notification-settings/test-email", {
      method: "POST",
      body: JSON.stringify({ email })
    });
    if (statusEl) { statusEl.textContent = "✔ Sent!"; statusEl.className = "text-[9px] text-green-400"; }
    setTimeout(() => { if (statusEl) statusEl.textContent = ""; }, 4000);
  } catch (err) {
    if (statusEl) { statusEl.textContent = "✘ Failed"; statusEl.className = "text-[9px] text-red-400"; }
  }
}

function togglePasswordVisibility(inputId, btn) {
  const input = $(inputId);
  if (!input) return;
  const isPassword = input.type === "password";
  input.type = isPassword ? "text" : "password";
  const svg = btn.querySelector("svg");
  if (svg) {
    svg.innerHTML = isPassword
      ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l18 18"/>'
      : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>';
  }
}

// ══════════════════════════════════════════════════════
// INTEGRATIONS TAB
// ══════════════════════════════════════════════════════

let integConfig = null;
let outgoingWebhooks = [];
let whLogPage = 1;

async function loadIntegrations() {
  try {
    const res = await api("/admin/integration-config");
    integConfig = res.data || {};
    renderIncomingWebhooks();
    renderWebhookStatus();
    renderOutgoingWebhooks();
    renderBrokerConnections();
    loadWebhookLogs(1);
  } catch (err) {
    console.warn("[Integrations] Load failed:", err.message);
  }
}

function renderWebhookStatus() {
  const d = integConfig;
  const dot = $("integ-status-dot");
  const text = $("integ-status-text");
  const badge = $("integ-secret-badge");

  // Secret status
  if (d.webhook_secret_status === "configured") {
    if (badge) { badge.textContent = d.webhook_secret_masked || "****"; badge.className = "text-[9px] font-mono px-2 py-0.5 rounded-full bg-green-900/50 text-green-400 border border-green-500/20"; }
  } else {
    if (badge) { badge.textContent = "Not configured"; badge.className = "text-[9px] font-mono px-2 py-0.5 rounded-full bg-red-900/50 text-red-400 border border-red-500/20"; }
  }

  // Activity stats
  const act = d.activity || {};
  if ($("integ-24h-count")) $("integ-24h-count").textContent = act.total_24h || 0;
  if ($("integ-24h-ok")) $("integ-24h-ok").textContent = act.by_result?.ok || 0;
  const errCount = Object.entries(act.by_result || {}).filter(([k]) => k !== "ok").reduce((s, [, v]) => s + v, 0);
  if ($("integ-24h-err")) $("integ-24h-err").textContent = errCount;

  // Status dot & text
  if (act.total_24h > 0) {
    dot.className = "w-3 h-3 rounded-full bg-green-500 animate-pulse";
    text.textContent = `Active — ${act.total_24h} events in last 24h`;
  } else {
    dot.className = "w-3 h-3 rounded-full bg-yellow-500";
    text.textContent = "No webhook activity in last 24h";
  }
}

function renderIncomingWebhooks() {
  const urls = integConfig.incoming_webhooks || {};
  for (const [type, url] of Object.entries(urls)) {
    const el = $(`webhook-url-${type}`);
    if (el) el.textContent = url;
  }
}

window.copyWebhookUrl = function(type) {
  const el = $(`webhook-url-${type}`);
  if (!el) return;
  navigator.clipboard.writeText(el.textContent).then(() => {
    if (typeof showToast === "function") showToast("Webhook URL copied!", "success");
  });
};

function renderOutgoingWebhooks() {
  outgoingWebhooks = integConfig.outgoing_webhooks || [];
  const container = $("outgoing-webhooks-list");
  const actions = $("outgoing-webhooks-actions");
  if (!container) return;

  if (outgoingWebhooks.length === 0) {
    container.innerHTML = `
      <div class="text-center py-6">
        <svg class="w-8 h-8 text-gray-700 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
        <p class="text-xs text-gray-500">No outgoing webhooks configured</p>
        <p class="text-[10px] text-gray-600 mt-1">Add a webhook to send real-time events to external services</p>
      </div>`;
    if (actions) actions.classList.add("hidden");
    return;
  }

  if (actions) actions.classList.remove("hidden");
  container.innerHTML = outgoingWebhooks.map((wh, i) => `
    <div class="bg-white/[0.03] rounded-lg p-3 border border-white/5">
      <div class="flex items-center justify-between mb-2">
        <span class="text-[10px] font-bold text-white uppercase">${wh.name || 'Webhook ' + (i + 1)}</span>
        <div class="flex items-center gap-2">
          <button onclick="testOutgoingWebhook(${i})" class="text-[9px] text-blue-400 hover:text-blue-300 transition">Test</button>
          <button onclick="removeOutgoingWebhook(${i})" class="text-[9px] text-red-400 hover:text-red-300 transition">Remove</button>
        </div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label class="text-[9px] text-gray-500 uppercase block mb-0.5">Endpoint URL</label>
          <input type="text" value="${esc(wh.url || '')}" onchange="outgoingWebhooks[${i}].url=this.value" class="form-input text-[10px] px-2 py-1.5 rounded-lg w-full font-mono" placeholder="https://...">
        </div>
        <div>
          <label class="text-[9px] text-gray-500 uppercase block mb-0.5">Secret (optional)</label>
          <input type="text" value="${esc(wh.secret || '')}" onchange="outgoingWebhooks[${i}].secret=this.value" class="form-input text-[10px] px-2 py-1.5 rounded-lg w-full font-mono" placeholder="X-Webhook-Secret header">
        </div>
      </div>
      <div class="mt-2">
        <label class="text-[9px] text-gray-500 uppercase block mb-1">Events</label>
        <div class="flex flex-wrap gap-1.5">
          ${["registration", "ftd", "qualified_cpa", "commission", "payout"].map(evt => `
            <label class="flex items-center gap-1 text-[10px] text-gray-400 cursor-pointer">
              <input type="checkbox" ${(wh.events || []).includes(evt) ? "checked" : ""} onchange="toggleOutgoingEvent(${i}, '${evt}', this.checked)" class="rounded">
              ${evt}
            </label>
          `).join("")}
        </div>
      </div>
    </div>
  `).join("");
}

window.addOutgoingWebhook = function() {
  outgoingWebhooks.push({ name: "", url: "", secret: "", events: ["registration", "ftd", "commission"] });
  renderOutgoingWebhooks();
};

window.removeOutgoingWebhook = function(i) {
  outgoingWebhooks.splice(i, 1);
  renderOutgoingWebhooks();
};

window.toggleOutgoingEvent = function(i, evt, checked) {
  if (!outgoingWebhooks[i].events) outgoingWebhooks[i].events = [];
  if (checked && !outgoingWebhooks[i].events.includes(evt)) outgoingWebhooks[i].events.push(evt);
  if (!checked) outgoingWebhooks[i].events = outgoingWebhooks[i].events.filter(e => e !== evt);
};

window.saveOutgoingWebhooks = async function() {
  const status = $("outgoing-save-status");
  try {
    if (status) status.textContent = "Saving...";
    await api("/admin/outgoing-webhooks", { method: "PUT", body: JSON.stringify({ webhooks: outgoingWebhooks }) });
    if (status) status.textContent = "Saved!";
    if (typeof showToast === "function") showToast("Outgoing webhooks saved", "success");
    setTimeout(() => { if (status) status.textContent = ""; }, 3000);
  } catch (err) {
    if (status) status.textContent = "Error: " + err.message;
    if (typeof showToast === "function") showToast(err.message, "error");
  }
};

window.testOutgoingWebhook = async function(i) {
  const wh = outgoingWebhooks[i];
  if (!wh?.url) return showToast("No URL set", "error");
  try {
    showToast("Sending test...", "info");
    const res = await api("/admin/test-webhook", { method: "POST", body: JSON.stringify({ url: wh.url, secret: wh.secret }) });
    if (res.ok) {
      showToast(`Test sent! Status: ${res.status} ${res.statusText}`, "success");
    } else {
      showToast(`Test failed: ${res.error}`, "error");
    }
  } catch (err) {
    showToast("Test failed: " + err.message, "error");
  }
};

function renderBrokerConnections() {
  const grid = $("integ-broker-grid");
  if (!grid) return;
  const brokers = integConfig.brokers || [];
  const prefixes = integConfig.uid_prefixes || [];

  if (brokers.length === 0) {
    grid.innerHTML = `
      <div class="text-center py-6 col-span-full">
        <svg class="w-8 h-8 text-gray-700 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
        <p class="text-xs text-gray-500">No brokers configured</p>
        <p class="text-[10px] text-gray-600 mt-1">Add brokers in the Deals & Brokers tab</p>
      </div>`;
    return;
  }

  grid.innerHTML = brokers.map(b => {
    const bPrefixes = prefixes.filter(p => p.broker_name === b.name);
    const color = b.theme_color || "#ef4444";
    return `
      <div class="bg-white/[0.03] rounded-xl p-4 border border-white/5 hover:border-white/10 transition group">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm" style="background:${esc(color)}20; border: 1px solid ${esc(color)}40; color:${esc(color)}">
            ${b.logo_url ? `<img src="${esc(b.logo_url)}" class="w-6 h-6 rounded" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'" alt=""><span style="display:none" class="items-center justify-center">${esc((b.name||'?')[0])}</span>` : esc((b.name||'?')[0].toUpperCase())}
          </div>
          <div>
            <p class="text-sm font-bold text-white">${esc(b.name)}</p>
            <div class="flex items-center gap-1.5 mt-0.5">
              <span class="w-1.5 h-1.5 rounded-full bg-green-500"></span>
              <span class="text-[9px] text-green-400">Connected</span>
            </div>
          </div>
        </div>
        ${bPrefixes.length > 0 ? `
          <div class="mt-2">
            <p class="text-[9px] text-gray-500 uppercase mb-1">UID Prefixes</p>
            <div class="flex flex-wrap gap-1">${bPrefixes.map(p => `<span class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-gray-400 border border-white/5">${esc(p.prefix)}</span>`).join("")}</div>
          </div>` : `
          <div class="mt-2">
            <p class="text-[9px] text-amber-500 flex items-center gap-1">
              <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/></svg>
              No UID prefixes — configure in Deals & Brokers tab
            </p>
          </div>`}
        ${b.contact ? `<p class="text-[9px] text-gray-600 mt-2">Contact: ${esc(b.contact)}</p>` : ""}
      </div>`;
  }).join("");
}

// ── Webhook Activity Log ──
window.loadWebhookLogs = async function(page) {
  if (page < 1) return;
  whLogPage = page || 1;
  const tbody = $("wh-log-tbody");
  if (!tbody) return;
  try {
    const typeFilter = $("wh-log-type-filter")?.value || "";
    const days = $("wh-log-days-filter")?.value || "7";
    let url = `/admin/webhook-logs?days=${days}&page=${whLogPage}&limit=30`;
    if (typeFilter) url += `&event_type=${typeFilter}`;
    const res = await api(url);
    const logs = res.data || [];
    const total = res.total || 0;

    if ($("wh-log-count")) $("wh-log-count").textContent = `${total} events`;
    if ($("wh-log-prev")) $("wh-log-prev").disabled = whLogPage <= 1;
    if ($("wh-log-next")) $("wh-log-next").disabled = whLogPage * 30 >= total;

    if (logs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="px-4 py-8 text-center text-gray-600">No webhook events found</td></tr>';
      return;
    }

    const typeColors = { registration: "text-blue-400", ftd: "text-green-400", qualified_cpa: "text-cyan-400", commission: "text-yellow-400" };
    tbody.innerHTML = logs.map(l => {
      const p = l.payload || {};
      const time = new Date(l.received_at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" });
      const resultClass = (l.result === "ok" || l.result === "duplicate") ? "text-green-400" : "text-red-400";
      const resultBg = (l.result === "ok" || l.result === "duplicate") ? "bg-green-900/20" : "bg-red-900/20";
      return `<tr class="border-t border-white/5 hover:bg-white/[0.02]">
        <td class="px-4 py-2 text-[10px] text-gray-400 font-mono whitespace-nowrap">${time}</td>
        <td class="px-4 py-2"><span class="text-[10px] font-bold uppercase ${typeColors[l.event_type] || 'text-gray-400'}">${l.event_type}</span></td>
        <td class="px-4 py-2 text-[10px] font-mono text-white">${esc(p.userid || p.user_id || '—')}</td>
        <td class="px-4 py-2 text-[10px] font-mono text-gray-400">${esc(p.afp || '—')}</td>
        <td class="px-4 py-2"><span class="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${resultBg} ${resultClass}">${l.result || 'ok'}</span></td>
        <td class="px-4 py-2 text-[10px] text-gray-500 max-w-[200px] truncate">${p.transaction_sum ? '$' + p.transaction_sum : ''} ${p.commissionamount ? 'comm: $' + p.commissionamount : ''} ${p.isocountry || ''}</td>
      </tr>`;
    }).join("");
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="px-4 py-8 text-center text-red-400">${err.message}</td></tr>`;
  }
};

// ══════════════════════════════════════════════════════
// ANALYTICS TAB — Cohort Analysis & Revenue Forecasting
// ══════════════════════════════════════════════════════

let forecastChart = null;

async function loadAnalytics() {
  await loadCohort();
}

function switchAnalyticsSub(name) {
  document.querySelectorAll(".analytics-sub").forEach(b => {
    const isActive = b.dataset.sub === name;
    b.classList.toggle("active", isActive);
    b.classList.toggle("text-white", isActive);
    b.classList.toggle("text-gray-400", !isActive);
  });
  if ($("analytics-cohort")) $("analytics-cohort").classList.toggle("hidden", name !== "cohort");
  if ($("analytics-forecast")) $("analytics-forecast").classList.toggle("hidden", name !== "forecast");
  if (name === "cohort") loadCohort();
  else loadForecast();
}

async function loadCohort() {
  const months = $("cohort-months")?.value || 6;
  const tbody = $("cohort-tbody");
  const thead = $("cohort-thead");
  if (!tbody || !thead) return;
  tbody.innerHTML = '<tr><td colspan="20" class="px-4 py-8 text-center text-gray-600">Loading cohort data...</td></tr>';

  try {
    const res = await api(`/admin/cohort?months=${months}`);
    const cohorts = res.data || [];

    if (cohorts.length === 0) {
      tbody.innerHTML = '<tr><td colspan="20" class="px-4 py-8 text-center text-gray-600">No cohort data yet — need user registrations with FTDs.</td></tr>';
      thead.innerHTML = '';
      return;
    }

    // Build header
    const maxM = Math.max(...cohorts.map(c => c.retention.length));
    let hdr = '<tr><th class="px-3 py-2 text-left text-[9px] font-bold text-gray-500 uppercase">Cohort</th>';
    hdr += '<th class="px-3 py-2 text-center text-[9px] font-bold text-gray-500 uppercase">Users</th>';
    for (let i = 0; i < maxM; i++) {
      hdr += `<th class="px-3 py-2 text-center text-[9px] font-bold text-gray-500 uppercase">M${i}</th>`;
    }
    hdr += '</tr>';
    thead.innerHTML = hdr;

    // Build rows
    tbody.innerHTML = cohorts.map(c => {
      let row = `<td class="px-3 py-2 text-[10px] font-bold text-white whitespace-nowrap">${c.month}</td>`;
      row += `<td class="px-3 py-2 text-center text-[10px] font-mono text-gray-400">${c.registered}</td>`;
      c.retention.forEach(r => {
        const pct = r.rate;
        let bg = "bg-red-500/20 text-red-400";
        if (pct >= 30) bg = "bg-green-500/20 text-green-400";
        else if (pct >= 10) bg = "bg-yellow-500/20 text-yellow-400";
        row += `<td class="px-3 py-2 text-center"><span class="text-[9px] font-bold px-2 py-0.5 rounded ${bg}">${pct.toFixed(0)}%</span></td>`;
      });
      // Fill empty cells
      for (let i = c.retention.length; i < maxM; i++) {
        row += '<td class="px-3 py-2 text-center text-[10px] text-gray-700">—</td>';
      }
      return `<tr class="border-t border-white/5 hover:bg-white/[0.02]">${row}</tr>`;
    }).join("");
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="20" class="px-4 py-8 text-center text-red-400">${err.message}</td></tr>`;
  }
}

async function loadForecast() {
  const days = $("fc-days")?.value || 30;
  // Show loading
  ["fc-proj-revenue", "fc-proj-cost", "fc-proj-profit", "fc-confidence"].forEach(id => { if ($(id)) $(id).textContent = "..."; });

  try {
    const res = await api(`/admin/forecast?days=${days}`);
    const d = res.data || {};
    const proj = d.projections || {};
    const rev = d.revenue || {};
    const comm = d.commission || {};
    const reg = d.registrations || {};
    const ftd = d.ftd || {};

    // Projection cards (monthly projections from current pace)
    if ($("fc-proj-revenue")) $("fc-proj-revenue").textContent = fmtMoney(proj.month_revenue || 0);
    if ($("fc-proj-cost")) $("fc-proj-cost").textContent = fmtMoney(proj.month_commission || 0);
    if ($("fc-proj-profit")) {
      const profit = proj.month_profit || 0;
      $("fc-proj-profit").textContent = fmtMoney(profit);
      $("fc-proj-profit").className = $("fc-proj-profit").className.replace(/text-(red|green|emerald|white)-\d+/g, '');
      $("fc-proj-profit").classList.add(profit >= 0 ? "text-emerald-400" : "text-red-400");
    }
    if ($("fc-confidence")) {
      const conf = rev.confidence || 0;
      $("fc-confidence").textContent = conf.toFixed(0) + "%";
      $("fc-confidence").className = $("fc-confidence").className.replace(/text-(red|green|emerald|yellow|white)-\d+/g, '');
      $("fc-confidence").classList.add(conf >= 70 ? "text-emerald-400" : conf >= 40 ? "text-yellow-400" : "text-red-400");
    }

    // Trend metrics
    if ($("fc-rev-trend")) $("fc-rev-trend").textContent = rev.trend ? fmtMoney(rev.trend) + "/day" : "—";
    if ($("fc-rev-avg")) $("fc-rev-avg").textContent = rev.avg ? fmtMoney(rev.avg) + "/day" : "—";
    if ($("fc-reg-trend")) $("fc-reg-trend").textContent = reg.trend ? reg.trend.toFixed(2) + "/day" : "—";
    if ($("fc-ftd-trend")) $("fc-ftd-trend").textContent = ftd.trend ? ftd.trend.toFixed(2) + "/day" : "—";

    // Build Highcharts — historical + forecast
    const historical = d.historical || [];
    // Build forecast line data from revenue forecast
    const revForecastLine = rev.forecast || [];
    const commForecastLine = comm.forecast || [];

    renderForecastChart(historical, revForecastLine, commForecastLine, days);
  } catch (err) {
    if ($("fc-proj-revenue")) $("fc-proj-revenue").textContent = "Error";
    console.error("Forecast error:", err);
  }
}

function renderForecastChart(historical, revForecast, commForecast, days) {
  const el = $("forecast-chart");
  if (!el || typeof Highcharts === "undefined") return;

  const historicalRevenue = historical.map(d => [new Date(d.date).getTime(), parseFloat(d.revenue) || 0]);
  const historicalCost = historical.map(d => [new Date(d.date).getTime(), parseFloat(d.commission) || 0]);

  // Connect forecast to last historical point
  const lastHistDate = historical.length ? new Date(historical[historical.length - 1].date).getTime() : Date.now();
  const lastHistRev = historicalRevenue.length ? historicalRevenue[historicalRevenue.length - 1][1] : 0;
  const lastHistCost = historicalCost.length ? historicalCost[historicalCost.length - 1][1] : 0;

  const forecastRevData = [[lastHistDate, lastHistRev], ...revForecast.map(d => [new Date(d.date).getTime(), d.value || 0])];
  const forecastCostData = [[lastHistDate, lastHistCost], ...commForecast.map(d => [new Date(d.date).getTime(), d.value || 0])];

  if (forecastChart) forecastChart.destroy();

  forecastChart = Highcharts.chart(el, {
    chart: { type: "areaspline", backgroundColor: "transparent", height: 350, style: { fontFamily: "Inter, sans-serif" } },
    title: { text: null },
    credits: { enabled: false },
    xAxis: {
      type: "datetime",
      gridLineColor: "rgba(255,255,255,0.03)",
      labels: { style: { color: "#6b7280", fontSize: "9px" } },
      plotLines: historicalRevenue.length ? [{
        value: historicalRevenue[historicalRevenue.length - 1][0],
        color: "rgba(255,255,255,0.15)", width: 1, dashStyle: "Dash",
        label: { text: "Today", style: { color: "#9ca3af", fontSize: "9px" }, rotation: 0, align: "left", x: 4, y: -5 }
      }] : []
    },
    yAxis: {
      title: { text: null },
      gridLineColor: "rgba(255,255,255,0.03)",
      labels: { style: { color: "#6b7280", fontSize: "9px" }, formatter() { return "$" + Highcharts.numberFormat(this.value, 0, ".", ","); } }
    },
    tooltip: {
      shared: true, backgroundColor: "#1a1a2e", borderColor: "rgba(255,255,255,0.1)",
      style: { color: "#e5e7eb", fontSize: "10px" },
      pointFormatter() { return `<span style="color:${this.color}">●</span> ${this.series.name}: <b>$${Highcharts.numberFormat(this.y, 0, ".", ",")}</b><br/>`; }
    },
    legend: { itemStyle: { color: "#9ca3af", fontSize: "9px" }, itemHoverStyle: { color: "#fff" } },
    plotOptions: { areaspline: { marker: { enabled: false }, lineWidth: 2 } },
    series: [
      {
        name: "Revenue (Actual)", data: historicalRevenue,
        color: "#8b5cf6", fillColor: { linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 }, stops: [[0, "rgba(139,92,246,0.2)"], [1, "rgba(139,92,246,0)"]] }
      },
      {
        name: "Revenue (Forecast)", data: forecastRevData,
        color: "#8b5cf6", dashStyle: "Dash", fillColor: { linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 }, stops: [[0, "rgba(139,92,246,0.08)"], [1, "rgba(139,92,246,0)"]] }
      },
      {
        name: "Cost (Actual)", data: historicalCost,
        color: "#f59e0b", fillColor: { linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 }, stops: [[0, "rgba(245,158,11,0.1)"], [1, "rgba(245,158,11,0)"]] }
      },
      {
        name: "Cost (Forecast)", data: forecastCostData,
        color: "#f59e0b", dashStyle: "Dash", fillColor: { linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 }, stops: [[0, "rgba(245,158,11,0.04)"], [1, "rgba(245,158,11,0)"]] }
      }
    ]
  });
}

// ══════════════════════════════════════════════════════
// SETUP TUTORIAL MODALS
// ══════════════════════════════════════════════════════

const TUTORIALS = {
  telegram: {
    title: "Telegram Setup",
    subtitle: "Configure Telegram bot notifications for admin & affiliates",
    icon: `<svg class="w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.07-.2c-.08-.06-.19-.04-.27-.02-.12.03-1.99 1.27-5.62 3.72-.53.36-1.01.54-1.44.53-.47-.01-1.38-.27-2.06-.49-.83-.27-1.49-.42-1.43-.88.03-.24.37-.49 1.02-.74 3.98-1.73 6.64-2.88 7.97-3.44 3.79-1.58 4.58-1.86 5.09-1.87.11 0 .37.03.54.17.14.12.18.28.2.45-.01.06.01.24 0 .38z"/></svg>`,
    color: "blue",
    body: `
      <div class="space-y-5">
        <div class="bg-blue-500/5 border border-blue-500/10 rounded-xl p-4">
          <p class="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1">Overview</p>
          <p class="text-xs text-gray-400">Telegram bots send instant notifications to your group or private chat when events happen (new registrations, FTDs, deposits).</p>
        </div>

        <div>
          <p class="text-[11px] font-bold text-white mb-3">Step 1 — Create a Telegram Bot</p>
          <ol class="list-decimal list-inside space-y-2 text-[11px] text-gray-400">
            <li>Open Telegram and search for <span class="font-mono text-blue-400">@BotFather</span></li>
            <li>Send the command <code class="bg-white/5 px-1.5 py-0.5 rounded text-[10px] font-mono text-white">/newbot</code></li>
            <li>Choose a name (e.g. <span class="text-white">TFXS Notifications</span>)</li>
            <li>Choose a username ending in <code class="bg-white/5 px-1.5 py-0.5 rounded text-[10px] font-mono text-white">bot</code> (e.g. <span class="font-mono text-white">tfxs_notif_bot</span>)</li>
            <li>BotFather will give you an <span class="text-yellow-400 font-bold">API Token</span> — copy it</li>
          </ol>
        </div>

        <div>
          <p class="text-[11px] font-bold text-white mb-3">Step 2 — Get Your Chat ID</p>
          <ol class="list-decimal list-inside space-y-2 text-[11px] text-gray-400">
            <li>Create a Telegram Group (or use an existing one)</li>
            <li>Add your newly created bot to the group</li>
            <li>Send any message in the group</li>
            <li>Visit: <code class="bg-white/5 px-1.5 py-0.5 rounded text-[10px] font-mono text-white break-all">https://api.telegram.org/bot&lt;YOUR_TOKEN&gt;/getUpdates</code></li>
            <li>Look for <code class="bg-white/5 px-1.5 py-0.5 rounded text-[10px] font-mono text-white">"chat":{"id": -123456789}</code> — that negative number is your <span class="text-yellow-400 font-bold">Chat ID</span></li>
          </ol>
        </div>

        <div>
          <p class="text-[11px] font-bold text-white mb-3">Step 3 — Configure in TFXS</p>
          <ol class="list-decimal list-inside space-y-2 text-[11px] text-gray-400">
            <li>Paste the <span class="text-yellow-400">Bot Token</span> in the "Bot Token" field below</li>
            <li>Paste the <span class="text-yellow-400">Chat IDs</span> into the respective fields (Registrations, Deposits, General)</li>
            <li>You can use different groups for each event type, or one group for all</li>
            <li>Click <span class="text-white font-bold">Test</span> to send a test message</li>
            <li>Click <span class="text-white font-bold">Save</span> to apply</li>
          </ol>
        </div>

        <div class="bg-yellow-500/5 border border-yellow-500/10 rounded-xl p-4">
          <p class="text-[10px] font-bold text-yellow-400 uppercase tracking-wider mb-1">💡 Pro Tip</p>
          <p class="text-[11px] text-gray-400">You can set up separate groups for <span class="text-white">Registrations</span>, <span class="text-white">FTDs/Deposits</span>, and <span class="text-white">General Alerts</span> to keep your notifications organized. Use the same bot token but different chat IDs.</p>
        </div>
      </div>`
  },

  discord: {
    title: "Discord Setup",
    subtitle: "Send notifications to a Discord channel via webhooks",
    icon: `<svg class="w-5 h-5 text-indigo-400" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>`,
    color: "indigo",
    body: `
      <div class="space-y-5">
        <div class="bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-4">
          <p class="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">Overview</p>
          <p class="text-xs text-gray-400">Discord Webhooks let you send automated messages to any channel. No bot setup required — just create a webhook URL and paste it in.</p>
        </div>

        <div>
          <p class="text-[11px] font-bold text-white mb-3">Step 1 — Create a Webhook in Discord</p>
          <ol class="list-decimal list-inside space-y-2 text-[11px] text-gray-400">
            <li>Open your Discord server</li>
            <li>Right-click the channel where you want notifications → <span class="text-white">Edit Channel</span></li>
            <li>Go to <span class="text-white">Integrations</span> → <span class="text-white">Webhooks</span></li>
            <li>Click <span class="text-white font-bold">New Webhook</span></li>
            <li>Give it a name (e.g. <span class="text-white">TFXS Alerts</span>)</li>
            <li>Click <span class="text-indigo-400 font-bold">Copy Webhook URL</span></li>
          </ol>
        </div>

        <div>
          <p class="text-[11px] font-bold text-white mb-3">Step 2 — Add to TFXS</p>
          <ol class="list-decimal list-inside space-y-2 text-[11px] text-gray-400">
            <li>Go to <span class="text-white">Integrations → Outgoing Webhooks</span></li>
            <li>Click <span class="text-white font-bold">+ Add Webhook</span></li>
            <li>Set the URL to your Discord webhook URL</li>
            <li>Choose which events to forward (registrations, FTDs, etc.)</li>
            <li>Save — notifications will appear in your Discord channel</li>
          </ol>
        </div>

        <div class="bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-4">
          <p class="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">📝 Webhook URL Format</p>
          <code class="text-[10px] font-mono text-indigo-300 break-all">https://discord.com/api/webhooks/1234567890/abcdefg...</code>
        </div>

        <div class="bg-yellow-500/5 border border-yellow-500/10 rounded-xl p-4">
          <p class="text-[10px] font-bold text-yellow-400 uppercase tracking-wider mb-1">💡 Pro Tip</p>
          <p class="text-[11px] text-gray-400">Create separate channels (#registrations, #ftds, #alerts) and use different webhooks for each to keep things organized.</p>
        </div>
      </div>`
  },

  slack: {
    title: "Slack Setup",
    subtitle: "Send notifications to a Slack channel via incoming webhooks",
    icon: `<svg class="w-5 h-5 text-green-400" viewBox="0 0 24 24" fill="currentColor"><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/></svg>`,
    color: "green",
    body: `
      <div class="space-y-5">
        <div class="bg-green-500/5 border border-green-500/10 rounded-xl p-4">
          <p class="text-[10px] font-bold text-green-400 uppercase tracking-wider mb-1">Overview</p>
          <p class="text-xs text-gray-400">Slack Incoming Webhooks let you post messages to any Slack channel. Create a webhook in your Slack workspace and TFXS will send notifications there.</p>
        </div>

        <div>
          <p class="text-[11px] font-bold text-white mb-3">Step 1 — Create a Slack App</p>
          <ol class="list-decimal list-inside space-y-2 text-[11px] text-gray-400">
            <li>Go to <span class="font-mono text-green-400">api.slack.com/apps</span> and click <span class="text-white font-bold">Create New App</span></li>
            <li>Select <span class="text-white">From scratch</span></li>
            <li>Name it (e.g. <span class="text-white">TFXS Notifications</span>) and choose your workspace</li>
            <li>Click <span class="text-white font-bold">Create App</span></li>
          </ol>
        </div>

        <div>
          <p class="text-[11px] font-bold text-white mb-3">Step 2 — Enable Incoming Webhooks</p>
          <ol class="list-decimal list-inside space-y-2 text-[11px] text-gray-400">
            <li>In your app settings, go to <span class="text-white">Incoming Webhooks</span></li>
            <li>Toggle <span class="text-white font-bold">Activate Incoming Webhooks</span> to ON</li>
            <li>Click <span class="text-white font-bold">Add New Webhook to Workspace</span></li>
            <li>Select the channel for notifications</li>
            <li>Click <span class="text-white font-bold">Allow</span></li>
            <li>Copy the <span class="text-green-400 font-bold">Webhook URL</span></li>
          </ol>
        </div>

        <div>
          <p class="text-[11px] font-bold text-white mb-3">Step 3 — Add to TFXS</p>
          <ol class="list-decimal list-inside space-y-2 text-[11px] text-gray-400">
            <li>Go to <span class="text-white">Integrations → Outgoing Webhooks</span></li>
            <li>Click <span class="text-white font-bold">+ Add Webhook</span></li>
            <li>Paste the Slack webhook URL</li>
            <li>Select which events to send</li>
            <li>Save — done!</li>
          </ol>
        </div>

        <div class="bg-green-500/5 border border-green-500/10 rounded-xl p-4">
          <p class="text-[10px] font-bold text-green-400 uppercase tracking-wider mb-1">📝 Webhook URL Format</p>
          <code class="text-[10px] font-mono text-green-300 break-all">https://hooks.slack.com/services/T.../B.../...</code>
        </div>
      </div>`
  },

  whatsapp: {
    title: "WhatsApp Setup",
    subtitle: "Send notifications via the WhatsApp Business API",
    icon: `<svg class="w-5 h-5 text-emerald-400" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`,
    color: "emerald",
    body: `
      <div class="space-y-5">
        <div class="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4">
          <p class="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1">Overview</p>
          <p class="text-xs text-gray-400">WhatsApp Business API lets you send automated messages. You can use a provider like <span class="text-white font-bold">Twilio</span>, <span class="text-white font-bold">MessageBird</span>, or <span class="text-white font-bold">Meta's Cloud API</span> directly.</p>
        </div>

        <div>
          <p class="text-[11px] font-bold text-white mb-3">Option A — Using Twilio (Easiest)</p>
          <ol class="list-decimal list-inside space-y-2 text-[11px] text-gray-400">
            <li>Sign up at <span class="font-mono text-emerald-400">twilio.com</span></li>
            <li>In console, go to <span class="text-white">Messaging → Try it out → Send a WhatsApp message</span></li>
            <li>Follow the sandbox setup (send a code to the Twilio WhatsApp number)</li>
            <li>Note your <span class="text-yellow-400 font-bold">Account SID</span>, <span class="text-yellow-400 font-bold">Auth Token</span>, and <span class="text-yellow-400 font-bold">From number</span></li>
            <li>Use the outgoing webhook in TFXS to forward events to a middleware (e.g. Zapier or a small function) that calls the Twilio API</li>
          </ol>
        </div>

        <div>
          <p class="text-[11px] font-bold text-white mb-3">Option B — Using Meta Cloud API (Free tier)</p>
          <ol class="list-decimal list-inside space-y-2 text-[11px] text-gray-400">
            <li>Go to <span class="font-mono text-emerald-400">developers.facebook.com</span> → Create App → Business type</li>
            <li>Add <span class="text-white">WhatsApp</span> product to your app</li>
            <li>In WhatsApp → Getting Started, you'll get a <span class="text-yellow-400 font-bold">temporary access token</span></li>
            <li>Note the <span class="text-yellow-400">Phone Number ID</span> and <span class="text-yellow-400">Token</span></li>
            <li>Set up a middleware (Zapier/n8n/custom function) to receive TFXS webhooks and forward to the WhatsApp API</li>
          </ol>
        </div>

        <div>
          <p class="text-[11px] font-bold text-white mb-3">Step 3 — Connect to TFXS</p>
          <ol class="list-decimal list-inside space-y-2 text-[11px] text-gray-400">
            <li>Go to <span class="text-white">Integrations → Outgoing Webhooks</span></li>
            <li>Create a webhook pointing to your middleware URL</li>
            <li>The middleware receives events and sends WhatsApp messages via the API</li>
          </ol>
        </div>

        <div class="bg-yellow-500/5 border border-yellow-500/10 rounded-xl p-4">
          <p class="text-[10px] font-bold text-yellow-400 uppercase tracking-wider mb-1">💡 Quick Alternative — Zapier</p>
          <p class="text-[11px] text-gray-400">Use <span class="text-white font-bold">Zapier</span> or <span class="text-white font-bold">Make.com</span> as a middleware: Trigger = Webhook (paste URL in TFXS outgoing webhooks), Action = Send WhatsApp via Twilio/Meta. No code required!</p>
        </div>
      </div>`
  },

  email: {
    title: "Email Setup",
    subtitle: "Email notifications are built-in and ready to use",
    icon: `<svg class="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>`,
    color: "amber",
    body: `
      <div class="space-y-5">
        <div class="bg-amber-500/5 border border-amber-500/10 rounded-xl p-4">
          <p class="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1">Overview</p>
          <p class="text-xs text-gray-400">Email notifications are already built into TFXS. No external setup required — just configure which events trigger emails and who receives them.</p>
        </div>

        <div>
          <p class="text-[11px] font-bold text-white mb-3">How It Works</p>
          <ol class="list-decimal list-inside space-y-2 text-[11px] text-gray-400">
            <li>Go to the <span class="text-white">Notifications</span> tab (you're here!)</li>
            <li>Scroll to the <span class="text-white">Email Notifications</span> section</li>
            <li>Enter the admin email address for alerts</li>
            <li>Toggle which events trigger emails:
              <ul class="list-disc list-inside ml-4 mt-1 space-y-1">
                <li>New registrations</li>
                <li>First time deposits</li>
                <li>Payout requests</li>
                <li>KYC submissions</li>
              </ul>
            </li>
            <li>Click <span class="text-white font-bold">Save</span></li>
          </ol>
        </div>

        <div class="bg-green-500/5 border border-green-500/10 rounded-xl p-4">
          <p class="text-[10px] font-bold text-green-400 uppercase tracking-wider mb-1">✅ No Extra Setup</p>
          <p class="text-[11px] text-gray-400">Emails are sent automatically through the TFXS backend mail service. Just make sure your email address is correct and check your spam folder for the first message.</p>
        </div>
      </div>`
  }
};

function openTutorial(platform) {
  const t = TUTORIALS[platform];
  if (!t) return;
  const modal = $("tutorial-modal");
  if (!modal) return;

  $("tut-title").textContent = t.title;
  $("tut-subtitle").textContent = t.subtitle;
  $("tut-icon").innerHTML = t.icon;
  $("tut-icon").className = `w-10 h-10 rounded-xl flex items-center justify-center bg-${t.color}-500/10 border border-${t.color}-500/20`;
  $("tut-body").innerHTML = t.body;

  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function closeTutorial() {
  const modal = $("tutorial-modal");
  if (!modal) return;
  modal.classList.add("hidden");
  modal.classList.remove("flex");
}
