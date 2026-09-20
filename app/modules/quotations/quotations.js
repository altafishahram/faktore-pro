/**
 * Quotations (Proforma) Module – Full CRUD + Convert to Invoice
 */

import { QuotationRepository, CustomerRepository, ProductRepository, DocumentSettingsRepository } from '../../storage/indexeddb/repositories.js';
import { calculateLineTotal, calculateDocumentTotals } from '../../services/pricing/pricing-service.js';
import { formatCurrency, formatDate, debounce } from '../../core/utilities/id.js';
import { emit, Events } from '../../core/events/event-bus.js';
import { showToast } from '../../core/app/bootstrap.js';
import { navigate } from '../../core/router/router.js';
import { renderDocumentHTML, openPreviewWindow, printDocument } from '../../services/pdf/document-renderer.js';
import { shareText } from '../../services/sharing/share-service.js';
import { openForImageCapture } from '../../services/image/image-export.js';
import { BusinessProfileRepository, AttachmentRepository } from '../../storage/indexeddb/repositories.js';

let currentQuotations = [];
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

export async function renderQuotations(options = {}) {
  if (options.mode === 'create' || options.mode === 'edit') {
    await renderQuotationForm(options);
    return;
  }
  await renderQuotationList();
}

async function renderQuotationList() {
  const main = document.getElementById('page-content');
  if (!main) return;

  main.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">پیش‌فاکتورها</h1>
      <div class="page-actions">
        <a href="#/quotations/new" class="btn btn-primary">+ پیش‌فاکتور جدید</a>
      </div>
    </div>
    <div class="page-body">
      <div class="card" style="margin-bottom:var(--space-4);padding:var(--space-3) var(--space-4);">
        <input type="search" id="quotation-search" class="form-input" placeholder="جستجو بر اساس شماره یا مشتری..." style="border:none;background:transparent;padding:var(--space-2) 0;" />
      </div>
      <div id="quotations-container">
        <div class="card"><div class="card-body" style="text-align:center;padding:var(--space-8);">
          <div class="skeleton" style="height:24px;width:40%;margin:0 auto 12px;"></div>
        </div></div>
      </div>
    </div>
  `;

  document.getElementById('quotation-search')?.addEventListener('input', debounce((e) => {
    searchQuery = e.target.value;
    renderQuotationListItems();
  }, 250));

  try {
    currentQuotations = await QuotationRepository.getAll();
    renderQuotationListItems();
  } catch (err) {
    showToast('خطا در بارگذاری پیش‌فاکتورها', 'error');
  }
  updateActiveNav('quotations');
}

function renderQuotationListItems() {
  const container = document.getElementById('quotations-container');
  if (!container) return;

  let list = currentQuotations;
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = currentQuotations.filter(qot =>
      (qot.number && qot.number.toLowerCase().includes(q)) ||
      (qot.customerName && qot.customerName.toLowerCase().includes(q))
    );
  }

  if (list.length === 0) {
    container.innerHTML = `
      <div class="card"><div class="card-body">
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <h3 class="empty-state-title">${searchQuery ? 'نتیجه‌ای یافت نشد' : 'هنوز پیش‌فاکتوری ثبت نشده'}</h3>
          <p class="empty-state-desc">${searchQuery ? 'عبارت دیگری را امتحان کنید.' : 'اولین پیش‌فاکتور خود را ایجاد کنید.'}</p>
          ${!searchQuery ? '<a href="#/quotations/new" class="btn btn-primary">ایجاد پیش‌فاکتور</a>' : ''}
        </div>
      </div></div>
    `;
    return;
  }

  container.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:var(--space-2);">
      ${list.map(qot => `
        <div class="card" style="padding:var(--space-4);">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:var(--space-3);">
            <a href="#/quotations/${qot.id}" style="flex:1;text-decoration:none;color:inherit;min-width:0;">
              <div style="font-weight:600;">${escapeHtml(qot.number) || '—'}</div>
              <div style="font-size:var(--font-size-xs);color:var(--color-muted);">${escapeHtml(qot.customerName) || 'بدون مشتری'} • ${formatDate(qot.date)}</div>
            </a>
            <div style="text-align:left;flex-shrink:0;">
              <div style="font-weight:600;">${formatCurrency(qot.grandTotal || 0)}</div>
              <span class="badge badge-${qot.status === 'converted' ? 'success' : 'warning'}">${statusLabel(qot.status)}</span>
            </div>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:var(--space-2);margin-top:var(--space-3);">
            <button class="btn btn-secondary btn-sm btn-preview-qot" data-id="${qot.id}">پیش‌نمایش</button>
            <button class="btn btn-secondary btn-sm btn-print-qot" data-id="${qot.id}">چاپ</button>
            <button class="btn btn-secondary btn-sm btn-share-qot" data-id="${qot.id}">اشتراک</button>
            ${qot.status !== 'converted' ? `<button class="btn btn-primary btn-sm btn-convert" data-id="${qot.id}">تبدیل به فاکتور</button>` : ''}
            <button class="btn btn-ghost btn-sm btn-del-qot" data-id="${qot.id}">حذف</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  container.querySelectorAll('.btn-convert').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('این پیش‌فاکتور به فاکتور تبدیل شود؟\nپیش‌فاکتور اصلی حفظ می‌شود.')) return;
      try {
        const invoice = await QuotationRepository.convertToInvoice(btn.dataset.id);
        showToast('پیش‌فاکتور به فاکتور تبدیل شد: ' + invoice.number, 'success');
        emit(Events.QUOTATION_CONVERTED, invoice);
        currentQuotations = await QuotationRepository.getAll();
        renderQuotationListItems();
      } catch (err) {
        showToast(err.message || 'خطا در تبدیل', 'error');
      }
    });
  });

  container.querySelectorAll('.btn-del-qot').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('آیا از حذف این پیش‌فاکتور مطمئن هستید؟')) return;
      try {
        await QuotationRepository.delete(btn.dataset.id);
        showToast('پیش‌فاکتور حذف شد', 'success');
        currentQuotations = await QuotationRepository.getAll();
        renderQuotationListItems();
      } catch (err) {
        showToast('خطا در حذف', 'error');
      }
    });
  });
}

