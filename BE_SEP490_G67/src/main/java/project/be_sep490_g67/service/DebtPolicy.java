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
 * công nợ dùng chung cho mọi nghiệp vụ chạm vào nợ của khách.
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
     * Kiểm tra khách còn đơn nợ nào quá hạn mà chưa trả hết không
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
     * Số tiền một hoá đơn còn nợ. Đơn không phải đơn nợ luôn trả 0
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
     * Kiểm tra đơn nợ đã quá hạn mà vẫn chưa trả hết. Đơn quá hạn nhưng đã trả đủ qua
     * {@code DebtPayment} thì không tính là quá hạn - nợ đã xong
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
