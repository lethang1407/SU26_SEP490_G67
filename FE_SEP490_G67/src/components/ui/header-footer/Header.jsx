import { useEffect, useState, useRef } from 'react';
import { User, Store, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import NotificationBell from '../../../features/notification/components/NotificationBell';
import { getProfile } from '../../../features/profile/api';
import { PROFILE_ROUTES } from '../../../features/profile/constants';
import { getRoleLabel } from '../../../features/profile/utils/profileUtils';
import { useSidebarCollapse } from '../../../app/providers/SidebarCollapseProvider';
import '../../../css/AdminHeader.css';

export default function AdminHeader({ user, activePage }) {
    const navigate = useNavigate();
    const { collapsed, toggle } = useSidebarCollapse();
    const [headerUser, setHeaderUser] = useState(user ?? null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const displayName = headerUser?.fullName ?? '—';
    const displayRole = headerUser?.roles ? getRoleLabel(headerUser.roles) : '—';

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
            show: headerUser?.roles?.includes('ADMIN'),
        },
        { id: 'divider', type: 'divider', show: true },
    ];

    return (
        <header className="admin-header">
            <div className="header-left">
                <button
                    type="button"
                    className="header-btn header-btn--sidebar"
                    onClick={toggle}
                    aria-label={collapsed ? 'Mở menu' : 'Thu gọn menu'}
                    title={collapsed ? 'Mở menu' : 'Thu gọn menu'}
                >
                    {collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
                </button>
            </div>

            {/* Right: Actions */}
            <div className="header-actions">
                {/* Bell – Thông báo: nơi duy nhất hiển thị thông báo, có mặt ở mọi trang */}
                <NotificationBell />

                <div className="header-divider" />

                {/* User info + avatar + dropdown */}
                <div className="header-user" ref={dropdownRef}>
                    <div className="header-user_info">
                        <span className="header-user_name">{displayName}</span>
                        <span className="header-user_role">{displayRole}</span>
                    </div>
                    <button
                        className={`header-btn header-btn--profile${activePage === 'profile' ? ' header-btn--active' : ''}`}
                        aria-label="Hồ sơ người dùng"
                        type="button"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    >
                        <User size={18} />
                    </button>

                    {isDropdownOpen && (
                        <div className="user-dropdown">
                            <div className="user-dropdown_header">
                                <span className="user-dropdown_name">{displayName}</span>
                            </div>
                            <div className="user-dropdown_divider" />
                            {dropdownItems.map((item) => {
                                if (!item.show) return null;
                                if (item.type === 'divider') {
                                    return <div key={item.id} className="user-dropdown_divider" />;
                                }
                                return (
                                    <button
                                        key={item.id}
                                        className={`user-dropdown_item ${item.className || ''}`}
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
