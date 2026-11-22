import { useEffect, useRef, useState } from 'react';
import type { UltronMood } from '../../lib/ultronState';

interface Props {
  mood: UltronMood;
  model: string;
  online: boolean | null;
  messages: number;
}

const MOOD_LABEL: Record<UltronMood, string> = {
  idle: 'EN ESPERA',
  listening: 'ESCUCHANDO',
  thinking: 'PENSANDO',
  speaking: 'RESPONDIENDO',
};

/** Animated waveform for the left panel. */
function Wave({ mood }: { mood: UltronMood }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const moodRef = useRef(mood);
  moodRef.current = mood;
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d')!;
    let raf = 0;
    let amp = 0.3;
    const draw = (now: number) => {
      const t = now / 1000;
      const w = (c.width = c.clientWidth * 2);
      const h = (c.height = c.clientHeight * 2);
      const m = moodRef.current;
      const target = m === 'idle' ? 0.25 : m === 'thinking' ? 0.55 : 0.9;
      amp += (target - amp) * 0.05;
      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = 'rgba(255,60,40,0.9)';
      ctx.shadowColor = 'rgba(255,40,20,0.9)';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 4) {
        const k = x / w;
        const env = Math.sin(Math.PI * k);
        const y = h / 2 + Math.sin(k * 18 + t * 4) * Math.sin(k * 5 - t * 1.7) * env * amp * h * 0.42;
        if (x) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.stroke();
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} className="w-full h-10 block" />;
}

/** Animated bar chart for the right panel. */
function Bars({ mood }: { mood: UltronMood }) {
  const [bars, setBars] = useState<number[]>(() => Array.from({ length: 16 }, () => 0.2 + Math.random() * 0.5));
  useEffect(() => {
    const busy = mood !== 'idle';
    const id = setInterval(() => {
      setBars((prev) =>
        prev.map((v) => {
          const target = busy ? 0.35 + Math.random() * 0.65 : 0.15 + Math.random() * 0.45;
          return v + (target - v) * 0.5;
        }),
      );
    }, busy ? 160 : 650);
    return () => clearInterval(id);
  }, [mood]);
  return (
    <div className="flex items-end gap-[3px] h-16">
      {bars.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-[1px] transition-[height] duration-150"
          style={{
            height: `${Math.round(v * 100)}%`,
            background: 'linear-gradient(to top, rgba(255,40,25,0.35), #ff3b2f)',
            boxShadow: '0 0 6px rgba(255,40,25,0.6)',
          }}
        />
      ))}
    </div>
  );
}

/** The two tilted holographic panels on each side of the core. */
export function HoloPanels({ mood, model, online, messages }: Props) {
  const [uptime, setUptime] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => setUptime(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);
  const mm = String(Math.floor(uptime / 60)).padStart(2, '0');
  const ss = String(uptime % 60).padStart(2, '0');

  return (
    <div className="ultron-holo-wrap pointer-events-none absolute inset-0 z-[2]" aria-hidden="true">
      <div className="ultron-holo ultron-holo-left">
        <div className="ultron-holo-title">Estado del sistema</div>
        <div className="ultron-holo-row"><span>Núcleo</span><b>{MOOD_LABEL[mood]}</b></div>
        <div className="ultron-holo-row"><span>Servidor</span><b>{online === false ? 'SIN CONEXIÓN' : online ? 'EN LÍNEA' : '···'}</b></div>
        <div className="ultron-holo-row"><span>Modelo</span><b className="truncate max-w-[120px]">{model || '—'}</b></div>
        <div className="ultron-holo-row"><span>Mensajes</span><b>{messages}</b></div>
        <Wave mood={mood} />
      </div>
      <div className="ultron-holo ultron-holo-right">
        <div className="ultron-holo-title flex justify-between"><span>Actividad</span><span>{mm}:{ss}</span></div>
        <Bars mood={mood} />
        <div className="ultron-holo-axis" />
        <div className="ultron-holo-row"><span>Carga</span><b>{mood === 'idle' ? 'BAJA' : 'ALTA'}</b></div>
      </div>
    </div>
  );
}
