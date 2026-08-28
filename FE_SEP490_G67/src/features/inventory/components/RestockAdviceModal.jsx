import { Badge, Button, Modal } from 'react-bootstrap';

const TONE_VARIANT = {
    RED: 'danger',
    ORANGE: 'warning',
    GRAY: 'secondary',
};

const formatDate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleDateString('vi-VN');
};

/** "12/08/2026 (14 ngày trước)", hoặc câu thay thế khi sản phẩm chưa từng bán. */
const lastSaleText = (item) => {
    const date = formatDate(item.lastSoldAt);
    if (!date) return 'Chưa từng bán';
    if (item.daysSinceLastSale == null) return date;
    if (item.daysSinceLastSale <= 0) return `${date} (hôm nay)`;
    return `${date} (${item.daysSinceLastSale} ngày trước)`;
};

function Row({ label, children }) {
    return (
        <div className="d-flex gap-3 py-2 border-bottom">
            <div className="text-muted" style={{ minWidth: 150 }}>{label}</div>
            <div className="flex-grow-1">{children}</div>
        </div>
    );
}

/**
 * Panel chi tiết mở ra khi bấm "Xem" trên widget gợi ý nhập hàng.
 *
 * <p>Không gọi API riêng: mọi số liệu đã nằm sẵn trong dòng widget, panel chỉ bày ra
 * đầy đủ những gì bảng phải cắt bớt. Đây cũng là chỗ duy nhất mời tạo phiếu nhập —
 * widget cố ý không đẩy chủ cửa hàng nhập hàng trước khi xem số.
 */
export default function RestockAdviceModal({
    item,
    windowDays,
    dismissing = false,
    onClose,
    onImport,
    onDismiss,
}) {
    if (!item) return null;

    return (
        <Modal show onHide={onClose} centered>
            <Modal.Header closeButton>
                <Modal.Title as="div">
                    <div className="fw-semibold">{item.productName}</div>
                    {item.sku && <small className="text-muted">{item.sku}</small>}
                </Modal.Title>
            </Modal.Header>

            <Modal.Body className="pt-2">
                <Row label="Tồn / Ngưỡng">
                    <span className="fw-semibold">{item.stockRatioText}</span>
                    {item.stockStateLabel && (
                        <Badge
                            bg={item.stockState === 'OUT_OF_STOCK' ? 'danger' : 'warning'}
                            className="ms-2"
                        >
                            {item.stockStateLabel}
                        </Badge>
                    )}
                </Row>

                <Row label={`Bán ${windowDays} ngày gần nhất`}>
                    {item.soldInWindowText}
                </Row>

                <Row label="Lần bán gần nhất">{lastSaleText(item)}</Row>

                <Row label="Nhà cung cấp">{item.supplierName || '—'}</Row>

                <Row label="Đánh giá">
                    <Badge bg={TONE_VARIANT[item.priorityTone] ?? 'secondary'}>
                        {item.priorityLabel}
                    </Badge>
                    <div className="text-muted mt-1" style={{ fontSize: 13 }}>{item.reason}</div>
                </Row>
            </Modal.Body>

            <Modal.Footer className="justify-content-between">
                <Button
                    variant="outline-secondary"
                    disabled={dismissing}
                    onClick={() => onDismiss(item)}
                >
                    {dismissing ? 'Đang bỏ qua...' : 'Bỏ qua hôm nay'}
                </Button>
                <Button variant="primary" onClick={() => onImport(item)}>
                    Tạo phiếu nhập
                </Button>
            </Modal.Footer>
        </Modal>
    );
}
