import { CHECK_STATUS } from '../constants';

export function formatCurrency(value) {
    const amount = Number(value) || 0;
    return `${new Intl.NumberFormat('vi-VN').format(amount)} đ`;
}

export function formatDateTime(value) {
    if (!value) {
        return '—';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function computeLineDiff(line) {
    const systemQty = Number(line.systemQty) || 0;
    const actualQty = line.actualQty === null || line.actualQty === '' ? null : Number(line.actualQty);
    const importPrice = Number(line.importPrice) || 0;

    if (actualQty === null || Number.isNaN(actualQty)) {
        return { diffQty: null, diffValue: null };
    }

    const diffQty = actualQty - systemQty;
    return { diffQty, diffValue: diffQty * importPrice };
}

export function enrichCheckLine(line) {
    const { diffQty, diffValue } = computeLineDiff(line);
    return { ...line, diffQty, diffValue };
}

export function buildCheckSummary(lines) {
    const enriched = lines.map(enrichCheckLine);
    const countedLines = enriched.filter((line) => line.diffQty !== null);

    const totalSystemQty = enriched.reduce((sum, line) => sum + (Number(line.systemQty) || 0), 0);
    const totalActualQty = countedLines.reduce((sum, line) => sum + (Number(line.actualQty) || 0), 0);
    const totalDiffQty = countedLines.reduce((sum, line) => sum + (line.diffQty || 0), 0);
    const totalDiffValue = countedLines.reduce((sum, line) => sum + (line.diffValue || 0), 0);

    return {
        totalLines: enriched.length,
        totalSystemQty,
        totalActualQty: countedLines.length === enriched.length ? totalActualQty : null,
        totalDiffQty: countedLines.length === enriched.length ? totalDiffQty : null,
        totalDiffValue: countedLines.length === enriched.length ? totalDiffValue : null,
        countedLines: countedLines.length,
    };
}

export function filterInventoryChecks(items, { keyword, statusFilter, dateFilter }) {
    const normalizedKeyword = keyword.trim().toLowerCase();
    const now = new Date();

    return items.filter((item) => {
        const matchesKeyword =
            !normalizedKeyword ||
            item.code.toLowerCase().includes(normalizedKeyword) ||
            item.note?.toLowerCase().includes(normalizedKeyword) ||
            item.checker?.toLowerCase().includes(normalizedKeyword);

        const matchesStatus = statusFilter === 'all' || item.status === statusFilter;

        let matchesDate = true;
        if (dateFilter === 'this_month') {
            const checkDate = new Date(item.checkDate);
            matchesDate =
                checkDate.getMonth() === now.getMonth() &&
                checkDate.getFullYear() === now.getFullYear();
        } else if (dateFilter === 'last_month') {
            const checkDate = new Date(item.checkDate);
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            matchesDate =
                checkDate.getMonth() === lastMonth.getMonth() &&
                checkDate.getFullYear() === lastMonth.getFullYear();
        }

        return matchesKeyword && matchesStatus && matchesDate;
    });
}

export function getDiffClassName(value) {
    if (value === null || value === undefined) {
        return '';
    }

    if (value > 0) {
        return 'inventory-check-diff--positive';
    }

    if (value < 0) {
        return 'inventory-check-diff--negative';
    }

    return 'inventory-check-diff--zero';
}

export function formatDiffValue(value) {
    if (value === null || value === undefined) {
        return '—';
    }

    const prefix = value > 0 ? '+' : '';
    return `${prefix}${formatCurrency(value)}`;
}

export function formatDiffQty(value) {
    if (value === null || value === undefined) {
        return '—';
    }

    const prefix = value > 0 ? '+' : '';
    return `${prefix}${value}`;
}

export function isEditableStatus(status) {
    return status === CHECK_STATUS.IN_PROGRESS;
}