async function renderQuotationForm(options) {
  const main = document.getElementById('page-content');
  if (!main) return;

  if (options.mode === 'edit' && options.id) {
    const qot = await QuotationRepository.getById(options.id);
    if (!qot) {
      showToast('پیش‌فاکتور یافت نشد', 'error');
      navigate('/quotations');
      return;
    }
    const items = await QuotationRepository.getItems(options.id);
    formState = {
      id: qot.id,
      customerId: qot.customerId,
      customerName: qot.customerName,
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
      discount: qot.discount || 0,
      taxRate: 0,
      notes: qot.notes || '',
      date: qot.date || new Date().toISOString().slice(0, 10)
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
      <h1 class="page-title">${formState.id ? 'ویرایش پیش‌فاکتور' : 'پیش‌فاکتور جدید'}</h1>
      <div class="page-actions">
        <a href="#/quotations" class="btn btn-ghost">بازگشت</a>
      </div>
    </div>
    <div class="page-body">
      <div class="card" style="margin-bottom:var(--space-4);">
        <div class="card-body">
          <div class="form-group">
            <label class="form-label">مشتری</label>
            <button type="button" class="btn btn-secondary btn-block" id="btn-select-customer" style="justify-content:space-between;">
              <span id="selected-customer-label">${formState.customerName || 'انتخاب مشتری'}</span>
              <span>▼</span>
            </button>
          </div>
          <div class="form-group">
            <label class="form-label" for="qot-date">تاریخ</label>
            <input type="date" id="qot-date" class="form-input ltr" value="${formState.date}" dir="ltr" />
          </div>
          <div class="form-group">
            <label class="form-label">اقلام</label>
            <div id="quotation-items-list" style="display:flex;flex-direction:column;gap:var(--space-2);margin-bottom:var(--space-3);"></div>
            <button type="button" class="btn btn-secondary btn-block" id="btn-add-item">+ افزودن محصول</button>
          </div>
          <div style="margin-top:var(--space-6);padding-top:var(--space-4);border-top:1px solid var(--color-border);">
            <div style="display:flex;justify-content:space-between;margin-bottom:var(--space-2);">
              <span>جمع جزء</span>
              <span id="tot-subtotal">۰ تومان</span>
            </div>
            <div class="form-group" style="margin-bottom:var(--space-2);">
              <label class="form-label" for="qot-discount">تخفیف (تومان)</label>
              <input type="number" id="qot-discount" class="form-input ltr" min="0" value="${formState.discount}" dir="ltr" />
            </div>
            <div style="display:flex;justify-content:space-between;font-weight:700;font-size:var(--font-size-lg);margin-top:var(--space-3);">
              <span>مبلغ نهایی</span>
              <span id="tot-grand">۰ تومان</span>
            </div>
          </div>
          <div class="form-group" style="margin-top:var(--space-4);">
            <label class="form-label" for="qot-notes">یادداشت</label>
            <textarea id="qot-notes" class="form-textarea" rows="2">${escapeHtml(formState.notes)}</textarea>
          </div>
          <div style="display:flex;gap:var(--space-3);margin-top:var(--space-6);">
            <button type="button" class="btn btn-primary" id="btn-save-quotation" style="flex:1;">ذخیره پیش‌فاکتور</button>
          </div>
        </div>
      </div>
    </div>

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
  updateActiveNav('quotations');
}

function bindFormEvents() {
  document.getElementById('btn-select-customer')?.addEventListener('click', openCustomerPicker);
  document.getElementById('btn-add-item')?.addEventListener('click', openProductPicker);
  document.getElementById('btn-save-quotation')?.addEventListener('click', saveQuotation);
  document.getElementById('qot-discount')?.addEventListener('input', () => {
    formState.discount = Number(document.getElementById('qot-discount').value) || 0;
    recalculateTotals();
  });
  document.getElementById('qot-date')?.addEventListener('change', (e) => { formState.date = e.target.value; });
  document.getElementById('qot-notes')?.addEventListener('input', (e) => { formState.notes = e.target.value; });
  document.getElementById('btn-close-cust-picker')?.addEventListener('click', () => document.getElementById('customer-picker')?.classList.remove('open'));
  document.getElementById('btn-close-prod-picker')?.addEventListener('click', () => document.getElementById('product-picker')?.classList.remove('open'));
}

async function openCustomerPicker() {
  const modal = document.getElementById('customer-picker');
  const listEl = document.getElementById('cust-picker-list');
  modal.classList.add('open');
  const customers = await CustomerRepository.getAll();
  listEl.innerHTML = customers.length === 0
    ? '<p style="color:var(--color-muted);text-align:center;">مشتری‌ای وجود ندارد.</p>'
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
}

async function openProductPicker() {
  const modal = document.getElementById('product-picker');
  const listEl = document.getElementById('prod-picker-list');
  modal.classList.add('open');
  const products = await ProductRepository.getAll();
  const active = products.filter(p => p.status !== 'inactive');
  listEl.innerHTML = active.length === 0
    ? '<p style="color:var(--color-muted);text-align:center;">محصولی وجود ندارد.</p>'
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
      const item = {
        productId: btn.dataset.id,
        productName: btn.dataset.name,
        unitPrice: Number(btn.dataset.price) || 0,
        quantity: 1,
        pricingType: 'unit',
        unit: btn.dataset.unit || 'عدد'
      };
      item.lineTotal = calculateLineTotal(item);
      formState.items.push(item);
      renderItemsList();
      recalculateTotals();
      modal.classList.remove('open');
    });
  });
}

