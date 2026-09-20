/**
 * Minimal reactive store
 * For shared UI state (not persistent data - that lives in IndexedDB)
 */

const state = {
  isLoading: false,
  currentModule: 'dashboard',
  sidebarOpen: false,
  theme: 'light',
  toasts: []
};

const subscribers = new Set();

/**
 * Get current state (shallow copy)
 */
export function getState() {
  return { ...state };
}

/**
 * Update state and notify
 * @param {Partial<typeof state>} partial
 */
export function setState(partial) {
  Object.assign(state, partial);
  subscribers.forEach((cb) => {
    try {
      cb(getState());
    } catch (e) {
      console.error('[Store] Subscriber error:', e);
    }
  });
}

/**
 * Subscribe to state changes
 * @param {Function} callback
 * @returns {Function} unsubscribe
 */
export function subscribe(callback) {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

/**
 * Helpers
 */
export function setLoading(value) {
  setState({ isLoading: !!value });
}

export function setModule(name) {
  setState({ currentModule: name });
}

export function toggleSidebar(force) {
  setState({
    sidebarOpen: typeof force === 'boolean' ? force : !state.sidebarOpen
  });
}
