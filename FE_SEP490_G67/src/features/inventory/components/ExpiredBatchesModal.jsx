import { useEffect, useState } from 'react';
import { Modal, Table } from 'react-bootstrap';
import { getExpiredBatches } from '../api/inventoryAttentionApi';

const formatDate = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('vi-VN');
};

/**
 * Danh sách hiện ra khi bấm "Hàng hết hạn" trên thẻ Kho hàng.
 *
 * <p>Đi theo lô chứ không gộp theo sản phẩm: cùng một SP có thể vừa có lô hết hạn vừa
 * có lô còn hạn, gộp lại thì không biết phải bỏ lô nào. Cột "SL hết hạn" là số lượng
 * thật của riêng lô đó — tổng tồn của SP chỉ đứng cạnh làm thông tin tham khảo.
 */
export default function ExpiredBatchesModal({ open, onClose }) {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!open) return undefined;

        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                const result = await getExpiredBatches();
                if (!cancelled) setRows(result ?? []);
            } catch {
                if (!cancelled) setRows([]);
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
                <Modal.Title>Hàng hết hạn</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {loading && <p className="text-muted mb-0">Đang tải danh sách lô hết hạn...</p>}

                {!loading && rows.length === 0 && (
                    <p className="text-muted mb-0">Không có lô hàng nào đã hết hạn.</p>
                )}

                {!loading && rows.length > 0 && (
                    <Table hover responsive className="mb-0 align-middle">
                        <thead>
                            <tr>
                                <th>Sản phẩm</th>
                                <th>Mã lô</th>
                                <th>Ngày hết hạn</th>
                                <th className="text-end">Quá hạn</th>
                                <th className="text-end">SL hết hạn</th>
                                <th className="text-end">Tổng tồn</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => (
                                <tr key={row.batchId}>
                                    <td>
                                        <div className="fw-semibold">{row.productName}</div>
                                        {row.productSku && (
                                            <small className="text-muted">{row.productSku}</small>
                                        )}
                                    </td>
                                    <td>{row.batchCode}</td>
                                    <td>{formatDate(row.expiryDate)}</td>
                                    <td className="text-end text-danger fw-semibold">
                                        {row.daysOverdue} ngày
                                    </td>
                                    <td className="text-end fw-bold">{row.expiredQuantity}</td>
                                    <td className="text-end text-muted">{row.productTotalStock}</td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                )}
            </Modal.Body>
        </Modal>
    );
}
