/**
 * CelestialEnvironment - Skybox, Moon, Volumetric Clouds, Atmospheric Scattering
 */

import * as THREE from 'three';

export class CelestialEnvironment {
  private scene: THREE.Scene;
  private moon: THREE.Mesh;
  private moonGlow: THREE.Mesh;
  private clouds: THREE.Group;
  private stars: THREE.Points;
  private skyGradient: THREE.Mesh;
  private atmosphericHaze: THREE.Mesh;
  private godRays: THREE.Mesh[];
  private cloudShadows: THREE.Group;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.godRays = [];
    
    // Setup volumetric fog
    this.scene.fog = new THREE.FogExp2(0x0d1e42, 0.008);
    
    this.skyGradient = this.createSkyGradient();
    this.atmosphericHaze = this.createAtmosphericHaze();
    this.moon = this.createMoon();
    this.moonGlow = this.createMoonGlow();
    this.createGodRays();
    this.clouds = this.createVolumetricClouds();
    this.cloudShadows = this.createCloudShadows();
    this.stars = this.createStarField();
    
    this.scene.add(this.skyGradient);
    this.scene.add(this.atmosphericHaze);
    this.scene.add(this.moon);
    this.scene.add(this.moonGlow);
    this.scene.add(this.clouds);
    this.scene.add(this.cloudShadows);
    this.scene.add(this.stars);
  }

  private createSkyGradient(): THREE.Mesh {
    // Large sphere for sky gradient
    const skyGeometry = new THREE.SphereGeometry(90, 32, 32);
    
    const skyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x0a1530) },
        middleColor: { value: new THREE.Color(0x152847) },
        bottomColor: { value: new THREE.Color(0x1f4568) },
        horizonColor: { value: new THREE.Color(0x2a5580) },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 middleColor;
        uniform vec3 bottomColor;
        uniform vec3 horizonColor;
        
        varying vec3 vWorldPosition;
        
        void main() {
          float h = normalize(vWorldPosition).y;
          
          vec3 color;
          if (h > 0.2) {
            // Top to middle
            float t = (h - 0.2) / 0.8;
            color = mix(middleColor, topColor, t);
          } else if (h > -0.3) {
            // Middle to horizon
            float t = (h + 0.3) / 0.5;
            color = mix(bottomColor, middleColor, t);
          } else {
            // Horizon to bottom
            float t = (h + 1.0) / 0.7;
            color = mix(horizonColor, bottomColor, t);
          }
          
          // Atmospheric scattering effect
          float scatter = pow(1.0 - abs(h), 3.0) * 0.3;
          color += vec3(0.1, 0.15, 0.25) * scatter;
          
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
    });

    const sky = new THREE.Mesh(skyGeometry, skyMaterial);
    return sky;
  }

  private createAtmosphericHaze(): THREE.Mesh {
    // Haze layer for atmospheric depth
    const hazeGeometry = new THREE.SphereGeometry(85, 32, 32);
    
    const hazeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        hazeColor: { value: new THREE.Color(0x4080b0) },
        time: { value: 0 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 hazeColor;
        uniform float time;
        
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
          // Horizontal band of haze
          float horizontal = abs(normalize(vPosition).y);
          float intensity = smoothstep(0.7, 0.3, horizontal);
          
          // Noise for variation
          float noise = sin(vPosition.x * 0.5 + time * 0.1) * 
                       cos(vPosition.z * 0.5 - time * 0.08) * 0.3 + 0.7;
          
          intensity *= noise;
          
          // Fresnel for edges
          vec3 viewDirection = normalize(cameraPosition - vPosition);
          float fresnel = 1.0 - abs(dot(vNormal, viewDirection));
          
          float alpha = intensity * fresnel * 0.15;
          gl_FragColor = vec4(hazeColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.BackSide,
    });

    return new THREE.Mesh(hazeGeometry, hazeMaterial);
  }

  private createMoon(): THREE.Mesh {
    // Large moon sphere with detail
    const moonGeometry = new THREE.SphereGeometry(5, 64, 64);
    
    // Custom shader for volumetric glow and surface detail
    const moonMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        glowColor: { value: new THREE.Color(0xc0e0ff) },
        coreColor: { value: new THREE.Color(0xffffff) },
        craterColor: { value: new THREE.Color(0xa0c0e0) },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec2 vUv;
        
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 glowColor;
        uniform vec3 coreColor;
        uniform vec3 craterColor;
        
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec2 vUv;
        
        // Noise function
        float random(vec2 st) {
          return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
        }
        
        float noise(vec2 st) {
          vec2 i = floor(st);
          vec2 f = fract(st);
          float a = random(i);
          float b = random(i + vec2(1.0, 0.0));
          float c = random(i + vec2(0.0, 1.0));
          float d = random(i + vec2(1.0, 1.0));
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
        }
        
        void main() {
          // Surface craters using noise
          float crater1 = noise(vUv * 15.0) * 0.3;
          float crater2 = noise(vUv * 30.0) * 0.15;
          float crater3 = noise(vUv * 60.0) * 0.08;
          float craterDetail = crater1 + crater2 + crater3;
          
          // Fresnel for edge glow
          vec3 viewDirection = normalize(cameraPosition - vPosition);
          float fresnel = pow(1.0 - max(dot(vNormal, viewDirection), 0.0), 3.0);
          
          // Core to edge gradient
          float radial = length(vPosition) / 5.0;
          vec3 surfaceColor = mix(coreColor, craterColor, craterDetail);
          vec3 color = mix(surfaceColor, glowColor, radial * 0.3);
          
          // Add strong edge glow
          color += glowColor * fresnel * 0.8;
          
          // Pulsing subtle
          float pulse = sin(time * 0.3) * 0.05 + 0.95;
          color *= pulse;
          
          // Brighter overall
          color *= 1.2;
          
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      side: THREE.FrontSide,
    });

    const moon = new THREE.Mesh(moonGeometry, moonMaterial);
    moon.position.set(-18, 15, -35);
    
    return moon;
  }

  private createMoonGlow(): THREE.Mesh {
    // Outer glow sphere - multiple layers for depth
    const glowGeometry = new THREE.SphereGeometry(7, 32, 32);
    const glowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        glowColor: { value: new THREE.Color(0x6090c0) },
        time: { value: 0 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        uniform float time;
        
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
          vec3 viewDirection = normalize(cameraPosition - vPosition);
          float intensity = pow(0.6 - dot(vNormal, viewDirection), 5.0);
          
          // Pulsing glow
          float pulse = sin(time * 0.4) * 0.15 + 0.85;
          intensity *= pulse;
          
          // Brighter glow
          gl_FragColor = vec4(glowColor, intensity * 0.6);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false,
    });
    
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.copy(this.moon.position);
    this.scene.add(glow);
    
    // Secondary outer glow (halo)
    const haloGeometry = new THREE.SphereGeometry(10, 32, 32);
    const haloMaterial = new THREE.ShaderMaterial({
      uniforms: {
        glowColor: { value: new THREE.Color(0x4070a0) },
      },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        varying vec3 vNormal;
        
        void main() {
          vec3 viewDirection = normalize(cameraPosition);
          float intensity = pow(0.4 - dot(vNormal, viewDirection), 8.0);
          gl_FragColor = vec4(glowColor, intensity * 0.3);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false,
    });
    
    const halo = new THREE.Mesh(haloGeometry, haloMaterial);
    halo.position.copy(this.moon.position);
    this.scene.add(halo);

    return glow;
  }

  private createGodRays(): void {
    // God rays emanating from moon
    const rayCount = 12;
    
    for (let i = 0; i < rayCount; i++) {
      const angle = (Math.PI * 2 / rayCount) * i;
      
      const rayGeometry = new THREE.PlaneGeometry(1, 40);
      const rayMaterial = new THREE.ShaderMaterial({
        uniforms: {
          rayColor: { value: new THREE.Color(0x5080b0) },
          time: { value: 0 },
          offset: { value: i * 0.5 },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 rayColor;
          uniform float time;
          uniform float offset;
          
          varying vec2 vUv;
          
          void main() {
            // Ray shape - narrow at source, fade at edges
            float horizontal = abs(vUv.x - 0.5) * 2.0;
            float vertical = vUv.y;
            
            float rayShape = (1.0 - horizontal) * smoothstep(0.0, 0.3, vertical) * smoothstep(1.0, 0.6, vertical);
            
            // Pulsing animation
            float pulse = sin(time * 0.8 + offset) * 0.3 + 0.7;
            
            float alpha = rayShape * pulse * 0.15;
            gl_FragColor = vec4(rayColor, alpha);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      
      const ray = new THREE.Mesh(rayGeometry, rayMaterial);
      ray.position.copy(this.moon.position);
      ray.rotation.z = angle;
      ray.position.x += Math.cos(angle) * 2;
      ray.position.y += Math.sin(angle) * 2;
      
      this.godRays.push(ray);
      this.scene.add(ray);
    }
  }

  private createVolumetricClouds(): THREE.Group {
    const cloudGroup = new THREE.Group();
    
    // 8 layers of clouds for depth
    const layerConfigs = [
      { count: 20, radiusMin: 25, radiusMax: 30, heightBase: -8, sizeScale: 1.5, opacity: 0.25 },
      { count: 18, radiusMin: 28, radiusMax: 35, heightBase: -5, sizeScale: 1.8, opacity: 0.3 },
      { count: 16, radiusMin: 32, radiusMax: 40, heightBase: -2, sizeScale: 2.0, opacity: 0.35 },
      { count: 14, radiusMin: 35, radiusMax: 45, heightBase: 1, sizeScale: 2.2, opacity: 0.3 },
      { count: 12, radiusMin: 38, radiusMax: 48, heightBase: 4, sizeScale: 2.5, opacity: 0.25 },
      { count: 10, radiusMin: 40, radiusMax: 50, heightBase: 7, sizeScale: 2.8, opacity: 0.2 },
      { count: 8, radiusMin: 42, radiusMax: 52, heightBase: 10, sizeScale: 3.0, opacity: 0.15 },
      { count: 6, radiusMin: 45, radiusMax: 55, heightBase: 13, sizeScale: 3.5, opacity: 0.1 },
    ];
    
    layerConfigs.forEach((config, layerIndex) => {
      for (let i = 0; i < config.count; i++) {
        const cloud = this.createSingleCloud(layerIndex, config);
        cloudGroup.add(cloud);
      }
    });
    
    return cloudGroup;
  }

  private createSingleCloud(
    layer: number,
    config: { radiusMin: number; radiusMax: number; heightBase: number; sizeScale: number; opacity: number }
  ): THREE.Mesh {
    // Varied cloud sizes
    const baseSize = 2 + Math.random() * 3;
    const cloudGeometry = new THREE.SphereGeometry(baseSize * config.sizeScale, 16, 16);
    
    const cloudMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        cloudColor: { value: new THREE.Color(0x5088b8) },
        opacity: { value: config.opacity * (0.8 + Math.random() * 0.4) },
        layer: { value: layer },
      },
      vertexShader: `
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        
        void main() {
          vPosition = position;
          vNormal = normal;
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 cloudColor;
        uniform float opacity;
        uniform float layer;
        
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        
        // 3D Noise
        float random(vec3 st) {
          return fract(sin(dot(st.xyz, vec3(12.9898,78.233,45.164))) * 43758.5453123);
        }
        
        float noise3D(vec3 p) {
          vec3 i = floor(p);
          vec3 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          
          float n = random(i);
          return n;
        }
        
        void main() {
          // Wispy volumetric edges
          float edge = 1.0 - abs(dot(normalize(vNormal), normalize(vec3(0, 0, 1))));
          edge = pow(edge, 2.5);
          
          // Volumetric noise for density variation
          vec3 noisePos = vPosition * (1.0 + layer * 0.2) + vec3(time * 0.05, time * 0.03, 0);
          float noise1 = noise3D(noisePos);
          float noise2 = noise3D(noisePos * 2.0) * 0.5;
          float noise3 = noise3D(noisePos * 4.0) * 0.25;
          float combinedNoise = (noise1 + noise2 + noise3) / 1.75;
          
          // Depth-based color variation
          float depthFade = smoothstep(-30.0, -50.0, vWorldPosition.z);
          vec3 color = mix(cloudColor, cloudColor * 0.7, depthFade);
          
          // Final alpha with noise and edge
          float alpha = opacity * edge * combinedNoise;
          alpha *= smoothstep(0.0, 0.3, combinedNoise);
          
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.NormalBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const cloud = new THREE.Mesh(cloudGeometry, cloudMaterial);
    
    // Position in cylindrical distribution
    const angle = Math.random() * Math.PI * 2;
    const radius = config.radiusMin + Math.random() * (config.radiusMax - config.radiusMin);
    const height = config.heightBase + (Math.random() - 0.5) * 4;
    
    cloud.position.set(
      Math.cos(angle) * radius,
      height,
      Math.sin(angle) * radius - 25
    );
    
    cloud.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );
    
    // Varied scales
    const scaleVariation = 0.7 + Math.random() * 0.6;
    cloud.scale.set(
      scaleVariation * (1.2 + Math.random() * 0.5),
      scaleVariation * (0.4 + Math.random() * 0.3),
      scaleVariation * (1.0 + Math.random() * 0.5)
    );

    return cloud;
  }

  private createStarField(): THREE.Points {
    const starCount = 3000; // Aumentado de 2000
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      
      // Spherical distribution - mais concentrado no topo
      const radius = 60 + Math.random() * 50;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 0.6) - 0.4); // Bias to upper hemisphere
      
      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta) + 10;
      positions[i3 + 2] = radius * Math.cos(phi) - 30;
      
      // Color variation - blue-white spectrum
      const temp = Math.random();
      if (temp > 0.9) {
        // Hot white stars
        colors[i3] = 1.0;
        colors[i3 + 1] = 0.95;
        colors[i3 + 2] = 0.9;
      } else if (temp > 0.7) {
        // Blue-white
        colors[i3] = 0.9;
        colors[i3 + 1] = 0.95;
        colors[i3 + 2] = 1.0;
      } else {
        // Light blue
        colors[i3] = 0.8;
        colors[i3 + 1] = 0.9;
        colors[i3 + 2] = 1.0;
      }
      
      // Size variation - some larger bright stars
      const sizeRoll = Math.random();
      if (sizeRoll > 0.95) {
        sizes[i] = 3.0 + Math.random() * 2.0; // Bright stars
      } else if (sizeRoll > 0.8) {
        sizes[i] = 1.5 + Math.random() * 1.0; // Medium stars
      } else {
        sizes[i] = 0.5 + Math.random() * 0.8; // Small stars
      }
    }

    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    starGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const starMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        varying float vSize;
        uniform float time;
        
        // Random function
        float random(float x) {
          return fract(sin(x * 12.9898) * 43758.5453123);
        }
        
        void main() {
          vColor = color;
          vSize = size;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          
          // Twinkling with individual timing
          float twinkleSpeed = 1.0 + random(position.x + position.y) * 2.0;
          float twinkle = sin(time * twinkleSpeed + position.x * 10.0) * 0.4 + 0.6;
          
          // Perspective size with twinkling
          gl_PointSize = size * twinkle * (400.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vSize;
        
        void main() {
          // Circular star with soft edges
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          
          if (dist > 0.5) discard;
          
          // Soft falloff
          float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
          
          // Brighter core for large stars
          if (vSize > 2.0) {
            alpha = pow(alpha, 0.6); // Softer falloff for bright stars
          }
          
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true,
    });

    return new THREE.Points(starGeometry, starMaterial);
  }

  private createCloudShadows(): THREE.Group {
    const shadowGroup = new THREE.Group();
    
    // Create shadow planes beneath clouds
    const shadowCount = 30;
    
    for (let i = 0; i < shadowCount; i++) {
      const shadowGeometry = new THREE.PlaneGeometry(8 + Math.random() * 6, 5 + Math.random() * 4);
      const shadowMaterial = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          shadowColor: { value: new THREE.Color(0x050a15) },
          opacity: { value: 0.2 + Math.random() * 0.15 },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 shadowColor;
          uniform float opacity;
          uniform float time;
          
          varying vec2 vUv;
          
          // Noise for shadow edges
          float random(vec2 st) {
            return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
          }
          
          void main() {
            vec2 center = vUv - 0.5;
            float dist = length(center);
            
            // Soft edge falloff
            float edge = smoothstep(0.5, 0.2, dist);
            
            // Noise for organic shape
            float noise = random(vUv * 10.0 + time * 0.01) * 0.3 + 0.7;
            
            float alpha = opacity * edge * noise;
            gl_FragColor = vec4(shadowColor, alpha);
          }
        `,
        transparent: true,
        blending: THREE.MultiplyBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      
      const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
      
      // Position shadows below clouds
      const angle = Math.random() * Math.PI * 2;
      const radius = 15 + Math.random() * 25;
      
      shadow.position.set(
        Math.cos(angle) * radius,
        -4 + Math.random() * 2,
        Math.sin(angle) * radius - 15
      );
      
      shadow.rotation.x = -Math.PI / 2;
      shadow.rotation.z = Math.random() * Math.PI;
      
      shadowGroup.add(shadow);
    }
    
    return shadowGroup;
  }

  public update(time: number): void {
    // Update moon shader
    if (this.moon.material instanceof THREE.ShaderMaterial) {
      this.moon.material.uniforms.time.value = time;
    }
    
    // Update moon glow
    if (this.moonGlow.material instanceof THREE.ShaderMaterial) {
      this.moonGlow.material.uniforms.time.value = time;
    }
    
    // Update atmospheric haze
    if (this.atmosphericHaze.material instanceof THREE.ShaderMaterial) {
      this.atmosphericHaze.material.uniforms.time.value = time;
    }
    
    // Update god rays
    this.godRays.forEach((ray) => {
      if (ray.material instanceof THREE.ShaderMaterial) {
        ray.material.uniforms.time.value = time;
      }
    });
    
    // Update cloud shaders and rotation
    this.clouds.children.forEach((cloud, index) => {
      if (cloud instanceof THREE.Mesh && cloud.material instanceof THREE.ShaderMaterial) {
        cloud.material.uniforms.time.value = time;
      }
      // Slow rotation - different speeds per layer
      const rotationSpeed = 0.0001 + (index % 8) * 0.00005;
      cloud.rotation.y += rotationSpeed;
      cloud.rotation.x += rotationSpeed * 0.3;
    });
    
    // Update stars
    if (this.stars.material instanceof THREE.ShaderMaterial) {
      this.stars.material.uniforms.time.value = time;
    }
    // Very slow rotation
    this.stars.rotation.y += 0.00008;
    
    // Update cloud shadows
    this.cloudShadows.children.forEach((shadow, index) => {
      if (shadow instanceof THREE.Mesh && shadow.material instanceof THREE.ShaderMaterial) {
        shadow.material.uniforms.time.value = time;
      }
      // Slow drift
      shadow.position.x += Math.sin(time * 0.1 + index) * 0.002;
      shadow.position.z += Math.cos(time * 0.08 + index) * 0.002;
    });
  }
}
