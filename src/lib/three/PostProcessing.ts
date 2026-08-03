/**
 * PostProcessing - Bloom, Color Grading, Effects
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

export class PostProcessing {
  private composer: EffectComposer;
  private bloomPass: UnrealBloomPass;
  private colorGradingPass: ShaderPass;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera
  ) {
    // Create composer
    this.composer = new EffectComposer(renderer);
    this.composer.setSize(window.innerWidth, window.innerHeight);

    // Render pass
    const renderPass = new RenderPass(scene, camera);
    this.composer.addPass(renderPass);

    // Bloom pass - intense but controlled glow
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.8,  // strength (reduzido de 1.5)
      0.4,  // radius (reduzido de 0.6)
      0.3   // threshold (aumentado de 0.1)
    );
    this.composer.addPass(this.bloomPass);

    // Color grading pass
    this.colorGradingPass = new ShaderPass(this.createColorGradingShader());
    this.composer.addPass(this.colorGradingPass);

    // Vignette pass
    const vignettePass = new ShaderPass(this.createVignetteShader());
    vignettePass.renderToScreen = true;
    this.composer.addPass(vignettePass);
  }

  private createColorGradingShader(): { uniforms: any; vertexShader: string; fragmentShader: string } {
    return {
      uniforms: {
        tDiffuse: { value: null },
        colorTint: { value: new THREE.Color(0x3060a0) }, // Azul mais escuro
        tintStrength: { value: 0.08 }, // Reduzido de 0.15
        contrast: { value: 1.15 }, // Aumentado de 1.1
        brightness: { value: 0.95 }, // Reduzido de 1.05
        saturation: { value: 1.05 }, // Reduzido de 1.15
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform vec3 colorTint;
        uniform float tintStrength;
        uniform float contrast;
        uniform float brightness;
        uniform float saturation;
        
        varying vec2 vUv;
        
        vec3 adjustContrast(vec3 color, float value) {
          return ((color - 0.5) * value) + 0.5;
        }
        
        vec3 adjustSaturation(vec3 color, float value) {
          float gray = dot(color, vec3(0.299, 0.587, 0.114));
          return mix(vec3(gray), color, value);
        }
        
        void main() {
          vec4 texel = texture2D(tDiffuse, vUv);
          vec3 color = texel.rgb;
          
          // Apply blue tint
          color = mix(color, color * colorTint, tintStrength);
          
          // Adjust contrast
          color = adjustContrast(color, contrast);
          
          // Adjust brightness
          color *= brightness;
          
          // Adjust saturation
          color = adjustSaturation(color, saturation);
          
          gl_FragColor = vec4(color, texel.a);
        }
      `,
    };
  }

  private createVignetteShader(): { uniforms: any; vertexShader: string; fragmentShader: string } {
    return {
      uniforms: {
        tDiffuse: { value: null },
        darkness: { value: 0.4 }, // Reduzido de 0.5
        offset: { value: 0.9 }, // Aumentado de 0.8
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float darkness;
        uniform float offset;
        
        varying vec2 vUv;
        
        void main() {
          vec4 texel = texture2D(tDiffuse, vUv);
          vec2 uv = (vUv - 0.5) * 2.0;
          float dist = length(uv);
          float vignette = smoothstep(offset, offset - 0.5, dist);
          
          texel.rgb = mix(texel.rgb * darkness, texel.rgb, vignette);
          
          gl_FragColor = texel;
        }
      `,
    };
  }

  public render(): void {
    this.composer.render();
  }

  public resize(width: number, height: number): void {
    this.composer.setSize(width, height);
    this.bloomPass.setSize(width, height);
  }

  public setBloomStrength(value: number): void {
    this.bloomPass.strength = value;
  }

  public setBloomRadius(value: number): void {
    this.bloomPass.radius = value;
  }

  public setBloomThreshold(value: number): void {
    this.bloomPass.threshold = value;
  }
}
