import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, CreditCard, ShoppingCart, Settings } from 'lucide-react';
import { getOverviewCustomer } from '@/features/customer/api';
import { importOrdersApi } from '@/features/import-order/api';
import { IMPORT_ORDER_ROUTES, ORDER_STATUS_FILTER } from '@/features/import-order/constants';
import { getInventoryAttention } from '@/features/inventory/api/inventoryAttentionApi';
import { IMPORT_RETURN_ROUTES } from '@/features/import-return/constants';
import ExpiredBatchesModal from '@/features/inventory/components/ExpiredBatchesModal';

const DRAFT_PREVIEW_LIMIT = 2;

/** Mức độ nghiêm trọng do BE tính → tone màu của thẻ. */
const SEVERITY_TONE = {
    RED: 'danger',
    ORANGE: 'warning',
    YELLOW: 'amber',
};

const formatCompactCurrency = (value) => {
    if (value === null || value === undefined) return '0đ';
    return `${new Intl.NumberFormat('vi-VN').format(value)}đ`;
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
        id: 'debt',
        icon: CreditCard,
        title: 'Khách hàng & Công nợ',
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
        id: 'operation',
        icon: Settings,
        title: 'Vận hành',
        count: 1,
        summary: [{ tone: 'warning', value: '1' }],
        items: [
            {
                name: 'Tiền mặt tại quầy đang thấp',
                details: ['Hiện tại: 450.000đ', 'Ngưỡng 3.500.000đ'],
                tone: 'warning',
            },
        ],
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
            label: 'sản phẩm hết hàng',
            lane: attention.outOfStock,
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
        subtitle: `${lanes.length} nhóm cần chú ý`,
        summaryStacked: true,
        summary: lanes.map(({ key, label, lane, onClick }) => ({
            key,
            text: `${lane.count} ${label}`,
            tone: SEVERITY_TONE[lane.severity] ?? 'warning',
            title: lane.severityReason ?? label,
            onClick,
        })),
        items: [],
    };
}

function withNewDebtCustomers(group, alert) {
    if (group.id !== 'debt' || !alert) return group;

    const count = alert.count ?? 0;

    return {
        ...group,
        count,
        summary: count > 0 ? [{ tone: 'danger', value: String(count) }] : [],
        items:
            count > 0 && alert.latestCustomerName
                ? [
                    {
                        name: alert.latestCustomerName,
                        detail: `Khách hàng mới do ${alert.latestCreatedByName ?? 'Không rõ'} tạo nợ mới`,
                        details: [`Công nợ: ${formatCompactCurrency(alert.latestCustomerDebt)}`],
                        tone: 'danger',
                    },
                ]
                : [],
    };
}

function withDraftImportOrders(group, draftPage) {
    if (group.id !== 'import' || !draftPage) return group;

    const count = draftPage.totalElements ?? 0;

    return {
        ...group,
        count,
        summary: count > 0 ? [{ tone: 'warning', value: String(count) }] : [],
        items: (draftPage.content ?? []).slice(0, DRAFT_PREVIEW_LIMIT).map((order) => ({
            name: order.orderCode,
            detail: order.supplierName,
            tone: 'warning',
        })),
    };
}

export default function TodayProblems() {
    const navigate = useNavigate();
    const [newDebtCustomerAlert, setNewDebtCustomerAlert] = useState(null);
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
                // Chỉ là chỉ số hiển thị: lỗi tải thì để trống, không chặn dashboard.
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
                if (!cancelled) setNewDebtCustomerAlert(overview?.newDebtCustomerAlert ?? null);
            } catch {
                // Thẻ chỉ là chỉ số hiển thị: lỗi tải thì để trống, không chặn dashboard.
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

    // Mở thẳng danh sách nhập hàng ở tab "Phiếu tạm".
    const handleGroupLinkClick = (groupId) => {
        if (groupId === 'import') {
            navigate(IMPORT_ORDER_ROUTES.list, {
                state: { orderStatusFilter: ORDER_STATUS_FILTER.DRAFT },
            });
        }
    };

    const inventoryActions = {
        openExpired: () => setExpiredModalOpen(true),
        openReturnHold: () =>
            navigate(IMPORT_RETURN_ROUTES.page, { state: { openAwaitingProcessing: true } }),
    };

    const visibleGroups = attentionGroups
        .map((group) =>
            withInventoryAttention(
                withDraftImportOrders(
                    withNewDebtCustomers(group, newDebtCustomerAlert),
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
            <h2 id="attention-title" className="attention-section_title">Việc cần chú ý hôm nay</h2>
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
                                <span className="attention-card_count">{group.count}</span>
                            </div>

                            {group.subtitle && (
                                <div className="attention-card_subtitle">{group.subtitle}</div>
                            )}

                            <div
                                className={`attention-card_summary${group.summaryStacked ? ' attention-card_summary--stack' : ''
                                    }`}
                            >
                                {group.summary.map((item, index) => {
                                    const key = `${group.id}-${item.key ?? index}`;
                                    const content = (
                                        <>
                                            <span className="attention-summary_dot" />
                                            {item.text ?? item.value}
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
                                    <div key={item.name} className={`attention-item attention-item--${item.tone}`}>
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
                                    </div>
                                ))}
                            </div>

                            {group.link && (
                                <button
                                    className="attention-card_link"
                                    type="button"
                                    onClick={() => handleGroupLinkClick(group.id)}
                                >
                                    {group.link} →
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