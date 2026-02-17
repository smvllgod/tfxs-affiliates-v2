/**
 * AFFILIATES — Theme Toggle (Dark / Light)
 * Persists to localStorage. Default = light.
 * Brand config: reads from window.BRAND (loaded via brand.config.js)
 */

(function () {
  "use strict";

  const THEME_KEY = window.BRAND ? BRAND._lsKey("theme") : "tfxs_theme";
  let _theme = localStorage.getItem(THEME_KEY) || "light";

  const DARK_BG  = window.BRAND ? BRAND.colors.bgDark  : "#050505";
  const LIGHT_BG = window.BRAND ? BRAND.colors.bgLight : "#f5f5f7";

  function setThemeColor(color) {
    let meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', color);
    }
  }

  function applyTheme(theme) {
    _theme = theme;
    localStorage.setItem(THEME_KEY, theme);
    const html = document.documentElement;

    if (theme === "light") {
      html.classList.add("light-theme");
      setThemeColor(LIGHT_BG);
    } else {
      html.classList.remove("light-theme");
      setThemeColor(DARK_BG);
    }
    updateToggleIcon();
  }

  function toggleTheme() {
    applyTheme(_theme === "dark" ? "light" : "dark");
  }

  function updateToggleIcon() {
    const btn = document.getElementById("theme-toggle-btn");
    if (!btn) return;
    if (_theme === "light") {
      btn.innerHTML = `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>`;
      btn.title = "Switch to dark mode";
    } else {
      btn.innerHTML = `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>`;
      btn.title = "Switch to light mode";
    }
  }

  function initThemeToggle() {
    const anchor = document.getElementById("theme-toggle-anchor");
    if (!anchor) return;
    const btn = document.createElement("button");
    btn.id = "theme-toggle-btn";
    btn.className = "p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer";
    anchor.appendChild(btn);
    btn.addEventListener("click", toggleTheme);
    updateToggleIcon();
  }

  // Apply immediately (before DOMContentLoaded to prevent flash)
  if (_theme === "light") document.documentElement.classList.add("light-theme");

  document.addEventListener("DOMContentLoaded", initThemeToggle);

  window.TFXS_theme = { toggleTheme, applyTheme, getTheme: () => _theme };
})();
