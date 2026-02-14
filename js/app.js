/**
 * TFXS AFFILIATES - FRONTEND LOGIC & DATA STORE
 * Handles: Data Store, UI Interactions, Notifications
 * 
 * ARCHITECTURE NOTE:
 * This file initializes an empty window.db store.
 * Live data is injected by dashboard.js / reports.js from the backend API.
 * All pages read from window.db — always live-first, no mock data.
 */

/* Flag helpers removed — using native emoji flags from data objects */

// --- 1. LIVE DATA STORE (Populated by dashboard.js / reports.js from backend API) ---
const db = {
    user: {
        id: (window.__tfxsUser && window.__tfxsUser.afp) || "—",
        name: (window.__tfxsUser && window.__tfxsUser.displayName) || "—",
        balance: 0,
        lastPayoutChange: 0,
        wallet: ""
    },
    campaigns: [],
    countries: [],

    // Populated by live data connectors (dashboard.js / reports.js)
    registrations: [],
    earnings: []
};

// Expose DB globally for other pages
window.db = db;

// --- 2. HELPER UTILITIES ---

// --- 3. UI UTILITIES ---
const formatCurrency = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
const formatDate = (date) => new Date(date).toLocaleString('en-US');

// Toast Notification System
function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    const colors = type === 'success' ? 'border-brand-500 text-white' : 'border-red-500 text-white';
    
    toast.className = `px-6 py-4 rounded-xl border border-l-4 ${colors} shadow-2xl transform translate-y-10 opacity-0 transition-all duration-300 pointer-events-auto flex items-center gap-3 min-w-[300px]`;
    toast.style.cssText = 'background: rgba(10,10,10,0.55); backdrop-filter: blur(20px) saturate(1.4); -webkit-backdrop-filter: blur(20px) saturate(1.4);';
    toast.innerHTML = `
        <div class="rounded-full bg-white/10 p-1">
             ${type === 'success' 
                ? '<svg class="w-4 h-4 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" /></svg>'
                : '<svg class="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>'}
        </div>
        <div>
            <h4 class="text-xs font-bold uppercase tracking-wider text-gray-400">${type === 'success' ? 'Success' : 'Notification'}</h4>
            <p class="text-sm font-medium">${((window.TFXS_API && window.TFXS_API.escapeHtml) || (s => s))(message)}</p>
        </div>
    `;

    container.appendChild(toast);
    requestAnimationFrame(() => {
        toast.classList.remove('translate-y-10', 'opacity-0');
    });
    setTimeout(() => {
        toast.classList.add('translate-y-10', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Copy to Clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Copied to clipboard!');
    });
}

