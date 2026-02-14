/**
 * TFXS AFFILIATES — Deals Live Data Connector v2.0
 * Loads broker deals + tiers from the backend into the deals page.
 * Fully dynamic — no static fallback. Shows empty state if no deals.
 */

// Global copy function (needs to be outside IIFE for onclick access)
function copyBrokerLink(btn, link) {
  navigator.clipboard.writeText(link).then(() => {
    const label = btn.querySelector(".copy-label");
    const orig = label.textContent;
    label.textContent = "Copied!";
    btn.classList.add("border-green-500/30", "text-green-400");
    setTimeout(() => {
      label.textContent = orig;
      btn.classList.remove("border-green-500/30", "text-green-400");
    }, 2000);
  }).catch(() => {
    // Fallback for older browsers
    const ta = document.createElement("textarea");
    ta.value = link; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select(); document.execCommand("copy");
    document.body.removeChild(ta);
    const label = btn.querySelector(".copy-label");
    label.textContent = "Copied!";
    setTimeout(() => { label.textContent = "Copy Broker Link"; }, 2000);
  });
}

(function () {
  "use strict";

  const { getAffiliateId, fetchDeals, hideError, escapeHtml } = window.TFXS_API;

  let affiliateId = null;
  // User's actual AFP code for link personalization (works for admins too)
  let userAfp = null;

  // Accent colors for brokers (cycles)
  const ACCENT_COLORS = [
    { border: "border-brand-500/30", bg: "bg-brand-500/10", text: "text-brand-500", glow: "shadow-[0_0_15px_rgba(220,38,38,0.4)]" },
    { border: "border-blue-500/30", bg: "bg-blue-500/10", text: "text-blue-400", glow: "shadow-[0_0_15px_rgba(37,99,235,0.4)]" },
    { border: "border-purple-500/30", bg: "bg-purple-500/10", text: "text-purple-400", glow: "shadow-[0_0_15px_rgba(147,51,234,0.4)]" },
    { border: "border-emerald-500/30", bg: "bg-emerald-500/10", text: "text-emerald-400", glow: "shadow-[0_0_15px_rgba(16,185,129,0.4)]" },
    { border: "border-amber-500/30", bg: "bg-amber-500/10", text: "text-amber-400", glow: "shadow-[0_0_15px_rgba(245,158,11,0.4)]" },
    { border: "border-cyan-500/30", bg: "bg-cyan-500/10", text: "text-cyan-400", glow: "shadow-[0_0_15px_rgba(6,182,212,0.4)]" },
  ];

  document.addEventListener("DOMContentLoaded", () => {
    affiliateId = getAffiliateId();
    // Always get the user's own AFP for link personalization (even admins have one)
    userAfp = (window.__tfxsUser && window.__tfxsUser.afp) || localStorage.getItem("affiliate_id") || null;
    loadDeals();
  });

  async function loadDeals() {
    try {
      const res = await fetchDeals(affiliateId);
      if (!res.ok) throw new Error("Backend error");
      hideError();
      removeConnectingOverlay();
      renderDeals(res.data || []);
    } catch (err) {
      console.warn("[TFXS Deals] API unreachable:", err.message);
      removeConnectingOverlay();
      renderEmpty("Unable to load deals. Please try again later.");
    }
  }

  function removeConnectingOverlay() {
    const overlay = document.getElementById("connecting-overlay");
    if (!overlay) return;
    overlay.style.transition = "opacity 0.5s ease";
    overlay.style.opacity = "0";
    setTimeout(() => overlay.remove(), 500);
  }

  function renderEmpty(msg) {
    const container = document.getElementById("deals-container");
    if (!container) return;
    container.innerHTML = `
      <div class="text-center py-20">
        <div class="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
        </div>
        <p class="text-gray-500 text-sm">${escapeHtml(msg || "No active deals available.")}</p>
        <p class="text-gray-700 text-xs mt-2">Check back soon or contact your account manager.</p>
      </div>`;
  }

  function renderDeals(deals) {
    const container = document.getElementById("deals-container");
    if (!container) return;

    if (!deals.length) { renderEmpty("No active deals available for your account."); return; }

    // Group deals by broker
    const brokerMap = new Map();
    deals.forEach(deal => {
      const bName = deal.broker || "Unknown";
      if (!brokerMap.has(bName)) brokerMap.set(bName, []);
      brokerMap.get(bName).push(deal);
    });

    let colorIdx = 0;
    let html = "";
    brokerMap.forEach((bDeals, broker) => {
      const fallbackAccent = ACCENT_COLORS[colorIdx % ACCENT_COLORS.length];
      colorIdx++;
      bDeals.forEach(deal => {
        // Use broker theme_color if available, else fallback accent
        const accent = deal.broker_theme_color
          ? buildAccentFromHex(deal.broker_theme_color)
          : fallbackAccent;
        html += renderDealCard(deal, broker, accent);
      });
    });
    container.innerHTML = html;
  }

  /** Build dynamic accent styles from a hex color */
  function buildAccentFromHex(hex) {
    const c = hex.replace("#", "");
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    return {
      border: "", bg: "", text: "", glow: "",
      _hex: hex,
      _style: {
        border: `border-color: rgba(${r},${g},${b},0.3)`,
        bg: `background: rgba(${r},${g},${b},0.1)`,
        text: `color: ${hex}`,
        glow: `box-shadow: 0 0 15px rgba(${r},${g},${b},0.4)`,
      }
    };
  }

  function renderDealCard(deal, broker, accent) {
    const h = escapeHtml;
    const isDynamic = !!accent._hex;
    const brokerLogo = deal.broker_logo || deal.logo_url;
    const logo = brokerLogo
      ? `<img src="${h(brokerLogo)}" alt="${h(broker)}" class="w-10 h-10 object-contain" onerror="this.onerror=null;this.parentElement.innerHTML='<span class=\\'text-white font-bold text-xl\\'>${h(broker[0])}</span>'">`
      : isDynamic
        ? `<span class="font-bold text-xl" style="${accent._style.text}">${h(broker[0])}</span>`
        : `<span class="font-bold text-xl ${accent.text}">${h(broker[0])}</span>`;

    const statusClass = deal.is_active !== false
      ? "text-green-400 bg-green-400/10 border-green-400/20"
      : "text-red-400 bg-red-400/10 border-red-400/20";
    const statusText = deal.is_active !== false ? "Active" : "Inactive";
    const dealType = deal.deal_type || "CPA";
    const description = deal.description || deal.notes || "";
    const tiers = deal.tiers || [];

    // Replace {AFP} placeholder in broker_link with user's actual AFP code
    if (deal.broker_link && userAfp) {
      deal.broker_link = deal.broker_link.replace(/\{AFP\}/gi, userAfp);
    }

    const glowStyle = isDynamic ? accent._style.glow : "";
    const glowClass = isDynamic ? "" : accent.glow;
    const hoverBorderStyle = isDynamic ? `style="--hover-border: ${accent._hex}4d"` : "";
    const hoverBorderClass = isDynamic ? "" : `hover:${accent.border}`;

    const tiersHtml = `
      <div class="flex-[1.5]">
        <h3 class="text-xs text-gray-500 uppercase font-bold mb-4 tracking-wider">Commission Tiers</h3>
        ${tiers.length > 0 ? `<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">${tiers.map(t => renderTierCard(t, accent)).join("")}</div>` : `<p class="text-xs text-gray-600 italic">No tiers configured</p>`}
      </div>`;

    return `
      <div class="glass-panel p-6 rounded-2xl border border-white/10 relative overflow-hidden group ${hoverBorderClass} transition-all duration-300" ${isDynamic ? `onmouseenter="this.style.borderColor='${accent._hex}4d'" onmouseleave="this.style.borderColor=''"` : ""}>
        <div class="flex flex-col md:flex-row gap-6 md:items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center gap-4 mb-3">
              <div class="w-12 h-12 rounded-lg overflow-hidden ${glowClass} bg-white/10 flex items-center justify-center" ${glowStyle ? `style="${glowStyle}"` : ""}>${logo}</div>
              <div>
                <h2 class="text-2xl font-bold text-white tracking-wide">${h(deal.title || broker)}</h2>
                <span class="text-[10px] uppercase font-bold ${statusClass} px-2 py-0.5 rounded border">${statusText}</span>
              </div>
            </div>
            ${description ? `<p class="text-xs text-gray-400 leading-relaxed max-w-sm">${h(description)}</p>` : ""}
            <div class="mt-4 max-w-xs space-y-2">
              <div class="bg-white/5 p-3 rounded-lg border border-white/5">
                <span class="text-[10px] text-gray-500 uppercase font-bold block mb-1">Type</span>
                <span class="text-sm font-mono font-bold text-white">${h(dealType)}</span>
              </div>
              ${deal.broker_link ? `<button onclick="copyBrokerLink(this, '${h(deal.broker_link).replace(/'/g, "\\'")}')"
                class="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white px-3 py-2.5 rounded-lg transition-all duration-200 group">
                <svg class="w-3.5 h-3.5 text-gray-400 group-hover:text-white transition" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>
                <span class="text-[11px] font-bold uppercase tracking-wider copy-label">Copy Broker Link</span>
              </button>` : ''}
            </div>
          </div>
          ${tiersHtml}
        </div>
      </div>`;
  }

  function renderTierCard(tier, accent) {
    const h = escapeHtml;
    const isElite = tier.is_elite;
    const isDynamic = !!accent._hex;
    const rangeText = tier.tier_max != null
      ? `${Number(tier.tier_min).toLocaleString()} - ${Number(tier.tier_max).toLocaleString()}`
      : `${Number(tier.tier_min).toLocaleString()}+`;
    const triggerText = tier.trigger_condition ? ` · ${h(tier.trigger_condition)}` : "";
    const descText = tier.description ? `<span class="text-[10px] text-gray-500 block mt-0.5">${h(tier.description)}</span>` : "";

    if (isElite) {
      const eliteColor = tier.style_color || (isDynamic ? accent._hex : null);
      const eliteStyle = eliteColor ? `style="color:${h(eliteColor)}"` : "";
      const eliteBorderStyle = eliteColor ? `style="border-color:${h(eliteColor)}44;background:${h(eliteColor)}15"` : "";
      const eliteClass = eliteColor ? "" : `${accent.bg} ${accent.border}`;
      return `
        <div class="deal-tier-card deal-tier-elite flex items-center justify-between p-3 rounded-lg ${eliteClass} border transition-colors relative overflow-hidden col-span-1 sm:col-span-2" ${eliteBorderStyle}>
          <div class="deal-tier-shimmer absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-[shimmer_2s_infinite]"></div>
          <div class="relative z-10">
            <span class="text-xs block ${eliteColor ? '' : accent.text}" ${eliteStyle}>${h(tier.tier_name)}</span>
            <span class="text-xs font-medium text-white">${rangeText}${triggerText}</span>
            ${descText}
          </div>
          <span class="deal-tier-commission relative z-10 text-lg font-mono font-bold ${eliteColor ? '' : accent.text}" ${eliteStyle}>$${Number(tier.commission || 0).toLocaleString()}</span>
        </div>`;
    }

    return `
      <div class="deal-tier-card flex items-center justify-between p-3 rounded-lg bg-black/40 border border-white/5 hover:border-white/10 transition-colors">
        <div>
          <span class="text-xs text-gray-400 block">${h(tier.tier_name)}</span>
          <span class="text-xs font-medium text-white">${rangeText}${triggerText}</span>
          ${descText}
        </div>
        <span class="deal-tier-commission text-lg font-mono font-bold text-white">$${Number(tier.commission || 0).toLocaleString()}</span>
      </div>`;
  }

})();
