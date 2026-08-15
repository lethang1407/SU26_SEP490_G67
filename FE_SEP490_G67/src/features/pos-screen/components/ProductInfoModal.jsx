import { useEffect, useState } from 'react';
import { X, AlertCircle, MapPin } from 'lucide-react';
import { getProductPosInfo } from '../api';
import { getApiErrorMessage } from '../../../utils/api-utils';
import { formatVnd } from '../utils/money';

/** Ngày dạng ISO (yyyy-MM-dd) từ BE -> dd/MM/yyyy, rỗng thì gạch ngang. */
const formatVnDate = (isoDate) =>
    isoDate ? new Date(isoDate).toLocaleDateString('vi-VN') : '—';

export default function ProductInfoModal({ productId, onClose }) {
    const [info, setInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            try {
                const data = await getProductPosInfo(productId);
                if (!cancelled) setInfo(data);
            } catch (err) {
                if (!cancelled) setError(getApiErrorMessage(err, 'Không thể tải thông tin sản phẩm'));
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        load();
        return () => { cancelled = true; };
    }, [productId]);

    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    return (
        <div className="batch-modal-overlay" onClick={onClose}>
            <div className="batch-modal product-info-modal" onClick={(e) => e.stopPropagation()}>
                <div className="batch-modal-header">
                    <div>
                        <div className="batch-modal-title">Thông tin sản phẩm</div>
                        <div className="batch-modal-subtitle">
                            {info?.name ?? (loading ? 'Đang tải...' : '')}
                        </div>
                    </div>
                    <button className="batch-modal-close" onClick={onClose} title="Đóng">
                        <X size={18} />
                    </button>
                </div>

                {loading && <div className="batch-modal-empty">Đang tải...</div>}

                {error && (
                    <div className="product-info-error">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}

                {info && !loading && (
                    <div className="product-info-body">
                        <dl className="product-info-grid">
                            <dt>Mã vạch</dt>
                            <dd>{info.barcode || '—'}</dd>

                            <dt>Nhóm hàng</dt>
                            <dd>{info.categoryName || '—'}</dd>

                            <dt>Giá bán</dt>
                            <dd className="product-info-price">
                                {formatVnd(info.sellingPrice)}
                            </dd>

                            <dt>Tồn kho</dt>
                            <dd>
                                <span className={info.belowMinStock ? 'product-info-stock-low' : 'font-bold'}>
                                    {Number(info.availableQuantity ?? 0).toLocaleString('vi-VN')}
                                </span>
                                {info.units?.length > 0 && ` ${info.units[0].name}`}
                                {info.belowMinStock && (
                                    <span className="product-info-stock-warning">
                                        dưới định mức {Number(info.minStock ?? 0).toLocaleString('vi-VN')}
                                    </span>
                                )}
                            </dd>

                            {info.units?.length > 1 && (
                                <>
                                    <dt>Quy đổi</dt>
                                    <dd>
                                        {info.units.map((u) => (
                                            <div key={u.id}>
                                                1 {u.name} = {Number(u.unitBase ?? 1).toLocaleString('vi-VN')} {info.units[0].name}
                                            </div>
                                        ))}
                                    </dd>
                                </>
                            )}

                            {info.description && (
                                <>
                                    <dt>Mô tả</dt>
                                    <dd>{info.description}</dd>
                                </>
                            )}
                        </dl>

                        <div className="product-info-section-title">
                            <MapPin size={14} />
                            Vị trí để hàng
                        </div>

                        {info.locations?.length > 0 ? (
                            <table className="batch-modal-table">
                                <thead>
                                    <tr>
                                        <th>Vị trí</th>
                                        <th>Khu</th>
                                        <th>Lô</th>
                                        <th className="text-right">Số lượng</th>
                                        <th className="text-right">Ngày nhập</th>
                                        <th className="text-right">HSD</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* Mỗi dòng là một lô tại một ô — một ô kho có thể chứa
                                        nhiều lô của cùng SP nên key phải gồm cả batchId. */}
                                    {info.locations.map((loc) => (
                                        <tr key={`${loc.locationId}-${loc.batchId}`}>
                                            <td>{loc.label}</td>
                                            <td>{loc.zoneType === 'SALES' ? 'Quầy' : 'Kho'}</td>
                                            <td>{loc.batchCode ?? '—'}</td>
                                            <td className="text-right">
                                                {Number(loc.quantity ?? 0).toLocaleString('vi-VN')}
                                            </td>
                                            <td className="text-right">{formatVnDate(loc.receivedDate)}</td>
                                            <td className="text-right">{formatVnDate(loc.expiryDate)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="batch-modal-empty">
                                Không còn hàng trong kho bán.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
