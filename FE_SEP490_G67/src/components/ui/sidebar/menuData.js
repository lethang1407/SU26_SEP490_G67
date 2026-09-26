import {
    LayoutDashboard,
    BarChart3,
    Package,
    Warehouse,
    Users,
    ShoppingCart,
    FileText,
    User,
    ShieldCheck,
    Truck,
} from "lucide-react";

export const menus = [
    {
        id: "dashboard",
        title: "Bảng điều khiển",
        icon: LayoutDashboard,
        path: "/admin/dashboard",
        role: ["MANAGER"]
    },
    {
        id: "reports",
        title: "Báo cáo",
        icon: BarChart3,
        role: ["MANAGER"],
        children: [
            {
                title: "Báo cáo Doanh thu",
                path: "/admin/reports/revenue",
                role: ["MANAGER"]
            },
            {
                title: "Báo cáo Kho hàng",
                path: "/admin/reports/warehouse",
                role: ["MANAGER"]
            },
        ]
    },
    // {
    //     id: "orders",
    //     title: "Đơn hàng",
    //     icon: ShoppingCart,
    //     path: "/admin/orders/reconciliation",
    //     permission: "AUDIT:VIEW"
    // },
    {
        id: "products",
        title: "Sản phẩm",
        icon: Package,
        path: "/admin/products",
        permission: "PRODUCT:VIEW"
    },
    {
        id: "warehouse",
        title: "Kho hàng",
        icon: Warehouse,
        children: [
            {
                title: "Vị trí hàng hóa",
                path: "/admin/warehouse/locations",
                permission: "WAREHOUSE:VIEW"
            },
            {
                title: "Kiểm kho",
                path: "/admin/warehouse/check",
                permission: "WAREHOUSE:CHECK_VIEW"
            },
            {
                title: "Nhập hàng",
                path: "/admin/warehouse/import",
                permission: "IMPORT:VIEW"
            },
            {
                title: "Trả hàng",
                path: "/admin/warehouse/return",
                permission: "IMPORT:VIEW"
            },
            // {
            //     title: "Nhà cung cấp",
            //     path: "/admin/warehouse/supplier",
            //     permission: "SUPPLIER:VIEW"
            // }
        ]
    },
    {
        id: "supplier",
        title: "Nhà cung cấp",
        icon: Truck,
        path: "/admin/warehouse/supplier",
        permission: "SUPPLIER:VIEW"
    },
    {
        id: "customer",
        title: "Khách hàng",
        icon: Users,
        path: "/admin/customer",
        permission: "CUSTOMER:VIEW"
    },
    {
        id: "pos",
        title: "Bán hàng (POS)",
        icon: ShoppingCart,
        path: "/admin/pos",
        permission: "POS:SALE"
    },
    {
        id: "accounting",
        title: "Thuế & Kế Toán",
        icon: FileText,
        path: "/admin/accounting",
        role: ["MANAGER"]
    },
    {
        id: "staff",
        title: "Nhân viên",
        icon: User,
        path: "/admin/staff",
        role: ["MANAGER"]
    }
    // {
    //     id: "api-permissions",
    //     title: "Phân quyền API",
    //     icon: ShieldCheck,
    //     path: "/admin/api-permissions",
    //     permission: "STAFF:VIEW"
    // }
];