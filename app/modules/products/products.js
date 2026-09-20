/**
 * Products Module – Full CRUD
 */

import { ProductRepository } from '../../storage/indexeddb/repositories.js';
import { formatCurrency, debounce } from '../../core/utilities/id.js';
import { emit, Events } from '../../core/events/event-bus.js';
import { showToast } from '../../core/app/bootstrap.js';

let currentProducts = [];
let searchQuery = '';
let editingId = null;

export async function renderProducts() {
  const main = document.getElementById('page-content');
  if (!main) return;

  main.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">محصولات</h1>
      <div class="page-actions">
        <button class="btn btn-primary" id="btn-add-product">+ محصول جدید</button>
      </div>
    </div>
    <div class="page-body">
      <div class="card" style="margin-bottom: var(--space-4); padding: var(--space-3) var(--space-4);">
        <input type="search" id="product-search" class="form-input" placeholder="جستجو بر اساس نام یا کد محصول..." style="border: none; background: transparent; padding: var(--space-2) 0;" />
      </div>
      <div id="products-container">
        <div class="card"><div class="card-body" style="text-align:center;padding:var(--space-8);">
          <div class="skeleton" style="height:24px;width:40%;margin:0 auto 12px;"></div>
          <div class="skeleton" style="height:16px;width:60%;margin:0 auto;"></div>
        </div></div>
      </div>
    </div>

    <div class="modal-overlay" id="product-modal">
      <div class="modal" role="dialog">
        <div class="modal-header">
          <h2 id="product-modal-title" class="card-title">محصول جدید</h2>
          <button class="btn btn-ghost btn-icon" id="btn-close-product-modal">✕</button>
        </div>
        <div class="modal-body">
          <form id="product-form">
            <div class="form-group">
              <label class="form-label" for="p-name">نام محصول *</label>
              <input type="text" id="p-name" class="form-input" required placeholder="مثلاً لپ‌تاپ ایسوس" />
            </div>
            <div class="form-group">
              <label class="form-label" for="p-sku">کد / SKU</label>
              <input type="text" id="p-sku" class="form-input ltr" placeholder="PRD-001" dir="ltr" />
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);">
              <div class="form-group">
                <label class="form-label" for="p-price">قیمت پیش‌فرض</label>
                <input type="number" id="p-price" class="form-input ltr" min="0" step="1000" placeholder="0" dir="ltr" />
              </div>
              <div class="form-group">
                <label class="form-label" for="p-unit">واحد</label>
                <input type="text" id="p-unit" class="form-input" placeholder="عدد" value="عدد" />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label" for="p-desc">توضیحات</label>
              <textarea id="p-desc" class="form-textarea" rows="2"></textarea>
            </div>
            <div class="form-group">
              <label class="form-label" for="p-status">وضعیت</label>
              <select id="p-status" class="form-select">
                <option value="active">فعال</option>
                <option value="inactive">غیرفعال</option>
              </select>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-primary" id="btn-save-product">ذخیره</button>
          <button type="button" class="btn btn-secondary" id="btn-cancel-product">انصراف</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-add-product')?.addEventListener('click', () => openProductModal());
  document.getElementById('btn-close-product-modal')?.addEventListener('click', closeProductModal);
  document.getElementById('btn-cancel-product')?.addEventListener('click', closeProductModal);
  document.getElementById('btn-save-product')?.addEventListener('click', saveProduct);
  document.getElementById('product-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'product-modal') closeProductModal();
  });

  const searchInput = document.getElementById('product-search');
  if (searchInput) {
    searchInput.addEventListener('input', debounce((e) => {
      searchQuery = e.target.value;
      renderProductList();
    }, 250));
  }

  await loadProducts();
  updateActiveNav('products');
}

async function loadProducts() {
  try {
    currentProducts = await ProductRepository.getAll();
    renderProductList();
  } catch (err) {
    console.error(err);
    showToast('خطا در بارگذاری محصولات', 'error');
  }
}

