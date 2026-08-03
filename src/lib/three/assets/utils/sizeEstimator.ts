import type * as THREE from 'three';

/**
 * Estimates the memory size of Three.js objects in bytes.
 * Used for cache management and memory pressure detection.
 */

/**
 * Estimates the size of a BufferGeometry in bytes.
 * Calculates memory usage based on buffer attributes.
 */
function estimateGeometrySize(geometry: THREE.BufferGeometry): number {
  let size = 0;

  // Iterate through all attributes (position, normal, uv, etc.)
  for (const attributeName in geometry.attributes) {
    const attribute = geometry.attributes[attributeName];
    if (attribute && attribute.array) {
      // Size = bytes per element * number of elements
      size += attribute.array.byteLength;
    }
  }

  // Add index buffer if present
  if (geometry.index && geometry.index.array) {
    size += geometry.index.array.byteLength;
  }

  return size;
}

/**
 * Estimates the size of a Material in bytes.
 * Approximates based on shader complexity and uniform data.
 */
function estimateMaterialSize(material: THREE.Material): number {
  // Base size for material definition (approximation)
  let size = 1024; // 1KB base overhead for shader compilation and uniforms

  // Check for textures in standard material properties
  const materialWithMaps = material as any;
  
  const textureProps = [
    'map', 'normalMap', 'roughnessMap', 'metalnessMap', 
    'emissiveMap', 'aoMap', 'lightMap', 'bumpMap',
    'displacementMap', 'alphaMap', 'envMap'
  ];

  for (const prop of textureProps) {
    if (materialWithMaps[prop]) {
      // Don't count texture size here, it will be counted separately
      // Just add reference overhead
      size += 8; // pointer size
    }
  }

  return size;
}

/**
 * Estimates the size of a Texture in bytes.
 * Calculates based on image dimensions, format, and mipmaps.
 */
export function estimateTextureSize(texture: THREE.Texture | THREE.CubeTexture): number {
  if (!texture.image) {
    return 0;
  }

  // For CubeTexture, image is an array of 6 images
  if ('isCubeTexture' in texture && texture.image instanceof Array) {
    const images = texture.image;
    let totalSize = 0;

    for (const image of images) {
      if (image && image.width && image.height) {
        totalSize += estimateSingleImageSize(image.width, image.height, texture);
      }
    }

    return totalSize;
  }

  // For regular Texture
  const image = texture.image;
  if (!image || !image.width || !image.height) {
    return 0;
  }

  return estimateSingleImageSize(image.width, image.height, texture);
}

/**
 * Estimates the size of a single image in a texture.
 */
function estimateSingleImageSize(
  width: number, 
  height: number, 
  texture: THREE.Texture | THREE.CubeTexture
): number {
  // Determine bytes per pixel based on format
  let bytesPerPixel = 4; // RGBA is default

  // Adjust for different texture formats
  // Note: Three.js doesn't expose format details consistently,
  // so we use conservative estimates
  const format = (texture as any).format;
  
  if (format === 1023) { // THREE.RGBAFormat
    bytesPerPixel = 4;
  } else if (format === 1022) { // THREE.RGBFormat
    bytesPerPixel = 3;
  } else if (format === 1021) { // THREE.LuminanceAlphaFormat
    bytesPerPixel = 2;
  } else if (format === 1024) { // THREE.LuminanceFormat
    bytesPerPixel = 1;
  }

  // Check for HDR formats (float textures use more memory)
  const type = (texture as any).type;
  if (type === 1015 || type === 1016) { // THREE.FloatType or THREE.HalfFloatType
    bytesPerPixel *= type === 1015 ? 4 : 2; // Float is 4 bytes, HalfFloat is 2 bytes
  }

  // Base texture size
  let size = width * height * bytesPerPixel;

  // Add mipmap overhead (approximately 33% more memory)
  if (texture.generateMipmaps) {
    size = Math.floor(size * 1.33);
  }

  return size;
}

/**
 * Estimates the size of an Object3D and all its children in bytes.
 * Recursively traverses the scene graph.
 */
export function estimateObject3DSize(object: THREE.Object3D): number {
  let size = 0;

  // Traverse the object and all children
  object.traverse((node) => {
    // Add base object overhead (transform matrices, etc.)
    size += 256; // Approximate overhead per node

    // Check if node is a Mesh
    if ('isMesh' in node && node.type === 'Mesh') {
      const mesh = node as THREE.Mesh;

      // Add geometry size
      if (mesh.geometry) {
        size += estimateGeometrySize(mesh.geometry);
      }

      // Add material size
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          for (const mat of mesh.material) {
            size += estimateMaterialSize(mat);
          }
        } else {
          size += estimateMaterialSize(mesh.material);
        }
      }
    }

    // Check for SkinnedMesh (has skeleton data)
    if ('isSkinnedMesh' in node) {
      const skinnedMesh = node as any;
      if (skinnedMesh.skeleton && skinnedMesh.skeleton.bones) {
        // Add overhead for skeleton (bones + matrices)
        const boneCount = skinnedMesh.skeleton.bones.length;
        size += boneCount * 128; // Approximate size per bone
      }
    }
  });

  return size;
}

/**
 * Estimates the size of any Three.js asset in bytes.
 * Dispatches to appropriate estimator based on asset type.
 */
export function estimateAssetSize(asset: any): number {
  if (!asset) {
    return 0;
  }

  // Check for Object3D
  if ('isObject3D' in asset) {
    return estimateObject3DSize(asset);
  }

  // Check for Texture
  if ('isTexture' in asset || 'isCubeTexture' in asset) {
    return estimateTextureSize(asset);
  }

  // Check for BufferGeometry
  if ('isBufferGeometry' in asset) {
    return estimateGeometrySize(asset);
  }

  // Check for Material
  if ('isMaterial' in asset) {
    return estimateMaterialSize(asset);
  }

  // Unknown type - return conservative estimate
  return 1024; // 1KB default
}
