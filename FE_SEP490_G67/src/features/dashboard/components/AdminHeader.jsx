import { useEffect, useState } from 'react';
import { Bell, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getProfile } from '../../profile/api';
import { PROFILE_ROUTES } from '../../profile/constants';
import { getRoleLabel } from '../../profile/utils/profileUtils';
import '../../../css/AdminHeader.css';

export default function AdminHeader({ user, activePage }) {
	const navigate = useNavigate();
	const [headerUser, setHeaderUser] = useState(user ?? null);

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
			<div className="header-actions">
				<button className="header-btn" aria-label="Thông báo">
					<Bell size={20} />
					<span className="notification-badge">3</span>
				</button>

				<div className="header-user">
					<div className="header-user__info">
						<span className="header-user__name">
							{headerUser?.fullName ?? '—'}
						</span>
						<span className="header-user__role">
							{headerUser?.role ? getRoleLabel(headerUser.role) : '—'}
						</span>
					</div>
					<button
						className={`header-btn header-btn--profile${activePage === 'profile' ? ' header-btn--active' : ''}`}
						aria-label="Hồ sơ người dùng"
						onClick={() => navigate(PROFILE_ROUTES.view)}
					>
						<User size={20} />
					</button>
				</div>
			</div>
		</header>
	);
}
