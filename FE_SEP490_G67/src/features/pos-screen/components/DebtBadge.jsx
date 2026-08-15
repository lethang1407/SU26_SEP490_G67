import { formatVnd as formatMoney } from '../utils/money';

const DEBT_CONFIG = {
    IN_DEBT: { label: 'Còn nợ', cls: 'badge-debt' },
    OVERDUE: { label: 'Quá hạn', cls: 'badge-overdue' },
    PAID: { label: 'Đã trả nợ', cls: 'badge-paid' },
};

const formatVnDate = (iso) => (iso ? new Date(iso).toLocaleDateString('vi-VN') : null);

/** Tooltip: còn nợ bao nhiêu, hạn ngày nào. */
function buildTitle(debtStatus, remainingDebt, dueDate) {
    if (debtStatus === 'PAID') return 'Hóa đơn bán nợ đã trả đủ';

    const due = formatVnDate(dueDate);
    const parts = [`Còn nợ ${formatMoney(remainingDebt)}`];
    if (due) parts.push(debtStatus === 'OVERDUE' ? `quá hạn ${due}` : `hạn trả ${due}`);
    return parts.join(' · ');
}

/**
 * Lịch sử đơn hàng không còn trạng thái "Chờ duyệt": đơn nợ vào công nợ khách ngay
 * khi lập, việc rà soát khách nợ mới được đẩy sang thông báo cho admin thay vì
 * treo một trạng thái trên hóa đơn.
 */
export default function DebtBadge({ debtStatus, remainingDebt, dueDate }) {
    const cfg = DEBT_CONFIG[debtStatus];
    if (!cfg) return null;

    return (
        <span
            className={`hist-badge ${cfg.cls}`}
            title={buildTitle(debtStatus, remainingDebt, dueDate)}
        >
            {cfg.label}
            {debtStatus !== 'PAID' && ` ${formatMoney(remainingDebt)}`}
        </span>
    );
}
