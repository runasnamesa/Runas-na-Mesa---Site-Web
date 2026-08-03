# Asset Utilities

This directory contains utility functions for the Advanced 3D Asset Loaders System.

## Size Estimator

The `sizeEstimator.ts` module provides memory estimation functions for Three.js objects. These functions are crucial for implementing the LRU cache eviction strategy in the AssetCache.

### Functions

#### `estimateAssetSize(asset: any): number`

Main entry point that dispatches to the appropriate estimator based on asset type.

**Supported Types:**
- Object3D (and all subclasses: Mesh, Group, Scene, etc.)
- Texture
- CubeTexture
- BufferGeometry
- Material

**Returns:** Estimated memory size in bytes

**Example:**
```typescript
import { estimateAssetSize } from './utils/sizeEstimator';

const model = await loader.load('model.glb');
const size = estimateAssetSize(model); // Returns size in bytes
```

#### `estimateObject3DSize(object: THREE.Object3D): number`

Estimates the size of an Object3D and all its children by recursively traversing the scene graph.

**Includes:**
- Transform matrices and node overhead
- Geometry buffer attributes (position, normal, UV, indices)
- Material data and shader uniforms
- Skeleton and bone data for SkinnedMesh

**Returns:** Total size in bytes including all children

#### `estimateTextureSize(texture: THREE.Texture | THREE.CubeTexture): number`

Estimates the size of a texture or cube texture.

**Calculation:**
- Width × Height × Bytes per pixel
- Adjusted for texture format (RGB, RGBA, Luminance, etc.)
- Adjusted for texture type (Float, HalfFloat, Unsigned Byte)
- Includes mipmap overhead (~33% additional)

**For CubeTexture:** Sums all 6 faces

**Returns:** Size in bytes

### Implementation Details

#### Geometry Size Estimation

Iterates through all buffer attributes and sums their byte lengths:
- Position: Usually 3 floats per vertex (12 bytes)
- Normal: Usually 3 floats per vertex (12 bytes)
- UV: Usually 2 floats per vertex (8 bytes)
- Index buffer: 2 or 4 bytes per index
- Custom attributes: Counted by byte length

#### Material Size Estimation

Provides a conservative estimate:
- Base overhead: 1KB for shader compilation and uniforms
- Texture references: 8 bytes per texture property
- Does not count texture data itself (textures estimated separately)

#### Texture Size Estimation

Accurately calculates based on:
- Image dimensions (width × height)
- Format (RGBA = 4 bytes, RGB = 3 bytes, etc.)
- Type (Float = 4×, HalfFloat = 2×, Byte = 1×)
- Mipmap generation (adds ~33%)

**Example calculations:**
- 512×512 RGBA texture with mipmaps: ~1.36 MB
- 1024×1024 RGB texture without mipmaps: ~3 MB
- 2048×2048 RGBA float texture: ~67 MB

### Usage in AssetCache

The AssetCache uses `estimateAssetSize()` to track memory usage:

```typescript
class AssetCache {
  public set<T>(id: string, asset: T): void {
    const size = estimateAssetSize(asset);
    
    // Check if adding this asset would exceed maxSize
    if (this.currentSize + size > this.maxSize) {
      this.evict(); // Remove LRU items
    }
    
    this.cache.set(id, {
      asset,
      size,
      lastAccessed: Date.now(),
      accessCount: 0
    });
    
    this.currentSize += size;
  }
}
```

### Testing

See `sizeEstimator.test.ts` for manual verification tests that can be run in a browser or Node environment with Three.js available.

**Test Coverage:**
- ✓ Simple geometry estimation
- ✓ Mesh with geometry and material
- ✓ Texture size calculation
- ✓ Scene graph traversal
- ✓ Unknown type fallback (1KB default)
- ✓ Null/undefined handling (0 bytes)

### Requirements Satisfied

- **Requirement 5.4**: Cache eviction strategy based on memory size estimation
- **Requirement 11.5**: Disposing unused assets to free GPU memory

### Performance Notes

Size estimation is fast (O(n) where n is number of objects/attributes) and should not significantly impact loading performance. The estimates are conservative and may be slightly higher than actual GPU memory usage, which provides a safety margin for cache management.

### Future Enhancements

Possible improvements:
- Support for compressed texture formats (KTX2, Basis)
- More accurate material size based on shader complexity
- Animation clip size estimation
- Bone and morph target memory tracking
