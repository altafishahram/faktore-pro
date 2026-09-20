/**
 * Customers Module – Full CRUD
 */

import { CustomerRepository } from '../../storage/indexeddb/repositories.js';
import { debounce } from '../../core/utilities/id.js';
import { emit, Events } from '../../core/events/event-bus.js';
import { showToast } from '../../core/app/bootstrap.js';

let currentCustomers = [];
let searchQuery = '';
let editingId = null;

export async function renderCustomers() {
  const main = document.getElementById('page-content');
  if (!main) return;

  main.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">مشتریان</h1>
      <div class="page-actions">
        <button class="btn btn-primary" id="btn-add-customer">+ مشتری جدید</button>
      </div>
    </div>
    <div class="page-body">
      <div class="card" style="margin-bottom: var(--space-4); padding: var(--space-3) var(--space-4);">
        <input type="search" id="customer-search" class="form-input" placeholder="جستجو بر اساس نام، شرکت یا تلفن..." style="border: none; background: transparent; padding: var(--space-2) 0;" />
      </div>
      <div id="customers-container">
        <div class="card"><div class="card-body" style="text-align:center;padding:var(--space-8);">
          <div class="skeleton" style="height:24px;width:40%;margin:0 auto 12px;"></div>
        </div></div>
      </div>
    </div>

    <div class="modal-overlay" id="customer-modal">
      <div class="modal" role="dialog">
        <div class="modal-header">
          <h2 id="customer-modal-title" class="card-title">مشتری جدید</h2>
          <button class="btn btn-ghost btn-icon" id="btn-close-customer-modal">✕</button>
        </div>
        <div class="modal-body">
          <form id="customer-form">
            <div class="form-group">
              <label class="form-label" for="c-name">نام *</label>
              <input type="text" id="c-name" class="form-input" required placeholder="نام مشتری یا شرکت" />
            </div>
            <div class="form-group">
              <label class="form-label" for="c-company">شرکت</label>
              <input type="text" id="c-company" class="form-input" placeholder="نام شرکت" />
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);">
              <div class="form-group">
                <label class="form-label" for="c-phone">تلفن</label>
                <input type="tel" id="c-phone" class="form-input ltr" placeholder="0912..." dir="ltr" />
              </div>
              <div class="form-group">
                <label class="form-label" for="c-email">ایمیل</label>
                <input type="email" id="c-email" class="form-input ltr" placeholder="email@example.com" dir="ltr" />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label" for="c-address">آدرس</label>
              <textarea id="c-address" class="form-textarea" rows="2"></textarea>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);">
              <div class="form-group">
                <label class="form-label" for="c-tax">شناسه مالیاتی</label>
                <input type="text" id="c-tax" class="form-input ltr" dir="ltr" />
              </div>
              <div class="form-group">
                <label class="form-label" for="c-national">کد ملی / اقتصادی</label>
                <input type="text" id="c-national" class="form-input ltr" dir="ltr" />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label" for="c-notes">یادداشت</label>
              <textarea id="c-notes" class="form-textarea" rows="2"></textarea>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-primary" id="btn-save-customer">ذخیره</button>
          <button type="button" class="btn btn-secondary" id="btn-cancel-customer">انصراف</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-add-customer')?.addEventListener('click', () => openCustomerModal());
  document.getElementById('btn-close-customer-modal')?.addEventListener('click', closeCustomerModal);
  document.getElementById('btn-cancel-customer')?.addEventListener('click', closeCustomerModal);
  document.getElementById('btn-save-customer')?.addEventListener('click', saveCustomer);
  document.getElementById('customer-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'customer-modal') closeCustomerModal();
  });

  const searchInput = document.getElementById('customer-search');
  if (searchInput) {
    searchInput.addEventListener('input', debounce((e) => {
      searchQuery = e.target.value;
      renderCustomerList();
    }, 250));
  }

  await loadCustomers();
  updateActiveNav('customers');
}

async function loadCustomers() {
  try {
    currentCustomers = await CustomerRepository.getAll();
    renderCustomerList();
  } catch (err) {
    console.error(err);
    showToast('خطا در بارگذاری مشتریان', 'error');
  }
}

