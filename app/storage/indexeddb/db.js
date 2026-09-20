/**
 * IndexedDB Data Layer
 * Offline-First Invoice & Proforma PWA
 * 
 * Architecture:
 * UI → Services → Repositories → This Storage Layer → IndexedDB
 */

const DB_NAME = 'InvoiceProformaDB';
const DB_VERSION = 1;

/** @type {IDBDatabase | null} */
let dbInstance = null;

/**
 * Open / create the database
 */
export function openDB() {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[DB] Failed to open:', request.error);
      reject(new Error('خطا در باز کردن پایگاه داده محلی'));
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      createObjectStores(db);
    };
  });
}

/**
 * Create all object stores (schema)
 */
function createObjectStores(db) {
  // Products
  if (!db.objectStoreNames.contains('products')) {
    const store = db.createObjectStore('products', { keyPath: 'id' });
    store.createIndex('name', 'name', { unique: false });
    store.createIndex('sku', 'sku', { unique: false });
    store.createIndex('status', 'status', { unique: false });
    store.createIndex('updatedAt', 'updatedAt', { unique: false });
  }

  // Customers
  if (!db.objectStoreNames.contains('customers')) {
    const store = db.createObjectStore('customers', { keyPath: 'id' });
    store.createIndex('name', 'name', { unique: false });
    store.createIndex('company', 'company', { unique: false });
    store.createIndex('phone', 'phone', { unique: false });
    store.createIndex('updatedAt', 'updatedAt', { unique: false });
  }

  // Invoices
  if (!db.objectStoreNames.contains('invoices')) {
    const store = db.createObjectStore('invoices', { keyPath: 'id' });
    store.createIndex('number', 'number', { unique: true });
    store.createIndex('customerId', 'customerId', { unique: false });
    store.createIndex('status', 'status', { unique: false });
    store.createIndex('date', 'date', { unique: false });
    store.createIndex('updatedAt', 'updatedAt', { unique: false });
  }

  // Invoice Items
  if (!db.objectStoreNames.contains('invoice_items')) {
    const store = db.createObjectStore('invoice_items', { keyPath: 'id' });
    store.createIndex('invoiceId', 'invoiceId', { unique: false });
    store.createIndex('productId', 'productId', { unique: false });
  }

  // Quotations (Proforma)
  if (!db.objectStoreNames.contains('quotations')) {
    const store = db.createObjectStore('quotations', { keyPath: 'id' });
    store.createIndex('number', 'number', { unique: true });
    store.createIndex('customerId', 'customerId', { unique: false });
    store.createIndex('status', 'status', { unique: false });
    store.createIndex('date', 'date', { unique: false });
    store.createIndex('updatedAt', 'updatedAt', { unique: false });
  }

  // Quotation Items
  if (!db.objectStoreNames.contains('quotation_items')) {
    const store = db.createObjectStore('quotation_items', { keyPath: 'id' });
    store.createIndex('quotationId', 'quotationId', { unique: false });
    store.createIndex('productId', 'productId', { unique: false });
  }

  // Price Rules
  if (!db.objectStoreNames.contains('price_rules')) {
    const store = db.createObjectStore('price_rules', { keyPath: 'id' });
    store.createIndex('productId', 'productId', { unique: false });
    store.createIndex('type', 'type', { unique: false });
  }

  // Business Profile (single record, id = 'main')
  if (!db.objectStoreNames.contains('business_profile')) {
    db.createObjectStore('business_profile', { keyPath: 'id' });
  }

  // Document Settings
  if (!db.objectStoreNames.contains('document_settings')) {
    db.createObjectStore('document_settings', { keyPath: 'id' });
  }

  // App Settings
  if (!db.objectStoreNames.contains('app_settings')) {
    db.createObjectStore('app_settings', { keyPath: 'id' });
  }

  // Attachments (logos, stamps, signatures, product images)
  if (!db.objectStoreNames.contains('attachments')) {
    const store = db.createObjectStore('attachments', { keyPath: 'id' });
    store.createIndex('entityType', 'entityType', { unique: false });
    store.createIndex('entityId', 'entityId', { unique: false });
  }
}

/**
 * Generic CRUD helpers
 */
export async function getAll(storeName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function getById(storeName, id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function put(storeName, data) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.put(data);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function remove(storeName, id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.delete(id);
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

export async function getByIndex(storeName, indexName, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(value);
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function clearStore(storeName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.clear();
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Generate stable unique ID
 */
export function generateId(prefix = '') {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return prefix ? `${prefix}_${timestamp}${random}` : `${timestamp}${random}`;
}

/**
 * Initialize default settings if empty
 */
export async function ensureDefaults() {
  const profile = await getById('business_profile', 'main');
  if (!profile) {
    await put('business_profile', {
      id: 'main',
      name: '',
      phone: '',
      email: '',
      website: '',
      address: '',
      taxId: '',
      economicId: '',
      nationalId: '',
      description: '',
      logoId: null,
      stampId: null,
      signatureId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  const docSettings = await getById('document_settings', 'main');
  if (!docSettings) {
    await put('document_settings', {
      id: 'main',
      invoicePrefix: 'INV',
      quotationPrefix: 'PF',
      invoiceNextNumber: 1,
      quotationNextNumber: 1,
      yearFormat: 'jalali', // or gregorian
      currency: 'تومان',
      currencyCode: 'IRR',
      defaultTaxRate: 0,
      defaultDiscount: 0,
      terms: '',
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  const appSettings = await getById('app_settings', 'main');
  if (!appSettings) {
    await put('app_settings', {
      id: 'main',
      theme: 'system', // light | dark | system
      language: 'fa',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }
}

/**
 * Close database (rarely needed)
 */
export function closeDB() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
