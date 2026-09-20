/**
 * Simple Event Bus for inter-module communication
 * Avoids tight coupling between modules
 */

const listeners = new Map();

/**
 * Subscribe to an event
 * @param {string} event
 * @param {Function} callback
 * @returns {Function} unsubscribe
 */
export function on(event, callback) {
  if (!listeners.has(event)) {
    listeners.set(event, new Set());
  }
  listeners.get(event).add(callback);

  return () => {
    listeners.get(event)?.delete(callback);
  };
}

/**
 * Emit an event
 * @param {string} event
 * @param {*} [payload]
 */
export function emit(event, payload) {
  const callbacks = listeners.get(event);
  if (callbacks) {
    callbacks.forEach((cb) => {
      try {
        cb(payload);
      } catch (err) {
        console.error(`[EventBus] Error in listener for "${event}":`, err);
      }
    });
  }
}

/**
 * One-time subscription
 */
export function once(event, callback) {
  const unsub = on(event, (payload) => {
    unsub();
    callback(payload);
  });
  return unsub;
}

/**
 * Clear all listeners (for testing / reset)
 */
export function clear() {
  listeners.clear();
}

// Common event names (documentation)
export const Events = {
  PRODUCT_CREATED: 'product:created',
  PRODUCT_UPDATED: 'product:updated',
  PRODUCT_DELETED: 'product:deleted',
  CUSTOMER_CREATED: 'customer:created',
  CUSTOMER_UPDATED: 'customer:updated',
  CUSTOMER_DELETED: 'customer:deleted',
  INVOICE_CREATED: 'invoice:created',
  INVOICE_UPDATED: 'invoice:updated',
  INVOICE_DELETED: 'invoice:deleted',
  QUOTATION_CREATED: 'quotation:created',
  QUOTATION_CONVERTED: 'quotation:converted',
  DATA_CHANGED: 'data:changed',
  TOAST: 'ui:toast',
  NAVIGATE: 'router:navigate',
  THEME_CHANGED: 'theme:changed'
};
