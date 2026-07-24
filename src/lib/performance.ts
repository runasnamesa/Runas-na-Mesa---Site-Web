/**
 * PerformanceDetector — GPU capability detection & adaptive quality.
 *
 * Detects hardware capability and assigns one of three quality tiers:
 *   LOW    — Mobile / low-end: reduced particles, no post-processing, lower resolution
 *   MEDIUM — Mid-range: moderate effects, balanced quality
 *   HIGH   — Desktop / powerful GPU: full effects, high-res, all features
 *
 * The system also monitors real-time frame rate and can downgrade
 * dynamically if performance drops below threshold.
 */

export type QualityTier = 'low' | 'medium' | 'high';

export interface PerformanceProfile {
  tier: QualityTier;
  /** Multiplier applied to particle counts (0–1) */
  particleScale: number;
  /** Scale factor for internal render resolution (0.5–1) */
  resolutionScale: number;
  /** Enable post-processing effects (bloom, etc.) */
  postProcessing: boolean;
  /** Enable expensive shader features (turbulence, volumetric) */
  advancedShaders: boolean;
  /** Enable shadow maps */
  shadows: boolean;
  /** Max pixel ratio to use (clamped) */
  maxPixelRatio: number;
  /** Anti-aliasing enabled */
  antialias: boolean;
  /** Number of snow layers to render */
  snowLayers: number;
  /** Target FPS for this profile */
  targetFps: number;
}

const FPS_SAMPLE_SIZE = 30;
const FPS_DOWNGRADE_THRESHOLD = 45; // Downgrade if sustained below this

/**
 * Singleton performance monitor.
 */
class PerformanceDetector {
  private _profile: PerformanceProfile | null = null;
  private fpsSamples: number[] = [];
  private lastFrameTime = 0;
  private _currentTier: QualityTier | null = null;
  private downgraded = false;

  /** Run detection and return a profile. Call once early. */
  detect(): PerformanceProfile {
    if (this._profile) return this._profile;
    this._profile = this._buildProfile();
    this._currentTier = this._profile.tier;
    return this._profile;
  }

  get profile(): PerformanceProfile {
    if (!this._profile) return this.detect();
    return this._profile;
  }

  get tier(): QualityTier {
    return this._currentTier ?? this.profile.tier;
  }

  /** Call every frame with the delta-time in ms */
  tick(deltaMs: number): void {
    if (deltaMs <= 0) return;
    const fps = 1000 / deltaMs;
    this.fpsSamples.push(fps);
    if (this.fpsSamples.length > FPS_SAMPLE_SIZE) {
      this.fpsSamples.shift();
    }
  }

  /** Check if we need to downgrade quality based on recent FPS */
  checkAdaptive(): QualityTier | null {
    if (this.fpsSamples.length < FPS_SAMPLE_SIZE) return null;
    const avgFps =
      this.fpsSamples.reduce((a, b) => a + b, 0) / this.fpsSamples.length;

    if (avgFps < FPS_DOWNGRADE_THRESHOLD && this._currentTier === 'high') {
      this._currentTier = 'medium';
      this.downgraded = true;
      return 'medium';
    }
    if (avgFps < FPS_DOWNGRADE_THRESHOLD * 0.6 && this._currentTier === 'medium') {
      this._currentTier = 'low';
      this.downgraded = true;
      return 'low';
    }
    return null;
  }

  /** Reset FPS samples (e.g. after a scene transition) */
  resetFps(): void {
    this.fpsSamples = [];
  }

  get hasDowngraded(): boolean {
    return this.downgraded;
  }

  private _buildProfile(): PerformanceProfile {
    const ua = navigator.userAgent;
    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(ua);
    const isTablet = /Tablet|iPad|PlayBook|Silk/i.test(ua);
    const hardwareConcurrency = navigator.hardwareConcurrency ?? 4;
    const deviceMemory = (navigator as any).deviceMemory ?? 8;

    // Detect GPU via canvas
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    let gpuTier: QualityTier = 'medium';

    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      const renderer = debugInfo
        ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
        : 'unknown';
      const vendor = debugInfo
        ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)
        : 'unknown';

      const gpuStr = (renderer + ' ' + vendor).toLowerCase();
      const isLowEnd = /adreno (3|4|5)\d|mali-4|mali-3|powervr sgx/i.test(gpuStr);
      const isHighEnd =
        /geforce rtx|radeon rx 6|radeon rx 7|arc a7|m1|m2|m3|m4|apple gpu/i.test(
          gpuStr,
        );

      if (isLowEnd) gpuTier = 'low';
      else if (isHighEnd) gpuTier = 'high';
      else gpuTier = 'medium';

      // Check max texture size
      const maxTexSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
      if (maxTexSize < 4096 && gpuTier === 'high') gpuTier = 'medium';
      if (maxTexSize < 2048) gpuTier = 'low';
    } else {
      gpuTier = 'low'; // No WebGL — severely limited
    }

    // Combine all signals
    const signals: QualityTier[] = [];
    signals.push(gpuTier);
    if (isMobile) signals.push('low');
    if (isTablet && gpuTier === 'high') signals.push('medium');
    if (hardwareConcurrency <= 4) signals.push('low');
    if (deviceMemory <= 4) signals.push('low');

    // Pick the lowest common denominator
    const finalTier = signals.includes('low')
      ? 'low'
      : signals.includes('medium')
        ? 'medium'
        : 'high';

    return this._getProfileForTier(finalTier);
  }

  private _getProfileForTier(tier: QualityTier): PerformanceProfile {
    switch (tier) {
      case 'low':
        return {
          tier: 'low',
          particleScale: 0.35,
          resolutionScale: 0.6,
          postProcessing: false,
          advancedShaders: false,
          shadows: false,
          maxPixelRatio: 1,
          antialias: false,
          snowLayers: 2,
          targetFps: 30,
        };
      case 'medium':
        return {
          tier: 'medium',
          particleScale: 0.7,
          resolutionScale: 0.8,
          postProcessing: false,
          advancedShaders: false,
          shadows: false,
          maxPixelRatio: 1.5,
          antialias: true,
          snowLayers: 4,
          targetFps: 45,
        };
      case 'high':
      default:
        return {
          tier: 'high',
          particleScale: 1.0,
          resolutionScale: 1.0,
          postProcessing: true,
          advancedShaders: true,
          shadows: true,
          maxPixelRatio: 2,
          antialias: true,
          snowLayers: 6,
          targetFps: 60,
        };
    }
  }
}

export const performanceDetector = new PerformanceDetector();
