import { SUPPLIER_DEBT_FILTER } from '../constants';

export function formatCurrency(value) {
    const amount = Number(value) || 0;
    return `${new Intl.NumberFormat('vi-VN').format(amount)}đ`;
}

export function filterSuppliers(suppliers, { keyword, debtFilter }) {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return suppliers.filter((supplier) => {
        const matchesKeyword =
            !normalizedKeyword ||
            supplier.name.toLowerCase().includes(normalizedKeyword) ||
            supplier.supplierCode.toLowerCase().includes(normalizedKeyword) ||
            supplier.phoneNumber.replace(/\s/g, '').includes(normalizedKeyword.replace(/\s/g, ''));

        const debt = Number(supplier.currentDebt) || 0;
        const matchesDebt =
            debtFilter === SUPPLIER_DEBT_FILTER.ALL ||
            (debtFilter === SUPPLIER_DEBT_FILTER.NO_DEBT && debt === 0) ||
            (debtFilter === SUPPLIER_DEBT_FILTER.HAS_DEBT && debt > 0);

        return matchesKeyword && matchesDebt;
    });
}

export function buildSummary(suppliers) {
    const totalDebt = suppliers.reduce((sum, item) => sum + (item.currentDebt || 0), 0);

    return {
        totalSuppliers: suppliers.length,
        totalDebt,
    };
}

export function paginateItems(items, page, pageSize) {
    const totalItems = items.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safePage = Math.min(Math.max(page, 1), totalPages);
    const startIndex = (safePage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalItems);

    return {
        items: items.slice(startIndex, endIndex),
        page: safePage,
        pageSize,
        totalItems,
        totalPages,
        startIndex: totalItems === 0 ? 0 : startIndex + 1,
        endIndex,
    };
}

export function formatDate(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('vi-VN');
}

export function formatDateTime(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function getSupplierDetailById(id, listSuppliers, detailsMap, buildFallback) {
    const numericId = Number(id);
    if (detailsMap[numericId]) {
        return detailsMap[numericId];
    }
    const fromList = listSuppliers.find((item) => item.id === numericId);
    if (fromList) {
        return buildFallback(fromList);
    }
    return null;
}
export function removeVietnameseTones(str) {
    if (!str) return "";
    
    str = str.toLowerCase();
    
    str = str.normalize('NFD') 
           .replace(/[\u0300-\u036f]/g, ''); 
           

    str = str.replace(/đ/g, 'd');
    
    return str.trim();
}
