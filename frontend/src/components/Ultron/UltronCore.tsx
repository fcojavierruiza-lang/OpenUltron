import { useEffect, useRef } from 'react';
import type { UltronMood } from '../../lib/ultronState';

/**
 * Ultron's 3D core, drawn with Canvas 2D:
 * a glass sphere full of red plasma filaments and lightning, a white-hot
 * centre, metallic rings turning around it, HUD arcs, and a glossy floor
 * with concentric light rings and a reflection.
 *
 * It reacts to `mood`: listening turns it deep red and brighter, thinking
 * spins it faster, speaking makes it flicker.
 */

type Vec3 = [number, number, number];

interface Props {
  mood: UltronMood;
  /** Smaller and higher up, for when a conversation is on screen. */
  compact?: boolean;
  className?: string;
}

interface RingDef {
  radius: number;
  width: number;
  rx: number;
  rz: number;
  wx: number;
  wz: number;
  rivets: boolean;
}

const RINGS: RingDef[] = [
  { radius: 1.07, width: 0.15, rx: 1.12, rz: 0.38, wx: 0.11, wz: 0.05, rivets: true },
  { radius: 1.13, width: 0.11, rx: 0.42, rz: -0.95, wx: -0.07, wz: 0.09, rivets: true },
  { radius: 1.19, width: 0.08, rx: 1.48, rz: 1.15, wx: 0.05, wz: -0.06, rivets: true },
  { radius: 1.3, width: 0.055, rx: 0.16, rz: 0.06, wx: 0.0, wz: 0.02, rivets: false },
];

const SEGMENTS = 120;

