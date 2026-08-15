export function formatCurrency(value) {
    const amount = Number(value) || 0;
    return `${new Intl.NumberFormat('vi-VN').format(amount)}đ`;
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

export function removeVietnameseTones(str) {
    if (!str) return '';

    return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .trim();
}

const SUPPLIER_FIELD_LIMITS = {
    name: 150,
    contactPerson: 100,
    phoneNumber: 15,
    address: 255,
    notes: 255,
};

function normalizePhoneDigits(phone) {
    if (!phone) return '';
    let digits = String(phone).replace(/\D/g, '');
    if (digits.startsWith('84')) {
        digits = `0${digits.slice(2)}`;
    } else if (digits && !digits.startsWith('0')) {
        digits = `0${digits}`;
    }
    return digits;
}

function isValidSupplierPhone(phone) {
    const digits = normalizePhoneDigits(phone);
    if (!digits) return true;
    if (digits.length === 10 && /^0[35789]/.test(digits)) return true;
    if (digits.length === 11 && /^02/.test(digits)) return true;
    return false;
}

/** Validate form thêm/sửa nhà cung cấp. Trả về object lỗi theo field. */
export function validateSupplierForm(formData) {
    const errors = {};
    const name = (formData.name || '').trim();
    const contactPerson = (formData.contactPerson || '').trim();
    const phoneNumber = (formData.phoneNumber || '').trim();
    const address = (formData.address || '').trim();
    const notes = (formData.notes || '').trim();

    if (!name) {
        errors.name = 'Tên nhà cung cấp không được để trống';
    } else if (name.length > SUPPLIER_FIELD_LIMITS.name) {
        errors.name = `Tên nhà cung cấp không được vượt quá ${SUPPLIER_FIELD_LIMITS.name} ký tự`;
    }

    if (contactPerson.length > SUPPLIER_FIELD_LIMITS.contactPerson) {
        errors.contactPerson = `Người liên hệ không được vượt quá ${SUPPLIER_FIELD_LIMITS.contactPerson} ký tự`;
    }

    if (phoneNumber) {
        if (phoneNumber.length > SUPPLIER_FIELD_LIMITS.phoneNumber) {
            errors.phoneNumber = `Số điện thoại không được vượt quá ${SUPPLIER_FIELD_LIMITS.phoneNumber} ký tự`;
        } else if (!isValidSupplierPhone(phoneNumber)) {
            errors.phoneNumber = 'Số điện thoại không hợp lệ';
        }
    }

    if (address.length > SUPPLIER_FIELD_LIMITS.address) {
        errors.address = `Địa chỉ không được vượt quá ${SUPPLIER_FIELD_LIMITS.address} ký tự`;
    }

    if (notes.length > SUPPLIER_FIELD_LIMITS.notes) {
        errors.notes = `Ghi chú không được vượt quá ${SUPPLIER_FIELD_LIMITS.notes} ký tự`;
    }

    return errors;
}
