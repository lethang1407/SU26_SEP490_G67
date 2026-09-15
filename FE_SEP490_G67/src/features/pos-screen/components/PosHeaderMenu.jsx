import { useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Home, Menu, LayoutDashboard, User } from "lucide-react";
import { AuthContext } from "@/app/providers/AuthProvider";
import { PROFILE_ROUTES } from "@/features/profile/constants";

const MANAGE_ROUTE = '/admin/dashboard';

/**
 * Nút góc phải header POS.
 * - MANAGER: giữ nút Home, bấm là về trang quản lý.
 * - STAFF: nút Menu, mở 2 dòng "Quản lý" và "Tài khoản".
 */
export default function PosHeaderMenu() {
    const navigate = useNavigate();
    const { hasRole } = useContext(AuthContext);
    const [open, setOpen] = useState(false);
    const wrapperRef = useRef(null);

    // Chỉ có MANAGER và STAFF. Tài khoản có cả hai thì giữ giao diện quản lý.
    const isStaff = hasRole('STAFF') && !hasRole('MANAGER');

    useEffect(() => {
        if (!open) return undefined;
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setOpen(false);
            }
        };
        const handleEscape = (event) => {
            if (event.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [open]);

    if (!isStaff) {
        return (
            <button className="icon-btn" onClick={() => navigate(MANAGE_ROUTE)} title="Trang chủ POS">
                <Home size={24} />
            </button>
        );
    }

    const go = (path) => {
        setOpen(false);
        navigate(path);
    };

    return (
        <div className="pos-menu" ref={wrapperRef}>
            <button
                className="icon-btn"
                onClick={() => setOpen(prev => !prev)}
                title="Menu"
                aria-haspopup="menu"
                aria-expanded={open}
            >
                <Menu size={24} />
            </button>

            {open && (
                <div className="pos-menu-dropdown" role="menu">
                    <button className="pos-menu-item" role="menuitem" onClick={() => go(MANAGE_ROUTE)}>
                        <LayoutDashboard size={16} />
                        <span>Quản lý</span>
                    </button>
                    <button className="pos-menu-item" role="menuitem" onClick={() => go(PROFILE_ROUTES.view)}>
                        <User size={16} />
                        <span>Tài khoản</span>
                    </button>
                </div>
            )}
        </div>
    );
}
