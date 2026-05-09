/* ═══════════════════════════════════════════════════════════
   directrice.js — Pages Directrice (8 menus)
   ═══════════════════════════════════════════════════════════ */

const Directrice = (() => {

  let _shell;
  function init(shell) { _shell = shell; }

  /* ─────────────────────────────────────────
     1. TABLEAU DE BORD
     ───────────────────────────────────────── */
  async function dashDirectrice() {
    UI.showLoader(true);
    try {
      const [eleves, inscPend, absProfs, demandes, salaires] = await Promise.all([
        DB.query("SELECT COUNT(*) as n FROM liste_eleves WHERE archive=0"),
        DB.query("SELECT COUNT(*) as n FROM historique_inscriptions WHERE statut='en_attente'"),
        DB.query("SELECT COUNT(*) as n FROM absences_profs WHERE statut='soumise'"),
        DB.query("SELECT COUNT(*) as n FROM demandes WHERE statut='soumise'"),
        DB.query("SELECT SUM(montant) as total FROM versements_salaires"),
      ]);
      const notes = await DB.query("SELECT COUNT(*) as n FROM notes_eleves");
      const byClasse = await DB.query("SELECT classe, COUNT(*) as cnt FROM liste_eleves WHERE archive=0 GROUP BY classe ORDER BY cnt DESC LIMIT 6");

      UI.setPage(`
        ${UI.pageHeader("📊", "Tableau de bord Directrice", UI.today())}
        <div class="kpi-grid">
          ${UI.kpiBox(eleves[0]?.n||0,        "Élèves inscrits",         "#145A32")}
          ${UI.kpiBox(inscPend[0]?.n||0,       "Inscriptions à valider",  "#E67E22")}
          ${UI.kpiBox(absProfs[0]?.n||0,       "Absences profs en attente","#C0392B")}
          ${UI.kpiBox(demandes[0]?.n||0,       "Demandes à traiter",      "#2980B9")}
          ${UI.kpiBox(notes[0]?.n||0,          "Relevés de notes",        "#8E44AD")}
          ${UI.kpiBox((parseFloat(salaires[0]?.total)||0).toFixed(0)+" DH","Salaires versés total","#27AE60")}
        </div>
        <div class="dash-grid">
          <div class="card">
            <div class="card-accent-top" style="background:#145A32"></div>
            <div class="card-header"><h3>📋 Effectifs par classe</h3></div>
            <div class="card-content">
              ${byClasse.map(r => `
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
                  <span style="min-width:80px;font-size:11px;color:var(--muted)">${UI.esc(r.classe)}</span>
                  <div style="flex:1;background:#F0F4F8;border-radius:4px;height:16px;overflow:hidden">
                    <div style="background:#145A32;height:100%;width:${Math.min(100,r.cnt*4)}%;border-radius:4px"></div>
                  </div>
                  <strong style="min-width:24px;font-size:11px">${r.cnt}</strong>
                </div>
              `).join("")}
            </div>
          </div>
          <div class="card">
            <div class="card-accent-top" style="background:#145A32"></div>
            <div class="card-header"><h3>⚡ Actions rapides</h3></div>
            <div class="card-content" style="display:flex;flex-direction:column;gap:8px">
              <button class="btn btn-primary" style="background:#145A32" onclick="Directrice.validerInscriptions()">✅ Valider inscriptions (${inscPend[0]?.n||0})</button>
              <button class="btn btn-primary" style="background:#1E8449" onclick="Directrice.validerAbsProfs()">📋 Absences profs (${absProfs[0]?.n||0})</button>
              <button class="btn btn-info" onclick="Directrice.traiterDemandes()">📬 Demandes (${demandes[0]?.n||0})</button>
              <button class="btn btn-outline" onclick="Directrice.listeElevesDir()">📋 Liste élèves</button>
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
     2. VALIDER INSCRIPTIONS
     ───────────────────────────────────────── */
  async function validerInscriptions() {
    UI.showLoader(true);
    const rows = await DB.query("SELECT * FROM historique_inscriptions ORDER BY date_soumission DESC");
    UI.setPage(`
      ${UI.pageHeader("✅", "Validation des inscriptions", "Décisions d'admission")}
      <div class="tab-bar">
        <button class="tab-btn active" onclick="Directrice._inscTab(this,'insc-pend','insc-all')">En attente (${rows.filter(r=>r.statut==="en_attente").length})</button>
        <button class="tab-btn" onclick="Directrice._inscTab(this,'insc-all','insc-pend')">Toutes</button>
      </div>
      <div id="insc-pend">
        ${_renderInscTable(rows.filter(r => r.statut === "en_attente"), true)}
      </div>
      <div id="insc-all" style="display:none">
        ${_renderInscTable(rows, false)}
      </div>
      </div>
    `);
  }

  function _renderInscTable(rows, withActions) {
    return `<div class="card"><div class="card-content" style="padding:0">
      ${UI.tableHTML(["Élève","Classe","Tuteur","Téléphone","Date","Statut",...(withActions?["Actions"]:[])], rows, r => `
        <td>${UI.esc(r.eleve_nom)}</td>
        <td>${UI.esc(r.classe||"—")}</td>
        <td>${UI.esc(r.tuteur)}</td>
        <td>${UI.esc(r.tel)}</td>
        <td>${UI.fmtDate(r.date_soumission)}</td>
        <td>${UI.statusBadge(r.statut)}</td>
        ${withActions ? `<td>
          <button class="btn btn-sm btn-success" onclick="Directrice._decideInsc('${r.id}','validée')">✅ Valider</button>
          <button class="btn btn-sm btn-danger" onclick="Directrice._decideInsc('${r.id}','refusée')">❌ Refuser</button>
        </td>` : ""}
      `)}
    </div></div>`;
  }

  async function _decideInsc(id, decision) {
    const now  = UI.today();
    const rows = await DB.query("SELECT * FROM historique_inscriptions WHERE id=?", [id]);
    await DB.exec(
      "UPDATE historique_inscriptions SET statut=?,date_decision=?,decision_par=? WHERE id=?",
      [decision, now, _shell.username, id]
    );
    await DB.addNotif(_shell.username, `Inscription ${decision} — ${rows[0]?.eleve_nom}`, decision==="validée"?"success":"danger");
    UI.toast(`Inscription ${decision}`, "success");
    validerInscriptions();
  }

  function _inscTab(btn, showId, hideId) {
    document.getElementById(showId).style.display = "";
    document.getElementById(hideId).style.display = "none";
    btn.closest(".tab-bar").querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
  }

  /* ─────────────────────────────────────────
     3. LISTE ÉLÈVES (directrice)
     ───────────────────────────────────────── */
  async function listeElevesDir() {
    UI.showLoader(true);
    const data = await DB.query("SELECT classe, COUNT(*) as cnt FROM liste_eleves WHERE archive=0 GROUP BY classe ORDER BY classe");
    UI.setPage(`
      ${UI.pageHeader("📋", "Liste des élèves", "Vue directrice")}
      <div style="display:flex;flex-wrap:wrap;gap:12px">
        ${data.map(r => `
          <div class="card" style="min-width:150px;cursor:pointer"
            onclick="Directrice._listeElevesClasseDir('${UI.esc(r.classe)}')"
            onmouseenter="this.style.transform='translateY(-3px)'"
            onmouseleave="this.style.transform=''">
            <div class="card-content" style="text-align:center;padding:18px 14px">
              <div style="font-size:24px">📚</div>
              <div style="font-weight:700;color:#145A32;margin:6px 0 2px">${UI.esc(r.classe)}</div>
              <div style="font-size:11px;color:var(--muted)">${r.cnt} élève(s)</div>
            </div>
          </div>
        `).join("")}
      </div>
      </div>
    `);
  }

  async function _listeElevesClasseDir(classe) {
    UI.showLoader(true);
    const rows = await DB.query("SELECT * FROM liste_eleves WHERE classe=? AND archive=0 ORDER BY numero", [classe]);
    UI.setPage(`
      ${UI.pageHeader("📚", `Classe : ${classe}`, `${rows.length} élève(s)`)}
      <div class="actions-row">
        <button class="btn btn-outline" onclick="Directrice.listeElevesDir()">← Retour classes</button>
      </div>
      <div class="card">
        <div class="card-content" style="padding:0">
          ${UI.tableHTML(["N°","Nom","Prénom","Sexe","Date naissance"],rows, r => `
            <td>${UI.esc(r.numero)}</td>
            <td class="rtl"><strong>${UI.esc(r.nom_famille)}</strong></td>
            <td class="rtl">${UI.esc(r.prenom)}</td>
            <td>${UI.esc(r.sexe)}</td>
            <td>${UI.fmtDate(r.date_naissance)}</td>
          `)}
        </div>
      </div>
      </div>
    `);
  }

  /* ─────────────────────────────────────────
     4. SUIVI PAIEMENTS
     ───────────────────────────────────────── */
  async function suiviPaiements() {
    UI.showLoader(true);
    const rows = await DB.query(`
      SELECT p.*, e.nom_famille||' '||e.prenom as eleve_nom, e.classe
      FROM paiements p LEFT JOIN liste_eleves e ON p.eleve_id = e.id
      ORDER BY p.date DESC LIMIT 150
    `);
    const total = rows.reduce((s,r) => s + (parseFloat(r.montant_paye)||0), 0);
    const reste = rows.reduce((s,r) => s + (parseFloat(r.reste)||0), 0);

    UI.setPage(`
      ${UI.pageHeader("💰", "Suivi des paiements", "Vue directrice")}
      <div class="kpi-grid">
        ${UI.kpiBox(total.toFixed(0)+" DH","Total encaissé","#145A32")}
        ${UI.kpiBox(reste.toFixed(0)+" DH","Total reste dû","#C0392B")}
        ${UI.kpiBox(rows.length,"Nb transactions","#1A3A5C")}
      </div>
      <div class="card">
        <div class="card-content" style="padding:0">
          ${UI.tableHTML(["Élève","Classe","Payé","Dû","Type","Mois","Date","Statut","Reste"], rows, r => `
            <td>${UI.esc(r.eleve_nom||"—")}</td>
            <td>${UI.esc(r.classe||"—")}</td>
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
  }

  /* ─────────────────────────────────────────
     5. ABSENCES PROFS (directrice)
     ───────────────────────────────────────── */
  async function validerAbsProfs() {
    UI.showLoader(true);
    const rows = await DB.query("SELECT * FROM absences_profs ORDER BY date DESC");
    UI.setPage(`
      ${UI.pageHeader("📋", "Absences professeurs", "Validation directrice")}
      <div class="card">
        <div class="card-content" style="padding:0">
          ${UI.tableHTML(["Professeur","Date","Motif","Statut","Validé par","Actions"], rows, r => `
            <td class="rtl">${UI.esc(r.prof)}</td>
            <td>${UI.fmtDate(r.date)}</td>
            <td>${UI.esc(r.motif||"—")}</td>
            <td>${UI.statusBadge(r.statut)}</td>
            <td>${UI.esc(r.valide_par||"—")}</td>
            <td>
              ${r.statut==="soumise" ? `
                <button class="btn btn-sm btn-success" onclick="Directrice._validerAbs('${r.id}','validée')">✅</button>
                <button class="btn btn-sm btn-danger" onclick="Directrice._validerAbs('${r.id}','refusée')">❌</button>
              ` : ""}
            </td>
          `)}
        </div>
      </div>
      </div>
    `);
  }

  async function _validerAbs(id, decision) {
    const rows = await DB.query("SELECT prof FROM absences_profs WHERE id=?", [id]);
    await DB.exec("UPDATE absences_profs SET statut=?,valide_par=? WHERE id=?", [decision, _shell.username, id]);
    if (rows[0]) {
      const u = await DB.query("SELECT username FROM users WHERE nom=?", [rows[0].prof]);
      if (u[0]) await DB.addNotif(u[0].username, `Absence ${decision} par la directrice`, decision==="validée"?"success":"danger");
    }
    UI.toast(`Absence ${decision}`, "success");
    validerAbsProfs();
  }

  /* ─────────────────────────────────────────
     6. DEMANDES (directrice)
     ───────────────────────────────────────── */
  async function traiterDemandes() {
    UI.showLoader(true);
    const rows = await DB.query("SELECT * FROM demandes ORDER BY date DESC");
    UI.setPage(`
      ${UI.pageHeader("📬", "Demandes des professeurs", "Vue directrice")}
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
                <button class="btn btn-sm btn-success" onclick="Directrice._decideDemDir('${r.id}','approuvée')">✅</button>
                <button class="btn btn-sm btn-danger" onclick="Directrice._decideDemDir('${r.id}','refusée')">❌</button>
              ` : ""}
            </td>
          `)}
        </div>
      </div>
      </div>
    `);
  }

  async function _decideDemDir(id, decision) {
    const rows = await DB.query("SELECT prof FROM demandes WHERE id=?", [id]);
    await DB.exec("UPDATE demandes SET statut=?,decision=? WHERE id=?", [decision, decision, id]);
    if (rows[0]) {
      const u = await DB.query("SELECT username FROM users WHERE nom=?", [rows[0].prof]);
      if (u[0]) await DB.addNotif(u[0].username, `Votre demande a été ${decision} par la directrice`, decision==="approuvée"?"success":"danger");
    }
    UI.toast(`Demande ${decision}`, "success");
    traiterDemandes();
  }

  /* ─────────────────────────────────────────
     7. SALAIRES (directrice)
     ───────────────────────────────────────── */
  async function salairesDirectrice() {
    UI.showLoader(true);
    const verss = await DB.query("SELECT * FROM versements_salaires ORDER BY mois DESC, prof LIMIT 200");
    const total = verss.reduce((s,r) => s + (parseFloat(r.montant)||0), 0);
    UI.setPage(`
      ${UI.pageHeader("💼", "Salaires — vue directrice", "Historique des versements")}
      <div class="kpi-grid">
        ${UI.kpiBox(total.toFixed(0)+" DH","Total versé","#145A32")}
        ${UI.kpiBox(verss.length,"Nb versements","#1A3A5C")}
      </div>
      <div class="card">
        <div class="card-content" style="padding:0">
          ${UI.tableHTML(["Professeur","Mois","Montant","Date","Versé par"], verss, r => `
            <td class="rtl"><strong>${UI.esc(r.prof)}</strong></td>
            <td>${UI.esc(r.mois)}</td>
            <td style="color:var(--success);font-weight:700">${parseFloat(r.montant||0).toFixed(0)} DH</td>
            <td>${UI.fmtDate(r.date_versement)}</td>
            <td>${UI.esc(r.verse_par||"—")}</td>
          `)}
        </div>
      </div>
      </div>
    `);
  }

  /* ─────────────────────────────────────────
     8. MAÎTRESSES (directrice — lecture seule)
     ───────────────────────────────────────── */
  async function voirMaitressesDir() {
    UI.showLoader(true);
    const aff = await DB.query("SELECT * FROM affectations_maitresses ORDER BY classe");
    UI.setPage(`
      ${UI.pageHeader("👩‍🏫", "Maîtresses & affectations", "Vue directrice")}
      <div class="card">
        <div class="card-content" style="padding:0">
          ${UI.tableHTML(["Classe","Maîtresse"], aff, r => `
            <td><strong>${UI.esc(r.classe)}</strong></td>
            <td class="rtl">${UI.esc(r.maitresse)}</td>
          `)}
        </div>
      </div>
      </div>
    `);
  }

  return {
    init,
    dashDirectrice, validerInscriptions, listeElevesDir, suiviPaiements,
    validerAbsProfs, traiterDemandes, salairesDirectrice, voirMaitressesDir,
    // inline handlers
    _inscTab, _decideInsc, _listeElevesClasseDir,
    _validerAbs, _decideDemDir
  };
})();
