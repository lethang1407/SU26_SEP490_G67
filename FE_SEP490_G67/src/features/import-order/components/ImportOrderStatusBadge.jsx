import { IMPORT_ORDER_STATUS_LABEL } from '../constants';

export default function ImportOrderStatusBadge({ status }) {
    return (
        <span className={`import-order-status import-order-status--${status}`}>
            {IMPORT_ORDER_STATUS_LABEL[status] ?? status}
        </span>
    );
}
