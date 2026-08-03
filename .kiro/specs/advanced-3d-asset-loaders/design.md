# Design Document: Advanced 3D Asset Loaders System

## Overview

The Advanced 3D Asset Loaders System extends the existing Three.js CelestiaDoor project with comprehensive asset loading capabilities. The system provides a centralized, type-safe architecture for loading GLTF/GLB models, FBX files, textures, and HDR environment maps.

**Core Design Philosophy:**
- **Centralized Management**: Single `AssetManager` class coordinates all asset operations
- **Progressive Enhancement**: Fallback to procedural geometries when assets fail
- **Type Safety**: Full TypeScript support with strict typing
- **Performance First**: Caching, lazy loading, and bundle optimization
- **Integration Ready**: Seamless integration with existing `CelestiaDoor` class

**Key Technical Decisions:**

1. **Asset Manager Pattern**: Singleton-style `AssetManager` class manages all loaders, cache, and queues
2. **Loader Composition**: Individual loader classes (`GLTFLoader`, `TextureLoader`, `HDRLoader`, `FBXLoader`) composed within the manager
3. **Event-Driven Progress**: EventEmitter pattern for loading progress and status updates
4. **LRU Cache Strategy**: Least-Recently-Used cache with configurable memory limits
5. **Priority Queue**: Min-heap-based priority queue for intelligent load ordering
6. **Configuration-First**: JSON-based configuration with schema validation

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                      CelestiaDoor                           │
│  (Existing Three.js scene - integrates AssetManager)       │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                     AssetManager                            │
│  • Central coordination                                     │
│  • Loader orchestration                                     │
│  • Cache management                                         │
│  • Event emission                                           │
└─────┬────────┬────────┬────────┬───────────┬───────────────┘
      │        │        │        │           │
      ▼        ▼        ▼        ▼           ▼
   ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐    ┌──────────┐
   │GLTF │ │Text │ │HDR  │ │FBX  │    │  Cache   │
   │Load │ │Load │ │Load │ │Load │    │  (LRU)   │
   └─────┘ └─────┘ └─────┘ └─────┘    └──────────┘
      │        │        │        │
      └────────┴────────┴────────┘
                  │
                  ▼
          ┌──────────────┐
          │ Loading Queue│
          │ (Priority)   │
          └──────────────┘
```

### Asset Folder Structure

```
public/
  assets/
    models/
      doors/
        celestial-door-left.glb
        celestial-door-right.glb
      environment/
        pillars.glb
        central-structure.glb
      characters/
        player.fbx
    textures/
      doors/
        normal.jpg
        roughness.jpg
        metallic.jpg
        emission.jpg
      environment/
        stone-normal.jpg
        stone-roughness.jpg
    hdri/
      celestial-sky.hdr
      night-sky.hdr
    config/
      assets.json
```

### Asset Configuration Schema

```typescript
interface AssetConfig {
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

interface ModelAsset {
  id: string;
  type: 'gltf' | 'glb' | 'fbx';
  path: string;
  priority: 'high' | 'normal' | 'low';
  preload: boolean;
}

interface TextureAsset {
  id: string;
  type: 'diffuse' | 'normal' | 'roughness' | 'metallic' | 'emissive';
  path: string;
  priority: 'high' | 'normal' | 'low';
  settings: {
    wrapS?: THREE.Wrapping;
    wrapT?: THREE.Wrapping;
    minFilter?: THREE.TextureFilter;
    magFilter?: THREE.TextureFilter;
    encoding?: THREE.TextureEncoding;
  };
}

interface HDRAsset {
  id: string;
  path: string;
  priority: 'high' | 'normal' | 'low';
  toneMappingExposure?: number;
}
```

## Components and Interfaces

### 1. AssetManager (Core Orchestrator)

```typescript
class AssetManager {
  private config: AssetConfig;
  private loaders: LoaderRegistry;
  private cache: AssetCache;
  private queue: LoadingQueue;
  private eventEmitter: EventEmitter;
  private stats: LoadingStats;

