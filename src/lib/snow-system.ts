/**
 * SnowSystem — Canvas 2D multi-layer snowstorm with wind, gusts, parallax.
 *
 * 6 layers (adaptive):
 *   fog   → large translucent circles drifting slowly
 *   far   → tiny dots, cold blue, slow
 *   mid   → small circles, medium speed
 *   near  → larger flakes, faster, more visible
 *   gusts → horizontal streaks driven by wind
 *   blur  → large blurred circles close to lens
 *
 * Performance-adaptive: reduces layers & particles on low-end devices.
 */

import { performanceDetector } from './performance';

interface Particle {
  x: number; y: number;
  size: number;
  alpha: number; speed: number; wind: number;
  phase: number; amp: number;
  trail: { x: number; y: number }[];
}

interface LayerDef {
  count: number;
  size: [number, number];
  speed: [number, number];
  wind: [number, number];
  alpha: [number, number];
  isStreak?: boolean;
  isFog?: boolean;
  color?: string;
}

export class SnowSystem {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private layers: Particle[][] = [];
  private layerDefs: LayerDef[] = [];
  private running = false;
  private raf = 0;

  // Exposed controls
  windMultiplier = 1;
  intensity = 1;
  globalAlpha = 1;

  private W = 0;
  private H = 0;

  init(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });
    if (!this.ctx) return;

    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      canvas.style.display = 'none';
      return;
    }

    this._buildLayers();
    this._resize();
    this._start();
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.layers = [];
    this.ctx = null;
    this.canvas = null;
  }

  private _buildLayers(): void {
    const profile = performanceDetector.profile;
    const countMul = profile.particleScale;

    this.layerDefs = [
      { count: Math.ceil(6 * countMul), size: [18, 30], speed: [0.08, 0.2], wind: [0.02, 0.06], alpha: [0.02, 0.06], isFog: true, color: '#b0c4d8' },
      { count: Math.ceil(180 * countMul), size: [0.8, 2.0], speed: [0.2, 0.5], wind: [0.1, 0.3], alpha: [0.08, 0.18] },
      { count: Math.ceil(120 * countMul), size: [1.5, 4.0], speed: [0.4, 1.0], wind: [0.2, 0.6], alpha: [0.12, 0.3] },
      { count: Math.ceil(50 * countMul), size: [3.5, 7.0], speed: [0.8, 2.0], wind: [0.4, 1.2], alpha: [0.2, 0.45] },
      { count: Math.ceil(25 * countMul), size: [4.0, 9.0], speed: [1.5, 3.5], wind: [0.6, 2.0], alpha: [0.1, 0.25], isStreak: true },
      { count: Math.ceil(10 * countMul), size: [8.0, 16.0], speed: [1.0, 2.5], wind: [0.3, 1.0], alpha: [0.04, 0.12] },
    ];

    // Apply snowLayers limit from profile
    const maxLayers = profile.snowLayers;
    if (maxLayers < this.layerDefs.length) {
      this.layerDefs = this.layerDefs.slice(0, maxLayers);
    }

    this.layers = this.layerDefs.map((def) => this._createParticles(def));
  }

  private _createParticles(def: LayerDef): Particle[] {
    const particles: Particle[] = [];
    for (let i = 0; i < def.count; i++) {
      particles.push(this._createParticle(def, true));
    }
    return particles;
  }

  private _createParticle(def: LayerDef, randomY = false): Particle {
    return {
      x: Math.random() * this.W,
      y: randomY ? Math.random() * this.H : -Math.random() * 50 - 10,
      size: def.size[0] + Math.random() * (def.size[1] - def.size[0]),
      alpha: def.alpha[0] + Math.random() * (def.alpha[1] - def.alpha[0]),
      speed: def.speed[0] + Math.random() * (def.speed[1] - def.speed[0]),
      wind: def.wind[0] + Math.random() * (def.wind[1] - def.wind[0]),
      phase: Math.random() * Math.PI * 2,
      amp: 0.3 + Math.random() * 0.8,
      trail: def.isStreak ? [] : [],
    };
  }

  private _resize(): void {
    if (!this.canvas || !this.ctx) return;
    this.W = window.innerWidth;
    this.H = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(this.W * dpr);
    this.canvas.height = Math.floor(this.H * dpr);
    this.canvas.style.width = this.W + 'px';
    this.canvas.style.height = this.H + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private _start(): void {
    this.running = true;
    window.addEventListener('resize', () => this._resize());
    this._loop(performance.now());
  }

  private _loop = (now: number): void => {
    if (!this.running || !this.ctx) return;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, this.W, this.H);

    const t = now / 1000;
    const gust = Math.sin(t * 0.7) * 0.5 +
                 Math.sin(t * 1.9 + 0.5) * 0.3 +
                 Math.sin(t * 3.2 + 1.8) * 0.2;
    const baseWind = Math.sin(t * 0.15) * 0.8;

    this._drawMountains(ctx);

    this.layers.forEach((particles, li) => {
      const def = this.layerDefs[li];

      for (const p of particles) {
        const totalWind = (baseWind + gust * 1.5) * p.wind * this.windMultiplier * this.intensity;
        const driftX = Math.sin(t * 0.5 + p.phase) * p.amp * 0.2;

        p.x += totalWind * this.intensity * p.speed * 2 + driftX;
        p.y += p.speed * this.intensity;

        // Wrap
        const margin = p.size * 3;
        if (p.y > this.H + margin) {
          p.y = -margin;
          p.x = Math.random() * this.W;
        }
        if (p.x < -margin - 80) p.x = this.W + margin;
        if (p.x > this.W + margin + 80) p.x = -margin;

        const a = p.alpha * this.globalAlpha * Math.min(1, Math.max(0, this.intensity * 1.3));

        if (a < 0.002) continue;

        ctx.save();
        ctx.globalAlpha = a;

        if (def.isFog) {
          ctx.fillStyle = def.color || '#b0c4d8';
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else if (def.isStreak) {
          const len = p.size * 4;
          ctx.strokeStyle = '#d0d8e8';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(p.x - len / 2, p.y);
          ctx.lineTo(p.x + len / 2, p.y);
          ctx.stroke();
          // Soft glow
          ctx.strokeStyle = 'rgba(200, 215, 235, 0.3)';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(p.x - len / 3, p.y);
          ctx.lineTo(p.x + len / 3, p.y);
          ctx.stroke();
        } else {
          // Soft circle with glow
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
          grad.addColorStop(0, 'rgba(240, 245, 250, 0.9)');
          grad.addColorStop(0.4, 'rgba(220, 230, 240, 0.5)');
          grad.addColorStop(1, 'rgba(200, 215, 235, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }
    });

    this.raf = requestAnimationFrame(this._loop);
  };

  private _drawMountains(ctx: CanvasRenderingContext2D): void {
    if (this.globalAlpha < 0.01 || this.intensity < 0.01) return;
    const w = this.W;
    const h = this.H;

    ctx.save();
    ctx.globalAlpha = 0.25 * this.globalAlpha * this.intensity;

    // Left mountain
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, h * 0.5);
    ctx.lineTo(w * 0.18, h * 0.38);
    ctx.lineTo(w * 0.32, h * 0.44);
    ctx.lineTo(w * 0.42, h * 0.53);
    ctx.lineTo(w * 0.37, h);
    ctx.closePath();
    ctx.fillStyle = '#080E1A';
    ctx.fill();

    // Right mountain
    ctx.beginPath();
    ctx.moveTo(w, h);
    ctx.lineTo(w, h * 0.42);
    ctx.lineTo(w * 0.82, h * 0.33);
    ctx.lineTo(w * 0.68, h * 0.38);
    ctx.lineTo(w * 0.58, h * 0.48);
    ctx.lineTo(w * 0.63, h);
    ctx.closePath();
    ctx.fillStyle = '#080E1A';
    ctx.fill();

    // Snow ground
    ctx.beginPath();
    ctx.moveTo(0, h * 0.7);
    ctx.lineTo(w * 0.2, h * 0.65);
    ctx.lineTo(w * 0.5, h * 0.68);
    ctx.lineTo(w * 0.8, h * 0.64);
    ctx.lineTo(w, h * 0.69);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fillStyle = '#0F1A24';
    ctx.globalAlpha = 0.15 * this.globalAlpha * this.intensity;
    ctx.fill();

    ctx.restore();
  }
}
