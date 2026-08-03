/**
 * Example usage of EventEmitter utility
 * This file demonstrates how the EventEmitter is used in the asset loading system
 */

import { EventEmitter, type AssetEvents } from './EventEmitter';

// Create an EventEmitter instance for asset loading events
const emitter = new EventEmitter<AssetEvents>();

// Register handlers for different event types
emitter.on('progress', (data) => {
  console.log(`Loading ${data.assetId}: ${data.percentage}% (${data.loaded}/${data.total})`);
});

emitter.on('load-complete', (data) => {
  console.log(`✓ Asset ${data.assetId} loaded in ${data.duration}ms`);
});

emitter.on('load-error', (data) => {
  console.error(`✗ Failed to load ${data.assetId} (attempt ${data.attempt}):`, data.error.message);
});

emitter.on('cache-hit', (data) => {
  console.log(`⚡ Cache hit for ${data.assetId}`);
});

emitter.on('cache-miss', (data) => {
  console.log(`📥 Cache miss for ${data.assetId}, loading...`);
});

// Simulate asset loading events
console.log('=== Simulating Asset Loading Events ===\n');

// Start loading
emitter.emit('cache-miss', { assetId: 'door-left' });
emitter.emit('progress', { loaded: 1, total: 3, percentage: 33, assetId: 'door-left' });
emitter.emit('progress', { loaded: 2, total: 3, percentage: 66, assetId: 'door-left' });
emitter.emit('progress', { loaded: 3, total: 3, percentage: 100, assetId: 'door-left' });
emitter.emit('load-complete', { assetId: 'door-left', duration: 245 });

// Second asset (cached)
emitter.emit('cache-hit', { assetId: 'door-left' });

// Third asset (fails)
emitter.emit('cache-miss', { assetId: 'invalid-asset' });
emitter.emit('load-error', { 
  assetId: 'invalid-asset', 
  error: new Error('File not found'), 
  attempt: 1 
});

// Demonstrate handler removal
console.log('\n=== Testing Handler Removal ===\n');

const tempHandler = (data: AssetEvents['progress']) => {
  console.log(`Temp handler: ${data.assetId}`);
};

emitter.on('progress', tempHandler);
console.log(`Listener count before removal: ${emitter.listenerCount('progress')}`);

emitter.off('progress', tempHandler);
console.log(`Listener count after removal: ${emitter.listenerCount('progress')}`);

// Demonstrate error handling in handlers
console.log('\n=== Testing Error Handling ===\n');

emitter.on('progress', () => {
  throw new Error('Handler error - should not break other handlers');
});

emitter.on('progress', (data) => {
  console.log('This handler still executes despite previous handler error');
});

emitter.emit('progress', { loaded: 1, total: 1, percentage: 100, assetId: 'test-asset' });

console.log('\n=== Example Complete ===');