  constructor(config: AssetConfig);
  
  // Primary loading interface
  public async load<T>(id: string): Promise<T>;
  public async loadMultiple(ids: string[]): Promise<Map<string, any>>;
  public async preloadCritical(): Promise<void>;
  
  // Cache management
  public clearCache(id?: string): void;
  public getCacheStats(): CacheStats;
  
  // Configuration
  public updateConfig(config: Partial<AssetConfig>): void;
  public exportConfig(): string; // JSON export
  public importConfig(json: string): void; // JSON import
  
  // Event handling
  public on(event: string, handler: Function): void;
  public off(event: string, handler: Function): void;
  
  // Utility
  public getLoadingStatus(): LoadingStatus;
  public getFailedAssets(): string[];
  public retryFailed(): Promise<void>;
  public dispose(): void;
}
```

**Events Emitted:**
- `progress`: `{ loaded: number, total: number, percentage: number, assetId: string }`
- `load-complete`: `{ assetId: string, duration: number }`
- `load-error`: `{ assetId: string, error: Error, attempt: number }`
- `cache-hit`: `{ assetId: string }`
- `cache-miss`: `{ assetId: string }`
- `cache-evict`: `{ assetId: string, reason: string }`

### 2. LoaderRegistry

```typescript
interface IAssetLoader<T> {
  load(path: string, onProgress?: (event: ProgressEvent) => void): Promise<T>;
  dispose(asset: T): void;
}

class LoaderRegistry {
  private loaders: Map<string, IAssetLoader<any>>;
  
  constructor(basePaths: AssetConfig['basePaths']);
  
  public register<T>(type: string, loader: IAssetLoader<T>): void;
  public get<T>(type: string): IAssetLoader<T>;
  public has(type: string): boolean;
}
```

### 3. Individual Loaders

```typescript
class GLTFAssetLoader implements IAssetLoader<THREE.Object3D> {
  private loader: GLTFLoader;
  private basePath: string;
  
  constructor(basePath: string);
  
  public async load(
    path: string, 
    onProgress?: (event: ProgressEvent) => void
  ): Promise<THREE.Object3D>;
  
  public dispose(asset: THREE.Object3D): void;
}

class TextureAssetLoader implements IAssetLoader<THREE.Texture> {
  private loader: THREE.TextureLoader;
  private basePath: string;
  
  constructor(basePath: string);
  
  public async load(
    path: string,
    settings?: TextureAsset['settings'],
    onProgress?: (event: ProgressEvent) => void
  ): Promise<THREE.Texture>;
  
  public dispose(asset: THREE.Texture): void;
}

class HDRAssetLoader implements IAssetLoader<THREE.CubeTexture> {
  private loader: RGBELoader;
  private basePath: string;
  
  constructor(basePath: string);
  
  public async load(
    path: string,
    onProgress?: (event: ProgressEvent) => void
  ): Promise<THREE.CubeTexture>;
  
  public dispose(asset: THREE.CubeTexture): void;
}

class FBXAssetLoader implements IAssetLoader<THREE.Object3D> {
  private loader: FBXLoader;
  private basePath: string;
  
  constructor(basePath: string);
  
  public async load(
    path: string,
    onProgress?: (event: ProgressEvent) => void
  ): Promise<THREE.Object3D>;
  
  public dispose(asset: THREE.Object3D): void;
}
```

### 4. AssetCache (LRU Cache)

```typescript
interface CacheEntry<T> {
  asset: T;
  size: number; // in bytes
  lastAccessed: number;
  accessCount: number;
}

interface CacheStats {
  totalSize: number;
  itemCount: number;
  hitRate: number;
  missRate: number;
  evictionCount: number;
}

class AssetCache {
  private cache: Map<string, CacheEntry<any>>;
  private maxSize: number;
  private currentSize: number;
  private stats: CacheStats;
  
