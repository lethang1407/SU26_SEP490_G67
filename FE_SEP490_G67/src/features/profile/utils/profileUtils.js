const ROLE_LABELS = {
	ADMIN: 'Quản trị viên',
	STAFF: 'Nhân viên',
};

const STATUS_LABELS = {
	ACTIVE: 'Tài khoản đang hoạt động',
	INACTIVE: 'Tài khoản ngừng hoạt động',
	SUSPENDED: 'Tài khoản tạm khóa',
};

export function getRoleLabel(role) {
	return ROLE_LABELS[role] ?? role;
}

export function getStatusLabel(status) {
	return STATUS_LABELS[status] ?? status;
}

export function isAccountActive(status) {
	return status === 'ACTIVE';
}

export function formatPhoneNumber(phone) {
	if (!phone) return '—';

	let digits = phone.replace(/\D/g, '');

	if (digits.startsWith('84')) {
		digits = '0' + digits.slice(2);
	} else if (!digits.startsWith('0')) {
		digits = '0' + digits;
	}

	// Di động: 0xxx xxx xxx (vd: 0901 234 567)
	if (digits.length === 10 && /^0[35789]/.test(digits)) {
		return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
	}

	// Cố định: 0xx xxxx xxxx (vd: 024 1234 5678)
	if (digits.length === 11 && /^02/.test(digits)) {
		return `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7)}`;
	}

	if (digits.length < 10 || digits.length > 11) {
		return phone;
	}

	return digits;
}
