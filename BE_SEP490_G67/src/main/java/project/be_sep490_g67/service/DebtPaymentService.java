package project.be_sep490_g67.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.be_sep490_g67.dto.request.DebtPaymentRequest;
import project.be_sep490_g67.dto.response.CustomerDebtOverviewResponse;
import project.be_sep490_g67.dto.response.CustomerDebtSummaryResponse;
import project.be_sep490_g67.dto.response.DebtPaymentHistoryResponse;
import project.be_sep490_g67.dto.response.PageResponse;
import project.be_sep490_g67.entity.Customer;
import project.be_sep490_g67.entity.DebtPayment;
import project.be_sep490_g67.entity.SalesOrder;
import project.be_sep490_g67.entity.User;
import project.be_sep490_g67.enums.DebtStatus;
import project.be_sep490_g67.exception.AppException;
import project.be_sep490_g67.exception.ErrorCode;
import project.be_sep490_g67.repository.CustomerRepository;
import project.be_sep490_g67.repository.DebtPaymentRepository;
import project.be_sep490_g67.repository.SalesOrderRepository;
import project.be_sep490_g67.repository.UserRepository;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DebtPaymentService {

    private final DebtPaymentRepository debtPaymentRepository;
    private final SalesOrderRepository salesOrderRepository;
    private final CustomerRepository customerRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public CustomerDebtOverviewResponse getDebtOverview() {

        ZoneId zoneId = ZoneId.of("Asia/Ho_Chi_Minh");

        LocalDate today = LocalDate.now(zoneId);

        Instant startOfDay = today
                .atStartOfDay(zoneId)
                .toInstant();

        Instant endOfDay = today
                .plusDays(1)
                .atStartOfDay(zoneId)
                .toInstant();

        List<SalesOrder> todaysDebtSales = salesOrderRepository.findActiveDebtSalesCreatedBetween(startOfDay, endOfDay);

        BigDecimal totalDebtAmountIncurredToday = todaysDebtSales.stream()
                .map(this::calculateRemainingDebtAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long uniqueCustomersInDebtCount = todaysDebtSales.stream()
                .map(SalesOrder::getCustomer)
                .filter(Objects::nonNull)
                .map(Customer::getId)
                .distinct()
                .count();

        return CustomerDebtOverviewResponse.builder()
                .totalDebt(customerRepository.getTotalDebt())
                .debtCustomerCount(customerRepository.countInDebtCustomers())
                .todayCollectedAmount(
                        debtPaymentRepository.getTodayCollectedAmount(
                                startOfDay,
                                endOfDay
                        )
                )
                .totalDebtSalesCount(todaysDebtSales.size())
                .uniqueCustomersInDebtCount(uniqueCustomersInDebtCount)
                .totalDebtAmountIncurredToday(totalDebtAmountIncurredToday)
                .build();
    }

    private BigDecimal calculateRemainingDebtAmount(SalesOrder salesOrder) {
        BigDecimal totalAmount = salesOrder.getTotalAmount() != null ? salesOrder.getTotalAmount() : BigDecimal.ZERO;
        BigDecimal initialPaidAmount = salesOrder.getPaidAmount() != null ? salesOrder.getPaidAmount() : BigDecimal.ZERO;
        BigDecimal subsequentPayments = salesOrder.getDebtPayments().stream()
                .filter(dp -> !Boolean.TRUE.equals(dp.getIsRemoved()))
                .map(dp -> dp.getAmountPaid() != null ? dp.getAmountPaid() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return totalAmount.subtract(initialPaidAmount.add(subsequentPayments));
    }

    @Transactional(readOnly = true)
    public CustomerDebtSummaryResponse getDebtSummary() {
        long inDebtCount = customerRepository.countInDebtCustomers();
        long debtFreeCount = customerRepository.countDebtFreeCustomers();
        return new CustomerDebtSummaryResponse(inDebtCount, debtFreeCount);
    }

    @Transactional
    public DebtPaymentHistoryResponse createDebtPayment(DebtPaymentRequest request) {
        // 1. Find the sales order
        SalesOrder salesOrder = salesOrderRepository.findById(request.getSalesOrderId())
                .orElseThrow(() -> new AppException(ErrorCode.ORDER_NOT_FOUND));

        // 2. Validate the payment
        if (!Boolean.TRUE.equals(salesOrder.getIsDebt())) {
            throw new AppException(ErrorCode.ORDER_IS_NOT_A_DEBT_ORDER);
        }

        BigDecimal totalPaidForOrder = salesOrder.getDebtPayments().stream()
                .map(DebtPayment::getAmountPaid)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal remainingAmount = salesOrder.getTotalAmount().subtract(totalPaidForOrder);

        if (request.getAmountPaid().compareTo(remainingAmount) > 0) {
            throw new AppException(ErrorCode.PAYMENT_AMOUNT_EXCEEDS_REMAINING_DEBT);
        }

        // 3. Create and save the debt payment record
        DebtPayment debtPayment = new DebtPayment();
        debtPayment.setSalesOrder(salesOrder);
        debtPayment.setAmountPaid(request.getAmountPaid());
        debtPayment.setPaymentMethod(request.getPaymentMethod().name());
        debtPayment.setNotes(request.getNote());
        if (request.getPaymentDate() != null) {
            debtPayment.setCreatedAt(request.getPaymentDate());
        }

        DebtPayment savedPayment = debtPaymentRepository.save(debtPayment);

        // 4. Update customer's total debt
        Customer customer = salesOrder.getCustomer();
        customer.setTotalDebt(customer.getTotalDebt().subtract(request.getAmountPaid()));

        // Check if customer is now debt-free
        if (customer.getTotalDebt().compareTo(BigDecimal.ZERO) <= 0) {
            customer.setTotalDebt(BigDecimal.ZERO); // Ensure it's not negative
            customer.setStatus(DebtStatus.NO_DEBT.name());
        }
        customerRepository.save(customer);

        // 5. Build and return the response
        String staffName = "N/A";
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof User) {
            staffName = ((User) principal).getFullName();
        }

        return DebtPaymentHistoryResponse.builder()
                .id(savedPayment.getId())
                .paymentDate(savedPayment.getCreatedAt())
                .amountPaid(savedPayment.getAmountPaid())
                .note(savedPayment.getNotes())
                .customerName(customer.getFullName())
                .customerId(customer.getId())
                .orderCode(salesOrder.getOrderCode())
                .paymentMethod(savedPayment.getPaymentMethod())
                .orderId(salesOrder.getId())
                .staffName(staffName)
                .build();
    }


    @Transactional(readOnly = true)
    public PageResponse<DebtPaymentHistoryResponse> getDebtPaymentHistory(
            LocalDate startDate, LocalDate endDate, Integer customerId,
            Integer staffId, String keyword, Integer page, Integer size
    ) {
        Pageable pageable = PageRequest.of(page - 1, size, Sort.by(Sort.Direction.DESC, "createdAt"));

        ZoneId zoneId = ZoneId.of("Asia/Ho_Chi_Minh");
        Instant startInstant = startDate != null ? startDate.atStartOfDay(zoneId).toInstant() : null;
        Instant endInstant = endDate != null ? endDate.plusDays(1).atStartOfDay(zoneId).toInstant() : null;

        Page<DebtPayment> debtPaymentPage = debtPaymentRepository.searchDebtPayments(
                startInstant, endInstant, customerId, staffId, keyword, pageable
        );

        List<DebtPaymentHistoryResponse> responses = debtPaymentPage.getContent().stream().map(dp -> {
            String staffName = "N/A";
            if (dp.getCreatedBy() != null) {
                staffName = userRepository.findById(dp.getCreatedBy())
                        .map(User::getFullName)
                        .orElse("Không rõ");
            }

            return DebtPaymentHistoryResponse.builder()
                    .id(dp.getId())
                    .paymentDate(dp.getCreatedAt())
                    .amountPaid(dp.getAmountPaid())
                    .note(dp.getNotes())
                    .customerName(dp.getSalesOrder().getCustomer().getFullName())
                    .customerId(dp.getSalesOrder().getCustomer().getId())
                    .orderCode(dp.getSalesOrder().getOrderCode())
                    .paymentMethod(dp.getPaymentMethod())
                    .orderId(dp.getSalesOrder().getId())
                    .staffName(staffName)
                    .build();
        }).collect(Collectors.toList());

        return PageResponse.<DebtPaymentHistoryResponse>builder()
                .content(responses)
                .page(page)
                .size(size)
                .totalElements(debtPaymentPage.getTotalElements())
                .totalPages(debtPaymentPage.getTotalPages())
                .build();
    }

    @Transactional(readOnly = true)
    public PageResponse<DebtPaymentHistoryResponse> getTodaysDebtPayments(int page, int size) {
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        return getDebtPaymentHistory(today, today, null, null, null, page, size);
    }
}