function renderItemsList() {
  const list = document.getElementById('quotation-items-list');
  if (!list) return;
  if (formState.items.length === 0) {
    list.innerHTML = '<p style="color:var(--color-muted);font-size:var(--font-size-sm);text-align:center;">هنوز قلمی اضافه نشده</p>';
    return;
  }
  list.innerHTML = formState.items.map((item, idx) => `
    <div class="card" style="padding:var(--space-3);display:flex;align-items:center;gap:var(--space-2);">
      <div style="flex:1;min-width:0;">
        <div style="font-weight:600;font-size:var(--font-size-sm);">${escapeHtml(item.productName)}</div>
        <div style="display:flex;gap:var(--space-2);align-items:center;margin-top:4px;">
          <input type="number" class="form-input item-qty" data-idx="${idx}" value="${item.quantity}" min="1" style="width:70px;padding:4px 8px;" dir="ltr" />
          <span style="font-size:var(--font-size-xs);color:var(--color-muted);">× ${formatCurrency(item.unitPrice)}</span>
        </div>
      </div>
      <div style="font-weight:600;white-space:nowrap;">${formatCurrency(item.lineTotal)}</div>
      <button class="btn btn-ghost btn-sm btn-remove-item" data-idx="${idx}">✕</button>
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
  const totals = calculateDocumentTotals(formState.items, { discountAmount: formState.discount, taxRate: formState.taxRate });
  document.getElementById('tot-subtotal').textContent = formatCurrency(totals.subtotal);
  document.getElementById('tot-grand').textContent = formatCurrency(totals.grandTotal);
  return totals;
}

async function saveQuotation() {
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
      await QuotationRepository.update(formState.id, data);
      showToast('پیش‌فاکتور به‌روزرسانی شد', 'success');
    } else {
      data.number = await DocumentSettingsRepository.getNextQuotationNumber();
      await QuotationRepository.create(data);
      showToast('پیش‌فاکتور ذخیره شد', 'success');
    }
    emit(Events.QUOTATION_CREATED);
    navigate('/quotations');
  } catch (err) {
    showToast(err.message || 'خطا در ذخیره', 'error');
  }
}


async function handleQotAction(id, action) {
  try {
    const qot = await QuotationRepository.getById(id);
    if (!qot) { showToast('پیش‌فاکتور یافت نشد', 'error'); return; }
    const items = await QuotationRepository.getItems(id);
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
    const html = renderDocumentHTML(qot, items, business, 'quotation');

    if (action === 'preview') {
      openPreviewWindow(html);
    } else if (action === 'print') {
      printDocument(html);
    } else if (action === 'share') {
      const text = `پیش‌فاکتور ${qot.number}\nمشتری: ${qot.customerName || '—'}\nمبلغ: ${formatCurrency(qot.grandTotal || 0)}\nتاریخ: ${formatDate(qot.date)}`;
      const result = await shareText({ title: `پیش‌فاکتور ${qot.number}`, text });
      if (result === 'copied') showToast('متن پیش‌فاکتور کپی شد', 'success');
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
  const map = { draft: 'پیش‌نویس', converted: 'تبدیل شده', accepted: 'تأیید شده' };
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
