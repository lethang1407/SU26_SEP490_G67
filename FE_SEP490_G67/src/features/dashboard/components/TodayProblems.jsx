import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, CreditCard, ShoppingCart, AlertTriangle } from 'lucide-react';
import { getOverviewCustomer } from '@/features/customer/api';
import { CUSTOMER_ROUTES } from '@/features/customer/constants';
import { importOrdersApi } from '@/features/import-order/api';
import { IMPORT_ORDER_ROUTES, ORDER_STATUS_FILTER } from '@/features/import-order/constants';
import { getInventoryAttention } from '@/features/inventory/api/inventoryAttentionApi';
import { PRODUCT_ROUTES } from '@/features/product/constants';
import { IMPORT_RETURN_ROUTES } from '@/features/import-return/constants';
import ExpiredBatchesModal from '@/features/inventory/components/ExpiredBatchesModal';

const DRAFT_PREVIEW_LIMIT = 2;

const SEVERITY_TONE = {
    RED: 'danger',
    ORANGE: 'warning',
    YELLOW: 'amber',
};

const formatCompactCurrency = (value) => {
    if (value === null || value === undefined) return '0₫';
    return `${new Intl.NumberFormat('vi-VN').format(value)}₫`;
};

const attentionGroups = [
    {
        id: 'stock',
        icon: Store,
        title: 'Kho hàng',
        count: 0,
        summary: [],
        items: [],
    },
    {
        id: 'import',
        icon: ShoppingCart,
        title: 'Nhập hàng',
        count: 0,
        summary: [],
        items: [],
        link: 'Tiếp tục nhập hàng',
    },
    {
        id: 'debt',
        icon: CreditCard,
        title: 'Khách hàng & Công nợ',
        count: 0,
        summary: [],
        items: [],
    },
];

function withInventoryAttention(group, attention, actions) {
    if (group.id !== 'stock' || !attention) return group;

    const lanes = [
        {
            key: 'expired',
            label: 'sản phẩm quá hạn',
            lane: attention.expired,
            onClick: actions.openExpired,
        },
        {
            key: 'outOfStock',
            label: 'sản phẩm đã hết hàng',
            lane: attention.outOfStock,
            onClick: actions.openProducts,
            tone: 'warning',
        },
        {
            key: 'returnHold',
            label: 'sản phẩm đổi trả chờ xử lý',
            lane: attention.returnHold,
            onClick: actions.openReturnHold,
        },
    ].filter(({ lane }) => (lane?.count ?? 0) > 0);

    return {
        ...group,
        count: lanes.length,
        countLabel: `${lanes.length} nhóm cần chú ý`,
        summaryStacked: true,
        summary: lanes.map(({ key, label, lane, onClick, tone }) => ({
            key,
            text: `${lane.count} ${label}`,
            tone: tone ?? SEVERITY_TONE[lane.severity] ?? 'warning',
            title: lane.severityReason ?? label,
            onClick,
        })),
        items: [],
    };
}

