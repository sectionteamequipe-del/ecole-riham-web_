/* ═══════════════════════════════════
   config.js — Constantes & config BDD
   ═══════════════════════════════════ */

const CFG = {
  // Turso database (libsql HTTP API)
  TURSO_URL:   "https://ecoleriham-akirus.aws-eu-west-1.turso.io",
  TURSO_TOKEN: (() => {
    try {
      return localStorage.getItem("ecoleRihamTursoToken") || "";
    } catch {
      return "";
    }
  })(),

  setTursoToken(token) {
    const clean = String(token || "").trim();
    this.TURSO_TOKEN = clean;
    try {
      if (clean) localStorage.setItem("ecoleRihamTursoToken", clean);
      else localStorage.removeItem("ecoleRihamTursoToken");
    } catch {}
  },

  hasTursoToken() {
    return Boolean(String(this.TURSO_TOKEN || "").trim());
  },

  CLASSES: [
    "DEPE 1","1PS","2PS",
    "1APG-1","1APG-2","2APG-1","2APG-2",
    "3APG-1","4APG-1","5APG-1","6APG-1"
  ],

  MOIS: [
    "Septembre","Octobre","Novembre","Décembre",
    "Janvier","Février","Mars","Avril",
    "Mai","Juin","Juillet","Août"
  ],

  MATIERES: [
    "اللغة العربية","اللغة الفرنسية","اللغة الإنجليزية",
    "الرياضيات","maths","Sciences","النشاط العلمي",
    "الاجتماعيات","التربية الإسلامية","التربية البدنية","الفنون التشكيلية"
  ],

  ROLE_PALETTE: {
    gerante:    { sidebar:"#1A3A5C", accent:"#2C5282", gold:"#C8A84B" },
    directrice: { sidebar:"#145A32", accent:"#1E8449", gold:"#A9DFBF" },
    professeur: { sidebar:"#4A235A", accent:"#6C3483", gold:"#D7BDE2" }
  },

  ROLE_ICON: {
    gerante:    "👩‍💼",
    directrice: "👩‍🎓",
    professeur: "🧑‍🏫"
  },

  ROLE_LABEL: {
    gerante:    "GÉRANTE",
    directrice: "DIRECTRICE",
    professeur: "PROFESSEUR(E)"
  }
};
