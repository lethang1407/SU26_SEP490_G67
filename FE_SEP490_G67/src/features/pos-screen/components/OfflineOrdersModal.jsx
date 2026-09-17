import React, { useState } from 'react';
import { X, Wifi, WifiOff, RefreshCw, Inbox, AlertTriangle, CheckCircle } from 'lucide-react';

export default function OfflineOrdersModal({
    show,
    onClose,
    queue = [],
    isSyncing,
    onSyncNow,
    onRemoveItem,
    onSelectOrder,
    isOnline,
}) {
    const [selectedType, setSelectedType] = useState('ALL'); // ALL | SALE | EXCHANGE
    const [sortAsc, setSortAsc] = useState(true); // true = Cũ nhất trước (FIFO), false = Mới nhất trước

    if (!show) return null;

    // Sort strictly by creation time
    const sortedQueue = [...queue].sort((a, b) => {
        const tA = new Date(a.createdAt).getTime();
        const tB = new Date(b.createdAt).getTime();
        return sortAsc ? tA - tB : tB - tA;
    });

    // Filter by type
    const filteredQueue = sortedQueue.filter(item => {
        if (selectedType === 'ALL') return true;
        if (selectedType === 'SALE') return item.type !== 'EXCHANGE' && item.type !== 'DEBT_PAYMENT';
        if (selectedType === 'EXCHANGE') return item.type === 'EXCHANGE';
        if (selectedType === 'DEBT_PAYMENT') return item.type === 'DEBT_PAYMENT';
        return true;
    });

    const pendingCount = queue.filter(it => it.status === 'PENDING' || it.status === 'FAILED').length;
    const totalCount = queue.length;

    // Format date as DD/MM/YYYY HH:mm:ss
    const formatDate = (isoStr) => {
        if (!isoStr) return '';
        try {
            const d = new Date(isoStr);
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            const seconds = String(d.getSeconds()).padStart(2, '0');
            return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
        } catch (dateErr) {
            console.warn('[OfflineOrdersModal] Failed to parse date string:', isoStr, dateErr);
            return isoStr;
        }
    };

    // Format value with comma separators
    const formatValue = (amount) => {
        return Number(amount || 0).toLocaleString('vi-VN');
    };

    return (
        <div className="pos-modal-overlay" onClick={onClose}>
            <div className="pos-modal-container" onClick={(e) => e.stopPropagation()}>

                {/* Modal Header */}
                <div className="pos-modal-header">
                    <h2 className="pos-modal-title">Đồng bộ phiếu</h2>
                    <button onClick={onClose} className="pos-modal-close-btn" aria-label="Đóng">
                        <X size={20} />
                    </button>
                </div>

                {/* Subheader: Filter & Connection Status */}
                <div className="pos-modal-subheader">
                    {/* Filter by Type */}
                    <div className="pos-modal-filter">
                        <span>Loại phiếu</span>
                        <select
                            value={selectedType}
                            onChange={(e) => setSelectedType(e.target.value)}
                            className="pos-modal-select"
                        >
                            <option value="ALL">---Tất cả---</option>
                            <option value="SALE">Hóa đơn</option>
                            <option value="EXCHANGE">Đổi trả</option>
                            <option value="DEBT_PAYMENT">Thu nợ</option>
                        </select>
                    </div>

                    {/* Connection Status (Read-only) */}
                    <div className="pos-modal-status">
                        <span>Trạng thái kết nối:</span>
                        {isOnline ? (
                            <span className="status-online" title="Hệ thống đang có kết nối Internet">
                                Có Internet
                                <Wifi size={16} strokeWidth={2.5} />
                            </span>
                        ) : (
                            <span className="status-offline" title="Hệ thống đang mất kết nối Internet">
                                Không có Internet
                                <WifiOff size={16} strokeWidth={2.2} />
                            </span>
                        )}
                    </div>
                </div>

                {/*
                  * Banner thông báo trạng thái — chỉ hiện khi cần thiết:
                  * OFFLINE: cảnh báo không thể đồng bộ
                  * ONLINE + không còn phiếu chờ: thông báo đã sạch
                */}
                {!isOnline && totalCount > 0 && (
                    <div className="pos-modal-info-banner pos-modal-info-banner--warn">
                        <WifiOff size={15} />
                        <span>
                            Đang mất kết nối — <strong>{pendingCount} phiếu</strong> sẽ được tự động đồng bộ khi có Internet trở lại.
                        </span>
                    </div>
                )}

                {isOnline && totalCount > 0 && pendingCount === 0 && (
                    <div className="pos-modal-info-banner pos-modal-info-banner--success">
                        <CheckCircle size={15} />
                        <span>Tất cả phiếu đã được đồng bộ thành công.</span>
                    </div>
                )}

                {/* Table Area */}
                <div className="pos-modal-body">
                    <table className="pos-sync-table">
                        {/* Blue Table Header */}
                        <thead>
                            <tr>
                                <th style={{ width: '14%' }}>Loại phiếu</th>
                                <th style={{ width: '30%' }}>Mã phiếu</th>
                                <th
                                    style={{ width: '24%', cursor: 'pointer', userSelect: 'none' }}
                                    onClick={() => setSortAsc(prev => !prev)}
                                    title={`Sắp xếp thời gian: ${sortAsc ? 'Cũ đến mới (thứ tự đồng bộ)' : 'Mới đến cũ'}`}
                                >
                                    Thời gian <span style={{ fontSize: '10px' }}>{sortAsc ? '▲' : '▾'}</span>
                                </th>
                                <th style={{ width: '14%' }}>Giá trị</th>
                                <th style={{ width: '18%', textAlign: 'right' }}>Thao tác</th>
                            </tr>
                        </thead>

                        {/* Table Body */}
                        <tbody>
                            {filteredQueue.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="pos-modal-empty">
                                        <Inbox size={48} strokeWidth={1.2} style={{ margin: '0 auto', color: '#9ca3af' }} />
                                        <div className="pos-modal-empty-text">
                                            {totalCount === 0
                                                ? 'Không có phiếu nào đang chờ đồng bộ'
                                                : 'Không tìm thấy phiếu nào phù hợp bộ lọc'}
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredQueue.map((item) => {
                                    const snapshot = item.orderSnapshot || {};
                                    const isExchange = item.type === 'EXCHANGE';
                                    const isDebtPayment = item.type === 'DEBT_PAYMENT';
                                    const docType = isDebtPayment ? 'Thu nợ' : isExchange ? 'Đổi trả' : (item.type === 'DEBT' ? 'Đơn nợ' : 'Hóa Đơn');
                                    const docTypeColor = isDebtPayment ? '#059669' : isExchange ? '#d97706' : '#1e88e5';
                                    const docCode = snapshot.paymentCode || snapshot.orderCode || item.clientUuid;
                                    const dateText = formatDate(item.createdAt);
                                    const valueText = formatValue(snapshot.amountPaid ?? snapshot.totalAmount ?? 0);

                                    /**
                                     * Nguyên tắc nút "Chọn":
                                     * - ONLINE: nút "Chọn" ẩn — đã có mạng, dùng luồng bán hàng bình thường.
                                     *   Trừ trường hợp phiếu bị FAILED (lỗi nghiệp vụ từ server), cho "Chọn"
                                     *   để thu ngân có thể xem lại rồi quyết định.
                                     * - OFFLINE: nút "Chọn" hiện — cho phép nạp lại đơn hoặc mở lại đổi trả
                                     *   để tiếp tục xử lý ngay mà không cần mạng.
                                     *   Phiếu thu nợ không cần nạp vào giỏ.
                                     */
                                    const showSelectBtn = (!isOnline || item.status === 'FAILED') && !isDebtPayment;

                                    return (
                                        <tr key={item.id}>
                                            <td>
                                                <span style={{
                                                    fontWeight: 600,
                                                    color: docTypeColor
                                                }}>
                                                    {docType}
                                                </span>
                                            </td>
                                            <td style={{ fontWeight: 500 }}>
                                                {docCode}
                                                {item.status === 'FAILED' && (
                                                    <span
                                                        style={{
                                                            marginLeft: 6,
                                                            fontSize: 11,
                                                            color: '#dc2626',
                                                            backgroundColor: '#fee2e2',
                                                            padding: '2px 6px',
                                                            borderRadius: 4,
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 2
                                                        }}
                                                        title={item.errorMsg || 'Lỗi đồng bộ dữ liệu — bấm Chọn để xem lại'}
                                                    >
                                                        <AlertTriangle size={11} />
                                                        Lỗi
                                                    </span>
                                                )}
                                                {item.status === 'SYNCING' && (
                                                    <span
                                                        style={{
                                                            marginLeft: 6,
                                                            fontSize: 11,
                                                            color: '#2563eb',
                                                            backgroundColor: '#dbeafe',
                                                            padding: '2px 6px',
                                                            borderRadius: 4
                                                        }}
                                                    >
                                                        Đang gửi...
                                                    </span>
                                                )}
                                                {item.status === 'PENDING' && isOnline && (
                                                    item.retryAt && new Date(item.retryAt) > new Date() ? (
                                                        <span
                                                            style={{
                                                                marginLeft: 6,
                                                                fontSize: 11,
                                                                color: '#4b5563',
                                                                backgroundColor: '#f3f4f6',
                                                                padding: '2px 6px',
                                                                borderRadius: 4
                                                            }}
                                                            title={`Thử lại lúc ${new Date(item.retryAt).toLocaleTimeString('vi-VN')} (Lần thử: ${item.retryCount || 1})`}
                                                        >
                                                            Thử lại sau {Math.max(1, Math.ceil((new Date(item.retryAt).getTime() - Date.now()) / 1000))}s
                                                        </span>
                                                    ) : (
                                                        <span
                                                            style={{
                                                                marginLeft: 6,
                                                                fontSize: 11,
                                                                color: '#d97706',
                                                                backgroundColor: '#fef3c7',
                                                                padding: '2px 6px',
                                                                borderRadius: 4
                                                            }}
                                                        >
                                                            Chờ đồng bộ
                                                        </span>
                                                    )
                                                )}
                                            </td>
                                            <td style={{ fontSize: 12.5, color: '#4b5563' }}>{dateText}</td>
                                            <td style={{ fontWeight: 500 }}>{valueText}</td>
                                            <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                {showSelectBtn && (
                                                    <button
                                                        onClick={() => onSelectOrder && onSelectOrder(item)}
                                                        className="pos-table-btn"
                                                        title={
                                                            item.status === 'FAILED'
                                                                ? 'Phiếu bị lỗi — bấm để xem lại nội dung'
                                                                : isExchange
                                                                    ? 'Mở lại phiếu đổi trả này'
                                                                    : 'Nạp lại đơn hàng này vào giỏ'
                                                        }
                                                    >
                                                        Chọn
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => onRemoveItem(item.id)}
                                                    className="pos-table-btn"
                                                    title="Xóa phiếu khỏi bộ nhớ tạm"
                                                    disabled={item.status === 'SYNCING'}
                                                >
                                                    Xóa
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Modal Footer */}
                <div className="pos-modal-footer">
                    {isOnline ? (
                        /* ONLINE: Nút đồng bộ chính */
                        <button
                            onClick={onSyncNow}
                            disabled={isSyncing || pendingCount === 0}
                            className="pos-sync-all-btn"
                            title="Đồng bộ lần lượt từng phiếu theo thứ tự thời gian từ cũ đến mới (FIFO)"
                        >
                            {isSyncing && <RefreshCw size={15} className="animate-spin" />}
                            <span>
                                {isSyncing
                                    ? 'Đang đồng bộ theo thứ tự...'
                                    : pendingCount > 0
                                        ? `Đồng bộ tất cả (${pendingCount})`
                                        : 'Đã đồng bộ'}
                            </span>
                        </button>
                    ) : (
                        /* OFFLINE: Thông báo — nút đồng bộ bị vô hiệu hóa */
                        <button
                            disabled
                            className="pos-sync-all-btn"
                            title="Không thể đồng bộ khi mất kết nối Internet"
                            style={{ opacity: 0.5, cursor: 'not-allowed' }}
                        >
                            <WifiOff size={15} />
                            <span>Cần có Internet để đồng bộ</span>
                        </button>
                    )}
                </div>

            </div>
        </div>
    );
}
