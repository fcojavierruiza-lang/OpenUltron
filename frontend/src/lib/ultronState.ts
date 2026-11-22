import { useSyncExternalStore } from 'react';

/**
 * What the Ultron core is doing right now. The 3D core reads this to change
 * its speed, brightness and colour.
 */
export type UltronMood = 'idle' | 'listening' | 'thinking' | 'speaking';

let listening = false;
const listeners = new Set<() => void>();

/** Called by the input bar while the microphone is recording. */
export function setUltronListening(value: boolean) {
  if (listening === value) return;
  listening = value;
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useUltronListening(): boolean {
  return useSyncExternalStore(subscribe, () => listening, () => false);
}
