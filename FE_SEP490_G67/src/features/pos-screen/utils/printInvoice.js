import InvoiceTemplate from './InvoiceTemplate.js';

const PAYMENT_LABELS = {
    CASH: 'Tiền mặt',
    TRANSFER: 'Chuyển khoản',
    DEBT: 'Bán nợ',
};

class InvoiceDocument {

    constructor(data, template = new InvoiceTemplate()) {
        this.data = data;
        this.t = template;
        this.isExchange = data.kind === 'EXCHANGE';
        this.isCancelled = data.orderStatus === 'CANCELLED';
        this.docCode = data.orderCode ?? String(data.orderId ?? '');
    }

    money(num) {
        const { currency } = this.data;
        return num != null
            ? Number(num).toLocaleString('vi-VN') + ' ' + (currency ?? 'VND')
            : '—';
    }

    amount(num) {
        return Number(num ?? 0).toLocaleString('vi-VN');
    }

    get methodLabel() {
        const { paymentMethod, refundMethod } = this.data;
        const raw = this.isExchange ? refundMethod : paymentMethod;
        return PAYMENT_LABELS[raw] ?? raw ?? '';
    }

    cancelBadge() {
        return this.isCancelled ? this.t.badge('ĐÃ HỦY', '#6b7280') : '';
    }

    debtBadge() {
        // Cờ isCheckDebtUnstable là việc nội bộ giữa nhân viên và quản lý,
        // không in lên hóa đơn của khách.
        return this.data.isDebt && !this.isCancelled
            ? this.t.badge('BÁN NỢ', '#6b7280')
            : '';
    }

    customerSection() {
        const { customer } = this.data;
        return customer
            ? this.t.metaCell('Khách', customer.fullName ?? '')
            + '\n    ' + this.t.metaCell('SĐT', customer.phoneNumber ?? '')
            : this.t.wideCell('Khách', 'Khách lẻ');
    }

    paymentSection() {
        const {
            originalOrderCode, netAmount = 0, isDebtOrder = false, cashRefundAmount = 0,
        } = this.data;
        if (!this.isExchange) {
            return this.t.metaCell('Thanh toán', this.methodLabel);
        }
        // Đơn nợ: hướng tiền do phần cấn trừ quyết định, không suy từ netAmount.
        const refunding = isDebtOrder ? cashRefundAmount > 0 : netAmount > 0;
        return this.t.metaCell('Hóa đơn gốc', originalOrderCode ?? '—')
            + '\n    ' + this.t.metaCell(refunding ? 'Hoàn tiền' : 'Thanh toán', this.methodLabel);
    }

    itemRows() {
        const { items = [], returnItems = [], exchangeItems = [] } = this.data;

        if (!this.isExchange) {
            return items.map((item, i) => this.lineRow(item, i)).join('');
        }

        return this.t.groupRow('Hàng khách trả lại', 'out')
            + this.group(returnItems, 'out')
            + this.t.groupRow('Hàng khách lấy mới', 'in')
            + this.group(exchangeItems, 'in');
    }

    group(items, tone) {
        return items.length
            ? items.map((item, i) => this.lineRow(item, i, tone)).join('')
            : this.t.emptyRow();
    }

    lineRow(item, idx, tone) {
        return this.t.lineRow({
            index: idx + 1,
            name: item.productName ?? '',
            unit: item.unitName ?? '—',
            quantity: item.quantity ?? 0,
            unitPrice: this.amount(item.unitPrice),
            discount: item.discountAmount > 0 ? this.amount(item.discountAmount) : '—',
            amount: this.amount(item.lineTotal),
            tone,
        });
    }

    totalRows() {
        const rows = this.isExchange ? this.exchangeTotals() : this.salesTotals();
        return rows.join('');
    }

