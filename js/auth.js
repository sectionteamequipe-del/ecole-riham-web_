/* ═══════════════════════════════════════════
   auth.js — WelcomeScreen + LoginScreen
   ═══════════════════════════════════════════ */

const Auth = (() => {

  let _roleHint  = "";
  let _roleLabel = "";
  let _onLogin   = null;

  /* ── Welcome screen ── */
  function showWelcome(onLoginCb) {
    _onLogin = onLoginCb;
    UI.showScreen("welcome");
    document.querySelectorAll(".role-card").forEach(card => {
      card.onclick = () => {
        _roleHint  = card.dataset.role;
        _roleLabel = card.dataset.label;
        _showLogin();
      };
    });
  }

  /* ── Login screen ── */
  function _showLogin() {
    // Applique la couleur du rôle
    const pal = CFG.ROLE_PALETTE[_roleHint] || CFG.ROLE_PALETTE.gerante;
    const sidebar = document.getElementById("login-sidebar");
    sidebar.style.background = pal.sidebar;
    document.getElementById("login-role-label").textContent = _roleLabel;
    document.getElementById("login-role-label").style.color = pal.gold;

    document.getElementById("login-err").textContent = "";
    document.getElementById("login-user").value = "";
    document.getElementById("login-pwd").value  = "";

    UI.showScreen("login");

    // Bouton retour
    document.getElementById("back-link").onclick = () => showWelcome(_onLogin);
    const dbConfigLink = document.getElementById("db-config-link");
    if (dbConfigLink) dbConfigLink.onclick = _showDbConfig;

    // Toggle password
    document.getElementById("eye-btn").onclick = () => {
      const pwd = document.getElementById("login-pwd");
      const eye = document.getElementById("eye-btn");
      if (pwd.type === "password") { pwd.type = "text"; eye.textContent = "🙈"; }
      else                         { pwd.type = "password"; eye.textContent = "👁"; }
    };

    // Connexion
    document.getElementById("connect-btn").onclick = _doLogin;
    document.getElementById("login-pwd").onkeydown = e => { if (e.key === "Enter") _doLogin(); };
    document.getElementById("login-user").focus();
  }

  function _showDbConfig() {
    UI.modal(
      "Configuration de la base",
      `<p style="padding:8px 0;color:var(--muted)">Pour vous connecter, collez ici le jeton Turso prive. Il reste uniquement dans ce navigateur et n'est pas publie sur GitHub.</p>
       <label class="field-label">Jeton Turso prive</label>
       <input type="password" id="cfg-turso-token" class="field-input" placeholder="Coller le jeton ici" autocomplete="off" />`,
      `<button class="btn btn-primary" id="save-db-config">Enregistrer</button>
       <button class="btn btn-outline" onclick="UI.closeModal()">Annuler</button>`
    );

    setTimeout(() => {
      const input = document.getElementById("cfg-turso-token");
      const save = document.getElementById("save-db-config");
      if (input) input.focus();
      if (input && CFG.hasTursoToken()) input.placeholder = "Jeton deja enregistre sur cet appareil";
      if (save) {
        save.onclick = () => {
          CFG.setTursoToken(input?.value || "");
          UI.closeModal();
          UI.toast("Configuration enregistree sur cet appareil.", "success");
        };
      }
    }, 50);
  }

  async function _doLogin() {
    const btn = document.getElementById("connect-btn");
    const err = document.getElementById("login-err");
    const u   = document.getElementById("login-user").value.trim();
    const p   = document.getElementById("login-pwd").value;

    if (!u || !p) { err.textContent = "❌ Veuillez remplir tous les champs"; return; }

    btn.disabled    = true;
    btn.textContent = "Connexion…";
    err.textContent = "";

    try {
      const rows = await DB.query("SELECT * FROM users WHERE username=?", [u]);
      if (!rows.length) { _loginFail(err, btn); return; }

      const user    = rows[0];
      const hashed  = await DB.hashPwd(p);
      if (user.pwd !== hashed) { _loginFail(err, btn); return; }

      const role = user.role;
      // Vérifier correspondance espace <-> rôle
      const ok =
        (_roleHint === "gerante"    && role === "gerante")    ||
        (_roleHint === "directrice" && role === "directrice") ||
        (_roleHint === "professeur" && role === "professeur");

      if (!ok) {
        const names = { gerante:"Gérante", directrice:"Directrice", professeur:"Professeur(e)" };
        err.textContent = `❌ Ce compte appartient à l'espace ${names[role] || role}.`;
        _resetBtn(btn);
        return;
      }

      if (_onLogin) _onLogin(u, role, user.nom);

    } catch (e) {
      if (DB.isConfigError?.(e)) {
        err.textContent = "Veuillez configurer la base Turso pour continuer.";
        _resetBtn(btn);
        _showDbConfig();
        return;
      }
      err.textContent = "❌ Erreur de connexion : " + e.message;
      _resetBtn(btn);
    }
  }

  function _loginFail(err, btn) {
    err.textContent = "❌ Identifiant ou mot de passe incorrect";
    _resetBtn(btn);
  }
  function _resetBtn(btn) {
    btn.disabled    = false;
    btn.textContent = "Se connecter →";
  }

  return { showWelcome };
})();
/* ═══════════════════════════════════════════
   auth.js — WelcomeScreen + LoginScreen
   ═══════════════════════════════════════════ */

