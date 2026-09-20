/**
 * Invoices Module – Full Create / Edit / List / Delete
 */

import { InvoiceRepository, CustomerRepository, ProductRepository, DocumentSettingsRepository } from '../../storage/indexeddb/repositories.js';
import { calculateLineTotal, calculateDocumentTotals } from '../../services/pricing/pricing-service.js';
import { formatCurrency, formatDate, debounce } from '../../core/utilities/id.js';
import { mountJalaliDatePicker } from '../../core/utilities/jalali.js';
import { emit, Events } from '../../core/events/event-bus.js';
import { showToast } from '../../core/app/bootstrap.js';
import { navigate } from '../../core/router/router.js';
import { renderDocumentHTML, openPreviewWindow, printDocument } from '../../services/pdf/document-renderer.js';
import { shareText } from '../../services/sharing/share-service.js';
import { openForImageCapture } from '../../services/image/image-export.js';
import { BusinessProfileRepository, AttachmentRepository } from '../../storage/indexeddb/repositories.js';

let currentInvoices = [];
let searchQuery = '';
let formState = {
  id: null,
  customerId: null,
  customerName: '',
  items: [],
  discount: 0,
  taxRate: 0,
  notes: '',
  date: new Date().toISOString().slice(0, 10)
};

export async function renderInvoices(options = {}) {
  if (options.mode === 'create' || options.mode === 'edit') {
    await renderInvoiceForm(options);
    return;
  }
  await renderInvoiceList();
}

async function renderInvoiceList() {
  const main = document.getElementById('page-content');
  if (!main) return;

  main.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">فاکتورها</h1>
      <div class="page-actions">
        <a href="#/invoices/new" class="btn btn-primary">+ فاکتور جدید</a>
      </div>
    </div>
    <div class="page-body">
      <div class="card" style="margin-bottom:var(--space-4);padding:var(--space-3) var(--space-4);">
        <input type="search" id="invoice-search" class="form-input" placeholder="جستجو بر اساس شماره یا مشتری..." style="border:none;background:transparent;padding:var(--space-2) 0;" />
      </div>
      <div id="invoices-container">
        <div class="card"><div class="card-body" style="text-align:center;padding:var(--space-8);">
          <div class="skeleton" style="height:24px;width:40%;margin:0 auto 12px;"></div>
        </div></div>
      </div>
    </div>
  `;

  document.getElementById('invoice-search')?.addEventListener('input', debounce((e) => {
    searchQuery = e.target.value;
    renderInvoiceListItems();
  }, 250));

  try {
    currentInvoices = await InvoiceRepository.getAll();
    renderInvoiceListItems();
  } catch (err) {
    showToast('خطا در بارگذاری فاکتورها', 'error');
  }
  updateActiveNav('invoices');
}

function renderInvoiceListItems() {
  const container = document.getElementById('invoices-container');
  if (!container) return;

  let list = currentInvoices;
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = currentInvoices.filter(inv =>
      (inv.number && inv.number.toLowerCase().includes(q)) ||
      (inv.customerName && inv.customerName.toLowerCase().includes(q))
    );
  }

  if (list.length === 0) {
    container.innerHTML = `
      <div class="card"><div class="card-body">
        <div class="empty-state">
          <div class="empty-state-icon">🧾</div>
          <h3 class="empty-state-title">${searchQuery ? 'نتیجه‌ای یافت نشد' : 'هنوز فاکتوری ثبت نشده'}</h3>
          <p class="empty-state-desc">${searchQuery ? 'عبارت دیگری را امتحان کنید.' : 'اولین فاکتور خود را ایجاد کنید.'}</p>
          ${!searchQuery ? '<a href="#/invoices/new" class="btn btn-primary">ایجاد فاکتور</a>' : ''}
        </div>
      </div></div>
    `;
    return;
  }

  container.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:var(--space-2);">
      ${list.map(inv => `
        <div class="card" style="padding:var(--space-4);">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:var(--space-3);">
            <a href="#/invoices/${inv.id}" style="flex:1;text-decoration:none;color:inherit;min-width:0;">
              <div style="font-weight:600;">${escapeHtml(inv.number) || '—'}</div>
              <div style="font-size:var(--font-size-xs);color:var(--color-muted);">${escapeHtml(inv.customerName) || 'بدون مشتری'} • ${formatDate(inv.date)}</div>
            </a>
            <div style="text-align:left;flex-shrink:0;">
              <div style="font-weight:600;">${formatCurrency(inv.grandTotal || 0)}</div>
              <span class="badge badge-${inv.status === 'draft' ? 'warning' : 'primary'}">${statusLabel(inv.status)}</span>
            </div>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:var(--space-2);margin-top:var(--space-3);">
            <button class="btn btn-secondary btn-sm btn-preview-inv" data-id="${inv.id}">پیش‌نمایش</button>
            <button class="btn btn-secondary btn-sm btn-print-inv" data-id="${inv.id}">چاپ</button>
            <button class="btn btn-secondary btn-sm btn-share-inv" data-id="${inv.id}">اشتراک</button>
            <button class="btn btn-ghost btn-sm btn-del-inv" data-id="${inv.id}">حذف</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  container.querySelectorAll('.btn-del-inv').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      if (!confirm('آیا از حذف این فاکتور مطمئن هستید؟')) return;
      try {
        await InvoiceRepository.delete(btn.dataset.id);
        showToast('فاکتور حذف شد', 'success');
        currentInvoices = await InvoiceRepository.getAll();
        renderInvoiceListItems();
      } catch (err) {
        showToast('خطا در حذف', 'error');
      }
    });
  });


  container.querySelectorAll('.btn-preview-inv').forEach(btn => {
    btn.addEventListener('click', () => handleDocAction(btn.dataset.id, 'preview'));
  });
  container.querySelectorAll('.btn-print-inv').forEach(btn => {
    btn.addEventListener('click', () => handleDocAction(btn.dataset.id, 'print'));
  });
  container.querySelectorAll('.btn-share-inv').forEach(btn => {
    btn.addEventListener('click', () => handleDocAction(btn.dataset.id, 'share'));
  });
}

