/**
 * Backup & Restore Service
 * Exports/imports all local data as a portable JSON file
 */

import {
  getAll,
  put,
  clearStore,
  openDB
} from '../../storage/indexeddb/db.js';

const STORES = [
  'products',
  'customers',
  'invoices',
  'invoice_items',
  'quotations',
  'quotation_items',
  'price_rules',
  'business_profile',
  'document_settings',
  'app_settings',
  'attachments'
];

/**
 * Create a full backup object
 */
export async function createBackup() {
  await openDB();
  const data = {};
  for (const store of STORES) {
    try {
      data[store] = await getAll(store);
    } catch (e) {
      data[store] = [];
    }
  }

  return {
    app: 'InvoiceProformaPWA',
    version: 1,
    exportedAt: new Date().toISOString(),
    data
  };
}

/**
 * Download backup as JSON file
 */
export async function downloadBackup() {
  const backup = await createBackup();
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `invoice-backup-${date}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return backup;
}

/**
 * Validate backup structure
 */
export function validateBackup(obj) {
  if (!obj || typeof obj !== 'object') return { ok: false, error: 'فایل نامعتبر است' };
  if (obj.app !== 'InvoiceProformaPWA') return { ok: false, error: 'این فایل پشتیبان فاکتور پرو نیست' };
  if (!obj.data || typeof obj.data !== 'object') return { ok: false, error: 'ساختار داده ناقص است' };
  return { ok: true };
}

/**
 * Restore from backup object
 * @param {object} backup
 * @param {'replace'|'merge'} mode - replace clears existing data first
 */
export async function restoreBackup(backup, mode = 'replace') {
  const validation = validateBackup(backup);
  if (!validation.ok) throw new Error(validation.error);

  await openDB();

  if (mode === 'replace') {
    for (const store of STORES) {
      try {
        await clearStore(store);
      } catch (e) {
        console.warn('Clear failed for', store, e);
      }
    }
  }

  for (const store of STORES) {
    const items = backup.data[store] || [];
    for (const item of items) {
      if (item && item.id != null) {
        await put(store, item);
      }
    }
  }

  return true;
}

/**
 * Read backup file from input
 */
export function readBackupFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(reader.result);
        resolve(obj);
      } catch (e) {
        reject(new Error('فایل JSON معتبر نیست'));
      }
    };
    reader.onerror = () => reject(new Error('خطا در خواندن فایل'));
    reader.readAsText(file);
  });
}
