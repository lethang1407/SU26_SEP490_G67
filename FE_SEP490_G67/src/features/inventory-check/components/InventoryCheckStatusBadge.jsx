import { CHECK_STATUS_LABEL } from '../constants';

export default function InventoryCheckStatusBadge({ status }) {
    return (
        <span className={`inventory-check-status inventory-check-status--${status}`}>
            {CHECK_STATUS_LABEL[status] ?? status}
        </span>
    );
}
