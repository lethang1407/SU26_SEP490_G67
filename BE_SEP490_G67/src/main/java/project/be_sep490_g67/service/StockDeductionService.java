package project.be_sep490_g67.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.be_sep490_g67.entity.BatchLocation;
import project.be_sep490_g67.entity.StockBatch;
import project.be_sep490_g67.entity.StockMovement;
import project.be_sep490_g67.exception.InsufficientStockException;
import project.be_sep490_g67.repository.BatchLocationRepository;
import project.be_sep490_g67.repository.StockBatchRepository;
import project.be_sep490_g67.repository.StockMovementRepository;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class StockDeductionService {
    private final BatchLocationRepository batchLocationRepository;
    private final StockMovementRepository stockMovementRepository;
    private final StockBatchRepository stockBatchRepository;

    @Transactional
    public Integer deductStock(Integer productId, Integer quantityNeed, Integer orderId, Integer userId) {
        return deductStock(productId, quantityNeed, orderId, userId, null);
    }

    /**
     * @param locationId ô lấy hàng thu ngân đã chọn trên POS. Null thì trừ FEFO
     *                   toàn kho như cũ (client chưa cập nhật).
     */
    @Transactional
    public Integer deductStock(Integer productId, Integer quantityNeed, Integer orderId,
                               Integer userId, Integer locationId) {
        return deductStockFromLocations(productId, quantityNeed, orderId, userId,
                locationId == null ? null : List.of(locationId));
    }

    /**
     * @param locationIds các ô thu ngân đã tick, mỗi ô lấy FIFO mọi lô trong đó.
     */
    @Transactional
    public Integer deductStockFromLocations(Integer productId, Integer quantityNeed, Integer orderId,
                                            Integer userId, List<Integer> locationIds) {
        return deductStockFromPicks(productId, quantityNeed, orderId, userId,
                locationIds == null ? null : locationIds.stream()
                        .map(locationId -> new StockPick(locationId, null))
                        .toList());
    }

    /**
     * Trừ kho cho một dòng bán được lấy từ nhiều lô.
     *
     * @param picks các lô-tại-ô thu ngân đã tick, theo đúng thứ tự muốn lấy.
     *              Trừ hết cái trước rồi mới sang cái sau. Lô null thì lấy FIFO
     *              trong ô đó. Null/rỗng thì trừ FEFO toàn kho như cũ.
     * @return lô đầu tiên bị trừ, dùng để gắn vào chi tiết đơn hàng.
     */
    @Transactional
    public Integer deductStockFromPicks(Integer productId, Integer quantityNeed, Integer orderId,
                                        Integer userId, List<StockPick> picks) {
        List<BatchLocation> availableList = resolveAvailable(productId, picks);

        //Check stock
        int totalAvailable = availableList.stream().mapToInt(BatchLocation::getQuantity).sum();

        if (totalAvailable < quantityNeed) {
            throw new InsufficientStockException(buildShortageMessage(
                    productId, quantityNeed, totalAvailable, picks, availableList));
        }
        int remaining = quantityNeed;
        Integer firstBatchId = null;
        for (BatchLocation bl : availableList) {
            if (remaining <= 0) break;
            if (firstBatchId == null) {
                firstBatchId = bl.getBatch().getId();
            }
            int deduct = Math.min(bl.getQuantity(), remaining);
            int stockAfter = bl.getQuantity() - deduct;

            // Update batch location quantity
            bl.setQuantity(stockAfter);
            bl.setUpdatedAt(Instant.now());
            batchLocationRepository.save(bl);

            // Đồng bộ quantityIn với tồn thực — tránh “hàng vừa bán” bị tính vào chưa xếp kệ
            StockBatch batch = bl.getBatch();
            int quantityIn = batch.getQuantityIn() != null ? batch.getQuantityIn() : 0;
            batch.setQuantityIn(Math.max(0, quantityIn - deduct));
            batch.setUpdatedAt(Instant.now());
            stockBatchRepository.save(batch);

            //Add stock movement
            StockMovement movement = StockMovement.builder()
                    .stockBatch(batch)
                    .batchLocation(bl)
                    .quantityDelta(-deduct)
                    .stockAfter(stockAfter)
                    .movementType("SALE")
                    .referenceType("SALES_ORDER")
                    .referenceId(orderId)
                    .build();

            stockMovementRepository.save(movement);

            log.info("Trừ kho: product = {}, batch = {}, location = {}, deduct={}, stockAfter={}, order={}", productId, bl.getBatch().getId(), bl.getLocation().getLabel(), deduct, stockAfter, orderId);
            remaining -= deduct;
        }

        return firstBatchId;
    }

    /**
     * Gom tồn của các lô đã tick theo đúng thứ tự thu ngân chọn: hết cái đầu
     * mới sang cái kế. Một dòng kho chỉ được tính một lần dù bị tick trùng —
     * nếu không, tồn bị đếm đôi và đơn lọt qua kiểm tra rồi hụt hàng lúc trừ.
     */
    private List<BatchLocation> resolveAvailable(Integer productId, List<StockPick> picks) {
        if (picks == null || picks.isEmpty()) {
            return batchLocationRepository.findAvailableByProductId(productId);
        }
        List<BatchLocation> merged = new ArrayList<>();
        Set<Integer> seen = new LinkedHashSet<>();
        for (StockPick pick : picks) {
            if (pick == null || pick.locationId() == null) {
                continue;
            }
            batchLocationRepository
                    .findAvailableByProductIdAndLocationId(productId, pick.locationId())
                    .stream()
                    .filter(bl -> pick.batchId() == null
                            || pick.batchId().equals(bl.getBatch().getId()))
                    .filter(bl -> seen.add(bl.getId()))
                    .forEach(merged::add);
        }
        return merged;
    }

    /**
     * Khi thu ngân đã chốt lô, báo rõ những lô đó còn bao nhiêu và còn bao
     * nhiêu ở chỗ khác — để họ biết cần tick thêm lô chứ không phải hết hàng.
     */
    private String buildShortageMessage(Integer productId, int quantityNeed, int totalAvailable,
                                        List<StockPick> picks, List<BatchLocation> availableList) {
        if (picks == null || picks.isEmpty()) {
            return "Sản phẩm với ID: " + productId
                    + " Không đủ tồn kho. Cần " + quantityNeed + ", nhưng chỉ còn " + totalAvailable;
        }

        String locationLabels = availableList.stream()
                .map(bl -> bl.getLocation().getLabel())
                .filter(label -> label != null && !label.isBlank())
                .distinct()
                .collect(Collectors.joining(", "));
        if (locationLabels.isBlank()) {
            locationLabels = picks.stream()
                    .map(pick -> String.valueOf(pick.locationId()))
                    .distinct()
                    .collect(Collectors.joining(", "));
        }
        Set<Integer> pickedBatchLocationIds = availableList.stream()
                .map(BatchLocation::getId)
                .collect(Collectors.toSet());
        int elsewhere = batchLocationRepository.findAvailableByProductId(productId).stream()
                .filter(bl -> !pickedBatchLocationIds.contains(bl.getId()))
                .mapToInt(BatchLocation::getQuantity)
                .sum();

        return "Vị trí " + locationLabels + " chỉ còn " + totalAvailable
                + ", cần " + quantityNeed + ". Còn " + elsewhere
                + " ở lô khác — tick thêm lô để lấy đủ hàng.";
    }

    /** Một lô đang nằm ở một ô. batchId null = FIFO mọi lô trong ô đó. */
    public record StockPick(Integer locationId, Integer batchId) {
    }
}
