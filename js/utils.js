/* ═══════════════════════════════════════════
   utils.js — Helpers UI
   ═══════════════════════════════════════════ */

const UI = (() => {

  /* ── Screens ── */
  function showScreen(id) {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    const s = document.getElementById("screen-" + id);
    if (s) s.classList.add("active");
  }

  /* ── Toast ── */
  function toast(msg, type = "info", duration = 3500) {
    const tc  = document.getElementById("toast-container");
    const el  = document.createElement("div");
    el.className = `toast toast-${type}`;
    el.textContent = msg;
    tc.appendChild(el);
    setTimeout(() => el.remove(), duration);
  }

  /* ── Modal ── */
  function modal(title, bodyHTML, footerHTML = "") {
    document.getElementById("modal-title").textContent = title;
    document.getElementById("modal-body").innerHTML   = bodyHTML;
    document.getElementById("modal-footer").innerHTML = footerHTML;
    document.getElementById("modal-overlay").style.display = "flex";
  }
  function closeModal() {
    document.getElementById("modal-overlay").style.display = "none";
  }
  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("modal-close").addEventListener("click", closeModal);
    document.getElementById("modal-overlay").addEventListener("click", e => {
      if (e.target === document.getElementById("modal-overlay")) closeModal();
    });
  });

  /* ── Loader ── */
  function showLoader(v = true) {
    document.getElementById("page-loader").style.display = v ? "flex" : "none";
    document.getElementById("page-root").style.display   = v ? "none" : "";
  }

  /* ── Page root ── */
  function setPage(html) {
    document.getElementById("page-root").innerHTML = html;
    showLoader(false);
  }

  /* ── HTML helpers ── */
  function esc(s) {
    return String(s ?? "")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;");
  }

  function badge(text, type = "muted") {
    return `<span class="badge badge-${type}">${esc(text)}</span>`;
  }

  function statusBadge(statut) {
    const map = {
      "payé":       ["success","✅ Payé"],
      "paye":       ["success","✅ Payé"],
      "partiel":    ["warning","⚠️ Partiel"],
      "impayé":     ["danger","❌ Impayé"],
      "impaye":     ["danger","❌ Impayé"],
      "validée":    ["success","✅ Validée"],
      "valide":     ["success","✅ Validée"],
      "refusée":    ["danger","❌ Refusée"],
      "refuse":     ["danger","❌ Refusée"],
      "soumise":    ["info","📨 Soumise"],
      "en_attente": ["warning","⏳ En attente"],
      "approuvé":   ["success","✅ Approuvé"],
      "retiré":     ["muted","📤 Retiré"],
      "non justifiée":["danger","❌ Non just."],
      "justifiée":  ["success","✅ Justifiée"],
    };
    const [type, label] = map[String(statut).toLowerCase()] ?? ["muted", esc(statut)];
    return `<span class="badge badge-${type}">${label}</span>`;
  }

  function noteBox(val) {
    const n = parseFloat(val);
    if (isNaN(n)) return `<span class="stat-note-box note-mid">—</span>`;
    const cls = n >= 7 ? "note-high" : n >= 5 ? "note-mid" : "note-low";
    return `<span class="stat-note-box ${cls}">${n.toFixed(1)}</span>`;
  }

  function pageHeader(icon, title, subtitle = "") {
    return `<div class="page-header">
      <span style="font-size:20px">${icon}</span>
      <div>
        <h1>${esc(title)}</h1>
        ${subtitle ? `<p style="font-size:11px;color:var(--muted)">${esc(subtitle)}</p>` : ""}
      </div>
    </div>
    <div class="page-body" id="pb">`;
  }

  function tableHTML(cols, rows, renderRow) {
    const hdrs = cols.map(c => `<th>${esc(c)}</th>`).join("");
    const body = rows.length
      ? rows.map(r => `<tr>${renderRow(r)}</tr>`).join("")
      : `<tr><td colspan="${cols.length}" style="text-align:center;color:var(--muted);padding:24px">Aucune donnée</td></tr>`;
    return `<div class="table-wrap"><table>
      <thead><tr>${hdrs}</tr></thead>
      <tbody>${body}</tbody>
    </table></div>`;
  }

  function kpiBox(val, label, color) {
    return `<div class="kpi-box" style="background:${color}">
      <div class="kpi-val">${esc(String(val))}</div>
      <div class="kpi-lbl">${esc(label)}</div>
    </div>`;
  }

  /* ── Today ── */
  function today() {
    const d = new Date();
    return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
  }

  function fmtDate(raw) {
    if (!raw || raw === "nan") return "";
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) return raw;
    const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
    return raw;
  }

  /* ── Confirm dialog (simple) ── */
  function confirm(msg, onYes) {
    modal("Confirmation",
      `<p style="padding:12px 0">${esc(msg)}</p>`,
      `<button class="btn btn-danger" id="confirm-yes">Confirmer</button>
       <button class="btn btn-outline" onclick="UI.closeModal()">Annuler</button>`
    );
    setTimeout(() => {
      const btn = document.getElementById("confirm-yes");
      if (btn) btn.onclick = () => { closeModal(); onYes(); };
    }, 50);
  }

  /* ── Select-all helper ── */
  function selectOpts(list, selected = "", placeholder = "— Choisir —") {
    const opts = list.map(v => `<option value="${esc(v)}" ${v === selected ? "selected" : ""}>${esc(v)}</option>`).join("");
    return `<option value="">${placeholder}</option>${opts}`;
  }

  return {
    showScreen, toast, modal, closeModal, showLoader, setPage,
    esc, badge, statusBadge, noteBox, pageHeader, tableHTML, kpiBox,
    today, fmtDate, confirm, selectOpts
  };
})();
