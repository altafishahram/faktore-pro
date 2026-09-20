/**
 * Settings Module
 * - Business Profile (with logo/stamp/signature)
 * - Document Settings (prefix, currency)
 * - Backup & Restore
 */

import {
  BusinessProfileRepository,
  DocumentSettingsRepository,
  AttachmentRepository
} from '../../storage/indexeddb/repositories.js';
import {
  downloadBackup,
  readBackupFile,
  restoreBackup,
  validateBackup
} from '../../services/backup/backup-service.js';
import { showToast } from '../../core/app/bootstrap.js';
import { setTheme, loadAndApplyTheme } from '../../core/utilities/theme.js';
import { getById } from '../../storage/indexeddb/db.js';

export async function renderSettings() {
  const main = document.getElementById('page-content');
  if (!main) return;

  const [profile, docSettings] = await Promise.all([
    BusinessProfileRepository.get(),
    DocumentSettingsRepository.get()
  ]);

  let logoUrl = null, stampUrl = null, sigUrl = null;
  try {
    if (profile?.logoId) {
      const att = await AttachmentRepository.getById(profile.logoId);
      logoUrl = att?.dataUrl || null;
    }
    if (profile?.stampId) {
      const att = await AttachmentRepository.getById(profile.stampId);
      stampUrl = att?.dataUrl || null;
    }
    if (profile?.signatureId) {
      const att = await AttachmentRepository.getById(profile.signatureId);
      sigUrl = att?.dataUrl || null;
    }
  } catch (e) { /* ignore */ }

  main.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">تنظیمات</h1>
    </div>
    <div class="page-body">

      <!-- Business Profile -->
      <div class="card" style="margin-bottom:var(--space-4);">
        <div class="card-header">
          <h3 class="card-title">پروفایل کسب‌وکار</h3>
        </div>
        <div class="card-body">
          <form id="business-form">
            <div class="form-group">
              <label class="form-label" for="b-name">نام کسب‌وکار</label>
              <input type="text" id="b-name" class="form-input" value="${escapeHtml(profile?.name || '')}" placeholder="نام فروشگاه یا شرکت" />
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);">
              <div class="form-group">
                <label class="form-label" for="b-phone">تلفن</label>
                <input type="tel" id="b-phone" class="form-input ltr" value="${escapeHtml(profile?.phone || '')}" dir="ltr" />
              </div>
              <div class="form-group">
                <label class="form-label" for="b-email">ایمیل</label>
                <input type="email" id="b-email" class="form-input ltr" value="${escapeHtml(profile?.email || '')}" dir="ltr" />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label" for="b-address">آدرس</label>
              <textarea id="b-address" class="form-textarea" rows="2">${escapeHtml(profile?.address || '')}</textarea>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);">
              <div class="form-group">
                <label class="form-label" for="b-tax">شناسه مالیاتی</label>
                <input type="text" id="b-tax" class="form-input ltr" value="${escapeHtml(profile?.taxId || '')}" dir="ltr" />
              </div>
              <div class="form-group">
                <label class="form-label" for="b-eco">کد اقتصادی / ملی</label>
                <input type="text" id="b-eco" class="form-input ltr" value="${escapeHtml(profile?.economicId || profile?.nationalId || '')}" dir="ltr" />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label" for="b-website">وب‌سایت</label>
              <input type="url" id="b-website" class="form-input ltr" value="${escapeHtml(profile?.website || '')}" dir="ltr" placeholder="https://" />
            </div>

            <!-- Media uploads -->
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:var(--space-4);margin-top:var(--space-4);">
              <div>
                <label class="form-label">لوگو</label>
                <div id="logo-preview" style="width:100%;height:80px;border:1px dashed var(--color-border);border-radius:var(--radius-lg);display:flex;align-items:center;justify-content:center;overflow:hidden;background:var(--color-surface);margin-bottom:8px;">
                  ${logoUrl ? `<img src="${logoUrl}" style="max-width:100%;max-height:100%;object-fit:contain;" />` : '<span style="color:var(--color-muted);font-size:12px;">بدون لوگو</span>'}
                </div>
                <input type="file" id="b-logo" accept="image/*" style="font-size:12px;" />
              </div>
              <div>
                <label class="form-label">مهر</label>
                <div id="stamp-preview" style="width:100%;height:80px;border:1px dashed var(--color-border);border-radius:var(--radius-lg);display:flex;align-items:center;justify-content:center;overflow:hidden;background:var(--color-surface);margin-bottom:8px;">
                  ${stampUrl ? `<img src="${stampUrl}" style="max-width:100%;max-height:100%;object-fit:contain;" />` : '<span style="color:var(--color-muted);font-size:12px;">بدون مهر</span>'}
                </div>
                <input type="file" id="b-stamp" accept="image/*" style="font-size:12px;" />
              </div>
              <div>
                <label class="form-label">امضا</label>
                <div id="sig-preview" style="width:100%;height:80px;border:1px dashed var(--color-border);border-radius:var(--radius-lg);display:flex;align-items:center;justify-content:center;overflow:hidden;background:var(--color-surface);margin-bottom:8px;">
                  ${sigUrl ? `<img src="${sigUrl}" style="max-width:100%;max-height:100%;object-fit:contain;" />` : '<span style="color:var(--color-muted);font-size:12px;">بدون امضا</span>'}
                </div>
                <input type="file" id="b-signature" accept="image/*" style="font-size:12px;" />
              </div>
            </div>

            <button type="button" class="btn btn-primary" id="btn-save-business" style="margin-top:var(--space-5);">ذخیره پروفایل</button>
          </form>
        </div>
      </div>

      <!-- Document Settings -->
      <div class="card" style="margin-bottom:var(--space-4);">
        <div class="card-header">
          <h3 class="card-title">تنظیمات اسناد</h3>
        </div>
        <div class="card-body">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);">
            <div class="form-group">
              <label class="form-label" for="d-inv-prefix">پیشوند فاکتور</label>
              <input type="text" id="d-inv-prefix" class="form-input ltr" value="${escapeHtml(docSettings?.invoicePrefix || 'INV')}" dir="ltr" />
            </div>
            <div class="form-group">
              <label class="form-label" for="d-qot-prefix">پیشوند پیش‌فاکتور</label>
              <input type="text" id="d-qot-prefix" class="form-input ltr" value="${escapeHtml(docSettings?.quotationPrefix || 'PF')}" dir="ltr" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" for="d-currency">واحد پول</label>
            <input type="text" id="d-currency" class="form-input" value="${escapeHtml(docSettings?.currency || 'تومان')}" />
          </div>
          <button type="button" class="btn btn-primary" id="btn-save-doc-settings">ذخیره تنظیمات اسناد</button>
        </div>
      </div>


      <!-- Appearance -->
      <div class="card" style="margin-bottom:var(--space-4);">
        <div class="card-header">
          <h3 class="card-title">ظاهر برنامه</h3>
        </div>
        <div class="card-body">
          <div class="form-group">
            <label class="form-label">حالت نمایش</label>
            <div style="display:flex;gap:var(--space-2);flex-wrap:wrap;" id="theme-options">
              <button type="button" class="btn btn-secondary theme-btn" data-theme="light" style="flex:1;min-width:90px;">☀ روشن</button>
              <button type="button" class="btn btn-secondary theme-btn" data-theme="dark" style="flex:1;min-width:90px;">🌙 تاریک</button>
              <button type="button" class="btn btn-secondary theme-btn" data-theme="system" style="flex:1;min-width:90px;">💻 سیستم</button>
            </div>
            <p style="margin-top:var(--space-2);font-size:var(--font-size-xs);color:var(--color-muted);">حالت «سیستم» از تنظیمات دستگاه شما پیروی می‌کند.</p>
          </div>
        </div>
      </div>

      <!-- Backup & Restore -->
      <div class="card" style="margin-bottom:var(--space-4);">
        <div class="card-header">
          <h3 class="card-title">پشتیبان‌گیری و بازیابی</h3>
        </div>
        <div class="card-body">
          <p style="font-size:var(--font-size-sm);color:var(--color-muted);margin-bottom:var(--space-4);">
            تمام داده‌ها (محصولات، مشتریان، فاکتورها، تنظیمات و تصاویر) در یک فایل JSON ذخیره می‌شوند.
            می‌توانید این فایل را به دستگاه دیگر منتقل کنید.
          </p>
          <div style="display:flex;flex-wrap:wrap;gap:var(--space-3);">
            <button type="button" class="btn btn-primary" id="btn-backup">ایجاد نسخه پشتیبان</button>
            <label class="btn btn-secondary" style="cursor:pointer;">
              بازیابی از فایل
              <input type="file" id="restore-file" accept=".json,application/json" style="display:none;" />
            </label>
          </div>
          <p style="margin-top:var(--space-3);font-size:var(--font-size-xs);color:var(--color-muted);">
            ⚠️ بازیابی، داده‌های فعلی را جایگزین می‌کند. قبل از بازیابی حتماً پشتیبان بگیرید.
          </p>
        </div>
      </div>

      <!-- About -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">درباره برنامه</h3>
        </div>
        <div class="card-body">
          <p style="font-size:var(--font-size-sm);">فاکتور پرو – Offline-First Invoice & Proforma PWA</p>
          <p style="font-size:var(--font-size-xs);color:var(--color-muted);margin-top:var(--space-2);">نسخه ۰.۶ • داده‌ها فقط روی دستگاه شما ذخیره می‌شوند • بدون نیاز به اینترنت و سرور</p>
        </div>
      </div>
    </div>
  `;

  bindSettingsEvents(profile);
  updateActiveNav('settings');
}

function bindSettingsEvents(profile) {

  // Theme buttons
  (async () => {
    let current = 'system';
    try {
      const s = await getById('app_settings', 'main');
      current = s?.theme || 'system';
    } catch {}
    document.querySelectorAll('.theme-btn').forEach(btn => {
      if (btn.dataset.theme === current) {
        btn.classList.remove('btn-secondary');
        btn.classList.add('btn-primary');
      }
      btn.addEventListener('click', async () => {
        const t = btn.dataset.theme;
        await setTheme(t);
        document.querySelectorAll('.theme-btn').forEach(b => {
          b.classList.remove('btn-primary');
          b.classList.add('btn-secondary');
        });
        btn.classList.remove('btn-secondary');
        btn.classList.add('btn-primary');
        showToast(t === 'dark' ? 'حالت تاریک فعال شد' : t === 'light' ? 'حالت روشن فعال شد' : 'حالت سیستم فعال شد', 'success');
      });
    });
  })();

  // Save business
  document.getElementById('btn-save-business')?.addEventListener('click', async () => {
    try {
      let logoId = profile?.logoId || null;
      let stampId = profile?.stampId || null;
      let signatureId = profile?.signatureId || null;

      const logoFile = document.getElementById('b-logo')?.files?.[0];
      if (logoFile) {
        const att = await AttachmentRepository.saveFile(logoFile, { entityType: 'business', entityId: 'main', kind: 'logo' });
        logoId = att.id;
        document.getElementById('logo-preview').innerHTML = `<img src="${att.dataUrl}" style="max-width:100%;max-height:100%;object-fit:contain;" />`;
      }
      const stampFile = document.getElementById('b-stamp')?.files?.[0];
      if (stampFile) {
        const att = await AttachmentRepository.saveFile(stampFile, { entityType: 'business', entityId: 'main', kind: 'stamp' });
        stampId = att.id;
        document.getElementById('stamp-preview').innerHTML = `<img src="${att.dataUrl}" style="max-width:100%;max-height:100%;object-fit:contain;" />`;
      }
      const sigFile = document.getElementById('b-signature')?.files?.[0];
      if (sigFile) {
        const att = await AttachmentRepository.saveFile(sigFile, { entityType: 'business', entityId: 'main', kind: 'signature' });
        signatureId = att.id;
        document.getElementById('sig-preview').innerHTML = `<img src="${att.dataUrl}" style="max-width:100%;max-height:100%;object-fit:contain;" />`;
      }

      await BusinessProfileRepository.update({
        name: document.getElementById('b-name')?.value,
        phone: document.getElementById('b-phone')?.value,
        email: document.getElementById('b-email')?.value,
        address: document.getElementById('b-address')?.value,
        taxId: document.getElementById('b-tax')?.value,
        economicId: document.getElementById('b-eco')?.value,
        website: document.getElementById('b-website')?.value,
        logoId,
        stampId,
        signatureId
      });
      showToast('پروفایل ذخیره شد', 'success');
    } catch (err) {
      console.error(err);
      showToast(err.message || 'خطا در ذخیره پروفایل', 'error');
    }
  });

  // Save document settings
  document.getElementById('btn-save-doc-settings')?.addEventListener('click', async () => {
    try {
      await DocumentSettingsRepository.update({
        invoicePrefix: document.getElementById('d-inv-prefix')?.value || 'INV',
        quotationPrefix: document.getElementById('d-qot-prefix')?.value || 'PF',
        currency: document.getElementById('d-currency')?.value || 'تومان'
      });
      showToast('تنظیمات اسناد ذخیره شد', 'success');
    } catch (err) {
      showToast('خطا در ذخیره تنظیمات', 'error');
    }
  });

  // Backup
  document.getElementById('btn-backup')?.addEventListener('click', async () => {
    try {
      await downloadBackup();
      showToast('نسخه پشتیبان دانلود شد', 'success');
    } catch (err) {
      console.error(err);
      showToast('خطا در ایجاد پشتیبان', 'error');
    }
  });

  // Restore
  document.getElementById('restore-file')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm('آیا مطمئن هستید؟\nتمام داده‌های فعلی با محتوای فایل پشتیبان جایگزین می‌شود.\nاین عملیات قابل بازگشت نیست مگر اینکه قبلاً پشتیبان گرفته باشید.')) {
      e.target.value = '';
      return;
    }
    try {
      const backup = await readBackupFile(file);
      const v = validateBackup(backup);
      if (!v.ok) {
        showToast(v.error, 'error');
        return;
      }
      await restoreBackup(backup, 'replace');
      showToast('بازیابی با موفقیت انجام شد. صفحه را رفرش کنید.', 'success');
      setTimeout(() => location.reload(), 1500);
    } catch (err) {
      console.error(err);
      showToast(err.message || 'خطا در بازیابی', 'error');
    } finally {
      e.target.value = '';
    }
  });
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