  constructor(maxSizeMB: number);
  
  public set<T>(id: string, asset: T, size: number): void;
  public get<T>(id: string): T | null;
  public has(id: string): boolean;
  public delete(id: string): boolean;
  public clear(): void;
  public getStats(): CacheStats;
  
  private evict(): void; // LRU eviction
  private estimateSize(asset: any): number;
}
```

### 5. LoadingQueue (Priority Queue)

```typescript
interface QueueItem {
  id: string;
  priority: number; // 0 = high, 1 = normal, 2 = low
  loader: () => Promise<any>;
  retries: number;
  onProgress?: (progress: number) => void;
}

class LoadingQueue {
  private queue: QueueItem[];
  private active: Set<string>;
  private maxConcurrent: number;
  private retryConfig: { attempts: number; delay: number };
  
  constructor(maxConcurrent: number, retryConfig: { attempts: number; delay: number });
  
  public enqueue(item: QueueItem): void;
  public async process(): Promise<void>;
  public pause(): void;
  public resume(): void;
  public clear(): void;
  public getStatus(): { pending: number; active: number };
  
  private async processNext(): Promise<void>;
  private async retryWithBackoff(item: QueueItem): Promise<any>;
}
```

### 6. CelestiaDoor Integration

```typescript
// Updated CelestiaDoor constructor
export class CelestiaDoor {
  private assetManager?: AssetManager;
  private loadedModels: Map<string, THREE.Object3D>;
  
  constructor(
    canvas: HTMLCanvasElement,
    assetManager?: AssetManager
  ) {
    // ... existing initialization ...
    
    this.assetManager = assetManager;
    this.loadedModels = new Map();
    
    if (assetManager) {
      this.setupAssetListeners();
    }
  }
  
  private setupAssetListeners(): void {
    if (!this.assetManager) return;
    
    this.assetManager.on('progress', (data) => {
      console.log(`Loading: ${data.assetId} - ${data.percentage}%`);
    });
    
    this.assetManager.on('load-complete', (data) => {
      this.onAssetLoaded(data.assetId);
    });
  }
  
  private async init(): Promise<void> {
    // Load assets before scene creation
    if (this.assetManager) {
      await this.assetManager.preloadCritical();
      await this.loadDoorModels();
    }
    
    this.createLights();
    this.createBackground();
    this.createDoor(); // Will use loaded models if available
    // ... rest of initialization
  }
  
  private async loadDoorModels(): Promise<void> {
    if (!this.assetManager) return;
    
    try {
      const doorLeft = await this.assetManager.load<THREE.Object3D>('door-left');
      const doorRight = await this.assetManager.load<THREE.Object3D>('door-right');
      
      this.loadedModels.set('door-left', doorLeft);
      this.loadedModels.set('door-right', doorRight);
    } catch (error) {
      console.warn('Failed to load door models, using fallback', error);
    }
  }
  
  private createDoor(): void {
    const doorLeftModel = this.loadedModels.get('door-left');
    const doorRightModel = this.loadedModels.get('door-right');
    
    if (doorLeftModel) {
      this.doorLeft = doorLeftModel;
      this.doorLeft.position.set(-1.5, 0, 0);
      this.scene.add(this.doorLeft);
    } else {
      // Fallback to procedural geometry (existing code)
      const doorGeometry = new THREE.BoxGeometry(3, 8, 0.5);
      // ... existing door creation code
    }
    
    // Similar for doorRight...
  }
}
```

## Data Models

### LoadingStats

```typescript
interface LoadingStats {
  totalRequests: number;
  successfulLoads: number;
  failedLoads: number;
  cacheHits: number;
  cacheMisses: number;
  averageLoadTime: number;
  totalBytesLoaded: number;
}
```

### LoadingStatus

```typescript
interface LoadingStatus {
  pending: Map<string, QueueItem>;
  loading: Map<string, { progress: number; startTime: number }>;
  loaded: Map<string, { duration: number; size: number }>;
  failed: Map<string, { error: Error; attempts: number }>;
}
```

### Configuration Validation

```typescript
class ConfigValidator {
  public static validate(config: unknown): AssetConfig;
  public static validatePaths(basePaths: AssetConfig['basePaths']): boolean;
  public static validateAsset(asset: ModelAsset | TextureAsset | HDRAsset): boolean;
}
```

## Error Handling

### Error Types

```typescript
enum AssetErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  PARSE_ERROR = 'PARSE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  CACHE_ERROR = 'CACHE_ERROR',
  CONFIG_ERROR = 'CONFIG_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
}

