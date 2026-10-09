// ============================================================
// SCHAKELAAR: staat de app open voor gebruik?
//   false -> knop "Bèta start binnenkort" (niet klikbaar)
//   true  -> knop "Naar de app" met link naar APP_URL
// Zet dit pas op true na de productie-switch van de app.
// ============================================================
const APP_LIVE = false;
const APP_URL = 'https://app.puntum.nl';

(function () {
  var knop = document.getElementById('app-knop');
  if (knop && APP_LIVE) {
    var a = document.createElement('a');
    a.id = 'app-knop';
    a.className = 'knop';
    a.href = APP_URL;
    a.textContent = 'Naar de app';
    knop.replaceWith(a);
  }
  var jaar = document.getElementById('jaar');
  if (jaar) jaar.textContent = new Date().getFullYear();
})();
