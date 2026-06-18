export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 64;

const WEAK_PASSWORDS = new Set([
	'12345678',
	'123456789',
	'11111111',
	'87654321',
	'password',
	'password123',
	'abcdefgh',
	'qwertyui',
	'admin123',
	'letmein',
	'ducthang',
	'00000000',
]);

export const PASSWORD_POLICY_HINT =
	`Ít nhất ${PASSWORD_MIN_LENGTH} ký tự, có ít nhất 1 chữ cái và 1 chữ số, `;

function validateNewPassword(newPassword, username) {
	if (!newPassword) {
		return 'Mật khẩu mới không được để trống.';
	}

	if (newPassword.length < PASSWORD_MIN_LENGTH || newPassword.length > PASSWORD_MAX_LENGTH) {
		return `Mật khẩu phải có từ ${PASSWORD_MIN_LENGTH} đến ${PASSWORD_MAX_LENGTH} ký tự.`;
	}

	if (!/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
		return 'Mật khẩu phải có ít nhất 1 chữ cái và 1 chữ số.';
	}

	if (username && newPassword.toLowerCase().includes(username.toLowerCase())) {
		return 'Mật khẩu không được chứa tên đăng nhập.';
	}

	if (WEAK_PASSWORDS.has(newPassword.toLowerCase())) {
		return 'Mật khẩu quá phổ biến, vui lòng chọn mật khẩu khác.';
	}

	return null;
}

export function validateChangePasswordForm(
	{ currentPassword, newPassword, confirmNewPassword },
	username = '',
) {
	const errors = {};

	if (!currentPassword?.trim()) {
		errors.currentPassword = 'Mật khẩu hiện tại không được để trống.';
	}

	const newPasswordError = validateNewPassword(newPassword, username);
	if (newPasswordError) {
		errors.newPassword = newPasswordError;
	}

	if (!confirmNewPassword) {
		errors.confirmNewPassword = 'Vui lòng xác nhận mật khẩu mới.';
	} else if (newPassword && confirmNewPassword !== newPassword) {
		errors.confirmNewPassword = 'Mật khẩu xác nhận không khớp.';
	}

	if (
		currentPassword &&
		newPassword &&
		currentPassword === newPassword &&
		!errors.newPassword
	) {
		errors.newPassword = 'Mật khẩu mới không được trùng mật khẩu hiện tại.';
	}

	return errors;
}
