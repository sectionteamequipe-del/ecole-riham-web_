/* ═══════════════════════════════════════════════════════════
   shell.js — AppShell principal + gestion du profil
   ═══════════════════════════════════════════════════════════ */

const Shell = (() => {

  // État courant
  let _username = "";
  let _role     = "";
  let _nom      = "";
  let _currentMenu = 0;
  let _menus    = [];
  let _onLogin  = null;  // callback pour se reconnecter

  /* ─────────────────────────────────────────
     Menus par rôle
     ───────────────────────────────────────── */
  function _getMenus(role) {
    if (role === "gerante") return [
      ["Tableau de bord",   "📊",  () => Gerante.dashGerante()],
      ["Inscriptions",      "📝",  () => Gerante.inscriptions()],
      ["Liste élèves",      "📋",  () => Gerante.listeElevesClasses()],
      ["Paiements",         "💰",  () => Gerante.paiements()],
      ["Absences élèves",   "🎒",  () => Gerante.absencesEleves()],
      ["Absences profs",    "📋",  () => Gerante.absencesProfs()],
      ["Demandes",          "📬",  () => Gerante.demandesGerante()],
      ["Examens & Notes",   "📚",  () => Gerante.examensGerante()],
      ["Salaires",          "💼",  () => Gerante.salairesGerante()],
      ["Retraits dossiers", "📁",  () => Gerante.retraits()],
      ["Maîtresses",        "👩‍🏫", () => Gerante.voirMaitresses()],
      ["Archive",           "🗄",  () => Gerante.archiveGerante()],
    ];
    if (role === "directrice") return [
      ["Tableau de bord",      "📊",  () => Directrice.dashDirectrice()],
      ["Valider inscriptions", "✅",  () => Directrice.validerInscriptions()],
      ["Liste élèves",         "📋",  () => Directrice.listeElevesDir()],
      ["Suivi paiements",      "💰",  () => Directrice.suiviPaiements()],
      ["Absences profs",       "📋",  () => Directrice.validerAbsProfs()],
      ["Demandes",             "📬",  () => Directrice.traiterDemandes()],
      ["Salaires",             "💼",  () => Directrice.salairesDirectrice()],
      ["Maîtresses",           "👩‍🏫", () => Directrice.voirMaitressesDir()],
    ];
    // professeur
    return [
      ["Mon espace",        "🏠",  () => Professeur.espaceProf()],
      ["Mes élèves",        "📋",  () => Professeur.mesEleves()],
      ["Absences élèves",   "🎒",  () => Professeur.saisirAbsences()],
      ["Signaler absence",  "📢",  () => Professeur.signalerAbsenceProf()],
      ["Demandes",          "📬",  () => Professeur.deposerDemande()],
      ["Planifier examens", "📅",  () => Professeur.planifierExamensProf()],
      ["Saisie des notes",  "📝",  () => Professeur.saisieNotesProf()],
    ];
  }

  /* ─────────────────────────────────────────
     Initialisation du shell
     ───────────────────────────────────────── */
  function launch(username, role, nom, onLoginCb) {
    _username = username;
    _role     = role;
    _nom      = nom;
    _onLogin  = onLoginCb;
    _menus    = _getMenus(role);

    const pal = CFG.ROLE_PALETTE[role] || CFG.ROLE_PALETTE.gerante;

    // Appliquer la palette de couleurs
    const sidebar = document.getElementById("sidebar");
    sidebar.style.setProperty("--sidebar-color", pal.sidebar);

    // Injecter CSS variables pour ce rôle
    document.documentElement.style.setProperty("--role-sidebar", pal.sidebar);
    document.documentElement.style.setProperty("--role-accent",  pal.accent);
    document.documentElement.style.setProperty("--role-gold",    pal.gold);

    // Profil sidebar
    document.getElementById("sb-icon").textContent = CFG.ROLE_ICON[role] || "👤";
    document.getElementById("sb-name").textContent = nom;
    document.getElementById("sb-role").textContent = CFG.ROLE_LABEL[role] || role.toUpperCase();
    document.getElementById("sb-profile").style.background = pal.accent;

    // Construire la navigation
    const nav = document.getElementById("sb-nav");
    nav.innerHTML = "";
    _menus.forEach(([label, icon, fn], idx) => {
      const btn = document.createElement("button");
      btn.className = "nav-btn";
      btn.innerHTML = `${icon} ${label}`;
      btn.addEventListener("click", () => navigate(idx));
      nav.appendChild(btn);
    });

    // Boutons footer sidebar
    document.getElementById("sb-notif-btn").onclick  = showNotifications;
    document.getElementById("sb-profile-btn").onclick = showProfile;
    document.getElementById("sb-logout-btn").onclick  = logout;

    // Initialiser les modules
    const shellProxy = {
      username: _username, nom: _nom, role: _role,
      navigate, _currentMenu: 0
    };
    Gerante.init(shellProxy);
    Directrice.init(shellProxy);
    Professeur.init(shellProxy);

    // Afficher l'app
    UI.showScreen("app");

    // Navigation vers le 1er menu
    navigate(0);

    // Polling notifications (20s)
    _pollNotifs();
  }

  /* ─────────────────────────────────────────
     Navigation
     ───────────────────────────────────────── */
  function navigate(idx) {
    _currentMenu = idx;

    // Mettre à jour les modules avec le menu courant
    Gerante._currentMenu    = idx;
    Directrice._currentMenu = idx;
    Professeur._currentMenu = idx;

    // Surligner le bouton actif
    document.querySelectorAll(".nav-btn").forEach((b, i) => {
      b.classList.toggle("active", i === idx);
    });

    // Appeler la fonction de page
    if (_menus[idx]) _menus[idx][2]();
  }

  /* ─────────────────────────────────────────
     Notifications
     ───────────────────────────────────────── */
  async function showNotifications() {
    const rows = await DB.query(
      "SELECT * FROM notifications WHERE username=? ORDER BY date DESC LIMIT 30",
      [_username]
    );
    // Marquer tout comme lu
    await DB.exec("UPDATE notifications SET lu=1 WHERE username=?", [_username]);
    document.getElementById("notif-badge").style.display = "none";

    const items = rows.length ? rows.map(r => `
      <div class="notif-item">
        <div class="notif-dot notif-dot-${r.level||"info"}"></div>
        <div>
          <div style="font-size:12px">${UI.esc(r.msg)}</div>
          <div class="notif-meta">${r.date||""}</div>
        </div>
      </div>
    `).join("") : `<div class="empty-state"><p>Aucune notification</p></div>`;

    UI.modal("🔔 Notifications", items);
  }

  async function _pollNotifs() {
    try {
      const rows = await DB.query(
        "SELECT COUNT(*) as n FROM notifications WHERE username=? AND lu=0", [_username]
      );
      const n = rows[0]?.n || 0;
      const badge = document.getElementById("notif-badge");
      if (badge) {
        badge.textContent    = n;
        badge.style.display  = n > 0 ? "inline" : "none";
      }
    } catch { /* silencieux */ }
    // Reprendre dans 20s
    setTimeout(_pollNotifs, 20000);
  }

  /* ─────────────────────────────────────────
     Profil
     ───────────────────────────────────────── */
  async function showProfile() {
    const profil = await DB.query("SELECT * FROM profils_utilisateurs WHERE username=?", [_username]);
    const p = profil[0] || {};
    UI.modal("👤 Mon Profil", `
      <div class="form-grid">
        <div class="form-group" style="grid-column:1/-1;text-align:center">
          <span style="font-size:48px">${CFG.ROLE_ICON[_role]||"👤"}</span>
          <p style="font-weight:700;color:var(--accent);font-size:14px;margin-top:4px">${UI.esc(_nom)}</p>
          <p style="font-size:11px;color:var(--muted)">${_username}</p>
          <span class="badge badge-info">${CFG.ROLE_LABEL[_role]||_role}</span>
        </div>
        <div class="form-group"><label>Téléphone</label>
          <input id="prof-tel" value="${UI.esc(p.telephone||"")}" placeholder="0600000000"/></div>
        <div class="form-group"><label>Email</label>
          <input id="prof-email" type="email" value="${UI.esc(p.email||"")}" placeholder="email@example.com"/></div>
        <div class="form-group"><label>Nouveau mot de passe</label>
          <input id="prof-pwd1" type="password" placeholder="Laisser vide = inchangé"/></div>
        <div class="form-group"><label>Confirmer mot de passe</label>
          <input id="prof-pwd2" type="password" placeholder="Confirmation"/></div>
      </div>
    `, `<button class="btn btn-primary" onclick="Shell._saveProfile()">💾 Enregistrer</button>
        <button class="btn btn-outline" onclick="UI.closeModal()">Annuler</button>`);
  }

  async function _saveProfile() {
    const tel   = document.getElementById("prof-tel")?.value?.trim()   || "";
    const email = document.getElementById("prof-email")?.value?.trim() || "";
    const pwd1  = document.getElementById("prof-pwd1")?.value || "";
    const pwd2  = document.getElementById("prof-pwd2")?.value || "";

    if (pwd1 && pwd1 !== pwd2) {
      UI.toast("Les mots de passe ne correspondent pas", "error"); return;
    }

    await DB.exec(`
      INSERT OR REPLACE INTO profils_utilisateurs VALUES (?,?,?,?,?)
    `, [_username, tel, email, "", UI.today()]);

    if (pwd1) {
      const hashed = await DB.hashPwd(pwd1);
      await DB.exec("UPDATE users SET pwd=? WHERE username=?", [hashed, _username]);
    }

    UI.closeModal();
    UI.toast("Profil mis à jour", "success");
  }

  /* ─────────────────────────────────────────
     Déconnexion
     ───────────────────────────────────────── */
  function logout() {
    UI.confirm("Se déconnecter ?", () => {
      _username = ""; _role = ""; _nom = "";
      Auth.showWelcome(_onLogin);
    });
  }

  /* ─────────────────────────────────────────
     Proxy public (exposé pour les modules)
     ───────────────────────────────────────── */
  return {
    launch, navigate,
    showNotifications, showProfile, _saveProfile,
    logout,
    // Getter pour les modules
    get username() { return _username; },
    get nom()      { return _nom; },
    get role()     { return _role; },
    get _currentMenu() { return _currentMenu; }
  };
})();

// ── Patch: ensure modules can call navigate via Shell ──
// (fixes "Gerante._listeElevesClasses_" which calls navigate)
// This is already handled since Gerante.init receives a proxy.
// But we also need to fix the proxy .navigate reference:
