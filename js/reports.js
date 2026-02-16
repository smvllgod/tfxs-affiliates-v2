/**
 * TFXS AFFILIATES — Reports Live Data Connector
 * Loads report data from the backend and populates the reports tables.
 * Works alongside the existing inline report JS in reports.html.
 */

(function () {
  "use strict";

  const { getAffiliateId, fetchReports, showError, hideError, resolveCountry } = window.TFXS_API;

  let affiliateId = null;
  let refreshTimer = null;
  let retryCount = 0;
  const MAX_RETRIES = 2;

  document.addEventListener("DOMContentLoaded", () => {
    affiliateId = getAffiliateId();

    // Default date range: last 7 days
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 7);

    // First load with retry logic for cold start
    attemptConnection(fmt(from), fmt(to));
  });

  async function attemptConnection(from, to) {
    try {
      await loadReports(from, to);
      // Success — start periodic refresh
      hookDatePicker();
      refreshTimer = setInterval(() => {
        const range = getCurrentRange();
        loadReports(range.from, range.to);
      }, 30000);
    } catch (err) {
      retryCount++;
      if (retryCount <= MAX_RETRIES) {
        console.warn(`[TFXS Reports] Attempt ${retryCount}/${MAX_RETRIES} failed, retrying in 5s...`);
        setTimeout(() => attemptConnection(from, to), 5000);
      } else {
        // All retries exhausted — fall back to demo data
        console.warn("[TFXS Reports] All retries failed, falling back to demo data");
        restoreMockData();
        removeConnectingOverlay();
        showError("Could not connect to live data — showing demo data.");
        // Keep trying in background
        hookDatePicker();
        refreshTimer = setInterval(() => {
          const range = getCurrentRange();
          loadReports(range.from, range.to);
        }, 30000);
      }
    }
  }

  // ── Load data ───────────────────────────────────────────
  async function loadReports(from, to) {
    try {
      const res = await fetchReports(affiliateId, from, to);
      if (!res.ok) throw new Error("Backend error");
      hideError();

      const { totals, daily, countries, events } = res.data;

      // Inject into window.db so existing table renderers pick it up
      injectLiveData(events || []);

      // Also render our own summary if we have the containers
      renderTotals(totals);
      renderDailyTable(daily);

      // Remove connecting overlay on first successful load
      removeConnectingOverlay();

    } catch (err) {
      console.warn("[TFXS Reports] API unreachable:", err.message);
      throw err; // Re-throw so attemptConnection() can handle retries
    }
  }

  // ── Inject into window.db — REPLACES mock data ──────────
  function injectLiveData(events) {
    if (!window.db) return;

    const isAdmin = localStorage.getItem('is_admin') === 'true';

    const liveEarnings = events
      .filter(e => e.event_type === "commission" && (parseFloat(e.commission_amount) > 0 || parseFloat(e.raw_commission) > 0))
      .map((e, i) => {
        // Admin sees raw CellXpert commissions; affiliate sees deal-based
        const amt = isAdmin
          ? (parseFloat(e.raw_commission) || parseFloat(e.commission_amount) || 0)
          : (parseFloat(e.commission_amount) || 0);
        return {
          id: `live-rpt-${e.id || i}`,
          userId: e.user_id || `user-${i}`,
          amount: amt,
          raw_commission: parseFloat(e.raw_commission) || parseFloat(e.commission_amount) || 0,
          commission_amount: parseFloat(e.commission_amount) || 0,
          type: "Commission",
          created: e.occurred_at,
          country: resolveCountry(e.country),
          affiliate_code: e.affiliate_code || "",
          afp: e.affiliate_code || "",
          broker: e.broker || ""
        };
      });

    // ── Build ONE row per user_id for Registration Report ──
    // Merge registration + FTD + commission events into a single row
    const userMap = {};
    events.forEach(e => {
      const uid = e.user_id || "unknown";
      if (!userMap[uid]) {
        userMap[uid] = {
          id: `live-rpt-reg-${e.id || uid}`,
          country: resolveCountry(e.country),
          userId: uid,
          date: e.occurred_at,
          firstDeposit: 0,
          commission: 0,
          status: e.status || "Active",
          affiliate_code: e.affiliate_code || "",
          broker: e.broker || "",
          customer_name: "",
          account_id: "",
          lot_amount: 0,
          volume: 0,
          position_count: 0,
          net_deposits: 0,
          deposit_count: 0,
          first_deposit_date: "",
          qualification_date: "",
          roi: 0
        };
      }
      const u = userMap[uid];
      // Use registration date as the primary date
      if (e.event_type === "registration") {
        u.date = e.occurred_at;
        // Enrichment fields come from the registration row
        u.customer_name = e.customer_name || u.customer_name;
        u.account_id = e.account_id || u.account_id;
        u.lot_amount = parseFloat(e.lot_amount) || u.lot_amount;
        u.volume = parseFloat(e.volume) || u.volume;
        u.position_count = parseInt(e.position_count) || u.position_count;
        u.net_deposits = parseFloat(e.net_deposits) || u.net_deposits;
        u.deposit_count = parseInt(e.deposit_count) || u.deposit_count;
        u.first_deposit_date = e.first_deposit_date || u.first_deposit_date;
        u.qualification_date = e.qualification_date || u.qualification_date;
        u.roi = parseFloat(e.roi) || u.roi;
        u.status = e.status || u.status;
      }
      // Also pick up customer_name/account_id from any event type (they're enriched on all rows)
      if (!u.customer_name && e.customer_name) u.customer_name = e.customer_name;
      if (!u.account_id && e.account_id) u.account_id = e.account_id;
      // FTD: set deposit amount
      if (e.event_type === "ftd") u.firstDeposit = parseFloat(e.deposit_amount) || 0;
      // Only 'commission' event carries money (QCPA is KPI-only, $0)
      if (e.event_type === "commission") {
        // Admin sees raw CellXpert commissions; affiliate sees deal-based
        u.commission += isAdmin
          ? (parseFloat(e.raw_commission) || parseFloat(e.commission_amount) || 0)
          : (parseFloat(e.commission_amount) || 0);
      }
    });
    const liveRegs = Object.values(userMap);

    // REPLACE mock data with live data
    window.db.registrations = liveRegs;
    window.db.earnings = liveEarnings;

    // Trigger the master render function (handles filtering, pagination, both tables)
    if (typeof window.renderReports === "function") {
      window.renderReports();
    } else {
      // Fallback: call individual renderers
      if (typeof window.renderEarningsTable === "function") window.renderEarningsTable();
      if (typeof window.renderRegistrationsTable === "function") window.renderRegistrationsTable();
    }
  }

  // ── Render summary totals ───────────────────────────────
  function renderTotals(totals) {
    if (!totals) return;

    // Try to update existing KPI-like elements if present on reports page
    const mappings = {
      "report-total-regs": totals.registrations,
      "report-total-ftd": totals.ftd,
      "report-total-qcpa": totals.qualified_cpa,
      "report-total-commission": totals.total_commission
    };

    Object.entries(mappings).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) {
        el.textContent = typeof val === "number" && id.includes("commission") ? `$${val.toFixed(2)}` : val;
      }
    });
  }

  // ── Daily breakdown table ───────────────────────────────
  function renderDailyTable(daily) {
    // Look for a daily breakdown tbody — create one if reports page has space
    let tbody = document.getElementById("reports_daily_tbody");
    if (!tbody || !daily || daily.length === 0) return;

    tbody.innerHTML = daily.map(d => `
      <tr class="border-b border-white/5 hover:bg-white/[0.02] transition">
        <td class="py-3 px-4 text-xs font-mono text-gray-300">${d.date}</td>
        <td class="py-3 px-4 text-xs text-center text-gray-300">${d.registrations}</td>
        <td class="py-3 px-4 text-xs text-center text-gray-300">${d.ftd}</td>
        <td class="py-3 px-4 text-xs text-center text-gray-300">${d.qualified_cpa}</td>
        <td class="py-3 px-4 text-xs font-mono font-bold text-white text-right">$${d.commission.toFixed(2)}</td>
      </tr>
    `).join("");
  }

  // ── Date helpers ────────────────────────────────────────
  function fmt(d) {
    return d.toISOString().substring(0, 10);
  }

  function getCurrentRange() {
    // Try to read from existing flatpickr if it exists
    const input = document.getElementById("date-range");
    if (input && input._flatpickr) {
      const dates = input._flatpickr.selectedDates;
      if (dates.length >= 2) {
        return { from: fmt(dates[0]), to: fmt(dates[1]) };
      }
    }
    // Default last 7 days
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 7);
    return { from: fmt(from), to: fmt(to) };
  }

  function hookDatePicker() {
    const input = document.getElementById("date-range");
    if (input && input._flatpickr) {
      input._flatpickr.config.onChange.push((selectedDates) => {
        if (selectedDates.length >= 2) {
          loadReports(fmt(selectedDates[0]), fmt(selectedDates[1]));
        }
      });
    }

    // Also hook quick-period buttons
    document.querySelectorAll("[data-period]").forEach(btn => {
      btn.addEventListener("click", () => {
        // Small delay to let existing handler run first
        setTimeout(() => {
          const range = getCurrentRange();
          loadReports(range.from, range.to);
        }, 200);
      });
    });
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

    // Trigger the master render function
    if (typeof window.renderReports === "function") window.renderReports();
  }

})();
