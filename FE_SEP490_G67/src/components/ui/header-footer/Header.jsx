import { useEffect, useState, useRef } from 'react';
import { Bell, User, Store, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getProfile } from '../../../features/profile/api';
import { PROFILE_ROUTES } from '../../../features/profile/constants';
import { getRoleLabel } from '../../../features/profile/utils/profileUtils';
import '../../../css/AdminHeader.css';

export default function AdminHeader({ user, activePage}) {
	const navigate = useNavigate();
	const [headerUser, setHeaderUser] = useState(user ?? null);
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const dropdownRef = useRef(null);
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

	useEffect(() => {
		function handleClickOutside(event) {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
				setIsDropdownOpen(false);
			}
		}

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [dropdownRef]);

	const dropdownItems = [
		{
			id: 'profile',
			label: 'Thông tin tài khoản',
			icon: <User size={16} />,
			onClick: () => navigate(PROFILE_ROUTES.view),
			show: true, 
		},
		{
			id: 'store',
			label: 'Thông tin cửa hàng',
			icon: <Store size={16} />,
			onClick: () => navigate('/admin/store'),
			show: headerUser?.role === 'ADMIN',
		},
		{
			id: 'settings',
			label: 'Cài đặt',
			icon: <Settings size={16} />,
			onClick: () => {
				/* Navigate to settings */
			},
			show: true,
		},
		{ id: 'divider', type: 'divider', show: true },
	];

	return (
		<header className="admin-header">
			{/* Left: Store name + Status */}
			{/* <div className="header-left">
				<span className="header-store-name">Cửa Hàng Tạp Hóa Đức Thắng</span>
			</div> */}

			{/* Right: Actions */}
			<div className="header-actions">
				<button className="header-btn" aria-label="Thông báo">
					<Bell size={18} />
					<span className="notification-badge">3</span>
				</button>

				<div className="header-divider" />

				<div className="header-user" ref={dropdownRef}>
					<div className="header-user__info">
						<span className="header-user__name">{displayName}</span>
						<span className="header-user__role">{displayRole}</span>
					</div>
					<button
						className={`header-btn header-btn--profile${activePage === 'profile' ? ' header-btn--active' : ''}`}
						aria-label="Hồ sơ người dùng"
						onClick={() => setIsDropdownOpen(!isDropdownOpen)}
					>
						<User size={18} />
					</button>

					{isDropdownOpen && (
						<div className="user-dropdown">
							<div className="user-dropdown__header">
								<span className="user-dropdown__name">{displayName}</span>
							</div>
							<div className="user-dropdown__divider" />
							{dropdownItems.map((item) => {
								if (!item.show) return null; 

								if (item.type === 'divider') {
									return <div key={item.id} className="user-dropdown__divider" />;
								}

								return (
									<button
										key={item.id}
										className={`user-dropdown__item ${item.className || ''}`}
										onClick={item.onClick}
									>
										{item.icon}
										<span>{item.label}</span>
									</button>
								);
							})}
						</div>
					)}
				</div>
			</div>
		</header>
	);
}
