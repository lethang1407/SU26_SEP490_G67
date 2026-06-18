import { SUPPLIER_STATUS, SUPPLIER_STATUS_LABEL } from '../constants';

const BADGE_CLASS = {
    [SUPPLIER_STATUS.ACTIVE]: 'supplier-badge--active',
    [SUPPLIER_STATUS.HAS_DEBT]: 'supplier-badge--debt',
    [SUPPLIER_STATUS.PAUSED]: 'supplier-badge--paused',
};

export default function SupplierStatusBadge({ status }) {
    return (
        <span className={`supplier-badge ${BADGE_CLASS[status] || ''}`}>
            {SUPPLIER_STATUS_LABEL[status] || status}
        </span>
    );
}
