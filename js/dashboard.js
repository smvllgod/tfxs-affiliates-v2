/**
 * TFXS AFFILIATES — Dashboard Live Data Connector
 * Loads live data from the backend and injects it into the existing dashboard DOM.
 * Falls back gracefully to static mock data (app.js) if the API is unreachable.
 *
 * This script runs ALONGSIDE the existing inline dashboard JS.
 * It overrides window.db with live data so all existing charts/tables keep working.
 */

(function () {
  "use strict";

  // Use shared country resolver from api.js
  const { getAffiliateId, apiGet, fetchSummary, fetchEvents, fetchReports, fetchRoiSettings, fetchBrokers, showError, hideError, resolveCountry, escapeHtml } = window.TFXS_API;

  const IS_ADMIN = localStorage.getItem("is_admin") === "true";
  let affiliateId = null;
  let refreshTimer = null;
  let isLive = false;
  let retryCount = 0;
  const MAX_RETRIES = 2;
  let _roiFormula = "deposit_div_commission"; // default, updated on load

  // ── Boot ────────────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", () => {
    affiliateId = getAffiliateId();

    // Admin: swap payout btn, add global badge, add affiliate column
    if (IS_ADMIN) applyAdminUI();

    // Add a small "LIVE" indicator next to the server time
    addLiveBadge();

    // Populate broker filter dropdown (non-blocking)
    populateBrokerFilter();

    // First load — retry automatically on failure (Render cold start)
    attemptConnection();
  });

  // ── Broker filter dropdown ──────────────────────────────
  async function populateBrokerFilter() {
    const select = document.getElementById('broker-filter');
    if (!select) return;
    try {
      const res = await fetchBrokers();
      if (res?.ok && res.data?.length) {
        res.data.forEach(b => {
          const opt = document.createElement('option');
          opt.value = b.name;
          opt.textContent = b.name;
          select.appendChild(opt);
        });
      }
    } catch (e) {
      console.warn('[TFXS] Could not load brokers for filter:', e.message);
    }
    // Re-load dashboard when broker filter changes
    select.addEventListener('change', () => {
      if (typeof loadLiveData === 'function') loadLiveData().catch(() => {});
      // Also trigger the Update button logic if updateDashboardData exists
      if (typeof window.updateDashboardData === 'function') window.updateDashboardData();
    });
  }

  // ── Admin-specific UI tweaks ────────────────────────────
  function applyAdminUI() {
    // 1. Replace "Request Payout" with "Manage Payouts"
    const payoutBtn = document.getElementById("request-payout-btn");
    if (payoutBtn) {
      payoutBtn.removeAttribute("onclick");
      payoutBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>
        MANAGE PAYOUTS`;
      payoutBtn.addEventListener("click", () => { window.location.href = "/admin-settings#payouts"; });
    }

    // 2. Add "GLOBAL OVERVIEW" label above balance
    const balanceEl = document.getElementById("balance-display");
    if (balanceEl) {
      const tag = document.createElement("div");
      tag.className = "text-[10px] font-bold uppercase tracking-wider text-brand-500 mb-1";
      tag.innerHTML = '<svg class="w-3 h-3 inline mr-0.5 -mt-px" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg> GLOBAL OVERVIEW';
      balanceEl.parentElement.insertBefore(tag, balanceEl);
    }

    // 3. Add "Affiliate" column header to transactions table
    const thead = document.querySelector("#transactions-tbody")?.closest("table")?.querySelector("thead tr");
    if (thead) {
      const th = document.createElement("th");
      th.className = "px-6 py-4 font-semibold tracking-wider";
      th.textContent = "AFFILIATE";
      thead.insertBefore(th, thead.firstChild);
    }

    // 4. Admin balance popup — customize labels
    const paidLabel = document.getElementById("popup-paid-label");
    if (paidLabel) paidLabel.textContent = "Total Paid Out";
    const lastLabel = document.getElementById("popup-last-label");
    if (lastLabel) lastLabel.textContent = "Active Affiliates";
    const lastIcon = document.getElementById("popup-last-icon");
    if (lastIcon) lastIcon.innerHTML = '<svg class="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>';
    const nextPayoutEl = document.getElementById("popup-next-payout");
    if (nextPayoutEl) nextPayoutEl.textContent = "--";
  }

  async function attemptConnection() {
    try {
      await loadLiveData();
      // Success — start periodic refresh
      refreshTimer = setInterval(loadLiveData, 30000);
    } catch (err) {
      retryCount++;
      if (retryCount <= MAX_RETRIES) {
        console.warn(`[TFXS Live] Attempt ${retryCount}/${MAX_RETRIES} failed, retrying in 5s...`);
        setTimeout(attemptConnection, 5000);
      } else {
        // All retries exhausted — fall back to demo data
        console.warn("[TFXS Live] All retries failed, falling back to demo data");
        restoreMockData();
        removeConnectingOverlay();
        updateLiveBadge(false);
        showError("Could not connect to live data — showing demo data.");
        // Keep trying in background
        refreshTimer = setInterval(loadLiveData, 30000);
      }
    }
  }

  // ── ROI formula calculator ──────────────────────────────
  function calculateROI(formula, totalDeposit, totalCommission) {
    switch (formula) {
      case "deposit_div_commission":
        return totalCommission > 0 ? (totalDeposit / totalCommission).toFixed(2) : "0.00";
      case "net_deposit_div_commission":
        // net deposit not available — falls back to total deposit
        return totalCommission > 0 ? (totalDeposit / totalCommission).toFixed(2) : "0.00";
      case "commission_div_deposit":
        return totalDeposit > 0 ? (totalCommission / totalDeposit).toFixed(2) : "0.00";
      case "commission_div_deposit_pct":
        return totalDeposit > 0 ? ((totalCommission / totalDeposit) * 100).toFixed(2) : "0.00";
      case "profit_margin":
        return totalDeposit > 0 ? (((totalDeposit - totalCommission) / totalDeposit) * 100).toFixed(2) : "0.00";
      case "fixed_ratio":
        return totalCommission > 0 ? (totalDeposit / totalCommission).toFixed(2) : "0.00";
      default:
        return totalCommission > 0 ? (totalDeposit / totalCommission).toFixed(2) : "0.00";
    }
  }
  // Expose globally for index.html sparkline/KPI calcs
  window.calculateROI = calculateROI;

  // ── Main data loader ────────────────────────────────────
  async function loadLiveData() {
    try {
      // Fetch summary + latest events + ROI settings in parallel
      const [summaryRes, eventsRes, roiRes] = await Promise.all([
        fetchSummary(affiliateId),
        fetchEvents(affiliateId),
        fetchRoiSettings(affiliateId).catch(() => null)
      ]);

      if (!summaryRes.ok || !eventsRes.ok) {
        throw new Error("Backend returned an error");
      }

      hideError();
      isLive = true;
      updateLiveBadge(true);

      // Update ROI formula from backend
      if (roiRes?.ok && roiRes.formula) _roiFormula = roiRes.formula;

      // ── Update KPIs ──
      const s = summaryRes.data;
      updateKPI("kpi-commission", s.total_commission, v => formatCurrency(v));
      updateKPI("kpi-registrations", s.registrations);
      updateKPI("kpi-ftd", s.ftd);
      updateKPI("kpi-qftd", s.qualified_cpa);

      // ROI calculation using real deposit data + formula
      const roi = calculateROI(_roiFormula, s.total_deposit || 0, s.total_commission || 0);
      updateKPI("kpi-roi", parseFloat(roi), v => v.toFixed(2));

      // Expose total_deposit for index.html calculations
      window._tfxsTotalDeposit = s.total_deposit || 0;
      window._tfxsRoiFormula = _roiFormula;

      // ── Update transactions table ──
      const events = eventsRes.data || [];

      // ── Inject into window.db so existing charts auto-update ──
      injectIntoDb(events);

      // Remove connecting overlay on first successful load
      removeConnectingOverlay();

    } catch (err) {
      console.warn("[TFXS Live] API unreachable:", err.message);
      // Only show error on subsequent failures (after initial connection)
      if (isLive) {
        showError("Live data temporarily unavailable. Retrying in 30s…");
        updateLiveBadge(false);
      }
      throw err; // Re-throw so attemptConnection() can handle retries
    }
  }

  // ── KPI updater (works with existing animated counter) ──
  function updateKPI(id, value, formatter) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove("skeleton");
    // Use existing animateValue if available, otherwise set directly
    if (typeof window.animateValue === "function") {
      const current = parseFloat(el.textContent.replace(/[^0-9.-]/g, "")) || 0;
      window.animateValue(el, current, value, 600, formatter);
    } else {
      el.textContent = formatter ? formatter(value) : value;
    }
  }

  // ── Transactions table from live events ─────────────────
  function updateTransactionsTable(events) {
    const tbody = document.getElementById("transactions-tbody");
    if (!tbody) return;

    // Only update if we have live data
    if (events.length === 0) return;

    tbody.innerHTML = events.slice(0, 20).map(ev => {
      const date = ev.occurred_at ? new Date(ev.occurred_at).toLocaleDateString() : "—";
      // Amount column: FTD shows deposit, commission/qftd shows commission, registration shows $0
      const evType = (ev.event_type || "unknown");
      let displayAmt = 0;
      if (evType === "ftd") displayAmt = parseFloat(ev.deposit_amount) || 0;
      else if (evType === "commission") displayAmt = parseFloat(ev.commission_amount) || 0;
      // QCPA shows $0 — it's a KPI-only event, not money
      const amount = `$${displayAmt.toFixed(2)}`;
      const type = evType.replace("_", " ").toUpperCase();
      const ctry = resolveCountry(ev.country);
      const country = `${ctry.flag} ${escapeHtml(ctry.name)}`;
      const userId = escapeHtml(ev.user_id || "—");

      const typeColor = {
        "REGISTRATION": "text-blue-400",
        "FTD": "text-green-400",
        "QUALIFIED CPA": "text-amber-400",
        "COMMISSION": "text-brand-500"
      }[type] || "text-gray-400";

      const affCol = IS_ADMIN ? `<td class="py-3 px-4 text-xs font-mono text-brand-500">${escapeHtml(ev.affiliate_code || "—")}</td>` : "";

      const rawStatus = ev.paid ? "paid" : (ev.status || "pending");
      const statusConfig = {
        paid: { cls: "bg-green-500/10 text-green-400 border border-green-500/20", text: "Paid" },
        approved: { cls: "bg-blue-500/10 text-blue-400 border border-blue-500/20", text: "Approved" },
        pending: { cls: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20", text: "Pending" },
        rejected: { cls: "bg-red-500/10 text-red-400 border border-red-500/20", text: "Rejected" }
      };
      const st = statusConfig[rawStatus] || statusConfig.pending;

      return `
        <tr class="border-b border-white/5 hover:bg-white/[0.02] transition-colors cursor-pointer">
          ${affCol}
          <td class="py-3 px-4 text-xs font-mono text-gray-300">${userId}</td>
          <td class="py-3 px-4 text-xs text-gray-500">${date}</td>
          <td class="py-3 px-4 text-xs font-bold ${typeColor}">${type}</td>
          <td class="py-3 px-4 text-xs text-gray-300">${country}</td>
          <td class="py-3 px-4 text-xs font-mono font-bold text-white">${amount}</td>
          <td class="py-3 px-4"><span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${st.cls}">${st.text}</span></td>
        </tr>`;
    }).join("");
  }

  // ── Inject live data into window.db — REPLACES mock data ──
  function injectIntoDb(events) {
    if (!window.db) return;

    // ── Build ONE registration row per user_id ──
    // Group all events by user_id, merge deposit + commission info
    const userMap = {};
    events.forEach(e => {
      const uid = e.user_id || "unknown";
      if (!userMap[uid]) {
        userMap[uid] = {
          id: `live-${e.id || uid}`,
          country: resolveCountry(e.country),
          userId: uid,
          date: e.occurred_at,
          firstDeposit: 0,
          commission: 0,
          status: "Active",
          affiliate_code: e.affiliate_code || "",
          event_type: e.event_type
        };
      }
      const u = userMap[uid];
      // Use earliest date (registration date)
      if (e.event_type === "registration") u.date = e.occurred_at;
      // FTD: set deposit amount
      if (e.event_type === "ftd") u.firstDeposit = parseFloat(e.deposit_amount) || 0;
      // Only 'commission' event carries money (QCPA is KPI-only)
      if (e.event_type === "commission") {
        u.commission += parseFloat(e.commission_amount) || 0;
      }
    });
    const liveRegs = Object.values(userMap);

    // ── Earnings: ALL events (Recent Transactions needs all of them) ──
    const liveEarnings = events.map((e, i) => ({
        id: `live-earn-${e.id || i}`,
        userId: e.user_id || `user-${i}`,
        amount: e.event_type === "ftd" ? parseFloat(e.deposit_amount) || 0 : (e.event_type === "commission" ? parseFloat(e.commission_amount) || 0 : 0),
        deposit_amount: parseFloat(e.deposit_amount) || 0,
        commission_amount: e.event_type === "commission" ? parseFloat(e.commission_amount) || 0 : 0,
        type: e.event_type === "ftd" ? "FTD" : e.event_type === "qualified_cpa" ? "QCPA" : e.event_type === "commission" ? "Commission" : "Registration",
        created: e.occurred_at,
        country: resolveCountry(e.country),
        affiliate_code: e.affiliate_code || "",
        afp: e.affiliate_code || "",
        status: e.status || (e.paid ? "paid" : "pending")
      }));

    // REPLACE mock data entirely with live data
    window.db.registrations = liveRegs;
    window.db.earnings = liveEarnings;

    // Update balance from live data (only approved commission events — not QCPA)
    const totalComm = events.filter(e => e.status === "approved" && e.event_type === "commission").reduce((s, e) => s + (parseFloat(e.commission_amount) || 0), 0);
    window.db.user.balance = totalComm;

    // Trigger a re-render of the dashboard if the function exists
    if (typeof window.updateDashboardData === "function") {
      window.updateDashboardData();
    }
  }

  // ── Live badge UI ───────────────────────────────────────
  function addLiveBadge() {
    const serverTime = document.getElementById("server-time");
    if (!serverTime) return;
    const badge = document.createElement("span");
    badge.id = "live-badge";
    badge.className = "ml-2 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full transition-all";
    badge.textContent = "connecting…";
    badge.style.cssText = "color:#fbbf24; background:rgba(251,191,36,0.1); border:1px solid rgba(251,191,36,0.2);";
    serverTime.parentElement.appendChild(badge);
  }

  function updateLiveBadge(live) {
    const badge = document.getElementById("live-badge");
    if (!badge) return;
    if (live) {
      badge.textContent = "● LIVE";
      badge.style.cssText = "color:#22c55e; background:rgba(34,197,94,0.1); border:1px solid rgba(34,197,94,0.3);";
    } else {
      badge.textContent = "DEMO";
      badge.style.cssText = "color:#f97316; background:rgba(249,115,22,0.1); border:1px solid rgba(249,115,22,0.2);";
    }
  }

  // ── Remove connecting overlay with fade ─────────────────
  function removeConnectingOverlay() {
    const overlay = document.getElementById("connecting-overlay");
    if (!overlay) return;
    overlay.style.transition = "opacity 0.5s ease";
    overlay.style.opacity = "0";
    setTimeout(() => overlay.remove(), 500);
  }

  // ── Restore mock/demo data as fallback ──────────────────
  function restoreMockData() {
    if (!window._mockBackup || !window.db) return;
    window.db.registrations = window._mockBackup.registrations;
    window.db.earnings = window._mockBackup.earnings;
    if (window.db.user) window.db.user.balance = window._mockBackup.balance;

    if (typeof window.updateDashboardData === "function") {
      window.updateDashboardData();
    }
  }

})();
