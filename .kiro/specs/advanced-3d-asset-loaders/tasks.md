# Implementation Plan: Advanced 3D Asset Loaders System

## Overview

This implementation plan creates a comprehensive asset loading system for the CelestiaDoor Three.js project. The system will be built incrementally, starting with core infrastructure (types, utilities, cache), then individual loaders, followed by the AssetManager orchestrator, and finally integration with CelestiaDoor. Each task builds on previous work, with no orphaned code.

The implementation follows a five-phase approach:
1. **Core Infrastructure**: Type definitions, utilities, cache, and queue
2. **Individual Loaders**: GLTF, Texture, HDR, and loader registry
3. **Asset Manager**: Central orchestration, configuration, error handling
4. **CelestiaDoor Integration**: Update existing class to use asset system
5. **Optimization**: Performance improvements and optional features

## Tasks

- [x] 1. Set up project structure and core types
  - Create directory structure: `src/lib/three/assets/` with subdirectories for loaders, cache, queue, config, errors, utils, fallbacks
  - Create `src/lib/three/assets/types.ts` with all TypeScript interfaces and types from design (AssetConfig, ModelAsset, TextureAsset, HDRAsset, LoadingStats, LoadingStatus, CacheEntry, CacheStats, QueueItem)
  - Create enum AssetErrorType in `src/lib/three/assets/errors/types.ts`
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 2. Implement utility classes
  - [ ] 2.1 Create EventEmitter utility
    - Implement `src/lib/three/assets/utils/EventEmitter.ts` with on(), off(), emit() methods
    - Support typed event handlers for asset loading events
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ] 2.2 Create size estimator utility
    - Implement `src/lib/three/assets/utils/sizeEstimator.ts` to estimate memory size of Three.js objects
    - Handle Object3D, Texture, CubeTexture estimation
    - _Requirements: 5.4, 11.5_

  - [ ]* 2.3 Write unit tests for utilities
    - Test EventEmitter registration, emission, and unregistration
    - Test size estimator with various Three.js object types
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 3. Implement AssetCache with LRU eviction
  - [ ] 3.1 Create AssetCache class
    - Implement `src/lib/three/assets/cache/AssetCache.ts` with LRU cache logic
    - Implement set(), get(), has(), delete(), clear() methods
    - Implement getStats() returning cache metrics (hit rate, miss rate, total size)
    - Implement private evict() method using LRU strategy
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 3.2 Write unit tests for AssetCache
    - Test cache hit/miss scenarios with specific keys
    - Test LRU eviction when cache reaches size limit
    - Test cache clear and delete operations
    - Test cache statistics tracking
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 4. Implement LoadingQueue with priority ordering
  - [ ] 4.1 Create LoadingQueue class
    - Implement `src/lib/three/assets/queue/LoadingQueue.ts` with priority min-heap
    - Implement enqueue(), process(), pause(), resume(), clear() methods
    - Implement getStatus() returning pending and active counts
    - Implement private processNext() for concurrent loading
    - Implement private retryWithBackoff() for exponential backoff retry logic
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ]* 4.2 Write unit tests for LoadingQueue
    - Test priority ordering (high before normal before low)
    - Test concurrent loading limits (e.g., maxConcurrent = 2)
    - Test retry logic with exponential backoff
    - Test pause/resume functionality
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 5. Checkpoint - Ensure core infrastructure tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement error handling system
  - [ ] 6.1 Create AssetLoadError class
    - Implement `src/lib/three/assets/errors/AssetLoadError.ts` extending Error
    - Include type, assetId, attempt, originalError properties
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ] 6.2 Create FallbackAssets class
    - Implement `src/lib/three/assets/fallbacks/FallbackAssets.ts` with static methods
    - Implement createDoorGeometry() returning basic BoxGeometry wrapped in Object3D
    - Implement createDefaultTexture() returning solid color Texture
    - Implement createGradientHDR() returning gradient CubeTexture
    - Implement createPillarGeometry() returning basic CylinderGeometry wrapped in Object3D
    - _Requirements: 9.2_

  - [ ]* 6.3 Write unit tests for error handling
    - Test AssetLoadError instantiation with all properties
    - Test FallbackAssets creation methods return valid Three.js objects
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 7. Implement configuration validation
  - [ ] 7.1 Create ConfigValidator class
    - Implement `src/lib/three/assets/config/ConfigValidator.ts` with static validate() method
    - Implement validatePaths() checking basePaths structure
    - Implement validateAsset() checking asset structure (ModelAsset, TextureAsset, HDRAsset)
    - Throw descriptive errors for invalid configurations
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [ ]* 7.2 Write unit tests for configuration validation
    - Test valid configuration parsing passes
    - Test invalid configuration structures are rejected with descriptive errors
    - Test path validation (absolute, relative, CDN URLs)
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 8. Implement individual asset loaders
  - [ ] 8.1 Create IAssetLoader interface
    - Define `src/lib/three/assets/loaders/types.ts` with IAssetLoader<T> interface
    - Include load() and dispose() method signatures
    - _Requirements: 1.1, 2.1, 3.1, 4.1_

  - [ ] 8.2 Implement GLTFAssetLoader
    - Create `src/lib/three/assets/loaders/GLTFAssetLoader.ts` implementing IAssetLoader<THREE.Object3D>
    - Use Three.js GLTFLoader from 'three/examples/jsm/loaders/GLTFLoader.js'
    - Implement load() resolving path with basePath, handling progress callbacks
    - Implement dispose() calling dispose on geometries, materials, textures
    - Wrap errors in AssetLoadError with type NETWORK_ERROR or PARSE_ERROR
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ] 8.3 Implement TextureAssetLoader
    - Create `src/lib/three/assets/loaders/TextureAssetLoader.ts` implementing IAssetLoader<THREE.Texture>
    - Use Three.js TextureLoader
    - Implement load() with texture settings application (wrapS, wrapT, filters, encoding)
    - Implement dispose() calling texture.dispose()
    - Return fallback texture on load failure
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ] 8.4 Implement HDRAssetLoader
    - Create `src/lib/three/assets/loaders/HDRAssetLoader.ts` implementing IAssetLoader<THREE.CubeTexture>
    - Use Three.js RGBELoader from 'three/examples/jsm/loaders/RGBELoader.js'
    - Implement load() with tone mapping configuration
    - Implement dispose() calling texture.dispose()
    - Return fallback gradient HDR on load failure
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ] 8.5 Implement FBXAssetLoader (optional)
    - Create `src/lib/three/assets/loaders/FBXAssetLoader.ts` implementing IAssetLoader<THREE.Object3D>
    - Use Three.js FBXLoader from 'three/examples/jsm/loaders/FBXLoader.js'
    - Implement load() preserving skeletal and animation data
    - Implement dispose() similar to GLTFAssetLoader
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ]* 8.6 Write unit tests for loaders
    - Test GLTFAssetLoader loads valid .glb file (mock Three.js loader)
    - Test GLTFAssetLoader throws AssetLoadError for malformed file
    - Test TextureAssetLoader applies texture settings correctly
    - Test HDRAssetLoader loads .hdr file successfully
    - Test fallback asset creation on load failures
    - _Requirements: 1.1, 1.4, 2.1, 2.4, 3.1, 3.4, 4.1, 4.4_

