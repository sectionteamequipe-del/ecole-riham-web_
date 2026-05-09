/* ═══════════════════════════════════════════════════════════
   gerante.js — Pages Gérante (12 menus)
   ═══════════════════════════════════════════════════════════ */

const Gerante = (() => {

  let _shell; // référence AppShell

  function init(shell) { _shell = shell; }

  /* ─────────────────────────────────────────
     1. TABLEAU DE BORD
     ───────────────────────────────────────── */
  async function dashGerante() {
    UI.showLoader(true);
    try {
      const [eleves, paiements, absEleves, absProfs, demandes] = await Promise.all([
        DB.query("SELECT COUNT(*) as n FROM liste_eleves WHERE archive=0"),
        DB.query("SELECT statut, SUM(montant_paye) as total FROM paiements GROUP BY statut"),
        DB.query("SELECT COUNT(*) as n FROM absences_eleves"),
        DB.query("SELECT COUNT(*) as n FROM absences_profs WHERE statut='soumise'"),
        DB.query("SELECT COUNT(*) as n FROM demandes WHERE statut='soumise'"),
      ]);

      const nbEleves = eleves[0]?.n ?? 0;
      const payMap   = Object.fromEntries(paiements.map(r => [r.statut, r.total ?? 0]));
      const totalPay = paiements.reduce((s, r) => s + (parseFloat(r.total) || 0), 0);
      const nbAbsEl  = absEleves[0]?.n ?? 0;
      const nbAbsP   = absProfs[0]?.n  ?? 0;
      const nbDem    = demandes[0]?.n  ?? 0;

      // Répartition par classe
      const byClasse = await DB.query(`
        SELECT classe, COUNT(*) as cnt FROM liste_eleves
        WHERE archive=0 GROUP BY classe ORDER BY cnt DESC
      `);

      // Derniers paiements
      const lastPay = await DB.query(`
        SELECT p.*, e.nom as eleve_nom FROM paiements p
        LEFT JOIN liste_eleves e ON p.eleve_id = e.id
        ORDER BY p.date DESC LIMIT 8
      `);

      UI.setPage(`
        ${UI.pageHeader("📊", "Tableau de bord", "Vue d'ensemble — " + UI.today())}

        <div class="kpi-grid">
          ${UI.kpiBox(nbEleves,  "Élèves inscrits",    "#1A3A5C")}
          ${UI.kpiBox(totalPay.toFixed(0) + " DH", "Total encaissé", "#27AE60")}
          ${UI.kpiBox(nbAbsEl,  "Absences élèves",    "#E67E22")}
          ${UI.kpiBox(nbAbsP,   "Abs. profs en attente","#C0392B")}
          ${UI.kpiBox(nbDem,    "Demandes à traiter",  "#2980B9")}
        </div>

        <div class="dash-grid">
          <!-- Répartition par classe -->
          <div class="card">
            <div class="card-accent-top"></div>
            <div class="card-header"><h3>📋 Effectifs par classe</h3></div>
            <div class="card-content">
              ${byClasse.map(r => `
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                  <span style="font-size:11px;min-width:80px;color:var(--muted)">${UI.esc(r.classe)}</span>
                  <div style="flex:1;background:#F0F4F8;border-radius:4px;height:18px;overflow:hidden">
                    <div style="background:var(--accent);height:100%;width:${Math.min(100,(r.cnt/Math.max(nbEleves,1))*100*3)}%;border-radius:4px;transition:.3s"></div>
                  </div>
                  <span style="font-size:11px;font-weight:700;min-width:24px;text-align:right">${r.cnt}</span>
                </div>`).join("")}
            </div>
          </div>

          <!-- Derniers paiements -->
          <div class="card">
            <div class="card-accent-top"></div>
            <div class="card-header"><h3>💰 Derniers paiements</h3></div>
            <div class="card-content" style="padding:0">
              ${UI.tableHTML(["Élève","Montant","Type","Date","Statut"], lastPay, r => `
                <td>${UI.esc(r.eleve_nom || r.eleve_id || "—")}</td>
                <td><strong>${parseFloat(r.montant_paye||0).toFixed(0)} DH</strong></td>
                <td>${UI.esc(r.type_paiement || "—")}</td>
                <td>${UI.fmtDate(r.date)}</td>
                <td>${UI.statusBadge(r.statut || "—")}</td>
              `)}
            </div>
          </div>
        </div>
        </div>
      `);
    } catch(e) {
      UI.setPage(`<div class="page-body"><p style="color:red">Erreur : ${UI.esc(e.message)}</p></div>`);
    }
  }

  /* ─────────────────────────────────────────
     2. INSCRIPTIONS
     ───────────────────────────────────────── */
  async function inscriptions() {
    UI.showLoader(true);
    try {
      const rows = await DB.query(`
        SELECT h.*, e.classe as e_classe FROM historique_inscriptions h
        LEFT JOIN liste_eleves e ON e.nom_famille = h.eleve_nom
        ORDER BY h.date_soumission DESC
      `);

      UI.setPage(`
        ${UI.pageHeader("📝", "Inscriptions", "Gestion des inscriptions élèves")}
        <div class="actions-row">
          <button class="btn btn-primary" onclick="Gerante._newInscription()">➕ Nouvelle inscription</button>
          <input class="search-input" placeholder="🔍 Rechercher…" oninput="Gerante._filterTable(this,'insc-table')" style="max-width:220px"/>
        </div>
        <div class="card">
          <div class="card-content" style="padding:0" id="insc-table">
            ${UI.tableHTML(["Élève","Classe","Tuteur","Téléphone","Soumission","Statut","Actions"], rows, r => `
              <td>${UI.esc(r.eleve_nom)}</td>
              <td>${UI.esc(r.classe || "—")}</td>
              <td>${UI.esc(r.tuteur)}</td>
              <td>${UI.esc(r.tel)}</td>
              <td>${UI.fmtDate(r.date_soumission)}</td>
              <td>${UI.statusBadge(r.statut)}</td>
              <td>
                <button class="btn btn-sm btn-info" onclick="Gerante._detailInscription('${r.id}')">Détail</button>
                ${r.statut === "en_attente" ? `<button class="btn btn-sm btn-danger" onclick="Gerante._cancelInscription('${r.id}')">Annuler</button>` : ""}
              </td>
            `)}
          </div>
        </div>
        </div>
      `);
    } catch(e) {
      UI.setPage(`<div class="page-body"><p style="color:red">Erreur : ${UI.esc(e.message)}</p></div>`);
    }
  }

  async function _newInscription() {
    UI.modal("➕ Nouvelle inscription", `
      <div class="form-grid">
        <div class="form-group"><label>Nom de famille</label><input id="ins-nom" placeholder="Nom famille"/></div>
        <div class="form-group"><label>Prénom</label><input id="ins-prenom" placeholder="Prénom"/></div>
        <div class="form-group"><label>Date de naissance</label><input id="ins-dob" type="date"/></div>
        <div class="form-group"><label>Lieu de naissance</label><input id="ins-lieu" placeholder="Ville"/></div>
        <div class="form-group"><label>Sexe</label>
          <select id="ins-sexe"><option value="">—</option><option value="ذكر">ذكر (Garçon)</option><option value="أنثى">أنثى (Fille)</option></select>
        </div>
        <div class="form-group"><label>Classe</label>
          <select id="ins-classe">${UI.selectOpts(CFG.CLASSES)}</select>
        </div>
        <div class="form-group"><label>Nom tuteur</label><input id="ins-tuteur" placeholder="Tuteur légal"/></div>
        <div class="form-group"><label>Téléphone</label><input id="ins-tel" placeholder="0600000000"/></div>
      </div>
    `, `<button class="btn btn-primary" onclick="Gerante._saveInscription()">Enregistrer</button>
        <button class="btn btn-outline" onclick="UI.closeModal()">Annuler</button>`);
  }

  async function _saveInscription() {
    const get = id => document.getElementById(id)?.value?.trim() || "";
    const nom   = get("ins-nom"); const prenom = get("ins-prenom");
    const dob   = get("ins-dob"); const lieu   = get("ins-lieu");
    const sexe  = get("ins-sexe"); const classe = get("ins-classe");
    const tuteur= get("ins-tuteur"); const tel  = get("ins-tel");
    if (!nom || !prenom || !classe || !tuteur) {
      UI.toast("Veuillez remplir les champs obligatoires", "warning"); return;
    }
    try {
      const id = DB.shortId();
      const now = UI.today();
      await DB.exec(`
        INSERT INTO historique_inscriptions VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [id, nom+" "+prenom, classe, tuteur, tel, now, null, "en_attente", null, ""]
      );
      // Ajouter aussi dans liste_eleves
      const eid = DB.shortId();
      await DB.exec(`
        INSERT OR IGNORE INTO liste_eleves VALUES (?,?,?,?,?,?,?,?,?,0)`,
        [eid, 0, "", nom, prenom, sexe, UI.fmtDate(dob), lieu, classe]
      );
      await DB.notifyRole("directrice", `Nouvelle inscription : ${nom} ${prenom} — ${classe}`, "info");
      UI.closeModal();
      UI.toast("Inscription enregistrée !", "success");
      inscriptions();
    } catch(e) { UI.toast("Erreur : " + e.message, "error"); }
  }

  async function _detailInscription(id) {
    const rows = await DB.query("SELECT * FROM historique_inscriptions WHERE id=?", [id]);
    if (!rows.length) return;
    const r = rows[0];
    UI.modal("📋 Détail inscription", `
      <table style="width:100%;font-size:12px">
        <tr><td style="color:var(--muted)">Élève</td><td><strong>${UI.esc(r.eleve_nom)}</strong></td></tr>
        <tr><td style="color:var(--muted)">Classe</td><td>${UI.esc(r.classe)}</td></tr>
        <tr><td style="color:var(--muted)">Tuteur</td><td>${UI.esc(r.tuteur)}</td></tr>
        <tr><td style="color:var(--muted)">Téléphone</td><td>${UI.esc(r.tel)}</td></tr>
        <tr><td style="color:var(--muted)">Date soumission</td><td>${UI.fmtDate(r.date_soumission)}</td></tr>
        <tr><td style="color:var(--muted)">Statut</td><td>${UI.statusBadge(r.statut)}</td></tr>
        <tr><td style="color:var(--muted)">Décision par</td><td>${UI.esc(r.decision_par || "—")}</td></tr>
        <tr><td style="color:var(--muted)">Notes</td><td>${UI.esc(r.notes || "—")}</td></tr>
      </table>
    `);
  }

  async function _cancelInscription(id) {
    UI.confirm("Annuler cette inscription ?", async () => {
      await DB.exec("UPDATE historique_inscriptions SET statut='annulée' WHERE id=?", [id]);
      UI.toast("Inscription annulée", "info");
      inscriptions();
    });
  }

  /* ─────────────────────────────────────────
     3. LISTE ÉLÈVES
     ───────────────────────────────────────── */
  async function listeElevesClasses() {
    UI.showLoader(true);
    try {
      const data = await DB.query(`
        SELECT classe, COUNT(*) as cnt FROM liste_eleves
        WHERE archive=0 GROUP BY classe ORDER BY classe
      `);
      UI.setPage(`
        ${UI.pageHeader("📋", "Liste des élèves", "Sélectionnez une classe")}
        <div style="display:flex;flex-wrap:wrap;gap:12px">
          ${data.map(r => `
            <div class="card" style="min-width:160px;cursor:pointer;transition:transform .15s"
              onclick="Gerante._listeElevesPage('${UI.esc(r.classe)}')"
              onmouseenter="this.style.transform='translateY(-3px)'"
              onmouseleave="this.style.transform=''">
              <div class="card-accent-top"></div>
              <div class="card-content" style="text-align:center;padding:20px 16px">
                <div style="font-size:28px">📚</div>
                <div style="font-weight:700;color:var(--accent);margin:8px 0 4px">${UI.esc(r.classe)}</div>
                <div style="font-size:11px;color:var(--muted)">${r.cnt} élève(s)</div>
              </div>
            </div>
          `).join("")}
        </div>
        </div>
      `);
    } catch(e) {
      UI.setPage(`<div class="page-body"><p style="color:red">Erreur : ${UI.esc(e.message)}</p></div>`);
    }
  }

  async function _listeElevesPage(classe) {
    UI.showLoader(true);
    const eleves = await DB.query(`
      SELECT * FROM liste_eleves WHERE classe=? AND archive=0 ORDER BY numero
    `, [classe]);

    UI.setPage(`
      ${UI.pageHeader("📚", `Classe : ${classe}`, `${eleves.length} élève(s)`)}
      <div class="actions-row">
        <button class="btn btn-outline" onclick="Gerante._listeElevesClasses_()">← Retour classes</button>
        <input class="search-input" placeholder="🔍 Rechercher…" oninput="Gerante._filterTable(this,'eleves-table')" style="max-width:200px"/>
      </div>
      <div class="card" id="eleves-table">
        <div class="card-content" style="padding:0">
          ${UI.tableHTML(["N°","Code","Nom","Prénom","Sexe","Date naissance","Lieu naissance","Actions"],
          eleves, r => `
            <td>${UI.esc(r.numero)}</td>
            <td>${UI.esc(r.code)}</td>
            <td class="rtl"><strong>${UI.esc(r.nom_famille)}</strong></td>
            <td class="rtl">${UI.esc(r.prenom)}</td>
            <td>${UI.esc(r.sexe)}</td>
            <td>${UI.fmtDate(r.date_naissance)}</td>
            <td>${UI.esc(r.lieu_naissance)}</td>
            <td>
              <button class="btn btn-sm btn-info" onclick="Gerante._editEleve('${r.id}')">✏️</button>
              <button class="btn btn-sm btn-danger" onclick="Gerante._archiveEleve('${r.id}')">🗑</button>
            </td>
          `)}
        </div>
      </div>
      </div>
    `);
  }
  function _listeElevesClasses_() { listeElevesClasses(); }

  async function _archiveEleve(id) {
    UI.confirm("Archiver cet élève ?", async () => {
      await DB.exec("UPDATE liste_eleves SET archive=1 WHERE id=?", [id]);
      UI.toast("Élève archivé", "success");
      Shell.navigate(Shell._currentMenu);
    });
  }

  async function _editEleve(id) {
    const rows = await DB.query("SELECT * FROM liste_eleves WHERE id=?", [id]);
    if (!rows.length) return;
    const e = rows[0];
    UI.modal("✏️ Modifier élève", `
      <div class="form-grid">
        <div class="form-group"><label>Nom famille</label><input id="ee-nom" value="${UI.esc(e.nom_famille)}"/></div>
        <div class="form-group"><label>Prénom</label><input id="ee-prenom" value="${UI.esc(e.prenom)}"/></div>
        <div class="form-group"><label>Sexe</label>
          <select id="ee-sexe">
            <option value="ذكر" ${e.sexe==="ذكر"?"selected":""}>ذكر</option>
            <option value="أنثى" ${e.sexe==="أنثى"?"selected":""}>أنثى</option>
          </select></div>
        <div class="form-group"><label>Date naissance</label><input id="ee-dob" type="text" value="${UI.esc(e.date_naissance)}"/></div>
        <div class="form-group"><label>Lieu naissance</label><input id="ee-lieu" value="${UI.esc(e.lieu_naissance)}"/></div>
        <div class="form-group"><label>Classe</label>
          <select id="ee-classe">${UI.selectOpts(CFG.CLASSES, e.classe)}</select></div>
      </div>
    `, `<button class="btn btn-primary" onclick="Gerante._saveEleve('${id}')">Enregistrer</button>
        <button class="btn btn-outline" onclick="UI.closeModal()">Annuler</button>`);
  }

  async function _saveEleve(id) {
    const g = x => document.getElementById(x)?.value?.trim() || "";
    await DB.exec(`UPDATE liste_eleves SET nom_famille=?,prenom=?,sexe=?,date_naissance=?,lieu_naissance=?,classe=? WHERE id=?`,
      [g("ee-nom"),g("ee-prenom"),g("ee-sexe"),g("ee-dob"),g("ee-lieu"),g("ee-classe"),id]);
    UI.closeModal(); UI.toast("Élève modifié","success");
    Shell.navigate(Shell._currentMenu);
  }

  /* ─────────────────────────────────────────
     4. PAIEMENTS
     ───────────────────────────────────────── */
  async function paiements() {
    UI.showLoader(true);
    try {
      const rows = await DB.query(`
        SELECT p.*, e.nom_famille||' '||e.prenom as eleve_nom, e.classe
        FROM paiements p
        LEFT JOIN liste_eleves e ON p.eleve_id = e.id
        ORDER BY p.date DESC LIMIT 100
      `);
      const stats = await DB.query(`SELECT SUM(montant_paye) as total, COUNT(*) as n FROM paiements`);

      UI.setPage(`
        ${UI.pageHeader("💰", "Paiements", "Suivi des règlements scolarité")}
        <div class="kpi-grid">
          ${UI.kpiBox((parseFloat(stats[0]?.total)||0).toFixed(0)+" DH","Total encaissé","#27AE60")}
          ${UI.kpiBox(stats[0]?.n || 0,"Nb transactions","#1A3A5C")}
        </div>
        <div class="actions-row">
          <button class="btn btn-primary" onclick="Gerante._newPaiement()">➕ Nouveau paiement</button>
          <input class="search-input" placeholder="🔍 Rechercher élève…" oninput="Gerante._filterTable(this,'pay-table')" style="max-width:220px"/>
        </div>
        <div class="card" id="pay-table">
          <div class="card-content" style="padding:0">
            ${UI.tableHTML(["Élève","Classe","Montant payé","Montant dû","Type","Mois","Date","Statut","Reste"], rows, r => `
              <td>${UI.esc(r.eleve_nom || "—")}</td>
              <td>${UI.esc(r.classe || "—")}</td>
              <td style="color:var(--success);font-weight:700">${parseFloat(r.montant_paye||0).toFixed(0)} DH</td>
              <td>${parseFloat(r.montant_du||0).toFixed(0)} DH</td>
              <td>${UI.esc(r.type_paiement||"—")}</td>
              <td>${UI.esc(r.mois||"—")}</td>
              <td>${UI.fmtDate(r.date)}</td>
              <td>${UI.statusBadge(r.statut||"—")}</td>
              <td style="color:${parseFloat(r.reste||0)>0?"var(--danger)":"var(--success)"}">
                ${parseFloat(r.reste||0).toFixed(0)} DH</td>
            `)}
          </div>
        </div>
        </div>
      `);
    } catch(e) {
      UI.setPage(`<div class="page-body"><p style="color:red">Erreur : ${UI.esc(e.message)}</p></div>`);
    }
  }

  async function _newPaiement() {
    const eleves = await DB.query("SELECT id, nom_famille||' '||prenom as nom, classe FROM liste_eleves WHERE archive=0 ORDER BY nom_famille");
    UI.modal("💰 Nouveau paiement", `
      <div class="form-grid">
        <div class="form-group" style="grid-column:1/-1"><label>Élève</label>
          <select id="pay-eleve"><option value="">— Choisir —</option>
            ${eleves.map(e => `<option value="${e.id}">${UI.esc(e.nom)} (${e.classe})</option>`).join("")}
          </select></div>
        <div class="form-group"><label>Montant payé (DH)</label><input id="pay-mont" type="number" min="0" placeholder="0"/></div>
        <div class="form-group"><label>Montant dû (DH)</label><input id="pay-du" type="number" min="0" placeholder="0"/></div>
        <div class="form-group"><label>Type de paiement</label>
          <select id="pay-type">
            <option value="mensualité">Mensualité</option>
            <option value="inscription">Inscription</option>
            <option value="assurance">Assurance</option>
            <option value="autre">Autre</option>
          </select></div>
        <div class="form-group"><label>Mois</label>
          <select id="pay-mois">${UI.selectOpts(CFG.MOIS)}</select></div>
        <div class="form-group"><label>Statut</label>
          <select id="pay-statut">
            <option value="payé">Payé</option>
            <option value="partiel">Partiel</option>
            <option value="impayé">Impayé</option>
          </select></div>
      </div>
    `, `<button class="btn btn-success" onclick="Gerante._savePaiement()">Enregistrer</button>
        <button class="btn btn-outline" onclick="UI.closeModal()">Annuler</button>`);
  }

  async function _savePaiement() {
    const g = x => document.getElementById(x)?.value?.trim() || "";
    const eleveId = g("pay-eleve");
    const mont    = parseFloat(g("pay-mont")) || 0;
    const du      = parseFloat(g("pay-du"))   || 0;
    if (!eleveId) { UI.toast("Sélectionnez un élève","warning"); return; }
    const reste = Math.max(0, du - mont);
    await DB.exec(
      "INSERT INTO paiements VALUES (?,?,?,?,?,?,?,?,?)",
      [DB.shortId(), eleveId, mont, du, g("pay-type"), g("pay-mois"), UI.today(), g("pay-statut"), reste]
    );
    await DB.addNotif(_shell.username, `Paiement enregistré — ${g("pay-type")} ${g("pay-mois")}`, "success");
    UI.closeModal(); UI.toast("Paiement enregistré","success");
    paiements();
  }

  /* ─────────────────────────────────────────
     5. ABSENCES ÉLÈVES
     ───────────────────────────────────────── */
  async function absencesEleves() {
    UI.showLoader(true);
    const rows = await DB.query(`
      SELECT * FROM absences_eleves ORDER BY date DESC LIMIT 100
    `);
    UI.setPage(`
      ${UI.pageHeader("🎒", "Absences élèves", "Relevé des absences")}
      <div class="actions-row">
        <input class="search-input" placeholder="🔍 Rechercher…" oninput="Gerante._filterTable(this,'abs-el-table')"/>
      </div>
      <div class="card" id="abs-el-table">
        <div class="card-content" style="padding:0">
          ${UI.tableHTML(["Élève","Classe","Prof","Date","Motif","Justification","Statut"], rows, r => `
            <td class="rtl">${UI.esc(r.eleve)}</td>
            <td>${UI.esc(r.classe)}</td>
            <td class="rtl">${UI.esc(r.prof)}</td>
            <td>${UI.fmtDate(r.date)}</td>
            <td>${UI.esc(r.motif || "—")}</td>
            <td>${UI.esc(r.justif || "—")}</td>
            <td>${UI.statusBadge(r.statut || "non justifiée")}</td>
          `)}
        </div>
      </div>
      </div>
    `);
  }

  /* ─────────────────────────────────────────
     6. ABSENCES PROFS
     ───────────────────────────────────────── */
  async function absencesProfs() {
    UI.showLoader(true);
    const rows = await DB.query("SELECT * FROM absences_profs ORDER BY date DESC");
    const gerRows = await DB.query("SELECT * FROM absences_profs_gerante ORDER BY date DESC");
    UI.setPage(`
      ${UI.pageHeader("📋", "Absences professeurs", "Gestion des absences")}
      <div class="tab-bar">
        <button class="tab-btn active" onclick="Gerante._absTab(this,'abs-profs-profs','abs-profs-ger')">Déclarées par profs</button>
        <button class="tab-btn" onclick="Gerante._absTab(this,'abs-profs-ger','abs-profs-profs')">Saisies par gérante</button>
      </div>
      <div id="abs-profs-profs">
        <div class="actions-row">
          <input class="search-input" placeholder="🔍 Rechercher…" oninput="Gerante._filterTable(this,'absp-table')"/>
        </div>
        <div class="card" id="absp-table">
          <div class="card-content" style="padding:0">
            ${UI.tableHTML(["Professeur","Date","Motif","Statut","Validé par"], rows, r => `
              <td class="rtl">${UI.esc(r.prof)}</td>
              <td>${UI.fmtDate(r.date)}</td>
              <td>${UI.esc(r.motif||"—")}</td>
              <td>${UI.statusBadge(r.statut)}</td>
              <td>${UI.esc(r.valide_par||"—")}</td>
            `)}
          </div>
        </div>
      </div>
      <div id="abs-profs-ger" style="display:none">
        <div class="actions-row">
          <button class="btn btn-primary" onclick="Gerante._newAbsenceProf()">➕ Saisir absence</button>
        </div>
        <div class="card">
          <div class="card-content" style="padding:0">
            ${UI.tableHTML(["Professeur","Date","Justification","Saisie par"], gerRows, r => `
              <td class="rtl">${UI.esc(r.prof)}</td>
              <td>${UI.fmtDate(r.date)}</td>
              <td>${UI.esc(r.justification||"—")}</td>
              <td>${UI.esc(r.saisie_par||"gerante")}</td>
            `)}
          </div>
        </div>
      </div>
      </div>
    `);
  }

  function _absTab(btn, showId, hideId) {
    document.getElementById(showId).style.display = "";
    document.getElementById(hideId).style.display = "none";
    btn.closest(".tab-bar").querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
  }

  async function _newAbsenceProf() {
    const profs = await DB.query("SELECT nom FROM users WHERE role='professeur'");
    UI.modal("Saisir une absence prof", `
      <div class="form-grid">
        <div class="form-group"><label>Professeur</label>
          <select id="abp-prof"><option value="">— Choisir —</option>
            ${profs.map(p => `<option value="${UI.esc(p.nom)}">${UI.esc(p.nom)}</option>`).join("")}
          </select></div>
        <div class="form-group"><label>Date</label><input id="abp-date" type="date"/></div>
        <div class="form-group" style="grid-column:1/-1"><label>Justification</label>
          <textarea id="abp-just" rows="3"></textarea></div>
      </div>
    `, `<button class="btn btn-primary" onclick="Gerante._saveAbsenceProf()">Enregistrer</button>
        <button class="btn btn-outline" onclick="UI.closeModal()">Annuler</button>`);
  }

  async function _saveAbsenceProf() {
    const g = x => document.getElementById(x)?.value?.trim() || "";
    if (!g("abp-prof") || !g("abp-date")) { UI.toast("Champs obligatoires manquants","warning"); return; }
    await DB.exec(
      "INSERT INTO absences_profs_gerante VALUES (?,?,?,?,?)",
      [DB.shortId(), g("abp-prof"), g("abp-date"), g("abp-just"), _shell.username]
    );
    UI.closeModal(); UI.toast("Absence enregistrée","success");
    absencesProfs();
  }

  /* ─────────────────────────────────────────
     7. DEMANDES
     ───────────────────────────────────────── */
  async function demandesGerante() {
    UI.showLoader(true);
    const rows = await DB.query("SELECT * FROM demandes ORDER BY date DESC");
    UI.setPage(`
      ${UI.pageHeader("📬", "Demandes des professeurs", "Traitement des demandes")}
      <div class="card">
        <div class="card-content" style="padding:0">
          ${UI.tableHTML(["Professeur","Demande","Date","Statut","Décision","Actions"], rows, r => `
            <td class="rtl">${UI.esc(r.prof)}</td>
            <td style="max-width:260px">${UI.esc(r.texte)}</td>
            <td>${UI.fmtDate(r.date)}</td>
            <td>${UI.statusBadge(r.statut)}</td>
            <td>${UI.esc(r.decision||"—")}</td>
            <td>
              ${r.statut==="soumise" ? `
                <button class="btn btn-sm btn-success" onclick="Gerante._decideDemande('${r.id}','approuvée')">✅</button>
                <button class="btn btn-sm btn-danger" onclick="Gerante._decideDemande('${r.id}','refusée')">❌</button>
              ` : ""}
            </td>
          `)}
        </div>
      </div>
      </div>
    `);
  }

  async function _decideDemande(id, decision) {
    const label = decision === "approuvée" ? "Approuver" : "Refuser";
    UI.modal(`${label} la demande`, `
      <div class="form-group"><label>Commentaire (facultatif)</label>
        <textarea id="dem-com" rows="3" placeholder="Raison de la décision…"></textarea></div>
    `, `<button class="btn ${decision==="approuvée"?"btn-success":"btn-danger"}" onclick="Gerante._saveDemande('${id}','${decision}')">Confirmer</button>
        <button class="btn btn-outline" onclick="UI.closeModal()">Annuler</button>`);
  }

  async function _saveDemande(id, decision) {
    const com = document.getElementById("dem-com")?.value?.trim() || decision;
    const rows = await DB.query("SELECT prof FROM demandes WHERE id=?", [id]);
    await DB.exec("UPDATE demandes SET statut=?,decision=? WHERE id=?", [decision, com, id]);
    if (rows[0]) await DB.addNotif(rows[0].prof, `Votre demande a été ${decision}.`, decision==="approuvée"?"success":"danger");
    UI.closeModal(); UI.toast(`Demande ${decision}`, "success");
    demandesGerante();
  }

  /* ─────────────────────────────────────────
     8. EXAMENS & NOTES
     ───────────────────────────────────────── */
  async function examensGerante() {
    UI.showLoader(true);
    const examens = await DB.query("SELECT * FROM examens ORDER BY date DESC LIMIT 80");
    UI.setPage(`
      ${UI.pageHeader("📚", "Examens & Notes", "Planification et résultats")}
      <div class="tab-bar">
        <button class="tab-btn active" onclick="Gerante._examTab(this,'ex-planning','ex-notes')">Planning examens</button>
        <button class="tab-btn" onclick="Gerante._loadNotesTab(this)">Relevé de notes</button>
      </div>
      <div id="ex-planning">
        <div class="card">
          <div class="card-content" style="padding:0">
            ${UI.tableHTML(["Matière","Classe","Date","Heure","Créé par"], examens, r => `
              <td class="rtl">${UI.esc(r.matiere)}</td>
              <td>${UI.esc(r.classe)}</td>
              <td>${UI.fmtDate(r.date)}</td>
              <td>${UI.esc(r.heure||"—")}</td>
              <td class="rtl">${UI.esc(r.cree_par)}</td>
            `)}
          </div>
        </div>
      </div>
      <div id="ex-notes" style="display:none">
        <div class="loading-spinner"><div class="spinner"></div><p>Chargement…</p></div>
      </div>
      </div>
    `);
  }

  async function _loadNotesTab(btn) {
    btn.closest(".tab-bar").querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("ex-planning").style.display = "none";
    document.getElementById("ex-notes").style.display    = "";

    const notes = await DB.query("SELECT * FROM notes_eleves ORDER BY date DESC LIMIT 200");
    document.getElementById("ex-notes").innerHTML = UI.tableHTML(
      ["Prof","Classe","Matière","Élève","Exam 1","Exam 2","Mois","Remarque"], notes,
      r => `
        <td class="rtl">${UI.esc(r.prof)}</td>
        <td>${UI.esc(r.classe)}</td>
        <td class="rtl">${UI.esc(r.matiere)}</td>
        <td class="rtl">${UI.esc(r.eleve_nom)} ${UI.esc(r.eleve_prenom)}</td>
        <td>${UI.noteBox(r.note_exam1)}</td>
        <td>${UI.noteBox(r.note_exam2)}</td>
        <td>${UI.esc(r.mois||"—")}</td>
        <td>${UI.esc(r.remarque||"—")}</td>
      `
    );
  }

  function _examTab(btn, showId, hideId) {
    document.getElementById(showId).style.display = "";
    document.getElementById(hideId).style.display = "none";
    btn.closest(".tab-bar").querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
  }

  /* ─────────────────────────────────────────
     9. SALAIRES
     ───────────────────────────────────────── */
  async function salairesGerante() {
    UI.showLoader(true);
    try {
      const profs  = await DB.query("SELECT * FROM salaires_fixes ORDER BY prof");
      const verss  = await DB.query("SELECT * FROM versements_salaires ORDER BY mois DESC, prof");
      const moisSel = CFG.MOIS[new Date().getMonth()] || "Septembre";

      UI.setPage(`
        ${UI.pageHeader("💼", "Salaires", "Versements mensuels — professeurs")}
        <div class="tab-bar">
          <button class="tab-btn active" onclick="Gerante._salTab(this,'sal-profs','sal-hist')">Tableau salaires</button>
          <button class="tab-btn" onclick="Gerante._salTab(this,'sal-hist','sal-profs')">Historique versements</button>
        </div>
        <div id="sal-profs">
          <div class="actions-row">
            <label style="font-size:12px;color:var(--muted)">Mois :</label>
            <select id="sal-mois" onchange="Gerante._loadSalaires()">${UI.selectOpts(CFG.MOIS, moisSel)}</select>
            <button class="btn btn-primary" onclick="Gerante._verserTous()">💸 Verser tout</button>
          </div>
          <div class="card" id="sal-table">
            <div class="card-content" style="padding:0">
              ${_renderSalairesTable(profs, verss, moisSel)}
            </div>
          </div>
        </div>
        <div id="sal-hist" style="display:none">
          <div class="card">
            <div class="card-content" style="padding:0">
              ${UI.tableHTML(["Professeur","Mois","Montant","Date versement","Versé par"], verss, r => `
                <td class="rtl">${UI.esc(r.prof)}</td>
                <td>${UI.esc(r.mois)}</td>
                <td style="font-weight:700;color:var(--success)">${parseFloat(r.montant||0).toFixed(0)} DH</td>
                <td>${UI.fmtDate(r.date_versement)}</td>
                <td>${UI.esc(r.verse_par||"—")}</td>
              `)}
            </div>
          </div>
        </div>
        </div>
      `);
    } catch(e) {
      UI.setPage(`<div class="page-body"><p style="color:red">Erreur : ${UI.esc(e.message)}</p></div>`);
    }
  }

  function _renderSalairesTable(profs, verss, mois) {
    const paidSet = new Set(verss.filter(v => v.mois === mois).map(v => v.prof));
    return UI.tableHTML(["Professeur","Type","Salaire mensuel","Statut","Actions"], profs, r => {
      const paid   = paidSet.has(r.prof);
      return `
        <td class="rtl" style="font-weight:600">${UI.esc(r.prof)}</td>
        <td>${UI.badge(r.type_paiement||"fixe","info")}</td>
        <td style="font-weight:700">${parseFloat(r.salaire_mensuel||0).toFixed(0)} DH</td>
        <td>${paid ? UI.badge("✅ Versé","success") : UI.badge("⏳ Non versé","warning")}</td>
        <td>
          ${!paid ? `<button class="btn btn-sm btn-success" onclick="Gerante._verserSalaire('${UI.esc(r.prof)}')">Verser</button>` : ""}
          <button class="btn btn-sm btn-outline" onclick="Gerante._editSalaire('${UI.esc(r.prof)}',${r.salaire_mensuel||0})">Modifier</button>
        </td>
      `;
    });
  }

  async function _loadSalaires() {
    const mois  = document.getElementById("sal-mois")?.value;
    const profs = await DB.query("SELECT * FROM salaires_fixes ORDER BY prof");
    const verss = await DB.query("SELECT * FROM versements_salaires WHERE mois=?", [mois]);
    document.getElementById("sal-table").querySelector(".card-content").innerHTML =
      _renderSalairesTable(profs, verss, mois);
  }

  async function _verserSalaire(prof) {
    const mois = document.getElementById("sal-mois")?.value;
    const sf   = await DB.query("SELECT * FROM salaires_fixes WHERE prof=?", [prof]);
    const mont = parseFloat(sf[0]?.salaire_mensuel || 0);
    await DB.exec(
      "INSERT INTO versements_salaires VALUES (?,?,?,?,?,?,?,?)",
      [DB.shortId(), prof, mois, mont, UI.today(), _shell.username, 0, 0]
    );
    // Notifier le prof
    const u = await DB.query("SELECT username FROM users WHERE nom=?", [prof]);
    if (u[0]) await DB.addNotif(u[0].username, `Salaire ${mois} versé : ${mont} DH`, "success");
    UI.toast(`Salaire versé à ${prof}`, "success");
    _loadSalaires();
  }

  async function _verserTous() {
    const mois  = document.getElementById("sal-mois")?.value;
    const profs = await DB.query("SELECT * FROM salaires_fixes");
    const verss = await DB.query("SELECT prof FROM versements_salaires WHERE mois=?", [mois]);
    const done  = new Set(verss.map(v => v.prof));
    for (const p of profs) {
      if (!done.has(p.prof)) await _verserSalaire(p.prof);
    }
    UI.toast("Tous les salaires versés","success");
  }

  async function _editSalaire(prof, current) {
    UI.modal("Modifier salaire", `
      <div class="form-group">
        <label>Nouveau salaire mensuel (DH)</label>
        <input id="sal-new" type="number" value="${current}" min="0"/>
      </div>
    `, `<button class="btn btn-primary" onclick="Gerante._saveSalaire('${UI.esc(prof)}')">Enregistrer</button>
        <button class="btn btn-outline" onclick="UI.closeModal()">Annuler</button>`);
  }
  async function _saveSalaire(prof) {
    const v = parseFloat(document.getElementById("sal-new")?.value || 0);
    await DB.exec("UPDATE salaires_fixes SET salaire_mensuel=? WHERE prof=?", [v, prof]);
    UI.closeModal(); UI.toast("Salaire mis à jour","success"); _loadSalaires();
  }

  function _salTab(btn, showId, hideId) {
    document.getElementById(showId).style.display = "";
    document.getElementById(hideId).style.display = "none";
    btn.closest(".tab-bar").querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
  }

  /* ─────────────────────────────────────────
     10. RETRAITS DOSSIERS
     ───────────────────────────────────────── */
  async function retraits() {
    UI.showLoader(true);
    const rows = await DB.query("SELECT * FROM archives_gerante WHERE type_archive='retrait' ORDER BY date_archive DESC");
    UI.setPage(`
      ${UI.pageHeader("📁", "Retraits de dossiers", "Gestion des départs")}
      <div class="actions-row">
        <button class="btn btn-primary" onclick="Gerante._newRetrait()">➕ Nouveau retrait</button>
      </div>
      <div class="card">
        <div class="card-content" style="padding:0">
          ${UI.tableHTML(["Élève","Classe","Détails","Date"], rows, r => `
            <td>${UI.esc(r.titre)}</td>
            <td>${UI.esc(r.details||"—")}</td>
            <td>${UI.esc(r.details||"—")}</td>
            <td>${UI.fmtDate(r.date_archive)}</td>
          `)}
        </div>
      </div>
      </div>
    `);
  }

  async function _newRetrait() {
    const eleves = await DB.query("SELECT id, nom_famille||' '||prenom as nom, classe FROM liste_eleves WHERE archive=0");
    UI.modal("📁 Retrait de dossier", `
      <div class="form-grid">
        <div class="form-group"><label>Élève</label>
          <select id="ret-eleve"><option value="">—</option>
            ${eleves.map(e => `<option value="${e.id}|${UI.esc(e.nom)}">${UI.esc(e.nom)} (${e.classe})</option>`).join("")}
          </select></div>
        <div class="form-group"><label>Raison</label>
          <input id="ret-raison" placeholder="Motif du retrait"/></div>
      </div>
    `, `<button class="btn btn-primary" onclick="Gerante._saveRetrait()">Enregistrer</button>
        <button class="btn btn-outline" onclick="UI.closeModal()">Annuler</button>`);
  }

  async function _saveRetrait() {
    const sel = document.getElementById("ret-eleve")?.value || "";
    const [eid, enom] = sel.split("|");
    const raison = document.getElementById("ret-raison")?.value?.trim() || "";
    if (!eid) { UI.toast("Sélectionnez un élève","warning"); return; }
    await DB.exec(
      "INSERT INTO archives_gerante VALUES (?,?,?,?,?)",
      [DB.shortId(), "retrait", enom, raison, UI.today()]
    );
    // Archiver l'élève
    await DB.exec("UPDATE liste_eleves SET archive=1 WHERE id=?", [eid]);
    UI.closeModal(); UI.toast("Retrait enregistré","success"); retraits();
  }

  /* ─────────────────────────────────────────
     11. MAÎTRESSES
     ───────────────────────────────────────── */
  async function voirMaitresses() {
    UI.showLoader(true);
    const aff   = await DB.query("SELECT * FROM affectations_maitresses ORDER BY classe");
    const profs = await DB.query("SELECT nom FROM users WHERE role='professeur' ORDER BY nom");
    UI.setPage(`
      ${UI.pageHeader("👩‍🏫", "Maîtresses", "Affectations par classe")}
      <div class="actions-row">
        <button class="btn btn-primary" onclick="Gerante._newAffectation()">➕ Nouvelle affectation</button>
      </div>
      <div class="card">
        <div class="card-content" style="padding:0">
          ${UI.tableHTML(["Classe","Maîtresse","Actions"], aff, r => `
            <td><strong>${UI.esc(r.classe)}</strong></td>
            <td class="rtl">${UI.esc(r.maitresse)}</td>
            <td>
              <button class="btn btn-sm btn-danger" onclick="Gerante._deleteAff('${r.id}')">🗑 Supprimer</button>
            </td>
          `)}
        </div>
      </div>
      </div>
    `);
  }

  async function _newAffectation() {
    const profs = await DB.query("SELECT nom FROM users WHERE role='professeur' ORDER BY nom");
    UI.modal("Nouvelle affectation", `
      <div class="form-grid">
        <div class="form-group"><label>Classe</label>
          <select id="aff-classe">${UI.selectOpts(CFG.CLASSES)}</select></div>
        <div class="form-group"><label>Maîtresse</label>
          <select id="aff-prof"><option value="">—</option>
            ${profs.map(p => `<option value="${UI.esc(p.nom)}">${UI.esc(p.nom)}</option>`).join("")}
          </select></div>
      </div>
    `, `<button class="btn btn-primary" onclick="Gerante._saveAff()">Enregistrer</button>
        <button class="btn btn-outline" onclick="UI.closeModal()">Annuler</button>`);
  }

  async function _saveAff() {
    const cl = document.getElementById("aff-classe")?.value;
    const pr = document.getElementById("aff-prof")?.value;
    if (!cl || !pr) { UI.toast("Champs obligatoires","warning"); return; }
    await DB.exec("INSERT INTO affectations_maitresses VALUES (?,?,?)", [DB.shortId(), cl, pr]);
    UI.closeModal(); UI.toast("Affectation créée","success"); voirMaitresses();
  }

  async function _deleteAff(id) {
    UI.confirm("Supprimer cette affectation ?", async () => {
      await DB.exec("DELETE FROM affectations_maitresses WHERE id=?", [id]);
      UI.toast("Supprimée","info"); voirMaitresses();
    });
  }

  /* ─────────────────────────────────────────
     12. ARCHIVE
     ───────────────────────────────────────── */
  async function archiveGerante() {
    UI.showLoader(true);
    const rows = await DB.query("SELECT * FROM archives_gerante ORDER BY date_archive DESC");
    UI.setPage(`
      ${UI.pageHeader("🗄", "Archive", "Historique des opérations")}
      <div class="card">
        <div class="card-content" style="padding:0">
          ${UI.tableHTML(["Type","Titre","Détails","Date"], rows, r => `
            <td>${UI.badge(r.type_archive||"—","info")}</td>
            <td>${UI.esc(r.titre)}</td>
            <td style="max-width:240px">${UI.esc(r.details||"—")}</td>
            <td>${UI.fmtDate(r.date_archive)}</td>
          `)}
        </div>
      </div>
      </div>
    `);
  }

  /* ── Recherche filtre table ── */
  function _filterTable(input, tableId) {
    const q   = input.value.toLowerCase();
    const el  = document.getElementById(tableId);
    if (!el) return;
    el.querySelectorAll("tbody tr").forEach(tr => {
      tr.style.display = tr.textContent.toLowerCase().includes(q) ? "" : "none";
    });
  }

  return {
    init,
    dashGerante, inscriptions, listeElevesClasses, paiements,
    absencesEleves, absencesProfs, demandesGerante, examensGerante,
    salairesGerante, retraits, voirMaitresses, archiveGerante,
    // Sous-fonctions exposées pour les onclick inline
    _newInscription, _saveInscription, _detailInscription, _cancelInscription,
    _listeElevesPage, _listeElevesClasses_, _archiveEleve, _editEleve, _saveEleve,
    _newPaiement, _savePaiement,
    _absTab, _newAbsenceProf, _saveAbsenceProf,
    _decideDemande, _saveDemande,
    _examTab, _loadNotesTab,
    _loadSalaires, _verserSalaire, _verserTous, _editSalaire, _saveSalaire, _salTab,
    _newRetrait, _saveRetrait,
    _newAffectation, _saveAff, _deleteAff,
    _filterTable
  };
})();
