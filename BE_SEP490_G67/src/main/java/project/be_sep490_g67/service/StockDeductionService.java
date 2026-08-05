package project.be_sep490_g67.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.be_sep490_g67.entity.BatchLocation;
import project.be_sep490_g67.entity.Product;
import project.be_sep490_g67.entity.StockMovement;
import project.be_sep490_g67.entity.StorageLocation;
import project.be_sep490_g67.repository.BatchLocationRepository;
import project.be_sep490_g67.repository.ProductRepository;
import project.be_sep490_g67.repository.StockMovementRepository;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class StockDeductionService {
    private final BatchLocationRepository batchLocationRepository;
    private final StockMovementRepository stockMovementRepository;
    private final ProductRepository productRepository;

    /**
     * Trừ tồn tại ô bán chính của SP (FEFO trong ô).
     * Chưa gán ô bán → bỏ qua.
     * Thiếu hàng → trừ hết phần còn, không báo lỗi.
     */
    @Transactional
    public void deductStock(Integer productId, Integer quantityNeed, Integer orderId, Integer userId) {
        Product product = productRepository.findById(productId).orElse(null);
        if (product == null) {
            log.warn("Trừ kho: không tìm thấy productId={}", productId);
            return;
        }

        StorageLocation primary = product.getPrimarySaleLocation();
        if (primary == null || primary.getId() == null) {
            log.info("Trừ kho: productId={} chưa có ô bán, bỏ qua trừ tồn", productId);
            return;
        }

        Integer locationId = primary.getId();
        List<BatchLocation> availableList =
                batchLocationRepository.findAvailableByProductIdAndLocationId(productId, locationId);

        int remaining = quantityNeed != null ? quantityNeed : 0;
        if (remaining <= 0) {
            return;
        }

        int totalAvailable = availableList.stream().mapToInt(BatchLocation::getQuantity).sum();
        if (totalAvailable < remaining) {
            log.info(
                    "Trừ kho best-effort: productId={}, locationId={}, cần={}, còn={}, sẽ trừ={}",
                    productId, locationId, remaining, totalAvailable, totalAvailable);
        }

        for (BatchLocation bl : availableList) {
            if (remaining <= 0) {
                break;
            }
            int deduct = Math.min(bl.getQuantity(), remaining);
            int stockAfter = bl.getQuantity() - deduct;

            bl.setQuantity(stockAfter);
            bl.setUpdatedAt(Instant.now());
            batchLocationRepository.save(bl);

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

            log.info(
                    "Trừ kho: product={}, batch={}, location={}, deduct={}, stockAfter={}, order={}",
                    productId,
                    bl.getBatch().getId(),
                    bl.getLocation().getLabel(),
                    deduct,
                    stockAfter,
                    orderId);
            remaining -= deduct;
        }
    }
}
