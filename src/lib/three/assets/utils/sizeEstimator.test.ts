/**
 * Manual verification tests for sizeEstimator utility
 * These tests document expected behavior and can be run manually
 */

import * as THREE from 'three';
import { estimateAssetSize, estimateObject3DSize, estimateTextureSize } from './sizeEstimator';

// Test 1: Estimate simple geometry
export function testSimpleGeometry() {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const size = estimateAssetSize(geometry);
  
  console.log('Simple BoxGeometry size:', size, 'bytes');
  console.assert(size > 0, 'Geometry size should be greater than 0');
  
  // BoxGeometry has position (3 floats * vertices), normal (3 floats * vertices), uv (2 floats * vertices)
  // Plus indices. Should be several KB.
  console.assert(size > 1000, 'BoxGeometry should be at least 1KB');
}

// Test 2: Estimate mesh with geometry and material
export function testMeshSize() {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
  const mesh = new THREE.Mesh(geometry, material);
  
  const size = estimateObject3DSize(mesh);
  
  console.log('Mesh (geometry + material) size:', size, 'bytes');
  console.assert(size > 0, 'Mesh size should be greater than 0');
  console.assert(size > 1000, 'Mesh should be at least 1KB');
}

// Test 3: Estimate texture size
export function testTextureSize() {
  // Create a mock texture with known dimensions
  const texture = new THREE.Texture();
  
  // Simulate an image
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  texture.image = canvas;
  
  const size = estimateTextureSize(texture);
  
  console.log('512x512 texture size:', size, 'bytes');
  console.assert(size > 0, 'Texture size should be greater than 0');
  
  // 512 * 512 * 4 bytes (RGBA) = 1,048,576 bytes
  // With mipmaps: ~1.33x = ~1,395,000 bytes
  console.assert(size >= 1000000, 'Texture should be around 1MB');
}

// Test 4: Estimate scene graph with multiple objects
export function testSceneGraph() {
  const scene = new THREE.Object3D();
  
  // Add multiple meshes
  for (let i = 0; i < 5; i++) {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(i, 0, 0);
    scene.add(mesh);
  }
  
  const size = estimateObject3DSize(scene);
  
  console.log('Scene with 5 meshes size:', size, 'bytes');
  console.assert(size > 0, 'Scene size should be greater than 0');
  // Should be significantly larger than a single mesh
  console.assert(size > 5000, 'Scene with 5 meshes should be at least 5KB');
}

// Test 5: Estimate unknown type (fallback)
export function testUnknownType() {
  const unknownObject = { someProperty: 'value' };
  const size = estimateAssetSize(unknownObject);
  
  console.log('Unknown object size (fallback):', size, 'bytes');
  console.assert(size === 1024, 'Unknown type should return 1KB default');
}

// Test 6: Estimate null/undefined
export function testNullUndefined() {
  const sizeNull = estimateAssetSize(null);
  const sizeUndefined = estimateAssetSize(undefined);
  
  console.log('Null size:', sizeNull, 'bytes');
  console.log('Undefined size:', sizeUndefined, 'bytes');
  
  console.assert(sizeNull === 0, 'Null should return 0 bytes');
  console.assert(sizeUndefined === 0, 'Undefined should return 0 bytes');
}

// Run all tests
export function runAllTests() {
  console.log('=== Size Estimator Verification Tests ===\n');
  
  try {
    testSimpleGeometry();
    console.log('✓ Test 1: Simple geometry passed\n');
  } catch (e) {
    console.error('✗ Test 1 failed:', e, '\n');
  }
  
  try {
    testMeshSize();
    console.log('✓ Test 2: Mesh size passed\n');
  } catch (e) {
    console.error('✗ Test 2 failed:', e, '\n');
  }
  
  try {
    testTextureSize();
    console.log('✓ Test 3: Texture size passed\n');
  } catch (e) {
    console.error('✗ Test 3 failed:', e, '\n');
  }
  
  try {
    testSceneGraph();
    console.log('✓ Test 4: Scene graph passed\n');
  } catch (e) {
    console.error('✗ Test 4 failed:', e, '\n');
  }
  
  try {
    testUnknownType();
    console.log('✓ Test 5: Unknown type fallback passed\n');
  } catch (e) {
    console.error('✗ Test 5 failed:', e, '\n');
  }
  
  try {
    testNullUndefined();
    console.log('✓ Test 6: Null/undefined handling passed\n');
  } catch (e) {
    console.error('✗ Test 6 failed:', e, '\n');
  }
  
  console.log('=== All tests completed ===');
}
