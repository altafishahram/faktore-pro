/**
 * Dashboard Module
 */

import { getAll } from '../../storage/indexeddb/db.js';
import { formatCurrency, formatDate } from '../../core/utilities/id.js';

export async function renderDashboard() {
  const main = document.getElementById('page-content');
  if (!main) return;

  main.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">داشبورد</h1>
    </div>
    <div class="page-body">
      <div class="welcome-card glass-card" style="padding: var(--space-6); margin-bottom: var(--space-6);">
        <h2 style="font-size: var(--font-size-2xl); margin-bottom: var(--space-2);">سلام 👋</h2>
        <p style="color: var(--color-muted); margin-bottom: var(--space-5);">چه کاری می‌خواهید انجام دهید؟</p>
        <div class="dash-actions" style="display:flex;flex-wrap:nowrap;gap:var(--space-2);">
          <a href="#/invoices/new" class="btn btn-primary" style="flex:1;justify-content:center;white-space:nowrap;padding:12px 10px;font-size:var(--font-size-sm);">
            + فاکتور جدید
          </a>
          <a href="#/quotations/new" class="btn btn-secondary" style="flex:1;justify-content:center;white-space:nowrap;padding:12px 10px;font-size:var(--font-size-sm);">
            + پیش‌فاکتور جدید
          </a>
        </div>
      </div>

      <div id="dashboard-stats" class="stats-grid" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--space-2);margin-bottom:var(--space-6);">
        <div class="card" style="padding: var(--space-4); text-align: center;">
          <div class="skeleton" style="height: 28px; width: 60%; margin: 0 auto 8px;"></div>
          <div class="skeleton" style="height: 16px; width: 40%; margin: 0 auto;"></div>
        </div>
        <div class="card" style="padding: var(--space-4); text-align: center;">
          <div class="skeleton" style="height: 28px; width: 60%; margin: 0 auto 8px;"></div>
          <div class="skeleton" style="height: 16px; width: 40%; margin: 0 auto;"></div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">اسناد اخیر</h3>
        </div>
        <div class="card-body" id="recent-docs">
          <div class="empty-state" style="padding: var(--space-8);">
            <div class="empty-state-icon">📄</div>
            <h3 class="empty-state-title">هنوز سندی ثبت نشده</h3>
            <p class="empty-state-desc">اولین فاکتور یا پیش‌فاکتور خود را ایجاد کنید.</p>
            <a href="#/invoices/new" class="btn btn-primary">ایجاد فاکتور</a>
          </div>
        </div>
      </div>
    </div>
  `;

  // Load real stats
  try {
    const [invoices, quotations] = await Promise.all([
      getAll('invoices'),
      getAll('quotations')
    ]);

    const statsEl = document.getElementById('dashboard-stats');
    if (statsEl) {
      statsEl.innerHTML = `
        <div class="card" style="padding:var(--space-3) var(--space-2);text-align:center;">
          <div style="font-size:var(--font-size-xl);font-weight:700;color:var(--color-primary);">${invoices.length}</div>
          <div style="font-size:11px;color:var(--color-muted);white-space:nowrap;">فاکتورها</div>
        </div>
        <div class="card" style="padding:var(--space-3) var(--space-2);text-align:center;">
          <div style="font-size:var(--font-size-xl);font-weight:700;color:var(--color-accent);">${quotations.length}</div>
          <div style="font-size:11px;color:var(--color-muted);white-space:nowrap;">پیش‌فاکتور</div>
        </div>
        <div class="card" style="padding:var(--space-3) var(--space-2);text-align:center;">
          <div style="font-size:var(--font-size-xl);font-weight:700;">${invoices.filter(i => i.status === 'draft').length}</div>
          <div style="font-size:11px;color:var(--color-muted);white-space:nowrap;">پیش‌نویس</div>
        </div>
      `;
    }

    // Recent documents
    const recent = [
      ...invoices.map(i => ({ ...i, type: 'invoice' })),
      ...quotations.map(q => ({ ...q, type: 'quotation' }))
    ]
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, 8);

    const recentEl = document.getElementById('recent-docs');
    if (recentEl && recent.length > 0) {
      recentEl.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: var(--space-2);">
          ${recent.map(doc => `
            <a href="#/${doc.type === 'invoice' ? 'invoices' : 'quotations'}/${doc.id}" 
               style="display: flex; align-items: center; justify-content: space-between; padding: var(--space-3); border-radius: var(--radius-lg); background: var(--color-surface); border: 1px solid var(--color-border); text-decoration: none; color: inherit;">
              <div>
                <div style="font-weight: 600;">${doc.number || 'بدون شماره'}</div>
                <div style="font-size: var(--font-size-xs); color: var(--color-muted);">${formatDate(doc.date || doc.createdAt)}</div>
              </div>
              <div style="text-align: left;">
                <div style="font-weight: 600;">${formatCurrency(doc.grandTotal || 0)}</div>
                <span class="badge badge-${doc.type === 'invoice' ? 'primary' : 'success'}">${doc.type === 'invoice' ? 'فاکتور' : 'پیش‌فاکتور'}</span>
              </div>
            </a>
          `).join('')}
        </div>
      `;
    }
  } catch (err) {
    console.error('[Dashboard] Load error:', err);
  }

  // Update active nav
  updateActiveNav('dashboard');
}

function updateActiveNav(module) {
  document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.module === module);
  });
}
