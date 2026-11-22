import { useAppStore } from '../../lib/store';
import { useTtsStore } from '../../lib/tts';
import { useUltronListening, type UltronMood } from '../../lib/ultronState';

/** Works out what the core should look like from the app's live state. */
export function useUltronMood(): UltronMood {
  const listening = useUltronListening();
  const isStreaming = useAppStore((s) => s.streamState.isStreaming);
  const hasContent = useAppStore((s) => s.streamState.content !== '');
  const ttsState = useTtsStore((s) => s.state);

  if (listening) return 'listening';
  if (ttsState === 'speaking' || (isStreaming && hasContent)) return 'speaking';
  if (isStreaming || ttsState === 'loading') return 'thinking';
  return 'idle';
}
