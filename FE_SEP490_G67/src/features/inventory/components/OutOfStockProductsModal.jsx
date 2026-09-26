import { useEffect, useState } from 'react';
import { Badge, Button, Modal, Table } from 'react-bootstrap';
import { getOutOfStockProducts } from '../api/inventoryAttentionApi';

export default function OutOfStockProductsModal({ open, onClose, onCreateImport }) {
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
                const result = await getOutOfStockProducts();
                if (!cancelled) setRows(result ?? []);
            } catch (err) {
                console.error('Failed to fetch out-of-stock products:', err);
                if (!cancelled) {
                    setRows([]);
                    setError('Không tải được danh sách sản phẩm hết hàng. Vui lòng thử lại.');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [open]);

    const windowDays = rows[0]?.windowDays;

    return (
        <Modal show={open} onHide={onClose} size="lg" centered scrollable>
            <Modal.Header closeButton>
                <Modal.Title>Sản phẩm đã hết hàng</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {loading && <p className="text-muted mb-0">Đang tải danh sách sản phẩm hết hàng...</p>}

                {!loading && error && <p className="text-danger mb-0">{error}</p>}

                {!loading && !error && rows.length === 0 && (
                    <p className="text-muted mb-0">Không có sản phẩm nào đang hết hàng.</p>
                )}

                {!loading && !error && rows.length > 0 && (
                    <Table hover responsive className="mb-0 align-middle">
                        <thead>
                            <tr>
                                <th>Sản phẩm</th>
                                <th>Nhóm hàng</th>
                                <th className="text-end">Định mức</th>
                                <th className="text-end">
                                    Đã bán {windowDays ? `${windowDays} ngày` : ''}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => (
                                <tr key={row.productId}>
                                    <td>
                                        <div className="fw-semibold">
                                            {row.productName}
                                            {row.highVolume && (
                                                <Badge bg="danger" className="ms-2">Bán chạy</Badge>
                                            )}
                                        </div>
                                        {row.productSku && (
                                            <small className="text-muted d-block">{row.productSku}</small>
                                        )}
                                    </td>
                                    <td>{row.categoryName || '—'}</td>
                                    <td className="text-end">{row.minStock ?? '—'}</td>
                                    <td className="text-end fw-bold">{row.soldInWindow}</td>
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
                <Button variant="primary" onClick={onCreateImport} disabled={rows.length === 0}>
                    Tạo phiếu nhập
                </Button>
            </Modal.Footer>
        </Modal>
    );
}