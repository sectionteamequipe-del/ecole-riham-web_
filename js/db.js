/* ═══════════════════════════════════════════
   db.js — Turso HTTP API (libsql) wrapper
   ═══════════════════════════════════════════ */

const DB = (() => {

  function _assertConfigured() {
    if (!CFG.TURSO_URL || !CFG.hasTursoToken()) {
      throw new Error("Configuration de la base manquante. Ouvrez la configuration de la base et ajoutez le jeton Turso prive sur cet appareil.");
    }
  }

  /**
   * Convertit un paramètre JS en objet arg Turso.
   */
  function _toArg(v) {
    if (v === null || v === undefined) return { type: "null" };
    if (typeof v === "number" && Number.isInteger(v)) return { type: "integer", value: String(v) };
    if (typeof v === "number") return { type: "float", value: String(v) };
    return { type: "text", value: String(v) };
  }

  /**
   * Exécute une requête SQL sur la base Turso.
   * Retourne un tableau d'objets { col: val, … }
   */
  async function query(sql, params = []) {
    _assertConfigured();

    const body = {
      requests: [
        {
          type: "execute",
          stmt: { sql, args: params.map(_toArg) }
        },
        { type: "close" }
      ]
    };

    let resp;
    try {
      resp = await fetch(`${CFG.TURSO_URL}/v2/pipeline`, {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${CFG.TURSO_TOKEN}`
        },
        body: JSON.stringify(body)
      });
    } catch (netErr) {
      throw new Error("Erreur réseau — vérifiez votre connexion internet.");
    }

    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      throw new Error(`HTTP ${resp.status}: ${txt}`);
    }

    const data = await resp.json();
    const result = data.results?.[0];

    if (!result) throw new Error("Réponse inattendue de la base de données.");
    if (result.type === "error") throw new Error(result.error?.message || "Erreur BD");

    const cols = (result.response?.result?.cols ?? []).map(c => c.name);
    const rows = result.response?.result?.rows ?? [];

    return rows.map(row => {
      const obj = {};
      cols.forEach((col, i) => {
        const cell = row[i];
        obj[col] = (cell?.type === "null") ? null : (cell?.value ?? null);
      });
      return obj;
    });
  }

  /**
   * Alias exec (INSERT / UPDATE / DELETE).
   * Retourne le résultat pour les RETURNING, sinon [].
   */
  async function exec(sql, params = []) {
    return query(sql, params);
  }

  /**
   * Hash SHA-256 d'un mot de passe (identique à Python hashlib.sha256).
   */
  async function hashPwd(password) {
    const enc  = new TextEncoder();
    const buf  = await crypto.subtle.digest("SHA-256", enc.encode(password));
    return Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, "0")).join("");
  }

  /**
   * Génère un UUID court (8 chars) — compatible avec Python uuid.uuid4()[:8]
   */
  function shortId() {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  }

  /**
   * Ajoute une notification en BDD.
   */
  async function addNotif(username, msg, level = "info") {
    const now = new Date().toLocaleString("fr-FR", { day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" }).replace(",","");
    await exec(
      "INSERT INTO notifications VALUES (?,?,?,?,?,0)",
      [shortId(), username, msg, level, now]
    );
  }

  /**
   * Notifie tous les utilisateurs d'un rôle.
   */
  async function notifyRole(role, msg, level = "info") {
    const users = await query("SELECT username FROM users WHERE role=?", [role]);
    for (const u of users) await addNotif(u.username, msg, level);
  }

  return { query, exec, hashPwd, shortId, addNotif, notifyRole };
})();
