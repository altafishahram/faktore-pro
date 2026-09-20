/**
 * Repositories Layer
 * UI / Services → Repositories → IndexedDB
 * Never access IndexedDB directly from UI components.
 */

import {
  getAll,
  getById,
  put,
  remove,
  getByIndex,
  generateId
} from './db.js';

// =====================================================
// Products Repository
// =====================================================

export const ProductRepository = {
  async getAll() {
    const items = await getAll('products');
    return items.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  },

  async getById(id) {
    return getById('products', id);
  },

  async search(query) {
    const all = await this.getAll();
    if (!query || !query.trim()) return all;
    const q = query.trim().toLowerCase();
    return all.filter(
      (p) =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q))
    );
  },

  async create(data) {
    const now = new Date().toISOString();
    const product = {
      id: generateId('prod'),
      name: data.name?.trim() || '',
      sku: data.sku?.trim() || '',
      unit: data.unit?.trim() || 'عدد',
      defaultPrice: Number(data.defaultPrice) || 0,
      description: data.description?.trim() || '',
      imageId: data.imageId || null,
      status: data.status || 'active',
      notes: data.notes?.trim() || '',
      createdAt: now,
      updatedAt: now
    };
    await put('products', product);
    return product;
  },

  async update(id, data) {
    const existing = await getById('products', id);
    if (!existing) throw new Error('محصول یافت نشد');

    const updated = {
      ...existing,
      name: data.name !== undefined ? data.name.trim() : existing.name,
      sku: data.sku !== undefined ? data.sku.trim() : existing.sku,
      unit: data.unit !== undefined ? data.unit.trim() : existing.unit,
      defaultPrice: data.defaultPrice !== undefined ? Number(data.defaultPrice) : existing.defaultPrice,
      description: data.description !== undefined ? data.description.trim() : existing.description,
      imageId: data.imageId !== undefined ? data.imageId : existing.imageId,
      status: data.status !== undefined ? data.status : existing.status,
      notes: data.notes !== undefined ? data.notes.trim() : existing.notes,
      updatedAt: new Date().toISOString()
    };
    await put('products', updated);
    return updated;
  },

  async delete(id) {
    await remove('products', id);
    return true;
  },

  async count() {
    const all = await getAll('products');
    return all.length;
  }
};

// =====================================================
// Customers Repository
// =====================================================

export const CustomerRepository = {
  async getAll() {
    const items = await getAll('customers');
    return items.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  },

  async getById(id) {
    return getById('customers', id);
  },

  async search(query) {
    const all = await this.getAll();
    if (!query || !query.trim()) return all;
    const q = query.trim().toLowerCase();
    return all.filter(
      (c) =>
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.company && c.company.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q))
    );
  },

  async create(data) {
    const now = new Date().toISOString();
    const customer = {
      id: generateId('cust'),
      name: data.name?.trim() || '',
      company: data.company?.trim() || '',
      phone: data.phone?.trim() || '',
      email: data.email?.trim() || '',
      address: data.address?.trim() || '',
      taxId: data.taxId?.trim() || '',
      economicId: data.economicId?.trim() || '',
      nationalId: data.nationalId?.trim() || '',
      notes: data.notes?.trim() || '',
      createdAt: now,
      updatedAt: now
    };
    await put('customers', customer);
    return customer;
  },

  async update(id, data) {
    const existing = await getById('customers', id);
    if (!existing) throw new Error('مشتری یافت نشد');

    const updated = {
      ...existing,
      name: data.name !== undefined ? data.name.trim() : existing.name,
      company: data.company !== undefined ? data.company.trim() : existing.company,
      phone: data.phone !== undefined ? data.phone.trim() : existing.phone,
      email: data.email !== undefined ? data.email.trim() : existing.email,
      address: data.address !== undefined ? data.address.trim() : existing.address,
      taxId: data.taxId !== undefined ? data.taxId.trim() : existing.taxId,
      economicId: data.economicId !== undefined ? data.economicId.trim() : existing.economicId,
      nationalId: data.nationalId !== undefined ? data.nationalId.trim() : existing.nationalId,
      notes: data.notes !== undefined ? data.notes.trim() : existing.notes,
      updatedAt: new Date().toISOString()
    };
    await put('customers', updated);
    return updated;
  },

  async delete(id) {
    await remove('customers', id);
    return true;
  },

  async count() {
    const all = await getAll('customers');
    return all.length;
  }
};