const Auth = (() => {

  let _roleHint  = "";
  let _roleLabel = "";
  let _onLogin   = null;

  /* ── Welcome screen ── */
  function showWelcome(onLoginCb) {
    _onLogin = onLoginCb;
    UI.showScreen("welcome");
    document.querySelectorAll(".role-card").forEach(card => {
      card.onclick = () => {
        _roleHint  = card.dataset.role;
        _roleLabel = card.dataset.label;
        _showLogin();
      };
    });
  }

  /* ── Login screen ── */
  function _showLogin() {
    // Applique la couleur du rôle
    const pal = CFG.ROLE_PALETTE[_roleHint] || CFG.ROLE_PALETTE.gerante;
    const sidebar = document.getElementById("login-sidebar");
    sidebar.style.background = pal.sidebar;
    document.getElementById("login-role-label").textContent = _roleLabel;
    document.getElementById("login-role-label").style.color = pal.gold;

    document.getElementById("login-err").textContent = "";
    document.getElementById("login-user").value = "";
    document.getElementById("login-pwd").value  = "";

    UI.showScreen("login");

    // Bouton retour
    document.getElementById("back-link").onclick = () => showWelcome(_onLogin);
    const dbConfigLink = document.getElementById("db-config-link");
    if (dbConfigLink) dbConfigLink.onclick = _showDbConfig;

    // Toggle password
    document.getElementById("eye-btn").onclick = () => {
      const pwd = document.getElementById("login-pwd");
      const eye = document.getElementById("eye-btn");
      if (pwd.type === "password") { pwd.type = "text"; eye.textContent = "🙈"; }
      else                         { pwd.type = "password"; eye.textContent = "👁"; }
    };

    // Connexion
    document.getElementById("connect-btn").onclick = _doLogin;
    document.getElementById("login-pwd").onkeydown = e => { if (e.key === "Enter") _doLogin(); };
    document.getElementById("login-user").focus();
  }

  function _showDbConfig() {
    UI.modal(
      "Configuration de la base",
      `<p style="padding:8px 0;color:var(--muted)">Le jeton Turso reste uniquement dans ce navigateur. Il n'est pas publie sur GitHub.</p>
       <label class="field-label">Jeton Turso prive</label>
       <input type="password" id="cfg-turso-token" class="field-input" placeholder="Coller le jeton ici" autocomplete="off" />`,
      `<button class="btn btn-primary" id="save-db-config">Enregistrer</button>
       <button class="btn btn-outline" onclick="UI.closeModal()">Annuler</button>`
    );

    setTimeout(() => {
      const input = document.getElementById("cfg-turso-token");
      const save = document.getElementById("save-db-config");
      if (input) input.focus();
      if (save) {
        save.onclick = () => {
          CFG.setTursoToken(input?.value || "");
          UI.closeModal();
          UI.toast("Configuration enregistree sur cet appareil.", "success");
        };
      }
    }, 50);
  }

  async function _doLogin() {
    const btn = document.getElementById("connect-btn");
    const err = document.getElementById("login-err");
    const u   = document.getElementById("login-user").value.trim();
    const p   = document.getElementById("login-pwd").value;

    if (!u || !p) { err.textContent = "❌ Veuillez remplir tous les champs"; return; }

    btn.disabled    = true;
    btn.textContent = "Connexion…";
    err.textContent = "";

    try {
      const rows = await DB.query("SELECT * FROM users WHERE username=?", [u]);
      if (!rows.length) { _loginFail(err, btn); return; }

      const user    = rows[0];
      const hashed  = await DB.hashPwd(p);
      if (user.pwd !== hashed) { _loginFail(err, btn); return; }

      const role = user.role;
      // Vérifier correspondance espace <-> rôle
      const ok =
        (_roleHint === "gerante"    && role === "gerante")    ||
        (_roleHint === "directrice" && role === "directrice") ||
        (_roleHint === "professeur" && role === "professeur");

      if (!ok) {
        const names = { gerante:"Gérante", directrice:"Directrice", professeur:"Professeur(e)" };
        err.textContent = `❌ Ce compte appartient à l'espace ${names[role] || role}.`;
        _resetBtn(btn);
        return;
      }

      if (_onLogin) _onLogin(u, role, user.nom);

    } catch (e) {
      err.textContent = "❌ Erreur de connexion : " + e.message;
      _resetBtn(btn);
    }
  }

  function _loginFail(err, btn) {
    err.textContent = "❌ Identifiant ou mot de passe incorrect";
    _resetBtn(btn);
  }
  function _resetBtn(btn) {
    btn.disabled    = false;
    btn.textContent = "Se connecter →";
  }

  return { showWelcome };
})();
