/* ============================================================
   Mediul de execuție — browser sau Node.
   La pre-randare (SSG) modulele sunt importate și componentele
   randate în Node, unde window/document/localStorage nu există.
   Aici stau singurele răspunsuri la „suntem în browser?" plus
   accesoarele care întorc valori neutre când nu suntem.
   Orice cod care atinge window la nivel de modul trece pe aici.
   ============================================================ */

export const IS_BROWSER = typeof window !== "undefined" && typeof document !== "undefined";

/* Parametrii din URL — la build, un set gol. */
export const qsParams = () =>
  new URLSearchParams(IS_BROWSER ? window.location.search : "");

/* Calea din URL. În Node (pre-randare) nu există `location` —
   prerender.mjs pune ruta curentă în `globalThis.__ALPEBO_PATH`. */
export const pathName = () =>
  IS_BROWSER ? window.location.pathname : String(globalThis.__ALPEBO_PATH || "/");

/* localStorage poate lipsi (Node) sau arunca (Safari privat, cookies blocate) —
   în ambele cazuri ne comportăm ca și cum cheia n-ar exista. */
export const lsGet = (key) => {
  if (!IS_BROWSER) return null;
  try { return localStorage.getItem(key); } catch { return null; }
};

export const lsSet = (key, value) => {
  if (!IS_BROWSER) return;
  try { localStorage.setItem(key, value); } catch { /* noop */ }
};

export const lsRemove = (key) => {
  if (!IS_BROWSER) return;
  try { localStorage.removeItem(key); } catch { /* noop */ }
};
