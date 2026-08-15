/**
 * @param {object} params
 * @param {number} params.returnAmount    V — tổng giá trị hàng khách trả về
 * @param {number} params.exchangeAmount  X — tổng giá trị hàng khách lấy đi
 * @param {number} params.debtRemaining   R — nợ còn lại của hóa đơn gốc
 * @param {boolean} params.isDebt         hóa đơn gốc là đơn bán nợ
 * @param {string|null} params.dueDate    hạn trả nợ (ISO)
 * @param {number} params.debtPayment     A — tiền khách chủ động trả thêm
 */
export function previewSettlement({
    returnAmount = 0,
    exchangeAmount = 0,
    debtRemaining = 0,
    isDebt = false,
    dueDate = null,
    debtPayment = 0,
}) {
    const V = Math.max(0, Number(returnAmount) || 0);
    const X = Math.max(0, Number(exchangeAmount) || 0);
    const R = isDebt ? Math.max(0, Number(debtRemaining) || 0) : 0;

    const debtOffset = Math.min(R, V);
    const credit = V - debtOffset;
    const exchangeCredit = Math.min(credit, X);
    const cashRefund = credit - exchangeCredit;
    const shortfall = X - exchangeCredit;

    // Chỉ ghi nợ tiếp khi hóa đơn gốc THỰC SỰ còn nợ và hạn trả còn hiệu lực. Đơn nợ đã
    // trả hết, hoặc đơn nợ cũ không có hạn, thì phần chênh phải thu tiền ngay — không tạo
    // được một khoản nợ mà không định được hạn trả.
    const canExtendDebt = R > 0 && !!dueDate && new Date(dueDate).getTime() > Date.now();

    const newDebtOnExchange = canExtendDebt ? shortfall : 0;
    const cashCollect = canExtendDebt ? 0 : shortfall;

    const remainingAfterOffset = R - debtOffset;
    // Tiền trả thêm bị chặn ở phần nợ CÒN LẠI SAU cấn trừ: hàng trả đã xóa bớt nợ rồi,
    // nhận thêm quá số đó là nhận tiền cho một khoản không tồn tại.
    const maxDebtPayment = remainingAfterOffset;
    const appliedDebtPayment = Math.max(0, Math.min(Number(debtPayment) || 0, maxDebtPayment));

    return {
        debtRemainingBefore: R,
        debtOffset,
        exchangeCredit,
        cashRefund,
        cashCollect,
        newDebtOnExchange,
        canExtendDebt,
        maxDebtPayment,
        debtPaymentCollected: appliedDebtPayment,
        debtRemainingAfter: remainingAfterOffset - appliedDebtPayment,
        /** Tổng tiền khách đưa cho cửa hàng tại quầy (bù hàng đắt hơn + trả thêm nợ). */
        totalCashIn: cashCollect + appliedDebtPayment,
        /** Có phát sinh tiền mặt hai chiều không — quyết định việc hiện ô chọn hình thức. */
        hasCashMovement: cashRefund > 0 || cashCollect + appliedDebtPayment > 0,
    };
}
