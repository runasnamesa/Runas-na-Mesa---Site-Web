/**
 * CelestialScene — Stars, volumetric clouds, parallax for the gateway scene.
 */

interface Star {
  x: number;
  y: number;
  size: number;
  alpha: number;
  twinkle: number;
  phase: number;
}

interface CloudPuff {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  speed: number;
  depth: number;
}

export class CelestialScene {
  private starsCanvas: HTMLCanvasElement;
  private cloudsCanvas: HTMLCanvasElement;
  private starsCtx: CanvasRenderingContext2D | null = null;
  private cloudsCtx: CanvasRenderingContext2D | null = null;
  private stars: Star[] = [];
  private clouds: CloudPuff[] = [];
  private running = false;
  private raf = 0;
  private W = 0;
  private H = 0;
  private parallaxRoot: HTMLElement | null = null;
  private pointerX = 0;
  private pointerY = 0;
  private cloudIntensity = 1;

  constructor(
    starsCanvas: HTMLCanvasElement,
    cloudsCanvas: HTMLCanvasElement,
    parallaxRoot?: HTMLElement | null,
  ) {
    this.starsCanvas = starsCanvas;
    this.cloudsCanvas = cloudsCanvas;
    this.parallaxRoot = parallaxRoot ?? null;
  }

  init(): void {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this._resize();
      this._drawStatic();
      return;
    }

    this.starsCtx = this.starsCanvas.getContext('2d', { alpha: true });
    this.cloudsCtx = this.cloudsCanvas.getContext('2d', { alpha: true });
    if (!this.starsCtx || !this.cloudsCtx) return;

    this._resize();
    this._seedStars();
    this._seedClouds();
    this.running = true;

    window.addEventListener('resize', () => this._resize());
    window.addEventListener('pointermove', this._onPointerMove);
    this._loop(0);
  }

  setCloudIntensity(value: number): void {
    this.cloudIntensity = Math.max(0, Math.min(1, value));
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('pointermove', this._onPointerMove);
  }

  private _onPointerMove = (e: PointerEvent): void => {
    this.pointerX = (e.clientX / this.W - 0.5) * 2;
    this.pointerY = (e.clientY / this.H - 0.5) * 2;

    if (!this.parallaxRoot) return;
    const layers = this.parallaxRoot.querySelectorAll<HTMLElement>('[data-depth]');
    layers.forEach((el) => {
      const depth = parseFloat(el.dataset.depth || '0');
      el.style.transform = `translate3d(${this.pointerX * depth * -12}px, ${this.pointerY * depth * -8}px, 0)`;
    });
  };

  private _resize(): void {
    this.W = window.innerWidth;
    this.H = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    for (const canvas of [this.starsCanvas, this.cloudsCanvas]) {
      canvas.width = Math.floor(this.W * dpr);
      canvas.height = Math.floor(this.H * dpr);
      canvas.style.width = `${this.W}px`;
      canvas.style.height = `${this.H}px`;
    }

    this.starsCtx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.cloudsCtx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private _seedStars(): void {
    this.stars = [];
    const count = Math.min(220, Math.floor(this.W * 0.12));
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * this.W,
        y: Math.random() * this.H * 0.72,
        size: Math.random() * 1.6 + 0.4,
        alpha: Math.random() * 0.55 + 0.15,
        twinkle: Math.random() * 0.35 + 0.1,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  private _seedClouds(): void {
    this.clouds = [];
    const count = Math.min(28, Math.floor(this.W / 45));
    for (let i = 0; i < count; i++) {
      this.clouds.push({
        x: Math.random() * this.W,
        y: this.H * 0.42 + Math.random() * this.H * 0.52,
        radius: 60 + Math.random() * 140,
        alpha: 0.04 + Math.random() * 0.12,
        speed: 0.08 + Math.random() * 0.22,
        depth: 0.5 + Math.random(),
      });
    }
  }

  private _drawStatic(): void {
    const starsCtx = this.starsCanvas.getContext('2d');
    const cloudsCtx = this.cloudsCanvas.getContext('2d');
    if (!starsCtx || !cloudsCtx) return;
    this.starsCtx = starsCtx;
    this.cloudsCtx = cloudsCtx;
    this._seedStars();
    this._seedClouds();
    this._drawStars(0);
    this._drawClouds(0);
  }

  private _drawStars(t: number): void {
    const ctx = this.starsCtx;
    if (!ctx) return;
    ctx.clearRect(0, 0, this.W, this.H);

    for (const s of this.stars) {
      const flicker = 0.65 + Math.sin(t * 1.5 + s.phase) * s.twinkle;
      ctx.globalAlpha = s.alpha * flicker;
      ctx.fillStyle = '#e8f4ff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private _drawClouds(t: number): void {
    const ctx = this.cloudsCtx;
    if (!ctx) return;
    ctx.clearRect(0, 0, this.W, this.H);

    const baseY = this.H * 0.38;

    // Horizon glow
    const horizon = ctx.createLinearGradient(0, baseY, 0, this.H);
    horizon.addColorStop(0, 'rgba(120, 200, 255, 0)');
    horizon.addColorStop(0.35, `rgba(100, 190, 255, ${0.08 * this.cloudIntensity})`);
    horizon.addColorStop(0.65, `rgba(180, 230, 255, ${0.22 * this.cloudIntensity})`);
    horizon.addColorStop(1, `rgba(220, 245, 255, ${0.35 * this.cloudIntensity})`);
    ctx.fillStyle = horizon;
    ctx.fillRect(0, baseY, this.W, this.H - baseY);

    for (const c of this.clouds) {
      c.x += c.speed * c.depth;
      if (c.x > this.W + c.radius) c.x = -c.radius;

      const bob = Math.sin(t * 0.4 + c.x * 0.004) * 6;
      const y = c.y + bob;
      const a = c.alpha * this.cloudIntensity;

      const grad = ctx.createRadialGradient(c.x, y, 0, c.x, y, c.radius);
      grad.addColorStop(0, `rgba(230, 248, 255, ${a * 1.2})`);
      grad.addColorStop(0.45, `rgba(140, 210, 255, ${a * 0.7})`);
      grad.addColorStop(1, 'rgba(80, 160, 220, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(c.x, y, c.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private _loop = (now: number): void => {
    if (!this.running) return;
    const t = now / 1000;
    this._drawStars(t);
    this._drawClouds(t);
    this.raf = requestAnimationFrame(this._loop);
  };
}
