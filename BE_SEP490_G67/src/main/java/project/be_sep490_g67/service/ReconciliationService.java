package project.be_sep490_g67.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.be_sep490_g67.dto.ReconciliationSubmitDTO;
import project.be_sep490_g67.dto.ReconciliationSummaryResponse;
import project.be_sep490_g67.dto.ReconciliationTransactionDTO;
import project.be_sep490_g67.entity.DebtPayment;
import project.be_sep490_g67.entity.SalesOrder;
import project.be_sep490_g67.repository.DebtPaymentRepository;
import project.be_sep490_g67.repository.ReturnOrderRepository;
import project.be_sep490_g67.repository.SalesOrderRepository;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class ReconciliationService {

    private final SalesOrderRepository salesOrderRepository;
    private final DebtPaymentRepository debtPaymentRepository;
    private final ReturnOrderRepository returnOrderRepository;

    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm dd/MM").withZone(VN_ZONE);

    @Transactional(readOnly = true)
    public ReconciliationSummaryResponse getSummary(LocalDate date, BigDecimal openingCashInput) {
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

        // Tiền mặt hoàn cho khách khi đổi/trả. Phần cấn trừ vào công nợ không đụng tới
        // két nên không tính ở đây.
        BigDecimal cashRefunded = returnOrderRepository.sumCashRefundBetween(startOfDay, endOfDay);
        if (cashRefunded == null) cashRefunded = BigDecimal.ZERO;

        // Hàng trả cấn sang đơn đổi bị đơn đổi ghi vào paidAmount, nên đang nằm trong
        // cashSales/bankSales ở trên dù chưa bao giờ là tiền vào.
        BigDecimal exchangeCreditApplied = returnOrderRepository.sumExchangeCreditBetween(startOfDay, endOfDay);
        if (exchangeCreditApplied == null) exchangeCreditApplied = BigDecimal.ZERO;

        // Khoản trên nằm trong cashSales hay bankSales là tùy hình thức thanh toán của
        // đơn đổi, nên phải tách ra rồi mới trừ đúng quỹ.
        ExchangeCreditSplit exchangeCredit = splitExchangeCredit(startOfDay, endOfDay);

        // 3. Calculate Theoretical balances
        BigDecimal theoreticalCash = openingCash.add(cashSales).add(cashDebtCollected)
                .subtract(cashRefunded)
                .subtract(exchangeCredit.cash());
        BigDecimal theoreticalBank = bankSales.add(bankDebtCollected)
                .subtract(exchangeCredit.bank());

        // 4. Build combined transaction timeline from SalesOrder and DebtPayment
        List<ReconciliationTransactionDTO> transactions = buildTransactionTimeline(startOfDay, endOfDay);

        return ReconciliationSummaryResponse.builder()
                .date(targetDate)
                .openingCash(openingCash)
                .cashSales(cashSales)
                .bankSales(bankSales)
                .debtSales(debtSales)
                .totalRevenue(totalRevenue)
                .cashDebtCollected(cashDebtCollected)
                .bankDebtCollected(bankDebtCollected)
                .cashRefunded(cashRefunded)
                .exchangeCreditApplied(exchangeCreditApplied)
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
    public ReconciliationSummaryResponse submitReconciliation(ReconciliationSubmitDTO dto) {
        return getSummary(dto.getDate(), null);
    }

    /** Hàng trả cấn sang đơn đổi, tách theo quỹ mà nó đang bị cộng nhầm vào. */
    private record ExchangeCreditSplit(BigDecimal cash, BigDecimal bank) {
    }

    /** Phép trừ trong JPQL có thể trả về kiểu số khác BigDecimal tùy dialect. */
    private static BigDecimal toBigDecimal(Object value) {
        if (value == null) return BigDecimal.ZERO;
        if (value instanceof BigDecimal decimal) return decimal;
        return BigDecimal.valueOf(((Number) value).doubleValue());
    }

    private static boolean isBankMethod(String paymentMethod) {
        return "BANK".equalsIgnoreCase(paymentMethod)
                || "BANK_TRANSFER".equalsIgnoreCase(paymentMethod)
                || "TRANSFER".equalsIgnoreCase(paymentMethod);
    }

    /**
     * Chia giá trị hàng trả cấn sang đơn đổi thành phần nằm trong quỹ tiền mặt và phần
     * nằm trong quỹ ngân hàng.
     *
     * <p>Đơn đổi mặc định thừa hưởng hình thức thanh toán của đơn gốc, trừ khi khách bù
     * thêm bằng chuyển khoản thì đơn đổi được đánh dấu TRANSFER — nên tra hình thức của
     * chính đơn đổi mới đúng.
     *
     * <p>Một đơn gốc bị đổi nhiều lần trong cùng ngày và các lần đó khác hình thức thanh
     * toán là trường hợp hiếm mà dữ liệu không phân biệt được; khi đó lấy đơn đổi đầu
     * tiên. Tổng vẫn đúng, chỉ có thể lệch giữa hai quỹ.
     */
    private ExchangeCreditSplit splitExchangeCredit(Instant startOfDay, Instant endOfDay) {
        List<Object[]> credits =
                returnOrderRepository.findExchangeCreditByOriginalOrderBetween(startOfDay, endOfDay);
        if (credits.isEmpty()) {
            return new ExchangeCreditSplit(BigDecimal.ZERO, BigDecimal.ZERO);
        }

        List<Integer> originalOrderIds = credits.stream()
                .map(row -> (Integer) row[0])
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        if (originalOrderIds.isEmpty()) {
            return new ExchangeCreditSplit(BigDecimal.ZERO, BigDecimal.ZERO);
        }

        Map<Integer, String> methodByOriginalOrder = new HashMap<>();
        for (Object[] row : salesOrderRepository.findExchangeOrderPaymentMethods(
                originalOrderIds, startOfDay, endOfDay)) {
            methodByOriginalOrder.putIfAbsent((Integer) row[0], (String) row[1]);
        }

        BigDecimal cash = BigDecimal.ZERO;
        BigDecimal bank = BigDecimal.ZERO;
        for (Object[] row : credits) {
            BigDecimal amount = toBigDecimal(row[1]);
            if (amount.signum() <= 0) continue;

            // Không tìm được đơn đổi thì khoản này chưa từng vào quỹ nào — bỏ qua còn hơn
            // trừ nhầm vào két và tạo ra chênh lệch ảo cho thu ngân.
            String method = methodByOriginalOrder.get((Integer) row[0]);
            if (method == null) continue;

            if (isBankMethod(method)) {
                bank = bank.add(amount);
            } else {
                cash = cash.add(amount);
            }
        }
        return new ExchangeCreditSplit(cash, bank);
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
