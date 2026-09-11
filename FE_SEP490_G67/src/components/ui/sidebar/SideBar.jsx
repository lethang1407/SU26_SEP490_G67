import { useState, useEffect, useContext } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
    ChevronDown,
    HelpCircle,
    LogOut,
} from "lucide-react";

import "../../../css/SideBar.css";
import { menus } from "./menuData";
import { AuthContext } from "../../../app/providers/AuthProvider.jsx";
import { useSidebarCollapse } from "../../../app/providers/SidebarCollapseProvider.jsx";

export default function SideBar() {
    const [expanded, setExpanded] = useState(null);
    const location = useLocation();
    const { logout, hasPermission } = useContext(AuthContext);
    const { collapsed, setCollapsed } = useSidebarCollapse();

    const filteredMenus = menus.filter(menu => {
        if (menu.children) {
            const validChildren = menu.children.filter(child => hasPermission(child.permission));
            return validChildren.length > 0;
        }
        return hasPermission(menu.permission);
    });

    const isSubActive = (subPath, currentPath, siblingPaths = []) => {
        if (currentPath === subPath) return true;
        const matches = siblingPaths.filter(p => currentPath === p || currentPath.startsWith(p + '/'));
        if (matches.length > 0) {
            const longest = matches.reduce((a, b) => (a.length > b.length ? a : b));
            return longest === subPath;
        }
        return currentPath.startsWith(subPath + '/');
    };

    useEffect(() => {
        const activeMenu = filteredMenus.find(menu => {
            if (menu.children) {
                const siblingPaths = menu.children.map(c => c.path);
                return menu.children.some(child => isSubActive(child.path, location.pathname, siblingPaths));
            }
            return menu.path && (location.pathname === menu.path || location.pathname.startsWith(menu.path + '/'));
        });
        if (activeMenu) {
            setExpanded(activeMenu.id);
        }
    }, [location.pathname]);

    const toggleSubmenu = (id) => {
        if (collapsed) {
            setCollapsed(false);
            setExpanded(id);
            return;
        }
        setExpanded(prevExpanded => (prevExpanded === id ? null : id));
    };

    const isMenuActive = (menu) => {
        if (menu.children) {
            const siblingPaths = menu.children.map(c => c.path);
            return menu.children.some(child => isSubActive(child.path, location.pathname, siblingPaths));
        }
        return menu.path && (location.pathname === menu.path || location.pathname.startsWith(menu.path + '/'));
    };

    return (
        <aside className={`sidebar${collapsed ? " collapse" : ""}`}>
            <div className="sidebar-header">
                <div className="logo">
                    <div className="logo-icon">
                        ĐT
                    </div>
                    <div className="logo-info">
                        <h3>Đức Thắng</h3>
                        <p>Cửa hàng tạp hóa</p>
                    </div>
                </div>
            </div>

            <div className="sidebar-body">
                {
                    filteredMenus.map((menu) => {
                        const Icon = menu.icon;
                        const isActive = isMenuActive(menu);
                        if (menu.children) {
                            const allowedChildren = menu.children.filter(child => hasPermission(child.permission));
                            const siblingPaths = allowedChildren.map(c => c.path);
                            return (
                                <div
                                    key={menu.id}
                                    className="menu-group"
                                >
                                    <button
                                        className={`menu-btn ${isActive ? "active" : ""
                                            } ${expanded === menu.id ? "expanded" : ""}`}
                                        onClick={() => toggleSubmenu(menu.id)}
                                        title={collapsed ? menu.title : undefined}
                                    >
                                        <div className="menu-left">
                                            <Icon size={20} className={isActive ? 'active-icon' : ''} />
                                            <span>
                                                {menu.title}
                                            </span>

                                        </div>
                                        <ChevronDown
                                            size={18}
                                            className={
                                                expanded === menu.id
                                                    ? "rotate"
                                                    : ""
                                            }
                                        />
                                    </button>
                                    {
                                        expanded === menu.id &&
                                        <div className="submenu">
                                            {
                                                allowedChildren.map((sub) => {
                                                    const subActive = isSubActive(sub.path, location.pathname, siblingPaths);
                                                    return (
                                                        <NavLink
                                                            key={sub.path}
                                                            to={sub.path}
                                                            className={`submenu-item ${subActive ? "active-sub" : ""}`}
                                                        >
                                                            {sub.title}
                                                        </NavLink>
                                                    );
                                                })
                                            }
                                        </div>
                                    }
                                </div>
                            )
                        }
                        return (
                            <NavLink
                                key={menu.id}
                                to={menu.path}
                                title={collapsed ? menu.title : undefined}
                                className={({ isActive }) =>
                                    isActive
                                        ? "menu-btn active"
                                        : "menu-btn"
                                }
                            >
                                <div className="menu-left">
                                    <Icon size={20} />
                                    <span>
                                        {menu.title}
                                    </span>
                                </div>
                            </NavLink>
                        )
                    })
                }
            </div>
            <div className="sidebar-footer">
                <NavLink
                    to="/help"
                    className="menu-btn"
                    title={collapsed ? "Hỗ trợ" : undefined}
                >
                    <div className="menu-left">
                        <HelpCircle size={20} />
                        <span>
                            Hỗ trợ
                        </span>
                    </div>
                </NavLink>
                <NavLink
                    to="/login"
                    className="menu-btn logout"
                    onClick={logout}
                    title={collapsed ? "Đăng xuất" : undefined}
                >
                    <div className="menu-left">
                        <LogOut size={20} />
                        <span>
                            Đăng xuất
                        </span>
                    </div>
                </NavLink>
            </div>
        </aside>
    );
}
