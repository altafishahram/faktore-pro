/**
 * Lightweight Hash Router
 * Supports offline navigation without page reloads
 */

import { emit, Events } from '../events/event-bus.js';

const routes = new Map();
let currentRoute = null;
let currentParams = {};

/**
 * Register a route
 * @param {string} path - e.g. '/dashboard', '/invoices/:id'
 * @param {Function} handler - (params) => void
 */
export function register(path, handler) {
  routes.set(path, handler);
}

/**
 * Navigate to a path
 * @param {string} path
 * @param {object} [state]
 */
export function navigate(path, state = {}) {
  if (window.location.hash.slice(1) === path) {
    // Force re-render if same route
    handleRoute();
    return;
  }
  window.location.hash = path;
  // state can be stored in sessionStorage if needed later
}

/**
 * Get current route info
 */
export function getCurrent() {
  return {
    path: currentRoute,
    params: { ...currentParams }
  };
}

/**
 * Match path against registered routes
 */
function matchRoute(hashPath) {
  // Exact match first
  if (routes.has(hashPath)) {
    return { handler: routes.get(hashPath), params: {} };
  }

  // Parameterized routes
  for (const [pattern, handler] of routes) {
    if (!pattern.includes(':')) continue;

    const patternParts = pattern.split('/');
    const pathParts = hashPath.split('/');

    if (patternParts.length !== pathParts.length) continue;

    const params = {};
    let matched = true;

    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        params[patternParts[i].slice(1)] = pathParts[i];
      } else if (patternParts[i] !== pathParts[i]) {
        matched = false;
        break;
      }
    }

    if (matched) {
      return { handler, params };
    }
  }

  return null;
}

function handleRoute() {
  const hash = window.location.hash.slice(1) || '/dashboard';
  const match = matchRoute(hash);

  if (match) {
    currentRoute = hash;
    currentParams = match.params;
    try {
      match.handler(match.params);
    } catch (err) {
      console.error('[Router] Handler error:', err);
    }
    emit(Events.NAVIGATE, { path: hash, params: match.params });
  } else {
    // Fallback to dashboard
    navigate('/dashboard');
  }
}

/**
 * Start the router
 */
export function start() {
  window.addEventListener('hashchange', handleRoute);
  // Initial route
  if (!window.location.hash) {
    window.location.hash = '/dashboard';
  } else {
    handleRoute();
  }
}

/**
 * Stop (cleanup)
 */
export function stop() {
  window.removeEventListener('hashchange', handleRoute);
}
