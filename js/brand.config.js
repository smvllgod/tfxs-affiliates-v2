/* ═══════════════════════════════════════════════════════════════
   BRAND CONFIG — Single source of truth for white-label branding
   ═══════════════════════════════════════════════════════════════
   To white-label for a new client, duplicate this file and change
   the values below. Everything else (HTML, CSS, JS) reads from here.
   ═══════════════════════════════════════════════════════════════ */

const BRAND = {

  /* ── Identity ──────────────────────────────────────────────── */
  name:        "TFXS",                // Short brand name
  nameFull:    "TFXS AFFILIATES",     // Full display name (nav, headers)
  tagline:     "Elite Dashboard Pro", // Subtitle in <title>
  company:     "TFXS Network",        // Legal / copyright entity
  year:        "2026",                // Copyright year
  description: "Premium affiliate management dashboard for top-tier forex CPA partners.",

  /* ── Prefix ────────────────────────────────────────────────── */
  prefix:      "TFXS",               // AFP prefix (e.g. TFXS-ABC123)
  storageKey:  "tfxs",               // localStorage namespace (tfxs_jwt, tfxs_theme…)

  /* ── URLs ──────────────────────────────────────────────────── */
  urls: {
    api:       "https://api.theforexskyline.com",
    frontend:  "https://affiliates.theforexskyline.com",
    logo:      "assets/logo.svg",       // Relative to frontend root
    icon192:   "assets/icon-192.png",
    icon512:   "assets/icon-512.png",
  },

  /* ── Colors ────────────────────────────────────────────────── */
  colors: {
    // Primary brand color ramp (Tailwind "brand" palette)
    primary50:  "#fff1f2",
    primary100: "#ffe4e6",
    primary200: "#fecdd3",
    primary300: "#fda4af",
    primary400: "#fb7185",
    primary500: "#ef4444",   // Main brand accent
    primary600: "#dc2626",   // Buttons, CTAs
    primary700: "#991b1b",   // Gradient end
    primary800: "#7f1d1d",
    primary900: "#450a0a",
    neon:       "#ff3333",   // Glow / neon highlight

    // Dark theme backgrounds
    bgDark:     "#050505",
    bgPanel:    "#0A0A0A",
    bgLight:    "#f5f5f7",

    // Halo / glow (used in gradients)
    haloRgba:   "220,38,38",  // rgba triplet — usage: rgba(${haloRgba}, 0.14)
  },

  /* ── Fonts ─────────────────────────────────────────────────── */
  fonts: {
    sans:  "'Inter', system-ui, sans-serif",
    mono:  "'JetBrains Mono', monospace",
    googleImport: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap",
  },

  /* ── Email branding ────────────────────────────────────────── */
  email: {
    from:       "TFXS Affiliates <noreply@theforexskyline.com>",
    subjectTag: "TFXS Affiliates",  // Prefix for all email subjects
  },

  /* ── PWA / Manifest ────────────────────────────────────────── */
  pwa: {
    name:        "TFXS Affiliates Elite Dashboard",
    shortName:   "TFXS Affiliates",
    description: "TFXS Affiliate Marketing Platform — Track commissions, deals, and payouts.",
    themeColor:  "#DC2626",
    bgColor:     "#0A0A0A",
  },

  /* ── Page titles ───────────────────────────────────────────── */
  titles: {
    login:    "Login",
    index:    "Elite Dashboard Pro",
    reports:  "Reports",
    deals:    "Broker Deals",
    settings: "Settings",
    admin:    "Control Center",
    assets:   "Marketing Assets",
    email:    "Email Templates Preview",
  },

  /* ── OG descriptions per page ──────────────────────────────── */
  og: {
    index:    "Premium affiliate management dashboard for top-tier forex CPA partners.",
    reports:  "Detailed financial reports and conversion analytics.",
    deals:    "Active CPA commission structures and broker partnerships.",
    settings: "Account settings and preferences.",
    assets:   "Download banners, landing pages and creatives.",
  },
};

/* ── Computed helpers ──────────────────────────────────────────── */
BRAND._title      = (page) => `${BRAND.name} Affiliate | ${BRAND.titles[page] || page}`;
BRAND._ogTitle    = (page) => `${BRAND.nameFull} — ${BRAND.titles[page] || page}`;
BRAND._copyright  = () => `© ${BRAND.year} ${BRAND.company}`;
BRAND._lsKey      = (key) => `${BRAND.storageKey}_${key}`;
BRAND._afpPrefix  = () => `${BRAND.prefix}-`;
BRAND._pdfName    = (type, id) => `${BRAND.prefix}-${type}${id ? "-" + id : ""}.pdf`;

/* ── Tailwind brand palette (for inline config) ────────────────── */
BRAND._tailwindBrand = () => ({
  50:   BRAND.colors.primary50,
  100:  BRAND.colors.primary100,
  200:  BRAND.colors.primary200,
  300:  BRAND.colors.primary300,
  400:  BRAND.colors.primary400,
  500:  BRAND.colors.primary500,
  600:  BRAND.colors.primary600,
  700:  BRAND.colors.primary700,
  800:  BRAND.colors.primary800,
  900:  BRAND.colors.primary900,
  dark: BRAND.colors.bgDark,
  panel: BRAND.colors.bgPanel,
});

/* ── CSS custom properties injection ───────────────────────────── */
BRAND._injectCSS = () => {
  const root = document.documentElement;
  root.style.setProperty("--brand-50",   BRAND.colors.primary50);
  root.style.setProperty("--brand-100",  BRAND.colors.primary100);
  root.style.setProperty("--brand-200",  BRAND.colors.primary200);
  root.style.setProperty("--brand-300",  BRAND.colors.primary300);
  root.style.setProperty("--brand-400",  BRAND.colors.primary400);
  root.style.setProperty("--brand-500",  BRAND.colors.primary500);
  root.style.setProperty("--brand-600",  BRAND.colors.primary600);
  root.style.setProperty("--brand-700",  BRAND.colors.primary700);
  root.style.setProperty("--brand-800",  BRAND.colors.primary800);
  root.style.setProperty("--brand-900",  BRAND.colors.primary900);
  root.style.setProperty("--brand-neon", BRAND.colors.neon);
  root.style.setProperty("--brand-dark", BRAND.colors.bgDark);
  root.style.setProperty("--brand-panel",BRAND.colors.bgPanel);
  root.style.setProperty("--brand-halo", BRAND.colors.haloRgba);
  root.style.setProperty("--font-sans",  BRAND.fonts.sans);
  root.style.setProperty("--font-mono",  BRAND.fonts.mono);
};

/* ── Export globally ───────────────────────────────────────────── */
if (typeof window !== "undefined") {
  window.BRAND = BRAND;
  // Auto-inject CSS vars as soon as config loads
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => BRAND._injectCSS());
  } else {
    BRAND._injectCSS();
  }
}