- [ ] 9. Implement LoaderRegistry
  - [ ] 9.1 Create LoaderRegistry class
    - Implement `src/lib/three/assets/loaders/LoaderRegistry.ts` managing loader instances
    - Implement register(), get(), has() methods using Map<string, IAssetLoader<any>>
    - Initialize with GLTFAssetLoader, TextureAssetLoader, HDRAssetLoader in constructor
    - Optionally initialize FBXAssetLoader based on configuration
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 4.5_

  - [ ]* 9.2 Write unit tests for LoaderRegistry
    - Test loader registration and retrieval
    - Test has() method for registered and unregistered loaders
    - _Requirements: 1.1, 2.1, 3.1, 4.1_

- [ ] 10. Checkpoint - Ensure all loader tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Implement AssetManager core functionality
  - [ ] 11.1 Create AssetManager class structure
    - Create `src/lib/three/assets/AssetManager.ts` with private properties (config, loaders, cache, queue, eventEmitter, stats)
    - Implement constructor accepting AssetConfig, initializing LoaderRegistry, AssetCache, LoadingQueue, EventEmitter
    - Validate config using ConfigValidator in constructor
    - _Requirements: 5.1, 5.2, 6.1, 6.2, 7.1, 7.2, 10.1, 10.2, 10.3, 10.4, 10.5_

  - [ ] 11.2 Implement asset loading methods
    - Implement async load<T>(id: string): Promise<T> checking cache first, then enqueuing load
    - Implement async loadMultiple(ids: string[]): Promise<Map<string, any>> loading assets in parallel respecting maxConcurrent
    - Implement async preloadCritical() loading all assets marked with preload: true
    - Emit 'progress', 'load-complete', 'cache-hit', 'cache-miss' events during loading
    - _Requirements: 1.1, 1.5, 2.1, 2.5, 3.1, 3.5, 4.1, 5.1, 5.2, 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 11.3_

  - [ ] 11.3 Implement cache management methods
    - Implement clearCache(id?: string) clearing specific or all cached assets
    - Implement getCacheStats() returning CacheStats from cache
    - _Requirements: 5.2, 5.3, 5.5_

  - [ ] 11.4 Implement configuration methods
    - Implement updateConfig(config: Partial<AssetConfig>) merging with existing config
    - Implement exportConfig(): string serializing config to JSON with Pretty_Printer formatting
    - Implement importConfig(json: string) parsing and validating JSON, updating config
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 12.1, 12.2, 12.3_

  - [ ] 11.5 Implement event handling methods
    - Implement on(event: string, handler: Function) delegating to eventEmitter
    - Implement off(event: string, handler: Function) delegating to eventEmitter
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ] 11.6 Implement utility methods
    - Implement getLoadingStatus(): LoadingStatus aggregating queue and cache status
    - Implement getFailedAssets(): string[] returning list of failed asset IDs
    - Implement async retryFailed() re-enqueuing all failed assets
    - Implement dispose() cleaning up all resources (cache, queue, event listeners)
    - _Requirements: 6.2, 6.5, 9.5, 11.5_

  - [ ]* 11.7 Write unit tests for AssetManager
    - Test load() returns cached asset on second call (cache hit scenario)
    - Test loadMultiple() respects maxConcurrent limit
    - Test preloadCritical() loads only assets marked preload: true
    - Test event emission during loading lifecycle
    - Test clearCache() removes assets from cache
    - Test exportConfig() and importConfig() round-trip (serialize then deserialize produces equivalent config)
    - Test getFailedAssets() after load failures
    - Test retryFailed() re-attempts failed loads
    - _Requirements: 5.1, 5.2, 5.3, 6.1, 6.2, 6.4, 7.1, 7.2, 9.5, 10.1, 11.3, 12.1, 12.2, 12.4_

