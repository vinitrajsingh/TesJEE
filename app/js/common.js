/* TesJEE common utilities */
const TJ = (function () {
  const KEY_PREFIX = 'tesjee_';

  function k(s) { return KEY_PREFIX + s; }

  /* ===== storage ===== */
  function load(key, fallback = null) {
    try {
      const raw = localStorage.getItem(k(key));
      return raw == null ? fallback : JSON.parse(raw);
    } catch { return fallback; }
  }
  function save(key, val) {
    try { localStorage.setItem(k(key), JSON.stringify(val)); }
    catch (e) { console.warn('save fail', e); }
  }
  function remove(key) { localStorage.removeItem(k(key)); }

  /* ===== keys ===== */
  function activeKey(year, paper) { return `attempt_${year}_p${paper}`; }
  function resultKey(year, paper) { return `result_${year}_p${paper}`; }
  function historyKey() { return `history`; }

  /* ===== query ===== */
  function qs(name) {
    const u = new URL(window.location.href);
    return u.searchParams.get(name);
  }

  /* ===== formatting ===== */
  function fmtTime(ms) {
    if (ms < 0) ms = 0;
    const s = Math.floor(ms / 1000);
    const hh = String(Math.floor(s / 3600)).padStart(2, '0');
    const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }
  function fmtNum(n, decimals = 2) {
    if (n === undefined || n === null || Number.isNaN(n)) return '0';
    if (Number.isInteger(n)) return String(n);
    return Number(n.toFixed(decimals)).toString();
  }

  /* ===== load JSON ===== */
  async function loadPaper(year, paper) {
    const res = await fetch(`data/${year}_paper${paper}.json`);
    if (!res.ok) throw new Error('Could not load paper ' + paper);
    return await res.json();
  }

  /* ===== history ===== */
  function pushHistory(entry) {
    const h = load(historyKey(), []) || [];
    h.unshift(entry);
    save(historyKey(), h.slice(0, 50));
  }

  /* ===== year statuses ===== */
  function getYearStatus(year) {
    const p1Result = load(resultKey(year, 1));
    const p2Result = load(resultKey(year, 2));
    const p1Active = load(activeKey(year, 1));
    const p2Active = load(activeKey(year, 2));
    let status = 'fresh';
    if (p1Result && p2Result) status = 'done';
    else if (p1Result || p2Result || p1Active || p2Active) status = 'progress';
    return {
      status,
      p1Result, p2Result, p1Active, p2Active
    };
  }

  function clearYear(year) {
    remove(activeKey(year, 1));
    remove(activeKey(year, 2));
    remove(resultKey(year, 1));
    remove(resultKey(year, 2));
  }

  /* ===== service worker registration ===== */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }

  return {
    k, load, save, remove,
    activeKey, resultKey, historyKey,
    qs, fmtTime, fmtNum,
    loadPaper, pushHistory,
    getYearStatus, clearYear
  };
})();