class AssetLoadError extends Error {
  public readonly type: AssetErrorType;
  public readonly assetId: string;
  public readonly attempt: number;
  public readonly originalError?: Error;
  
  constructor(
    type: AssetErrorType,
    assetId: string,
    attempt: number,
    message: string,
    originalError?: Error
  );
}
```

### Error Handling Strategy

1. **Network Errors**: Retry up to 3 times with exponential backoff (1s, 2s, 4s)
2. **Parse Errors**: No retry, fallback to default asset, log detailed error
3. **Validation Errors**: Fail fast, log error, do not attempt loading
4. **Cache Errors**: Clear cache entry, attempt reload
5. **Config Errors**: Prevent AssetManager initialization, throw immediately
6. **Timeout Errors**: Retry once with extended timeout, then fail

### Fallback Assets

```typescript
class FallbackAssets {
  public static createDoorGeometry(): THREE.Object3D;
  public static createDefaultTexture(color: number): THREE.Texture;
  public static createGradientHDR(): THREE.CubeTexture;
  public static createPillarGeometry(): THREE.Object3D;
}
```

## Testing Strategy

### Unit Testing Approach

**Focus on specific examples and edge cases:**

1. **Loader Tests**:
   - Test loading valid GLTF/GLB files (1-2 examples)
   - Test loading invalid/malformed files (error handling)
   - Test texture loading with different formats (JPG, PNG)
   - Test HDR loading with .hdr format

2. **Cache Tests**:
   - Test cache hit/miss with specific keys
   - Test cache eviction when limit reached
   - Test cache clear functionality

3. **Queue Tests**:
   - Test priority ordering (high before normal before low)
   - Test concurrent loading limits (2-3 concurrent loads)
   - Test retry logic with specific failure scenarios

4. **Configuration Tests**:
   - Test valid configuration parsing
   - Test invalid configuration rejection
   - Test path resolution (absolute, relative, CDN URLs)

5. **Integration Tests**:
   - Test AssetManager + CelestiaDoor integration (1-2 scenarios)
   - Test fallback system when assets fail
   - Test event emission during loading

**Unit Test Examples:**
```typescript
describe('GLTFAssetLoader', () => {
  it('should load a valid GLB file', async () => {
    const loader = new GLTFAssetLoader('/assets/models/');
    const model = await loader.load('door.glb');
    expect(model).toBeInstanceOf(THREE.Object3D);
  });

  it('should throw error for malformed GLB', async () => {
    const loader = new GLTFAssetLoader('/assets/models/');
    await expect(loader.load('invalid.glb')).rejects.toThrow(AssetLoadError);
  });
});

describe('AssetCache', () => {
  it('should return cached asset on second access', () => {
    const cache = new AssetCache(10);
    const asset = new THREE.Mesh();
    cache.set('door', asset, 1);
    
    const retrieved = cache.get('door');
    expect(retrieved).toBe(asset);
    expect(cache.getStats().hitRate).toBeGreaterThan(0);
  });

  it('should evict LRU item when cache is full', () => {
    const cache = new AssetCache(2); // 2MB limit
    cache.set('asset1', {}, 1);
    cache.set('asset2', {}, 1);
    cache.get('asset1'); // Access asset1 (now asset2 is LRU)
    cache.set('asset3', {}, 1); // Should evict asset2
    
    expect(cache.has('asset1')).toBe(true);
    expect(cache.has('asset2')).toBe(false);
    expect(cache.has('asset3')).toBe(true);
  });
});

