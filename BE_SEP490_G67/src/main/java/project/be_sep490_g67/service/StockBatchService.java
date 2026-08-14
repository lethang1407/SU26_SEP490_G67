package project.be_sep490_g67.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.be_sep490_g67.dto.response.CancelStockBatchResponse;
import project.be_sep490_g67.entity.BatchLocation;
import project.be_sep490_g67.entity.StockBatch;
import project.be_sep490_g67.entity.StockMovement;
import project.be_sep490_g67.exception.AppException;
import project.be_sep490_g67.exception.ErrorCode;
import project.be_sep490_g67.repository.BatchLocationRepository;
import project.be_sep490_g67.repository.StockBatchRepository;
import project.be_sep490_g67.repository.StockMovementRepository;

import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class StockBatchService {

    private static final String MOVEMENT_TYPE_CANCEL = "CANCEL_BATCH";
    private static final String REFERENCE_TYPE_STOCK_BATCH = "STOCK_BATCH";

    StockBatchRepository stockBatchRepository;
    BatchLocationRepository batchLocationRepository;
    StockMovementRepository stockMovementRepository;

    @Transactional
    public CancelStockBatchResponse cancelBatch(Integer batchId, Integer quantity) {
        StockBatch batch = stockBatchRepository.findActiveWithProductById(batchId)
                .orElseThrow(() -> new AppException(ErrorCode.STOCK_BATCH_NOT_FOUND));

        int quantityIn = batch.getQuantityIn() != null ? batch.getQuantityIn() : 0;
        if (quantity == null || quantity < 1 || quantity > quantityIn) {
            throw new AppException(ErrorCode.INVALID_CANCEL_BATCH_QTY);
        }

        int remaining = quantityIn - quantity;
        batch.setQuantityIn(remaining);
        stockBatchRepository.save(batch);

        deductFromBatchLocations(batch, quantity);

        StockMovement movement = new StockMovement();
        movement.setStockBatch(batch);
        movement.setMovementType(MOVEMENT_TYPE_CANCEL);
        movement.setReferenceType(REFERENCE_TYPE_STOCK_BATCH);
        movement.setReferenceId(batchId);
        movement.setQuantityDelta(-quantity);
        movement.setStockAfter(remaining);
        movement.setIsRemoved(false);
        stockMovementRepository.save(movement);

        return CancelStockBatchResponse.builder()
                .batchId(batch.getId())
                .batchCode(batch.getBatchCode())
                .cancelledQuantity(quantity)
                .remainingQuantity(remaining)
                .build();
    }

    private void deductFromBatchLocations(StockBatch batch, int quantityToDeduct) {
        List<BatchLocation> locations = batchLocationRepository
                .findAvailableByProductId(batch.getProduct().getId())
                .stream()
                .filter(bl -> Objects.equals(bl.getBatch().getId(), batch.getId()))
                .toList();

        int remaining = quantityToDeduct;
        for (BatchLocation bl : locations) {
            if (remaining <= 0) {
                break;
            }
            int qty = bl.getQuantity() != null ? bl.getQuantity() : 0;
            if (qty <= 0) {
                continue;
            }
            int deduct = Math.min(qty, remaining);
            int next = qty - deduct;
            if (next <= 0) {
                bl.setQuantity(0);
                bl.setIsRemoved(true);
            } else {
                bl.setQuantity(next);
            }
            batchLocationRepository.save(bl);
            remaining -= deduct;
        }
    }
}