function formatActor(name, at) {
    const by = `Tạo bởi ${name ?? 'Không rõ'}`;
    if (!at) return by;
    const when = new Date(at);
    if (Number.isNaN(when.getTime())) return by;
    return `${by} · ${when.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
}

function withDebtAlerts(group, overview) {
    if (group.id !== 'debt' || !overview) return group;

    const customerAlert = overview.newDebtCustomerAlert;
    const staffOrderAlert = overview.staffDebtSalesAlert;
    const customerCount = customerAlert?.count ?? 0;
    const orderCount = staffOrderAlert?.count ?? 0;

    if (customerCount === 0 && orderCount === 0) {
        return { ...group, count: 0, summary: [], items: [] };
    }

    const summary = [];
    const items = [];
    const moreParts = [];

    if (customerCount > 0) {
        summary.push({ key: 'new-customer', tone: 'info', text: `${customerCount} khách nợ mới` });
        // Chỉ hiển thị khách mới tạo mới nhất
        items.push({
            key: 'new-customer',
            name: customerAlert.latestCustomerName ?? 'Không rõ tên',
            details: [
                `Công nợ: ${formatCompactCurrency(customerAlert.latestCustomerDebt)}`,
                formatActor(customerAlert.latestCreatedByName, customerAlert.latestCreatedAt),
            ],
            tone: 'info',
        });
        if (customerCount > 1) moreParts.push(`+${customerCount - 1} khách khác`);
    }

    if (orderCount > 0) {
        summary.push({
            key: 'staff-debt-order',
            tone: 'warning',
            text: `${orderCount} đơn ghi nợ mới`,
            title: `Tổng nợ còn lại: ${formatCompactCurrency(staffOrderAlert.totalRemainingDebt)}`,
        });
        items.push({
            key: 'staff-debt-order',
            name: [staffOrderAlert.latestOrderCode, staffOrderAlert.latestCustomerName]
                .filter(Boolean).join(' · ') || 'Đơn ghi nợ',
            details: [
                `Còn nợ: ${formatCompactCurrency(staffOrderAlert.latestRemainingDebt)}`,
                formatActor(staffOrderAlert.latestStaffName, staffOrderAlert.latestCreatedAt),
            ],
            tone: 'warning',
        });
        if (orderCount > 1) moreParts.push(`+${orderCount - 1} đơn khác`);
    }

    return {
        ...group,
        count: customerCount + orderCount,
        countLabel: [
            customerCount > 0 ? `${customerCount} khách mới` : null,
            orderCount > 0 ? `${orderCount} đơn nợ` : null,
        ].filter(Boolean).join(' · '),
        summaryStacked: true,
        summary,
        items,
        more: moreParts.length > 0 ? moreParts.join(' · ') : null,
        link: 'Xem khách nợ mới',
    };
}

const STALE_DRAFT_DAYS = 2;

/** Hiển thị thời gian tạo đơn nhập hàng nháp */
function formatCreatedAt(value) {
    if (!value) return null;
    const at = new Date(value);
    if (Number.isNaN(at.getTime())) return null;
    const time = at.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const day = at.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return `Tạo lúc ${time} ${day}`;
}

function draftAgeInDays(value) {
    if (!value) return null;
    const at = new Date(value);
    if (Number.isNaN(at.getTime())) return null;
    return Math.floor((Date.now() - at.getTime()) / 86400000);
}

function withDraftImportOrders(group, draftPage) {
    if (group.id !== 'import' || !draftPage) return group;

    const count = draftPage.totalElements ?? 0;
    if (count === 0) {
        return { ...group, count, summary: [], items: [] };
    }

    const drafts = (draftPage.content ?? []).slice(0, DRAFT_PREVIEW_LIMIT);

    return {
        ...group,
        count,
        countLabel: `${count} phiếu nháp`,
        summary: [{ tone: 'warning', text: 'Phiếu nhập chưa hoàn tất' }],
        items: drafts.map((order) => {
            const age = draftAgeInDays(order.receivedAt);
            const stale = age !== null && age >= STALE_DRAFT_DAYS;
            return {
                name: order.orderCode,
                details: [
                    order.supplierName || 'Chưa chọn nhà cung cấp',
                    formatCreatedAt(order.receivedAt),
                ].filter(Boolean),
                // Nháp để lâu thì đẩy lên tone đỏ cho khác hẳn phiếu vừa tạo.
                alert: stale ? `Đã tạo ${age} ngày trước` : null,
                tone: stale ? 'danger' : 'warning',
            };
        }),
        more: count > drafts.length ? `+${count - drafts.length} phiếu khác` : null,
    };
}

export default function TodayProblems() {
    const navigate = useNavigate();
    const [debtOverview, setDebtOverview] = useState(null);
    const [draftImportOrders, setDraftImportOrders] = useState(null);
    const [inventoryAttention, setInventoryAttention] = useState(null);
    const [expiredModalOpen, setExpiredModalOpen] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const result = await getInventoryAttention();
                if (!cancelled) setInventoryAttention(result ?? null);
            } catch {
                // Nếu lỗi tải không lấy được data thì để trống, không chặn dashboard
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const overview = await getOverviewCustomer();
                if (!cancelled) setDebtOverview(overview ?? null);
            } catch {
                // Nếu lỗi tải không lấy được data thì để trống, không chặn dashboard
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const result = await importOrdersApi.getImportOrders({
                    page: 0,
                    size: 10,
                    orderStatus: ORDER_STATUS_FILTER.DRAFT,
                });
                if (!cancelled) setDraftImportOrders(result ?? null);
            } catch {
                // Chỉ là chỉ số hiển thị: lỗi tải thì để trống, không chặn dashboard.
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const handleGroupLinkClick = (groupId) => {
        if (groupId === 'debt') {
            navigate(CUSTOMER_ROUTES.list);
            return;
        }
        if (groupId === 'import') {
            navigate(IMPORT_ORDER_ROUTES.list, {
                state: { orderStatusFilter: ORDER_STATUS_FILTER.DRAFT },
            });
        }
    };

    const inventoryActions = {
        openExpired: () => setExpiredModalOpen(true),
        openProducts: () => navigate(PRODUCT_ROUTES.list),
        openReturnHold: () =>
            navigate(IMPORT_RETURN_ROUTES.page, { state: { openAwaitingProcessing: true } }),
    };

    const visibleGroups = attentionGroups
        .map((group) =>
            withInventoryAttention(
                withDraftImportOrders(
                    withDebtAlerts(group, debtOverview),
                    draftImportOrders,
                ),
                inventoryAttention,
                inventoryActions,
            ),
        )
        .filter((group) => group.count > 0);

    if (visibleGroups.length === 0) {
        return null;
    }

    return (
        <section className="attention-section" aria-labelledby="attention-title">
            <h2 id="attention-title" className="attention-section_title">Cần chú ý hôm nay</h2>
            <div
                className="attention-grid"
                style={{ '--attention-columns': visibleGroups.length }}
            >
                {visibleGroups.map((group) => {
                    const Icon = group.icon;

                    return (
                        <article key={group.id} className="attention-card">
                            <div className="attention-card_header">
                                <div className="attention-card_title-wrap">
                                    <Icon size={16} className="attention-card_icon" />
                                    <h3 className="attention-card_title">{group.title}</h3>
                                </div>
                                <span className="attention-card_count">{group.countLabel ?? group.count}</span>
                            </div>

                            <div
                                className={`attention-card_summary${group.summaryStacked ? ' attention-card_summary--stack' : ''
                                    }`}
                            >
                                {group.summary.map((item, index) => {
                                    const key = `${group.id}-${item.key ?? index}`;
                                    const content = (
                                        <>
                                            <span className="attention-summary_dot" />
                                            {item.text}
                                        </>
                                    );

                                    return item.onClick ? (
                                        <button
                                            key={key}
                                            type="button"
                                            title={item.title}
                                            onClick={item.onClick}
                                            className={`attention-summary attention-summary--${item.tone} attention-summary--clickable`}
                                        >
                                            {content}
                                        </button>
                                    ) : (
                                        <span
                                            key={key}
                                            title={item.title}
                                            className={`attention-summary attention-summary--${item.tone}`}
                                        >
                                            {content}
                                        </span>
                                    );
                                })}
                            </div>

                            <div className="attention-card_body">
                                {group.items.map((item) => (
                                    <div key={item.key ?? item.name} className={`attention-item attention-item--${item.tone}`}>
                                        <div className="attention-item_name">{item.name}</div>
                                        {item.detail && <div className="attention-item_detail">{item.detail}</div>}
                                        {item.details && (
                                            <div className="attention-item_details-stack">
                                                {item.details.map((d, i) => (
                                                    <div key={i} className="attention-item_subdetail">
                                                        {d}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {item.alert && (
                                            <div className="attention-item_alert">
                                                <AlertTriangle size={12} />
                                                {item.alert}
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {group.more && (
                                    <div className="attention-card_more">{group.more}</div>
                                )}
                            </div>

                            {group.link && (
                                <button
                                    className="attention-card_link"
                                    type="button"
                                    onClick={() => handleGroupLinkClick(group.id)}
                                >
                                    {group.link}
                                </button>
                            )}
                        </article>
                    );
                })}
            </div>

            <ExpiredBatchesModal
                open={expiredModalOpen}
                onClose={() => setExpiredModalOpen(false)}
            />
        </section>
    );
}