package project.be_sep490_g67.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.be_sep490_g67.dto.ReconciliationSubmitDTO;
import project.be_sep490_g67.dto.ReconciliationSummaryDTO;
import project.be_sep490_g67.dto.ReconciliationTransactionDTO;
import project.be_sep490_g67.entity.DebtPayment;
import project.be_sep490_g67.entity.SalesOrder;
import project.be_sep490_g67.repository.DebtPaymentRepository;
import project.be_sep490_g67.repository.SalesOrderRepository;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ReconciliationService {

    private final SalesOrderRepository salesOrderRepository;
    private final DebtPaymentRepository debtPaymentRepository;

    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm dd/MM").withZone(VN_ZONE);

    @Transactional(readOnly = true)
    public ReconciliationSummaryDTO getSummary(LocalDate date, BigDecimal openingCashInput) {
        LocalDate targetDate = date != null ? date : LocalDate.now(VN_ZONE);
        Instant startOfDay = targetDate.atStartOfDay(VN_ZONE).toInstant();
        Instant endOfDay = targetDate.plusDays(1).atStartOfDay(VN_ZONE).toInstant();

        BigDecimal openingCash = openingCashInput != null ? openingCashInput : BigDecimal.ZERO;

        // 1. Sales statistics from existing SalesOrder entity
        BigDecimal cashSales = salesOrderRepository.sumCashSalesBetween(startOfDay, endOfDay);
        BigDecimal bankSales = salesOrderRepository.sumBankSalesBetween(startOfDay, endOfDay);
        BigDecimal debtSales = salesOrderRepository.sumDebtSalesBetween(startOfDay, endOfDay);

        if (cashSales == null) cashSales = BigDecimal.ZERO;
        if (bankSales == null) bankSales = BigDecimal.ZERO;
        if (debtSales == null) debtSales = BigDecimal.ZERO;

        BigDecimal totalRevenue = cashSales.add(bankSales).add(debtSales);

        long totalOrdersCount = salesOrderRepository.countTotalOrdersBetween(startOfDay, endOfDay);
        long completedOrdersCount = salesOrderRepository.countCompletedOrdersBetween(startOfDay, endOfDay);
        long cancelledOrdersCount = salesOrderRepository.countCancelledOrdersBetween(startOfDay, endOfDay);
        long debtOrdersCount = salesOrderRepository.countDebtOrdersBetween(startOfDay, endOfDay);

        // 2. Debt collections from existing DebtPayment entity
        BigDecimal cashDebtCollected = debtPaymentRepository.sumCashDebtCollected(startOfDay, endOfDay);
        BigDecimal bankDebtCollected = debtPaymentRepository.sumBankDebtCollected(startOfDay, endOfDay);

        if (cashDebtCollected == null) cashDebtCollected = BigDecimal.ZERO;
        if (bankDebtCollected == null) bankDebtCollected = BigDecimal.ZERO;

        BigDecimal cashRefunded = BigDecimal.ZERO;

        // 3. Calculate Theoretical balances
        BigDecimal theoreticalCash = openingCash.add(cashSales).add(cashDebtCollected).subtract(cashRefunded);
        BigDecimal theoreticalBank = bankSales.add(bankDebtCollected);

        // 4. Build combined transaction timeline from SalesOrder and DebtPayment
        List<ReconciliationTransactionDTO> transactions = buildTransactionTimeline(startOfDay, endOfDay);

        return ReconciliationSummaryDTO.builder()
                .date(targetDate)
                .openingCash(openingCash)
                .cashSales(cashSales)
                .bankSales(bankSales)
                .debtSales(debtSales)
                .totalRevenue(totalRevenue)
                .cashDebtCollected(cashDebtCollected)
                .bankDebtCollected(bankDebtCollected)
                .cashRefunded(cashRefunded)
                .theoreticalCash(theoreticalCash)
                .theoreticalBank(theoreticalBank)
                .totalOrdersCount(totalOrdersCount)
                .completedOrdersCount(completedOrdersCount)
                .cancelledOrdersCount(cancelledOrdersCount)
                .debtOrdersCount(debtOrdersCount)
                .transactions(transactions)
                .build();
    }

    @Transactional(readOnly = true)
    public ReconciliationSummaryDTO submitReconciliation(ReconciliationSubmitDTO dto) {
        return getSummary(dto.getDate(), null);
    }

    private List<ReconciliationTransactionDTO> buildTransactionTimeline(Instant start, Instant end) {
        List<ReconciliationTransactionDTO> list = new ArrayList<>();

        // 1. Sales orders from SalesOrder
        List<SalesOrder> orders = salesOrderRepository.findOrdersBetween(start, end);
        for (SalesOrder o : orders) {
            String method = "CASH".equalsIgnoreCase(o.getPaymentMethod()) ? "Tiền mặt" :
                    ("BANK".equalsIgnoreCase(o.getPaymentMethod()) || "BANK_TRANSFER".equalsIgnoreCase(o.getPaymentMethod()) || "TRANSFER".equalsIgnoreCase(o.getPaymentMethod()) ? "Chuyển khoản VietQR" : "Ghi nợ");

            BigDecimal displayAmount = Boolean.TRUE.equals(o.getIsDebt()) ? o.getTotalAmount() : (o.getPaidAmount() != null ? o.getPaidAmount() : o.getTotalAmount());

            list.add(ReconciliationTransactionDTO.builder()
                    .time(TIME_FORMATTER.format(o.getCreatedAt()))
                    .code(o.getOrderCode())
                    .category(o.getOriginalSalesOrderId() != null ? "Hóa đơn đổi hàng" : "Bán hàng")
                    .transactionType("SALES")
                    .paymentMethod(method)
                    .amount(displayAmount)
                    .isNegative(false)
                    .performer(o.getCustomer() != null ? o.getCustomer().getFullName() : "Khách lẻ")
                    .build());
        }

        // 2. Debt payments from DebtPayment
        List<DebtPayment> debtPayments = debtPaymentRepository.findActiveTodayPaymentsWithOrderAndCustomer(start, end);
        for (DebtPayment dp : debtPayments) {
            String method = "BANK".equalsIgnoreCase(dp.getPaymentMethod()) || "BANK_TRANSFER".equalsIgnoreCase(dp.getPaymentMethod()) ? "Chuyển khoản" : "Tiền mặt";
            list.add(ReconciliationTransactionDTO.builder()
                    .time(TIME_FORMATTER.format(dp.getCreatedAt()))
                    .code(dp.getPaymentCode() != null ? dp.getPaymentCode() : ("TP-" + dp.getId()))
                    .category("Thu nợ khách hàng (" + (dp.getSalesOrder() != null ? dp.getSalesOrder().getOrderCode() : "") + ")")
                    .transactionType("DEBT_COLLECTION")
                    .paymentMethod(method)
                    .amount(dp.getAmountPaid())
                    .isNegative(false)
                    .performer(dp.getCustomer() != null ? dp.getCustomer().getFullName() : "Khách nợ")
                    .build());
        }

        list.sort(Comparator.comparing(ReconciliationTransactionDTO::getTime).reversed());
        return list;
    }
}
