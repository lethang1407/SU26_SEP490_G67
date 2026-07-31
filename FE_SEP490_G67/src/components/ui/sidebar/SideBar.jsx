import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
    ChevronDown,
    HelpCircle,
    LogOut
} from "lucide-react";

import "../../../css/SideBar.css";
import { menus } from "./menuData";
import { AuthContext } from "../../../app/providers/AuthProvider.jsx";
import { useContext } from "react";
export default function SideBar() {
    const [expanded, setExpanded] = useState(null);
    const location = useLocation();
    const  logout  = useContext(AuthContext);

    useEffect(() => {
        const activeMenu = menus.find(menu => 
            menu.children?.some(child => location.pathname.startsWith(child.path)) || location.pathname.startsWith(menu.path)
        );
        if (activeMenu) {
            setExpanded(activeMenu.id);
        } else {
            // Tùy chọn: đóng các menu khác khi chuyển sang menu cấp 1
            // setExpanded(null); 
        }
    }, [location.pathname]);

    const toggleSubmenu = (id) => {
        setExpanded(prevExpanded => (prevExpanded === id ? null : id));
    };

    const isMenuActive = (menu) => {
        return menu.children?.some(child => location.pathname.startsWith(child.path)) || (menu.path && location.pathname.startsWith(menu.path));
    };
    return (

        <aside className="sidebar">

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
                    menus.map((menu) => {
                        const Icon = menu.icon;
                        const isActive = isMenuActive(menu);
                        if (menu.children) {
                            return (
                                <div
                                    key={menu.id}
                                    className="menu-group"
                                >
                                    <button
                                        className={`menu-btn ${isActive ? "active" : ""
                                            } ${expanded === menu.id ? "expanded" : ""}`}
                                        onClick={() => toggleSubmenu(menu.id)}
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
                                                menu.children.map((sub) => (
                                                    <NavLink
                                                        key={sub.path}
                                                        to={sub.path}
                                                        className={({ isActive }) => `submenu-item ${isActive ? "active-sub" : ""}` }
                                                    >
                                                        {sub.title}
                                                    </NavLink>
                                                ))
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