describe('LoadingQueue', () => {
  it('should process high priority items first', async () => {
    const queue = new LoadingQueue(1, { attempts: 3, delay: 100 });
    const order: string[] = [];
    
    queue.enqueue({ 
      id: 'low', 
      priority: 2, 
      loader: async () => { order.push('low'); }
    });
    queue.enqueue({ 
      id: 'high', 
      priority: 0, 
      loader: async () => { order.push('high'); }
    });
    
    await queue.process();
    expect(order).toEqual(['high', 'low']);
  });
});
```

**Why Property-Based Testing is NOT Appropriate Here:**

This system involves:
- **External file I/O**: Loading assets from disk/network (not pure functions)
- **Infrastructure integration**: Three.js loaders, WebGL context (external dependencies)
- **Configuration validation**: Schema checks are better suited to example-based tests
- **Error handling**: Specific error scenarios (network timeout, parse error) need concrete examples

Property-based testing would be appropriate for internal data structures like the priority queue or cache eviction algorithms, but the value is limited compared to concrete integration tests. We'll focus on unit tests with representative examples and integration tests for end-to-end flows.

## Performance Optimization

### 1. Bundle Size Optimization

```typescript
// Optional loader imports (tree-shaking)
class AssetManager {
  private async loadGLTFLoader(): Promise<void> {
    if (!this.loaders.has('gltf')) {
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      this.loaders.register('gltf', new GLTFAssetLoader(this.config.basePaths.models));
    }
  }
  
  private async loadFBXLoader(): Promise<void> {
    if (!this.loaders.has('fbx')) {
      const { FBXLoader } = await import('three/examples/jsm/loaders/FBXLoader.js');
      this.loaders.register('fbx', new FBXAssetLoader(this.config.basePaths.models));
    }
  }
}
```

### 2. Memory Management

```typescript
class AssetManager {
  public disposeAsset(id: string): void {
    const asset = this.cache.get(id);
    if (!asset) return;
    
    const loader = this.getLoaderForAsset(id);
    loader.dispose(asset);
    
    this.cache.delete(id);
  }
  
  public disposeUnused(threshold: number = 300000): void {
    // Dispose assets not accessed in last 5 minutes
    const now = Date.now();
    
    for (const [id, entry] of this.cache['cache'].entries()) {
      if (now - entry.lastAccessed > threshold) {
        this.disposeAsset(id);
      }
    }
  }
}
```

### 3. Preloading Strategy

```typescript
class AssetManager {
  public async preloadCritical(): Promise<void> {
    const criticalAssets = this.getCriticalAssets();
    
    // Load in parallel with max concurrency
    await this.loadMultiple(criticalAssets.map(a => a.id));
  }
  