function rand(seed: number) {
  // Small deterministic PRNG so the plasma looks the same on every load.
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function normalize(v: Vec3): Vec3 {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}
function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function dot(a: Vec3, b: Vec3) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
function rotX(v: Vec3, a: number): Vec3 {
  const c = Math.cos(a), s = Math.sin(a);
  return [v[0], v[1] * c - v[2] * s, v[1] * s + v[2] * c];
}
function rotY(v: Vec3, a: number): Vec3 {
  const c = Math.cos(a), s = Math.sin(a);
  return [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c];
}
function rotZ(v: Vec3, a: number): Vec3 {
  const c = Math.cos(a), s = Math.sin(a);
  return [v[0] * c - v[1] * s, v[0] * s + v[1] * c, v[2]];
}

/** Random walks on spheres of different radii: the plasma filaments. */
function buildFilaments(): Vec3[][] {
  const r = rand(7);
  const out: Vec3[][] = [];
  for (let i = 0; i < 56; i++) {
    const radius = 0.25 + r() * 0.72;
    let p = normalize([r() * 2 - 1, r() * 2 - 1, r() * 2 - 1]);
    let d = normalize(cross(p, normalize([r() * 2 - 1, r() * 2 - 1, r() * 2 - 1])));
    const pts: Vec3[] = [];
    const steps = 26 + Math.floor(r() * 26);
    for (let k = 0; k < steps; k++) {
      pts.push([p[0] * radius, p[1] * radius, p[2] * radius]);
      const turn = (r() - 0.5) * 0.9;
      const side = cross(p, d);
      d = normalize([d[0] + side[0] * turn, d[1] + side[1] * turn, d[2] + side[2] * turn]);
      p = normalize([p[0] + d[0] * 0.09, p[1] + d[1] * 0.09, p[2] + d[2] * 0.09]);
      d = normalize(cross(cross(p, d), p));
    }
    out.push(pts);
  }
  return out;
}

const LIGHT: Vec3 = normalize([-0.45, 0.65, 0.65]);
const HALF: Vec3 = normalize([LIGHT[0], LIGHT[1], LIGHT[2] + 1]);

export function UltronCore({ mood, compact = false, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const moodRef = useRef(mood);
  const compactRef = useRef(compact);
  moodRef.current = mood;
  compactRef.current = compact;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const sphereCanvas = document.createElement('canvas');
    const reflCanvas = document.createElement('canvas');
    const sctx = sphereCanvas.getContext('2d')!;
    const rctx = reflCanvas.getContext('2d')!;

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const filaments = buildFilaments();
    const boltRand = rand(99);
    let bolts: { pts: [number, number][]; life: number }[] = [];
    let lastBolt = 0;

    let w = 0, h = 0, dpr = 1;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = Math.max(1, rect.width);
      h = Math.max(1, rect.height);
      for (const c of [canvas, sphereCanvas, reflCanvas]) {
        c.width = Math.round(w * dpr);
        c.height = Math.round(h * dpr);
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Smoothed animation parameters.
    const s = { energy: 0.55, spin: 1, red: 0, R: 0, cy: 0, phase: 0 };
    let raf = 0;
    let last = performance.now();

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = now / 1000;
      const m = moodRef.current;
      const target = {
        energy: m === 'listening' ? 1 : m === 'thinking' ? 0.85 : m === 'speaking' ? 0.95 : 0.6,
        spin: m === 'thinking' ? 2.6 : m === 'speaking' ? 1.5 : m === 'listening' ? 0.7 : 1,
        red: m === 'listening' ? 1 : 0,
      };
      const k = 1 - Math.exp(-dt * 3);
      s.energy += (target.energy - s.energy) * k;
      s.spin += (target.spin - s.spin) * k;
      s.red += (target.red - s.red) * k;
      const compactNow = compactRef.current;
      const targetR = compactNow ? Math.min(w * 0.13, h * 0.22) : Math.min(w * 0.15, h * 0.235);
      const targetCy = compactNow ? h * 0.4 : h * 0.385;
      if (s.R === 0) { s.R = targetR; s.cy = targetCy; }
      const kl = 1 - Math.exp(-dt * 4);
      s.R += (targetR - s.R) * kl;
      s.cy += (targetCy - s.cy) * kl;
      s.phase += dt * s.spin * (reduceMotion ? 0.15 : 1);

      const R = s.R, cx = w / 2, cy = s.cy;
      const flicker = m === 'speaking' ? 0.85 + 0.15 * Math.sin(t * 23) * Math.sin(t * 7.3) : 1;
      const E = s.energy * flicker;
      const red = s.red;
      // Core colours: white-hot normally, pure red while listening.
      const coreHot = [255, Math.round(245 - 150 * red), Math.round(225 - 175 * red)];
      const filamentCol = [255, Math.round(70 - 40 * red), Math.round(40 - 25 * red)];

      const tilt = 0.22;
      const yaw = s.phase * 0.18;
      const F = R * 5;
      const project = (v: Vec3): [number, number, number, number] => {
        let p = rotY(v, yaw);
        p = rotX(p, tilt);
        const sc = F / (F - p[2] * R);
        return [cx + p[0] * R * sc, cy - p[1] * R * sc, p[2], sc];
      };

      // ---------- sphere layer ----------
      sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sctx.clearRect(0, 0, w, h);

      // Rings: build segment quads, split into behind / in front of the sphere.
      type Quad = { pts: [number, number][]; z: number; col: string; rivet: [number, number] | null; edge: string };
      const back: Quad[] = [], front: Quad[] = [];
      RINGS.forEach((ring, ri) => {
        const ax = ring.rx + s.phase * ring.wx;
        const az = ring.rz + s.phase * ring.wz;
        const orient = (v: Vec3) => rotZ(rotX(v, ax), az);
        const u = orient([1, 0, 0]);
        const vv = orient([0, 0, 1]);
        const n = orient([0, 1, 0]);
        const hw = ring.width / 2;
        const spinOff = s.phase * (0.3 + ri * 0.1);
        for (let i = 0; i < SEGMENTS; i++) {
          const a0 = (i / SEGMENTS) * Math.PI * 2;
          const a1 = ((i + 1.15) / SEGMENTS) * Math.PI * 2;
          const radial = (a: number): Vec3 => [
            u[0] * Math.cos(a) + vv[0] * Math.sin(a),
            u[1] * Math.cos(a) + vv[1] * Math.sin(a),
            u[2] * Math.cos(a) + vv[2] * Math.sin(a),
          ];
          const r0 = radial(a0), r1 = radial(a1);
          const P = (rd: Vec3, off: number): Vec3 => [
            rd[0] * ring.radius + n[0] * off,
            rd[1] * ring.radius + n[1] * off,
            rd[2] * ring.radius + n[2] * off,
          ];
          const q = [P(r0, -hw), P(r1, -hw), P(r1, hw), P(r0, hw)].map(project);
          // Shading in view space.
          const rv = rotX(rotY(radial((a0 + a1) / 2), yaw), tilt);
          const facing = rv[2];
          const lam = Math.abs(dot(rv, LIGHT));
          const spec = Math.pow(Math.max(0, Math.abs(dot(rv, HALF))), 28);
          const panel = ((i + Math.floor(spinOff * 6)) % 10 + 10) % 10;
          const band = panel === 0 ? 0.35 : 0.85 + 0.15 * Math.sin((a0 + spinOff) * 7);
          const spec2 = Math.pow(spec, 2);
          let r = 16 + 120 * lam * band + 120 * spec + 140 * spec2;
          let g = 16 + 122 * lam * band + 120 * spec + 140 * spec2;
          let b = 20 + 130 * lam * band + 125 * spec + 140 * spec2;
          if (facing < 0) {
            // Inner face: lit red by the plasma.
            r += 190 * E; g += 14 * E; b += 8 * E;
          }
          const col = `rgb(${Math.min(255, r) | 0},${Math.min(255, g) | 0},${Math.min(255, b) | 0})`;
          const zMid = (q[0][2] + q[2][2]) / 2;
          const rivet: [number, number] | null = ring.rivets && i % 6 === 0 && facing > 0.1
            ? [(q[0][0] + q[3][0]) / 2, (q[0][1] + q[3][1]) / 2]
            : null;
          const quad: Quad = {
            pts: q.map((p) => [p[0], p[1]] as [number, number]),
            z: zMid,
            col,
            rivet,
            edge: facing < 0 ? `rgba(255,60,40,${0.5 * E})` : 'rgba(0,0,0,0.55)',
          };
          (zMid < 0 ? back : front).push(quad);
        }
      });
      back.sort((a, b) => a.z - b.z);
      front.sort((a, b) => a.z - b.z);
      const drawQuads = (qs: Quad[]) => {
        for (const qd of qs) {
          sctx.beginPath();
          sctx.moveTo(qd.pts[0][0], qd.pts[0][1]);
          for (let i = 1; i < 4; i++) sctx.lineTo(qd.pts[i][0], qd.pts[i][1]);
          sctx.closePath();
          sctx.fillStyle = qd.col;
          sctx.fill();
          sctx.strokeStyle = qd.edge;
          sctx.lineWidth = 0.6;
          sctx.beginPath();
          sctx.moveTo(qd.pts[0][0], qd.pts[0][1]);
          sctx.lineTo(qd.pts[1][0], qd.pts[1][1]);
          sctx.moveTo(qd.pts[2][0], qd.pts[2][1]);
          sctx.lineTo(qd.pts[3][0], qd.pts[3][1]);
          sctx.stroke();
          if (qd.rivet) {
            sctx.fillStyle = 'rgba(230,230,235,0.75)';
            sctx.beginPath();
            sctx.arc(qd.rivet[0], qd.rivet[1], Math.max(0.8, R * 0.008), 0, Math.PI * 2);
            sctx.fill();
          }
        }
      };
      drawQuads(back);

      // Glass body.
      const body = sctx.createRadialGradient(cx - R * 0.15, cy - R * 0.2, R * 0.1, cx, cy, R);
      body.addColorStop(0, `rgba(170,18,10,${0.6 + 0.25 * E})`);
      body.addColorStop(0.55, 'rgba(90,6,5,0.85)');
      body.addColorStop(0.92, 'rgba(30,3,3,0.92)');
      body.addColorStop(1, 'rgba(70,6,5,0.95)');
      sctx.fillStyle = body;
      sctx.beginPath();
      sctx.arc(cx, cy, R, 0, Math.PI * 2);
      sctx.fill();

      // Plasma filaments.
      sctx.globalCompositeOperation = 'lighter';
      sctx.lineCap = 'round';
      sctx.lineJoin = 'round';
      filaments.forEach((pts, fi) => {
        const shimmer = 0.55 + 0.45 * Math.sin(t * (1.3 + (fi % 5) * 0.4) + fi);
        const proj = pts.map(project);
        for (const pass of [0, 1]) {
          sctx.beginPath();
          proj.forEach((p, i) => (i ? sctx.lineTo(p[0], p[1]) : sctx.moveTo(p[0], p[1])));
          const depth = 0.45 + 0.55 * ((proj[(proj.length / 2) | 0][2] + 1) / 2);
          const a = (pass ? 0.9 : 0.2) * shimmer * depth * E;
          sctx.strokeStyle = pass
            ? `rgba(${filamentCol[0]},${filamentCol[1] + 40},${filamentCol[2] + 20},${a})`
            : `rgba(${filamentCol[0]},${filamentCol[1]},${filamentCol[2]},${a})`;
          sctx.lineWidth = pass ? Math.max(0.7, R * 0.0065) : Math.max(2.5, R * 0.035);
          sctx.stroke();
        }
      });
      // Inner nebula glow.
      const neb = sctx.createRadialGradient(cx, cy, R * 0.1, cx, cy, R * 0.95);
      neb.addColorStop(0, `rgba(255,60,30,${0.35 * E})`);
      neb.addColorStop(0.6, `rgba(200,20,10,${0.18 * E})`);
      neb.addColorStop(1, 'rgba(120,0,0,0)');
      sctx.fillStyle = neb;
      sctx.beginPath();
      sctx.arc(cx, cy, R, 0, Math.PI * 2);
      sctx.fill();

      // Lightning from the core.
      if (!reduceMotion && t - lastBolt > 0.09 / Math.max(0.4, E)) {
        lastBolt = t;
        const count = Math.round(2 + 4 * E);
        bolts = bolts.filter((b) => b.life > 0.25);
        for (let i = 0; i < count; i++) {
          const dir = normalize([boltRand() * 2 - 1, boltRand() * 2 - 1, boltRand() * 2 - 1]);
          const end = project([dir[0] * 0.95, dir[1] * 0.95, dir[2] * 0.95]);
          let seg: [number, number][] = [[cx, cy], [end[0], end[1]]];
          let disp = R * 0.22;
          for (let d = 0; d < 5; d++) {
            const next: [number, number][] = [seg[0]];
            for (let j = 0; j < seg.length - 1; j++) {
              const [x0, y0] = seg[j], [x1, y1] = seg[j + 1];
              next.push([(x0 + x1) / 2 + (boltRand() - 0.5) * disp, (y0 + y1) / 2 + (boltRand() - 0.5) * disp]);
              next.push(seg[j + 1]);
            }
            seg = next;
            disp *= 0.55;
          }
          bolts.push({ pts: seg, life: 1 });
        }
      }
      for (const b of bolts) {
        b.life -= dt * 4;
        if (b.life <= 0) continue;
        for (const pass of [0, 1]) {
          sctx.beginPath();
          b.pts.forEach((p, i) => (i ? sctx.lineTo(p[0], p[1]) : sctx.moveTo(p[0], p[1])));
          sctx.strokeStyle = pass
            ? `rgba(255,${Math.round(200 - 140 * red)},${Math.round(170 - 130 * red)},${0.8 * b.life})`
            : `rgba(255,40,25,${0.25 * b.life})`;
          sctx.lineWidth = pass ? Math.max(0.7, R * 0.007) : Math.max(2.5, R * 0.03);
          sctx.stroke();
        }
      }

      // White-hot centre.
      const coreR = R * (0.42 + 0.1 * E + 0.03 * Math.sin(t * 2.1));
      const core = sctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
      core.addColorStop(0, `rgba(${coreHot[0]},${coreHot[1]},${coreHot[2]},1)`);
      core.addColorStop(0.18, `rgba(255,${Math.round(170 - 110 * red)},${Math.round(90 - 60 * red)},0.9)`);
      core.addColorStop(0.5, 'rgba(255,45,20,0.35)');
      core.addColorStop(1, 'rgba(255,20,10,0)');
      sctx.fillStyle = core;
      sctx.beginPath();
      sctx.arc(cx, cy, coreR, 0, Math.PI * 2);
      sctx.fill();
      // Horizontal flare.
      sctx.save();
      sctx.translate(cx, cy);
      sctx.scale(1, 0.035);
      const flare = sctx.createRadialGradient(0, 0, 0, 0, 0, R * 1.5);
      flare.addColorStop(0, `rgba(255,${Math.round(200 - 140 * red)},${Math.round(160 - 120 * red)},${0.75 * E})`);
      flare.addColorStop(1, 'rgba(255,40,20,0)');
      sctx.fillStyle = flare;
      sctx.beginPath();
      sctx.arc(0, 0, R * 1.5, 0, Math.PI * 2);
      sctx.fill();
      sctx.restore();

      // Rim light and a soft highlight on the glass.
      sctx.strokeStyle = `rgba(255,50,35,${0.35 + 0.25 * E})`;
      sctx.lineWidth = Math.max(1, R * 0.012);
      sctx.beginPath();
      sctx.arc(cx, cy, R, 0, Math.PI * 2);
      sctx.stroke();
      sctx.globalCompositeOperation = 'source-over';
      const hl = sctx.createRadialGradient(cx - R * 0.42, cy - R * 0.5, 0, cx - R * 0.42, cy - R * 0.5, R * 0.45);
      hl.addColorStop(0, 'rgba(255,255,255,0.10)');
      hl.addColorStop(1, 'rgba(255,255,255,0)');
      sctx.fillStyle = hl;
      sctx.beginPath();
      sctx.arc(cx, cy, R, 0, Math.PI * 2);
      sctx.fill();

      drawQuads(front);

      // ---------- main canvas ----------
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const floorY = cy + R * 1.3;

      // Halo behind everything.
      const halo = ctx.createRadialGradient(cx, cy, R * 0.6, cx, cy, R * 2.6);
      halo.addColorStop(0, `rgba(255,35,20,${0.22 * E})`);
      halo.addColorStop(1, 'rgba(255,35,20,0)');
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, w, h);

      // HUD arcs around the sphere.
      ctx.save();
      ctx.translate(cx, cy);
      const arcs = [
        { r: 1.45, a0: 3.5, len: 1.4, sp: 0.06, wd: 1.4, al: 0.6 },
        { r: 1.45, a0: 5.6, len: 1.1, sp: 0.06, wd: 1.4, al: 0.6 },
        { r: 1.56, a0: 2.6, len: 1.0, sp: -0.05, wd: 2.2, al: 0.4 },
        { r: 1.56, a0: 0.1, len: 0.8, sp: -0.05, wd: 2.2, al: 0.4 },
        { r: 1.68, a0: 1.9, len: 2.2, sp: 0.03, wd: 0.8, al: 0.3 },
      ];
      for (const a of arcs) {
        const start = a.a0 + s.phase * a.sp;
        ctx.strokeStyle = `rgba(255,45,30,${a.al * (0.6 + 0.4 * E)})`;
        ctx.lineWidth = a.wd;
        ctx.beginPath();
        ctx.arc(0, 0, R * a.r, start, start + a.len);
        ctx.stroke();
        // Ticks.
        ctx.lineWidth = 1;
        for (let k2 = 0; k2 <= 12; k2++) {
          const ang = start + (a.len * k2) / 12;
          const r0 = R * a.r, r1 = r0 + (k2 % 3 === 0 ? R * 0.05 : R * 0.025);
          ctx.beginPath();
          ctx.moveTo(Math.cos(ang) * r0, Math.sin(ang) * r0);
          ctx.lineTo(Math.cos(ang) * r1, Math.sin(ang) * r1);
          ctx.stroke();
        }
      }
      ctx.restore();

      // Floor: light pool and concentric rings.
      ctx.save();
      ctx.translate(cx, floorY);
      ctx.scale(1, 0.17);
      const pool = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 3.4);
      pool.addColorStop(0, `rgba(255,40,25,${0.4 * E})`);
      pool.addColorStop(0.4, `rgba(140,10,8,${0.18 * E})`);
      pool.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = pool;
      ctx.beginPath();
      ctx.arc(0, 0, R * 3.4, 0, Math.PI * 2);
      ctx.fill();
      const ringRadii = [0.55, 0.85, 1.2, 1.6, 2.1, 2.7, 3.4];
      ringRadii.forEach((rr, i) => {
        const al = (0.75 - i * 0.09) * (0.5 + 0.5 * E);
        ctx.strokeStyle = `rgba(255,${50 + i * 4},${35 + i * 3},${al})`;
        ctx.lineWidth = (i < 3 ? 2.2 : 1.2) / 0.17 * 0.5;
        ctx.beginPath();
        ctx.arc(0, 0, R * rr, 0, Math.PI * 2);
        ctx.stroke();
        // Bright travelling segment on some rings.
        if (i % 2 === 0) {
          const st = s.phase * (0.4 - i * 0.05) + i;
          ctx.strokeStyle = `rgba(255,${Math.round(150 - 90 * red)},${Math.round(120 - 80 * red)},${al})`;
          ctx.lineWidth = 3 / 0.17 * 0.5;
          ctx.beginPath();
          ctx.arc(0, 0, R * rr, st, st + 0.5);
          ctx.stroke();
        }
      });
      // Pedestal.
      const ped = ctx.createRadialGradient(0, -R * 0.08, 0, 0, 0, R * 0.32);
      ped.addColorStop(0, 'rgba(70,62,66,0.95)');
      ped.addColorStop(0.7, 'rgba(28,22,24,0.95)');
      ped.addColorStop(1, 'rgba(12,8,9,0.95)');
      ctx.fillStyle = ped;
      ctx.beginPath();
      ctx.arc(0, 0, R * 0.32, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(255,50,35,${0.7 * E})`;
      ctx.lineWidth = 2 / 0.17 * 0.5;
      ctx.stroke();
      ctx.restore();
      // Stand.
      ctx.strokeStyle = 'rgba(90,90,96,0.9)';
      ctx.lineWidth = Math.max(1.5, R * 0.018);
      ctx.beginPath();
      ctx.moveTo(cx, cy + R * 1.02);
      ctx.lineTo(cx, floorY);
      ctx.stroke();

      // Reflection of the sphere on the glossy floor.
      rctx.setTransform(1, 0, 0, 1, 0, 0);
      rctx.globalCompositeOperation = 'source-over';
      rctx.clearRect(0, 0, reflCanvas.width, reflCanvas.height);
      rctx.save();
      rctx.translate(0, 2 * floorY * dpr);
      rctx.scale(1, -1);
      rctx.drawImage(sphereCanvas, 0, 0);
      rctx.restore();
      rctx.globalCompositeOperation = 'destination-in';
      const fade = rctx.createLinearGradient(0, floorY * dpr, 0, (floorY + R * 1.3) * dpr);
      fade.addColorStop(0, 'rgba(0,0,0,0.38)');
      fade.addColorStop(1, 'rgba(0,0,0,0)');
      rctx.fillStyle = fade;
      rctx.fillRect(0, floorY * dpr, reflCanvas.width, reflCanvas.height);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, floorY * dpr, canvas.width, canvas.height);
      ctx.clip();
      ctx.drawImage(reflCanvas, 0, 0);
      ctx.restore();

      ctx.drawImage(sphereCanvas, 0, 0);

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className={className} style={{ width: '100%', height: '100%', display: 'block' }} aria-hidden="true" />;
}
