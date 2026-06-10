// Mock user — dùng tạm khi chưa có login/token.
// Sau này thay bằng dữ liệu từ AuthProvider hoặc GET /users/me
export const MOCK_PROFILE = {
	id: 1,
	fullName: 'Nguyễn Đức Thắng',
	username: 'admin',
	phoneNumber: '0901234567',
	role: 'ADMIN',
	status: 'ACTIVE',
	createdAt: '2024-01-15T08:00:00Z',
};
