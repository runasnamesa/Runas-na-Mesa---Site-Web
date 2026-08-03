import type * as THREE from 'three';

/**
 * Asset Configuration Schema
 */
export interface AssetConfig {
  basePaths: {
    models: string;
    textures: string;
    hdri: string;
  };
  assets: {
    models?: ModelAsset[];
    textures?: TextureAsset[];
    hdri?: HDRAsset[];
  };
  loading: {
    maxConcurrent: number;
    retryAttempts: number;
    retryDelay: number;
  };
  cache: {
    enabled: boolean;
    maxSize: number; // in MB
    strategy: 'lru' | 'fifo';
  };
}

/**
 * Model Asset Definition
 */
export interface ModelAsset {
  id: string;
  type: 'gltf' | 'glb' | 'fbx';
  path: string;
  priority: 'high' | 'normal' | 'low';
  preload: boolean;
}

/**
 * Texture Asset Definition
 */
export interface TextureAsset {
  id: string;
  type: 'diffuse' | 'normal' | 'roughness' | 'metallic' | 'emissive';
  path: string;
  priority: 'high' | 'normal' | 'low';
  settings?: {
    wrapS?: THREE.Wrapping;
    wrapT?: THREE.Wrapping;
    minFilter?: THREE.TextureFilter;
    magFilter?: THREE.TextureFilter;
    colorSpace?: string; // e.g., 'srgb', 'srgb-linear'
  };
}

/**
 * HDR Asset Definition
 */
export interface HDRAsset {
  id: string;
  path: string;
  priority: 'high' | 'normal' | 'low';
  toneMappingExposure?: number;
}

/**
 * Loading Statistics
 */
export interface LoadingStats {
  totalRequests: number;
  successfulLoads: number;
  failedLoads: number;
  cacheHits: number;
  cacheMisses: number;
  averageLoadTime: number;
  totalBytesLoaded: number;
}

/**
 * Loading Status
 */
export interface LoadingStatus {
  pending: Map<string, QueueItem>;
  loading: Map<string, { progress: number; startTime: number }>;
  loaded: Map<string, { duration: number; size: number }>;
  failed: Map<string, { error: Error; attempts: number }>;
}

/**
 * Cache Entry
 */
export interface CacheEntry<T = any> {
  asset: T;
  size: number; // in bytes
  lastAccessed: number;
  accessCount: number;
}

/**
 * Cache Statistics
 */
export interface CacheStats {
  totalSize: number;
  itemCount: number;
  hitRate: number;
  missRate: number;
  evictionCount: number;
}

/**
 * Queue Item
 */
export interface QueueItem {
  id: string;
  priority: number; // 0 = high, 1 = normal, 2 = low
  loader: () => Promise<any>;
  retries: number;
  onProgress?: (progress: number) => void;
}

/**
 * Asset Loader Interface
 */
export interface IAssetLoader<T> {
  load(path: string, onProgress?: (event: ProgressEvent) => void): Promise<T>;
  dispose(asset: T): void;
}
