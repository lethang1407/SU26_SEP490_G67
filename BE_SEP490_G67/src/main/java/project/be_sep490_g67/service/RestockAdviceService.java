package project.be_sep490_g67.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.be_sep490_g67.dto.response.RestockAdviceResponse;
import project.be_sep490_g67.entity.AlertThresholdConfig;
import project.be_sep490_g67.entity.Product;
import project.be_sep490_g67.entity.RestockAdviceDismissal;
import project.be_sep490_g67.entity.ProductUnit;
import project.be_sep490_g67.enums.RestockPriority;
import project.be_sep490_g67.enums.StockState;
import project.be_sep490_g67.exception.AppException;
import project.be_sep490_g67.exception.ErrorCode;
import project.be_sep490_g67.repository.*;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Widget "Sản phẩm cần quyết định nhập hàng".
 *
 * <p>Hai nguyên tắc chi phối toàn bộ file này:
 * <p>
 * Chuẩn hoá đơn vị trước khi so sánh.</b> Tồn kho và {@code min_stock} tính
 * bằng đơn vị cơ sở (lon), còn đơn bán ghi theo đơn vị bán (thùng). Cộng thẳng
 * {@code quantity} sẽ coi 1 thùng bằng 1 lon. Mọi con số ở đây đã nhân {@code unitBase}
 * để về cùng đơn vị cơ sở; việc quy ngược sang đơn vị lớn chỉ xảy ra ở bước dựng chuỗi
 * hiển thị.
 *
 * <p><b>2. Tồn thấp không đồng nghĩa phải nhập.</b> Trạng thái kho
 * ({@link StockState}) và quyết định nhập ({@link RestockPriority}) là hai trục riêng.
 * Hết hàng mà cả kỳ không ai mua thì vẫn xếp bán chậm và CTA là "xem chi tiết", không
 * phải "nhập hàng".
 */
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class RestockAdviceService {

    static final int DEFAULT_WINDOW_DAYS = 30;
    static final int DEFAULT_HIGH_VOLUME_UNITS = 30;
    static final int DEFAULT_SLOW_MOVING_UNITS = 5;
    static final int DEFAULT_PREVIEW_LIMIT = 5;

    /** "Trong ngày" tính theo giờ cửa hàng, không theo giờ máy chủ. */
    static final ZoneId STORE_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    ProductRepository productRepository;
    ProductUnitRepository productUnitRepository;
    SalesOrderDetailRepository salesOrderDetailRepository;
    ReturnOrderDetailRepository returnOrderDetailRepository;
    ImportOrderDetailRepository importOrderDetailRepository;
    AlertThresholdConfigRepository alertThresholdConfigRepository;
    RestockAdviceDismissalRepository dismissalRepository;

    /**
     * @param limit      số dòng trả về; null thì lấy từ alert_threshold_config
     * @param windowDays cửa sổ đánh giá sản lượng bán; null thì lấy từ alert_threshold_config
     */
    @Transactional(readOnly = true)
    public RestockAdviceResponse getRestockAdvice(Integer limit, Integer windowDays) {
        AlertThresholdConfig config = alertThresholdConfigRepository.findFirstByOrderByIdAsc().orElse(null);

        int window = positiveOrDefault(
                windowDays != null ? windowDays : configValue(config, AlertThresholdConfig::getHighVolumeWindowDays),
                DEFAULT_WINDOW_DAYS);
        int highVolumeUnits = positiveOrDefault(
                configValue(config, AlertThresholdConfig::getHighVolumeSoldUnits), DEFAULT_HIGH_VOLUME_UNITS);
        int slowMovingUnits = positiveOrDefault(
                configValue(config, AlertThresholdConfig::getSlowMovingSoldUnits), DEFAULT_SLOW_MOVING_UNITS);
        int previewLimit = positiveOrDefault(
                limit != null ? limit : configValue(config, AlertThresholdConfig::getRestockAdvicePreviewLimit),
                DEFAULT_PREVIEW_LIMIT);

        // Ngưỡng "bán tốt" phải cao hơn ngưỡng "bán chậm", nếu không mức "cần xem xét"
        // biến mất. Cấu hình sai thì kéo ngưỡng sàn xuống thay vì ném lỗi cho người dùng.
        if (slowMovingUnits > highVolumeUnits) {
            slowMovingUnits = highVolumeUnits;
        }

        List<Object[]> rows = productRepository.findOutOfStockOrBelowMinimum();
        if (rows.isEmpty()) {
            return emptyResponse(window);
        }

        // Sản phẩm chủ cửa hàng đã xem và bỏ qua hôm nay thì biến mất khỏi widget —
        // kể cả khỏi phần đếm ở đầu widget, vì con số đó nói về việc còn phải quyết.
        // Sang ngày mới danh sách này rỗng lại và mọi thứ được đánh giá từ đầu.
        Set<Integer> dismissedToday = new HashSet<>(
                dismissalRepository.findProductIdsDismissedOn(LocalDate.now(STORE_ZONE)));

        List<Product> products = rows.stream()
                .map(row -> (Product) row[0])
                .filter(product -> !dismissedToday.contains(product.getId()))
                .toList();
        if (products.isEmpty()) {
            return emptyResponse(window);
        }
        List<Integer> productIds = products.stream().map(Product::getId).toList();

        Map<Integer, Long> onHandByProduct = new HashMap<>();
        for (Object[] row : rows) {
            onHandByProduct.put(((Product) row[0]).getId(), toLong(row[1]));
        }

        Instant since = Instant.now().minus(Duration.ofDays(window));
        Map<Integer, Long> soldByProduct = toLongMap(
                salesOrderDetailRepository.sumSoldBaseQuantityByProductsSince(productIds, since));
        Map<Integer, Long> returnedByProduct = toLongMap(
                returnOrderDetailRepository.sumReturnedBaseQuantityByProductsSince(productIds, since));
        Map<Integer, Instant> lastSoldByProduct = toInstantMap(
                salesOrderDetailRepository.findLastSoldAtByProducts(productIds));
        Map<Integer, String> supplierByProduct = latestSupplierByProduct(productIds);
        Map<Integer, List<ProductUnit>> unitsByProduct = productUnitRepository
                .findByProduct_IdInAndIsRemovedFalse(productIds)
                .stream()
                .collect(Collectors.groupingBy(unit -> unit.getProduct().getId()));

        Instant now = Instant.now();
        List<RestockAdviceResponse.Item> items = new ArrayList<>();

        for (Product product : products) {
            long onHand = onHandByProduct.getOrDefault(product.getId(), 0L);
            long minStock = product.getMinStock() == null ? 0L : product.getMinStock();

            // Hàng bán rồi bị trả lại không phải nhu cầu, và nó cũng đã quay về kho.
            long sold = soldByProduct.getOrDefault(product.getId(), 0L);
            long returned = returnedByProduct.getOrDefault(product.getId(), 0L);
            long netSold = Math.max(0L, sold - returned);

            Instant lastSoldAt = lastSoldByProduct.get(product.getId());
            Long daysSinceLastSale = lastSoldAt == null
                    ? null
                    : Duration.between(lastSoldAt, now).toDays();

            StockState stockState = onHand <= 0 ? StockState.OUT_OF_STOCK : StockState.BELOW_MIN;
            RestockPriority priority = classify(netSold, highVolumeUnits, slowMovingUnits);

            UnitDisplay display = resolveDisplayUnit(unitsByProduct.get(product.getId()));

            items.add(RestockAdviceResponse.Item.builder()
                    .productId(product.getId())
                    .productName(product.getName())
                    .sku(product.getSku())
                    .baseUnitName(display.baseName())
                    .displayUnitName(display.displayName())
                    .displayUnitBase(display.factor() > 1 ? display.factor() : null)
                    .currentStockBase(onHand)
                    .minStockBase(minStock)
                    .soldInWindowBase(netSold)
                    .currentStockText(display.format(onHand))
                    .minStockText(display.format(minStock))
                    .stockRatioText(display.formatRatio(onHand, minStock))
                    .soldInWindowText(display.format(netSold))
                    .supplierName(resolveSupplierName(product, supplierByProduct))
                    .lastSoldAt(lastSoldAt)
                    .daysSinceLastSale(daysSinceLastSale)
                    .stockState(stockState.name())
                    .stockStateLabel(stockState.getLabel())
                    .priority(priority.name())
                    .priorityLabel(priority.getLabel())
                    .priorityTone(priority.getTone())
                    .reason(buildReason(priority, stockState, display, netSold, window, daysSinceLastSale))
                    .action(priority.getAction().name())
                    .actionLabel(priority.getAction().getLabel())
                    .build());
        }

        RestockAdviceResponse.Summary summary = summarise(items);

        // Xếp hạng thay vì liệt kê: ưu tiên nhập lên đầu, trong cùng mức thì hết hàng
        // trước, rồi bán nhiều trước.
        items.sort(Comparator
                .comparingInt((RestockAdviceResponse.Item item) ->
                        RestockPriority.valueOf(item.getPriority()).getRank())
                .thenComparing(item -> StockState.OUT_OF_STOCK.name().equals(item.getStockState()) ? 0 : 1)
                .thenComparing(Comparator.comparingLong(
                        RestockAdviceResponse.Item::getSoldInWindowBase).reversed())
                .thenComparing(RestockAdviceResponse.Item::getProductId));

        return RestockAdviceResponse.builder()
                .windowDays(window)
                .summary(summary)
                .items(items.stream().limit(previewLimit).toList())
                .build();
    }

    /**
     * Ghi nhận chủ cửa hàng đã xem và bỏ qua sản phẩm này cho hôm nay.
     */
    @Transactional
    public void dismiss(Integer productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_NOT_FOUND));

        LocalDate today = LocalDate.now(STORE_ZONE);
        if (dismissalRepository.findByProduct_IdAndDismissedOn(productId, today).isPresent()) {
            return;
        }

        RestockAdviceDismissal dismissal = new RestockAdviceDismissal();
        dismissal.setProduct(product);
        dismissal.setDismissedOn(today);
        dismissalRepository.save(dismissal);
    }

    /**
     * Tên NCC hiện trong panel chi tiết: ưu tiên nơi thực sự đã nhập hàng này gần nhất,
     * không có thì mượn NCC mặc định của danh mục để chủ cửa hàng vẫn có đầu mối liên hệ.
     */
    private String resolveSupplierName(Product product, Map<Integer, String> supplierByProduct) {
        String latest = supplierByProduct.get(product.getId());
        if (latest != null && !latest.isBlank()) {
            return latest;
        }
        if (product.getCategory() != null && product.getCategory().getDefaultSupplier() != null) {
            return product.getCategory().getDefaultSupplier().getName();
        }
        return null;
    }

    /** Truy vấn trả nhiều phiếu mỗi sản phẩm, mới nhất trước — giữ lại dòng đầu tiên. */
    private Map<Integer, String> latestSupplierByProduct(List<Integer> productIds) {
        Map<Integer, String> result = new HashMap<>();
        for (Object[] row : importOrderDetailRepository.findSupplierNamesByProductsLatestFirst(productIds)) {
            result.putIfAbsent(((Number) row[0]).intValue(), (String) row[1]);
        }
        return result;
    }

    private RestockPriority classify(long netSold, int highVolumeUnits, int slowMovingUnits) {
        if (netSold >= highVolumeUnits) {
            return RestockPriority.PRIORITY_RESTOCK;
        }
        if (netSold >= slowMovingUnits) {
            return RestockPriority.REVIEW;
        }
        return RestockPriority.SLOW_MOVING;
    }

    /**
     * Câu giải thích ngắn cho mức đã xếp.
     */
    private String buildReason(
            RestockPriority priority,
            StockState stockState,
            UnitDisplay display,
            long netSold,
            int window,
            Long daysSinceLastSale) {

        boolean outOfStock = stockState == StockState.OUT_OF_STOCK;
        String stockPart = outOfStock ? "Đã hết hàng" : "Tồn dưới ngưỡng";

        if (priority == RestockPriority.PRIORITY_RESTOCK) {
            return outOfStock
                    ? "%s và vẫn bán tốt trong %d ngày gần nhất.".formatted(stockPart, window)
                    : "%s và mức bán gần đây cao.".formatted(stockPart);
        }

        if (priority == RestockPriority.REVIEW) {
            return "%s nhưng mức bán ở mức trung bình.".formatted(stockPart);
        }

        if (netSold > 0) {
            return "%s nhưng %d ngày chỉ bán %s.".formatted(stockPart, window, display.format(netSold));
        }
        if (daysSinceLastSale == null) {
            return "%s và sản phẩm chưa từng bán.".formatted(stockPart);
        }
        return "%s và %d ngày qua không bán được gì (lần bán gần nhất %d ngày trước)."
                .formatted(stockPart, window, daysSinceLastSale);
    }

    private RestockAdviceResponse.Summary summarise(List<RestockAdviceResponse.Item> items) {
        Map<String, Long> byPriority = items.stream().collect(
                Collectors.groupingBy(RestockAdviceResponse.Item::getPriority, Collectors.counting()));

        return RestockAdviceResponse.Summary.builder()
                .priorityRestockCount(byPriority.getOrDefault(RestockPriority.PRIORITY_RESTOCK.name(), 0L))
                .reviewCount(byPriority.getOrDefault(RestockPriority.REVIEW.name(), 0L))
                .slowMovingCount(byPriority.getOrDefault(RestockPriority.SLOW_MOVING.name(), 0L))
                .totalCount(items.size())
                .build();
    }

    /**
     * Chọn đơn vị hiển thị: nhỏ nhất làm đơn vị cơ sở, lớn nhất làm đơn vị đọc cho gọn.
     * SP chỉ có một đơn vị thì hai cái trùng nhau và không quy đổi gì.
     */
    private UnitDisplay resolveDisplayUnit(List<ProductUnit> units) {
        if (units == null || units.isEmpty()) {
            return new UnitDisplay("sp", null, 1);
        }

        ProductUnit smallest = units.stream()
                .min(Comparator.comparing(unit -> unitBaseOf(unit)))
                .orElse(null);
        ProductUnit largest = units.stream()
                .max(Comparator.comparing(unit -> unitBaseOf(unit)))
                .orElse(null);

        String baseName = smallest != null && smallest.getName() != null ? smallest.getName() : "sp";
        if (largest == null || largest == smallest) {
            return new UnitDisplay(baseName, null, 1);
        }

        // Chỉ quy đổi khi hệ số là số nguyên: "8 thùng" chỉ có nghĩa khi một thùng là
        // một số nguyên lon.
        BigDecimal factor = unitBaseOf(largest);
        if (factor.stripTrailingZeros().scale() > 0 || factor.compareTo(BigDecimal.ONE) <= 0) {
            return new UnitDisplay(baseName, null, 1);
        }

        return new UnitDisplay(baseName, largest.getName(), factor.intValue());
    }

    private BigDecimal unitBaseOf(ProductUnit unit) {
        return unit.getUnitBase() == null ? BigDecimal.ONE : unit.getUnitBase();
    }

    /**
     * Đơn vị dùng để in số ra màn hình.
     *
     * @param baseName    tên đơn vị cơ sở, ví dụ "lon"
     * @param displayName tên đơn vị lớn, ví dụ "thùng"; null nghĩa là không quy đổi
     * @param factor      một đơn vị lớn bằng bao nhiêu đơn vị cơ sở
     */
    private record UnitDisplay(String baseName, String displayName, int factor) {

        /**
         * "8 thùng", "8 thùng 5 lon", hoặc "5 lon" khi chưa đủ một đơn vị lớn.
         */
        String format(long baseQuantity) {
            if (displayName == null || factor <= 1) {
                return "%d %s".formatted(baseQuantity, baseName);
            }

            long whole = baseQuantity / factor;
            long remainder = baseQuantity % factor;

            if (whole == 0) {
                return "%d %s".formatted(remainder, baseName);
            }
            if (remainder == 0) {
                return "%d %s".formatted(whole, displayName);
            }
            return "%d %s %d %s".formatted(whole, displayName, remainder, baseName);
        }

        /**
         * "0 / 10 thùng" — đơn vị viết một lần ở cuối cho gọn cột.
         *
         * <p>Chỉ gộp được khi cả hai số đều tròn đơn vị lớn; lẻ thì lùi về hai chuỗi
         * đầy đủ để không mất phần dư.
         */
        String formatRatio(long current, long min) {
            if (displayName == null || factor <= 1) {
                return "%d / %d %s".formatted(current, min, baseName);
            }
            if (current % factor == 0 && min % factor == 0) {
                return "%d / %d %s".formatted(current / factor, min / factor, displayName);
            }
            return "%s / %s".formatted(format(current), format(min));
        }
    }

    private RestockAdviceResponse emptyResponse(int window) {
        return RestockAdviceResponse.builder()
                .windowDays(window)
                .summary(RestockAdviceResponse.Summary.builder()
                        .priorityRestockCount(0)
                        .reviewCount(0)
                        .slowMovingCount(0)
                        .totalCount(0)
                        .build())
                .items(List.of())
                .build();
    }

    private Integer configValue(AlertThresholdConfig config,
                                java.util.function.Function<AlertThresholdConfig, Integer> getter) {
        return config == null ? null : getter.apply(config);
    }

    private int positiveOrDefault(Integer value, int fallback) {
        return value == null || value <= 0 ? fallback : value;
    }

    private Map<Integer, Long> toLongMap(List<Object[]> rows) {
        Map<Integer, Long> result = new HashMap<>();
        for (Object[] row : rows) {
            result.put(((Number) row[0]).intValue(), toLong(row[1]));
        }
        return result;
    }

    private Map<Integer, Instant> toInstantMap(List<Object[]> rows) {
        Map<Integer, Instant> result = new HashMap<>();
        for (Object[] row : rows) {
            if (row[1] != null) {
                result.put(((Number) row[0]).intValue(), (Instant) row[1]);
            }
        }
        return result;
    }

    private long toLong(Object value) {
        return value == null ? 0L : ((Number) value).longValue();
    }
}
