import { Link } from 'react-router-dom';
import SupplierStatusBadge from './SupplierStatusBadge';
import { formatCurrency } from '../utils/supplierUtils';

export default function SupplierTable({ items, loading }) {
    if (loading) {
        return (
            <div className="supplier-table-card supplier-table-card--empty">
                <p>Đang tải danh sách nhà cung cấp...</p>
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="supplier-table-card supplier-table-card--empty">
                <p>Không tìm thấy nhà cung cấp phù hợp.</p>
            </div>
        );
    }

    return (
        <div className="supplier-table-card">
            <div className="supplier-table-wrapper">
                <table className="supplier-table">
                    <thead>
                        <tr>
                            <th>Mã NCC</th>
                            <th>Tên nhà cung cấp</th>
                            <th>Số điện thoại</th>
                            <th>Địa chỉ</th>
                            <th>Nợ hiện tại</th>
                            <th>Trạng thái</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((supplier) => (
                            <tr key={supplier.id}>
                                <td>
                                    <Link
                                        to={`/admin/warehouse/supplier/${supplier.id}`}
                                        className="supplier-table__code"
                                    >
                                        {supplier.supplierCode}
                                    </Link>
                                </td>
                                <td className="supplier-table__name">
                                    <Link
                                        to={`/admin/warehouse/supplier/${supplier.id}`}
                                        className="supplier-table__name-link"
                                    >
                                        {supplier.name}
                                    </Link>
                                </td>
                                <td className="supplier-table__phone">{supplier.phoneNumber}</td>
                                <td className="supplier-table__address" title={supplier.address}>
                                    {supplier.address}
                                </td>
                                <td
                                    className={`supplier-table__debt ${
                                        supplier.currentDebt > 0 ? 'supplier-table__debt--highlight' : ''
                                    }`}
                                >
                                    {formatCurrency(supplier.currentDebt)}
                                </td>
                                <td>
                                    <SupplierStatusBadge status={supplier.status} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
