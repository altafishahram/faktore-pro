/**
 * Image Export Service
 * For full high-quality image export of documents, a library like html2canvas
 * can be added later. Currently provides a helper to open a print-ready view
 * that users can screenshot, and a basic canvas fallback for simple cases.
 */

/**
 * Open document HTML in a new window optimized for screenshot / save as image
 */
export function openForImageCapture(html) {
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) {
    alert('لطفاً پاپ‌آپ مرورگر را مجاز کنید.');
    return null;
  }
  // Add a small instruction bar
  const wrapped = html.replace(
    '<body>',
    `<body>
    <div class="no-print" style="background:#2563eb;color:white;padding:10px 16px;text-align:center;font-family:Tahoma,sans-serif;font-size:13px;">
      برای ذخیره به عنوان تصویر: از ابزار Screenshot سیستم‌عامل استفاده کنید یا Print → Save as PDF
    </div>`
  );
  win.document.write(wrapped);
  win.document.close();
  return win;
}