// =====================================================
// Document Settings Repository (for numbering etc.)
// =====================================================

export const DocumentSettingsRepository = {
  async get() {
    return getById('document_settings', 'main');
  },

  async update(data) {
    const existing = await this.get();
    const updated = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString()
    };
    await put('document_settings', updated);
    return updated;
  },

  async getNextInvoiceNumber() {
    const settings = await this.get();
    const num = settings.invoiceNextNumber || 1;
    const prefix = settings.invoicePrefix || 'INV';
    // Simple sequential for now (year can be added later)
    const number = `${prefix}-${String(num).padStart(4, '0')}`;
    // Increment for next time
    await this.update({ invoiceNextNumber: num + 1 });
    return number;
  },

  async getNextQuotationNumber() {
    const settings = await this.get();
    const num = settings.quotationNextNumber || 1;
    const prefix = settings.quotationPrefix || 'PF';
    const number = `${prefix}-${String(num).padStart(4, '0')}`;
    await this.update({ quotationNextNumber: num + 1 });
    return number;
  }
};

// =====================================================
// Business Profile Repository
// =====================================================

export const BusinessProfileRepository = {
  async get() {
    return getById('business_profile', 'main');
  },

  async update(data) {
    const existing = await this.get();
    const updated = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString()
    };
    await put('business_profile', updated);
    return updated;
  }
};

// =====================================================
// Invoices Repository
// =====================================================

export const InvoiceRepository = {
  async getAll() {
    const items = await getAll('invoices');
    return items.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  },

  async getById(id) {
    return getById('invoices', id);
  },

  async getItems(invoiceId) {
    return getByIndex('invoice_items', 'invoiceId', invoiceId);
  },

  async search(query) {
    const all = await this.getAll();
    if (!query || !query.trim()) return all;
    const q = query.trim().toLowerCase();
    return all.filter(
      (inv) =>
        (inv.number && inv.number.toLowerCase().includes(q)) ||
        (inv.customerName && inv.customerName.toLowerCase().includes(q)) ||
        (inv.notes && inv.notes.toLowerCase().includes(q))
    );
  },

  async create(data) {
    const now = new Date().toISOString();
    const invoice = {
      id: generateId('inv'),
      number: data.number || '',
      date: data.date || now.slice(0, 10),
      customerId: data.customerId || null,
      customerName: data.customerName || '',
      status: data.status || 'draft',
      items: data.items || [],
      subtotal: Number(data.subtotal) || 0,
      discount: Number(data.discount) || 0,
      tax: Number(data.tax) || 0,
      grandTotal: Number(data.grandTotal) || 0,
      notes: data.notes?.trim() || '',
      terms: data.terms?.trim() || '',
      quotationId: data.quotationId || null,
      createdAt: now,
      updatedAt: now
    };
    await put('invoices', invoice);

    // Save items separately
    if (data.items && data.items.length) {
      for (const item of data.items) {
        await put('invoice_items', {
          id: generateId('invitem'),
          invoiceId: invoice.id,
          productId: item.productId || null,
          productName: item.productName || '',
          quantity: Number(item.quantity) || 1,
          unitPrice: Number(item.unitPrice) || 0,
          fixedTotal: Number(item.fixedTotal) || 0,
          pricingType: item.pricingType || 'unit',
          lineTotal: Number(item.lineTotal) || 0,
          unit: item.unit || 'عدد'
        });
      }
    }
    return invoice;
  },

  async update(id, data) {
    const existing = await getById('invoices', id);
    if (!existing) throw new Error('فاکتور یافت نشد');

    const updated = {
      ...existing,
      number: data.number !== undefined ? data.number : existing.number,
      date: data.date !== undefined ? data.date : existing.date,
      customerId: data.customerId !== undefined ? data.customerId : existing.customerId,
      customerName: data.customerName !== undefined ? data.customerName : existing.customerName,
      status: data.status !== undefined ? data.status : existing.status,
      items: data.items !== undefined ? data.items : existing.items,
      subtotal: data.subtotal !== undefined ? Number(data.subtotal) : existing.subtotal,
      discount: data.discount !== undefined ? Number(data.discount) : existing.discount,
      tax: data.tax !== undefined ? Number(data.tax) : existing.tax,
      grandTotal: data.grandTotal !== undefined ? Number(data.grandTotal) : existing.grandTotal,
      notes: data.notes !== undefined ? data.notes.trim() : existing.notes,
      terms: data.terms !== undefined ? data.terms.trim() : existing.terms,
      updatedAt: new Date().toISOString()
    };
    await put('invoices', updated);

    // Replace items if provided
    if (data.items) {
      const oldItems = await getByIndex('invoice_items', 'invoiceId', id);
      for (const old of oldItems) {
        await remove('invoice_items', old.id);
      }
      for (const item of data.items) {
        await put('invoice_items', {
          id: generateId('invitem'),
          invoiceId: id,
          productId: item.productId || null,
          productName: item.productName || '',
          quantity: Number(item.quantity) || 1,
          unitPrice: Number(item.unitPrice) || 0,
          fixedTotal: Number(item.fixedTotal) || 0,
          pricingType: item.pricingType || 'unit',
          lineTotal: Number(item.lineTotal) || 0,
          unit: item.unit || 'عدد'
        });
      }
    }
    return updated;
  },

  async delete(id) {
    const items = await getByIndex('invoice_items', 'invoiceId', id);
    for (const item of items) {
      await remove('invoice_items', item.id);
    }
    await remove('invoices', id);
    return true;
  }
};

