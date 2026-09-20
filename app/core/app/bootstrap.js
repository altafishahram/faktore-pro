/**
 * Application Bootstrap
 * Initializes DB, Router, Modules, PWA
 */

import { openDB, ensureDefaults } from '../../storage/indexeddb/db.js';
import { start as startRouter, register } from '../router/router.js';
import { emit, Events } from '../events/event-bus.js';
import { setLoading } from '../state/store.js';
import { loadAndApplyTheme, watchSystemTheme } from '../utilities/theme.js';

// Module renderers (will be imported as we build them)
import { renderDashboard } from '../../modules/dashboard/dashboard.js';
import { renderProducts } from '../../modules/products/products.js';
import { renderCustomers } from '../../modules/customers/customers.js';
import { renderInvoices } from '../../modules/invoices/invoices.js';
import { renderQuotations } from '../../modules/quotations/quotations.js';
import { renderSettings } from '../../modules/settings/settings.js';

/**
 * Register all routes
 */
function registerRoutes() {
  register('/dashboard', () => renderDashboard());
  register('/products', () => renderProducts());
  register('/customers', () => renderCustomers());
  register('/invoices', () => renderInvoices());
  register('/invoices/new', () => renderInvoices({ mode: 'create' }));
  register('/invoices/:id', (params) => renderInvoices({ mode: 'edit', id: params.id }));
  register('/quotations', () => renderQuotations());
  register('/quotations/new', () => renderQuotations({ mode: 'create' }));
  register('/quotations/:id', (params) => renderQuotations({ mode: 'edit', id: params.id }));
  register('/settings', () => renderSettings());
  // Future: /price-rules, /business-profile, etc.
}

/**
 * Show a toast notification
 */
export function showToast(message, type = 'info') {
  emit(Events.TOAST, { message, type, id: Date.now() });
}

/**
 * Initialize the entire application
 */
export async function bootstrap() {
  const appRoot = document.getElementById('app');
  if (!appRoot) {
    console.error('[App] #app root not found');
    return;
  }

  try {
    setLoading(true);

    // 1. Open IndexedDB + ensure defaults
    await openDB();
    await ensureDefaults();

    // 1b. Theme
    await loadAndApplyTheme();
    watchSystemTheme();

    // 2. Register routes
    registerRoutes();

    // 3. Start router (renders current view)
    startRouter();

    // 4. Register Service Worker (PWA)
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.register('./sw.js', { scope: './' });
        console.log('[PWA] Service Worker registered:', reg.scope);
      } catch (swErr) {
        console.warn('[PWA] SW registration failed (offline still works via cache):', swErr);
      }
    }

    // 5. Toast listener (simple implementation)
    setupToastListener();

    console.log('[App] Bootstrap complete – Offline-First ready');
  } catch (err) {
    console.error('[App] Bootstrap failed:', err);
    appRoot.innerHTML = `
      <div class="empty-state" style="min-height:100dvh">
        <div class="empty-state-icon">⚠️</div>
        <h2 class="empty-state-title">خطا در راه‌اندازی برنامه</h2>
        <p class="empty-state-desc">${err.message || 'لطفاً صفحه را مجدداً بارگذاری کنید.'}</p>
        <button class="btn btn-primary" onclick="location.reload()">تلاش مجدد</button>
      </div>
    `;
  } finally {
    setLoading(false);
  }
}

function setupToastListener() {
  const container = document.createElement('div');
  container.className = 'toast-container';
  container.id = 'toast-container';
  document.body.appendChild(container);

  import('../events/event-bus.js').then(({ on, Events }) => {
    on(Events.TOAST, ({ message, type }) => {
      const toast = document.createElement('div');
      toast.className = `toast toast-${type || 'info'}`;
      toast.innerHTML = `<span>${message}</span>`;
      container.appendChild(toast);

      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
      }, 3200);
    });
  });
}

// Auto-start when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
