import { LOCATION_STATUS_LABEL, SHELF_SIZE_LABEL, ZONE_TYPE, ZONE_TYPE_LABEL, normalizeShelfSize } from '../constants';
import { getLocationMetrics, getLocationStatus } from '../utils/storageLocationUtils';

export default function StorageLocationTable({ locations, selectedLocationId, onSelectLocation }) {
    if (locations.length === 0) {
        return (
            <div className="storage-location-empty">
                <p>Không tìm thấy vị trí phù hợp với bộ lọc.</p>
            </div>
        );
    }

    const sorted = [...locations].sort((a, b) => {
        const typeA = a.zoneType === ZONE_TYPE.SALES ? 0 : 1;
        const typeB = b.zoneType === ZONE_TYPE.SALES ? 0 : 1;
        if (typeA !== typeB) return typeA - typeB;
        const zoneCmp = String(a.zone ?? '').localeCompare(String(b.zone ?? ''));
        if (zoneCmp !== 0) return zoneCmp;
        return String(a.label ?? '').localeCompare(String(b.label ?? ''));
    });

    return (
        <div className="storage-location-table-wrap">
            <table className="storage-location-table">
                <thead>
                    <tr>
                        <th>Mã vị trí</th>
                        <th>Khu</th>
                        <th>Loại khu</th>
                        <th>Tầng</th>
                        <th>Ô</th>
                        <th>Kích thước</th>
                        <th>Trạng thái</th>
                        <th>Sản phẩm trên kệ</th>
                        <th>Số lô</th>
                        <th>Tổng SL</th>
                        <th>Mô tả</th>
                        <th />
                    </tr>
                </thead>
                <tbody>
                    {sorted.map((location) => {
                        const status = getLocationStatus(location);
                        const { batchCount, totalQty, product } = getLocationMetrics(location);
                        const sizeKey = normalizeShelfSize(location.size);
                        const zoneType = location.zoneType === ZONE_TYPE.SALES
                            ? ZONE_TYPE.SALES
                            : ZONE_TYPE.WAREHOUSE;

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
                                <td>{ZONE_TYPE_LABEL[zoneType]}</td>
                                <td>{location.shelf || '—'}</td>
                                <td>{location.bin || '—'}</td>
                                <td>{SHELF_SIZE_LABEL[sizeKey]}</td>
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
