/* ═══════════════════════════════════════════════════════════
   app.js — Point d'entrée de l'application
   ═══════════════════════════════════════════════════════════ */

document.addEventListener("DOMContentLoaded", () => {

  /**
   * Callback déclenché après une connexion réussie.
   * Lance AppShell avec le bon rôle.
   */
  function onLogin(username, role, nom) {
    Shell.launch(username, role, nom, onLogin);
  }

  // Démarrer sur l'écran de sélection du rôle
  Auth.showWelcome(onLogin);

  // ── Expositions globales pour les onclick inline dans les pages ──
  // (les modules sont déjà dans le scope global, mais on s'assure
  //  que Shell a le bon contexte pour les modules)
  window.Shell      = Shell;
  window.Gerante    = Gerante;
  window.Directrice = Directrice;
  window.Professeur = Professeur;
  window.UI         = UI;
  window.DB         = DB;
});
