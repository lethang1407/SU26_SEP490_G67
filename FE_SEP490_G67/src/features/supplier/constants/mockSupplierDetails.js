import { SUPPLIER_STATUS } from './index';

export const DEBT_ENTRY_TYPE = {
    DEBT_INCREASE: 'DEBT_INCREASE',
    PAYMENT: 'PAYMENT',
    RETURN: 'RETURN',
};

export const DEBT_ENTRY_LABEL = {
    DEBT_INCREASE: 'Phát sinh nợ',
    PAYMENT: 'Thanh toán',
    RETURN: 'Trả hàng',
};

export const IMPORT_PAYMENT_TYPE = {
    IMMEDIATE: 'IMMEDIATE',
    CONSIGNMENT: 'CONSIGNMENT',
};

export const IMPORT_PAYMENT_LABEL = {
    IMMEDIATE: 'Trả ngay',
    CONSIGNMENT: 'Bán thử',
};

export const IMPORT_ORDER_STATUS = {
    COMPLETED: 'COMPLETED',
    CONSIGNMENT_OPEN: 'CONSIGNMENT_OPEN',
    PAID: 'PAID',
    RETURNED: 'RETURNED',
};

export const IMPORT_ORDER_STATUS_LABEL = {
    COMPLETED: 'Hoàn tất',
    CONSIGNMENT_OPEN: 'Đang bán thử',
    PAID: 'Đã trả tiền',
    RETURNED: 'Đã trả hàng',
};

/** Mock chi tiết — key theo id NCC */
export const MOCK_SUPPLIER_DETAILS = {
    1: {
        id: 1,
        supplierCode: 'NCC001',
        name: 'Công ty CP Sữa Việt Nam (Vinamilk)',
        phoneNumber: '028 3930 0358',
        address: '10 Tân Trào, Phường Tân Phú, Quận 7, TP. HCM',
        shortLocation: 'Quận 7, TP. Hồ Chí Minh',
        contactPerson: 'Nguyễn Trần Minh Anh',
        categories: ['Sữa', 'Sữa chua', 'Kem'],
        notes: 'Gọi hỏi giá trước khi đặt hàng số lượng lớn.',
        currentDebt: 0,
        totalDebt: 320000000,
        totalPaid: 320000000,
        status: SUPPLIER_STATUS.ACTIVE,
        lastImportOrderCode: 'NH-2025-452',
        lastImportDate: '2025-10-15',
        importHistory: [
            {
                id: 101,
                orderCode: 'NH-2025-452',
                receivedDate: '2025-10-15',
                paymentType: IMPORT_PAYMENT_TYPE.IMMEDIATE,
                totalCost: 85000000,
                status: IMPORT_ORDER_STATUS.COMPLETED,
            },
            {
                id: 98,
                orderCode: 'NH-2025-401',
                receivedDate: '2025-09-02',
                paymentType: IMPORT_PAYMENT_TYPE.IMMEDIATE,
                totalCost: 120000000,
                status: IMPORT_ORDER_STATUS.COMPLETED,
            },
        ],
        debtHistory: [
            {
                id: 1,
                entryType: DEBT_ENTRY_TYPE.DEBT_INCREASE,
                amount: 85000000,
                occurredAt: '2025-10-15T08:00:00',
                referenceCode: 'NH-2025-452',
                notes: 'Nhập sữa tươi',
            },
            {
                id: 2,
                entryType: DEBT_ENTRY_TYPE.PAYMENT,
                amount: 85000000,
                occurredAt: '2025-10-16T10:30:00',
                referenceCode: 'NH-2025-452',
                notes: 'Thanh toán tiền mặt',
            },
        ],
    },
    2: {
        id: 2,
        supplierCode: 'NCC002',
        name: 'NPP Gia dụng Minh Anh',
        phoneNumber: '0905 123 456',
        address: '45 Lê Văn Khương, Quận 12, TP. HCM',
        shortLocation: 'Quận 12, TP. HCM',
        contactPerson: 'Trần Văn B',
        categories: ['Gia dụng'],
        notes: 'Thường giao hàng buổi sáng.',
        currentDebt: 45000000,
        totalDebt: 125000000,
        totalPaid: 80000000,
        status: SUPPLIER_STATUS.HAS_DEBT,
        lastImportOrderCode: 'NH-2025-118',
        lastImportDate: '2025-11-02',
        importHistory: [
            {
                id: 201,
                orderCode: 'NH-2025-118',
                receivedDate: '2025-11-02',
                paymentType: IMPORT_PAYMENT_TYPE.CONSIGNMENT,
                totalCost: 45000000,
                status: IMPORT_ORDER_STATUS.CONSIGNMENT_OPEN,
            },
            {
                id: 185,
                orderCode: 'NH-2025-090',
                receivedDate: '2025-08-20',
                paymentType: IMPORT_PAYMENT_TYPE.IMMEDIATE,
                totalCost: 80000000,
                status: IMPORT_ORDER_STATUS.COMPLETED,
            },
        ],
        debtHistory: [
            {
                id: 10,
                entryType: DEBT_ENTRY_TYPE.DEBT_INCREASE,
                amount: 45000000,
                occurredAt: '2025-11-02T09:00:00',
                referenceCode: 'NH-2025-118',
                notes: 'Bán thử sản phẩm mới',
            },
            {
                id: 11,
                entryType: DEBT_ENTRY_TYPE.PAYMENT,
                amount: 30000000,
                occurredAt: '2025-10-10T14:00:00',
                referenceCode: 'NH-2025-090',
                notes: 'Trả một phần đơn trước',
            },
        ],
    },
};

/** Fallback: tạo detail tối thiểu từ item list */
export function buildFallbackDetail(supplier) {
    return {
        ...supplier,
        shortLocation: supplier.address?.split(',').slice(-2).join(',').trim() || supplier.address,
        notes: '',
        totalDebt: supplier.currentDebt || 0,
        totalPaid: 0,
        lastImportOrderCode: null,
        lastImportDate: null,
        importHistory: [],
        debtHistory: supplier.currentDebt
            ? [
                  {
                      id: 1,
                      entryType: DEBT_ENTRY_TYPE.DEBT_INCREASE,
                      amount: supplier.currentDebt,
                      occurredAt: new Date().toISOString(),
                      referenceCode: null,
                      notes: 'Dữ liệu mẫu',
                  },
              ]
            : [],
    };
}