// =====================================================
// Quotations Repository
// =====================================================

export const QuotationRepository = {
  async getAll() {
    const items = await getAll('quotations');
    return items.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  },

  async getById(id) {
    return getById('quotations', id);
  },

  async getItems(quotationId) {
    return getByIndex('quotation_items', 'quotationId', quotationId);
  },

  async search(query) {
    const all = await this.getAll();
    if (!query || !query.trim()) return all;
    const q = query.trim().toLowerCase();
    return all.filter(
      (qot) =>
        (qot.number && qot.number.toLowerCase().includes(q)) ||
        (qot.customerName && qot.customerName.toLowerCase().includes(q)) ||
        (qot.notes && qot.notes.toLowerCase().includes(q))
    );
  },

  async create(data) {
    const now = new Date().toISOString();
    const quotation = {
      id: generateId('qot'),
      number: data.number || '',
      date: data.date || now.slice(0, 10),
      customerId: data.customerId || null,
      customerName: data.customerName || '',
      status: data.status || 'draft',
      items: data.items || [],
      subtotal: Number(data.subtotal) || 0,
      discount: Number(data.discount) || 0,
      tax: Number(data.tax) || 0,
      grandTotal: Number(data.grandTotal) || 0,
      notes: data.notes?.trim() || '',
      terms: data.terms?.trim() || '',
      convertedInvoiceId: null,
      createdAt: now,
      updatedAt: now
    };
    await put('quotations', quotation);

    if (data.items && data.items.length) {
      for (const item of data.items) {
        await put('quotation_items', {
          id: generateId('qotitem'),
          quotationId: quotation.id,
          productId: item.productId || null,
          productName: item.productName || '',
          quantity: Number(item.quantity) || 1,
          unitPrice: Number(item.unitPrice) || 0,
          fixedTotal: Number(item.fixedTotal) || 0,
          pricingType: item.pricingType || 'unit',
          lineTotal: Number(item.lineTotal) || 0,
          unit: item.unit || 'عدد'
        });
      }
    }
    return quotation;
  },

  async update(id, data) {
    const existing = await getById('quotations', id);
    if (!existing) throw new Error('پیش‌فاکتور یافت نشد');

    const updated = {
      ...existing,
      number: data.number !== undefined ? data.number : existing.number,
      date: data.date !== undefined ? data.date : existing.date,
      customerId: data.customerId !== undefined ? data.customerId : existing.customerId,
      customerName: data.customerName !== undefined ? data.customerName : existing.customerName,
      status: data.status !== undefined ? data.status : existing.status,
      items: data.items !== undefined ? data.items : existing.items,
      subtotal: data.subtotal !== undefined ? Number(data.subtotal) : existing.subtotal,
      discount: data.discount !== undefined ? Number(data.discount) : existing.discount,
      tax: data.tax !== undefined ? Number(data.tax) : existing.tax,
      grandTotal: data.grandTotal !== undefined ? Number(data.grandTotal) : existing.grandTotal,
      notes: data.notes !== undefined ? data.notes.trim() : existing.notes,
      terms: data.terms !== undefined ? data.terms.trim() : existing.terms,
      convertedInvoiceId: data.convertedInvoiceId !== undefined ? data.convertedInvoiceId : existing.convertedInvoiceId,
      updatedAt: new Date().toISOString()
    };
    await put('quotations', updated);

    if (data.items) {
      const oldItems = await getByIndex('quotation_items', 'quotationId', id);
      for (const old of oldItems) {
        await remove('quotation_items', old.id);
      }
      for (const item of data.items) {
        await put('quotation_items', {
          id: generateId('qotitem'),
          quotationId: id,
          productId: item.productId || null,
          productName: item.productName || '',
          quantity: Number(item.quantity) || 1,
          unitPrice: Number(item.unitPrice) || 0,
          fixedTotal: Number(item.fixedTotal) || 0,
          pricingType: item.pricingType || 'unit',
          lineTotal: Number(item.lineTotal) || 0,
          unit: item.unit || 'عدد'
        });
      }
    }
    return updated;
  },

  async delete(id) {
    const items = await getByIndex('quotation_items', 'quotationId', id);
    for (const item of items) {
      await remove('quotation_items', item.id);
    }
    await remove('quotations', id);
    return true;
  },

  /**
   * Convert quotation to invoice (keeps original quotation)
   */
  async convertToInvoice(quotationId) {
    const quotation = await this.getById(quotationId);
    if (!quotation) throw new Error('پیش‌فاکتور یافت نشد');

    const items = await this.getItems(quotationId);
    const number = await DocumentSettingsRepository.getNextInvoiceNumber();

    const invoiceData = {
      number,
      date: new Date().toISOString().slice(0, 10),
      customerId: quotation.customerId,
      customerName: quotation.customerName,
      status: 'issued',
      items: items.map((it) => ({
        productId: it.productId,
        productName: it.productName,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        fixedTotal: it.fixedTotal,
        pricingType: it.pricingType,
        lineTotal: it.lineTotal,
        unit: it.unit
      })),
      subtotal: quotation.subtotal,
      discount: quotation.discount,
      tax: quotation.tax,
      grandTotal: quotation.grandTotal,
      notes: quotation.notes,
      terms: quotation.terms,
      quotationId: quotation.id
    };

    const invoice = await InvoiceRepository.create(invoiceData);

    // Mark quotation as converted
    await this.update(quotationId, {
      status: 'converted',
      convertedInvoiceId: invoice.id
    });

    return invoice;
  }
};

// =====================================================
// Attachments Repository (logo, stamp, signature, images)
// =====================================================

export const AttachmentRepository = {
  async getById(id) {
    return getById('attachments', id);
  },

  async getByEntity(entityType, entityId) {
    const all = await getAll('attachments');
    return all.filter((a) => a.entityType === entityType && a.entityId === entityId);
  },

  /**
   * Store a file as base64 data URL
   * @param {File|Blob} file
   * @param {object} meta { entityType, entityId, kind }
   */
  async saveFile(file, meta = {}) {
    const dataUrl = await fileToDataUrl(file);
    const now = new Date().toISOString();
    const att = {
      id: generateId('att'),
      entityType: meta.entityType || 'business',
      entityId: meta.entityId || 'main',
      kind: meta.kind || 'image', // logo | stamp | signature | product
      mimeType: file.type || 'image/png',
      name: file.name || 'image',
      size: file.size || 0,
      dataUrl,
      createdAt: now,
      updatedAt: now
    };
    await put('attachments', att);
    return att;
  },

  async delete(id) {
    await remove('attachments', id);
    return true;
  }
};

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('خطا در خواندن فایل'));
    reader.readAsDataURL(file);
  });
}