async function renderInvoiceForm(options) {
  const main = document.getElementById('page-content');
  if (!main) return;

  // Reset or load
  if (options.mode === 'edit' && options.id) {
    const inv = await InvoiceRepository.getById(options.id);
    if (!inv) {
      showToast('فاکتور یافت نشد', 'error');
      navigate('/invoices');
      return;
    }
    const items = await InvoiceRepository.getItems(options.id);
    formState = {
      id: inv.id,
      customerId: inv.customerId,
      customerName: inv.customerName,
      items: items.map(it => ({
        productId: it.productId,
        productName: it.productName,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        fixedTotal: it.fixedTotal,
        pricingType: it.pricingType || 'unit',
        lineTotal: it.lineTotal,
        unit: it.unit
      })),
      discount: inv.discount || 0,
      taxRate: 0, // derived later if needed
      notes: inv.notes || '',
      date: inv.date || new Date().toISOString().slice(0, 10)
    };
  } else {
    formState = {
      id: null,
      customerId: null,
      customerName: '',
      items: [],
      discount: 0,
      taxRate: 0,
      notes: '',
      date: new Date().toISOString().slice(0, 10)
    };
  }

  main.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">${formState.id ? 'ویرایش فاکتور' : 'فاکتور جدید'}</h1>
      <div class="page-actions">
        <a href="#/invoices" class="btn btn-ghost">بازگشت</a>
      </div>
    </div>
    <div class="page-body">
      <div class="card" style="margin-bottom:var(--space-4);">
        <div class="card-body">
          <!-- Customer -->
          <div class="form-group">
            <label class="form-label">مشتری</label>
            <div style="display:flex;gap:var(--space-2);">
              <button type="button" class="btn btn-secondary" id="btn-select-customer" style="flex:1;justify-content:space-between;">
                <span id="selected-customer-label">${formState.customerName || 'انتخاب مشتری'}</span>
                <span>▼</span>
              </button>
              ${formState.customerId ? '<button type="button" class="btn btn-ghost btn-icon" id="btn-clear-customer" title="حذف">✕</button>' : ''}
            </div>
          </div>

          <!-- Date -->
          <div class="form-group">
            <label class="form-label">تاریخ (شمسی)</label>
            <div id="inv-date-jalali"></div>
          </div>

          <!-- Items -->
          <div class="form-group">
            <label class="form-label">اقلام</label>
            <div id="invoice-items-list" style="display:flex;flex-direction:column;gap:var(--space-2);margin-bottom:var(--space-3);"></div>
            <button type="button" class="btn btn-secondary btn-block" id="btn-add-item">+ افزودن محصول</button>
          </div>

          <!-- Totals -->
          <div style="margin-top:var(--space-6);padding-top:var(--space-4);border-top:1px solid var(--color-border);">
            <div style="display:flex;justify-content:space-between;margin-bottom:var(--space-2);">
              <span>جمع جزء</span>
              <span id="tot-subtotal">۰ تومان</span>
            </div>
            <div class="form-group" style="margin-bottom:var(--space-2);">
              <label class="form-label" for="inv-discount">تخفیف (تومان)</label>
              <input type="number" id="inv-discount" class="form-input ltr" min="0" value="${formState.discount}" dir="ltr" />
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:var(--space-2);">
              <span>مالیات</span>
              <span id="tot-tax">۰ تومان</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-weight:700;font-size:var(--font-size-lg);margin-top:var(--space-3);">
              <span>مبلغ نهایی</span>
              <span id="tot-grand">۰ تومان</span>
            </div>
          </div>

          <div class="form-group" style="margin-top:var(--space-4);">
            <label class="form-label" for="inv-notes">یادداشت</label>
            <textarea id="inv-notes" class="form-textarea" rows="2">${escapeHtml(formState.notes)}</textarea>
          </div>

          <div style="display:flex;gap:var(--space-3);margin-top:var(--space-6);">
            <button type="button" class="btn btn-primary" id="btn-save-invoice" style="flex:1;">ذخیره فاکتور</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Customer Picker Modal -->
    <div class="modal-overlay" id="customer-picker">
      <div class="modal">
        <div class="modal-header">
          <h2 class="card-title">انتخاب مشتری</h2>
          <button class="btn btn-ghost btn-icon" id="btn-close-cust-picker">✕</button>
        </div>
        <div class="modal-body">
          <input type="search" id="cust-picker-search" class="form-input" placeholder="جستجو..." style="margin-bottom:var(--space-3);" />
          <div id="cust-picker-list" style="max-height:300px;overflow-y:auto;"></div>
        </div>
      </div>
    </div>

    <!-- Product Picker Modal -->
    <div class="modal-overlay" id="product-picker">
      <div class="modal">
        <div class="modal-header">
          <h2 class="card-title">انتخاب محصول</h2>
          <button class="btn btn-ghost btn-icon" id="btn-close-prod-picker">✕</button>
        </div>
        <div class="modal-body">
          <input type="search" id="prod-picker-search" class="form-input" placeholder="جستجو..." style="margin-bottom:var(--space-3);" />
          <div id="prod-picker-list" style="max-height:300px;overflow-y:auto;"></div>
        </div>
      </div>
    </div>
  `;

  bindFormEvents();
  renderItemsList();
  recalculateTotals();
  mountJalaliDatePicker('inv-date-jalali', formState.date, (iso) => { formState.date = iso; });
  updateActiveNav('invoices');
}

function bindFormEvents() {
  document.getElementById('btn-select-customer')?.addEventListener('click', openCustomerPicker);
  document.getElementById('btn-clear-customer')?.addEventListener('click', () => {
    formState.customerId = null;
    formState.customerName = '';
    document.getElementById('selected-customer-label').textContent = 'انتخاب مشتری';
  });
  document.getElementById('btn-add-item')?.addEventListener('click', openProductPicker);
  document.getElementById('btn-save-invoice')?.addEventListener('click', saveInvoice);
  document.getElementById('inv-discount')?.addEventListener('input', () => {
    formState.discount = Number(document.getElementById('inv-discount').value) || 0;
    recalculateTotals();
  });
  // Jalali date mounted below
  document.getElementById('inv-notes')?.addEventListener('input', (e) => {
    formState.notes = e.target.value;
  });

  document.getElementById('btn-close-cust-picker')?.addEventListener('click', () => {
    document.getElementById('customer-picker')?.classList.remove('open');
  });
  document.getElementById('btn-close-prod-picker')?.addEventListener('click', () => {
    document.getElementById('product-picker')?.classList.remove('open');
  });
}

async function openCustomerPicker() {
  const modal = document.getElementById('customer-picker');
  const listEl = document.getElementById('cust-picker-list');
  modal.classList.add('open');

  const customers = await CustomerRepository.getAll();
  listEl.innerHTML = customers.length === 0
    ? '<p style="color:var(--color-muted);text-align:center;">مشتری‌ای وجود ندارد. ابتدا از بخش مشتریان اضافه کنید.</p>'
    : customers.map(c => `
        <button class="btn btn-ghost" style="width:100%;justify-content:flex-start;margin-bottom:4px;" data-id="${c.id}" data-name="${escapeHtml(c.name)}">
          <div style="text-align:right;">
            <div style="font-weight:600;">${escapeHtml(c.name)}</div>
            <div style="font-size:var(--font-size-xs);color:var(--color-muted);">${escapeHtml(c.company || c.phone || '')}</div>
          </div>
        </button>
      `).join('');

  listEl.querySelectorAll('button[data-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      formState.customerId = btn.dataset.id;
      formState.customerName = btn.dataset.name;
      document.getElementById('selected-customer-label').textContent = formState.customerName;
      modal.classList.remove('open');
    });
  });

  document.getElementById('cust-picker-search')?.addEventListener('input', debounce(async (e) => {
    const q = e.target.value;
    const filtered = await CustomerRepository.search(q);
    listEl.innerHTML = filtered.map(c => `
      <button class="btn btn-ghost" style="width:100%;justify-content:flex-start;margin-bottom:4px;" data-id="${c.id}" data-name="${escapeHtml(c.name)}">
        <div style="text-align:right;">
          <div style="font-weight:600;">${escapeHtml(c.name)}</div>
          <div style="font-size:var(--font-size-xs);color:var(--color-muted);">${escapeHtml(c.company || c.phone || '')}</div>
        </div>
      </button>
    `).join('');
    listEl.querySelectorAll('button[data-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        formState.customerId = btn.dataset.id;
        formState.customerName = btn.dataset.name;
        document.getElementById('selected-customer-label').textContent = formState.customerName;
        modal.classList.remove('open');
      });
    });
  }, 200));
}

async function openProductPicker() {
  const modal = document.getElementById('product-picker');
  const listEl = document.getElementById('prod-picker-list');
  modal.classList.add('open');

  const products = await ProductRepository.getAll();
  const active = products.filter(p => p.status !== 'inactive');

  listEl.innerHTML = active.length === 0
    ? '<p style="color:var(--color-muted);text-align:center;">محصولی وجود ندارد. ابتدا از بخش محصولات اضافه کنید.</p>'
    : active.map(p => `
        <button class="btn btn-ghost" style="width:100%;justify-content:space-between;margin-bottom:4px;" 
          data-id="${p.id}" data-name="${escapeHtml(p.name)}" data-price="${p.defaultPrice}" data-unit="${escapeHtml(p.unit || 'عدد')}">
          <div style="text-align:right;">
            <div style="font-weight:600;">${escapeHtml(p.name)}</div>
            <div style="font-size:var(--font-size-xs);color:var(--color-muted);">${escapeHtml(p.sku || '')}</div>
          </div>
          <span style="font-weight:600;color:var(--color-primary);">${formatCurrency(p.defaultPrice)}</span>
        </button>
      `).join('');

  listEl.querySelectorAll('button[data-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      addItemToForm({
        productId: btn.dataset.id,
        productName: btn.dataset.name,
        unitPrice: Number(btn.dataset.price) || 0,
        quantity: 1,
        pricingType: 'unit',
        unit: btn.dataset.unit || 'عدد'
      });
      modal.classList.remove('open');
    });
  });
}

function addItemToForm(item) {
  item.lineTotal = calculateLineTotal(item);
  formState.items.push(item);
  renderItemsList();
  recalculateTotals();
}

function renderItemsList() {
  const list = document.getElementById('invoice-items-list');
  if (!list) return;

  if (formState.items.length === 0) {
    list.innerHTML = '<p style="color:var(--color-muted);font-size:var(--font-size-sm);text-align:center;">هنوز قلمی اضافه نشده</p>';
    return;
  }

  list.innerHTML = formState.items.map((item, idx) => `
    <div class="card" style="padding:var(--space-3);">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:var(--space-2);margin-bottom:8px;">
        <div style="font-weight:600;font-size:var(--font-size-sm);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(item.productName)}</div>
        <button class="btn btn-ghost btn-sm btn-remove-item" data-idx="${idx}" style="flex-shrink:0;">✕</button>
      </div>
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:nowrap;">
        <input type="number" class="form-input item-qty" data-idx="${idx}" value="${item.quantity}" min="1" style="width:64px;min-width:64px;padding:8px 6px;flex-shrink:0;" dir="ltr" inputmode="numeric" />
        <span style="font-size:var(--font-size-xs);color:var(--color-muted);flex-shrink:0;">×</span>
        <span style="font-size:var(--font-size-sm);color:var(--color-muted);white-space:nowrap;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;">${formatCurrency(item.unitPrice)}</span>
        <span style="font-weight:700;white-space:nowrap;flex-shrink:0;font-size:var(--font-size-sm);">${formatCurrency(item.lineTotal)}</span>
      </div>
    </div>
  `).join('');

  list.querySelectorAll('.item-qty').forEach(input => {
    input.addEventListener('change', (e) => {
      const idx = Number(e.target.dataset.idx);
      formState.items[idx].quantity = Number(e.target.value) || 1;
      formState.items[idx].lineTotal = calculateLineTotal(formState.items[idx]);
      renderItemsList();
      recalculateTotals();
    });
  });
  list.querySelectorAll('.btn-remove-item').forEach(btn => {
    btn.addEventListener('click', () => {
      formState.items.splice(Number(btn.dataset.idx), 1);
      renderItemsList();
      recalculateTotals();
    });
  });
}

function recalculateTotals() {
  const totals = calculateDocumentTotals(formState.items, {
    discountAmount: formState.discount,
    taxRate: formState.taxRate
  });
  document.getElementById('tot-subtotal').textContent = formatCurrency(totals.subtotal);
  document.getElementById('tot-tax').textContent = formatCurrency(totals.tax);
  document.getElementById('tot-grand').textContent = formatCurrency(totals.grandTotal);
  return totals;
}

async function saveInvoice() {
  if (!formState.customerId) {
    showToast('لطفاً مشتری را انتخاب کنید', 'error');
    return;
  }
  if (formState.items.length === 0) {
    showToast('حداقل یک محصول اضافه کنید', 'error');
    return;
  }

  const totals = recalculateTotals();
  const data = {
    customerId: formState.customerId,
    customerName: formState.customerName,
    date: formState.date,
    items: formState.items,
    subtotal: totals.subtotal,
    discount: totals.discount,
    tax: totals.tax,
    grandTotal: totals.grandTotal,
    notes: formState.notes,
    status: 'draft'
  };

  try {
    if (formState.id) {
      await InvoiceRepository.update(formState.id, data);
      showToast('فاکتور به‌روزرسانی شد', 'success');
    } else {
      data.number = await DocumentSettingsRepository.getNextInvoiceNumber();
      await InvoiceRepository.create(data);
      showToast('فاکتور ذخیره شد', 'success');
    }
    emit(Events.INVOICE_CREATED);
    navigate('/invoices');
  } catch (err) {
    console.error(err);
    showToast(err.message || 'خطا در ذخیره فاکتور', 'error');
  }
}


async function handleDocAction(id, action) {
  try {
    const inv = await InvoiceRepository.getById(id);
    if (!inv) { showToast('فاکتور یافت نشد', 'error'); return; }
    const items = await InvoiceRepository.getItems(id);
    const business = await BusinessProfileRepository.get() || {};
    // Load media
    try {
      if (business.logoId) {
        const att = await AttachmentRepository.getById(business.logoId);
        if (att) business.logoDataUrl = att.dataUrl;
      }
      if (business.stampId) {
        const att = await AttachmentRepository.getById(business.stampId);
        if (att) business.stampDataUrl = att.dataUrl;
      }
      if (business.signatureId) {
        const att = await AttachmentRepository.getById(business.signatureId);
        if (att) business.signatureDataUrl = att.dataUrl;
      }
    } catch (e) { /* ignore media errors */ }
    const html = renderDocumentHTML(inv, items, business, 'invoice');

    if (action === 'preview') {
      openPreviewWindow(html);
    } else if (action === 'print') {
      printDocument(html);
    } else if (action === 'share') {
      const text = `فاکتور ${inv.number}\nمشتری: ${inv.customerName || '—'}\nمبلغ: ${formatCurrency(inv.grandTotal || 0)}\nتاریخ: ${formatDate(inv.date)}`;
      const result = await shareText({ title: `فاکتور ${inv.number}`, text });
      if (result === 'copied') showToast('متن فاکتور کپی شد', 'success');
      else if (result) showToast('اشتراک‌گذاری انجام شد', 'success');
      else showToast('اشتراک‌گذاری در این مرورگر پشتیبانی نمی‌شود', 'error');
    } else if (action === 'image') {
      openForImageCapture(html);
    }
  } catch (err) {
    console.error(err);
    showToast('خطا در انجام عملیات', 'error');
  }
}

function statusLabel(s) {
  const map = { draft: 'پیش‌نویس', issued: 'صادر شده', paid: 'پرداخت شده', cancelled: 'لغو شده', converted: 'تبدیل شده' };
  return map[s] || s || 'پیش‌نویس';
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
