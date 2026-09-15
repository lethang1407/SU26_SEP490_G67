package project.be_sep490_g67.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import lombok.experimental.FieldDefaults;
import lombok.experimental.NonFinal;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.be_sep490_g67.entity.Product;
import project.be_sep490_g67.entity.StockBatch;
import project.be_sep490_g67.enums.NotificationType;
import project.be_sep490_g67.repository.ProductRepository;
import project.be_sep490_g67.repository.SalesOrderRepository;
import project.be_sep490_g67.repository.StockBatchRepository;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Ba cảnh báo tự động của tính năng thông báo:
 * cận hạn / hết hạn,tồn dưới định mức, công nợ quá hạn.
 */
@Service
@Slf4j
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class NotificationAlertService {

    static final ZoneId STORE_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    /**
     * Số tên hàng/khách kèm trong nội dung để người đọc hình dung được, không phải danh sách.
     */
    static final int SAMPLE_SIZE = 3;

    StockBatchRepository stockBatchRepository;
    ProductRepository productRepository;
    SalesOrderRepository salesOrderRepository;
    NotificationService notificationService;

    @NonFinal
    @Setter
    @Value("${notification.near-expiry-days:7}")
    int nearExpiryDays;

    public record ScanResult(int matched, boolean sent) {
        public static ScanResult nothing() {
            return new ScanResult(0, false);
        }
    }

    /**
     * Lô đã quá hạn mà vẫn còn hàng thật trên kệ.
     */
    @Transactional(readOnly = true)
    public ScanResult scanExpired() {
        LocalDate today = LocalDate.now(STORE_ZONE);
        List<Object[]> rows = stockBatchRepository.findExpiredWithRemainingQuantity(today);
        if (rows.isEmpty()) {
            return ScanResult.nothing();
        }

        long units = sumQuantity(rows);
        String message = String.format(
                "%d lô hàng đã quá hạn nhưng vẫn còn %d sản phẩm trên kệ: %s. ",
                rows.size(), units, sampleOfBatches(rows));

        return send(NotificationType.EXPIRED, "Có hàng đã quá hạn trên kệ", message, rows.size());
    }

    /**
     * Lô sẽ hết hạn trong {@code nearExpiryDays} ngày tới và vẫn còn hàng trên kệ.
     */
    @Transactional(readOnly = true)
    public ScanResult scanNearExpiry() {
        LocalDate today = LocalDate.now(STORE_ZONE);
        List<Object[]> rows = stockBatchRepository
                .findNearExpiryWithRemainingQuantity(today, today.plusDays(nearExpiryDays));
        if (rows.isEmpty()) {
            return ScanResult.nothing();
        }

        long units = sumQuantity(rows);
        String message = String.format(
                "%d lô hàng sẽ hết hạn trong %d ngày tới (%d sản phẩm): %s. ",
                rows.size(), nearExpiryDays, units, sampleOfBatches(rows));

        return send(NotificationType.NEAR_EXPIRED, "Có hàng sắp hết hạn", message, rows.size());
    }

    /**
     * Cảnh báo tồn dưới định mức, mặt hàng có tồn <= {@code products.min_stock}.
     */
    @Transactional(readOnly = true)
    public ScanResult scanLowStock() {
        List<Object[]> rows = productRepository.findOutOfStockOrBelowMinimum();
        if (rows.isEmpty()) {
            return ScanResult.nothing();
        }

        long outOfStock = rows.stream().filter(row -> toLong(row[1]) <= 0).count();
        String message = String.format(
                "%d mặt hàng đang ở hoặc dưới định mức tồn tối thiểu, trong đó %d mặt hàng đã hết sạch: %s. ",
                rows.size(), outOfStock, sampleOfProducts(rows));

        return send(NotificationType.LOW_STOCK, "Có hàng sắp hết cần nhập thêm", message, rows.size());
    }

    /**
     * Cảnh báo công nợ quá hạn
     */
    @Transactional(readOnly = true)
    public ScanResult scanOverdueDebt() {
        List<Object[]> rows = salesOrderRepository.findAllOverdueUnpaidDebtOrders(Instant.now());
        if (rows.isEmpty()) {
            return ScanResult.nothing();
        }

        // LinkedHashMap: giữ nguyên thứ tự quá hạn lâu nhất trước của câu truy vấn,
        // nên vài cái tên nêu làm ví dụ là những khách đáng gọi trước nhất.
        Map<Integer, BigDecimal> debtByCustomer = new LinkedHashMap<>();
        Map<Integer, String> nameByCustomer = new LinkedHashMap<>();
        BigDecimal total = BigDecimal.ZERO;
        for (Object[] row : rows) {
            Integer customerId = (Integer) row[0];
            BigDecimal remaining = toAmount(row[2]);
            debtByCustomer.merge(customerId, remaining, BigDecimal::add);
            nameByCustomer.putIfAbsent(customerId, nameOrFallback((String) row[1]));
            total = total.add(remaining);
        }

        String message = String.format(
                "%d khách hàng đang nợ quá hạn tổng cộng %s đ qua %d đơn: %s. ",
                debtByCustomer.size(), formatAmount(total), rows.size(),
                sample(new ArrayList<>(nameByCustomer.values())));

        return send(NotificationType.OVERDUE_DEBT, "Có công nợ khách hàng quá hạn",
                message, debtByCustomer.size());
    }

    private ScanResult send(NotificationType type, String title, String message, int matched) {
        boolean sent = notificationService.notifyAdminsOnceToday(type, title, message);
        if (!sent) {
            log.debug("Bỏ qua thông báo {}: hôm nay đã gửi rồi ({} đối tượng)", type, matched);
        }
        return new ScanResult(matched, sent);
    }

    private long sumQuantity(List<Object[]> rows) {
        return rows.stream().mapToLong(row -> toLong(row[1])).sum();
    }

    /**
     * Tên sản phẩm của vài lô đầu tiên, không lặp lại nếu một hàng có nhiều lô.
     */
    private String sampleOfBatches(List<Object[]> rows) {
        return sample(rows.stream()
                .map(row -> nameOrFallback(((StockBatch) row[0]).getProduct().getName()))
                .distinct()
                .toList());
    }

    private String sampleOfProducts(List<Object[]> rows) {
        return sample(rows.stream()
                .map(row -> nameOrFallback(((Product) row[0]).getName()))
                .toList());
    }

    private String sample(List<String> names) {
        if (names.size() <= SAMPLE_SIZE) {
            return String.join(", ", names);
        }
        return String.join(", ", names.subList(0, SAMPLE_SIZE))
                + " và " + (names.size() - SAMPLE_SIZE) + " mục khác";
    }

    /**
     * Dữ liệu cũ có thể thiếu tên; để trống thì câu thông báo hụt mất một vế.
     */
    private String nameOrFallback(String name) {
        return name == null || name.isBlank() ? "(không tên)" : name;
    }

    private String formatAmount(BigDecimal amount) {
        return String.format("%,.0f", amount);
    }

    private long toLong(Object value) {
        return value instanceof Number number ? number.longValue() : 0L;
    }

    private BigDecimal toAmount(Object value) {
        if (value instanceof BigDecimal decimal) {
            return decimal;
        }
        return value instanceof Number number
                ? BigDecimal.valueOf(number.doubleValue())
                : BigDecimal.ZERO;
    }
}
