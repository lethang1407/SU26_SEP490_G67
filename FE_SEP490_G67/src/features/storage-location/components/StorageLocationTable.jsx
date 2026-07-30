import { LOCATION_STATUS_LABEL } from '../constants';
import { getLocationMetrics, getLocationStatus } from '../utils/storageLocationUtils';

export default function StorageLocationTable({ locations, selectedLocationId, onSelectLocation }) {
    if (locations.length === 0) {
        return (
            <div className="storage-location-empty">
                <p>Không tìm thấy vị trí phù hợp với bộ lọc.</p>
            </div>
        );
    }

    return (
        <div className="storage-location-table-wrap">
            <table className="storage-location-table">
                <thead>
                    <tr>
                        <th>Mã vị trí</th>
                        <th>Khu</th>
                        <th>Hàng</th>
                        <th>Kệ</th>
                        <th>Ô</th>
                        <th>Trạng thái</th>
                        <th>Sản phẩm trên kệ</th>
                        <th>Số lô</th>
                        <th>Tổng SL</th>
                        <th>Mô tả</th>
                        <th />
                    </tr>
                </thead>
                <tbody>
                    {locations.map((location) => {
                        const status = getLocationStatus(location);
                        const { batchCount, totalQty, product } = getLocationMetrics(location);

                        return (
                            <tr
                                key={location.id}
                                className={
                                    selectedLocationId === location.id
                                        ? 'storage-location-table__row--selected'
                                        : ''
                                }
                            >
                                <td className="storage-location-table__code">{location.label}</td>
                                <td>{location.zone}</td>
                                <td>{location.aisle || '—'}</td>
                                <td>{location.shelf || '—'}</td>
                                <td>{location.bin || '—'}</td>
                                <td>
                                    <span
                                        className={`storage-location-status-badge storage-location-status-badge--${status}`}
                                    >
                                        {LOCATION_STATUS_LABEL[status]}
                                    </span>
                                </td>
                                <td className="storage-location-table__product">
                                    {product?.productName ?? '—'}
                                </td>
                                <td>{product ? batchCount : '—'}</td>
                                <td>{product ? totalQty : '—'}</td>
                                <td className="storage-location-table__desc">
                                    {location.description || '—'}
                                </td>
                                <td>
                                    <button
                                        type="button"
                                        className="storage-location-table__detail-btn"
                                        onClick={() => onSelectLocation(location)}
                                    >
                                        Chi tiết
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
