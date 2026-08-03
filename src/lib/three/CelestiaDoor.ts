/**
 * CelestiaDoor - Three.js 3D Celestial Door
 * Inspired by Genshin Impact loading screen
 */

import * as THREE from 'three';
import { gsap } from 'gsap';
import { CelestialEnvironment } from './CelestialEnvironment';
import { PostProcessing } from './PostProcessing';

export class CelestiaDoor {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private doorLeft: THREE.Mesh | null = null;
  private doorRight: THREE.Mesh | null = null;
  private runeParticles: THREE.Points | null = null;
  private elementsGroup: THREE.Group;
  private clock: THREE.Clock;
  private isOpening = false;
  private environment!: CelestialEnvironment;
  private postProcessing!: PostProcessing;

  constructor(canvas: HTMLCanvasElement) {
    this.clock = new THREE.Clock();
    this.elementsGroup = new THREE.Group();

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a1530);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 15);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0; // Reduzido de 1.2

    this.init();
  }

  private init(): void {
    this.createLights();
    this.environment = new CelestialEnvironment(this.scene);
    this.postProcessing = new PostProcessing(this.renderer, this.scene, this.camera);
    this.createBackground();
    this.createDoor();
    this.createRunes();
    this.createFloatingElements();
    this.createParticles();
    
    window.addEventListener('resize', () => this.onResize());
  }

  private createLights(): void {
    // Ambient light
    const ambient = new THREE.AmbientLight(0x4a7fb8, 0.5);
    this.scene.add(ambient);

    // Main directional light
    const mainLight = new THREE.DirectionalLight(0x80b0ff, 1);
    mainLight.position.set(5, 10, 5);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    this.scene.add(mainLight);

    // Rim light
    const rimLight = new THREE.DirectionalLight(0x5090ff, 0.5);
    rimLight.position.set(-5, 0, -5);
    this.scene.add(rimLight);

    // Center glow point light
    const centerGlow = new THREE.PointLight(0xa0c8ff, 2, 10);
    centerGlow.position.set(0, 0, 2);
    this.scene.add(centerGlow);
  }

  private createBackground(): void {
    // Background pillars
    const pillarGeometry = new THREE.BoxGeometry(1, 12, 1);
    const pillarMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a3a60,
      roughness: 0.8,
      metalness: 0.2,
      emissive: 0x0d1e42,
      emissiveIntensity: 0.3,
    });

    const positions = [
      [-8, 0, -8],
      [-5, 0, -9],
      [5, 0, -9],
      [8, 0, -8],
    ];

    positions.forEach(([x, y, z]) => {
      const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
      pillar.position.set(x, y, z);
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      this.scene.add(pillar);
    });

    // Central structure
    const centralGeometry = new THREE.BoxGeometry(3, 15, 2);
    const central = new THREE.Mesh(centralGeometry, pillarMaterial);
    central.position.set(0, 0, -10);
    this.scene.add(central);
  }

  private createDoor(): void {
    // Door geometry
    const doorGeometry = new THREE.BoxGeometry(3, 8, 0.5);
    
    // Door material with glow
    const doorMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a3560,
      roughness: 0.4,
      metalness: 0.6,
      emissive: 0x2050a0,
      emissiveIntensity: 0.5,
    });

    // Left door
    this.doorLeft = new THREE.Mesh(doorGeometry, doorMaterial);
    this.doorLeft.position.set(-1.5, 0, 0);
    this.doorLeft.castShadow = true;
    this.doorLeft.receiveShadow = true;
    this.scene.add(this.doorLeft);

    // Right door
    this.doorRight = new THREE.Mesh(doorGeometry, doorMaterial.clone());
    this.doorRight.position.set(1.5, 0, 0);
    this.doorRight.castShadow = true;
    this.doorRight.receiveShadow = true;
    this.scene.add(this.doorRight);

    // Door frame
    const frameGeometry = new THREE.TorusGeometry(5, 0.15, 16, 100, Math.PI);
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0x4080c0,
      emissive: 0x3070b0,
      emissiveIntensity: 0.8,
      roughness: 0.3,
      metalness: 0.8,
    });
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    frame.position.set(0, 4, 0);
    frame.rotation.z = Math.PI;
    this.scene.add(frame);

    // Side pillars
    const pillarGeometry = new THREE.CylinderGeometry(0.3, 0.4, 10, 8);
    const pillarMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a4070,
      roughness: 0.6,
      metalness: 0.4,
      emissive: 0x102040,
      emissiveIntensity: 0.4,
    });

    const leftPillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
    leftPillar.position.set(-5, 0, 0);
    this.scene.add(leftPillar);

    const rightPillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
    rightPillar.position.set(5, 0, 0);
    this.scene.add(rightPillar);

    // Center glow line
    const lineGeometry = new THREE.PlaneGeometry(0.1, 8);
    const lineMaterial = new THREE.MeshBasicMaterial({
      color: 0x80c0ff,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });
    const centerLine = new THREE.Mesh(lineGeometry, lineMaterial);
    centerLine.position.set(0, 0, 0.3);
    this.scene.add(centerLine);
  }

  private createRunes(): void {
    // Rune circles on frame
    const runeCount = 5;
    const radius = 5;
    
    for (let i = 0; i < runeCount; i++) {
      const angle = (Math.PI / (runeCount + 1)) * (i + 1);
      const x = Math.cos(angle + Math.PI) * radius;
      const y = Math.sin(angle + Math.PI) * radius + 4;

      const runeGeometry = new THREE.SphereGeometry(0.15, 16, 16);
      const runeMaterial = new THREE.MeshBasicMaterial({
        color: 0x80c0ff,
        transparent: true,
        opacity: 0.9,
      });
      
      const rune = new THREE.Mesh(runeGeometry, runeMaterial);
      rune.position.set(x, y, 0.5);
      
      // Animate rune
      gsap.to(rune.scale, {
        x: 1.5,
        y: 1.5,
        z: 1.5,
        duration: 2,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: i * 0.2,
      });

      this.scene.add(rune);
    }
  }

  private createFloatingElements(): void {
    // Element symbols orbiting
    const elementGeometry = new THREE.TorusGeometry(0.5, 0.1, 16, 32);
    const colors = [0x80c0ff, 0xff8080, 0x80ff80];

    colors.forEach((color, index) => {
      const material = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.7,
      });
      
      const element = new THREE.Mesh(elementGeometry, material);
      const angle = (Math.PI * 2 / colors.length) * index;
      const orbitRadius = 7;
      
      element.position.set(
        Math.cos(angle) * orbitRadius,
        Math.sin(angle) * orbitRadius,
        1
      );
      
      this.elementsGroup.add(element);
    });

    this.scene.add(this.elementsGroup);

    // Rotate elements
    gsap.to(this.elementsGroup.rotation, {
      z: Math.PI * 2,
      duration: 15,
      repeat: -1,
      ease: 'none',
    });
  }

  private createParticles(): void {
    const particleCount = 1000;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      // Position
      positions[i3] = (Math.random() - 0.5) * 30;
      positions[i3 + 1] = (Math.random() - 0.5) * 20;
      positions[i3 + 2] = (Math.random() - 0.5) * 20 - 5;

      // Color (blue tint)
      colors[i3] = 0.5 + Math.random() * 0.5;
      colors[i3 + 1] = 0.7 + Math.random() * 0.3;
      colors[i3 + 2] = 1;
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
    });

    this.runeParticles = new THREE.Points(particleGeometry, particleMaterial);
    this.scene.add(this.runeParticles);
  }

  public openDoor(): void {
    if (this.isOpening || !this.doorLeft || !this.doorRight) return;
    this.isOpening = true;

    const timeline = gsap.timeline();

    // Door opening animation
    timeline
      .to(this.doorLeft.rotation, {
        y: -Math.PI * 0.6,
        duration: 2,
        ease: 'power2.inOut',
      }, 0)
      .to(this.doorRight.rotation, {
        y: Math.PI * 0.6,
        duration: 2,
        ease: 'power2.inOut',
      }, 0)
      .to(this.doorLeft.position, {
        x: -2.5,
        duration: 2,
        ease: 'power2.inOut',
      }, 0)
      .to(this.doorRight.position, {
        x: 2.5,
        duration: 2,
        ease: 'power2.inOut',
      }, 0)
      .to(this.camera.position, {
        z: 12,
        duration: 2,
        ease: 'power2.inOut',
      }, 0);
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.postProcessing.resize(window.innerWidth, window.innerHeight);
  }

  public animate(): void {
    requestAnimationFrame(() => this.animate());

    const elapsedTime = this.clock.getElapsedTime();

    // Update environment
    this.environment.update(elapsedTime);

    // Animate particles
    if (this.runeParticles) {
      const positions = this.runeParticles.geometry.attributes.position.array as Float32Array;
      
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] += Math.sin(elapsedTime + positions[i]) * 0.005;
      }
      
      this.runeParticles.geometry.attributes.position.needsUpdate = true;
      this.runeParticles.rotation.y = elapsedTime * 0.05;
    }

    // Render with post-processing
    this.postProcessing.render();
  }

  public destroy(): void {
    window.removeEventListener('resize', () => this.onResize());
    this.renderer.dispose();
  }
}