// --- 4. NOTIFICATION SYSTEM (Bell - Data Driven) ---
// Uses live backend when available, falls back to window.db mock data
async function buildNotifications() {
    const list = document.getElementById('notification-list');
    if (!list) return;

    const now = new Date();
    const notifications = [];
    const API = window.TFXS_API;

    let dismissed = [];
    let events = null;
    let adminPending = null; // { pending_affiliates, pending_kyc }

    const isAdmin = localStorage.getItem('is_admin') === 'true';

    // Try to load from live backend
    if (API) {
        try {
            const affiliateId = API.getAffiliateId();
            // Fetch events + dismissed (+ admin pending) in parallel
            const promises = [
                API.fetchNotifications(affiliateId).catch(() => null),
                API.fetchDismissedNotifications(affiliateId).catch(() => null)
            ];
            if (isAdmin) {
                promises.push(API.apiGet('/admin/pending-count').catch(() => null));
            }
            const [eventsRes, dismissedRes, pendingRes] = await Promise.all(promises);

            if (eventsRes && eventsRes.ok) events = eventsRes.data;
            // Merge backend + localStorage dismissed (backend may fail if table missing)
            const backendDismissed = (dismissedRes && dismissedRes.ok) ? (dismissedRes.data || []) : [];
            const localDismissed = JSON.parse(localStorage.getItem('notif-dismissed') || '[]');
            dismissed = [...new Set([...backendDismissed, ...localDismissed])];
            if (pendingRes && pendingRes.ok) adminPending = pendingRes;
        } catch (e) {
            console.warn("[Notif] Backend fetch failed, using local data");
            dismissed = JSON.parse(localStorage.getItem('notif-dismissed') || '[]');
        }
    }

    if (events !== null) {
        // ── Build from LIVE backend events (may be empty — that's fine) ──
        (events || []).forEach(ev => {
            const ctry = (API && API.resolveCountry) ? API.resolveCountry(ev.country) : { flag: '🌐', name: ev.country || 'Unknown' };
            const evDate = new Date(ev.occurred_at);
            const userId = ev.user_id || '—';

            if (ev.event_type === 'registration' || !ev.event_type) {
                notifications.push({
                    type: 'reg', userId, date: evDate, icon: '🟢',
                    title: 'New Registration',
                    desc: `${ctry.flag} ${ctry.name} — ${userId}`,
                    extra: null
                });
            }
            if (ev.event_type === 'ftd') {
                notifications.push({
                    type: 'dep', userId, date: evDate, icon: '🔵',
                    title: 'First Deposit',
                    desc: `${ctry.flag} $${parseFloat(ev.deposit_amount || 0).toFixed(2)} — ${ctry.name}`,
                    extra: null
                });
            }
            if (ev.event_type === 'commission' && parseFloat(ev.commission_amount) > 0) {
                notifications.push({
                    type: 'comm', userId, date: evDate, icon: '🔴',
                    title: 'Commission Earned',
                    desc: `${ctry.flag} $${parseFloat(ev.commission_amount).toFixed(2)} from ${userId}`,
                    extra: null
                });
            }
            if (ev.event_type === 'qualified_cpa') {
                notifications.push({
                    type: 'qcpa', userId, date: evDate, icon: '⭐',
                    title: 'Qualified CPA',
                    desc: `${ctry.flag} ${ctry.name} — ${userId}`,
                    extra: '+1 QFTD'
                });
            }
        });
    } else {
        // ── Fallback: build from window.db mock data ──
        const database = window.db || (typeof db !== 'undefined' ? db : null);
        if (database && database.registrations) {
            database.registrations.forEach(r => {
                if (!r || !r.country) return;
                notifications.push({
                    type: 'reg', userId: r.userId,
                    date: new Date(r.date), icon: '🟢',
                    title: 'New Registration',
                    desc: `${r.country.flag} ${r.country.name} — ${r.userId}`,
                    extra: r.firstDeposit > 0 ? `FTD: $${r.firstDeposit.toFixed(2)}` : null
                });
                if (r.commission > 0) {
                    notifications.push({
                        type: 'comm', userId: r.userId,
                        date: new Date(r.date), icon: '🔴',
                        title: 'Commission Earned',
                        desc: `${r.country.flag} $${r.commission.toFixed(2)} from ${r.userId}`,
                        extra: null
                    });
                }
                if (r.firstDeposit > 0) {
                    notifications.push({
                        type: 'dep', userId: r.userId,
                        date: new Date(r.date), icon: '🔵',
                        title: 'First Deposit',
                        desc: `${r.country.flag} $${r.firstDeposit.toFixed(2)} — ${r.country.name}`,
                        extra: null
                    });
                }
            });
        }
        // Use localStorage dismissed as fallback
        dismissed = JSON.parse(localStorage.getItem('notif-dismissed') || '[]');
    }

    // Sort newest first
    notifications.sort((a, b) => b.date - a.date);

    // Filter out dismissed
    const filtered = notifications.filter(n => {
        const key = `${n.type}-${n.userId}-${n.date.toISOString()}`;
        return !dismissed.includes(key);
    });
    const top = filtered.slice(0, 15);

    list.innerHTML = '';

    // ── Admin: inject pending approval notifications at the top ──
    const adminItems = [];
    if (isAdmin && adminPending) {
        const pa = adminPending.pending_affiliates || 0;
        const pk = adminPending.pending_kyc || 0;
        if (pa > 0) {
            adminItems.push({ type: 'admin-pending-aff', count: pa, icon: '👤', title: `${pa} Affiliate${pa > 1 ? 's' : ''} Pending Approval`, desc: 'Click to review and approve/reject', href: '/admin-settings#affiliates', dotColor: 'bg-amber-500' });
        }
        if (pk > 0) {
            adminItems.push({ type: 'admin-pending-kyc', count: pk, icon: '📄', title: `${pk} KYC Submission${pk > 1 ? 's' : ''} Pending`, desc: 'Click to review documents', href: '/admin-settings#kyc', dotColor: 'bg-purple-500' });
        }
    }

    // Update badge count (unread = items from last 7 days that are not dismissed + admin pending items)
    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    const unreadCount = top.filter(n => n.date >= weekAgo).length + adminItems.length;
    const badge = document.getElementById('notif-badge');
    if (badge) {
        badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
        badge.style.display = unreadCount > 0 ? 'flex' : 'none';
    }

    if (top.length === 0 && adminItems.length === 0) {
        list.innerHTML = '<div class="text-xs text-gray-500 text-center py-4">No new notifications</div>';
        return;
    }

    // ── Render admin pending items first (pinned, not dismissible) ──
    const esc = (window.TFXS_API && window.TFXS_API.escapeHtml) || (s => s);
    adminItems.forEach(a => {
        const item = document.createElement('div');
        item.className = 'flex gap-2.5 items-start py-2.5 px-2 -mx-2 border-b border-white/5 cursor-pointer hover:bg-white/5 rounded-lg transition-all';
        item.innerHTML = `
            <div class="w-5 h-5 rounded-full ${a.dotColor}/20 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs">${a.icon}</div>
            <div class="flex-1 min-w-0">
                <div class="flex justify-between items-center gap-2">
                    <span class="text-[11px] font-semibold text-white">${esc(a.title)}</span>
                    <span class="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 uppercase">Action</span>
                </div>
                <p class="text-[10px] text-gray-400">${esc(a.desc)}</p>
            </div>
        `;
        item.addEventListener('click', () => { window.location.href = a.href; });
        list.appendChild(item);
    });

    // Separator between admin items and regular notifications
    if (adminItems.length > 0 && top.length > 0) {
        const sep = document.createElement('div');
        sep.className = 'h-px bg-white/10 my-1';
        list.appendChild(sep);
    }

    top.forEach(n => {
        // Time ago
        const diffMs = now - n.date;
        const diffMin = Math.floor(diffMs / 60000);
        const diffHr = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHr / 24);
        let ago;
        if (diffMin < 1) ago = 'now';
        else if (diffMin < 60) ago = `${diffMin}m`;
        else if (diffHr < 24) ago = `${diffHr}h`;
        else ago = `${diffDay}d`;

        const dotColor = n.type === 'comm' ? 'bg-red-500' : n.type === 'dep' ? 'bg-blue-500' : n.type === 'qcpa' ? 'bg-amber-500' : 'bg-green-500';

        const item = document.createElement('div');
        item.className = 'flex gap-2.5 items-start py-2 border-b border-white/5 last:border-0 cursor-pointer hover:bg-white/5 rounded-lg px-2 -mx-2 transition-all';
        item.innerHTML = `
            <div class="w-1.5 h-1.5 rounded-full ${dotColor} mt-1.5 flex-shrink-0 shadow-[0_0_6px_currentColor]"></div>
            <div class="flex-1 min-w-0">
                <div class="flex justify-between items-center gap-2">
                    <span class="text-[11px] font-semibold text-white truncate">${esc(n.title)}</span>
                    <span class="text-[9px] font-mono text-gray-600 whitespace-nowrap">${ago}</span>
                </div>
                <p class="text-[10px] text-gray-400 truncate">${esc(n.desc)}</p>
                ${n.extra ? `<p class="text-[10px] text-brand-500 font-medium mt-0.5">${esc(n.extra)}</p>` : ''}
            </div>
        `;

        // Click → dismiss notification, navigate to Reports & highlight the event
        item.addEventListener('click', async () => {
            const dismissKey = `${n.type}-${n.userId}-${n.date.toISOString()}`;

            // Save highlight target
            localStorage.setItem('notif-highlight', JSON.stringify({
                userId: n.userId,
                type: n.type,
                date: n.date.toISOString()
            }));

            // Dismiss on backend + localStorage
            if (API) {
                const affiliateId = API.getAffiliateId();
                API.dismissNotification(affiliateId, dismissKey).catch(() => {});
            }
            const localDismissed = JSON.parse(localStorage.getItem('notif-dismissed') || '[]');
            if (!localDismissed.includes(dismissKey)) localDismissed.push(dismissKey);
            localStorage.setItem('notif-dismissed', JSON.stringify(localDismissed));

            // Animate removal
            item.style.transition = 'all 0.3s ease';
            item.style.opacity = '0';
            item.style.transform = 'translateX(20px)';
            item.style.maxHeight = item.offsetHeight + 'px';
            setTimeout(() => {
                item.style.maxHeight = '0';
                item.style.padding = '0';
                item.style.margin = '0';
                item.style.borderWidth = '0';
            }, 150);

            // Update badge count immediately
            const badge = document.getElementById('notif-badge');
            if (badge) {
                let count = parseInt(badge.textContent) || 0;
                if (count > 0) {
                    count--;
                    badge.textContent = count > 9 ? '9+' : count;
                    if (count <= 0) badge.style.display = 'none';
                }
            }

            // Navigate after animation
            setTimeout(() => { window.location.href = '/reports'; }, 400);
        });

        list.appendChild(item);
    });
}

