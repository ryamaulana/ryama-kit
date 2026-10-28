// Pemberitahuan: judul tab berkedip, bunyi (WebAudio), notifikasi desktop. Semua bisa dimatikan di pengaturan.
const get = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (_) { return d; } };
const set = (k, v) => { try { localStorage.setItem(k, v); } catch (_) { /* abaikan */ } };
export const prefs = {
  sound: () => get('fv-sound', '1') === '1',
  desktop: () => get('fv-desktop', '0') === '1',
  setSound(v) { set('fv-sound', v ? '1' : '0'); },
  setDesktop(v) { set('fv-desktop', v ? '1' : '0'); },
};
let ac = null, blink = null; const base = 'Flow Viewer';
function beep(kind) {
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    const o = ac.createOscillator(), g = ac.createGain(); o.connect(g); g.connect(ac.destination);
    o.frequency.value = kind === 'failed' ? 330 : 660; g.gain.setValueAtTime(0.0001, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.12, ac.currentTime + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.35);
    o.start(); o.stop(ac.currentTime + 0.4);
  } catch (_) { /* audio tidak tersedia */ }
}
export function titleBlink(text) {
  clearInterval(blink); let on = false;
  if (!text) { document.title = base; return; }
  blink = setInterval(() => { on = !on; document.title = on ? text : base; }, 1000);
}
export function clearTitle() { titleBlink(''); }
export async function askDesktop() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  try { return (await Notification.requestPermission()) === 'granted'; } catch (_) { return false; }
}
// Dipanggil saat ada item perhatian baru. `a` = {kind,text,agent}.
export function alertNew(a, label) {
  const head = { question: 'Claude butuh jawabanmu', permission: 'Claude butuh izinmu', decision: 'Butuh keputusanmu', failed: 'Agent gagal', done: 'Run selesai' }[a.kind] || 'Perhatian';
  if (document.visibilityState !== 'visible') titleBlink('● ' + head);
  if (prefs.sound()) beep(a.kind);
  if (prefs.desktop() && 'Notification' in window && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
    try { new Notification(head, { body: (label ? label + ': ' : '') + (a.text || '') }); } catch (_) { /* abaikan */ }
  }
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') clearTitle(); });
