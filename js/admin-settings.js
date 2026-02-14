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

function fmtMoney(n) {
  return "$" + Number(n || 0).toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
  else if (active === "conversions") await loadConversions();
  else if (active === "payouts") await loadPayouts();
  else if (active === "kyc") await loadKycSubmissions();
  else if (active === "users") await loadUsers();
  else if (active === "audit") await loadAudit();
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
    $("stat-affiliates").textContent = s.total_affiliates ?? "—";
    $("stat-regs").textContent = s.registrations ?? "—";
    $("stat-ftds").textContent = s.ftds ?? "—";
    if ($("stat-qftds")) $("stat-qftds").textContent = s.qftds ?? "—";
    $("stat-pending").textContent = s.pending_conversions ?? "—";
    $("stat-commission").textContent = fmtMoney(s.total_commission);
    if ($("stat-deposits")) $("stat-deposits").textContent = fmtMoney(s.total_deposit);
    $("stat-unpaid").textContent = fmtMoney(s.unpaid_commission);
    $("stat-paid").textContent = fmtMoney(s.paid_payouts);
    $("stat-admins").textContent = s.admin_users ?? "—";

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

async function loadConversions(page) {
  page = page || 1;
  convCurrentPage = page;
  const params = new URLSearchParams();
  const afp = $("conv-filter-afp-value")?.value || $("conv-filter-afp-input")?.value.trim() || "";
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
      <td class="px-3 py-2.5 font-mono text-brand-500 text-[10px] font-bold">${esc(r.affiliate_code)}</td>
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
    $("conv-broker").value = (data.admin_note || "").replace(/^broker:/, "") || "";
    // Set date
    if (data.occurred_at && $("conv-date")) {
      const d = new Date(data.occurred_at);
      $("conv-date").value = d.toISOString().slice(0, 16);
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
    if ($("conv-broker")) $("conv-broker").value = "";
    // Default date to now
    if ($("conv-date")) $("conv-date").value = new Date().toISOString().slice(0, 16);
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
  // Add custom date
  if ($("conv-date") && $("conv-date").value) {
    body.occurred_at = new Date($("conv-date").value).toISOString();
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
  try { setLoading(); await loadStats(); await loadAffiliates(); loadPendingCounts(); setConnected(); stopLoading(); } catch(e) { setDisconnected(); stopLoading(); }
  // Hash-based tab routing (e.g. /admin-settings#kyc, #affiliates, #payouts)
  const hash = window.location.hash.replace("#", "");
  if (hash) {
    const validTabs = ["affiliates", "deals", "conversions", "payouts", "kyc", "users", "audit"];
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