// --- 5. INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("[TFXS] DB store initialized (empty) — waiting for live data from API...");
    
    // Bind Global Events
    document.querySelectorAll('[data-copy]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const text = e.target.getAttribute('data-copy') || e.target.closest('[data-copy]').getAttribute('data-copy');
            copyToClipboard(text);
        });
    });

    // Initialize Notification Dropdown Logic (Bell)
    const bellBtn = document.querySelector('.notification-bell-btn');
    if (bellBtn) {
        const dropdown = document.createElement('div');
        dropdown.id = 'notification-dropdown';
        dropdown.className = 'absolute top-12 right-0 w-80 bg-[#0A0A0A] border border-white/10 rounded-xl shadow-2xl z-[9999] hidden px-5 py-4';
        dropdown.innerHTML = `
            <div class="flex justify-between items-center mb-3 border-b border-white/5 pb-2">
                <h3 class="text-xs font-bold text-white uppercase tracking-wider">Notifications</h3>
                <span class="bg-brand-500 text-white text-[10px] px-1.5 py-0.5 rounded">Live</span>
            </div>
            <div class="space-y-0 max-h-[360px] overflow-y-auto" id="notification-list">
                <div class="text-xs text-gray-500 text-center py-4">Loading...</div>
            </div>
        `;
        bellBtn.parentElement.classList.add('relative');
        bellBtn.parentElement.appendChild(dropdown);

        bellBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('hidden');
            // Clear any previous auto-dismiss timer
            if (dropdown._autoDismissTimer) { clearTimeout(dropdown._autoDismissTimer); dropdown._autoDismissTimer = null; }
            // Build/refresh notifications on open
            if (!dropdown.classList.contains('hidden')) {
                // On mobile (<640px), position fixed near the bell
                if (window.innerWidth < 640) {
                    // Mobile: let CSS handle positioning (absolute from parent)
                    dropdown.style.position = '';
                    dropdown.style.top = '';
                    dropdown.style.left = '';
                    dropdown.style.right = '';
                    dropdown.style.width = '';
                } else {
                    dropdown.style.position = '';
                    dropdown.style.top = '';
                    dropdown.style.left = '';
                    dropdown.style.right = '';
                    dropdown.style.width = '';
                }
                buildNotifications();
                // Play subtle notification sound
                if (typeof playNotifSound === 'function') playNotifSound(660, 0.04, 0.12);
                // Auto-dismiss after 7 seconds
                dropdown._autoDismissTimer = setTimeout(() => {
                    dropdown.classList.add('hidden');
                    dropdown._autoDismissTimer = null;
                }, 7000);
            }
        });
        document.addEventListener('click', () => dropdown.classList.add('hidden'));
        dropdown.addEventListener('click', (e) => e.stopPropagation());
    }

    // Build notifications on load (for badge count)
    setTimeout(buildNotifications, 300);

    // === MOBILE MENU TOGGLE (works on all pages) ===
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const navLinks = document.getElementById('nav-links');
    console.log('[TFXS] Mobile menu init:', !!mobileMenuToggle, !!navLinks);
    if (mobileMenuToggle && navLinks) {
        // Create a PORTAL mobile menu on <body> to escape nav's backdrop-filter stacking context
        const mobileMenuPortal = document.createElement('div');
        mobileMenuPortal.id = 'mobile-menu-portal';
        mobileMenuPortal.className = 'hidden';
        mobileMenuPortal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:99999;pointer-events:none;';
        
        // Backdrop overlay (click to close)
        const backdrop = document.createElement('div');
        backdrop.style.cssText = 'position:absolute;inset:0;background:rgba(0,0,0,0.3);pointer-events:auto;';
        mobileMenuPortal.appendChild(backdrop);
        
        // Menu panel
        const menuPanel = document.createElement('div');
        menuPanel.id = 'mobile-menu-panel';
        const isLight = document.documentElement.classList.contains('light-theme');
        menuPanel.style.cssText = `position:absolute;top:56px;left:12px;right:12px;padding:6px;border-radius:0.75rem;pointer-events:auto;backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);box-shadow:0 12px 40px rgba(0,0,0,${isLight ? '0.12' : '0.5'});border:1px solid ${isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'};background:${isLight ? 'rgba(255,255,255,0.97)' : 'rgba(20,20,20,0.97)'};`;
        
        // Clone nav links into the portal
        const links = navLinks.querySelectorAll('a');
        links.forEach(link => {
            const a = document.createElement('a');
            a.href = link.href;
            a.textContent = link.textContent;
            a.dataset.i18n = link.dataset.i18n || '';
            const isActive = link.classList.contains('text-brand-500');
            a.style.cssText = `display:block;width:100%;padding:12px 20px;text-align:center;border-radius:0.5rem;font-size:0.85rem;font-weight:${isActive ? '600' : '500'};text-decoration:none;transition:background 0.15s;color:${isActive ? '#dc2626' : (isLight ? '#374151' : '#d1d5db')};background:${isActive ? (isLight ? 'rgba(220,38,38,0.08)' : 'rgba(255,255,255,0.1)') : 'transparent'};`;
            a.addEventListener('mouseenter', () => { a.style.background = isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)'; });
            a.addEventListener('mouseleave', () => { a.style.background = isActive ? (isLight ? 'rgba(220,38,38,0.08)' : 'rgba(255,255,255,0.1)') : 'transparent'; });
            menuPanel.appendChild(a);
        });
        
        mobileMenuPortal.appendChild(menuPanel);
        document.body.appendChild(mobileMenuPortal);
        
        // Define open/close BEFORE adding event listeners (safe for all browsers)
        function openMobileMenu() {
            console.log('[TFXS] Opening mobile menu portal');
            // Update theme colors each time
            const lt = document.documentElement.classList.contains('light-theme');
            menuPanel.style.background = lt ? 'rgba(255,255,255,0.97)' : 'rgba(20,20,20,0.97)';
            menuPanel.style.borderColor = lt ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';
            menuPanel.style.boxShadow = `0 12px 40px rgba(0,0,0,${lt ? '0.12' : '0.5'})`;
            backdrop.style.background = lt ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.3)';
            
            // Re-sync link text & href from the real nav (auth.js may have changed them for admin)
            const realLinks = navLinks.querySelectorAll('a');
            const portalLinks = menuPanel.querySelectorAll('a');
            realLinks.forEach((rl, i) => {
                if (portalLinks[i]) {
                    portalLinks[i].textContent = rl.textContent;
                    portalLinks[i].href = rl.href;
                }
            });
            
            // Update link colors for current theme
            menuPanel.querySelectorAll('a').forEach(a => {
                const isActive = a.style.fontWeight === '600';
                a.style.color = isActive ? '#dc2626' : (lt ? '#374151' : '#d1d5db');
            });
            mobileMenuPortal.classList.remove('hidden');
            mobileMenuToggle.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>';
        }
        
        function closeMobileMenu() {
            mobileMenuPortal.classList.add('hidden');
            mobileMenuToggle.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>';
        }
        
        // Wire up event listeners (after function declarations)
        backdrop.addEventListener('click', closeMobileMenu);
        
        mobileMenuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = !mobileMenuPortal.classList.contains('hidden');
            if (isOpen) closeMobileMenu();
            else openMobileMenu();
        });
        
        document.addEventListener('click', (e) => {
            if (!mobileMenuPortal.contains(e.target) && !mobileMenuToggle.contains(e.target)) {
                closeMobileMenu();
            }
        });
    }
});
