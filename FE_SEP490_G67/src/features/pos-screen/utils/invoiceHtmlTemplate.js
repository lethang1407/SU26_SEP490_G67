import invoiceTemplate from '../templates/invoiceTemplate.html?raw';

export function buildInvoiceHtml(data) {
    const {
        storeName, storeAddress, taxCode, currency,
        orderId, orderCode, orderStatus, paymentMethod,
        isDebt, subtotal, discountAmount, totalAmount, paidAmount, remainingDebt,
        createdAtVn, cashierName, customer, items = [],
    } = data;

    const fmt = (num) =>
        num != null
            ? Number(num).toLocaleString('vi-VN') + ' ' + (currency ?? 'VND')
            : '—';

    const paymentLabel = {
        CASH: 'Tiền mặt',
        TRANSFER: 'Chuyển khoản',
        DEBT: 'Bán nợ',
    }[paymentMethod] ?? paymentMethod ?? '';

    const isCancelled = orderStatus === 'CANCELLED';
    const orderCodeText = escHtml(orderCode ?? String(orderId ?? ''));

    const itemRows = items.map((item, idx) => `
        <tr>    
            <td>${idx + 1}</td>
            <td>${escHtml(item.productName ?? '')}</td>
            <td>${escHtml(item.unitName ?? '—')}</td>
            <td style="text-align:right">${item.quantity ?? 0}</td>
            <td style="text-align:right">${Number(item.unitPrice ?? 0).toLocaleString('vi-VN')}</td>
            <td style="text-align:right">${item.discountAmount > 0
            ? Number(item.discountAmount).toLocaleString('vi-VN')
            : '—'
        }</td>
            <td style="text-align:right">${Number(item.lineTotal ?? 0).toLocaleString('vi-VN')}</td>
        </tr>`).join('');

    const customerSection = customer
        ? `<span>Khách: <strong>${escHtml(customer.fullName ?? '')}</strong></span>
           <span>SĐT: <strong>${escHtml(customer.phoneNumber ?? '')}</strong></span>`
        : `<span style="grid-column:1/-1">Khách: <strong>Khách lẻ</strong></span>`;

    const debtRows = isDebt ? `
        <div class="row">
            <span class="label">Đã thanh toán:</span>
            <span class="value">${fmt(paidAmount)}</span>
        </div>
        <div class="row" style="color:#dc2626">
            <span class="label">Còn nợ:</span>
            <span class="value" style="color:#dc2626">${fmt(remainingDebt)}</span>
        </div>` : '';

    const discountRow = (discountAmount > 0) ? `
        <div class="row">
            <span class="label">Giảm giá:</span>
            <span class="value">- ${fmt(discountAmount)}</span>
        </div>` : '';

    const cancelBadge = isCancelled
        ? `<div style="text-align:center;margin-bottom:8px">
               <span style="display:inline-block;background:#6b7280;color:#fff;font-weight:700;font-size:12px;padding:3px 10px;border-radius:4px">
                   ĐÃ HUỶ
               </span>
           </div>` : '';

    const debtBadge = (isDebt && !isCancelled)
        ? `<div style="text-align:center;margin-bottom:8px">
               <span style="display:inline-block;background:#dc2626;color:#fff;font-weight:700;font-size:12px;padding:3px 10px;border-radius:4px">
                   BÁN NỢ
               </span>
           </div>` : '';

    const values = {
        ORDER_CODE: orderCodeText,
        STORE_NAME: escHtml(storeName ?? 'Cửa hàng'),
        STORE_ADDRESS_BLOCK: storeAddress ? `<div class="store-meta">${escHtml(storeAddress)}</div>` : '',
        TAX_CODE_BLOCK: taxCode ? `<div class="store-meta">MST: ${escHtml(taxCode)}</div>` : '',
        CANCEL_BADGE: cancelBadge,
        DEBT_BADGE: debtBadge,
        CREATED_AT: escHtml(createdAtVn ?? '—'),
        CASHIER_NAME: escHtml(cashierName ?? '—'),
        CUSTOMER_SECTION: customerSection,
        PAYMENT_LABEL: escHtml(paymentLabel),
        ITEM_ROWS: itemRows,
        SUBTOTAL: fmt(subtotal),
        DISCOUNT_ROW: discountRow,
        TOTAL_AMOUNT: fmt(totalAmount),
        DEBT_ROWS: debtRows,
    };

    return Object.entries(values).reduce(
        (html, [token, value]) => html.replaceAll(`{{${token}}}`, value),
        invoiceTemplate,
    );
}

/** Escape HTML special characters to prevent XSS in the generated string */
function escHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
