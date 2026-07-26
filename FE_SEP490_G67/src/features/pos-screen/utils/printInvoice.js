export function printInvoice(data) {
    if (!data) return;

    const {
        storeName, storeAddress, taxCode, currency,
        orderId, orderCode, orderStatus, paymentMethod,
        isDebt, subtotal, discountAmount, totalAmount, paidAmount, remainingDebt,
        createdAtVn, cashierName, customer, items = [],
    } = data;

    const fmt = (num) =>
        num != null
            ? Number(num).toLocaleString('vi-VN') + '\u00a0' + (currency ?? 'VND')
            : '\u2014';

    const paymentLabel = {
        CASH: 'Ti\u1ec1n m\u1eb7t',
        TRANSFER: 'Chuy\u1ec3n kho\u1ea3n',
        DEBT: 'B\u00e1n n\u1ee3',
    }[paymentMethod] ?? paymentMethod ?? '';

    const isCancelled = orderStatus === 'CANCELLED';

    const itemRows = items.map((item, idx) => `
        <tr>
            <td>${idx + 1}</td>
            <td>${escHtml(item.productName ?? '')}</td>
            <td>${escHtml(item.unitName ?? '\u2014')}</td>
            <td style="text-align:right">${item.quantity ?? 0}</td>
            <td style="text-align:right">${Number(item.unitPrice ?? 0).toLocaleString('vi-VN')}</td>
            <td style="text-align:right">${item.discountAmount > 0
            ? Number(item.discountAmount).toLocaleString('vi-VN')
            : '\u2014'
        }</td>
            <td style="text-align:right">${Number(item.lineTotal ?? 0).toLocaleString('vi-VN')}</td>
        </tr>`).join('');

    const customerSection = customer
        ? `<span>Kh\u00e1ch: <strong>${escHtml(customer.fullName ?? '')}</strong></span>
           <span>S\u0110T: <strong>${escHtml(customer.phoneNumber ?? '')}</strong></span>`
        : `<span style="grid-column:1/-1">Kh\u00e1ch: <strong>Kh\u00e1ch l\u1ebb</strong></span>`;

    const debtRows = isDebt ? `
        <div class="row">
            <span class="label">\u0110\u00e3 thanh to\u00e1n:</span>
            <span class="value">${fmt(paidAmount)}</span>
        </div>
        <div class="row" style="color:#dc2626">
            <span class="label">C\u00f2n n\u1ee3:</span>
            <span class="value" style="color:#dc2626">${fmt(remainingDebt)}</span>
        </div>` : '';

    const discountRow = (discountAmount > 0) ? `
        <div class="row">
            <span class="label">Gi\u1ea3m gi\u00e1:</span>
            <span class="value">- ${fmt(discountAmount)}</span>
        </div>` : '';

    const cancelBadge = isCancelled
        ? `<div style="text-align:center;margin-bottom:8px">
               <span style="display:inline-block;background:#6b7280;color:#fff;font-weight:700;font-size:12px;padding:3px 10px;border-radius:4px">
                   \u0110\u00c3 H\u1ee4Y
               </span>
           </div>` : '';

    const debtBadge = (isDebt && !isCancelled)
        ? `<div style="text-align:center;margin-bottom:8px">
               <span style="display:inline-block;background:#dc2626;color:#fff;font-weight:700;font-size:12px;padding:3px 10px;border-radius:4px">
                   B\u00c1N N\u1ee2
               </span>
           </div>` : '';

    const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8"/>
  <title>H\u00f3a \u0111\u01a1n - ${escHtml(orderCode ?? String(orderId ?? ''))}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:#111;background:#fff;padding:24px 32px}
    .store-name{font-size:18px;font-weight:700;text-align:center;margin-bottom:2px}
    .store-meta{text-align:center;font-size:11px;color:#444;margin-bottom:4px}
    .inv-title{text-align:center;font-size:16px;font-weight:700;text-transform:uppercase;margin:12px 0 4px;letter-spacing:1px}
    .inv-code{text-align:center;font-size:11px;color:#555;margin-bottom:12px}
    hr{border:none;border-top:1px solid #d1d5db;margin:8px 0}
    .meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:2px 16px;margin-bottom:12px;font-size:12px}
    table{width:100%;border-collapse:collapse;margin:8px 0 4px;font-size:11.5px}
    th{border-bottom:2px solid #374151;padding:4px 6px;text-align:left;font-weight:700;white-space:nowrap}
    td{border-bottom:1px solid #e5e7eb;padding:4px 6px;vertical-align:top}
    .totals{display:flex;flex-direction:column;align-items:flex-end;gap:4px;margin-top:8px}
    .row{display:flex;gap:24px;justify-content:flex-end}
    .label{color:#374151;min-width:130px;text-align:right}
    .value{min-width:100px;text-align:right;font-weight:600}
    .grand{font-size:14px;font-weight:700}
    .footer{text-align:center;margin-top:20px;font-size:11px;color:#6b7280}
    @page{margin:15mm 12mm;size:A5}
  </style>
</head>
<body>
  <div class="store-name">${escHtml(storeName ?? 'C\u1eeda h\u00e0ng')}</div>
  ${storeAddress ? `<div class="store-meta">${escHtml(storeAddress)}</div>` : ''}
  ${taxCode ? `<div class="store-meta">MST: ${escHtml(taxCode)}</div>` : ''}

  <hr/>

  <div class="inv-title">H\u00f3a \u0111\u01a1n b\u00e1n h\u00e0ng</div>
  <div class="inv-code">M\u00e3: ${escHtml(orderCode ?? String(orderId ?? ''))}</div>

  ${cancelBadge}
  ${debtBadge}

  <div class="meta-grid">
    <span>Ng\u00e0y: <strong>${escHtml(createdAtVn ?? '\u2014')}</strong></span>
    <span>Thu ng\u00e2n: <strong>${escHtml(cashierName ?? '\u2014')}</strong></span>
    ${customerSection}
    <span>Thanh to\u00e1n: <strong>${escHtml(paymentLabel)}</strong></span>
  </div>

  <hr/>

  <table>
    <thead>
      <tr>
        <th>STT</th><th>T\u00ean h\u00e0ng</th><th>\u0110VT</th>
        <th style="text-align:right">SL</th>
        <th style="text-align:right">\u0110\u01a1n gi\u00e1</th>
        <th style="text-align:right">Gi\u1ea3m gi\u00e1</th>
        <th style="text-align:right">Th\u00e0nh ti\u1ec1n</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  <hr/>

  <div class="totals">
    <div class="row">
      <span class="label">T\u1ed5ng ti\u1ec1n h\u00e0ng:</span>
      <span class="value">${fmt(subtotal)}</span>
    </div>
    ${discountRow}
    <div class="row grand">
      <span class="label">T\u1ed4NG C\u1ed8NG:</span>
      <span class="value">${fmt(totalAmount)}</span>
    </div>
    ${debtRows}
  </div>

  <hr/>
  <div class="footer">C\u1ea3m \u01a1n qu\u00fd kh\u00e1ch! H\u1eb9n g\u1eb7p l\u1ea1i.</div>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=800,height=600');
    if (!win) {
        alert('Tr\u00ecnh duy\u1ec7t \u0111\u00e3 ch\u1eb7n c\u1eeda s\u1ed5 b\u1eadt l\u00ean. Vui l\u00f2ng cho ph\u00e9p pop-up r\u1ed3i th\u1eed l\u1ea1i.');
        return;
    }
    win.document.write(html);
    win.document.close();
    // Wait for fonts/resources, then print
    win.onload = () => win.print();
    // Fallback: if onload already fired (e.g. Chrome caches)
    if (win.document.readyState === 'complete') win.print();
}

/** Escape HTML special characters to prevent XSS in the generated string */
function escHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
