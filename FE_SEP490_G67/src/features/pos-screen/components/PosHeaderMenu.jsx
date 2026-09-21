import { useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Home, Menu, LayoutDashboard, User, Search, X, Plus } from "lucide-react";
import { AuthContext } from "@/app/providers/AuthProvider";
import { PROFILE_ROUTES } from "@/features/profile/constants";
import ProductSearchDropdown from "./ProductSearchDropdown";

const MANAGE_ROUTE = '/admin/dashboard';

export function PosHeaderLeft({
    searchInput,
    onSearchInputChange,
    scanning,
    showDropdown,
    searchResults,
    searchLoading,
    searchError,
    onSelectProduct,
    onCloseDropdown,
    tabs,
    tabLabels,
    activeTabId,
    onSelectTab,
    onCloseTab,
    onAddTab,
    maxTabs,
}) {
    const atTabLimit = tabs.length >= maxTabs;
    // Tab duy nhất thì không cho đóng — đóng xong màn hình không còn gì.
    const closable = tabs.length > 1;

    return (
        <div className="pos-header-left">
            <div className="search-wrapper">
                <Search className="search-icon" size={18} />
                <input
                    type="text"
                    placeholder="Thêm sản phẩm vào đơn"
                    className="search-input"
                    value={searchInput}
                    onChange={(e) => onSearchInputChange(e.target.value)}
                    disabled={scanning}
                    autoFocus
                />
                {showDropdown && (
                    <ProductSearchDropdown
                        results={searchResults}
                        loading={searchLoading}
                        error={searchError}
                        onSelect={onSelectProduct}
                        onClose={onCloseDropdown}
                    />
                )}
            </div>

            <div className="pos-header-tabs-area">
                <div className="pos-header-tabs">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            className={tab.id === activeTabId ? 'tab-active' : 'tab-inactive'}
                            onClick={() => onSelectTab(tab.id)}
                            title={tabLabels[tab.id]}
                        >
                            {/* Đối trọng của nút đóng bên phải: không có nó thì
                                nhãn bị lệch trái đúng nửa bề rộng dấu X. */}
                            {closable && (
                                <span className="tab-close-spacer" aria-hidden="true" />
                            )}
                            <span className="tab-label">{tabLabels[tab.id]}</span>
                            {closable && (
                                <span
                                    className="tab-close"
                                    onClick={(e) => onCloseTab(tab.id, e)}
                                    title="Đóng hóa đơn này"
                                >
                                    <X size={14} strokeWidth={2.5} />
                                </span>
                            )}
                        </button>
                    ))}
                </div>
                <button
                    className="btn-add-tab"
                    onClick={onAddTab}
                    disabled={atTabLimit}
                    title={atTabLimit
                        ? `Chỉ được mở tối đa ${maxTabs} hóa đơn`
                        : 'Tạo hóa đơn mới'}
                >
                    <Plus size={24} strokeWidth={3} />
                </button>
            </div>
        </div>
    );
}

/**
 * Nút góc phải header POS.
 * - MANAGER (chủ cửa hàng): giữ nút Home, bấm là về trang quản lý.
 * - STAFF: nút Menu, mở 2 dòng "Quản lý" và "Tài khoản".
 */
export default function PosHeaderMenu() {
    const navigate = useNavigate();
    const { hasRole } = useContext(AuthContext);
    const [open, setOpen] = useState(false);
    const wrapperRef = useRef(null);

    const isStaff = hasRole('STAFF') && !hasRole('MANAGER');
    const managePath = isStaff ? '/admin/products' : MANAGE_ROUTE;

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
                    <button className="pos-menu-item" role="menuitem" onClick={() => go(managePath)}>
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