  private getCriticalAssets(): (ModelAsset | TextureAsset | HDRAsset)[] {
    return [
      ...this.config.assets.models?.filter(m => m.preload) ?? [],
      ...this.config.assets.textures?.filter(t => t.priority === 'high') ?? [],
      ...this.config.assets.hdri?.filter(h => h.priority === 'high') ?? [],
    ];
  }
}
```

### 4. Lazy Loading

```typescript
class CelestiaDoor {
  private async lazyLoadEnvironmentAssets(): Promise<void> {
    // Load non-critical assets after initial render
    if (!this.assetManager) return;
    
    const environmentAssets = ['pillars', 'central-structure', 'floor-texture'];
    
    for (const id of environmentAssets) {
      try {
        const asset = await this.assetManager.load(id);
        this.replaceProceduralWithAsset(id, asset);
      } catch (error) {
        console.warn(`Failed to lazy load ${id}`, error);
      }
    }
  }
}
```

### 5. Compression

- **Models**: Use .glb (binary GLTF) instead of .gltf with external files
- **Textures**: Use compressed formats (KTX2, Basis Universal) when supported
- **HDR**: Use RGBE format (.hdr) which is more compact than .exr

## Implementation Notes

### Three.js Loader Imports

```typescript
// Use dynamic imports for tree-shaking
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
```

### File Structure

```
src/lib/three/
  assets/
    AssetManager.ts
    loaders/
      GLTFAssetLoader.ts
      TextureAssetLoader.ts
      HDRAssetLoader.ts
      FBXAssetLoader.ts
      LoaderRegistry.ts
      types.ts
    cache/
      AssetCache.ts
      types.ts
    queue/
      LoadingQueue.ts
      types.ts
    config/
      ConfigValidator.ts
      types.ts
    fallbacks/
      FallbackAssets.ts
    errors/
      AssetLoadError.ts
    utils/
      EventEmitter.ts
      sizeEstimator.ts
  CelestiaDoor.ts (updated)
```

### TypeScript Configuration

Ensure `tsconfig.json` includes:
```json
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "esModuleInterop": true
  }
}
```

### Asset Configuration Example

```json
{
  "basePaths": {
    "models": "/assets/models/",
    "textures": "/assets/textures/",
    "hdri": "/assets/hdri/"
  },
  "assets": {
    "models": [
      {
        "id": "door-left",
        "type": "glb",
        "path": "doors/celestial-door-left.glb",
        "priority": "high",
        "preload": true
      },
      {
        "id": "door-right",
        "type": "glb",
        "path": "doors/celestial-door-right.glb",
        "priority": "high",
        "preload": true
      }
    ],
    "textures": [
      {
        "id": "door-normal",
        "type": "normal",
        "path": "doors/normal.jpg",
        "priority": "normal",
        "settings": {
          "wrapS": 1000,
          "wrapT": 1000
        }
      }
    ],
    "hdri": [
      {
        "id": "celestial-sky",
        "path": "celestial-sky.hdr",
        "priority": "high",
        "toneMappingExposure": 1.0
      }
    ]
  },
  "loading": {
    "maxConcurrent": 3,
    "retryAttempts": 3,
    "retryDelay": 1000
  },
  "cache": {
    "enabled": true,
    "maxSize": 100,
    "strategy": "lru"
  }
}
```

## Integration Example

```typescript
// In experiencia4.astro or similar
import { CelestiaDoor } from '@/lib/three/CelestiaDoor';
import { AssetManager } from '@/lib/three/assets/AssetManager';
import assetConfig from '@/assets/config/assets.json';

// Initialize AssetManager
const assetManager = new AssetManager(assetConfig);

// Listen to loading progress
assetManager.on('progress', (data) => {
  updateLoadingBar(data.percentage);
});

// Initialize CelestiaDoor with AssetManager
const canvas = document.getElementById('celestial-canvas') as HTMLCanvasElement;
const door = new CelestiaDoor(canvas, assetManager);

// Start animation
door.animate();
```

## Migration Path

**Phase 1: Core Infrastructure**
1. Create base types and interfaces
2. Implement AssetCache
3. Implement LoadingQueue
4. Implement EventEmitter utility

**Phase 2: Loaders**
1. Implement GLTFAssetLoader
2. Implement TextureAssetLoader
3. Implement HDRAssetLoader
4. Implement LoaderRegistry

**Phase 3: Asset Manager**
1. Implement AssetManager core
2. Implement configuration loading
3. Implement error handling
4. Implement fallback system

**Phase 4: Integration**
1. Update CelestiaDoor constructor
2. Add asset loading to init()
3. Implement model replacement logic
4. Add progress UI

**Phase 5: Optimization**
1. Implement lazy loading
2. Add FBXLoader (optional)
3. Optimize bundle size
4. Add serialization support
