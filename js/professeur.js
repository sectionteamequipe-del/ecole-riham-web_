/* ═══════════════════════════════════════════════════════════
   professeur.js — Pages Professeur (7 menus)
   ═══════════════════════════════════════════════════════════ */

const Professeur = (() => {

  let _shell;
  function init(shell) { _shell = shell; }

  /* Retourne les classes affectées à ce prof */
  async function _getMesClasses() {
    const rows = await DB.query(
      "SELECT classe FROM affectations_maitresses WHERE maitresse=?",
      [_shell.nom]
    );
    return rows.map(r => r.classe);
  }

  /* ─────────────────────────────────────────
     1. MON ESPACE
     ───────────────────────────────────────── */
  async function espaceProf() {
    UI.showLoader(true);
    try {
      const classes = await _getMesClasses();
      const matieres = await DB.query("SELECT matiere FROM matieres_profs WHERE prof=?", [_shell.nom]);
      const sf       = await DB.query("SELECT * FROM salaires_fixes WHERE prof=?", [_shell.nom]);
      const verss    = await DB.query("SELECT * FROM versements_salaires WHERE prof=? ORDER BY mois DESC LIMIT 6", [_shell.nom]);
      const demandes = await DB.query("SELECT COUNT(*) as n FROM demandes WHERE prof=? AND statut='soumise'", [_shell.nom]);
      const absences = await DB.query("SELECT COUNT(*) as n FROM absences_profs WHERE prof=? AND statut='soumise'", [_shell.nom]);

      UI.setPage(`
        ${UI.pageHeader("🏠", `Mon espace — ${UI.esc(_shell.nom)}`, "Tableau de bord professeur")}
        <div class="kpi-grid">
          ${UI.kpiBox(classes.length,           "Mes classes",             "#4A235A")}
          ${UI.kpiBox(matieres.length,           "Mes matières",            "#6C3483")}
          ${UI.kpiBox(parseFloat(sf[0]?.salaire_mensuel||0).toFixed(0)+" DH","Salaire mensuel","#27AE60")}
          ${UI.kpiBox(demandes[0]?.n||0,         "Demandes en cours",       "#2980B9")}
          ${UI.kpiBox(absences[0]?.n||0,         "Absences soumises",       "#E67E22")}
        </div>
        <div class="dash-grid">
          <!-- Mes classes -->
          <div class="card">
            <div class="card-accent-top" style="background:#4A235A"></div>
            <div class="card-header"><h3>📚 Mes classes</h3></div>
            <div class="card-content">
              ${classes.length ? classes.map(c => `
                <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #F0F4F8">
                  <span style="font-size:18px">📖</span>
                  <span style="font-weight:600;color:var(--accent)">${UI.esc(c)}</span>
                </div>
              `).join("") : `<p style="color:var(--muted);font-size:12px">Aucune classe affectée</p>`}
            </div>
          </div>
          <!-- Mes matières -->
          <div class="card">
            <div class="card-accent-top" style="background:#6C3483"></div>
            <div class="card-header"><h3>📝 Mes matières</h3></div>
            <div class="card-content">
              ${matieres.map(m => `
                <span class="badge badge-info" style="margin:3px">${UI.esc(m.matiere)}</span>
              `).join("") || `<p style="color:var(--muted);font-size:12px">Aucune matière</p>`}
            </div>
          </div>
          <!-- Derniers versements -->
          <div class="card">
            <div class="card-accent-top" style="background:#27AE60"></div>
            <div class="card-header"><h3>💰 Mes derniers salaires</h3></div>
            <div class="card-content" style="padding:0">
              ${UI.tableHTML(["Mois","Montant","Date"], verss, r => `
                <td>${UI.esc(r.mois)}</td>
                <td style="font-weight:700;color:var(--success)">${parseFloat(r.montant||0).toFixed(0)} DH</td>
                <td>${UI.fmtDate(r.date_versement)}</td>
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
     2. MES ÉLÈVES
     ───────────────────────────────────────── */
  async function mesEleves() {
    UI.showLoader(true);
    const classes = await _getMesClasses();
    if (!classes.length) {
      UI.setPage(`${UI.pageHeader("📋","Mes élèves")}<div class="empty-state"><div class="empty-icon">📭</div><p>Aucune classe affectée pour le moment.</p></div></div>`);
      return;
    }
    let html = `${UI.pageHeader("📋", "Mes élèves", `${classes.join(", ")}`)}`;

    for (const cl of classes) {
      const eleves = await DB.query(
        "SELECT * FROM liste_eleves WHERE classe=? AND archive=0 ORDER BY numero", [cl]
      );
      html += `
        <div class="card" style="margin-bottom:16px">
          <div class="card-accent-top" style="background:#4A235A"></div>
          <div class="card-header">
            <h3>📚 Classe ${UI.esc(cl)} — ${eleves.length} élève(s)</h3>
          </div>
          <div class="card-content" style="padding:0">
            ${UI.tableHTML(["N°","Nom","Prénom","Sexe","Date naissance"], eleves, r => `
              <td>${UI.esc(r.numero)}</td>
              <td class="rtl"><strong>${UI.esc(r.nom_famille)}</strong></td>
              <td class="rtl">${UI.esc(r.prenom)}</td>
              <td>${UI.esc(r.sexe)}</td>
              <td>${UI.fmtDate(r.date_naissance)}</td>
            `)}
          </div>
        </div>
      `;
    }
    html += "</div>";
    UI.setPage(html);
  }

  /* ─────────────────────────────────────────
     3. ABSENCES ÉLÈVES (saisie)
     ───────────────────────────────────────── */
  async function saisirAbsences() {
    UI.showLoader(true);
    const classes = await _getMesClasses();
    const recent  = await DB.query(
      "SELECT * FROM absences_eleves WHERE prof=? ORDER BY date DESC LIMIT 50",
      [_shell.nom]
    );

    UI.setPage(`
      ${UI.pageHeader("🎒", "Absences élèves", "Saisie et suivi")}
      <div class="tab-bar">
        <button class="tab-btn active" onclick="Professeur._absTab(this,'abs-saisie','abs-hist')">Nouvelle fiche</button>
        <button class="tab-btn" onclick="Professeur._absTab(this,'abs-hist','abs-saisie')">Historique</button>
      </div>
      <div id="abs-saisie">
        <div class="card">
          <div class="card-header"><h3>➕ Saisir une absence</h3></div>
          <div class="card-content">
            <div class="form-grid">
              <div class="form-group"><label>Classe</label>
                <select id="abs-cl" onchange="Professeur._loadElevesAbs()">${UI.selectOpts(classes)}</select></div>
              <div class="form-group"><label>Date</label><input id="abs-date" type="date" value="${new Date().toISOString().split('T')[0]}"/></div>
              <div class="form-group"><label>Motif</label>
                <select id="abs-motif">
                  <option value="non justifiée">Non justifiée</option>
                  <option value="maladie">Maladie</option>
                  <option value="voyage">Voyage</option>
                  <option value="autre">Autre</option>
                </select></div>
              <div class="form-group"><label>Justification</label><input id="abs-justif" placeholder="Détails…"/></div>
            </div>
            <div style="margin-top:12px">
              <label style="font-size:12px;font-weight:600;color:var(--accent)">Élèves absents :</label>
              <div id="abs-eleves-list" style="margin-top:8px;display:flex;flex-wrap:wrap;gap:8px">
                <p style="color:var(--muted);font-size:12px">Sélectionnez d'abord une classe</p>
              </div>
            </div>
            <div style="margin-top:16px">
              <button class="btn btn-primary" onclick="Professeur._enregistrerAbsences()">Enregistrer les absences</button>
            </div>
          </div>
        </div>
      </div>
      <div id="abs-hist" style="display:none">
        <div class="card">
          <div class="card-content" style="padding:0">
            ${UI.tableHTML(["Élève","Classe","Date","Motif","Justif","Statut"], recent, r => `
              <td class="rtl">${UI.esc(r.eleve)}</td>
              <td>${UI.esc(r.classe)}</td>
              <td>${UI.fmtDate(r.date)}</td>
              <td>${UI.esc(r.motif||"—")}</td>
              <td>${UI.esc(r.justif||"—")}</td>
              <td>${UI.statusBadge(r.statut||"non justifiée")}</td>
            `)}
          </div>
        </div>
      </div>
      </div>
    `);

    // Charger les élèves de la 1re classe
    if (classes.length) _loadElevesAbs();
  }

  async function _loadElevesAbs() {
    const cl    = document.getElementById("abs-cl")?.value;
    if (!cl) return;
    const eleves = await DB.query(
      "SELECT * FROM liste_eleves WHERE classe=? AND archive=0 ORDER BY numero", [cl]
    );
    const container = document.getElementById("abs-eleves-list");
    if (!container) return;
    container.innerHTML = eleves.map(e => `
      <label style="display:flex;align-items:center;gap:6px;padding:4px 8px;background:#F7FAFC;border:1px solid var(--border);border-radius:4px;cursor:pointer;font-size:12px">
        <input type="checkbox" value="${UI.esc(e.id)}|${UI.esc(e.nom_famille)} ${UI.esc(e.prenom)}" />
        ${UI.esc(e.nom_famille)} ${UI.esc(e.prenom)}
      </label>
    `).join("") || `<p style="color:var(--muted);font-size:12px">Aucun élève</p>`;
  }

  async function _enregistrerAbsences() {
    const cl     = document.getElementById("abs-cl")?.value;
    const date   = document.getElementById("abs-date")?.value;
    const motif  = document.getElementById("abs-motif")?.value;
    const justif = document.getElementById("abs-justif")?.value?.trim() || "";
    if (!cl || !date) { UI.toast("Renseignez la classe et la date","warning"); return; }

    const checked = [...document.querySelectorAll("#abs-eleves-list input:checked")];
    if (!checked.length) { UI.toast("Cochez au moins un élève absent","warning"); return; }

    const dateF = date.split("-").reverse().join("/");
    let count = 0;
    for (const cb of checked) {
      const [eid, enom] = cb.value.split("|");
      await DB.exec(
        "INSERT INTO absences_eleves VALUES (?,?,?,?,?,?,?,?)",
        [DB.shortId(), enom, cl, _shell.nom, dateF, motif, justif, "non justifiée"]
      );
      count++;
    }
    // Notifier gérante et directrice
    await DB.notifyRole("gerante",    `${count} absence(s) élèves saisies — ${cl} — ${_shell.nom}`, "warning");
    await DB.notifyRole("directrice", `${count} absence(s) élèves saisies — ${cl} — ${_shell.nom}`, "warning");

    UI.toast(`${count} absence(s) enregistrée(s)`, "success");
    saisirAbsences();
  }

  function _absTab(btn, showId, hideId) {
    document.getElementById(showId).style.display = "";
    document.getElementById(hideId).style.display = "none";
    btn.closest(".tab-bar").querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
  }

  /* ─────────────────────────────────────────
     4. SIGNALER ABSENCE PROF
     ───────────────────────────────────────── */
  async function signalerAbsenceProf() {
    UI.showLoader(true);
    const mes = await DB.query("SELECT * FROM absences_profs WHERE prof=? ORDER BY date DESC", [_shell.nom]);
    UI.setPage(`
      ${UI.pageHeader("📢", "Signaler mon absence", "Déclaration d'absence")}
      <div class="card" style="max-width:500px">
        <div class="card-header"><h3>➕ Nouvelle déclaration</h3></div>
        <div class="card-content">
          <div class="form-grid">
            <div class="form-group"><label>Date d'absence</label><input id="sabp-date" type="date" value="${new Date().toISOString().split('T')[0]}"/></div>
            <div class="form-group"><label>Motif</label>
              <select id="sabp-motif">
                <option value="maladie">Maladie</option>
                <option value="personnel">Raison personnelle</option>
                <option value="formation">Formation</option>
                <option value="autre">Autre</option>
              </select></div>
            <div class="form-group" style="grid-column:1/-1"><label>Précisions (facultatif)</label>
              <textarea id="sabp-prec" rows="3" placeholder="Détails de l'absence…"></textarea></div>
          </div>
          <button class="btn btn-primary" style="margin-top:12px" onclick="Professeur._submitAbsenceProf()">Envoyer la déclaration</button>
        </div>
      </div>
      <div class="card" style="margin-top:16px">
        <div class="card-header"><h3>📋 Mes déclarations</h3></div>
        <div class="card-content" style="padding:0">
          ${UI.tableHTML(["Date","Motif","Statut","Validé par"], mes, r => `
            <td>${UI.fmtDate(r.date)}</td>
            <td>${UI.esc(r.motif||"—")}</td>
            <td>${UI.statusBadge(r.statut)}</td>
            <td>${UI.esc(r.valide_par||"—")}</td>
          `)}
        </div>
      </div>
      </div>
    `);
  }

  async function _submitAbsenceProf() {
    const date  = document.getElementById("sabp-date")?.value;
    const motif = document.getElementById("sabp-motif")?.value;
    const prec  = document.getElementById("sabp-prec")?.value?.trim() || "";
    if (!date) { UI.toast("Sélectionnez une date","warning"); return; }
    const dateF = date.split("-").reverse().join("/");
    const full  = motif + (prec ? " — " + prec : "");
    await DB.exec(
      "INSERT INTO absences_profs VALUES (?,?,?,?,?,?)",
      [DB.shortId(), _shell.nom, dateF, full, "soumise", null]
    );
    await DB.notifyRole("directrice", `Absence déclarée par ${_shell.nom} — ${dateF}`, "warning");
    await DB.notifyRole("gerante",    `Absence déclarée par ${_shell.nom} — ${dateF}`, "warning");
    UI.toast("Déclaration envoyée","success");
    signalerAbsenceProf();
  }

  /* ─────────────────────────────────────────
     5. DEMANDES
     ───────────────────────────────────────── */
  async function deposerDemande() {
    UI.showLoader(true);
    const mes = await DB.query("SELECT * FROM demandes WHERE prof=? ORDER BY date DESC", [_shell.nom]);
    UI.setPage(`
      ${UI.pageHeader("📬", "Mes demandes", "Soumettre une demande")}
      <div class="card" style="max-width:500px">
        <div class="card-header"><h3>➕ Nouvelle demande</h3></div>
        <div class="card-content">
          <div class="form-group"><label>Type de demande</label>
            <select id="dem-type">
              <option value="congé">Congé</option>
              <option value="matériel">Matériel pédagogique</option>
              <option value="formation">Formation</option>
              <option value="salle">Salle / logistique</option>
              <option value="autre">Autre</option>
            </select></div>
          <div class="form-group" style="margin-top:10px"><label>Description</label>
            <textarea id="dem-texte" rows="4" placeholder="Décrivez votre demande en détail…"></textarea></div>
          <button class="btn btn-primary" style="margin-top:12px" onclick="Professeur._submitDemande()">Envoyer</button>
        </div>
      </div>
      <div class="card" style="margin-top:16px">
        <div class="card-header"><h3>📋 Mes demandes</h3></div>
        <div class="card-content" style="padding:0">
          ${UI.tableHTML(["Date","Demande","Statut","Décision"], mes, r => `
            <td>${UI.fmtDate(r.date)}</td>
            <td style="max-width:240px">${UI.esc(r.texte)}</td>
            <td>${UI.statusBadge(r.statut)}</td>
            <td>${UI.esc(r.decision||"—")}</td>
          `)}
        </div>
      </div>
      </div>
    `);
  }

  async function _submitDemande() {
    const type  = document.getElementById("dem-type")?.value  || "";
    const texte = document.getElementById("dem-texte")?.value?.trim() || "";
    if (!texte) { UI.toast("Décrivez votre demande","warning"); return; }
    await DB.exec(
      "INSERT INTO demandes VALUES (?,?,?,?,?,?)",
      [DB.shortId(), _shell.nom, `[${type}] ${texte}`, UI.today(), "soumise", null]
    );
    await DB.notifyRole("gerante",    `Nouvelle demande de ${_shell.nom}`, "info");
    await DB.notifyRole("directrice", `Nouvelle demande de ${_shell.nom}`, "info");
    UI.toast("Demande envoyée","success");
    deposerDemande();
  }

  /* ─────────────────────────────────────────
     6. PLANIFIER EXAMENS
     ───────────────────────────────────────── */
  async function planifierExamensProf() {
    UI.showLoader(true);
    const classes  = await _getMesClasses();
    const matieres = await DB.query("SELECT matiere FROM matieres_profs WHERE prof=?", [_shell.nom]);
    const examens  = await DB.query("SELECT * FROM examens WHERE cree_par=? ORDER BY date DESC", [_shell.nom]);

    UI.setPage(`
      ${UI.pageHeader("📅", "Planifier des examens", "Programmation des évaluations")}
      <div class="card" style="max-width:560px">
        <div class="card-header"><h3>➕ Nouvel examen</h3></div>
        <div class="card-content">
          <div class="form-grid">
            <div class="form-group"><label>Classe</label>
              <select id="ex-cl">${UI.selectOpts(classes)}</select></div>
            <div class="form-group"><label>Matière</label>
              <select id="ex-mat">${UI.selectOpts(matieres.map(m => m.matiere))}</select></div>
            <div class="form-group"><label>Date</label><input id="ex-date" type="date"/></div>
            <div class="form-group"><label>Heure</label><input id="ex-heure" type="time" placeholder="08:00"/></div>
          </div>
          <button class="btn btn-primary" style="margin-top:12px" onclick="Professeur._saveExamen()">Planifier</button>
        </div>
      </div>
      <div class="card" style="margin-top:16px">
        <div class="card-header"><h3>📋 Mes examens planifiés</h3></div>
        <div class="card-content" style="padding:0">
          ${UI.tableHTML(["Matière","Classe","Date","Heure","Actions"], examens, r => `
            <td class="rtl">${UI.esc(r.matiere)}</td>
            <td>${UI.esc(r.classe)}</td>
            <td>${UI.fmtDate(r.date)}</td>
            <td>${UI.esc(r.heure||"—")}</td>
            <td>
              <button class="btn btn-sm btn-danger" onclick="Professeur._deleteExamen('${r.id}')">🗑</button>
            </td>
          `)}
        </div>
      </div>
      </div>
    `);
  }

  async function _saveExamen() {
    const cl    = document.getElementById("ex-cl")?.value;
    const mat   = document.getElementById("ex-mat")?.value;
    const date  = document.getElementById("ex-date")?.value;
    const heure = document.getElementById("ex-heure")?.value || "";
    if (!cl || !mat || !date) { UI.toast("Remplissez tous les champs","warning"); return; }
    const dateF = date.split("-").reverse().join("/");
    await DB.exec(
      "INSERT INTO examens VALUES (?,?,?,?,?,?)",
      [DB.shortId(), mat, cl, dateF, heure, _shell.nom]
    );
    await DB.notifyRole("gerante",    `Examen planifié — ${mat} — ${cl} — ${dateF}`, "info");
    await DB.notifyRole("directrice", `Examen planifié — ${mat} — ${cl} — ${dateF}`, "info");
    UI.toast("Examen planifié","success");
    planifierExamensProf();
  }

  async function _deleteExamen(id) {
    UI.confirm("Supprimer cet examen ?", async () => {
      await DB.exec("DELETE FROM examens WHERE id=?", [id]);
      UI.toast("Examen supprimé","info");
      planifierExamensProf();
    });
  }

  /* ─────────────────────────────────────────
     7. SAISIE DES NOTES
     ───────────────────────────────────────── */
  async function saisieNotesProf() {
    UI.showLoader(true);
    const classes  = await _getMesClasses();
    const matieres = await DB.query("SELECT matiere FROM matieres_profs WHERE prof=?", [_shell.nom]);

    UI.setPage(`
      ${UI.pageHeader("📝", "Saisie des notes", "Relevé de notes")}
      <div class="card">
        <div class="card-header"><h3>🔍 Filtres</h3></div>
        <div class="card-content">
          <div class="form-grid">
            <div class="form-group"><label>Classe</label>
              <select id="nt-cl" onchange="Professeur._loadNotesList()">${UI.selectOpts(classes)}</select></div>
            <div class="form-group"><label>Matière</label>
              <select id="nt-mat">${UI.selectOpts(matieres.map(m => m.matiere))}</select></div>
            <div class="form-group"><label>Mois</label>
              <select id="nt-mois">${UI.selectOpts(CFG.MOIS)}</select></div>
          </div>
          <button class="btn btn-primary" style="margin-top:10px" onclick="Professeur._loadNotesList()">Charger</button>
        </div>
      </div>
      <div id="notes-container" style="margin-top:4px"></div>
      </div>
    `);

    if (classes.length) await _loadNotesList();
  }

  async function _loadNotesList() {
    const cl   = document.getElementById("nt-cl")?.value;
    const mat  = document.getElementById("nt-mat")?.value;
    const mois = document.getElementById("nt-mois")?.value;
    const container = document.getElementById("notes-container");
    if (!cl || !container) return;

    const eleves = await DB.query(
      "SELECT * FROM liste_eleves WHERE classe=? AND archive=0 ORDER BY numero", [cl]
    );
    const existing = await DB.query(
      "SELECT * FROM notes_eleves WHERE prof=? AND classe=? AND matiere=? AND mois=?",
      [_shell.nom, cl, mat||"", mois||""]
    );
    const noteMap = Object.fromEntries(existing.map(n => [n.eleve_code || n.eleve_nom, n]));

    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3>📝 Notes — ${UI.esc(cl)} — ${UI.esc(mat)} — ${UI.esc(mois)}</h3>
        </div>
        <div class="card-content" style="padding:0">
          <table style="width:100%">
            <thead><tr>
              <th>N°</th><th>Nom</th><th>Prénom</th>
              <th>Exam 1 /10</th><th>Exam 2 /10</th><th>Remarque</th>
            </tr></thead>
            <tbody>
              ${eleves.map((e, i) => {
                const key  = e.code || `${e.nom_famille} ${e.prenom}`;
                const n    = noteMap[key] || {};
                return `<tr>
                  <td>${UI.esc(e.numero)}</td>
                  <td class="rtl"><strong>${UI.esc(e.nom_famille)}</strong></td>
                  <td class="rtl">${UI.esc(e.prenom)}</td>
                  <td><input type="number" min="0" max="10" step="0.25" value="${n.note_exam1||""}" 
                       style="width:70px;padding:4px;border:1px solid var(--border);border-radius:4px"
                       data-row="${i}" data-field="e1"/></td>
                  <td><input type="number" min="0" max="10" step="0.25" value="${n.note_exam2||""}"
                       style="width:70px;padding:4px;border:1px solid var(--border);border-radius:4px"
                       data-row="${i}" data-field="e2"/></td>
                  <td><input type="text" value="${UI.esc(n.remarque||"")}"
                       style="width:140px;padding:4px;border:1px solid var(--border);border-radius:4px"
                       data-row="${i}" data-field="rem"/>
                      <input type="hidden" value="${UI.esc(e.id)}" data-row="${i}" data-field="id"/>
                      <input type="hidden" value="${UI.esc(e.code||"")}" data-row="${i}" data-field="code"/>
                      <input type="hidden" value="${UI.esc(e.nom_famille)}" data-row="${i}" data-field="nom"/>
                      <input type="hidden" value="${UI.esc(e.prenom)}" data-row="${i}" data-field="prenom"/>
                  </td>
                </tr>`;
              }).join("")}
            </tbody>
          </table>
        </div>
        <div style="padding:12px 16px">
          <button class="btn btn-success" onclick="Professeur._saveNotes()">💾 Enregistrer les notes</button>
        </div>
      </div>
    `;
  }

  async function _saveNotes() {
    const cl   = document.getElementById("nt-cl")?.value;
    const mat  = document.getElementById("nt-mat")?.value;
    const mois = document.getElementById("nt-mois")?.value;
    if (!cl || !mat || !mois) { UI.toast("Sélectionnez classe, matière et mois","warning"); return; }

    // Récupérer les lignes
    const rows = document.querySelectorAll("#notes-container tbody tr");
    let count  = 0;
    for (const tr of rows) {
      const get  = f => tr.querySelector(`[data-field="${f}"]`)?.value?.trim() || "";
      const e1   = parseFloat(get("e1")) || 0;
      const e2   = parseFloat(get("e2")) || 0;
      const rem  = get("rem");
      const code = get("code");
      const nom  = get("nom");
      const pren = get("prenom");
      if (!nom) continue;

      // Vérifier si une note existe déjà
      const exist = await DB.query(
        "SELECT id FROM notes_eleves WHERE prof=? AND classe=? AND matiere=? AND mois=? AND eleve_nom=?",
        [_shell.nom, cl, mat, mois, nom]
      );
      if (exist.length) {
        await DB.exec(
          "UPDATE notes_eleves SET note_exam1=?,note_exam2=?,remarque=?,date=? WHERE id=?",
          [e1, e2, rem, UI.today(), exist[0].id]
        );
      } else {
        await DB.exec(
          "INSERT INTO notes_eleves VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
          [DB.shortId(), _shell.nom, cl, mat, code, nom, pren, e1, e2, mois, UI.today(), rem]
        );
      }
      count++;
    }
    await DB.notifyRole("directrice", `Notes saisies — ${mat} — ${cl} — ${mois} — par ${_shell.nom}`, "info");
    UI.toast(`${count} note(s) enregistrée(s)`, "success");
  }

  return {
    init,
    espaceProf, mesEleves, saisirAbsences, signalerAbsenceProf,
    deposerDemande, planifierExamensProf, saisieNotesProf,
    // inline handlers
    _loadElevesAbs, _enregistrerAbsences, _absTab,
    _submitAbsenceProf, _submitDemande,
    _saveExamen, _deleteExamen,
    _loadNotesList, _saveNotes
  };
})();