function renderCustomerList() {
  const container = document.getElementById('customers-container');
  if (!container) return;

  let list = currentCustomers;
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = currentCustomers.filter(c =>
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.company && c.company.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q))
    );
  }

  if (list.length === 0) {
    container.innerHTML = `
      <div class="card"><div class="card-body">
        <div class="empty-state">
          <div class="empty-state-icon">👥</div>
          <h3 class="empty-state-title">${searchQuery ? 'نتیجه‌ای یافت نشد' : 'هنوز مشتری‌ای ثبت نشده'}</h3>
          <p class="empty-state-desc">${searchQuery ? 'عبارت دیگری را امتحان کنید.' : 'مشتریان خود را اضافه کنید تا در اسناد استفاده شوند.'}</p>
          ${!searchQuery ? '<button class="btn btn-primary" id="btn-add-empty-c">افزودن مشتری</button>' : ''}
        </div>
      </div></div>
    `;
    document.getElementById('btn-add-empty-c')?.addEventListener('click', () => openCustomerModal());
    return;
  }

  container.innerHTML = `
    <div style="display:grid;gap:var(--space-3);">
      ${list.map(c => `
        <div class="card" style="padding:var(--space-4);">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:var(--space-3);">
            <div style="flex:1;min-width:0;">
              <div style="font-weight:600;margin-bottom:4px;">${escapeHtml(c.name)}</div>
              ${c.company ? `<div style="font-size:var(--font-size-sm);color:var(--color-muted);margin-bottom:4px;">${escapeHtml(c.company)}</div>` : ''}
              <div style="font-size:var(--font-size-xs);color:var(--color-muted);direction:ltr;text-align:right;">
                ${c.phone ? escapeHtml(c.phone) : ''} ${c.email ? ' • ' + escapeHtml(c.email) : ''}
              </div>
            </div>
            <div style="display:flex;gap:var(--space-1);">
              <button class="btn btn-ghost btn-sm btn-edit-c" data-id="${c.id}">✏️</button>
              <button class="btn btn-ghost btn-sm btn-delete-c" data-id="${c.id}">🗑️</button>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  container.querySelectorAll('.btn-edit-c').forEach(btn => {
    btn.addEventListener('click', () => openCustomerModal(btn.dataset.id));
  });
  container.querySelectorAll('.btn-delete-c').forEach(btn => {
    btn.addEventListener('click', () => confirmDeleteCustomer(btn.dataset.id));
  });
}

function openCustomerModal(id = null) {
  editingId = id;
  const modal = document.getElementById('customer-modal');
  const title = document.getElementById('customer-modal-title');
  const form = document.getElementById('customer-form');

  if (id) {
    const customer = currentCustomers.find(c => c.id === id);
    if (!customer) return;
    title.textContent = 'ویرایش مشتری';
    document.getElementById('c-name').value = customer.name || '';
    document.getElementById('c-company').value = customer.company || '';
    document.getElementById('c-phone').value = customer.phone || '';
    document.getElementById('c-email').value = customer.email || '';
    document.getElementById('c-address').value = customer.address || '';
    document.getElementById('c-tax').value = customer.taxId || '';
    document.getElementById('c-national').value = customer.nationalId || customer.economicId || '';
    document.getElementById('c-notes').value = customer.notes || '';
  } else {
    title.textContent = 'مشتری جدید';
    form.reset();
  }
  modal.classList.add('open');
  document.getElementById('c-name')?.focus();
}

function closeCustomerModal() {
  document.getElementById('customer-modal')?.classList.remove('open');
  editingId = null;
}

async function saveCustomer() {
  const name = document.getElementById('c-name')?.value?.trim();
  if (!name) {
    showToast('نام مشتری الزامی است', 'error');
    return;
  }
  const data = {
    name,
    company: document.getElementById('c-company')?.value,
    phone: document.getElementById('c-phone')?.value,
    email: document.getElementById('c-email')?.value,
    address: document.getElementById('c-address')?.value,
    taxId: document.getElementById('c-tax')?.value,
    nationalId: document.getElementById('c-national')?.value,
    notes: document.getElementById('c-notes')?.value
  };
  try {
    if (editingId) {
      await CustomerRepository.update(editingId, data);
      showToast('مشتری به‌روزرسانی شد', 'success');
      emit(Events.CUSTOMER_UPDATED, { id: editingId });
    } else {
      const created = await CustomerRepository.create(data);
      showToast('مشتری اضافه شد', 'success');
      emit(Events.CUSTOMER_CREATED, created);
    }
    closeCustomerModal();
    await loadCustomers();
  } catch (err) {
    showToast(err.message || 'خطا در ذخیره مشتری', 'error');
  }
}

async function confirmDeleteCustomer(id) {
  const customer = currentCustomers.find(c => c.id === id);
  if (!customer) return;
  if (!confirm('آیا از حذف «' + customer.name + '» مطمئن هستید؟\\nاین عملیات قابل بازگشت نیست.')) return;
  try {
    await CustomerRepository.delete(id);
    showToast('مشتری حذف شد', 'success');
    emit(Events.CUSTOMER_DELETED, { id });
    await loadCustomers();
  } catch (err) {
    showToast('خطا در حذف مشتری', 'error');
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function updateActiveNav(module) {
  document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.module === module);
  });
}
