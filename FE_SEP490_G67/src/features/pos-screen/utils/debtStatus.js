import { formatVnd } from './money';

export const DEBT_LEVEL = {
    GREEN: 'GREEN',
    YELLOW: 'YELLOW',
    RED: 'RED',
};

const LEVEL_META = {
    GREEN: { cls: 'debt-dot--green', label: 'Không nợ', canSell: true },
    YELLOW: { cls: 'debt-dot--yellow', label: 'Đang nợ', canSell: true },
    RED: { cls: 'debt-dot--red', label: 'Không cho nợ', canSell: false },
};

/**
 * Đỏ   = bị cấm nợ (allowDebt = false) -> không được ghi nợ thêm
 * Vàng = đang nợ, kể cả khi có đơn quá hạn -> vẫn cho nợ, cần xác nhận
 * Xanh = không nợ -> cho nợ
 */
export function debtLevel(customer) {
    if (!customer) return null;
    if (customer.allowDebt === false) return DEBT_LEVEL.RED;
    if (customer.debtStatus === 'IN_DEBT'
        || customer.debtStatus === 'OVERDUE'
        || customer.isOverdue === true) {
        return DEBT_LEVEL.YELLOW;
    }
    return DEBT_LEVEL.GREEN;
}

export function debtLevelMeta(customer) {
    const level = debtLevel(customer);
    return level ? LEVEL_META[level] : null;
}

/** Khách này có được ghi nợ không. Khách chưa chọn thì chưa được. */
export function canSellOnDebt(customer) {
    const level = debtLevel(customer);
    return level != null && LEVEL_META[level].canSell;
}

export function isOverdueCustomer(customer) {
    if (!customer) return false;
    return customer.debtStatus === 'OVERDUE'
        || customer.isOverdue === true
        || Number(customer.totalOverdueOrders ?? 0) > 0;
}

export const formatMoney = formatVnd;

export function debtSummaryText(customer) {
    if (!customer) return null;
    const orders = Number(customer.totalOrdersInDebt ?? 0);
    const overdue = Number(customer.totalOverdueOrders ?? 0);
    const total = Number(customer.totalDebt ?? 0);

    if (orders === 0 && total === 0) {
        return customer.allowDebt === false ? 'Không được phép mua nợ' : null;
    }

    const parts = [`${orders} đơn nợ`, formatMoney(total)];
    if (overdue > 0) parts.unshift(`${overdue} đơn quá hạn`);
    if (customer.allowDebt === false) parts.push('không được phép nợ');
    return parts.join(' · ');
}

/**
 * Lý do không cho ghi nợ, để hiện tooltip và banner. Null nghĩa là được phép.
 * Chỉ còn một lý do chặn: khách bị đánh dấu không được phép mua nợ.
 */
export function debtBlockReason(customer) {
    if (!customer) return 'Đơn nợ phải có thông tin khách hàng.';
    if (customer.allowDebt === false) return `${customer.fullName} không được phép mua nợ.`;
    return null;
}

/**
 * Cảnh báo (không chặn) khi khách còn đơn quá hạn — thu ngân vẫn ghi nợ được,
 * nhưng nên biết để nhắc khách trả nợ cũ.
 */
export function debtOverdueWarning(customer) {
    if (!isOverdueCustomer(customer)) return null;
    const overdue = Number(customer.totalOverdueOrders ?? 0);
    return overdue > 0
        ? `${customer.fullName} đang có ${overdue} đơn nợ quá hạn — nên nhắc khách thu xếp trả nợ cũ.`
        : `${customer.fullName} đang có đơn nợ quá hạn — nên nhắc khách thu xếp trả nợ cũ.`;
}