function renderProductList() {
  const container = document.getElementById('products-container');
  if (!container) return;

  let list = currentProducts;
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = currentProducts.filter(p =>
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.sku && p.sku.toLowerCase().includes(q))
    );
  }

  if (list.length === 0) {
    container.innerHTML = `
      <div class="card"><div class="card-body">
        <div class="empty-state">
          <div class="empty-state-icon">📦</div>
          <h3 class="empty-state-title">${searchQuery ? 'نتیجه‌ای یافت نشد' : 'هنوز محصولی ثبت نشده'}</h3>
          <p class="empty-state-desc">${searchQuery ? 'عبارت دیگری را امتحان کنید.' : 'محصولات خود را اضافه کنید تا در فاکتورها استفاده شوند.'}</p>
          ${!searchQuery ? '<button class="btn btn-primary" id="btn-add-empty">افزودن محصول</button>' : ''}
        </div>
      </div></div>
    `;
    document.getElementById('btn-add-empty')?.addEventListener('click', () => openProductModal());
    return;
  }

  container.innerHTML = `
    <div style="display:grid;gap:var(--space-3);">
      ${list.map(p => `
        <div class="card" style="padding:var(--space-4);">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:var(--space-3);">
            <div style="flex:1;min-width:0;">
              <div style="font-weight:600;margin-bottom:4px;">${escapeHtml(p.name)}</div>
              <div style="font-size:var(--font-size-xs);color:var(--color-muted);direction:ltr;text-align:right;margin-bottom:6px;">${escapeHtml(p.sku) || '—'}</div>
              <div style="display:flex;align-items:center;gap:var(--space-2);flex-wrap:wrap;">
                <span style="font-weight:600;color:var(--color-primary);">${formatCurrency(p.defaultPrice)}</span>
                <span class="badge ${p.status === 'active' ? 'badge-success' : 'badge-warning'}">${p.status === 'active' ? 'فعال' : 'غیرفعال'}</span>
                <span style="font-size:var(--font-size-xs);color:var(--color-muted);">${escapeHtml(p.unit) || 'عدد'}</span>
              </div>
            </div>
            <div style="display:flex;gap:var(--space-1);">
              <button class="btn btn-ghost btn-sm btn-edit" data-id="${p.id}">✏️</button>
              <button class="btn btn-ghost btn-sm btn-delete" data-id="${p.id}">🗑️</button>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  container.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => openProductModal(btn.dataset.id));
  });
  container.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => confirmDeleteProduct(btn.dataset.id));
  });
}

function openProductModal(id = null) {
  editingId = id;
  const modal = document.getElementById('product-modal');
  const title = document.getElementById('product-modal-title');
  const form = document.getElementById('product-form');

  if (id) {
    const product = currentProducts.find(p => p.id === id);
    if (!product) return;
    title.textContent = 'ویرایش محصول';
    document.getElementById('p-name').value = product.name || '';
    document.getElementById('p-sku').value = product.sku || '';
    document.getElementById('p-price').value = product.defaultPrice || 0;
    document.getElementById('p-unit').value = product.unit || 'عدد';
    document.getElementById('p-desc').value = product.description || '';
    document.getElementById('p-status').value = product.status || 'active';
  } else {
    title.textContent = 'محصول جدید';
    form.reset();
    document.getElementById('p-unit').value = 'عدد';
    document.getElementById('p-status').value = 'active';
  }
  modal.classList.add('open');
  document.getElementById('p-name')?.focus();
}

function closeProductModal() {
  document.getElementById('product-modal')?.classList.remove('open');
  editingId = null;
}

async function saveProduct() {
  const name = document.getElementById('p-name')?.value?.trim();
  if (!name) {
    showToast('نام محصول الزامی است', 'error');
    return;
  }
  const data = {
    name,
    sku: document.getElementById('p-sku')?.value,
    defaultPrice: document.getElementById('p-price')?.value,
    unit: document.getElementById('p-unit')?.value,
    description: document.getElementById('p-desc')?.value,
    status: document.getElementById('p-status')?.value
  };
  try {
    if (editingId) {
      await ProductRepository.update(editingId, data);
      showToast('محصول به‌روزرسانی شد', 'success');
      emit(Events.PRODUCT_UPDATED, { id: editingId });
    } else {
      const created = await ProductRepository.create(data);
      showToast('محصول اضافه شد', 'success');
      emit(Events.PRODUCT_CREATED, created);
    }
    closeProductModal();
    await loadProducts();
  } catch (err) {
    showToast(err.message || 'خطا در ذخیره محصول', 'error');
  }
}

async function confirmDeleteProduct(id) {
  const product = currentProducts.find(p => p.id === id);
  if (!product) return;
  if (!confirm('آیا از حذف «' + product.name + '» مطمئن هستید؟\\nاین عملیات قابل بازگشت نیست.')) return;
  try {
    await ProductRepository.delete(id);
    showToast('محصول حذف شد', 'success');
    emit(Events.PRODUCT_DELETED, { id });
    await loadProducts();
  } catch (err) {
    showToast('خطا در حذف محصول', 'error');
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
