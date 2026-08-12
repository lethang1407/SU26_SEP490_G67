/**
 * Trạng thái công nợ nằm trên một trục khác với trạng thái hóa đơn: một hóa đơn
 * có thể vừa "Trả một phần" vừa đang còn nợ, nên đây là badge riêng chứ không
 * gộp vào OrderStatusBadge.
 *
 * BE gửi debtStatus = null cho hóa đơn trả tiền ngay -> không hiện gì.
 */
const DEBT_CONFIG = {
    IN_DEBT: { label: 'Còn nợ', cls: 'badge-debt' },
    OVERDUE: { label: 'Quá hạn', cls: 'badge-overdue' },
    PAID: { label: 'Đã trả nợ', cls: 'badge-paid' },
};

const formatMoney = (amount) => `${Number(amount ?? 0).toLocaleString('vi-VN')}đ`;

const formatVnDate = (iso) => (iso ? new Date(iso).toLocaleDateString('vi-VN') : null);

/** Tooltip: còn nợ bao nhiêu, hạn ngày nào. */
function buildTitle(debtStatus, remainingDebt, dueDate) {
    if (debtStatus === 'PAID') return 'Hóa đơn bán nợ đã trả đủ';

    const due = formatVnDate(dueDate);
    const parts = [`Còn nợ ${formatMoney(remainingDebt)}`];
    if (due) parts.push(debtStatus === 'OVERDUE' ? `quá hạn ${due}` : `hạn trả ${due}`);
    return parts.join(' · ');
}

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