- [ ] 12. Implement error handling and retry logic
  - [ ] 12.1 Add error handling to AssetManager load methods
    - Wrap loader errors in AssetLoadError with appropriate type
    - Emit 'load-error' event on failures
    - Implement retry logic (up to 3 attempts with exponential backoff for NETWORK_ERROR)
    - Use fallback assets on final failure (no retry for PARSE_ERROR, VALIDATION_ERROR)
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ]* 12.2 Write integration tests for error handling
    - Test network error triggers retry with exponential backoff
    - Test parse error fails immediately without retry
    - Test fallback asset is used after max retries exceeded
    - Test multiple asset failures don't stop remaining asset loading
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 13. Checkpoint - Ensure AssetManager tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 14. Create asset configuration file
  - [ ] 14.1 Create assets.json configuration
    - Create `public/assets/config/assets.json` with basePaths, assets (models, textures, hdri), loading, and cache configuration
    - Include door-left and door-right GLB models with high priority and preload: true
    - Include celestial-sky HDR with high priority
    - Include door textures (normal, roughness, metallic, emissive) with normal priority
    - Set maxConcurrent: 3, retryAttempts: 3, retryDelay: 1000
    - Set cache enabled: true, maxSize: 100, strategy: 'lru'
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 15. Integrate AssetManager with CelestiaDoor
  - [ ] 15.1 Update CelestiaDoor constructor
    - Modify `src/lib/three/CelestiaDoor.ts` constructor to accept optional AssetManager parameter
    - Add private properties: assetManager?: AssetManager, loadedModels: Map<string, THREE.Object3D>
    - Call setupAssetListeners() if assetManager provided
    - _Requirements: 8.1_

  - [ ] 15.2 Implement asset loading in CelestiaDoor initialization
    - Update init() method to call assetManager.preloadCritical() before scene creation
    - Add private async loadDoorModels() loading 'door-left' and 'door-right' assets
    - Store loaded models in loadedModels Map
    - Wrap loading in try-catch, log warnings on failure
    - _Requirements: 8.2_

  - [ ] 15.3 Update createDoor() to use loaded models
    - Check if loadedModels contains 'door-left' and 'door-right'
    - If models exist, use them instead of creating procedural BoxGeometry doors
    - Position loaded models at appropriate locations (left: -1.5, 0, 0; right: 1.5, 0, 0)
    - If models don't exist, fallback to existing procedural geometry code
    - _Requirements: 8.3, 8.5_

  - [ ] 15.4 Implement HDR environment map integration
    - Add private async loadHDREnvironment() loading 'celestial-sky' HDR asset
    - Apply loaded HDR to scene.environment property
    - Update renderer tone mapping exposure if specified in asset config
    - Fallback to existing background if HDR loading fails
    - _Requirements: 8.4, 3.5_

  - [ ] 15.5 Implement setupAssetListeners()
    - Listen to 'progress' event, log loading percentage
    - Listen to 'load-complete' event, call private onAssetLoaded(assetId)
    - Listen to 'load-error' event, log error details
    - _Requirements: 6.1, 6.2, 6.4, 6.5_

  - [ ]* 15.6 Write integration tests for CelestiaDoor with AssetManager
    - Test CelestiaDoor initialization with AssetManager loads critical assets
    - Test createDoor() uses loaded models when available
    - Test createDoor() falls back to procedural geometry on load failure
    - Test HDR environment is applied to scene when loaded
    - Test progress events are emitted during initialization
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 16. Implement performance optimizations
  - [ ] 16.1 Add lazy loading for non-critical assets
    - Add private async lazyLoadEnvironmentAssets() to CelestiaDoor loading pillars, central-structure, floor textures after initial render
    - Call lazyLoadEnvironmentAssets() after first render frame
    - Replace procedural geometries with loaded assets using replaceProceduralWithAsset()
    - _Requirements: 11.1_

  - [ ] 16.2 Implement memory management
    - Add disposeAsset(id: string) to AssetManager calling loader.dispose() and cache.delete()
    - Add disposeUnused(threshold: number = 300000) disposing assets not accessed in last 5 minutes
    - _Requirements: 11.5_

  - [ ] 16.3 Add dynamic loader imports for bundle optimization
    - Refactor LoaderRegistry to lazy-load Three.js loaders using dynamic imports
    - Implement private async loadGLTFLoader() importing GLTFLoader only when needed
    - Implement private async loadFBXLoader() importing FBXLoader only when needed
    - Call loader imports in AssetManager.load() before using loader
    - _Requirements: 11.2_

  - [ ]* 16.4 Write performance tests
    - Test lazy loading loads assets after initial render (timing verification)
    - Test disposeUnused() removes assets not accessed recently
    - Test dynamic loader imports reduce initial bundle size (bundle analysis)
    - _Requirements: 11.1, 11.2, 11.5_

