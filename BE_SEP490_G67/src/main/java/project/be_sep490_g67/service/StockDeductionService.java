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
    public void deductStock(Integer productId, Integer quantityNeed, Integer orderId, Integer userId) {
        // Query FEFO
        List<BatchLocation> availableList = batchLocationRepository.findAvailableByProductId(productId);

        //Check stock
        int totalAvailable = availableList.stream().mapToInt(BatchLocation::getQuantity).sum();

        if (totalAvailable < quantityNeed) {
            throw new InsufficientStockException(
                    "Sản phẩm với ID: " + productId +
                            "Không đủ tồn kho. Cần " + quantityNeed + ", nhưng chỉ còn " + totalAvailable
            );
        }
        int remaining = quantityNeed;
        for (BatchLocation bl : availableList) {
            if (remaining <= 0) break;
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
    }
}
