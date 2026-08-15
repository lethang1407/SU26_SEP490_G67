package project.be_sep490_g67.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.be_sep490_g67.constants.ImportReturnConstants;
import project.be_sep490_g67.dto.request.CreateImportReturnFromInventoryCheckRequest;
import project.be_sep490_g67.dto.request.SaveImportReturnRequest;
import project.be_sep490_g67.dto.request.UpdateExchangeExpiryRequest;
import project.be_sep490_g67.dto.request.UpdateImportReturnLineMethodRequest;
import project.be_sep490_g67.dto.request.UpdateImportReturnLineStatusRequest;
import project.be_sep490_g67.dto.response.ImportOrderReturnLineResponse;
import project.be_sep490_g67.dto.response.ImportReturnDetailResponse;
import project.be_sep490_g67.dto.response.ImportReturnListItemResponse;
import project.be_sep490_g67.dto.response.PageResponse;
import project.be_sep490_g67.entity.BatchLocation;
import project.be_sep490_g67.entity.ImportOrder;
import project.be_sep490_g67.entity.ImportReturn;
import project.be_sep490_g67.entity.ImportReturnDetail;
import project.be_sep490_g67.entity.InventoryCheck;
import project.be_sep490_g67.entity.Product;
import project.be_sep490_g67.entity.StockBatch;
import project.be_sep490_g67.entity.StockMovement;
import project.be_sep490_g67.entity.Supplier;
import project.be_sep490_g67.entity.User;
import project.be_sep490_g67.exception.AppException;
import project.be_sep490_g67.exception.ErrorCode;
import project.be_sep490_g67.repository.BatchLocationRepository;
import project.be_sep490_g67.repository.ImportReturnDetailRepository;
import project.be_sep490_g67.repository.ImportReturnRepository;
import project.be_sep490_g67.repository.InventoryCheckRepository;
import project.be_sep490_g67.repository.StockBatchRepository;
import project.be_sep490_g67.repository.StockMovementRepository;
import project.be_sep490_g67.repository.UserRepository;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ImportReturnService {

    ImportReturnRepository importReturnRepository;
    ImportReturnDetailRepository importReturnDetailRepository;
    StockBatchRepository stockBatchRepository;
    BatchLocationRepository batchLocationRepository;
    StockMovementRepository stockMovementRepository;
    InventoryCheckRepository inventoryCheckRepository;
    UserRepository userRepository;

    @Transactional(readOnly = true)
    public PageResponse<ImportReturnListItemResponse> search(
            String status,
            List<String> statuses,
            String source,
            String q,
            Instant fromTime,
            Instant toTime,
            int page,
            int size) {
        List<String> statusList = statuses == null ? List.of() : statuses;
        boolean statusesEmpty = statusList.isEmpty();
        // JPQL IN () invalid — use placeholder when empty
        if (statusesEmpty) {
            statusList = List.of("__NONE__");
        }

        Page<ImportReturn> result = importReturnRepository.search(
                blankToNull(status),
                statusList,
                statusesEmpty,
                blankToNull(source),
                blankToNull(q),
                fromTime,
                toTime,
                PageRequest.of(Math.max(page, 0), Math.max(size, 1)));

        List<ImportReturnListItemResponse> content = result.getContent().stream()
                .map(this::toListItem)
                .toList();

        return PageResponse.<ImportReturnListItemResponse>builder()
                .content(content)
                .page(result.getNumber())
                .size(result.getSize())
                .totalElements(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .build();
    }

    @Transactional(readOnly = true)
    public ImportReturnDetailResponse getById(Integer id) {
        ImportReturn entity = requireActive(id);
        return toDetail(entity);
    }

    /** Tạo nháp mới + trừ tồn. */
    @Transactional
    public ImportReturnDetailResponse createDraft(Integer userId, SaveImportReturnRequest request) {
        ImportReturn draft = newEmptyReturn(
                ImportReturnConstants.STATUS_DRAFT,
                ImportReturnConstants.normalizeSource(request.getSource()),
                resolveInventoryCheck(request.getInventoryCheckId()));
        draft.setNote(request.getNote());
        importReturnRepository.save(draft);

        for (SaveImportReturnRequest.Line line : request.getLines()) {
            addReservedLine(draft, line.getBatchId(), line.getQuantity(),
                    line.getMethod(), line.getNote(), line.getReturnReason());
        }
        recalculateTotal(draft);
        return toDetail(draft);
    }

    /** Cập nhật nháp: thay toàn bộ dòng (hoàn tồn cũ, trừ tồn mới). */
    @Transactional
    public ImportReturnDetailResponse updateDraft(Integer userId, Integer id, SaveImportReturnRequest request) {
        ImportReturn draft = requireOwnedDraft(userId, id);
        softRemoveAllLinesAndRestore(draft);

        draft.setNote(request.getNote());
        if (request.getInventoryCheckId() != null) {
            draft.setInventoryCheck(resolveInventoryCheck(request.getInventoryCheckId()));
        }
        importReturnRepository.save(draft);

        for (SaveImportReturnRequest.Line line : request.getLines()) {
            addReservedLine(draft, line.getBatchId(), line.getQuantity(),
                    line.getMethod(), line.getNote(), line.getReturnReason());
        }
        recalculateTotal(draft);
        return toDetail(draft);
    }

    @Transactional
    public void deleteDraft(Integer userId, Integer id) {
        ImportReturn draft = requireOwnedDraft(userId, id);
        softRemoveAllLinesAndRestore(draft);
        draft.setIsRemoved(true);
        importReturnRepository.save(draft);
    }

    @Transactional
    public ImportReturnDetailResponse deleteDraftLine(Integer userId, Integer returnId, Integer detailId) {
        ImportReturn draft = requireOwnedDraft(userId, returnId);
        ImportReturnDetail detail = importReturnDetailRepository.findActiveWithReturnById(detailId)
                .orElseThrow(() -> new AppException(ErrorCode.IMPORT_RETURN_DETAIL_NOT_FOUND));
        if (!Objects.equals(detail.getImportReturn().getId(), draft.getId())) {
            throw new AppException(ErrorCode.IMPORT_RETURN_DETAIL_NOT_FOUND);
        }
        restoreIfReserved(detail);
        detail.setIsRemoved(true);
        importReturnDetailRepository.save(detail);
        recalculateTotal(draft);
        return toDetail(draft);
    }

    /** Nháp → đang đổi trả (không trừ tồn lần 2). */
    @Transactional
    public ImportReturnDetailResponse submit(Integer userId, Integer id) {
        ImportReturn draft = requireOwnedDraft(userId, id);
        List<ImportReturnDetail> lines = importReturnDetailRepository.findActiveByReturnId(draft.getId());
        if (lines.isEmpty()) {
            throw new AppException(ErrorCode.IMPORT_RETURN_ITEMS_EMPTY);
        }
        if (draft.getReturnCode() == null || draft.getReturnCode().isBlank()) {
            draft.setReturnCode(generateReturnCode(Instant.now()));
        }
        draft.setStatus(ImportReturnConstants.STATUS_IN_PROGRESS);
        for (ImportReturnDetail line : lines) {
            if (line.getLineStatus() == null || line.getLineStatus().isBlank()) {
                line.setLineStatus(ImportReturnConstants.LINE_WAITING);
                importReturnDetailRepository.save(line);
            }
        }
        importReturnRepository.save(draft);
        return toDetail(draft);
    }

    /** Lưu đổi trả trực tiếp từ trang chính: trừ tồn + IN_PROGRESS. */
    @Transactional
    public ImportReturnDetailResponse createAndSubmit(Integer userId, SaveImportReturnRequest request) {
        ImportReturnDetailResponse draft = createDraft(userId, request);
        return submit(userId, draft.getId());
    }

    @Transactional(readOnly = true)
    public List<ImportOrderReturnLineResponse> listPendingForSupplier(Integer supplierId, Integer currentOrderId) {
        if (supplierId == null || supplierId <= 0) {
            return List.of();
        }
        return importReturnDetailRepository.findPendingBySupplier(
                        supplierId,
                        currentOrderId,
                        ImportReturnConstants.LINE_WAITING,
                        ImportReturnConstants.STATUS_IN_PROGRESS)
                .stream()
                .map(detail -> toImportOrderReturnLine(detail, currentOrderId))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ImportOrderReturnLineResponse> listSettledForImportOrder(Integer importOrderId) {
        if (importOrderId == null) {
            return List.of();
        }
        return importReturnDetailRepository.findBySettledImportOrderId(importOrderId).stream()
                .map(detail -> toImportOrderReturnLine(detail, importOrderId))
                .toList();
    }

    /**
     * Kiểm tra dòng đổi/trả đang chờ thuộc đúng NCC, chưa gắn phiếu khác.
     */
    public List<ImportReturnDetail> requirePendingLinesForSupplier(
            Integer supplierId,
            List<Integer> lineIds,
            Integer currentImportOrderId) {
        if (lineIds == null || lineIds.isEmpty()) {
            return List.of();
        }
        if (supplierId == null || supplierId <= 0) {
            throw new AppException(ErrorCode.IMPORT_RETURN_REQUIRES_SUPPLIER);
        }

        Set<Integer> seen = new LinkedHashSet<>();
        for (Integer lineId : lineIds) {
            if (lineId != null) {
                seen.add(lineId);
            }
        }

        List<ImportReturnDetail> result = new ArrayList<>();
        for (Integer lineId : seen) {
            ImportReturnDetail detail = importReturnDetailRepository.findActiveWithReturnById(lineId)
                    .orElseThrow(() -> new AppException(ErrorCode.IMPORT_RETURN_DETAIL_NOT_FOUND));
            ImportReturn header = detail.getImportReturn();
            if (header == null || !ImportReturnConstants.STATUS_IN_PROGRESS.equals(header.getStatus())) {
                throw new AppException(ErrorCode.IMPORT_RETURN_NOT_IN_PROGRESS);
            }
            if (!ImportReturnConstants.LINE_WAITING.equals(detail.getLineStatus())) {
                throw new AppException(ErrorCode.IMPORT_RETURN_LINE_NOT_PENDING);
            }
            Integer lineSupplierId = detail.getSupplier() != null ? detail.getSupplier().getId() : null;
            if (!Objects.equals(lineSupplierId, supplierId)) {
                throw new AppException(ErrorCode.IMPORT_RETURN_LINE_SUPPLIER_MISMATCH);
            }
            Integer settledId = detail.getSettledImportOrder() != null
                    ? detail.getSettledImportOrder().getId()
                    : null;
            if (settledId != null && !Objects.equals(settledId, currentImportOrderId)) {
                throw new AppException(ErrorCode.IMPORT_RETURN_LINE_ALREADY_ATTACHED);
            }
            result.add(detail);
        }
        return result;
    }

    public BigDecimal returnDeductionOf(List<ImportReturnDetail> lines) {
        BigDecimal total = BigDecimal.ZERO;
        for (ImportReturnDetail line : lines) {
            if (ImportReturnConstants.METHOD_EXCHANGE.equals(
                    ImportReturnConstants.normalizeMethod(line.getMethod()))) {
                continue;
            }
            int qty = line.getQuantity() != null ? line.getQuantity() : 0;
            BigDecimal price = line.getReturnPrice() != null ? line.getReturnPrice() : BigDecimal.ZERO;
            total = total.add(price.multiply(BigDecimal.valueOf(qty)));
        }
        return total;
    }

    @Transactional
    public void syncSettledLines(ImportOrder order, List<ImportReturnDetail> selected, boolean complete) {
        if (order == null || order.getId() == null) {
            return;
        }
        Set<Integer> selectedIds = new HashSet<>();
        for (ImportReturnDetail line : selected) {
            if (line.getId() != null) {
                selectedIds.add(line.getId());
            }
        }

        List<ImportReturnDetail> currentlyAttached =
                importReturnDetailRepository.findBySettledImportOrderId(order.getId());
        for (ImportReturnDetail existing : currentlyAttached) {
            if (selectedIds.contains(existing.getId())) {
                continue;
            }
            if (ImportReturnConstants.LINE_WAITING.equals(existing.getLineStatus())) {
                existing.setSettledImportOrder(null);
                importReturnDetailRepository.save(existing);
            }
        }

        Set<Integer> headerIdsToCheck = new HashSet<>();
        for (ImportReturnDetail detail : selected) {
            detail.setSettledImportOrder(order);
            if (complete && !ImportReturnConstants.LINE_DONE.equals(detail.getLineStatus())) {
                if (ImportReturnConstants.METHOD_EXCHANGE.equals(
                        ImportReturnConstants.normalizeMethod(detail.getMethod()))) {
                    createExchangeBatch(detail, null, order);
                }
                detail.setLineStatus(ImportReturnConstants.LINE_DONE);
                if (detail.getImportReturn() != null && detail.getImportReturn().getId() != null) {
                    headerIdsToCheck.add(detail.getImportReturn().getId());
                }
            }
            importReturnDetailRepository.save(detail);
        }

        if (complete) {
            for (Integer headerId : headerIdsToCheck) {
                importReturnRepository.findActiveById(headerId).ifPresent(this::maybeCompleteHeader);
            }
        }
    }

    @Transactional
    public void releaseSettledLines(Integer importOrderId) {
        if (importOrderId == null) {
            return;
        }
        List<ImportReturnDetail> attached = importReturnDetailRepository.findBySettledImportOrderId(importOrderId);
        for (ImportReturnDetail detail : attached) {
            if (ImportReturnConstants.LINE_WAITING.equals(detail.getLineStatus())) {
                detail.setSettledImportOrder(null);
                importReturnDetailRepository.save(detail);
            }
        }
    }

    /** Tạo nháp mới từ kiểm kho + trừ tồn (không ghi đè). */
    @Transactional
    public ImportReturnDetailResponse createFromInventoryCheck(
            Integer userId, CreateImportReturnFromInventoryCheckRequest request) {
        InventoryCheck check = inventoryCheckRepository.findById(request.getInventoryCheckId())
                .orElseThrow(() -> new AppException(ErrorCode.INVENTORY_CHECK_NOT_FOUND));

        SaveImportReturnRequest save = new SaveImportReturnRequest();
        save.setSource(ImportReturnConstants.SOURCE_INVENTORY_CHECK);
        save.setInventoryCheckId(check.getId());
        List<SaveImportReturnRequest.Line> lines = new ArrayList<>();
        for (CreateImportReturnFromInventoryCheckRequest.Line src : request.getLines()) {
            SaveImportReturnRequest.Line line = new SaveImportReturnRequest.Line();
            line.setBatchId(src.getBatchId());
            line.setQuantity(src.getQuantity());
            line.setReturnReason(src.getReturnReason());
            line.setMethod(ImportReturnConstants.normalizeMethod(src.getMethod()));
            lines.add(line);
        }
        save.setLines(lines);
        return createDraft(userId, save);
    }

    @Transactional
    public ImportReturnDetailResponse updateLineStatus(
            Integer userId, Integer returnId, Integer detailId, UpdateImportReturnLineStatusRequest request) {
        ImportReturn header = requireActive(returnId);
        if (!ImportReturnConstants.STATUS_IN_PROGRESS.equals(header.getStatus())
                && !ImportReturnConstants.STATUS_COMPLETED.equals(header.getStatus())) {
            throw new AppException(ErrorCode.IMPORT_RETURN_NOT_IN_PROGRESS);
        }
        if (userId != null && header.getCreatedBy() != null && !Objects.equals(header.getCreatedBy(), userId)) {
            throw new AppException(ErrorCode.IMPORT_RETURN_NOT_FOUND);
        }

        ImportReturnDetail detail = importReturnDetailRepository.findActiveWithReturnById(detailId)
                .orElseThrow(() -> new AppException(ErrorCode.IMPORT_RETURN_DETAIL_NOT_FOUND));
        if (!Objects.equals(detail.getImportReturn().getId(), header.getId())) {
            throw new AppException(ErrorCode.IMPORT_RETURN_DETAIL_NOT_FOUND);
        }

        String next = ImportReturnConstants.normalizeLineStatus(request.getLineStatus());
        String current = detail.getLineStatus();

        if (ImportReturnConstants.LINE_DONE.equals(current) && ImportReturnConstants.LINE_WAITING.equals(next)) {
            throw new AppException(ErrorCode.IMPORT_RETURN_LINE_ALREADY_DONE);
        }

        if (ImportReturnConstants.LINE_DONE.equals(next)
                && !ImportReturnConstants.LINE_DONE.equals(current)) {
            if (ImportReturnConstants.METHOD_EXCHANGE.equals(
                    ImportReturnConstants.normalizeMethod(detail.getMethod()))) {
                createExchangeBatch(detail, request.getExchangeExpiryDate(), null);
            }
            detail.setLineStatus(ImportReturnConstants.LINE_DONE);
            importReturnDetailRepository.save(detail);
            maybeCompleteHeader(header);
        } else if (ImportReturnConstants.LINE_WAITING.equals(next)) {
            detail.setLineStatus(ImportReturnConstants.LINE_WAITING);
            importReturnDetailRepository.save(detail);
        } else {
            throw new AppException(ErrorCode.IMPORT_RETURN_INVALID_LINE_STATUS);
        }

        return toDetail(header);
    }

    @Transactional
    public ImportReturnDetailResponse updateLineMethod(
            Integer userId, Integer returnId, Integer detailId, UpdateImportReturnLineMethodRequest request) {
        ImportReturn header = requireActive(returnId);
        if (!ImportReturnConstants.STATUS_IN_PROGRESS.equals(header.getStatus())
                && !ImportReturnConstants.STATUS_DRAFT.equals(header.getStatus())) {
            throw new AppException(ErrorCode.IMPORT_RETURN_NOT_IN_PROGRESS);
        }
        if (userId != null && header.getCreatedBy() != null && !Objects.equals(header.getCreatedBy(), userId)) {
            throw new AppException(ErrorCode.IMPORT_RETURN_NOT_FOUND);
        }

        ImportReturnDetail detail = importReturnDetailRepository.findActiveWithReturnById(detailId)
                .orElseThrow(() -> new AppException(ErrorCode.IMPORT_RETURN_DETAIL_NOT_FOUND));
        if (!Objects.equals(detail.getImportReturn().getId(), header.getId())) {
            throw new AppException(ErrorCode.IMPORT_RETURN_DETAIL_NOT_FOUND);
        }
        if (ImportReturnConstants.LINE_DONE.equals(detail.getLineStatus())) {
            throw new AppException(ErrorCode.IMPORT_RETURN_LINE_ALREADY_DONE);
        }

        detail.setMethod(ImportReturnConstants.normalizeMethod(request.getMethod()));
        importReturnDetailRepository.save(detail);
        return toDetail(header);
    }

    public ImportReturnDetailResponse updateExchangeExpiry(
            Integer userId, Integer returnId, Integer detailId, UpdateExchangeExpiryRequest request) {
        ImportReturn header = requireActive(returnId);
        if (!ImportReturnConstants.STATUS_IN_PROGRESS.equals(header.getStatus())
                && !ImportReturnConstants.STATUS_COMPLETED.equals(header.getStatus())) {
            throw new AppException(ErrorCode.IMPORT_RETURN_NOT_IN_PROGRESS);
        }
        if (userId != null && header.getCreatedBy() != null && !Objects.equals(header.getCreatedBy(), userId)) {
            throw new AppException(ErrorCode.IMPORT_RETURN_NOT_FOUND);
        }

        ImportReturnDetail detail = importReturnDetailRepository.findActiveWithReturnById(detailId)
                .orElseThrow(() -> new AppException(ErrorCode.IMPORT_RETURN_DETAIL_NOT_FOUND));
        if (!Objects.equals(detail.getImportReturn().getId(), header.getId())) {
            throw new AppException(ErrorCode.IMPORT_RETURN_DETAIL_NOT_FOUND);
        }
        if (!ImportReturnConstants.LINE_DONE.equals(detail.getLineStatus())) {
            throw new AppException(ErrorCode.IMPORT_RETURN_INVALID_LINE_STATUS);
        }
        if (!ImportReturnConstants.METHOD_EXCHANGE.equals(
                ImportReturnConstants.normalizeMethod(detail.getMethod()))) {
            throw new AppException(ErrorCode.IMPORT_RETURN_INVALID_LINE_STATUS);
        }

        StockBatch exchange = detail.getExchangeBatch();
        if (exchange == null) {
            throw new AppException(ErrorCode.STOCK_BATCH_NOT_FOUND);
        }
        exchange = stockBatchRepository.findActiveWithProductById(exchange.getId())
                .orElseThrow(() -> new AppException(ErrorCode.STOCK_BATCH_NOT_FOUND));
        exchange.setExpiryDate(request != null ? request.getExchangeExpiryDate() : null);
        stockBatchRepository.save(exchange);

        return toDetail(header);
    }

    // -------------------------------------------------------------------------
    // Stock helpers
    // -------------------------------------------------------------------------

    private void addReservedLine(
            ImportReturn draft,
            Integer batchId,
            Integer quantity,
            String method,
            String note,
            String returnReason) {
        StockBatch batch = stockBatchRepository.findActiveWithProductAndImportById(batchId)
                .orElseThrow(() -> new AppException(ErrorCode.STOCK_BATCH_NOT_FOUND));
        ImportOrder importOrder = batch.getImportOrder();
        if (importOrder == null || importOrder.getSupplier() == null) {
            throw new AppException(ErrorCode.BATCH_NOT_RETURNABLE);
        }
        int batchQty = batch.getQuantityIn() != null ? batch.getQuantityIn() : 0;
        if (quantity == null || quantity < 1 || quantity > batchQty) {
            throw new AppException(ErrorCode.INVALID_IMPORT_RETURN_QTY);
        }

        reserveStock(batch, quantity, draft.getId());

        ImportReturnDetail detail = new ImportReturnDetail();
        detail.setImportReturn(draft);
        detail.setProduct(batch.getProduct());
        detail.setStockBatch(batch);
        detail.setSupplier(importOrder.getSupplier());
        detail.setImportOrder(importOrder);
        detail.setQuantity(quantity);
        detail.setReturnPrice(batch.getCostPerUnit() != null ? batch.getCostPerUnit() : BigDecimal.ZERO);
        detail.setReturnReason(returnReason);
        detail.setNote(note);
        detail.setMethod(ImportReturnConstants.normalizeMethod(method));
        detail.setLineStatus(ImportReturnConstants.LINE_WAITING);
        detail.setStockReserved(true);
        detail.setIsRemoved(false);
        importReturnDetailRepository.save(detail);
    }

    private void reserveStock(StockBatch batch, int qty, Integer returnId) {
        int batchQty = batch.getQuantityIn() != null ? batch.getQuantityIn() : 0;
        if (qty > batchQty) {
            throw new AppException(ErrorCode.INVALID_IMPORT_RETURN_QTY);
        }
        int remaining = batchQty - qty;
        batch.setQuantityIn(remaining);
        stockBatchRepository.save(batch);
        deductFromBatchLocations(batch, qty);

        StockMovement movement = new StockMovement();
        movement.setStockBatch(batch);
        movement.setMovementType(ImportReturnConstants.MOVEMENT_RESERVE);
        movement.setReferenceType(ImportReturnConstants.REFERENCE_TYPE);
        movement.setReferenceId(returnId);
        movement.setQuantityDelta(-qty);
        movement.setStockAfter(remaining);
        movement.setIsRemoved(false);
        stockMovementRepository.save(movement);
    }

    private void restoreIfReserved(ImportReturnDetail detail) {
        if (!Boolean.TRUE.equals(detail.getStockReserved())) {
            return;
        }
        StockBatch batch = detail.getStockBatch();
        if (batch == null) {
            return;
        }
        batch = stockBatchRepository.findActiveWithProductById(batch.getId()).orElse(batch);
        int qty = detail.getQuantity() != null ? detail.getQuantity() : 0;
        int current = batch.getQuantityIn() != null ? batch.getQuantityIn() : 0;
        int next = current + qty;
        batch.setQuantityIn(next);
        stockBatchRepository.save(batch);

        StockMovement movement = new StockMovement();
        movement.setStockBatch(batch);
        movement.setMovementType(ImportReturnConstants.MOVEMENT_RESTORE);
        movement.setReferenceType(ImportReturnConstants.REFERENCE_TYPE);
        movement.setReferenceId(detail.getImportReturn() != null ? detail.getImportReturn().getId() : null);
        movement.setQuantityDelta(qty);
        movement.setStockAfter(next);
        movement.setIsRemoved(false);
        stockMovementRepository.save(movement);

        detail.setStockReserved(false);
    }

    private void softRemoveAllLinesAndRestore(ImportReturn draft) {
        List<ImportReturnDetail> lines = importReturnDetailRepository.findActiveByReturnId(draft.getId());
        for (ImportReturnDetail line : lines) {
            restoreIfReserved(line);
            line.setIsRemoved(true);
            importReturnDetailRepository.save(line);
        }
    }

    private void createExchangeBatch(ImportReturnDetail detail, LocalDate exchangeExpiryDate, ImportOrder settlingOrder) {
        if (detail.getExchangeBatch() != null) {
            return;
        }
        StockBatch source = detail.getStockBatch();
        if (source == null) {
            throw new AppException(ErrorCode.STOCK_BATCH_NOT_FOUND);
        }
        source = stockBatchRepository.findActiveWithProductById(source.getId())
                .orElseThrow(() -> new AppException(ErrorCode.STOCK_BATCH_NOT_FOUND));

        int qty = detail.getQuantity() != null ? detail.getQuantity() : 0;
        StockBatch exchange = new StockBatch();
        exchange.setProduct(source.getProduct());
        exchange.setImportOrder(settlingOrder);
        exchange.setBatchCode(generateExchangeBatchCode());
        exchange.setCostPerUnit(source.getCostPerUnit());
        exchange.setQuantityIn(qty);
        exchange.setReceivedDate(LocalDate.now());
        exchange.setExpiryDate(exchangeExpiryDate);
        String returnRef = detail.getImportReturn() != null ? String.valueOf(detail.getImportReturn().getId()) : "?";
        String orderRef = settlingOrder != null && settlingOrder.getOrderCode() != null
                ? settlingOrder.getOrderCode()
                : "";
        exchange.setBatchNote(orderRef.isBlank()
                ? "Lô đổi từ phiếu trả #" + returnRef
                : "Lô đổi từ phiếu trả #" + returnRef + " — nhập " + orderRef);
        exchange.setIsRemoved(false);
        stockBatchRepository.save(exchange);

        StockMovement movement = new StockMovement();
        movement.setStockBatch(exchange);
        movement.setMovementType(ImportReturnConstants.MOVEMENT_EXCHANGE_IN);
        movement.setReferenceType(ImportReturnConstants.REFERENCE_TYPE);
        movement.setReferenceId(detail.getImportReturn() != null ? detail.getImportReturn().getId() : null);
        movement.setQuantityDelta(qty);
        movement.setStockAfter(qty);
        movement.setIsRemoved(false);
        stockMovementRepository.save(movement);

        detail.setExchangeBatch(exchange);
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

    private void maybeCompleteHeader(ImportReturn header) {
        List<ImportReturnDetail> lines = importReturnDetailRepository.findActiveByReturnId(header.getId());
        boolean allDone = !lines.isEmpty() && lines.stream()
                .allMatch(l -> ImportReturnConstants.LINE_DONE.equals(l.getLineStatus()));
        if (allDone) {
            header.setStatus(ImportReturnConstants.STATUS_COMPLETED);
            importReturnRepository.save(header);
        }
    }

    private void recalculateTotal(ImportReturn draft) {
        List<ImportReturnDetail> lines = importReturnDetailRepository.findActiveByReturnId(draft.getId());
        BigDecimal total = BigDecimal.ZERO;
        for (ImportReturnDetail line : lines) {
            int qty = line.getQuantity() != null ? line.getQuantity() : 0;
            BigDecimal price = line.getReturnPrice() != null ? line.getReturnPrice() : BigDecimal.ZERO;
            total = total.add(price.multiply(BigDecimal.valueOf(qty)));
        }
        draft.setTotalRefund(total);
        importReturnRepository.save(draft);
    }

    // -------------------------------------------------------------------------
    // Mapping / guards
    // -------------------------------------------------------------------------

    private ImportReturn newEmptyReturn(String status, String source, InventoryCheck check) {
        ImportReturn entity = new ImportReturn();
        entity.setStatus(status);
        entity.setSource(source);
        entity.setInventoryCheck(check);
        entity.setImportOrder(null);
        entity.setSupplier(null);
        entity.setTotalRefund(BigDecimal.ZERO);
        entity.setIsRemoved(false);
        return entity;
    }

    private ImportReturn requireActive(Integer id) {
        return importReturnRepository.findActiveById(id)
                .orElseThrow(() -> new AppException(ErrorCode.IMPORT_RETURN_NOT_FOUND));
    }

    private ImportReturn requireOwnedDraft(Integer userId, Integer id) {
        ImportReturn draft = requireActive(id);
        if (!ImportReturnConstants.STATUS_DRAFT.equals(draft.getStatus())) {
            throw new AppException(ErrorCode.IMPORT_RETURN_NOT_DRAFT);
        }
        if (userId != null && draft.getCreatedBy() != null && !Objects.equals(draft.getCreatedBy(), userId)) {
            throw new AppException(ErrorCode.IMPORT_RETURN_NOT_FOUND);
        }
        return draft;
    }

    private InventoryCheck resolveInventoryCheck(Integer id) {
        if (id == null) {
            return null;
        }
        return inventoryCheckRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.INVENTORY_CHECK_NOT_FOUND));
    }

    private ImportReturnListItemResponse toListItem(ImportReturn ir) {
        List<ImportReturnDetail> lines = importReturnDetailRepository.findActiveByReturnId(ir.getId());
        int totalQty = lines.stream().mapToInt(l -> l.getQuantity() != null ? l.getQuantity() : 0).sum();
        return ImportReturnListItemResponse.builder()
                .id(ir.getId())
                .returnCode(ir.getReturnCode())
                .status(ir.getStatus())
                .source(ir.getSource())
                .inventoryCheckId(ir.getInventoryCheck() != null ? ir.getInventoryCheck().getId() : null)
                .inventoryCheckCode(ir.getInventoryCheck() != null ? ir.getInventoryCheck().getCheckCode() : null)
                .itemCount(lines.size())
                .totalQuantity(totalQty)
                .totalRefund(ir.getTotalRefund() != null ? ir.getTotalRefund() : BigDecimal.ZERO)
                .note(ir.getNote())
                .createdAt(ir.getCreatedAt() != null ? ir.getCreatedAt().toString() : null)
                .createdByName(resolveUserName(ir.getCreatedBy()))
                .build();
    }

    private ImportReturnDetailResponse toDetail(ImportReturn ir) {
        List<ImportReturnDetail> details = importReturnDetailRepository.findActiveByReturnId(ir.getId());
        List<ImportReturnDetailResponse.Line> lines = details.stream().map(this::toLine).toList();
        int totalQty = lines.stream().mapToInt(l -> l.getQuantity() != null ? l.getQuantity() : 0).sum();

        return ImportReturnDetailResponse.builder()
                .id(ir.getId())
                .returnCode(ir.getReturnCode())
                .status(ir.getStatus())
                .source(ir.getSource())
                .inventoryCheckId(ir.getInventoryCheck() != null ? ir.getInventoryCheck().getId() : null)
                .totalRefund(ir.getTotalRefund() != null ? ir.getTotalRefund() : BigDecimal.ZERO)
                .note(ir.getNote())
                .createdByName(resolveUserName(ir.getCreatedBy()))
                .createdAt(ir.getCreatedAt() != null ? ir.getCreatedAt().toString() : null)
                .itemCount(lines.size())
                .totalQuantity(totalQty)
                .lines(lines)
                .build();
    }

    private ImportReturnDetailResponse.Line toLine(ImportReturnDetail detail) {
        Product product = detail.getProduct();
        StockBatch batch = detail.getStockBatch();
        Supplier supplier = detail.getSupplier();
        ImportOrder importOrder = detail.getImportOrder();
        StockBatch exchange = detail.getExchangeBatch();
        int qty = detail.getQuantity() != null ? detail.getQuantity() : 0;
        BigDecimal price = detail.getReturnPrice() != null ? detail.getReturnPrice() : BigDecimal.ZERO;

        return ImportReturnDetailResponse.Line.builder()
                .detailId(detail.getId())
                .stockBatchId(batch != null ? batch.getId() : null)
                .batchCode(batch != null ? batch.getBatchCode() : null)
                .productId(product != null ? product.getId() : null)
                .productCode(product != null ? resolveProductCode(product) : null)
                .productName(product != null ? product.getName() : null)
                .quantity(qty)
                .returnPrice(price)
                .lineValue(price.multiply(BigDecimal.valueOf(qty)))
                .returnReason(detail.getReturnReason())
                .note(detail.getNote())
                .method(detail.getMethod())
                .lineStatus(detail.getLineStatus())
                .supplierId(supplier != null ? supplier.getId() : null)
                .supplierName(supplier != null ? supplier.getName() : null)
                .importOrderId(importOrder != null ? importOrder.getId() : null)
                .maxQuantity(batch != null && batch.getQuantityIn() != null ? batch.getQuantityIn() + qty : qty)
                .exchangeBatchId(exchange != null ? exchange.getId() : null)
                .exchangeBatchCode(exchange != null ? exchange.getBatchCode() : null)
                .exchangeExpiryDate(
                        exchange != null && exchange.getExpiryDate() != null
                                ? exchange.getExpiryDate().toString()
                                : null)
                .build();
    }

    private ImportOrderReturnLineResponse toImportOrderReturnLine(ImportReturnDetail detail, Integer currentOrderId) {
        Product product = detail.getProduct();
        StockBatch batch = detail.getStockBatch();
        ImportReturn header = detail.getImportReturn();
        int qty = detail.getQuantity() != null ? detail.getQuantity() : 0;
        BigDecimal price = detail.getReturnPrice() != null ? detail.getReturnPrice() : BigDecimal.ZERO;
        Integer settledId = detail.getSettledImportOrder() != null ? detail.getSettledImportOrder().getId() : null;
        boolean attached = currentOrderId != null && Objects.equals(settledId, currentOrderId);

        return ImportOrderReturnLineResponse.builder()
                .detailId(detail.getId())
                .returnId(header != null ? header.getId() : null)
                .returnCode(header != null ? header.getReturnCode() : null)
                .productId(product != null ? product.getId() : null)
                .productName(product != null ? product.getName() : null)
                .method(ImportReturnConstants.normalizeMethod(detail.getMethod()))
                .quantity(qty)
                .returnPrice(price)
                .lineValue(price.multiply(BigDecimal.valueOf(qty)))
                .batchCode(batch != null ? batch.getBatchCode() : null)
                .returnReason(detail.getReturnReason())
                .lineStatus(detail.getLineStatus())
                .attached(attached)
                .build();
    }

    private String resolveUserName(Integer userId) {
        if (userId == null) {
            return null;
        }
        return userRepository.findById(userId)
                .map(User::getFullName)
                .orElse(null);
    }

    private String resolveProductCode(Product product) {
        if (product.getBarcode() != null && !product.getBarcode().isBlank()) {
            return product.getBarcode().trim();
        }
        return String.format("SP%05d", product.getId());
    }

    private String generateReturnCode(Instant when) {
        LocalDate date = LocalDate.ofInstant(when, ZoneId.systemDefault());
        String datePart = date.format(DateTimeFormatter.BASIC_ISO_DATE);
        int suffix = ThreadLocalRandom.current().nextInt(10, 99);
        return "THN-" + datePart + "-" + suffix;
    }

    private String generateExchangeBatchCode() {
        String day = LocalDate.now().format(DateTimeFormatter.ofPattern("ddMMyy"));
        String dayPrefix = "LODH" + day;
        Integer max = stockBatchRepository.findMaxBatchSequenceByDayPrefix(dayPrefix);
        int next = (max != null ? max : 0) + 1;
        return dayPrefix + "-" + String.format("%02d", next);
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
