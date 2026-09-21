package project.be_sep490_g67.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.be_sep490_g67.constants.StorageZoneType;
import project.be_sep490_g67.entity.BatchLocation;
import project.be_sep490_g67.entity.ProductUnit;
import project.be_sep490_g67.entity.StockBatch;
import project.be_sep490_g67.entity.StockMovement;
import project.be_sep490_g67.exception.AppException;
import project.be_sep490_g67.exception.ErrorCode;
import project.be_sep490_g67.exception.InsufficientStockException;
import project.be_sep490_g67.repository.BatchLocationRepository;
import project.be_sep490_g67.repository.StockBatchRepository;
import project.be_sep490_g67.repository.StockMovementRepository;
import project.be_sep490_g67.utils.StockBatchUtils;
import project.be_sep490_g67.utils.UnitQuantityConverter;

import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
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
    public void deductStock(Integer productId, Integer quantityNeed, Integer orderId, Integer userId) {
        deductStock(productId, quantityNeed, orderId, userId, null);
    }

    /**
     * @param locationId ô lấy hàng thu ngân đã chọn trên POS. Null thì trừ FIFO
     *                   toàn kho như cũ (client chưa cập nhật).
     */
    @Transactional
    public void deductStock(Integer productId, Integer quantityNeed, Integer orderId,
                            Integer userId, Integer locationId) {
        deductStockFromLocations(productId, quantityNeed, orderId, userId,
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
     *              trong ô đó. Null/rỗng thì trừ FIFO toàn kho theo ngày nhập (lô đã hết hạn bị loại khỏi đường bán).
     *              Pick mang {@code baseQuantity} thì lấy đúng số đó tại đó, xem {@link #deductExactPicks}.
     * @return lô đầu tiên bị trừ, dùng để gắn vào chi tiết đơn hàng.
     */
    @Transactional
    public Integer deductStockFromPicks(Integer productId, Integer quantityNeed, Integer orderId,
                                        Integer userId, List<StockPick> picks) {
        return deductStockFromPicks(productId, quantityNeed, orderId, userId, picks, "SALES_ORDER");
    }

    /**
     * @param referenceType chứng từ gây ra việc trừ kho: "SALES_ORDER" cho đơn bán thường,
     *                      "EXCHANGE_ORDER" cho hàng khách lấy đi ở phiếu đổi trả. Báo cáo
     *                      kho dựa vào cặp referenceType/referenceId để tra ngược mã chứng từ.
     */
    @Transactional
    public Integer deductStockFromPicks(Integer productId, Integer quantityNeed, Integer orderId,
                                        Integer userId, List<StockPick> picks, String referenceType) {
        if (picks != null && picks.stream().anyMatch(p -> p != null && p.baseQuantity() != null)) {
            return deductExactPicks(productId, quantityNeed, orderId, picks, referenceType);
        }

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
            deductRow(productId, bl, deduct, orderId, referenceType);
            remaining -= deduct;
        }

        return firstBatchId;
    }

    /**
     * Thu ngân đã nhập số lượng cho từng vị trí trên POS: lấy đúng chừng ấy ở đúng
     * chỗ ấy, không tràn sang vị trí khác. Thiếu ở vị trí nào thì báo vị trí đó —
     * không tự bù từ chỗ khác, vì nhân viên đã ra đúng kệ đó lấy hàng.
     *
     * <p>Picks được xử lý tuần tự. Hai pick trùng một dòng kho vẫn đúng: truy vấn
     * của pick sau chạy sau khi pick trước đã flush nên thấy tồn đã giảm. Lỗi giữa
     * chừng thì transaction bao ngoài rollback toàn bộ.
     */
    private Integer deductExactPicks(Integer productId, int quantityNeed, Integer orderId,
                                     List<StockPick> picks, String referenceType) {
        List<StockPick> usable = picks.stream()
                .filter(p -> p != null && p.locationId() != null)
                .toList();
        if (usable.stream().anyMatch(p -> p.baseQuantity() == null || p.baseQuantity() <= 0)) {
            throw new AppException(ErrorCode.STOCK_PICK_QUANTITY_MISSING);
        }
        int picked = usable.stream().mapToInt(StockPick::baseQuantity).sum();
        if (picked != quantityNeed) {
            throw new AppException(ErrorCode.STOCK_PICK_QUANTITY_MISMATCH);
        }

        Integer firstBatchId = null;
        for (StockPick pick : usable) {
            List<BatchLocation> rows = rowsForPick(productId, pick);
            int available = rows.stream().mapToInt(BatchLocation::getQuantity).sum();
            if (available < pick.baseQuantity()) {
                throw new InsufficientStockException(buildPickShortageMessage(pick, rows, available));
            }
            int remaining = pick.baseQuantity();
            for (BatchLocation bl : rows) {
                if (remaining <= 0) break;
                if (firstBatchId == null) {
                    firstBatchId = bl.getBatch().getId();
                }
                int deduct = Math.min(bl.getQuantity(), remaining);
                deductRow(productId, bl, deduct, orderId, referenceType);
                remaining -= deduct;
            }
        }
        return firstBatchId;
    }

    /**
     * Trừ một dòng kho: batch_locations, quantity_in của lô, và ghi vết kho.
     */
    private void deductRow(Integer productId, BatchLocation bl, int deduct,
                           Integer orderId, String referenceType) {
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
                .referenceType(referenceType)
                .referenceId(orderId)
                .build();

        stockMovementRepository.save(movement);

        log.info("Trừ kho: product = {}, batch = {}, location = {}, deduct={}, stockAfter={}, order={}", productId, batch.getId(), bl.getLocation().getLabel(), deduct, stockAfter, orderId);
    }

    /**
     * Gom tồn của các lô đã tick theo đúng thứ tự thu ngân chọn: hết cái đầu
     * mới sang cái kế. Một dòng kho chỉ được tính một lần dù bị tick trùng —
     * nếu không, tồn bị đếm đôi và đơn lọt qua kiểm tra rồi hụt hàng lúc trừ.
     */
    private List<BatchLocation> resolveAvailable(Integer productId, List<StockPick> picks) {
        if (picks == null || picks.isEmpty()) {
            return batchLocationRepository.findSellableByProductId(productId);
        }
        List<BatchLocation> merged = new ArrayList<>();
        Set<Integer> seen = new LinkedHashSet<>();
        for (StockPick pick : picks) {
            if (pick == null || pick.locationId() == null) {
                continue;
            }
            rowsForPick(productId, pick).stream()
                    .filter(bl -> seen.add(bl.getId()))
                    .forEach(merged::add);
        }
        return merged;
    }

    /**
     * Các dòng kho bán được mà một pick trỏ tới. Lô đã hết hạn không bao giờ có mặt ở đây.
     */
    private List<BatchLocation> rowsForPick(Integer productId, StockPick pick) {
        return batchLocationRepository
                .findAvailableByProductIdAndLocationId(productId, pick.locationId())
                .stream()
                .filter(bl -> pick.batchId() == null
                        || pick.batchId().equals(bl.getBatch().getId()))
                .toList();
    }

    /**
     * Pick trỏ vào lô đã hết hạn thì rows rỗng — nói rõ lý do thay vì "chỉ còn 0",
     * vì hàng vẫn nằm trên kệ và thu ngân sẽ không hiểu vì sao hệ thống bảo hết.
     */
    private String buildPickShortageMessage(StockPick pick, List<BatchLocation> rows, int available) {
        if (pick.batchId() != null) {
            StockBatch batch = stockBatchRepository.findById(pick.batchId()).orElse(null);
            if (batch != null && batch.getExpiryDate() != null
                    && batch.getExpiryDate().isBefore(LocalDate.now())) {
                return "Lô " + StockBatchUtils.resolveBatchCode(batch) + " đã hết hạn ngày "
                        + batch.getExpiryDate().format(VN_DATE) + ", không bán được. Báo kho xử lý lô này.";
            }
        }
        String where = rows.isEmpty()
                ? "Vị trí đã chọn"
                : "Vị trí " + StorageZoneType.resolveDisplayLabel(rows.get(0).getLocation().getLabel());
        return where + " chỉ còn " + available + ", cần " + pick.baseQuantity() + ".";
    }

    private static final DateTimeFormatter VN_DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    /**
     * Khi thu ngân đã chốt lô, báo rõ những lô đó còn bao nhiêu và còn bao nhiêu ở chỗ khác
     */
    private String buildShortageMessage(Integer productId, int quantityNeed, int totalAvailable,
                                        List<StockPick> picks, List<BatchLocation> availableList) {
        if (picks == null || picks.isEmpty()) {
            // Không nhắc lại số khách cần: thu ngân đang nhìn thẳng vào ô số lượng,
            // cái họ thiếu là con số còn bán được để chốt lại với khách.
            return "Số lượng sản phẩm không đủ, chỉ còn " + totalAvailable + " sản phẩm";
        }

        String locationLabels = availableList.stream()
                .map(bl -> StorageZoneType.resolveDisplayLabel(bl.getLocation().getLabel()))
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
        int elsewhere = batchLocationRepository.findSellableByProductId(productId).stream()
                .filter(bl -> !pickedBatchLocationIds.contains(bl.getId()))
                .mapToInt(BatchLocation::getQuantity)
                .sum();

        return "Vị trí " + locationLabels + " chỉ còn " + totalAvailable
                + ", cần " + quantityNeed + ". Còn " + elsewhere
                + " ở lô khác - tick thêm lô để lấy đủ hàng.";
    }

    /**
     * Một lô đang nằm ở một ô. batchId null = FIFO mọi lô trong ô đó.
     *
     * @param baseQuantity số lượng lấy tại đây, đã quy về đơn vị cơ sở. Null = vét
     *                     cho tới khi đủ dòng hàng (hành vi cũ). Một pick có số lượng
     *                     thì mọi pick cùng dòng phải có, và tổng phải khớp dòng hàng.
     */
    public record StockPick(Integer locationId, Integer batchId, Integer baseQuantity) {
        public StockPick(Integer locationId, Integer batchId) {
            this(locationId, batchId, null);
        }

        /**
         * Pick từ POS: số lượng thu ngân nhập theo đơn vị bán của dòng hàng, quy về
         * đơn vị cơ sở ở đây. Phép quy đổi tuyến tính nên tổng các pick sau quy đổi
         * vẫn khớp đúng số lượng dòng hàng sau quy đổi.
         */
        public static StockPick inSellingUnit(Integer locationId, Integer batchId,
                                              Integer quantity, ProductUnit sellingUnit) {
            return new StockPick(locationId, batchId, quantity == null
                    ? null
                    : UnitQuantityConverter.toBaseUnits(sellingUnit, quantity));
        }
    }
}
