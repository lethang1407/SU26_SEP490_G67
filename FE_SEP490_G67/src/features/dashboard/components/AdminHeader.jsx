import { useEffect, useState } from 'react';
import { Bell, HelpCircle, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getProfile } from '../../profile/api';
import { PROFILE_ROUTES } from '../../profile/constants';
import { getRoleLabel } from '../../profile/utils/profileUtils';
import '../../../css/AdminHeader.css';

export default function AdminHeader({ user, activePage, isOnline = true }) {
	const navigate = useNavigate();
	const [headerUser, setHeaderUser] = useState(user ?? null);
	const displayName = headerUser?.fullName ?? '—';
	const displayRole = headerUser?.role ? getRoleLabel(headerUser.role) : '—';

	useEffect(() => {
		if (user) {
			setHeaderUser(user);
			return;
		}

		getProfile()
			.then(setHeaderUser)
			.catch(() => setHeaderUser(null));
	}, [user]);

	return (
		<header className="admin-header">
			{/* Left: Store name + Status */}
			<div className="header-left">
				<span className="header-store-name">Cửa Hàng Đức Thắng</span>
				<span className={`header-status header-status--${isOnline ? 'online' : 'offline'}`}>
					<span className={`header-status__dot header-status__dot--${isOnline ? 'online' : 'offline'}`} />
					{isOnline ? 'Đang kết nối' : 'Ngoại tuyến'}
				</span>
			</div>

			{/* Right: Actions */}
			<div className="header-actions">
				<button className="header-btn" aria-label="Thông báo">
					<Bell size={18} />
					<span className="notification-badge">3</span>
				</button>

				<button className="header-btn" aria-label="Trợ giúp">
					<HelpCircle size={18} />
				</button>

				<div className="header-divider" />

				<div className="header-user">
					<div className="header-user__info">
						<span className="header-user__name">{displayName}</span>
						<span className="header-user__role">{displayRole}</span>
					</div>
					<button
						className={`header-btn header-btn--profile${activePage === 'profile' ? ' header-btn--active' : ''}`}
						aria-label="Hồ sơ người dùng"
						onClick={() => navigate(PROFILE_ROUTES.view)}
					>
						<User size={18} />
					</button>
				</div>
			</div>

			{/* Offline Banner */}
			{!isOnline && (
				<div className="offline-banner">
					<span className="offline-banner__icon">🔌</span>
					<span>Ngoại tuyến — Dữ liệu chưa đồng bộ. 3 giao dịch đang chờ upload.</span>
				</div>
			)}
		</header>
	);
}
