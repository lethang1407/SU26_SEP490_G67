import { useEffect, useState } from 'react';
import { Button, Modal, Table } from 'react-bootstrap';
import { getReturnHoldLines } from '../api/inventoryAttentionApi';

const formatDate = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('vi-VN');
};

/**
 * Danh sách hiện ra khi bấm "sản phẩm đổi trả chờ xử lý" trên thẻ Kho hàng.
 *
 * <p>Đây là hàng KHÁCH trả lại đang nằm ở khu đổi trả (kể cả nguyên vẹn) — cùng nguồn
 * với con số trên thẻ nên số dòng luôn khớp. Không phải phiếu trả hàng nhà cung cấp.
 * Xử lý (đẩy vào kho / huỷ / trả NCC) làm ở màn Vị trí kho, nút "Đi tới xử lý" dẫn sang đó.
 */
export default function ReturnHoldLinesModal({ open, onClose, onGoToProcess }) {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!open) return undefined;

        let cancelled = false;
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const result = await getReturnHoldLines();
                if (!cancelled) setRows(result ?? []);
            } catch (err) {
                console.error('Failed to fetch return-hold lines:', err);
                if (!cancelled) {
                    setRows([]);
                    setError('Không tải được danh sách hàng đổi trả. Vui lòng thử lại.');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [open]);

    return (
        <Modal show={open} onHide={onClose} size="lg" centered scrollable>
            <Modal.Header closeButton>
                <Modal.Title>Hàng đổi trả chờ xử lý</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {loading && <p className="text-muted mb-0">Đang tải danh sách hàng đổi trả...</p>}

                {!loading && error && <p className="text-danger mb-0">{error}</p>}

                {!loading && !error && rows.length === 0 && (
                    <p className="text-muted mb-0">Không có hàng đổi trả nào đang chờ xử lý.</p>
                )}

                {!loading && !error && rows.length > 0 && (
                    <Table hover responsive className="mb-0 align-middle">
                        <thead>
                            <tr>
                                <th>Sản phẩm</th>
                                <th>Mã trả hàng</th>
                                <th>Tình trạng</th>
                                <th className="text-end">SL</th>
                                <th>Ngày trả</th>
                                <th className="text-end">Đã chờ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => (
                                <tr key={row.returnDetailId}>
                                    <td>
                                        <div className="fw-semibold">{row.productName}</div>
                                        {row.productSku && (
                                            <small className="text-muted d-block">{row.productSku}</small>
                                        )}
                                        {row.note && (
                                            <small className="text-muted d-block">Ghi chú: {row.note}</small>
                                        )}
                                    </td>
                                    <td>{row.returnCode || '—'}</td>
                                    <td>{row.conditionLabel}</td>
                                    <td className="text-end fw-bold">
                                        {row.quantity}
                                        {row.unitName && <span className="fw-normal"> {row.unitName}</span>}
                                    </td>
                                    <td>{formatDate(row.returnedAt)}</td>
                                    <td className="text-end text-danger fw-semibold">
                                        {row.daysWaiting} ngày
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                )}
            </Modal.Body>
            <Modal.Footer>
                <Button variant="outline-secondary" onClick={onClose}>
                    Đóng
                </Button>
                <Button variant="primary" onClick={onGoToProcess} disabled={rows.length === 0}>
                    Đi tới xử lý
                </Button>
            </Modal.Footer>
        </Modal>
    );
}
