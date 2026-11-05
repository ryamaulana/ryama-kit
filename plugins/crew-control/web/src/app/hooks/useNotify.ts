import { useCallback, useEffect, useRef, useState } from 'react';
import type { ProjectSummary } from '../../../../src/contract/projects.js';
import { newTriggers, parseSound, snapshot, SOUND_KEY, tabTitle } from '../lib/notify.js';

const read = () => { try { return parseSound(localStorage.getItem(SOUND_KEY)); } catch { return true; } };

function beep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
    osc.onended = () => void ctx.close();
  } catch { /* browser menolak bunyi sebelum ada interaksi: judul tab tetap jalan */ }
}

/** Judul tab + satu bunyi per pemicu baru (PRD F6, Fase 1). Bunyi diingat di localStorage. */
export function useNotify(projects: ProjectSummary[] | undefined) {
  const [soundOn, setSoundState] = useState(read);
  const prev = useRef<ReturnType<typeof snapshot> | null>(null);
  const soundRef = useRef(soundOn);
  soundRef.current = soundOn;
  useEffect(() => {
    if (!projects) return;
    document.title = tabTitle(projects);
    if (newTriggers(prev.current, projects).length && soundRef.current) beep(); // satu bunyi per pembaruan, bukan per pemicu
    prev.current = snapshot(projects);
  }, [projects]);
  const setSoundOn = useCallback((on: boolean) => {
    try { localStorage.setItem(SOUND_KEY, on ? 'on' : 'off'); } catch { /* mode privat: hanya sesi ini */ }
    setSoundState(on);
  }, []);
  return { soundOn, setSoundOn };
}
