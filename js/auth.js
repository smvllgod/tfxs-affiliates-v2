/**
 * TFXS AFFILIATES — Auth Guard
 * Checks for valid JWT on all protected pages.
 * Redirects to login.html if not authenticated.
 * Must be loaded FIRST, before any other script.
 */
(function () {
  "use strict";

  // ── Global Confirm & Alert Modals (professional, dark-themed) ──
  // Available on ALL pages (auth.js loads first everywhere)
  (function initTfxsDialogs() {
    const MODAL_ID = "tfxs-confirm-modal";
    let _resolve = null;

    function ensureModal() {
      if (document.getElementById(MODAL_ID)) return;
      const overlay = document.createElement("div");
      overlay.id = MODAL_ID;
      overlay.className = "fixed inset-0 z-[99999] hidden items-center justify-center";
      overlay.style.cssText = "background:rgba(0,0,0,0.70);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);";
      overlay.innerHTML = `
        <div id="tfxs-confirm-box" class="rounded-2xl p-6 w-full max-w-sm mx-4 transform transition-all duration-200 scale-95 opacity-0">
          <div class="flex items-start gap-3 mb-4">
            <div id="tfxs-confirm-icon" class="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center" style="background:rgba(220,38,38,0.15);">
              <svg class="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/></svg>
            </div>
            <div class="flex-1 min-w-0">
              <h3 id="tfxs-confirm-title" class="text-sm font-bold leading-tight">Confirm Action</h3>
              <p id="tfxs-confirm-msg" class="text-xs mt-1.5 leading-relaxed"></p>
            </div>
          </div>
          <div class="flex gap-2.5 mt-5">
            <button id="tfxs-confirm-cancel" class="flex-1 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-200">Cancel</button>
            <button id="tfxs-confirm-ok" class="flex-1 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-200" style="position:relative;overflow:hidden;color:#ffffff;">Confirm</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);

      // Event listeners
      overlay.querySelector("#tfxs-confirm-cancel").addEventListener("click", () => closeDialog(false));
      overlay.querySelector("#tfxs-confirm-ok").addEventListener("click", () => closeDialog(true));
      overlay.addEventListener("click", (e) => { if (e.target === overlay) closeDialog(false); });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && !overlay.classList.contains("hidden")) closeDialog(false);
        if (e.key === "Enter" && !overlay.classList.contains("hidden")) closeDialog(true);
      });
    }

    function openDialog(msg, opts = {}) {
      ensureModal();
      const overlay = document.getElementById(MODAL_ID);
      const box = document.getElementById("tfxs-confirm-box");
      const titleEl = document.getElementById("tfxs-confirm-title");
      const msgEl = document.getElementById("tfxs-confirm-msg");
      const okBtn = document.getElementById("tfxs-confirm-ok");
      const cancelBtn = document.getElementById("tfxs-confirm-cancel");
      const iconWrap = document.getElementById("tfxs-confirm-icon");

      // Dynamic theme detection
      const isLt = document.documentElement.classList.contains('light-theme');
      box.style.background = isLt ? 'rgba(255,255,255,0.97)' : 'rgba(20,20,20,0.95)';
      box.style.border = isLt ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.08)';
      box.style.boxShadow = isLt ? '0 25px 60px rgba(0,0,0,0.15)' : '0 25px 60px rgba(0,0,0,0.6),0 0 40px rgba(220,38,38,0.08)';
      titleEl.style.color = isLt ? '#1d1d1f' : '#ffffff';
      msgEl.style.color = isLt ? '#6b7280' : '#9ca3af';
      cancelBtn.style.background = isLt ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)';
      cancelBtn.style.border = isLt ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.08)';
      cancelBtn.style.color = isLt ? '#374151' : '#9ca3af';
      cancelBtn.onmouseenter = function() { this.style.background = isLt ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)'; };
      cancelBtn.onmouseleave = function() { this.style.background = isLt ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)'; };
      overlay.style.background = isLt ? 'rgba(0,0,0,0.40)' : 'rgba(0,0,0,0.70)';

      titleEl.textContent = opts.title || "Confirm Action";
      msgEl.textContent = msg;
      okBtn.textContent = opts.okText || "Confirm";

      // Variant styling
      const variant = opts.variant || "danger";
      const colors = isLt ? {
        danger:  { bg: "rgba(220,38,38,0.10)", btn: "linear-gradient(135deg,#ef4444,#dc2626)", iconColor: "#dc2626",  icon: '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>' },
        warning: { bg: "rgba(245,158,11,0.10)", btn: "linear-gradient(135deg,#f59e0b,#d97706)", iconColor: "#d97706", icon: '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/></svg>' },
        info:    { bg: "rgba(220,38,38,0.10)",  btn: "linear-gradient(135deg,#ef4444,#dc2626)", iconColor: "#dc2626",  icon: '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>' },
        logout:  { bg: "rgba(220,38,38,0.10)", btn: "linear-gradient(135deg,#ef4444,#dc2626)", iconColor: "#dc2626",  icon: '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>' },
      } : {
        danger:  { bg: "rgba(220,38,38,0.15)", btn: "linear-gradient(135deg,#dc2626,#991b1b)", iconColor: "#ef4444",  icon: '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>' },
        warning: { bg: "rgba(245,158,11,0.15)", btn: "linear-gradient(135deg,#d97706,#92400e)", iconColor: "#f59e0b", icon: '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/></svg>' },
        info:    { bg: "rgba(220,38,38,0.15)",  btn: "linear-gradient(135deg,#dc2626,#991b1b)", iconColor: "#ef4444",  icon: '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>' },
        logout:  { bg: "rgba(220,38,38,0.15)", btn: "linear-gradient(135deg,#dc2626,#991b1b)", iconColor: "#ef4444",  icon: '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>' },
      };
      const c = colors[variant] || colors.danger;
      iconWrap.style.background = c.bg;
      iconWrap.innerHTML = c.icon;
      iconWrap.querySelector("svg").style.color = c.iconColor;
      okBtn.style.background = c.btn;

      // Alert mode: hide cancel
      if (opts.alert) {
        cancelBtn.style.display = "none";
        okBtn.textContent = opts.okText || "OK";
      } else {
        cancelBtn.style.display = "";
      }

      // Show with animation
      overlay.classList.remove("hidden");
      overlay.style.display = "flex";
      requestAnimationFrame(() => {
        box.classList.remove("scale-95", "opacity-0");
        box.classList.add("scale-100", "opacity-100");
      });

      return new Promise(resolve => { _resolve = resolve; });
    }

    function closeDialog(result) {
      const overlay = document.getElementById(MODAL_ID);
      const box = document.getElementById("tfxs-confirm-box");
      if (!overlay || overlay.classList.contains("hidden")) return;
      box.classList.remove("scale-100", "opacity-100");
      box.classList.add("scale-95", "opacity-0");
      setTimeout(() => {
        overlay.classList.add("hidden");
        overlay.style.display = "none";
        if (_resolve) { _resolve(result); _resolve = null; }
      }, 150);
    }

    /**
     * Professional confirm dialog. Returns a Promise<boolean>.
     * Usage: if (await tfxsConfirm("Delete this item?")) { ... }
     * Options: { title, okText, variant: 'danger'|'warning'|'info'|'logout' }
     */
    window.tfxsConfirm = function(msg, opts) { return openDialog(msg, opts); };

    /**
     * Professional alert dialog. Returns a Promise<true>.
     * Usage: await tfxsAlert("Done!", { variant: 'info' })
     */
    window.tfxsAlert = function(msg, opts = {}) { return openDialog(msg, { ...opts, alert: true }); };
  })();

  // Skip auth check on login page
  const path = window.location.pathname;
  if (path.endsWith("login.html") || path.endsWith("login")) return;

  const token = localStorage.getItem("tfxs_jwt");

  if (!token) {
    window.location.replace("/login");
    return;
  }

  // Decode JWT payload (base64url)
  try {
    const parts = token.split(".");
    if (parts.length !== 3) throw new Error("bad");

    // base64url → base64 → decode
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(b64));

    // Check expiry
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      localStorage.removeItem("tfxs_jwt");
      localStorage.removeItem("affiliate_id");
      window.location.replace("/login");
      return;
    }

    // Set affiliate ID for api.js and settings-loader.js
    if (payload.afp) {
      localStorage.setItem("affiliate_id", payload.afp);
    }

    // Admin flag
    if (payload.is_admin) {
      localStorage.setItem("is_admin", "true");
    } else {
      localStorage.removeItem("is_admin");
    }

    // Expose user info globally
    window.__tfxsUser = {
      afp: payload.afp || null,
      email: payload.email || null,
      displayName: payload.display_name || null,
      isAdmin: payload.is_admin || false,
    };
  } catch (e) {
    // JWT decode failed — force re-login
    localStorage.removeItem("tfxs_jwt");
    localStorage.removeItem("affiliate_id");
    window.location.replace("/login");
    return;
  }

  // ── Logout function (available globally) ──
  window.tfxsLogout = function () {
    localStorage.removeItem("tfxs_jwt");
    localStorage.removeItem("affiliate_id");
    localStorage.removeItem("is_admin");
    localStorage.removeItem("tfxs_settings");
    window.location.replace("/login");
  };

  // ── Update nav with AFP code + add logout button after DOM loads ──
  document.addEventListener("DOMContentLoaded", () => {
    const user = window.__tfxsUser;
    if (!user) return;

    // Update ALL nav profile labels (works on every page via class selectors)
    document.querySelectorAll(".nav-display-name").forEach(el => {
      el.textContent = user.displayName || user.email || "—";
    });
    document.querySelectorAll(".nav-afp-label").forEach(el => {
      el.textContent = user.afp ? `ID: ${user.afp}` : "—";
    });

    // Legacy fallback: also update older pages that use positional selectors
    const idLabel = document.querySelector("nav .text-brand-500.font-mono");
    if (idLabel && user.afp) {
      idLabel.textContent = `ID: ${user.afp}`;
    }

    // ── Admin: override nav for admin users ──
    if (user.isAdmin) {
      // Broad selector: matches settings.html, /settings, settings (Netlify pretty URLs rewrites hrefs)
      document.querySelectorAll('a[href="settings.html"], a[href="/settings"], a[href="settings"], a[href="./settings.html"], a[href="./settings"]').forEach(link => {
        // Don't touch links already pointing to admin-settings
        if (link.getAttribute('href').includes('admin-settings')) return;
        link.setAttribute('href', '/admin-settings');
        if (link.closest('#nav-links') || link.closest('#mobile-menu')) link.textContent = 'Admin';
      });
      // Replace AFP label with admin badge
      document.querySelectorAll(".nav-afp-label").forEach(el => {
        el.innerHTML = '<span class="bg-brand-500 text-white text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">ADMIN</span>';
      });
      if (idLabel) {
        idLabel.innerHTML = '<span class="bg-brand-500 text-white text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">ADMIN</span>';
      }
    }

    // Add logout button to nav (next to avatar)
    const avatarLink = document.getElementById("nav-avatar-link") || document.querySelector('nav a[href="settings.html"], nav a[href="admin-settings.html"], nav a[href="/admin-settings"], nav a[href="/settings"]');
    if (avatarLink && !document.getElementById("logout-btn")) {
      const logoutBtn = document.createElement("button");
      logoutBtn.id = "logout-btn";
      logoutBtn.className =
        "ml-2 p-2 text-gray-500 hover:text-red-500 transition-colors rounded-lg hover:bg-white/5";
      logoutBtn.title = "Logout";
      logoutBtn.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>';
      logoutBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        if (await tfxsConfirm("Are you sure you want to log out of TFXS Affiliates?", { title: "Log Out", okText: "Log Out", variant: "logout" })) {
          window.tfxsLogout();
        }
      });
      avatarLink.parentElement.appendChild(logoutBtn);
    }

    // ── Mobile menu toggle (handled by app.js portal system) ──
    // No duplicate handler needed — app.js creates the portal menu
  });
})();
