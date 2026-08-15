package project.be_sep490_g67.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Component;
import project.be_sep490_g67.entity.Customer;
import project.be_sep490_g67.entity.SalesOrder;
import project.be_sep490_g67.enums.DebtStatus;
import project.be_sep490_g67.exception.AppException;
import project.be_sep490_g67.exception.ErrorCode;
import project.be_sep490_g67.repository.CustomerRepository;
import project.be_sep490_g67.repository.DebtPaymentRepository;
import project.be_sep490_g67.repository.SalesOrderRepository;
import project.be_sep490_g67.utils.DebtCalculator;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Luật công nợ dùng chung cho mọi nghiệp vụ chạm vào nợ của khách.
 *
 * <p>Trước đây toàn bộ phần này nằm private trong {@code SalesOrderService}, đúng lúc chỉ
 * có bán nợ cần tới. Từ khi đổi/trả cũng phải cấn trừ công nợ (nhóm quyết định F,
 * 13/08/2026) thì {@code ExchangeOrderService} cần y hệt các luật đó. Chép sang sẽ tạo ra
 * bản sao thứ năm của công thức nợ trong dự án — đúng thứ mà {@link DebtCalculator} được
 * viết ra để dẹp — nên phần luật được tách ra đây thay vì nhân bản.
 *
 * <p>Ranh giới: lớp này giữ <b>luật</b> (được nợ không, còn nợ bao nhiêu, cộng/trừ công nợ).
 * Phần <b>số học thuần</b> vẫn nằm ở {@link DebtCalculator}, và những thứ chỉ đúng với lúc
 * tạo đơn ({@code resolvePrepaid}, cờ {@code isCheckDebtUnstable}) vẫn ở lại
 * {@code SalesOrderService}.
 */
@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class DebtPolicy {

    SalesOrderRepository salesOrderRepository;
    DebtPaymentRepository debtPaymentRepository;
    CustomerRepository customerRepository;

    /**
     * Điều kiện để được ghi nợ. Màu trạng thái trên POS chỉ là gợi ý cho thu ngân;
     * quyết định cuối cùng nằm ở đây vì FE có thể bị bỏ qua bằng cách gọi thẳng API.
     *
     * <p>Nợ quá hạn KHÔNG còn chặn bán nợ: cửa hàng vẫn bán tiếp cho khách quen đang
     * trễ hạn, việc thu nợ cũ xử lý riêng. Cửa chặn duy nhất còn lại là cờ
     * {@code allowDebt} do quản lý đặt trên hồ sơ khách. {@link #hasOverdueDebt} vẫn
     * giữ lại vì các nghiệp vụ khác (đổi/trả) còn dùng để cảnh báo.
     */
    public void validateDebtSale(Customer customer, Instant dueDate, Instant now) {
        if (customer == null) {
            throw new AppException(ErrorCode.DEBT_REQUIRES_CUSTOMER);
        }
        if (!Boolean.TRUE.equals(customer.getAllowDebt())) {
            throw new AppException(ErrorCode.CUSTOMER_NOT_ALLOWED_DEBT);
        }
        if (dueDate == null) {
            throw new AppException(ErrorCode.DEBT_DUE_DATE_REQUIRED);
        }
        if (!dueDate.isAfter(now)) {
            throw new AppException(ErrorCode.DEBT_DUE_DATE_IN_PAST);
        }
    }

    /**
     * Kiểm tra khách còn đơn nợ nào quá hạn mà chưa trả hết không lọc theo
     * {@code dueDate < now}; phần "còn nợ bao nhiêu" để {@link DebtCalculator} tính ở tầng
     * service, tránh nhúng công thức nợ vào JPQL thêm một lần nữa.
     */
    public boolean hasOverdueDebt(Integer customerId, Instant now) {
        List<SalesOrder> overdueCandidates =
                salesOrderRepository.findOverdueDebtOrdersByCustomerId(customerId, now);
        if (overdueCandidates.isEmpty()) {
            return false;
        }
        Map<Integer, BigDecimal> paidByOrderId = debtPaymentRepository
                .sumPaidBySalesOrderIds(overdueCandidates.stream().map(SalesOrder::getId).toList())
                .stream()
                .collect(Collectors.toMap(
                        row -> (Integer) row[0],
                        row -> (BigDecimal) row[1]));

        return overdueCandidates.stream().anyMatch(o -> DebtCalculator
                .remaining(o.getTotalAmount(), o.getPaidAmount(),
                        paidByOrderId.getOrDefault(o.getId(), BigDecimal.ZERO))
                .compareTo(BigDecimal.ZERO) > 0);
    }

    /**
     * Số tiền một hoá đơn còn nợ. Đơn không phải đơn nợ luôn trả 0 — đơn thường được
     * tạo với {@code paidAmount = totalAmount} nên công thức vẫn ra 0, nhưng chặn sớm
     * để khỏi tốn một query {@code sumPaidBySalesOrderId} cho mỗi đơn thường.
     */
    public BigDecimal remainingOf(SalesOrder order) {
        if (!Boolean.TRUE.equals(order.getIsDebt())) {
            return BigDecimal.ZERO;
        }
        return DebtCalculator.remaining(
                order.getTotalAmount(),
                order.getPaidAmount(),
                debtPaymentRepository.sumPaidBySalesOrderId(order.getId()));
    }

    /**
     * Đơn nợ này đã quá hạn mà vẫn chưa trả hết chưa. Đơn quá hạn nhưng đã trả đủ qua
     * {@code DebtPayment} thì không tính là quá hạn — nợ đã xong, ngày tháng không còn ý nghĩa.
     */
    public boolean isOverdue(SalesOrder order, Instant now) {
        return Boolean.TRUE.equals(order.getIsDebt())
                && order.getDueDate() != null
                && order.getDueDate().isBefore(now)
                && remainingOf(order).compareTo(BigDecimal.ZERO) > 0;
    }

    /** Cộng thêm vào công nợ của khách. Không làm gì khi số tiền không dương. */
    public void addToCustomerDebt(Customer customer, BigDecimal amount) {
        if (customer == null || amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }
        customer.setTotalDebt(currentDebt(customer).add(amount));
        customer.setStatus(DebtStatus.IN_DEBT.name());
        customerRepository.save(customer);
    }

    /**
     * Trừ bớt công nợ của khách, dùng khi trả hàng cấn trừ vào đơn nợ.
     *
     * <p>Sàn ở 0: {@code totalDebt} là số tổng hợp, còn phần cấn trừ được tính trên từng
     * hoá đơn. Nếu {@code totalDebt} đã lệch sẵn (dữ liệu cũ, đơn bị xoá) thì việc trả hàng
     * không được phép đẩy nó xuống âm — cửa hàng không nợ khách.
     */
    public void reduceCustomerDebt(Customer customer, BigDecimal amount) {
        if (customer == null || amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }
        BigDecimal remaining = currentDebt(customer).subtract(amount);
        if (remaining.compareTo(BigDecimal.ZERO) < 0) {
            remaining = BigDecimal.ZERO;
        }
        customer.setTotalDebt(remaining);
        if (remaining.compareTo(BigDecimal.ZERO) == 0) {
            customer.setStatus(DebtStatus.NO_DEBT.name());
        }
        customerRepository.save(customer);
    }

    private BigDecimal currentDebt(Customer customer) {
        return customer.getTotalDebt() != null ? customer.getTotalDebt() : BigDecimal.ZERO;
    }
}
