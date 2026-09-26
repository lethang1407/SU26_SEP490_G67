package project.be_sep490_g67.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.be_sep490_g67.dto.response.ExpiredBatchResponse;
import project.be_sep490_g67.dto.response.InventoryAttentionResponse;
import project.be_sep490_g67.dto.response.InventoryAttentionResponse.InventoryAttentionGroupResponse;
import project.be_sep490_g67.dto.response.InventoryAttentionResponse.InventoryAttentionItemResponse;
import project.be_sep490_g67.dto.response.OutOfStockProductResponse;
import project.be_sep490_g67.dto.response.ReturnHoldLineResponse;
import project.be_sep490_g67.entity.AlertThresholdConfig;
import project.be_sep490_g67.entity.Product;
import project.be_sep490_g67.entity.ReturnOrderDetail;
import project.be_sep490_g67.entity.StockBatch;
import project.be_sep490_g67.enums.ItemCondition;
import project.be_sep490_g67.repository.AlertThresholdConfigRepository;
import project.be_sep490_g67.repository.BatchLocationRepository;
import project.be_sep490_g67.repository.ImportOrderDetailRepository;
import project.be_sep490_g67.repository.ProductRepository;
import project.be_sep490_g67.repository.ReturnOrderDetailRepository;
import project.be_sep490_g67.repository.SalesOrderDetailRepository;
import project.be_sep490_g67.repository.StockBatchRepository;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class InventoryAttentionService {

    static final ZoneId STORE_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    /** Số dòng tối đa gửi kèm để hiện ngay trên thẻ; danh sách đầy đủ nằm ở endpoint riêng. */
    static final int PREVIEW_LIMIT = 2;

    static final String SEVERITY_RED = "RED";
    static final String SEVERITY_ORANGE = "ORANGE";
    static final String SEVERITY_YELLOW = "YELLOW";

    /** Mọi tình trạng hàng khách trả đều chờ xử lý ở khu đổi trả (kể cả nguyên vẹn). */
    static final List<String> AWAITING_RETURN_CONDITIONS = Arrays.stream(ItemCondition.values())
            .map(Enum::name)
            .toList();

    StockBatchRepository stockBatchRepository;
    ProductRepository productRepository;
    ReturnOrderDetailRepository returnOrderDetailRepository;
    SalesOrderDetailRepository salesOrderDetailRepository;
    BatchLocationRepository batchLocationRepository;
    AlertThresholdConfigRepository alertThresholdConfigRepository;
    ImportOrderDetailRepository importOrderDetailRepository;

    @Transactional(readOnly = true)
    public InventoryAttentionResponse getInventoryAttention() {
        AlertThresholdConfig config = alertThresholdConfigRepository.findFirstByOrderByIdAsc().orElse(null);
        LocalDate today = LocalDate.now(STORE_ZONE);

        InventoryAttentionGroupResponse expired = buildExpiredGroup(today);
        InventoryAttentionGroupResponse outOfStock = buildOutOfStockGroup(config);
        InventoryAttentionGroupResponse returnHold = buildReturnHoldGroup(config);

        return InventoryAttentionResponse.builder()
                .totalCount(expired.getCount() + outOfStock.getCount() + returnHold.getCount())
                .expired(expired)
                .outOfStock(outOfStock)
                .returnHold(returnHold)
                .build();
    }

    /**
     * Danh sách đầy đủ đằng sau lằn "Hàng hết hạn" — theo lô, kèm số lượng hết hạn thật
     * của từng lô và số ngày đã quá hạn.
     */
    @Transactional(readOnly = true)
    public List<ExpiredBatchResponse> getExpiredBatches() {
        LocalDate today = LocalDate.now(STORE_ZONE);
        List<Object[]> rows = stockBatchRepository.findExpiredWithRemainingQuantity(today);

        Map<Integer, Integer> totalStockByProduct = new HashMap<>();

        List<ExpiredBatchResponse> result = new ArrayList<>();
        for (Object[] row : rows) {
            StockBatch batch = (StockBatch) row[0];
            int expiredQuantity = toInt(row[1]);
            Product product = batch.getProduct();

            int totalStock = totalStockByProduct.computeIfAbsent(
                    product.getId(),
                    productId -> {
                        Long onHand = batchLocationRepository.sumOnHandByProductId(productId);
                        return onHand == null ? 0 : onHand.intValue();
                    });

            result.add(ExpiredBatchResponse.builder()
                    .productId(product.getId())
                    .productName(product.getName())
                    .productSku(product.getSku())
                    .batchId(batch.getId())
                    .batchCode(batch.getBatchCode())
                    .expiryDate(batch.getExpiryDate())
                    .expiredQuantity(expiredQuantity)
                    .daysOverdue(ChronoUnit.DAYS.between(batch.getExpiryDate(), today))
                    .productTotalStock(totalStock)
                    .build());
        }
        return result;
    }

    private InventoryAttentionGroupResponse buildExpiredGroup(LocalDate today) {
        List<Object[]> rows = stockBatchRepository.findExpiredWithRemainingQuantity(today);

        List<InventoryAttentionItemResponse> items = rows.stream()
                .limit(PREVIEW_LIMIT)
                .map(row -> {
                    StockBatch batch = (StockBatch) row[0];
                    long daysOverdue = ChronoUnit.DAYS.between(batch.getExpiryDate(), today);
                    return InventoryAttentionItemResponse.builder()
                            .productId(batch.getProduct().getId())
                            .productName(batch.getProduct().getName())
                            .detail("Hết hạn %d ngày · SL %d".formatted(daysOverdue, toInt(row[1])))
                            .build();
                })
                .toList();

        return InventoryAttentionGroupResponse.builder()
                .count(rows.size())
                .severity(SEVERITY_RED)
                .items(items)
                .build();
    }

    private InventoryAttentionGroupResponse buildOutOfStockGroup(AlertThresholdConfig config) {
        List<Object[]> rows = productRepository.findOutOfStock();

        if (rows.isEmpty()) {
            return InventoryAttentionGroupResponse.builder()
                    .count(0)
                    .severity(SEVERITY_ORANGE)
                    .items(List.of())
                    .build();
        }

        List<Product> products = rows.stream().map(row -> (Product) row[0]).toList();

        int highVolumeUnits = intOrDefault(config == null ? null : config.getHighVolumeSoldUnits(), 30);
        int windowDays = intOrDefault(config == null ? null : config.getHighVolumeWindowDays(), 30);
        Map<Integer, Integer> soldByProduct = soldInWindow(products, windowDays);

        Product highVolumeProduct = products.stream()
                .filter(product -> soldByProduct.getOrDefault(product.getId(), 0) >= highVolumeUnits)
                .findFirst()
                .orElse(null);

        String severity = highVolumeProduct == null ? SEVERITY_ORANGE : SEVERITY_RED;
        String reason = highVolumeProduct == null ? null : "%s đã bán %d sản phẩm trong %d ngày qua"
                .formatted(
                        highVolumeProduct.getName(),
                        soldByProduct.getOrDefault(highVolumeProduct.getId(), 0),
                        windowDays);

        List<InventoryAttentionItemResponse> items = products.stream()
                .limit(PREVIEW_LIMIT)
                .map(product -> InventoryAttentionItemResponse.builder()
                        .productId(product.getId())
                        .productName(product.getName())
                        .detail("Hết hàng")
                        .build())
                .toList();

        return InventoryAttentionGroupResponse.builder()
                .count(rows.size())
                .severity(severity)
                .severityReason(reason)
                .items(items)
                .build();
    }

    /**
     * Hàng đổi trả nằm chờ trong khu RT: mặc định vàng, càng để lâu càng lên cam rồi đỏ.
     * Ngưỡng lấy từ alert_threshold_config; chưa có màn hình sửa nên đổi thì cập nhật
     * thẳng trong DB, không cần deploy lại.
     */
    private InventoryAttentionGroupResponse buildReturnHoldGroup(AlertThresholdConfig config) {
        List<ReturnOrderDetail> waiting =
                returnOrderDetailRepository.findAwaitingProcessing(AWAITING_RETURN_CONDITIONS);

        if (waiting.isEmpty()) {
            return InventoryAttentionGroupResponse.builder()
                    .count(0)
                    .severity(SEVERITY_YELLOW)
                    .items(List.of())
                    .build();
        }

        int orangeDays = intOrDefault(config == null ? null : config.getReturnHoldOrangeDays(), 7);
        int redDays = intOrDefault(config == null ? null : config.getReturnHoldRedDays(), 14);

        // Query sắp xếp cũ nhất trước nên phần tử đầu là dòng chờ lâu nhất.
        long longestWaitDays = daysWaiting(waiting.get(0));

        String severity = SEVERITY_YELLOW;
        String reason = null;
        if (longestWaitDays >= redDays) {
            severity = SEVERITY_RED;
            reason = "Có hàng chờ xử lý đã %d ngày".formatted(longestWaitDays);
        } else if (longestWaitDays >= orangeDays) {
            severity = SEVERITY_ORANGE;
            reason = "Có hàng chờ xử lý đã %d ngày".formatted(longestWaitDays);
        }

        List<InventoryAttentionItemResponse> items = waiting.stream()
                .limit(PREVIEW_LIMIT)
                .map(line -> InventoryAttentionItemResponse.builder()
                        .productId(line.getProduct().getId())
                        .productName(line.getProduct().getName())
                        .detail(describeWaitingLine(line))
                        .build())
                .toList();

        return InventoryAttentionGroupResponse.builder()
                .count(waiting.size())
                .severity(severity)
                .severityReason(reason)
                .items(items)
                .build();
    }

    /**
     * Danh sách đầy đủ đằng sau lằn "sản phẩm đã hết hàng" — cùng câu truy vấn với con số
     * trên thẻ (tồn trên mọi ô kho kể cả ô nhập hàng = 0, bỏ khu đổi trả) nên luôn khớp.
     * Hàng bán chạy lên đầu, rồi tới hàng bán nhiều hơn: đó là thứ tự cần nhập lại.
     */
    @Transactional(readOnly = true)
    public List<OutOfStockProductResponse> getOutOfStockProducts() {
        List<Product> products = productRepository.findOutOfStock().stream()
                .map(row -> (Product) row[0])
                .toList();
        if (products.isEmpty()) {
            return List.of();
        }

        AlertThresholdConfig config = alertThresholdConfigRepository.findFirstByOrderByIdAsc().orElse(null);
        int highVolumeUnits = intOrDefault(config == null ? null : config.getHighVolumeSoldUnits(), 30);
        int windowDays = intOrDefault(config == null ? null : config.getHighVolumeWindowDays(), 30);
        Map<Integer, Integer> soldByProduct = soldInWindow(products, windowDays);

        // Đơn nháp mới nhất cho từng SP (truy vấn đã sắp đơn mới nhất trước → giữ dòng đầu).
        Map<Integer, Object[]> openPoByProduct = new HashMap<>();
        for (Object[] row : importOrderDetailRepository
                .findDraftOpenPoRows(products.stream().map(Product::getId).toList())) {
            openPoByProduct.putIfAbsent((Integer) row[0], row);
        }

        return products.stream()
                .map(product -> {
                    int sold = soldByProduct.getOrDefault(product.getId(), 0);
                    Object[] openPo = openPoByProduct.get(product.getId());
                    return OutOfStockProductResponse.builder()
                            .productId(product.getId())
                            .productName(product.getName())
                            .productSku(product.getSku())
                            .categoryName(product.getCategory() != null ? product.getCategory().getName() : null)
                            .minStock(product.getMinStock())
                            .soldInWindow(sold)
                            .windowDays(windowDays)
                            .highVolume(sold >= highVolumeUnits)
                            .openPoId(openPo == null ? null : (Integer) openPo[1])
                            .openPoCode(openPo == null ? null : (String) openPo[2])
                            .openPoQty(openPo == null || openPo[3] == null ? null : toInt(openPo[3]))
                            .build();
                })
                .sorted(Comparator.comparing(OutOfStockProductResponse::isHighVolume).reversed()
                        .thenComparing(Comparator.comparingInt(OutOfStockProductResponse::getSoldInWindow).reversed())
                        .thenComparing(OutOfStockProductResponse::getProductId))
                .toList();
    }

    /** Số lượng đã bán của từng SP trong {@code windowDays} ngày gần nhất, key theo productId. */
    private Map<Integer, Integer> soldInWindow(List<Product> products, int windowDays) {
        Instant since = Instant.now().minus(Duration.ofDays(windowDays));
        return salesOrderDetailRepository
                .sumSoldBaseQuantityByProductsSince(products.stream().map(Product::getId).toList(), since)
                .stream()
                .collect(Collectors.toMap(row -> toInt(row[0]), row -> toInt(row[1]), (a, b) -> a));
    }

    @Transactional(readOnly = true)
    public List<ReturnHoldLineResponse> getReturnHoldLines() {
        return returnOrderDetailRepository.findAwaitingProcessing(AWAITING_RETURN_CONDITIONS).stream()
                .map(line -> {
                    Product product = line.getProduct();
                    return ReturnHoldLineResponse.builder()
                            .returnDetailId(line.getId())
                            .returnCode(line.getReturnOrder() != null
                                    ? line.getReturnOrder().getReturnCode()
                                    : null)
                            .productId(product.getId())
                            .productName(product.getName())
                            .productSku(product.getSku())
                            .itemCondition(line.getItemCondition())
                            .conditionLabel(conditionLabel(line.getItemCondition()))
                            .quantity(intOrDefault(line.getQuantity(), 0))
                            .unitName(line.getUnitName())
                            .note(line.getNote())
                            .returnedAt(line.getCreatedAt())
                            .daysWaiting(daysWaiting(line))
                            .build();
                })
                .toList();
    }

    /** "Hỏng · SL 2 · bao bì móp" — ghi chú của dòng trả được nối vào nếu có. */
    private String describeWaitingLine(ReturnOrderDetail line) {
        String base = "%s · SL %d".formatted(
                conditionLabel(line.getItemCondition()),
                intOrDefault(line.getQuantity(), 0));
        return line.getNote() == null || line.getNote().isBlank()
                ? base
                : base + " · " + line.getNote().trim();
    }

    private String conditionLabel(String itemCondition) {
        if (itemCondition == null) {
            return "Không rõ";
        }
        return switch (itemCondition) {
            case "RESELLABLE" -> "Nguyên vẹn";
            case "DAMAGED" -> "Hỏng";
            case "EXPIRED" -> "Hết hạn";
            case "OPENED" -> "Đã mở";
            default -> itemCondition;
        };
    }

    private long daysWaiting(ReturnOrderDetail line) {
        Instant createdAt = line.getCreatedAt();
        if (createdAt == null) {
            return 0;
        }
        return ChronoUnit.DAYS.between(createdAt, Instant.now());
    }

    private int intOrDefault(Integer value, int fallback) {
        return value == null ? fallback : value;
    }

    private int toInt(Object value) {
        return value == null ? 0 : ((Number) value).intValue();
    }
}
