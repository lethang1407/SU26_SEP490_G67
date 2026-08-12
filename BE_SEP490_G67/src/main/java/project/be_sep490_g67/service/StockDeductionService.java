package project.be_sep490_g67.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.be_sep490_g67.entity.BatchLocation;
import project.be_sep490_g67.entity.StockMovement;
import project.be_sep490_g67.exception.InsufficientStockException;
import project.be_sep490_g67.repository.BatchLocationRepository;
import project.be_sep490_g67.repository.StockMovementRepository;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class StockDeductionService {
    private final BatchLocationRepository batchLocationRepository;
    private final StockMovementRepository stockMovementRepository;

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
        List<BatchLocation> availableList = locationId == null
                ? batchLocationRepository.findAvailableByProductId(productId)
                : batchLocationRepository.findAvailableByProductIdAndLocationId(productId, locationId);

        //Check stock
        int totalAvailable = availableList.stream().mapToInt(BatchLocation::getQuantity).sum();

        if (totalAvailable < quantityNeed) {
            throw new InsufficientStockException(buildShortageMessage(
                    productId, quantityNeed, totalAvailable, locationId, availableList));
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

            //Add stock movement
            StockMovement movement = StockMovement.builder()
                    .stockBatch(bl.getBatch())
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
     * Khi thu ngân đã chốt vị trí, báo rõ ô đó còn bao nhiêu và còn bao nhiêu ở
     * chỗ khác — để họ biết cần chọn lại vị trí chứ không phải hết hàng.
     */
    private String buildShortageMessage(Integer productId, int quantityNeed, int totalAvailable,
                                        Integer locationId, List<BatchLocation> availableList) {
        if (locationId == null) {
            return "Sản phẩm với ID: " + productId
                    + " Không đủ tồn kho. Cần " + quantityNeed + ", nhưng chỉ còn " + totalAvailable;
        }

        String locationLabel = availableList.stream()
                .map(bl -> bl.getLocation().getLabel())
                .filter(label -> label != null && !label.isBlank())
                .findFirst()
                .orElse("ID " + locationId);
        int elsewhere = batchLocationRepository.findAvailableByProductId(productId).stream()
                .filter(bl -> !locationId.equals(bl.getLocation().getId()))
                .mapToInt(BatchLocation::getQuantity)
                .sum();

        return "Vị trí " + locationLabel + " chỉ còn " + totalAvailable
                + ", cần " + quantityNeed + ". Còn " + elsewhere
                + " ở vị trí khác — chọn lại vị trí lấy hàng.";
    }
}
