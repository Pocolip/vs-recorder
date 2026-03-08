/**
 * Clears all app storage (localStorage + sessionStorage) and reloads the page.
 * Use when sprites aren't loading or data seems stale — same effect as
 * DevTools → Application → Storage → "Clear site data" + hard refresh (Ctrl+Shift+R).
 * User will need to sign in again after reload.
 */
export function clearAppDataAndRefresh(): void {
  localStorage.clear();
  sessionStorage.clear();
  window.location.reload();
}
