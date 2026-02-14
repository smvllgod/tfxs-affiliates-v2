/**
 * TFXS AFFILIATES — Internationalization (i18n) v2.0
 * Supports: English, Français, Español
 *
 * Usage: Add data-i18n="key" to any element.
 * For placeholders: data-i18n-ph="key"
 * For title/tooltip: data-i18n-title="key"
 */

(function () {
  "use strict";

  const LANGS = {
    en: { label: "EN", flag: "🇬🇧", code: "gb", name: "English", dir: "ltr" },
    fr: { label: "FR", flag: "🇫🇷", code: "fr", name: "Français", dir: "ltr" },
    es: { label: "ES", flag: "🇪🇸", code: "es", name: "Español", dir: "ltr" }
  };

  const T = {
    // ── Navigation ──
    "nav.dashboard":         { en: "Dashboard",   fr: "Tableau de bord", es: "Panel" },
    "nav.reports":           { en: "Reports",     fr: "Rapports",        es: "Informes" },
    "nav.deals":             { en: "Deals",       fr: "Offres",          es: "Ofertas" },
    "nav.assets":            { en: "Assets",      fr: "Ressources",      es: "Recursos" },
    "nav.settings":          { en: "Settings",    fr: "Paramètres",      es: "Ajustes" },
    "nav.admin":             { en: "Admin",       fr: "Admin",           es: "Admin" },
    "nav.serverTime":        { en: "SERVER TIME", fr: "HEURE SERVEUR",   es: "HORA SERVIDOR" },
    "nav.live":              { en: "LIVE",        fr: "EN DIRECT",       es: "EN VIVO" },

    // ── Dashboard / Index ──
    "dash.myBalance":        { en: "My balance",   fr: "Mon solde",       es: "Mi saldo" },
    "dash.globalOverview":   { en: "GLOBAL OVERVIEW", fr: "VUE GLOBALE", es: "VISTA GLOBAL" },
    "dash.vsLastPayout":     { en: "VS LAST PAYOUT", fr: "VS DERNIER RETRAIT", es: "VS ÚLTIMO PAGO" },
    "dash.managePayouts":    { en: "MANAGE PAYOUTS", fr: "GÉRER LES RETRAITS", es: "GESTIONAR PAGOS" },
    "dash.requestPayout":    { en: "REQUEST PAYOUT", fr: "DEMANDER UN RETRAIT", es: "SOLICITAR PAGO" },
    "dash.quickShare":       { en: "Quick Share",  fr: "Partage rapide",  es: "Compartir rápido" },
    "dash.yourRefLinks":     { en: "YOUR REFERRAL LINKS", fr: "VOS LIENS DE PARRAINAGE", es: "TUS ENLACES DE REFERENCIA" },
    "dash.selectBroker":     { en: "SELECT BROKER", fr: "SÉLECTIONNER BROKER", es: "SELECCIONAR BROKER" },
    "dash.copy":             { en: "Copy",         fr: "Copier",          es: "Copiar" },
    "dash.timeframe":        { en: "Timeframe:",   fr: "Période :",       es: "Periodo:" },
    "dash.monthToDate":      { en: "Month to Date", fr: "Mois en cours", es: "Mes actual" },
    "dash.today":            { en: "Today",        fr: "Aujourd'hui",     es: "Hoy" },
    "dash.yesterday":        { en: "Yesterday",    fr: "Hier",            es: "Ayer" },
    "dash.last7":            { en: "Last 7 Days",  fr: "7 derniers jours", es: "Últimos 7 días" },
    "dash.last30":           { en: "Last 30 Days", fr: "30 derniers jours", es: "Últimos 30 días" },
    "dash.prevMonth":        { en: "Previous Month", fr: "Mois précédent", es: "Mes anterior" },
    "dash.ytd":              { en: "Year to Date", fr: "Année en cours",  es: "Año actual" },
    "dash.allTime":          { en: "All Time",     fr: "Tout le temps",   es: "Todo el tiempo" },
    "dash.update":           { en: "Update",       fr: "Actualiser",      es: "Actualizar" },
    "dash.commission":       { en: "Commission",   fr: "Commission",      es: "Comisión" },
    "dash.registrations":    { en: "Registrations", fr: "Inscriptions",   es: "Registros" },
    "dash.ftd":              { en: "FTD",          fr: "FTD",             es: "FTD" },
    "dash.qftd":             { en: "QFTD",         fr: "QFTD",           es: "QFTD" },
    "dash.roi":              { en: "ROI",          fr: "ROI",             es: "ROI" },
    "dash.revenueAnalytics": { en: "Revenue Analytics", fr: "Analyse des revenus", es: "Análisis de ingresos" },
    "dash.realTimeFeed":     { en: "REAL-TIME DATA FEED", fr: "FLUX DE DONNÉES EN DIRECT", es: "DATOS EN TIEMPO REAL" },
    "dash.liveActivity":     { en: "LIVE ACTIVITY", fr: "ACTIVITÉ EN DIRECT", es: "ACTIVIDAD EN VIVO" },
    "dash.expand":           { en: "EXPAND",       fr: "AGRANDIR",        es: "EXPANDIR" },
    "dash.online":           { en: "ONLINE",       fr: "EN LIGNE",        es: "EN LÍNEA" },
    "dash.recentTx":         { en: "Recent Transactions", fr: "Transactions récentes", es: "Transacciones recientes" },
    "dash.allCountries":     { en: "All Countries", fr: "Tous les pays", es: "Todos los países" },
    "dash.allAmounts":       { en: "All Amounts",  fr: "Tous les montants", es: "Todos los montos" },
    "dash.userId":           { en: "USER ID",      fr: "ID UTILISATEUR",  es: "ID USUARIO" },
    "dash.affiliate":        { en: "AFFILIATE",    fr: "AFFILIÉ",         es: "AFILIADO" },
    "dash.date":             { en: "DATE",         fr: "DATE",            es: "FECHA" },
    "dash.type":             { en: "TYPE",         fr: "TYPE",            es: "TIPO" },
    "dash.country":          { en: "COUNTRY",      fr: "PAYS",            es: "PAÍS" },
    "dash.amount":           { en: "AMOUNT",       fr: "MONTANT",         es: "MONTO" },
    "dash.status":           { en: "STATUS",       fr: "STATUT",          es: "ESTADO" },
    "dash.regionalDist":     { en: "Regional Distribution", fr: "Répartition régionale", es: "Distribución regional" },
    "dash.regByRegion":      { en: "REGISTRATIONS BY REGION", fr: "INSCRIPTIONS PAR RÉGION", es: "REGISTROS POR REGIÓN" },
    "dash.allRegions":       { en: "All Regions",  fr: "Toutes les régions", es: "Todas las regiones" },
    "dash.top10":            { en: "Top 10 Performing Countries", fr: "Top 10 pays performants", es: "Top 10 países con mejor rendimiento" },
    "dash.commPerCountry":   { en: "COMMISSION PER COUNTRY", fr: "COMMISSION PAR PAYS", es: "COMISIÓN POR PAÍS" },
    "dash.txDetails":        { en: "Transaction Details", fr: "Détails de la transaction", es: "Detalles de la transacción" },
    "dash.connecting":       { en: "Connecting to live data", fr: "Connexion aux données live", es: "Conectando a datos en vivo" },
    "dash.mayTake":          { en: "— may take a few seconds", fr: "— peut prendre quelques secondes", es: "— puede tardar unos segundos" },

    // ── Payout Modal ──
    "payout.title":          { en: "Request Payout", fr: "Demander un retrait", es: "Solicitar pago" },
    "payout.fullBalance":    { en: "FULL BALANCE WITHDRAWAL", fr: "RETRAIT DU SOLDE COMPLET", es: "RETIRO DE SALDO COMPLETO" },
    "payout.available":      { en: "AVAILABLE",    fr: "DISPONIBLE",      es: "DISPONIBLE" },
    "payout.pending":        { en: "PENDING",      fr: "EN ATTENTE",      es: "PENDIENTE" },
    "payout.earned":         { en: "EARNED",       fr: "GAGNÉ",           es: "GANADO" },
    "payout.paid":           { en: "PAID",         fr: "PAYÉ",            es: "PAGADO" },
    "payout.nextPayout":     { en: "NEXT PAYOUT",  fr: "PROCHAIN RETRAIT", es: "PRÓXIMO PAGO" },
    "payout.schedule":       { en: "SCHEDULE",     fr: "CALENDRIER",      es: "CALENDARIO" },
    "payout.withdrawal":     { en: "WITHDRAWAL",   fr: "RETRAIT",         es: "RETIRO" },
    "payout.fullBalMin":     { en: "Full balance · Min $100", fr: "Solde complet · Min 100$", es: "Saldo completo · Mín $100" },
    "payout.network":        { en: "NETWORK",      fr: "RÉSEAU",          es: "RED" },
    "payout.walletAddress":  { en: "WALLET ADDRESS", fr: "ADRESSE DU PORTEFEUILLE", es: "DIRECCIÓN DE BILLETERA" },
    "payout.walletPh":       { en: "Paste your wallet address", fr: "Collez votre adresse de portefeuille", es: "Pegue su dirección de billetera" },
    "payout.networkWarn":    { en: "Verify the network carefully. Wrong network = permanent loss.", fr: "Vérifiez le réseau attentivement. Mauvais réseau = perte définitive.", es: "Verifique la red cuidadosamente. Red incorrecta = pérdida permanente." },
    "payout.submit":         { en: "SUBMIT PAYOUT REQUEST", fr: "SOUMETTRE LA DEMANDE DE RETRAIT", es: "ENVIAR SOLICITUD DE PAGO" },
    "payout.autoEnabled":    { en: "AUTO-PAYOUT ENABLED", fr: "RETRAIT AUTOMATIQUE ACTIVÉ", es: "PAGO AUTOMÁTICO ACTIVADO" },
    "payout.recentPayouts":  { en: "Recent Payouts", fr: "Retraits récents", es: "Pagos recientes" },

    // ── Balance Info Popup ──
    "bal.availBal":          { en: "Available Balance", fr: "Solde disponible", es: "Saldo disponible" },
    "bal.lifetimeEarned":    { en: "Lifetime Earned", fr: "Total gagné à vie", es: "Total ganado" },
    "bal.totalPaid":         { en: "Total Paid",   fr: "Total payé",      es: "Total pagado" },
    "bal.nextPayout":        { en: "Next Payout",  fr: "Prochain retrait", es: "Próximo pago" },
    "bal.kycWarning":        { en: "Complete KYC verification to enable payouts →", fr: "Complétez la vérification KYC pour activer les retraits →", es: "Complete la verificación KYC para habilitar pagos →" },

    // ── Settings ──
    "set.title":             { en: "Settings",    fr: "Paramètres",      es: "Ajustes" },
    "set.subtitle":          { en: "Customise your profile and update payment preferences.", fr: "Personnalisez votre profil et vos préférences de paiement.", es: "Personaliza tu perfil y preferencias de pago." },
    "set.selectAvatar":      { en: "Select Avatar", fr: "Choisir un avatar", es: "Elegir avatar" },
    "set.clickToSelect":     { en: "CLICK TO SELECT", fr: "CLIQUER POUR CHOISIR", es: "CLIC PARA ELEGIR" },
    "set.profileInfo":       { en: "Profile Information", fr: "Informations du profil", es: "Información del perfil" },
    "set.displayName":       { en: "Display Name", fr: "Nom affiché",    es: "Nombre visible" },
    "set.email":             { en: "Email Address", fr: "Adresse e-mail", es: "Correo electrónico" },
    "set.locked":            { en: "Locked",       fr: "Verrouillé",     es: "Bloqueado" },
    "set.payoutSettings":    { en: "Payout Settings", fr: "Paramètres de retrait", es: "Ajustes de pago" },
    "set.autoPayout":        { en: "Auto-Payout",  fr: "Retrait auto",   es: "Pago automático" },
    "set.paymentMethod":     { en: "Payment Method", fr: "Méthode de paiement", es: "Método de pago" },
    "set.walletAddress":     { en: "Wallet Address", fr: "Adresse du portefeuille", es: "Dirección de billetera" },
    "set.walletPlaceholder": { en: "Enter your wallet address", fr: "Entrez votre adresse de portefeuille", es: "Ingrese su dirección de billetera" },
    "set.phone":             { en: "Phone Number",  fr: "Numéro de téléphone", es: "Número de teléfono" },
    "set.phonePlaceholder":  { en: "Enter your phone number", fr: "Entrez votre numéro de téléphone", es: "Ingrese su número de teléfono" },
    "set.address":           { en: "Street Address", fr: "Adresse",        es: "Dirección" },
    "set.addressPlaceholder":{ en: "123 Main Street, Apt 4B", fr: "123 Rue Principale, App 4B", es: "Calle Principal 123, Apto 4B" },
    "set.city":              { en: "City",           fr: "Ville",          es: "Ciudad" },
    "set.cityPlaceholder":   { en: "New York",       fr: "Paris",          es: "Madrid" },
    "set.state":             { en: "State / Province", fr: "État / Province", es: "Estado / Provincia" },
    "set.statePlaceholder":  { en: "NY",             fr: "Île-de-France",  es: "Madrid" },
    "set.zip":               { en: "Postal / ZIP Code", fr: "Code postal",   es: "Código postal" },
    "set.zipPlaceholder":    { en: "10001",          fr: "75001",          es: "28001" },
    "set.country":           { en: "Country",        fr: "Pays",           es: "País" },
    "set.countryPlaceholder":{ en: "United States",  fr: "France",         es: "España" },
    "set.networkWarning":    { en: "Please verify the network carefully. Transfers on the wrong network will be permanently lost.", fr: "Veuillez vérifier le réseau attentivement. Les transferts sur le mauvais réseau seront définitivement perdus.", es: "Verifique la red cuidadosamente. Las transferencias en la red incorrecta se perderán permanentemente." },
    "set.kyc":               { en: "Identity Verification (KYC)", fr: "Vérification d'identité (KYC)", es: "Verificación de identidad (KYC)" },
    "set.kycDesc":           { en: "To enable payouts, please verify your identity by uploading a valid government-issued document.", fr: "Pour activer les retraits, veuillez vérifier votre identité en téléchargeant un document officiel valide.", es: "Para habilitar pagos, verifique su identidad subiendo un documento oficial válido." },
    "set.docType":           { en: "Document Type", fr: "Type de document", es: "Tipo de documento" },
    "set.passport":          { en: "Passport",     fr: "Passeport",      es: "Pasaporte" },
    "set.nationalId":        { en: "National ID Card", fr: "Carte d'identité nationale", es: "Cédula de identidad" },
    "set.driversLicense":    { en: "Driver's License", fr: "Permis de conduire", es: "Licencia de conducir" },
    "set.uploadDocs":        { en: "Upload Document Images", fr: "Télécharger les images du document", es: "Subir imágenes del documento" },
    "set.chooseFiles":       { en: "Choose files",  fr: "Choisir des fichiers", es: "Elegir archivos" },
    "set.submitKyc":         { en: "Submit for Verification", fr: "Soumettre pour vérification", es: "Enviar para verificación" },
    "set.changePassword":    { en: "Change Password", fr: "Changer le mot de passe", es: "Cambiar contraseña" },
    "set.currentPw":         { en: "Current Password", fr: "Mot de passe actuel", es: "Contraseña actual" },
    "set.newPw":             { en: "New Password",  fr: "Nouveau mot de passe", es: "Nueva contraseña" },
    "set.confirmPw":         { en: "Confirm New Password", fr: "Confirmer le nouveau mot de passe", es: "Confirmar nueva contraseña" },
    "set.updatePw":          { en: "Update Password", fr: "Mettre à jour", es: "Actualizar" },
    "set.saveChanges":       { en: "Save Changes",  fr: "Enregistrer",    es: "Guardar cambios" },

    // ── Reports ──
    "rep.title":             { en: "Financial Reports", fr: "Rapports financiers", es: "Informes financieros" },
    "rep.subtitle":          { en: "Detailed breakdown of traffic sources and conversions.", fr: "Détail des sources de trafic et des conversions.", es: "Desglose detallado de fuentes de tráfico y conversiones." },
    "rep.downloadPdf":       { en: "Download PDF", fr: "Télécharger PDF", es: "Descargar PDF" },
    "rep.earningsReport":    { en: "Earnings Report", fr: "Rapport des gains", es: "Informe de ganancias" },
    "rep.registrationReport":{ en: "Registration Report", fr: "Rapport des inscriptions", es: "Informe de registros" },
    "rep.payoutReport":      { en: "Payout Report", fr: "Rapport des retraits", es: "Informe de pagos" },
    "rep.today":             { en: "Today",        fr: "Aujourd'hui",     es: "Hoy" },
    "rep.yesterday":         { en: "Yesterday",    fr: "Hier",            es: "Ayer" },
    "rep.last7":             { en: "Last 7 Days",  fr: "7 derniers jours", es: "Últimos 7 días" },
    "rep.monthToDate":       { en: "Month to Date", fr: "Mois en cours", es: "Mes actual" },
    "rep.custom":            { en: "Custom:",      fr: "Personnalisé :",  es: "Personalizado:" },
    "rep.registrations":     { en: "Registrations", fr: "Inscriptions",   es: "Registros" },
    "rep.ftds":              { en: "FTDs",         fr: "FTDs",            es: "FTDs" },
    "rep.qualifiedCpa":      { en: "Qualified CPA", fr: "CPA qualifié",  es: "CPA calificado" },
    "rep.totalCommission":   { en: "Total Commission", fr: "Commission totale", es: "Comisión total" },
    "rep.dailyEarnings":     { en: "Daily Earnings", fr: "Gains quotidiens", es: "Ganancias diarias" },
    "rep.dailyRegistrations":{ en: "Daily Registrations", fr: "Inscriptions quotidiennes", es: "Registros diarios" },
    "rep.dailyBreakdown":    { en: "Daily Breakdown", fr: "Détail quotidien", es: "Desglose diario" },
    "rep.dailyBreakdownSub": { en: "Day-by-day performance metrics.", fr: "Métriques de performance jour par jour.", es: "Métricas de rendimiento día por día." },
    "rep.date":              { en: "Date",         fr: "Date",            es: "Fecha" },
    "rep.commission":        { en: "Commission",   fr: "Commission",      es: "Comisión" },
    "rep.status":            { en: "Status",       fr: "Statut",          es: "Estado" },
    "rep.exportCsv":         { en: "Export CSV",   fr: "Exporter CSV",    es: "Exportar CSV" },
    "rep.country":           { en: "Country",      fr: "Pays",            es: "País" },
    "rep.userId":            { en: "User ID",      fr: "ID Utilisateur",  es: "ID Usuario" },
    "rep.created":           { en: "Created",      fr: "Créé",            es: "Creado" },
    "rep.firstDeposit":      { en: "First Deposit", fr: "Premier dépôt", es: "Primer depósito" },
    "rep.amount":            { en: "Amount",       fr: "Montant",         es: "Monto" },
    "rep.method":            { en: "Method",       fr: "Méthode",         es: "Método" },
    "rep.notes":             { en: "Notes",        fr: "Notes",           es: "Notas" },
    "rep.invoice":           { en: "Invoice",      fr: "Facture",         es: "Factura" },
    "rep.commType":          { en: "Commission Type", fr: "Type de commission", es: "Tipo de comisión" },
    "rep.id":                { en: "ID",           fr: "ID",              es: "ID" },
    "rep.itemsPerPage":      { en: "Items per page:", fr: "Éléments par page :", es: "Elementos por página:" },
    "rep.searchRegs":        { en: "Search Registrations...", fr: "Rechercher inscriptions...", es: "Buscar registros..." },
    "rep.searchReport":      { en: "Search this report...", fr: "Rechercher dans ce rapport...", es: "Buscar en este informe..." },
    "rep.newSignups":        { en: "New signups and first time deposits.", fr: "Nouvelles inscriptions et premiers dépôts.", es: "Nuevos registros y primeros depósitos." },
    "rep.payoutHistory":     { en: "Complete payout history with invoice downloads.", fr: "Historique complet des retraits avec factures.", es: "Historial completo de pagos con facturas." },
    "rep.detailedComm":      { en: "Detailed commission breakdown.", fr: "Détail des commissions.", es: "Desglose detallado de comisiones." },
    "rep.connecting":        { en: "Connecting to live data", fr: "Connexion aux données live", es: "Conectando a datos en vivo" },
    "rep.mayTake":           { en: "— may take a few seconds", fr: "— peut prendre quelques secondes", es: "— puede tardar unos segundos" },

    // ── Deals ──
    "deals.title":           { en: "Active Commission Structures", fr: "Structures de commissions actives", es: "Estructuras de comisión activas" },
    "deals.subtitle":        { en: "Detailed breakdown of your current CPA deals.", fr: "Détail de vos offres CPA en cours.", es: "Desglose detallado de tus ofertas CPA actuales." },
    "deals.activeSince":     { en: "Active since",  fr: "Actif depuis",   es: "Activo desde" },
    "deals.cpaRate":         { en: "CPA Rate",      fr: "Taux CPA",      es: "Tasa CPA" },
    "deals.geoTargets":      { en: "Geo Targets",   fr: "Cibles géo",    es: "Objetivos geo" },
    "deals.connecting":      { en: "Connecting to live data", fr: "Connexion aux données live", es: "Conectando a datos en vivo" },
    "deals.mayTake":         { en: "— may take a few seconds", fr: "— peut prendre quelques secondes", es: "— puede tardar unos segundos" },

    // ── Assets ──
    "assets.title":          { en: "Marketing Assets", fr: "Ressources marketing", es: "Recursos de marketing" },
    "assets.subtitle":       { en: "Your broker tracking links and marketing creatives.", fr: "Vos liens de suivi broker et créatifs marketing.", es: "Tus enlaces de seguimiento y creativos de marketing." },
    "assets.trackingLinks":  { en: "Your Tracking Links", fr: "Vos liens de suivi", es: "Tus enlaces de seguimiento" },
    "assets.loadingLinks":   { en: "Loading broker links…", fr: "Chargement des liens broker…", es: "Cargando enlaces broker…" },
    "assets.creatives":      { en: "Creatives & Landing Pages", fr: "Créatifs & pages d'atterrissage", es: "Creativos y páginas de destino" },
    "assets.comingSoon":     { en: "Coming Soon", fr: "Bientôt disponible", es: "Próximamente" },
    "assets.bannerDesc":     { en: "High-conversion banners, video sales letters, and pre-built funnels to maximise your traffic ROI.", fr: "Bannières à haute conversion, vidéos de vente et tunnels pré-construits pour maximiser votre ROI.", es: "Banners de alta conversión, cartas de ventas en video y embudos pre-construidos para maximizar tu ROI." },

    // ── Globe / Activity ──
    "globe.liveActivity":    { en: "LIVE ACTIVITY", fr: "ACTIVITÉ EN DIRECT", es: "ACTIVIDAD EN VIVO" },
    "globe.systemOnline":    { en: "SYSTEM ONLINE", fr: "SYSTÈME EN LIGNE", es: "SISTEMA EN LÍNEA" },
    "globe.escClose":        { en: "ESC / CLOSE",  fr: "ÉCHAP / FERMER",  es: "ESC / CERRAR" },
    "globe.latestReg":       { en: "LATEST REGISTRATION", fr: "DERNIÈRE INSCRIPTION", es: "ÚLTIMO REGISTRO" },
    "globe.latestComm":      { en: "LATEST COMMISSION", fr: "DERNIÈRE COMMISSION", es: "ÚLTIMA COMISIÓN" },
    "globe.lifetimeEarnings":{ en: "LIFETIME EARNINGS", fr: "GAINS À VIE", es: "GANANCIAS TOTALES" },

    // ── Common ──
    "common.loading":        { en: "Loading...",    fr: "Chargement...",   es: "Cargando..." },
    "common.noData":         { en: "No data available", fr: "Aucune donnée disponible", es: "Sin datos disponibles" },
    "common.save":           { en: "Save",          fr: "Enregistrer",     es: "Guardar" },
    "common.cancel":         { en: "Cancel",        fr: "Annuler",         es: "Cancelar" },
    "common.close":          { en: "Close",         fr: "Fermer",          es: "Cerrar" },
    "common.search":         { en: "Search...",     fr: "Rechercher...",   es: "Buscar..." },
    "common.approved":       { en: "Approved",      fr: "Approuvé",        es: "Aprobado" },
    "common.rejected":       { en: "Rejected",      fr: "Rejeté",          es: "Rechazado" },
    "common.pending":        { en: "Pending",       fr: "En attente",      es: "Pendiente" },
    "common.amount":         { en: "Amount",        fr: "Montant",         es: "Monto" },
    "common.method":         { en: "Method",        fr: "Méthode",         es: "Método" },
    "common.registration":   { en: "Registration",  fr: "Inscription",     es: "Registro" },

    // ── Theme ──
    "theme.dark":            { en: "Dark",          fr: "Sombre",          es: "Oscuro" },
    "theme.light":           { en: "Light",         fr: "Clair",           es: "Claro" }
  };

  /* ── Public API ── */
  let _currentLang = localStorage.getItem("tfxs_lang") || "en";
  // Migrate old unsupported languages (AR, PT removed in v2)
  if (!LANGS[_currentLang]) { _currentLang = "en"; localStorage.setItem("tfxs_lang", "en"); }

  /** Get a translated string */
  function t(key, fallback) {
    const entry = T[key];
    if (!entry) return fallback || key;
    return entry[_currentLang] || entry.en || fallback || key;
  }

  /** Apply translations to all data-i18n elements on the page */
  function applyTranslations() {
    document.querySelectorAll("[data-i18n]").forEach(el => {
      const key = el.getAttribute("data-i18n");
      const val = t(key);
      if (val && val !== key) el.textContent = val;
    });
    document.querySelectorAll("[data-i18n-ph]").forEach(el => {
      const key = el.getAttribute("data-i18n-ph");
      const val = t(key);
      if (val && val !== key) el.placeholder = val;
    });
    document.querySelectorAll("[data-i18n-title]").forEach(el => {
      const key = el.getAttribute("data-i18n-title");
      const val = t(key);
      if (val && val !== key) el.title = val;
    });
  }

  /** Switch language */
  function setLanguage(lang) {
    if (!LANGS[lang]) return;
    _currentLang = lang;
    localStorage.setItem("tfxs_lang", lang);
    applyTranslations();
    updateLangButton();
  }

  function getLanguage() { return _currentLang; }

  function initLangSelector() {
    const anchor = document.getElementById("lang-selector-anchor");
    if (!anchor) return;

    const currentMeta = LANGS[_currentLang] || LANGS.en;
    const btn = document.createElement("button");
    btn.id = "lang-btn";
    btn.className = "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-gray-300 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-all cursor-pointer";
    btn.innerHTML = `<span class="lang-flag text-base">${currentMeta.flag}</span><span class="lang-code">${currentMeta.label}</span><svg class="w-3 h-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><polyline points="6 9 12 15 18 9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

    const dd = document.createElement("div");
    dd.id = "lang-dropdown";
    dd.className = "absolute top-full right-0 mt-2 w-40 bg-[#0e0e0e] border border-white/10 rounded-xl shadow-2xl z-[999] hidden overflow-hidden";
    rebuildLangDropdown(dd);

    const wrapper = document.createElement("div");
    wrapper.className = "relative";
    wrapper.appendChild(btn);
    wrapper.appendChild(dd);
    anchor.appendChild(wrapper);

    btn.addEventListener("click", e => { e.stopPropagation(); dd.classList.toggle("hidden"); });
    document.addEventListener("click", () => dd.classList.add("hidden"));
    dd.addEventListener("click", e => {
      e.stopPropagation();
      const langBtn = e.target.closest("[data-lang]");
      if (langBtn) { setLanguage(langBtn.dataset.lang); dd.classList.add("hidden"); rebuildLangDropdown(dd); }
    });
  }

  function rebuildLangDropdown(dd) {
    dd.innerHTML = Object.entries(LANGS).map(([code, meta]) => `
      <button data-lang="${code}" class="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-left hover:bg-white/5 transition-colors ${code === _currentLang ? 'text-brand-500 bg-white/[0.03] font-bold' : 'text-gray-300'}">
        <span class="text-base">${meta.flag}</span>
        <span>${meta.name}</span>
        ${code === _currentLang ? '<svg class="w-3 h-3 ml-auto text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>' : ''}
      </button>
    `).join("");
  }

  function updateLangButton() {
    const flag = document.querySelector("#lang-btn .lang-flag");
    const code = document.querySelector("#lang-btn .lang-code");
    const meta = LANGS[_currentLang] || LANGS.en;
    if (flag) flag.textContent = meta.flag;
    if (code) code.textContent = meta.label;
  }

  document.addEventListener("DOMContentLoaded", () => {
    initLangSelector();
    applyTranslations();
  });

  window.TFXS_i18n = { t, setLanguage, getLanguage, applyTranslations, LANGS };
})();
