import invoiceTemplateHtml from '../templates/invoiceTemplate.html?raw';

export default class InvoiceTemplate {

    static COLUMN_COUNT = 7;

    constructor(rawHtml = invoiceTemplateHtml) {
        this.rawHtml = rawHtml;
    }

    render(values) {
        return this.rawHtml.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            const value = values[key];
            if (value === undefined) {
                console.warn(`[InvoiceTemplate] thiếu giá trị cho ${match}`);
                return '';
            }
            return value;
        });
    }

    storeLine(text) {
        return `<div class="store-meta">${InvoiceTemplate.esc(text)}</div>`;
    }

    badge(text, color) {
        return `<div style="text-align:center;margin-bottom:8px">
               <span style="display:inline-block;background:${color};color:#fff;font-weight:700;font-size:12px;padding:3px 10px;border-radius:4px">${InvoiceTemplate.esc(text)}</span>
           </div>`;
    }

    metaCell(label, value) {
        return `<span>${InvoiceTemplate.esc(label)}: <strong>${InvoiceTemplate.esc(value)}</strong></span>`;
    }

    wideCell(label, value) {
        return `<span style="grid-column:1/-1">${InvoiceTemplate.esc(label)}: <strong>${InvoiceTemplate.esc(value)}</strong></span>`;
    }

    lineRow({ index, name, unit, quantity, unitPrice, discount, amount, tone }) {
        const amountClass = tone ? ` class="${tone}"` : '';
        return `
        <tr>
            <td>${index}</td>
            <td>${InvoiceTemplate.esc(name)}</td>
            <td>${InvoiceTemplate.esc(unit)}</td>
            <td style="text-align:right">${quantity}</td>
            <td style="text-align:right">${unitPrice}</td>
            <td style="text-align:right">${discount}</td>
            <td style="text-align:right;font-weight:600"${amountClass}>${amount}</td>
        </tr>`;
    }

    groupRow(label, tone) {
        return `<tr class="group group-${tone}"><td colspan="${InvoiceTemplate.COLUMN_COUNT}">${InvoiceTemplate.esc(label)}</td></tr>`;
    }

    emptyRow(text = 'Không có') {
        return `<tr class="empty"><td colspan="${InvoiceTemplate.COLUMN_COUNT}">${InvoiceTemplate.esc(text)}</td></tr>`;
    }

    totalRow({ label, value, tone, rowTone, grand }) {
        const rowClass = `row${grand ? ' grand' : ''}${rowTone ? ' ' + rowTone : ''}`;
        const valueClass = `value${tone ? ' ' + tone : ''}`;
        return `
    <div class="${rowClass}">
      <span class="label">${InvoiceTemplate.esc(label)}</span>
      <span class="${valueClass}">${value}</span>
    </div>`;
    }

    static esc(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
}
