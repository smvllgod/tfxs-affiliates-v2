/**
 * TFXS AFFILIATES — API Layer v2
 * Connects the frontend dashboard to the TFXS backend on Render.
 * JWT-only authentication — no static tokens.
 */

const API_BASE = "https://api.theforexskyline.com";

// ── Affiliate ID management ──────────────────────────────
function getAffiliateId() {
  // Admin sees global data — no affiliate filter
  if (localStorage.getItem("is_admin") === "true") return null;
  let id = localStorage.getItem("affiliate_id");
  // Return null if not set — API works without it (returns all data)
  return id || null;
}

function setAffiliateId(id) {
  if (id && id.trim()) {
    localStorage.setItem("affiliate_id", id.trim());
  }
}

function clearAffiliateId() {
  localStorage.removeItem("affiliate_id");
}

// ── Generic GET helper (with timeout + retry for Render cold starts) ──
async function apiGet(path, retries = 2) {
  const url = `${API_BASE}${path}`;
  const jwtToken = localStorage.getItem('tfxs_jwt');

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const headers = {};
      if (jwtToken) headers['Authorization'] = `Bearer ${jwtToken}`;

      const res = await fetch(url, { signal: controller.signal, headers });
      clearTimeout(timeout);

      if (res.status === 401) { localStorage.removeItem("tfxs_jwt"); localStorage.removeItem("affiliate_id"); localStorage.removeItem("is_admin"); window.location.replace("/login"); return; }
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API ${res.status}: ${text}`);
      }
      return res.json();
    } catch (err) {
      if (attempt < retries && err.name !== "TypeError") {
        console.warn(`[TFXS API] Attempt ${attempt + 1} failed, retrying in 3s...`, err.message);
        await new Promise(r => setTimeout(r, 3000));
        continue;
      }
      throw err;
    }
  }
}

// ── Generic PUT/POST/PATCH/DELETE helper ─────────────────
async function apiSend(method, path, body) {
  const url = `${API_BASE}${path}`;
  const jwtToken = localStorage.getItem('tfxs_jwt');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  const headers = { "Content-Type": "application/json" };
  if (jwtToken) headers['Authorization'] = `Bearer ${jwtToken}`;

  const res = await fetch(url, {
    method,
    headers,
    body: JSON.stringify(body),
    signal: controller.signal
  });
  clearTimeout(timeout);

  if (res.status === 401) { localStorage.removeItem("tfxs_jwt"); localStorage.removeItem("affiliate_id"); localStorage.removeItem("is_admin"); window.location.replace("/login"); return; }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
}

// ── Exported fetch functions ─────────────────────────────

/** Get the currently selected broker filter (empty string = all) */
function getSelectedBroker() {
  const el = document.getElementById('broker-filter');
  return el ? el.value : '';
}

/** Fetch broker list for filter dropdown */
async function fetchBrokers() {
  return apiGet('/api/brokers');
}

/** KPI summary: { registrations, ftd, qualified_cpa, total_commission } */
async function fetchSummary(affiliateId) {
  const params = [];
  if (affiliateId) params.push(`affiliate_id=${encodeURIComponent(affiliateId)}`);
  const broker = getSelectedBroker();
  if (broker) params.push(`broker=${encodeURIComponent(broker)}`);
  const qs = params.length ? `?${params.join('&')}` : '';
  return apiGet(`/api/summary${qs}`);
}

/** Latest 50 conversion events */
async function fetchEvents(affiliateId) {
  const params = [];
  if (affiliateId) params.push(`affiliate_id=${encodeURIComponent(affiliateId)}`);
  const broker = getSelectedBroker();
  if (broker) params.push(`broker=${encodeURIComponent(broker)}`);
  const qs = params.length ? `?${params.join('&')}` : '';
  return apiGet(`/api/events${qs}`);
}

/** Broker deals for this affiliate */
async function fetchDeals(affiliateId) {
  const qs = affiliateId ? `?affiliate_id=${encodeURIComponent(affiliateId)}` : "";
  return apiGet(`/api/deals${qs}`);
}

/**
 * Reports: totals + daily breakdown + country breakdown
 * @param {string} affiliateId
 * @param {string} from  YYYY-MM-DD
 * @param {string} to    YYYY-MM-DD
 */
async function fetchReports(affiliateId, from, to) {
  const params = [];
  if (affiliateId) params.push(`affiliate_id=${encodeURIComponent(affiliateId)}`);
  if (from) params.push(`from=${from}`);
  if (to)   params.push(`to=${to}`);
  const broker = getSelectedBroker();
  if (broker) params.push(`broker=${encodeURIComponent(broker)}`);
  const qs = params.length > 0 ? `?${params.join("&")}` : "";
  return apiGet(`/api/reports${qs}`);
}

/** Get affiliate settings (profile + wallet) */
async function fetchSettings(affiliateId) {
  const qs = affiliateId ? `?affiliate_id=${encodeURIComponent(affiliateId)}` : "";
  return apiGet(`/api/settings${qs}`);
}

/** Save affiliate settings */
async function saveSettings(data) {
  return apiSend("PUT", "/api/settings", data);
}

/** Get latest notification events */
async function fetchNotifications(affiliateId, since) {
  const params = [];
  if (affiliateId) params.push(`affiliate_id=${encodeURIComponent(affiliateId)}`);
  if (since) params.push(`since=${encodeURIComponent(since)}`);
  const qs = params.length > 0 ? `?${params.join("&")}` : "";
  return apiGet(`/api/notifications${qs}`);
}

/** Get dismissed notification keys */
async function fetchDismissedNotifications(affiliateId) {
  const qs = affiliateId ? `?affiliate_id=${encodeURIComponent(affiliateId)}` : "";
  return apiGet(`/api/notifications/dismissed${qs}`);
}

/** Dismiss a notification */
async function dismissNotification(affiliateId, notificationKey) {
  return apiSend("POST", "/api/notifications/dismiss", {
    affiliate_id: affiliateId || "default",
    notification_key: notificationKey
  });
}

/** Get payout balance (available, earned, paid, pending) */
async function fetchPayoutBalance(affiliateId) {
  const qs = affiliateId ? `?affiliate_id=${encodeURIComponent(affiliateId)}` : "";
  return apiGet(`/api/payout/balance${qs}`);
}

/** Request a payout */
async function requestPayout(data) {
  return apiSend("POST", "/api/payout/request", data);
}

/** Get payout history */
async function fetchPayoutHistory(affiliateId) {
  const qs = affiliateId ? `?affiliate_id=${encodeURIComponent(affiliateId)}` : "";
  return apiGet(`/api/payout/history${qs}`);
}

/** Get payout schedule (from admin settings, per-affiliate or system default) */
async function fetchPayoutSchedule(affiliateId) {
  const qs = affiliateId ? `?affiliate_id=${encodeURIComponent(affiliateId)}` : "";
  return apiGet(`/api/payout-schedule${qs}`);
}

/** Get ROI formula setting (per-affiliate or system default) */
async function fetchRoiSettings(affiliateId) {
  const qs = affiliateId ? `?affiliate_id=${encodeURIComponent(affiliateId)}` : "";
  return apiGet(`/api/roi-settings${qs}`);
}

// ── Error banner helper ──────────────────────────────────
function showError(msg) {
  let banner = document.getElementById("error_banner");
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "error_banner";
    banner.className = "fixed top-4 left-1/2 -translate-x-1/2 z-[9999] max-w-lg w-full px-5 py-3 rounded-xl border border-red-500/30 bg-red-500/10 backdrop-blur-md text-red-400 text-sm font-mono shadow-lg transition-all";
    document.body.appendChild(banner);
  }
  banner.textContent = msg;
  banner.style.display = "block";
  banner.style.opacity = "1";
  // Auto-hide after 8s
  clearTimeout(banner._timer);
  banner._timer = setTimeout(() => {
    banner.style.opacity = "0";
    setTimeout(() => { banner.style.display = "none"; }, 400);
  }, 8000);
}

function hideError() {
  const banner = document.getElementById("error_banner");
  if (banner) { banner.style.display = "none"; }
}

// ── Country code → full name, flag emoji, GPS coords ──────
// Shared across all pages (dashboard, reports, deals)
const COUNTRY_MAP = {
  AF:{name:"Afghanistan",coords:[67.71,33.94]},AL:{name:"Albania",coords:[20.17,41.15]},
  DZ:{name:"Algeria",coords:[1.66,28.03]},AO:{name:"Angola",coords:[17.87,-11.20]},
  AR:{name:"Argentina",coords:[-63.62,-38.42]},AU:{name:"Australia",coords:[133.77,-25.27]},
  AT:{name:"Austria",coords:[14.55,47.52]},AZ:{name:"Azerbaijan",coords:[47.58,40.14]},
  BH:{name:"Bahrain",coords:[50.64,26.07]},BD:{name:"Bangladesh",coords:[90.36,23.68]},
  BE:{name:"Belgium",coords:[4.47,50.50]},BJ:{name:"Benin",coords:[2.32,9.31]},
  BO:{name:"Bolivia",coords:[-63.59,-16.29]},BR:{name:"Brazil",coords:[-51.92,-14.24]},
  BG:{name:"Bulgaria",coords:[25.49,42.73]},BF:{name:"Burkina Faso",coords:[-1.56,12.24]},
  KH:{name:"Cambodia",coords:[104.99,12.57]},CM:{name:"Cameroon",coords:[12.35,7.37]},
  CA:{name:"Canada",coords:[-106.34,56.13]},CL:{name:"Chile",coords:[-71.54,-35.68]},
  CN:{name:"China",coords:[104.19,35.86]},CO:{name:"Colombia",coords:[-74.30,4.57]},
  CD:{name:"Congo (DRC)",coords:[21.76,-4.04]},CR:{name:"Costa Rica",coords:[-83.75,9.75]},
  CI:{name:"Côte d'Ivoire",coords:[-5.55,7.54]},HR:{name:"Croatia",coords:[15.2,45.1]},
  CY:{name:"Cyprus",coords:[33.43,35.13]},CZ:{name:"Czech Republic",coords:[15.47,49.82]},
  DK:{name:"Denmark",coords:[9.50,56.26]},DO:{name:"Dominican Republic",coords:[-70.16,18.74]},
  EC:{name:"Ecuador",coords:[-78.18,-1.83]},EG:{name:"Egypt",coords:[30.80,26.82]},
  SV:{name:"El Salvador",coords:[-88.90,13.79]},EE:{name:"Estonia",coords:[25.01,58.60]},
  ET:{name:"Ethiopia",coords:[40.49,9.15]},FI:{name:"Finland",coords:[25.75,61.92]},
  FR:{name:"France",coords:[2.21,46.22]},GA:{name:"Gabon",coords:[11.61,-0.80]},
  GE:{name:"Georgia",coords:[43.36,42.32]},DE:{name:"Germany",coords:[10.45,51.16]},
  GH:{name:"Ghana",coords:[-1.02,7.95]},GR:{name:"Greece",coords:[21.82,39.07]},
  GT:{name:"Guatemala",coords:[-90.23,15.78]},GN:{name:"Guinea",coords:[-9.70,9.95]},
  HN:{name:"Honduras",coords:[-86.24,15.20]},HK:{name:"Hong Kong",coords:[114.11,22.40]},
  HU:{name:"Hungary",coords:[19.50,47.16]},IS:{name:"Iceland",coords:[-19.02,64.96]},
  IN:{name:"India",coords:[78.96,20.59]},ID:{name:"Indonesia",coords:[113.92,-0.79]},
  IQ:{name:"Iraq",coords:[43.68,33.22]},IE:{name:"Ireland",coords:[-8.24,53.41]},
  IL:{name:"Israel",coords:[34.85,31.05]},IT:{name:"Italy",coords:[12.56,41.87]},
  JM:{name:"Jamaica",coords:[-77.30,18.11]},JP:{name:"Japan",coords:[138.25,36.20]},
  JO:{name:"Jordan",coords:[36.24,30.59]},KZ:{name:"Kazakhstan",coords:[66.92,48.02]},
  KE:{name:"Kenya",coords:[37.91,-0.02]},KW:{name:"Kuwait",coords:[47.48,29.31]},
  LV:{name:"Latvia",coords:[24.60,56.88]},LB:{name:"Lebanon",coords:[35.86,33.85]},
  LT:{name:"Lithuania",coords:[23.88,55.17]},LU:{name:"Luxembourg",coords:[6.13,49.82]},
  MG:{name:"Madagascar",coords:[46.87,-18.77]},MY:{name:"Malaysia",coords:[101.98,4.21]},
  ML:{name:"Mali",coords:[-3.99,17.57]},MT:{name:"Malta",coords:[14.38,35.94]},
  MX:{name:"Mexico",coords:[-102.55,23.63]},MA:{name:"Morocco",coords:[-7.09,31.79]},
  MZ:{name:"Mozambique",coords:[35.53,-18.67]},NL:{name:"Netherlands",coords:[5.29,52.13]},
  NZ:{name:"New Zealand",coords:[174.89,-40.90]},NG:{name:"Nigeria",coords:[8.68,9.08]},
  NO:{name:"Norway",coords:[8.47,60.47]},OM:{name:"Oman",coords:[55.98,21.51]},
  PK:{name:"Pakistan",coords:[69.35,30.38]},PA:{name:"Panama",coords:[-80.78,8.54]},
  PY:{name:"Paraguay",coords:[-58.44,-23.44]},PE:{name:"Peru",coords:[-75.02,-9.19]},
  PH:{name:"Philippines",coords:[121.77,12.88]},PL:{name:"Poland",coords:[19.15,51.92]},
  PT:{name:"Portugal",coords:[-8.22,39.40]},QA:{name:"Qatar",coords:[51.18,25.35]},
  RO:{name:"Romania",coords:[24.97,45.94]},RU:{name:"Russia",coords:[105.32,61.52]},
  RW:{name:"Rwanda",coords:[29.87,-1.94]},SA:{name:"Saudi Arabia",coords:[45.08,23.88]},
  SN:{name:"Senegal",coords:[-14.45,14.50]},RS:{name:"Serbia",coords:[21.01,44.02]},
  SG:{name:"Singapore",coords:[103.82,1.35]},SK:{name:"Slovakia",coords:[19.70,48.67]},
  SI:{name:"Slovenia",coords:[14.99,46.15]},ZA:{name:"South Africa",coords:[24.99,-28.74]},
  KR:{name:"South Korea",coords:[127.77,35.91]},ES:{name:"Spain",coords:[-3.74,40.46]},
  LK:{name:"Sri Lanka",coords:[80.77,7.87]},SE:{name:"Sweden",coords:[18.64,60.13]},
  CH:{name:"Switzerland",coords:[8.23,46.82]},TW:{name:"Taiwan",coords:[120.96,23.70]},
  TZ:{name:"Tanzania",coords:[34.89,-6.37]},TH:{name:"Thailand",coords:[100.99,15.87]},
  TN:{name:"Tunisia",coords:[9.54,33.89]},TR:{name:"Turkey",coords:[35.24,38.96]},
  UG:{name:"Uganda",coords:[32.29,1.37]},UA:{name:"Ukraine",coords:[31.17,48.38]},
  AE:{name:"UAE",coords:[53.85,23.42]},GB:{name:"United Kingdom",coords:[-1.17,52.35]},
  US:{name:"USA",coords:[-95.71,37.09]},UY:{name:"Uruguay",coords:[-55.77,-32.52]},
  UZ:{name:"Uzbekistan",coords:[64.59,41.38]},VE:{name:"Venezuela",coords:[-66.59,6.42]},
  VN:{name:"Vietnam",coords:[108.28,14.06]},ZM:{name:"Zambia",coords:[27.85,-13.13]},
  ZW:{name:"Zimbabwe",coords:[29.15,-19.02]},
  TG:{name:"Togo",coords:[1.17,8.62]},BW:{name:"Botswana",coords:[24.68,-22.33]},
  NA:{name:"Namibia",coords:[18.49,-22.96]},ML:{name:"Mali",coords:[-3.99,17.57]},
  NE:{name:"Niger",coords:[8.08,17.61]},TD:{name:"Chad",coords:[18.73,15.45]},
  MR:{name:"Mauritania",coords:[-10.94,21.01]},SO:{name:"Somalia",coords:[46.20,5.15]},
  LR:{name:"Liberia",coords:[-9.43,6.43]},SL:{name:"Sierra Leone",coords:[-11.78,8.46]},
  BI:{name:"Burundi",coords:[29.92,-3.37]},ER:{name:"Eritrea",coords:[39.78,15.18]},
  MW:{name:"Malawi",coords:[34.30,-13.25]},LS:{name:"Lesotho",coords:[28.23,-29.61]},
  SZ:{name:"Eswatini",coords:[31.47,-26.52]},DJ:{name:"Djibouti",coords:[42.59,11.83]},
  KM:{name:"Comoros",coords:[43.87,-11.88]},MU:{name:"Mauritius",coords:[57.55,-20.35]},
  CV:{name:"Cape Verde",coords:[-23.63,16.00]},GW:{name:"Guinea-Bissau",coords:[-15.18,11.80]},
  CF:{name:"Central African Republic",coords:[20.94,6.61]},CG:{name:"Congo",coords:[15.83,-0.23]},
  GQ:{name:"Equatorial Guinea",coords:[10.27,1.65]},SS:{name:"South Sudan",coords:[31.31,6.88]},
  SD:{name:"Sudan",coords:[30.22,12.86]},LY:{name:"Libya",coords:[17.23,26.34]}
};

function codeToFlag(code) {
  if (!code || code.length !== 2) return "🌐";
  const upper = code.toUpperCase();
  return String.fromCodePoint(...[...upper].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
}

function resolveCountry(code) {
  const c = (code || "").toUpperCase().trim();
  let entry = COUNTRY_MAP[c];
  // Fallback: try matching by country name (case-insensitive)
  if (!entry) {
    const lower = (code || "").toLowerCase().trim();
    for (const [k, v] of Object.entries(COUNTRY_MAP)) {
      if (v.name.toLowerCase() === lower) {
        entry = v;
        return { code: k, name: entry.name, coords: entry.coords, flag: codeToFlag(k) };
      }
    }
  }
  return {
    code: c || "XX",
    name: entry ? entry.name : c || "Unknown",
    coords: entry ? entry.coords : [0, 0],
    flag: codeToFlag(c)
  };
}

// ── XSS escape helper ────────────────────────────────────
function escapeHtml(str) {
  if (!str) return "";
  const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(str).replace(/[&<>"']/g, c => map[c]);
}

/** Fetch current user info (GET /me) */
async function fetchMe() { return apiGet("/me"); }

/** Change password (PATCH /api/auth/password) */
async function changePassword(currentPassword, newPassword) {
  return apiSend("PATCH", "/api/auth/password", { current_password: currentPassword, new_password: newPassword });
}

/** Broker UID Prefix Management */
async function fetchBrokerPrefixes() { return apiGet("/admin/broker-prefixes"); }
async function addBrokerPrefixAPI(prefix, broker_name) { return apiSend("POST", "/admin/broker-prefixes", { prefix, broker_name }); }
async function deleteBrokerPrefixAPI(id) {
  const headers = {};
  const jwt = localStorage.getItem('tfxs_jwt');
  if (jwt) headers['Authorization'] = `Bearer ${jwt}`;
  const res = await fetch(`${API_BASE}/admin/broker-prefixes/${id}`, { method: "DELETE", headers });
  if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
  return res.json();
}

// ── Make available globally (no ES modules in static pages) ──
window.TFXS_API = {
  API_BASE,
  apiGet,
  apiSend,
  getAffiliateId,
  setAffiliateId,
  clearAffiliateId,
  getSelectedBroker,
  fetchBrokers,
  fetchMe,
  changePassword,
  fetchBrokerPrefixes,
  addBrokerPrefixAPI,
  deleteBrokerPrefixAPI,
  fetchSummary,
  fetchEvents,
  fetchDeals,
  fetchReports,
  fetchSettings,
  saveSettings,
  fetchNotifications,
  fetchDismissedNotifications,
  dismissNotification,
  fetchPayoutBalance,
  requestPayout,
  fetchPayoutHistory,
  fetchPayoutSchedule,
  fetchRoiSettings,
  showError,
  hideError,
  escapeHtml,
  resolveCountry,
  codeToFlag
};
