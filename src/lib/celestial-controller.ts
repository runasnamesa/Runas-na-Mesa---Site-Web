/**
 * CelestialController — Genshin-style gateway scene interaction & transition.
 */

import gsap from 'gsap';
import { CelestialScene } from './celestial-scene';
import { audioSystem } from './audio-system';

export interface CelestialElements {
  root: HTMLElement;
  scene: HTMLElement;
  gateway: HTMLElement;
  doorPanels: HTMLElement;
  doorLight: HTMLElement;
  lightBurst: HTMLElement;
  beginBar: HTMLButtonElement;
  siteLayer: HTMLElement;
  powerBtn: HTMLButtonElement;
  soundBtn: HTMLButtonElement;
  skipBtn: HTMLButtonElement;
  exitBtn: HTMLButtonElement;
  starsCanvas: HTMLCanvasElement;
  cloudsCanvas: HTMLCanvasElement;
  srAnnounce: HTMLElement;
}

export class CelestialController {
  private els: CelestialElements;
  private scene: CelestialScene | null = null;
  private started = false;
  private audioOn = false;
  private reducedMotion: boolean;

  constructor(elements: CelestialElements, reducedMotion = false) {
    this.els = elements;
    this.reducedMotion = reducedMotion;
  }

  init(): void {
    this.scene = new CelestialScene(
      this.els.starsCanvas,
      this.els.cloudsCanvas,
      this.els.scene,
    );
    this.scene.init();

    this._bindUi();

    if (this.reducedMotion) {
      gsap.set(this.els.beginBar, { opacity: 1 });
    } else {
      gsap.to(this.els.beginBar, {
        opacity: 1,
        duration: 1.2,
        delay: 0.8,
        ease: 'power2.out',
      });
    }

    this._announce('Portal celestial. Clique para começar.');
  }

  destroy(): void {
    this.scene?.destroy();
    audioSystem.destroy();
  }

  private _announce(msg: string): void {
    this.els.srAnnounce.textContent = msg;
  }

  private _enableAudio(): void {
    if (this.audioOn) return;
    audioSystem.init();
    audioSystem.setMuted(false, 600);
    audioSystem.transitionTo('storm'); // soft wind — reusing procedural voice
    this.audioOn = true;
    this.els.soundBtn.setAttribute('aria-pressed', 'true');
  }

  private _bindUi(): void {
    const { beginBar, powerBtn, soundBtn, skipBtn, exitBtn } = this.els;

    beginBar.addEventListener('click', () => this._begin());
    beginBar.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') this._begin();
    });

    powerBtn.addEventListener('click', () => {
      if (!this.audioOn) {
        this._enableAudio();
        return;
      }
      audioSystem.init();
      const muted = audioSystem.toggleMute();
      powerBtn.setAttribute('aria-pressed', String(!muted));
    });

    soundBtn.addEventListener('click', () => {
      audioSystem.init();
      if (!this.audioOn) {
        this._enableAudio();
        return;
      }
      const muted = audioSystem.toggleMute();
      soundBtn.setAttribute('aria-pressed', String(!muted));
      soundBtn.setAttribute('aria-label', muted ? 'Ativar som' : 'Desativar som');
    });

    skipBtn.addEventListener('click', () => this._revealSite(true));
    exitBtn.addEventListener('click', () => {
      window.location.href = '/index/';
    });
  }

  private _begin(): void {
    if (this.started) return;
    this.started = true;
    this._enableAudio();
    audioSystem.playCreak();
    this._announce('Abrindo o portal...');

    if (this.reducedMotion) {
      this._revealSite(true);
      return;
    }

    this.els.root.dataset.phase = 'opening';
    this.els.beginBar.disabled = true;

    const tl = gsap.timeline({ onComplete: () => this._revealSite(false) });

    tl.to(this.els.beginBar, { opacity: 0, y: 12, duration: 0.4 }, 0);

    tl.to(this.els.scene, {
      scale: 1.06,
      duration: 2.8,
      ease: 'power1.inOut',
    }, 0);

    tl.to(this.els.gateway, {
      filter: 'brightness(1.35)',
      duration: 1.8,
      ease: 'power2.out',
    }, 0.2);

    tl.to(this.els.doorPanels, {
      scale: 1.15,
      duration: 2.2,
      ease: 'power2.inOut',
    }, 0.4);

    tl.to(this.els.doorPanels.querySelectorAll('.gateway__door-panel'), {
      opacity: 0.15,
      duration: 2,
      ease: 'power2.in',
    }, 0.6);

    tl.to(this.els.doorLight, {
      opacity: 1,
      scale: 1.6,
      duration: 2,
      ease: 'power2.in',
    }, 0.8);

    tl.to(this.els.lightBurst, {
      opacity: 1,
      scale: 1,
      duration: 1.6,
      ease: 'power2.in',
    }, 1.6);

    const cloudState = { intensity: 1 };
    tl.to(cloudState, {
      intensity: 1.45,
      duration: 2,
      onUpdate: () => this.scene?.setCloudIntensity(cloudState.intensity),
    }, 0.5);

    audioSystem.transitionTo('door-open', 2000);
    setTimeout(() => audioSystem.transitionTo('tavern', 2500), 2200);
  }

  private _revealSite(instant: boolean): void {
    this.els.root.dataset.phase = 'site';
    this._announce('Bem-vindo. Explore a taverna.');

    const duration = instant ? 0.01 : 1.2;

    gsap.timeline()
      .to(this.els.lightBurst, { opacity: instant ? 0 : 1, duration: instant ? 0 : 0.6 })
      .to(this.els.scene, {
        opacity: 0.22,
        filter: 'blur(2px) brightness(0.5)',
        duration,
        ease: 'power2.inOut',
      }, 0)
      .fromTo(
        this.els.siteLayer,
        { opacity: 0, y: instant ? 0 : 28 },
        { opacity: 1, y: 0, duration, ease: 'power2.out' },
        instant ? 0 : 0.4,
      );

    this.els.siteLayer.style.pointerEvents = 'auto';
    document.documentElement.style.overflow = 'auto';
    document.body.style.overflow = 'auto';
  }
}
