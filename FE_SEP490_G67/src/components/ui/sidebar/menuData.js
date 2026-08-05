import {
    LayoutDashboard,
    BarChart3,
    Package,
    Warehouse,
    Users,
    ShoppingCart,
    FileText,
    User,
} from "lucide-react";

export const menus = [
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
                title: "Vị trí hàng hóa",
                path: "/admin/warehouse/locations"
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
                title: "Trả hàng",
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
        path: "/admin/accounting"
    },
    {
        id: "staff",
        title: "Nhân viên",
        icon: User,
        path: "/admin/staff"
    }
];