import { Link } from 'react-router-dom';
import { ChevronRight, Pencil, Wallet } from 'lucide-react';
import SupplierStatusBadge from './SupplierStatusBadge';

export default function SupplierDetailHeader({ supplier, onPayDebt, onEdit }) {
    const canPayDebt = supplier.currentDebt > 0;

    return (
        <div className="supplier-detail-header">
            <nav className="supplier-breadcrumb" aria-label="Breadcrumb">
                <Link to="/admin/dashboard" className="supplier-breadcrumb__link">
                    Trang chủ
                </Link>
                <ChevronRight size={14} className="supplier-breadcrumb__sep" />
                <Link to="/admin/warehouse/supplier" className="supplier-breadcrumb__link">
                    Nhà cung cấp
                </Link>
                <ChevronRight size={14} className="supplier-breadcrumb__sep" />
                <span className="supplier-breadcrumb__link">Chi tiết nhà cung cấp</span>
                <ChevronRight size={14} className="supplier-breadcrumb__sep" />
                <span className="supplier-breadcrumb__current">{supplier.name}</span>
            </nav>

            <div className="supplier-detail-header__main">
                <div className="supplier-detail-header__info">
                    <div className="supplier-detail-header__title-row">
                        <h1 className="supplier-detail-header__title">{supplier.name}</h1>
                        <SupplierStatusBadge status={supplier.status} />
                    </div>
                    <p className="supplier-detail-header__meta">
                        <span>{supplier.supplierCode}</span>
                        <span className="supplier-detail-header__dot">·</span>
                        <span>{supplier.shortLocation || supplier.address}</span>
                    </p>
                </div>

                <div className="supplier-detail-header__actions">
                    <button
                        type="button"
                        className="supplier-btn supplier-btn--pay"
                        disabled={!canPayDebt}
                        onClick={onPayDebt}
                        title={canPayDebt ? 'Thanh toán nợ' : 'Không có công nợ'}
                    >
                        <Wallet size={18} />
                        Thanh toán nợ
                    </button>
                    <button type="button" className="supplier-btn supplier-btn--secondary" onClick={onEdit}>
                        <Pencil size={18} />
                        Sửa
                    </button>
                </div>
            </div>
        </div>
    );
}