    exchangeTotals() {
        const {
            returnSubtotal = 0, exchangeSubtotal = 0, netAmount = 0,
            isDebtOrder = false,
            debtOffsetAmount = 0, cashRefundAmount = 0, cashCollectAmount = 0,
            debtPaymentCollected = 0, newDebtOnExchange = 0, debtRemainingAfter = 0,
            exchangeOrderCode,
        } = this.data;

        const rows = [
            this.t.totalRow({ label: 'Hàng trả lại:', value: this.money(returnSubtotal), tone: 'out' }),
            this.t.totalRow({ label: 'Hàng lấy mới:', value: this.money(exchangeSubtotal), tone: 'in' }),
        ];

        if (!isDebtOrder) {
            const netLabel = netAmount > 0 ? 'TIỀN HOÀN CHO KHÁCH:'
                : netAmount < 0 ? 'KHÁCH THANH TOÁN THÊM:'
                    : 'KHÔNG PHÁT SINH TIỀN:';
            rows.push(this.t.totalRow({
                label: netLabel, value: this.money(Math.abs(netAmount)), grand: true,
            }));
            return rows;
        }

        if (debtOffsetAmount > 0) {
            rows.push(this.t.totalRow({
                label: 'Cấn trừ công nợ:', value: '- ' + this.money(debtOffsetAmount), tone: 'out',
            }));
        }
        if (newDebtOnExchange > 0) {
            rows.push(this.t.totalRow({
                label: 'Ghi nợ đơn đổi' + (exchangeOrderCode ? ` ${exchangeOrderCode}` : '') + ':',
                value: '+ ' + this.money(newDebtOnExchange), tone: 'in',
            }));
        }
        if (debtPaymentCollected > 0) {
            rows.push(this.t.totalRow({
                label: 'Khách nộp thêm nợ cũ:', value: '- ' + this.money(debtPaymentCollected), tone: 'out',
            }));
        }

        const cashIn = cashCollectAmount + debtPaymentCollected;
        rows.push(cashRefundAmount > 0
            ? this.t.totalRow({
                label: 'TIỀN HOÀN CHO KHÁCH:', value: this.money(cashRefundAmount), grand: true,
            })
            : cashIn > 0
                ? this.t.totalRow({
                    label: 'KHÁCH THANH TOÁN:', value: this.money(cashIn), grand: true,
                })
                : this.t.totalRow({
                    label: 'KHÔNG PHÁT SINH TIỀN:', value: this.money(0), grand: true,
                }));

        rows.push(this.t.totalRow({
            label: 'Nợ còn lại hóa đơn gốc:', value: this.money(debtRemainingAfter),
        }));

        return rows;
    }

    salesTotals() {
        const {
            subtotal, discountAmount, totalAmount, isDebt, paidAmount, remainingDebt, dueDate,
        } = this.data;

        const rows = [
            this.t.totalRow({ label: 'Tổng tiền hàng:', value: this.money(subtotal) }),
        ];

        if (discountAmount > 0) {
            rows.push(this.t.totalRow({ label: 'Giảm giá:', value: '- ' + this.money(discountAmount) }));
        }

        rows.push(this.t.totalRow({ label: 'TỔNG CỘNG:', value: this.money(totalAmount), grand: true }));

        if (isDebt) {
            // Trả trước một phần: paidAmount > 0. Nợ toàn bộ: paidAmount = 0.
            rows.push(this.t.totalRow({ label: 'Đã thanh toán:', value: this.money(paidAmount) }));
            rows.push(this.t.totalRow({
                label: 'Còn nợ:', value: this.money(remainingDebt), tone: 'out', rowTone: 'out',
            }));
            if (dueDate) {
                rows.push(this.t.totalRow({
                    label: 'Hạn trả nợ:', value: new Date(dueDate).toLocaleDateString('vi-VN'),
                }));
            }
        }

        return rows;
    }

    toHtml() {
        const { storeName, storeAddress, taxCode, createdAtVn, cashierName } = this.data;
        const esc = InvoiceTemplate.esc;

        return this.t.render({
            PAGE_TITLE: `${this.isExchange ? 'Phiếu đổi trả' : 'Hóa đơn'} - ${esc(this.docCode)}`,
            DOC_HEADING: this.isExchange ? 'Phiếu đổi trả hàng' : 'Hóa đơn bán hàng',
            ORDER_CODE: esc(this.docCode),
            STORE_NAME: esc(storeName ?? 'Cửa hàng'),
            STORE_ADDRESS_BLOCK: storeAddress ? this.t.storeLine(storeAddress) : '',
            TAX_CODE_BLOCK: taxCode ? this.t.storeLine(`MST: ${taxCode}`) : '',
            CANCEL_BADGE: this.cancelBadge(),
            DEBT_BADGE: this.debtBadge(),
            CREATED_AT: esc(createdAtVn ?? '—'),
            CASHIER_NAME: esc(cashierName ?? '—'),
            CUSTOMER_SECTION: this.customerSection(),
            PAYMENT_SECTION: this.paymentSection(),
            ITEM_ROWS: this.itemRows(),
            TOTAL_ROWS: this.totalRows(),
        });
    }
}

export function buildInvoiceHtml(data) {
    return new InvoiceDocument(data).toHtml();
}

export function printInvoice(data) {
    if (!data) return;

    const html = buildInvoiceHtml(data);

    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.position = 'fixed';
    frame.style.right = '0';
    frame.style.bottom = '0';
    frame.style.width = '0';
    frame.style.height = '0';
    frame.style.border = '0';
    document.body.appendChild(frame);

    const cleanup = () => {
        setTimeout(() => frame.remove(), 1000);
    };
    let printed = false;
    const printOnce = () => {
        if (printed) return;
        printed = true;
        try {
            frame.contentWindow.focus();
            frame.contentWindow.print();
        } finally {
            cleanup();
        }
    };

    frame.onload = printOnce;

    const doc = frame.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();

    if (doc.readyState === 'complete') printOnce();
}
