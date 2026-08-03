/**
 * EventEmitter utility for asset loading events
 * Provides type-safe event handling for AssetManager and related components
 */

/**
 * Event handler function type
 */
export type EventHandler<T = any> = (data: T) => void;

/**
 * Asset loading event types and their payload structures
 */
export interface AssetEvents {
  'progress': { loaded: number; total: number; percentage: number; assetId: string };
  'load-complete': { assetId: string; duration: number };
  'load-error': { assetId: string; error: Error; attempt: number };
  'cache-hit': { assetId: string };
  'cache-miss': { assetId: string };
  'cache-evict': { assetId: string; reason: string };
}

/**
 * Generic EventEmitter class for managing event subscriptions and emissions
 * Supports typed event handlers for asset loading lifecycle events
 */
export class EventEmitter<T extends Record<string, any> = AssetEvents> {
  private listeners: Map<keyof T, Set<EventHandler<any>>>;

  constructor() {
    this.listeners = new Map();
  }

  /**
   * Register an event handler for a specific event
   * @param event - The event name to listen for
   * @param handler - The callback function to execute when the event is emitted
   */
  public on<K extends keyof T>(event: K, handler: EventHandler<T[K]>): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
  }

  /**
   * Unregister an event handler for a specific event
   * @param event - The event name to stop listening for
   * @param handler - The callback function to remove
   */
  public off<K extends keyof T>(event: K, handler: EventHandler<T[K]>): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
      // Clean up empty event sets
      if (handlers.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  /**
   * Emit an event with associated data
   * Calls all registered handlers for the event with the provided data
   * @param event - The event name to emit
   * @param data - The data payload to pass to handlers
   */
  public emit<K extends keyof T>(event: K, data: T[K]): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          // Prevent handler errors from breaking other handlers
          console.error(`Error in event handler for '${String(event)}':`, error);
        }
      });
    }
  }

  /**
   * Remove all handlers for a specific event, or all handlers if no event specified
   * @param event - Optional event name to clear handlers for
   */
  public removeAllListeners<K extends keyof T>(event?: K): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Get the count of handlers registered for a specific event
   * @param event - The event name to check
   * @returns The number of handlers registered for the event
   */
  public listenerCount<K extends keyof T>(event: K): number {
    const handlers = this.listeners.get(event);
    return handlers ? handlers.size : 0;
  }

  /**
   * Check if there are any handlers registered for a specific event
   * @param event - The event name to check
   * @returns True if there are handlers registered for the event
   */
  public hasListeners<K extends keyof T>(event: K): boolean {
    return this.listenerCount(event) > 0;
  }
}
