/**
 * Document Renderer
 * Single source of truth for Preview / Print / Image / future PDF
 * RTL + Persian friendly
 */

import { formatCurrency, formatDate } from '../../core/utilities/id.js';

/**
 * Build HTML for a document (invoice or quotation)
 * @param {object} doc - invoice or quotation object
 * @param {Array} items - line items
 * @param {object} business - business profile
 * @param {'invoice'|'quotation'} type
 * @returns {string} HTML string
 */
export function renderDocumentHTML(doc, items = [], business = {}, type = 'invoice') {
  const title = type === 'invoice' ? 'فاکتور' : 'پیش‌فاکتور';
  const numberLabel = type === 'invoice' ? 'شماره فاکتور' : 'شماره پیش‌فاکتور';

  const rows = (items || []).map((item, i) => `
    <tr>
      <td style="text-align:center;">${i + 1}</td>
      <td>${escapeHtml(item.productName || '—')}</td>
      <td style="text-align:center;direction:ltr;">${item.quantity || 1}</td>
      <td style="text-align:left;direction:ltr;">${formatCurrency(item.unitPrice || 0)}</td>
      <td style="text-align:left;direction:ltr;font-weight:600;">${formatCurrency(item.lineTotal || 0)}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: "Vazirmatn", Tahoma, "Segoe UI", sans-serif;
      font-size: 13px;
      color: #0f172a;
      background: #fff;
      padding: 24px;
      direction: rtl;
    }
    .doc {
      max-width: 800px;
      margin: 0 auto;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #2563eb, #0ea5e9);
      color: white;
      padding: 20px 24px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .header h1 { font-size: 22px; font-weight: 700; }
    .header .meta { text-align: left; font-size: 12px; opacity: 0.95; }
    .body { padding: 24px; }
    .section { margin-bottom: 20px; }
    .section-title { font-size: 11px; color: #64748b; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
    .party { display: flex; gap: 24px; flex-wrap: wrap; }
    .party > div { flex: 1; min-width: 200px; }
    .party strong { display: block; font-size: 15px; margin-bottom: 4px; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
    }
    th, td {
      border: 1px solid #e2e8f0;
      padding: 10px 12px;
      text-align: right;
    }
    th {
      background: #f8fafc;
      font-weight: 600;
      font-size: 12px;
      color: #475569;
    }
    .totals {
      margin-top: 20px;
      margin-right: auto;
      width: 280px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      border-bottom: 1px solid #f1f5f9;
    }
    .totals-row.grand {
      font-weight: 700;
      font-size: 16px;
      border-bottom: none;
      padding-top: 10px;
      color: #2563eb;
    }
    .notes {
      margin-top: 24px;
      padding: 12px;
      background: #f8fafc;
      border-radius: 8px;
      font-size: 12px;
      color: #475569;
    }
    .footer {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px dashed #cbd5e1;
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #94a3b8;
    }
    @media print {
      body { padding: 0; }
      .doc { border: none; border-radius: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="doc">
    <div class="header">
      <div style="display:flex;align-items:center;gap:12px;">
        ${business.logoDataUrl ? `<img src="${business.logoDataUrl}" style="width:48px;height:48px;object-fit:contain;border-radius:8px;background:rgba(255,255,255,0.2);" />` : ''}
        <div>
          <h1>${title}</h1>
          <div style="margin-top:6px;font-size:13px;">${escapeHtml(business.name || 'کسب‌وکار شما')}</div>
        </div>
      </div>
      <div class="meta">
        <div>${numberLabel}: <strong style="direction:ltr;display:inline-block;">${escapeHtml(doc.number || '—')}</strong></div>
        <div style="margin-top:4px;">تاریخ: ${formatDate(doc.date)}</div>
      </div>
    </div>
    <div class="body">
      <div class="section party">
        <div>
          <div class="section-title">فروشنده</div>
          <strong>${escapeHtml(business.name || '—')}</strong>
          ${business.phone ? `<div>تلفن: <span style="direction:ltr;display:inline-block;">${escapeHtml(business.phone)}</span></div>` : ''}
          ${business.address ? `<div>${escapeHtml(business.address)}</div>` : ''}
          ${business.taxId ? `<div>شناسه مالیاتی: <span style="direction:ltr;display:inline-block;">${escapeHtml(business.taxId)}</span></div>` : ''}
        </div>
        <div>
          <div class="section-title">خریدار</div>
          <strong>${escapeHtml(doc.customerName || '—')}</strong>
        </div>
      </div>

      <div class="section">
        <div class="section-title">اقلام</div>
        <table>
          <thead>
            <tr>
              <th style="width:40px;text-align:center;">#</th>
              <th>شرح</th>
              <th style="width:70px;text-align:center;">تعداد</th>
              <th style="width:110px;">قیمت واحد</th>
              <th style="width:110px;">جمع</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="5" style="text-align:center;color:#94a3b8;">بدون قلم</td></tr>'}
          </tbody>
        </table>
      </div>

      <div class="totals">
        <div class="totals-row">
          <span>جمع جزء</span>
          <span>${formatCurrency(doc.subtotal || 0)}</span>
        </div>
        ${doc.discount ? `
        <div class="totals-row">
          <span>تخفیف</span>
          <span>${formatCurrency(doc.discount)}</span>
        </div>` : ''}
        ${doc.tax ? `
        <div class="totals-row">
          <span>مالیات</span>
          <span>${formatCurrency(doc.tax)}</span>
        </div>` : ''}
        <div class="totals-row grand">
          <span>مبلغ نهایی</span>
          <span>${formatCurrency(doc.grandTotal || 0)}</span>
        </div>
      </div>

      ${doc.notes ? `
      <div class="notes">
        <strong>یادداشت:</strong> ${escapeHtml(doc.notes)}
      </div>` : ''}

      ${(business.stampDataUrl || business.signatureDataUrl) ? `
      <div style="display:flex;justify-content:flex-end;gap:32px;margin-top:28px;">
        ${business.stampDataUrl ? `<div style="text-align:center;"><img src="${business.stampDataUrl}" style="max-width:90px;max-height:90px;object-fit:contain;" /><div style="font-size:10px;color:#94a3b8;margin-top:4px;">مهر</div></div>` : ''}
        ${business.signatureDataUrl ? `<div style="text-align:center;"><img src="${business.signatureDataUrl}" style="max-width:120px;max-height:60px;object-fit:contain;" /><div style="font-size:10px;color:#94a3b8;margin-top:4px;">امضا</div></div>` : ''}
      </div>` : ''}
      <div class="footer">
        <div>تولید شده توسط فاکتور پرو – Offline First</div>
        <div>${new Date().toLocaleDateString('fa-IR')}</div>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Open document in a new window for preview / print
 */
export function openPreviewWindow(html) {
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) {
    alert('لطفاً پاپ‌آپ مرورگر را مجاز کنید.');
    return null;
  }
  win.document.write(html);
  win.document.close();
  return win;
}

/**
 * Trigger print dialog on a rendered document
 */
export function printDocument(html) {
  const win = openPreviewWindow(html);
  if (win) {
    win.onload = () => {
      setTimeout(() => {
        win.print();
      }, 300);
    };
  }
}