- [ ] 17. Create usage example and documentation
  - [ ] 17.1 Update experiencia4.astro to use AssetManager
    - Import AssetManager and assets.json configuration
    - Initialize AssetManager with configuration
    - Add progress bar UI element and update on 'progress' event
    - Pass AssetManager to CelestiaDoor constructor
    - _Requirements: 8.1, 8.2, 6.1, 6.2_

  - [ ] 17.2 Add loading UI feedback
    - Create loading overlay with progress bar in experiencia4.astro
    - Show loading percentage during asset loading
    - Hide loading overlay when all critical assets loaded
    - Display error messages if critical assets fail
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 18. Final checkpoint - End-to-end integration test
  - Ensure all tests pass, ask the user if questions arise.
  - Manually verify experiencia4.astro loads assets and displays door correctly

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP (all testing sub-tasks are optional)
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Core infrastructure (tasks 1-7) must complete before loaders (tasks 8-10)
- Loaders must complete before AssetManager (tasks 11-13)
- AssetManager must complete before CelestiaDoor integration (tasks 15-16)
- Performance optimizations (task 16) can be done after basic integration works
- Unit tests focus on specific examples and edge cases, not property-based testing
- Integration tests verify AssetManager + CelestiaDoor work together end-to-end
- Testing approach: unit tests for individual components, integration tests for full system

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1", "2.2"] },
    { "id": 2, "tasks": ["2.3", "3.1", "6.1", "6.2", "7.1"] },
    { "id": 3, "tasks": ["3.2", "4.1", "6.3", "7.2"] },
    { "id": 4, "tasks": ["4.2", "8.1", "8.2", "8.3", "8.4"] },
    { "id": 5, "tasks": ["8.5", "8.6", "9.1"] },
    { "id": 6, "tasks": ["9.2", "11.1"] },
    { "id": 7, "tasks": ["11.2", "11.3", "11.4"] },
    { "id": 8, "tasks": ["11.5", "11.6", "12.1"] },
    { "id": 9, "tasks": ["11.7", "12.2", "14.1"] },
    { "id": 10, "tasks": ["15.1"] },
    { "id": 11, "tasks": ["15.2", "15.4", "15.5"] },
    { "id": 12, "tasks": ["15.3"] },
    { "id": 13, "tasks": ["15.6", "16.1", "16.2", "16.3"] },
    { "id": 14, "tasks": ["16.4", "17.1"] },
    { "id": 15, "tasks": ["17.2"] }
  ]
}
```
