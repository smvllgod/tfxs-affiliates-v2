/**
 * TFXS AFFILIATES — Settings Loader
 * Loads saved profile (name, avatar) from localStorage cache or backend,
 * and applies them to the nav bar on every page.
 * Must be loaded AFTER api.js.
 */

(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", () => {
    // 1. Instant apply from localStorage cache (no flash)
    const cached = localStorage.getItem("tfxs_settings");
    if (cached) {
      try {
        const s = JSON.parse(cached);
        applyToNav(s.displayName, s.avatarSeed);
      } catch (e) { /* ignore */ }
    }

    // 2. Sync from backend in background (updates cache if newer)
    const API = window.TFXS_API;
    if (API) {
      const affiliateId = API.getAffiliateId();
      API.fetchSettings(affiliateId).then(res => {
        if (res.ok && res.data) {
          const s = res.data;
          const cache = {
            displayName: s.display_name,
            email: s.email,
            avatarSeed: s.avatar_seed,
            paymentMethod: s.payment_method,
            walletAddress: s.wallet_address
          };
          localStorage.setItem("tfxs_settings", JSON.stringify(cache));
          applyToNav(s.display_name, s.avatar_seed);
        }
        // Dismiss overlay for pages without their own live connector (assets, settings)
        dismissOverlayIfStillVisible();
      }).catch(() => {
        dismissOverlayIfStillVisible();
      });
    } else {
      dismissOverlayIfStillVisible();
    }
  });

  function applyToNav(displayName, avatarSeed) {
    if (displayName) {
      // Update class-based nav name labels
      document.querySelectorAll(".nav-display-name").forEach(el => { el.textContent = displayName; });
      // Legacy fallback
      const navName = document.querySelector("nav .text-sm.font-bold");
      if (navName) navName.textContent = displayName;
    }
    if (avatarSeed) {
      const navAvatar = document.querySelector('nav img[alt="Avatar"]');
      if (navAvatar) navAvatar.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`;
    }
  }

  // ── Dismiss connecting overlay (fallback for pages without a dedicated live connector) ──
  function dismissOverlayIfStillVisible() {
    // Wait a tick — let dedicated connectors (dashboard.js, reports.js, deals.js) claim the overlay first
    setTimeout(() => {
      const overlay = document.getElementById("connecting-overlay");
      if (!overlay) return;
      overlay.style.transition = "opacity 0.5s ease";
      overlay.style.opacity = "0";
      setTimeout(() => overlay.remove(), 500);
    }, 300);
  }
})();
