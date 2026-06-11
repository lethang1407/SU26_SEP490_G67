import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
    ChevronDown,
    LayoutDashboard,
    BarChart3,
    Package,
    Warehouse,
    Users,
    ShoppingCart,
    FileText,
    User,
    HelpCircle,
    LogOut
} from "lucide-react";

import "../../../css/SideBar.css";

export default function SideBar() {

    const [collapse, setCollapse] = useState(false);
    const [expanded, setExpanded] = useState("reports");

    const toggleSubmenu = (id) => {
        if (expanded === id) {
            setExpanded(null);
        } else {
            setExpanded(id);
        }
    };

    const menus = [

        {
            id: "dashboard",
            title: "Bảng điều khiển",
            icon: LayoutDashboard,
            path: "/admin/dashboard"
        },

        {
            id: "reports",
            title: "Báo cáo",
            icon: BarChart3,
            children: [
                {
                    title: "Báo cáo Doanh thu",
                    path: "/admin/reports/revenue"
                },
                {
                    title: "Báo cáo Kho hàng",
                    path: "/admin/reports/warehouse"
                },
                {
                    title: "Báo cáo Bán hàng",
                    path: "/admin/reports/sales"
                }
            ]
        },

        {
            id: "orders",
            title: "Đơn hàng",
            icon: ShoppingCart,
            path: "/admin/orders"
        },

        {
            id: "products",
            title: "Sản phẩm",
            icon: Package,
            children: [
                {
                    title: "Danh sách sản phẩm",
                    path: "/admin/products"
                },
                {
                    title: "Danh mục",
                    path: "/admin/products/categories"
                }
            ]
        },

        {
            id: "warehouse",
            title: "Kho hàng",
            icon: Warehouse,
            children: [
                {
                    title: "Tồn kho",
                    path: "/admin/warehouse/inventory"
                },
                {
                    title: "Kiểm kho",
                    path: "/admin/warehouse/check"
                },
                {
                    title: "Nhập hàng",
                    path: "/admin/warehouse/import"
                },
                {
                    title: "Trả hàng nhập",
                    path: "/admin/warehouse/return"
                },
                {
                    title: "Nhà cung cấp",
                    path: "/admin/warehouse/supplier"
                }
            ]
        },

        {
            id: "customer",
            title: "Khách hàng",
            icon: Users,
            path: "/admin/customer"
        },

        {
            id: "pos",
            title: "Bán hàng (POS)",
            icon: ShoppingCart,
            path: "/admin/pos"
        },

        {
            id: "accounting",
            title: "Thuế & Kế Toán",
            icon: FileText,
            children: [
                {
                    title: "Sổ kế toán",
                    path: "/admin/accounting/book"
                },
                {
                    title: "Kê khai thuế",
                    path: "/admin/accounting/tax"
                }
            ]
        },

        {
            id: "staff",
            title: "Nhân viên",
            icon: User,
            path: "/admin/staff"
        }

    ];

    return (

        <aside className={`sidebar ${collapse ? "collapse" : ""}`}>

            <div className="sidebar-header">

                <div className="logo">

                    <div className="logo-icon">
                        ĐT
                    </div>

                    {!collapse &&
                        <div className="logo-info">
                            <h3>Đức Thắng</h3>
                            <p>Cửa hàng tạp hóa</p>
                        </div>
                    }

                </div>

                {/* <button
                    className="collapse-btn"
                    onClick={() => setCollapse(!collapse)}
                >
                    {
                        collapse
                            ? <Menu size={18} />
                            : <X size={18} />
                    }

                </button> */}
            </div>

            <div className="sidebar-body">
                {
                    menus.map((menu) => {
                        const Icon = menu.icon;
                        if (menu.children) {
                            return (
                                <div
                                    key={menu.id}
                                    className="menu-group"
                                >
                                    <button
                                        className={`menu-btn ${expanded === menu.id
                                            ? "active"
                                            : ""
                                            }`}
                                        onClick={() => toggleSubmenu(menu.id)}
                                    >
                                        <div className="menu-left">
                                            <Icon size={20} />
                                            {!collapse &&
                                                <span>
                                                    {menu.title}
                                                </span>
                                            }

                                        </div>
                                        {
                                            !collapse &&
                                            <ChevronDown
                                                size={18}
                                                className={
                                                    expanded === menu.id
                                                        ? "rotate"
                                                        : ""
                                                }
                                            />
                                        }
                                    </button>
                                    {
                                        expanded === menu.id &&
                                        !collapse &&
                                        <div className="submenu">
                                            {
                                                menu.children.map((sub) => (
                                                    <NavLink
                                                        key={sub.path}
                                                        to={sub.path}
                                                        className={({ isActive }) =>
                                                            isActive
                                                                ? "submenu-item active-sub"
                                                                : "submenu-item"
                                                        }
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
                                    {
                                        !collapse &&
                                        <span>
                                            {menu.title}
                                        </span>
                                    }
                                </div>
                            </NavLink>
                        )
                    })
                }
            </div>
            <div className="sidebar-footer">
                <NavLink
                    to="/admin/help"
                    className="menu-btn"
                >
                    <div className="menu-left">
                        <HelpCircle size={20} />
                        {!collapse &&
                            <span>
                                Hỗ trợ
                            </span>
                        }
                    </div>
                </NavLink>
                <NavLink
                    to="/logout"
                    className="menu-btn logout"
                >
                    <div className="menu-left">
                        <LogOut size={20} />
                        {!collapse &&
                            <span>
                                Đăng xuất
                            </span>
                        }
                    </div>
                </NavLink>
            </div>
        </aside>
    );
}