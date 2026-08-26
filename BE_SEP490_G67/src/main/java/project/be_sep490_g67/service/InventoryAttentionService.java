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
import project.be_sep490_g67.entity.Product;
import project.be_sep490_g67.entity.ReturnOrderDetail;
import project.be_sep490_g67.entity.StockBatch;
import project.be_sep490_g67.entity.StoreConfig;
import project.be_sep490_g67.enums.ItemCondition;
import project.be_sep490_g67.repository.BatchLocationRepository;
import project.be_sep490_g67.repository.ProductRepository;
import project.be_sep490_g67.repository.ReturnOrderDetailRepository;
import project.be_sep490_g67.repository.SalesOrderDetailRepository;
import project.be_sep490_g67.repository.StockBatchRepository;
import project.be_sep490_g67.repository.StoreConfigRepository;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
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

    /** Mọi tình trạng không bán lại được đều nằm chờ trong khu đổi trả. */
    static final List<String> NON_SELLABLE_CONDITIONS = Arrays.stream(ItemCondition.values())
            .filter(condition -> !condition.isSellable())
            .map(Enum::name)
            .toList();

    StockBatchRepository stockBatchRepository;
    ProductRepository productRepository;
    ReturnOrderDetailRepository returnOrderDetailRepository;
    SalesOrderDetailRepository salesOrderDetailRepository;
    BatchLocationRepository batchLocationRepository;
    StoreConfigRepository storeConfigRepository;

    @Transactional(readOnly = true)
    public InventoryAttentionResponse getInventoryAttention() {
        StoreConfig config = storeConfigRepository.findFirstByOrderByIdAsc().orElse(null);
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

    private InventoryAttentionGroupResponse buildOutOfStockGroup(StoreConfig config) {
        List<Object[]> rows = productRepository.findOutOfStockOrBelowMinimum();

        if (rows.isEmpty()) {
            return InventoryAttentionGroupResponse.builder()
                    .count(0)
                    .severity(SEVERITY_ORANGE)
                    .items(List.of())
                    .build();
        }

        List<Product> products = rows.stream().map(row -> (Product) row[0]).toList();
        Map<Integer, Integer> onHandByProduct = rows.stream().collect(Collectors.toMap(
                row -> ((Product) row[0]).getId(),
                row -> toInt(row[1]),
                (first, second) -> first));

        int highVolumeUnits = intOrDefault(config == null ? null : config.getHighVolumeSoldUnits(), 30);
        int windowDays = intOrDefault(config == null ? null : config.getHighVolumeWindowDays(), 30);

        Instant since = Instant.now().minus(Duration.ofDays(windowDays));
        Map<Integer, Integer> soldByProduct = salesOrderDetailRepository
                .sumSoldQuantityByProductsSince(products.stream().map(Product::getId).toList(), since)
                .stream()
                .collect(Collectors.toMap(row -> toInt(row[0]), row -> toInt(row[1]), (a, b) -> a));

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
                .map(product -> {
                    int onHand = onHandByProduct.getOrDefault(product.getId(), 0);
                    int minStock = intOrDefault(product.getMinStock(), 0);
                    return InventoryAttentionItemResponse.builder()
                            .productId(product.getId())
                            .productName(product.getName())
                            .detail(onHand <= 0 ? "Hết hàng" : "Tồn %d/%d".formatted(onHand, minStock))
                            .build();
                })
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
     * Ngưỡng lấy từ store_config nên admin đổi được mà không cần deploy lại.
     */
    private InventoryAttentionGroupResponse buildReturnHoldGroup(StoreConfig config) {
        List<ReturnOrderDetail> waiting =
                returnOrderDetailRepository.findAwaitingProcessing(NON_SELLABLE_CONDITIONS);

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
