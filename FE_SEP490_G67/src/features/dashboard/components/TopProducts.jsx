import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dismissRestockAdvice, getRestockAdvice } from '@/features/inventory/api/inventoryAttentionApi';
import RestockAdviceModal from '@/features/inventory/components/RestockAdviceModal';

/**
 * Widget "Sản phẩm cần xem xét nhập hàng".
 *
 * Dashboard hiển thị thông tin: BE đã lọc (chỉ SP tồn <= ngưỡng hoặc hết hàng), chuẩn
 * hoá đơn vị, phân loại và xếp hạng. Mọi ngưỡng nằm trong
 * store_config phía BE, không hard-code ở FE.
 *
 * Toàn bộ danh sách nằm ở trang danh sách sản phẩm, mời qua bằng link ở góc trên.
 */

/** Ba mức đánh giá, dùng chung cho ô thống kê ở đầu widget và nhãn trong bảng. */
const TONE_MODIFIER = {
    RED: 'danger',
    ORANGE: 'warning',
    GRAY: 'neutral',
};

export default function TopProducts() {
    const navigate = useNavigate();
    const [advice, setAdvice] = useState(null);
    const [loading, setLoading] = useState(true);
    const [dismissingId, setDismissingId] = useState(null);
    const [detailItem, setDetailItem] = useState(null);
    const mountedRef = useRef(true);

    const loadAdvice = useCallback(async () => {
        try {
            const result = await getRestockAdvice();
            if (mountedRef.current) setAdvice(result);
        } catch {
            // lỗi tải thì hiện trạng thái rỗng
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    }, []);

    useEffect(() => {
        mountedRef.current = true;
        (async () => {
            await loadAdvice();
        })();
        return () => {
            mountedRef.current = false;
        };
    }, [loadAdvice]);

    const summary = advice?.summary;
    const items = advice?.items ?? [];
    const totalCount = summary?.totalCount ?? 0;
    const windowDays = advice?.windowDays ?? 30;

    const stats = [
        { key: 'priority', modifier: 'danger', label: 'Ưu tiên nhập', value: summary?.priorityRestockCount },
        { key: 'review', modifier: 'warning', label: 'Cần xem xét', value: summary?.reviewCount },
        { key: 'slow', modifier: 'neutral', label: 'Bán chậm', value: summary?.slowMovingCount },
    ];

    // Panel chi tiết dùng lại đúng dữ liệu của dòng, không gọi thêm API.
    const handleView = (item) => setDetailItem(item);

    const handleImport = (item) => {
        const q = item.sku || item.productName || '';
        navigate(
            `/admin/warehouse/import/create?productId=${item.productId}`
            + `&q=${encodeURIComponent(q)}`,
        );
    };

    // Bỏ qua = "tôi đã xem, hôm nay không cần nhắc nữa"
    const handleDismiss = async (item) => {
        setDismissingId(item.productId);
        try {
            await dismissRestockAdvice(item.productId);
            setDetailItem(null);
            await loadAdvice();
        } catch {
            // Bỏ qua thất bại thì giữ nguyên dòng
        } finally {
            if (mountedRef.current) setDismissingId(null);
        }
    };

    return (
        <section className="dashboard-card dashboard-card--compact inventory-review-card">
            <div className="restock-header">
                <div className="restock-header_main">
                    <div className="restock-header_title-row">
                        <h3 className="dashboard-card_title">Sản phẩm cần quyết định nhập hàng</h3>
                        {totalCount > 0 && (
                            <span className="restock-header_pill">{totalCount} sản phẩm</span>
                        )}
                    </div>
                    <p className="restock-header_subtitle">
                        Dựa trên tồn kho hiện tại, ngưỡng tối thiểu và mức bán {windowDays} ngày gần nhất.
                    </p>
                </div>

                {totalCount > 0 && (
                    <button
                        type="button"
                        className="restock-view-all"
                        onClick={() => navigate('/admin/products')}
                    >
                        Xem tất cả
                    </button>
                )}
            </div>

            {totalCount > 0 && (
                <div className="restock-stats">
                    {stats.map((stat) => (
                        <div key={stat.key} className="restock-stat">
                            <div className="restock-stat_label">
                                <span className={`restock-stat_dot restock-stat_dot--${stat.modifier}`} />
                                {stat.label}
                            </div>
                            <div className="restock-stat_value">{stat.value ?? 0} sản phẩm</div>
                        </div>
                    ))}
                </div>
            )}

            <div className="inv-table-wrapper">
                <table className="inv-table inv-table--review">
                    <thead>
                        <tr>
                            <th className="text-left">Sản phẩm</th>
                            <th className="text-left">Tồn / Ngưỡng</th>
                            <th className="text-left">Bán {windowDays} ngày</th>
                            <th className="text-left">Đánh giá</th>
                            <th className="text-right">Quyết định</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item) => (
                            <tr key={item.productId}>
                                <td>
                                    <div className="inv-table_product">{item.productName}</div>
                                    {item.sku && <div className="inv-table_sku">{item.sku}</div>}
                                </td>
                                <td className="inv-table_stock">{item.stockRatioText}</td>
                                <td>{item.soldInWindowText}</td>
                                <td>
                                    <div
                                        className={`review-label review-label--${TONE_MODIFIER[item.priorityTone] ?? 'neutral'
                                            }`}
                                    >
                                        {item.priorityLabel}
                                    </div>
                                    <div className="review-reason">{item.reason}</div>
                                </td>
                                <td className="text-right">
                                    <div className="inv-table_decision">
                                        <button
                                            className="inv-table_action inv-table_action--order"
                                            type="button"
                                            onClick={() => handleView(item)}
                                        >
                                            Xem
                                        </button>
                                        <button
                                            className="inv-table_action inv-table_action--more"
                                            type="button"
                                            title="Ẩn sản phẩm này khỏi dashboard tới hết hôm nay"
                                            disabled={dismissingId === item.productId}
                                            onClick={() => handleDismiss(item)}
                                        >
                                            {dismissingId === item.productId ? 'Đang bỏ qua...' : 'Bỏ qua'}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}

                        {!loading && items.length === 0 && (
                            <tr>
                                <td colSpan="5" className="inv-table_empty">
                                    Không có sản phẩm nào cần xem xét nhập hàng.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <RestockAdviceModal
                item={detailItem}
                windowDays={windowDays}
                dismissing={dismissingId === detailItem?.productId}
                onClose={() => setDetailItem(null)}
                onImport={handleImport}
                onDismiss={handleDismiss}
            />
        </section>
    );
}
