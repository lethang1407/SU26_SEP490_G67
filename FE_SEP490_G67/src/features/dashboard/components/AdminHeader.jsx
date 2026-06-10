import { Bell, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MOCK_PROFILE } from '../../profile/constants';
import '../../../css/AdminHeader.css';

export default function AdminHeader({ user, activePage }) {
	const navigate = useNavigate();
	const displayUser = user ?? MOCK_PROFILE;

	return (
		<header className="admin-header">
			<div className="header-actions">
				<button className="header-btn" aria-label="Thông báo">
					<Bell size={20} />
					<span className="notification-badge">3</span>
				</button>

				<div className="header-user">
					<div className="header-user__info">
						<span className="header-user__name">{displayUser.fullName}</span>
						<span className="header-user__role">{displayUser.role}</span>
					</div>
					<button
						className={`header-btn header-btn--profile${activePage === 'profile' ? ' header-btn--active' : ''}`}
						aria-label="Hồ sơ người dùng"
						onClick={() => navigate('/admin/profile')}
					>
						<User size={20} />
					</button>
				</div>
			</div>
		</header>
	);
}
