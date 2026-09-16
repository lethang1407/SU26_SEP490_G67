package project.be_sep490_g67.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.be_sep490_g67.constants.ImportOrderConstants;
import project.be_sep490_g67.constants.ImportTrialConstants;
import project.be_sep490_g67.dto.request.CreateSupplierPaymentRequest;
import project.be_sep490_g67.dto.request.SettleImportTrialRequest;
import project.be_sep490_g67.dto.response.ImportTrialPreviewResponse;
import project.be_sep490_g67.dto.response.ImportTrialSettleResponse;
import project.be_sep490_g67.entity.BatchLocation;
import project.be_sep490_g67.entity.ImportOrder;
import project.be_sep490_g67.entity.ImportOrderDetail;
import project.be_sep490_g67.entity.ImportTrialSettlement;
import project.be_sep490_g67.entity.ImportTrialSettlementLine;
import project.be_sep490_g67.entity.ProductUnit;
import project.be_sep490_g67.entity.StockBatch;
import project.be_sep490_g67.entity.StockMovement;
import project.be_sep490_g67.entity.Supplier;
import project.be_sep490_g67.enums.ImportTrialDecision;
import project.be_sep490_g67.exception.AppException;
import project.be_sep490_g67.exception.ErrorCode;
import project.be_sep490_g67.repository.BatchLocationRepository;
import project.be_sep490_g67.repository.ImportOrderDetailRepository;
import project.be_sep490_g67.repository.ImportOrderRepository;
import project.be_sep490_g67.repository.ProductUnitRepository;
import project.be_sep490_g67.repository.ImportTrialSettlementLineRepository;
import project.be_sep490_g67.repository.ImportTrialSettlementRepository;
import project.be_sep490_g67.repository.StockBatchRepository;
import project.be_sep490_g67.repository.StockMovementRepository;
import project.be_sep490_g67.repository.SupplierPaymentRepository;
import project.be_sep490_g67.repository.SupplierRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ImportTrialSettlementService {

    ImportOrderRepository importOrderRepository;
    ImportOrderDetailRepository importOrderDetailRepository;
    ProductUnitRepository productUnitRepository;
    StockBatchRepository stockBatchRepository;
    StockMovementRepository stockMovementRepository;
    BatchLocationRepository batchLocationRepository;
    ImportTrialSettlementRepository settlementRepository;
    ImportTrialSettlementLineRepository settlementLineRepository;
    SupplierRepository supplierRepository;
    SupplierPaymentRepository supplierPaymentRepository;
    SupplierPaymentService supplierPaymentService;

    @Transactional(readOnly = true)
    public ImportTrialPreviewResponse preview(Integer orderId) {
        ImportOrder order = requireImportedOrder(orderId);
        List<ImportOrderDetail> openLines = importOrderDetailRepository.findOpenTrialLinesByOrderId(orderId);
        return toPreview(order, openLines);
    }

    @Transactional(readOnly = true)
    public List<ImportTrialPreviewResponse> previewOpenBySupplier(Integer supplierId) {
        if (!supplierRepository.existsByIdAndIsRemovedFalse(supplierId)) {
            throw new AppException(ErrorCode.NOT_FOUND_SUPPLIER);
        }
        List<ImportOrderDetail> openLines = importOrderDetailRepository.findOpenTrialLinesBySupplierId(supplierId);
        Map<Integer, List<ImportOrderDetail>> byOrder = openLines.stream()
                .collect(Collectors.groupingBy(
                        d -> d.getImportOrder().getId(),
                        LinkedHashMap::new,
                        Collectors.toList()));
        List<ImportTrialPreviewResponse> result = new ArrayList<>();
        for (List<ImportOrderDetail> lines : byOrder.values()) {
            result.add(toPreview(lines.get(0).getImportOrder(), lines));
        }
        return result;
    }

    @Transactional
    public ImportTrialSettleResponse settle(Integer orderId, SettleImportTrialRequest request) {
        ImportOrder order = requireImportedOrder(orderId);
        Supplier supplier = order.getSupplier();
        if (supplier == null) {
            throw new AppException(ErrorCode.SUPPLIER_REQUIRED_FOR_IMPORT);
        }

        List<ImportOrderDetail> openLines = importOrderDetailRepository.findOpenTrialLinesByOrderId(orderId);
        if (openLines.isEmpty()) {
            throw new AppException(ErrorCode.TRIAL_NOT_FOUND);
        }

        Map<Integer, SettleImportTrialRequest.Line> requestByDetailId = new LinkedHashMap<>();
        for (SettleImportTrialRequest.Line line : request.getLines()) {
            if (line == null || line.getImportOrderDetailId() == null) {
                throw new AppException(ErrorCode.TRIAL_LINES_INCOMPLETE);
            }
            if (requestByDetailId.put(line.getImportOrderDetailId(), line) != null) {
                throw new AppException(ErrorCode.TRIAL_LINES_INCOMPLETE);
            }
        }
        if (requestByDetailId.size() != openLines.size()
                || openLines.stream().anyMatch(d -> !requestByDetailId.containsKey(d.getId()))) {
            throw new AppException(ErrorCode.TRIAL_LINES_INCOMPLETE);
        }

        ImportTrialSettlement settlement = new ImportTrialSettlement();
        settlement.setImportOrder(order);
        settlement.setSupplier(supplier);
        settlement.setNote(blankToNull(request.getNote()));
        settlement.setPayableAmount(BigDecimal.ZERO);
        settlement.setDiscountAmount(BigDecimal.ZERO);
        settlement.setPaidAmount(BigDecimal.ZERO);
        settlement.setIsRemoved(false);
        settlement = settlementRepository.save(settlement);

        BigDecimal totalPayable = BigDecimal.ZERO;
        BigDecimal bookedTrial = BigDecimal.ZERO;
        List<ImportTrialSettleResponse.Line> responseLines = new ArrayList<>();

        for (ImportOrderDetail detail : openLines) {
            BigDecimal booked = detail.getLineTotal() != null ? detail.getLineTotal() : BigDecimal.ZERO;
            bookedTrial = bookedTrial.add(booked);
            SettleImportTrialRequest.Line reqLine = requestByDetailId.get(detail.getId());
            AppliedLine applied = applyLine(detail, reqLine, settlement);
            totalPayable = totalPayable.add(applied.payableAmount());
            responseLines.add(applied.response());
        }

        BigDecimal discount = request.getDiscountAmount() != null
                ? request.getDiscountAmount()
                : BigDecimal.ZERO;
        if (discount.compareTo(BigDecimal.ZERO) < 0 || discount.compareTo(totalPayable) > 0) {
            throw new AppException(ErrorCode.INVALID_TRIAL_DISCOUNT);
        }
        BigDecimal netPayable = totalPayable.subtract(discount);

        BigDecimal previousDue = order.getTotalCost() != null ? order.getTotalCost() : BigDecimal.ZERO;
        BigDecimal newTotalCost = previousDue.subtract(bookedTrial).add(netPayable).max(BigDecimal.ZERO);
        order.setTotalCost(newTotalCost);
        importOrderRepository.save(order);
        importOrderRepository.flush();

        BigDecimal alreadyPaid = supplierPaymentRepository.sumPaidAmountByImportOrder(order.getId());
        if (alreadyPaid == null) {
            alreadyPaid = BigDecimal.ZERO;
        }
        BigDecimal remainingAfterAdjust = newTotalCost.subtract(alreadyPaid).max(BigDecimal.ZERO);

        BigDecimal paidAmount = request.getPaidAmount() != null ? request.getPaidAmount() : BigDecimal.ZERO;
        if (paidAmount.compareTo(BigDecimal.ZERO) < 0 || paidAmount.compareTo(remainingAfterAdjust) > 0) {
            throw new AppException(ErrorCode.INVALID_IMPORT_PAID_AMOUNT);
        }

        settlement.setPayableAmount(totalPayable);
        settlement.setDiscountAmount(discount);
        settlement.setPaidAmount(paidAmount);
        settlementRepository.save(settlement);

        

        if (paidAmount.compareTo(BigDecimal.ZERO) > 0) {
            supplierPaymentService.createPayment(supplier.getId(), CreateSupplierPaymentRequest.builder()
                    .orderId(order.getId())
                    .amount(paidAmount)
                    .paymentMethod(request.getPaymentMethod())
                    .note(request.getNote() != null && !request.getNote().isBlank()
                            ? request.getNote()
                            : "Thanh toán quyết toán hàng bán thử")
                    .build());
        }

        BigDecimal remainingDebt = remainingAfterAdjust.subtract(paidAmount).max(BigDecimal.ZERO);

        log.info("Settled trial import order {} payable={} discount={} booked={} paid={} remainingDebt={}",
                order.getOrderCode(), totalPayable, discount, bookedTrial, paidAmount, remainingDebt);

        return ImportTrialSettleResponse.builder()
                .id(settlement.getId())
                .importOrderId(order.getId())
                .orderCode(order.getOrderCode())
                .payableAmount(totalPayable)
                .discountAmount(discount)
                .paidAmount(paidAmount)
                .remainingDebt(remainingDebt)
                .settledAt(settlement.getCreatedAt())
                .lines(responseLines)
                .build();
    }

    private ImportOrder requireImportedOrder(Integer orderId) {
        ImportOrder order = importOrderRepository.findDetailById(orderId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND_IMPORT_ORDER));
        if (!ImportOrderConstants.ORDER_STATUS_IMPORTED.equals(order.getOrderStatus())) {
            throw new AppException(ErrorCode.IMPORT_ORDER_NOT_IMPORTED);
        }
        return order;
    }

    private ImportTrialPreviewResponse toPreview(ImportOrder order, List<ImportOrderDetail> openLines) {
        Map<Integer, String> baseUnitNames = loadBaseUnitNames(openLines.stream()
                .map(detail -> detail.getProduct() != null ? detail.getProduct().getId() : null)
                .toList());
        List<ImportTrialPreviewResponse.Line> lines = new ArrayList<>();
        BigDecimal returnRestTotal = BigDecimal.ZERO;
        BigDecimal keepAllTotal = BigDecimal.ZERO;
        for (ImportOrderDetail detail : openLines) {
            Snapshot snap = snapshot(detail);
            BigDecimal returnRest = moneyFromBase(snap.soldBase(), snap.costPerUnit(), snap.unitBase());
            BigDecimal keepAll = moneyFromBase(snap.receivedBase(), snap.costPerUnit(), snap.unitBase());
            returnRestTotal = returnRestTotal.add(returnRest);
            keepAllTotal = keepAllTotal.add(keepAll);
            ProductName names = productName(detail, baseUnitNames);
            lines.add(ImportTrialPreviewResponse.Line.builder()
                    .importOrderDetailId(detail.getId())
                    .productId(detail.getProduct() != null ? detail.getProduct().getId() : null)
                    .productName(names.displayName())
                    .unitName(names.unitName())
                    .baseUnitName(names.baseUnitName())
                    .unitBase(snap.unitBase())
                    .receivedQty(snap.receivedQty())
                    .receivedBaseQty(snap.receivedBase())
                    .systemRemainingQty(snap.remainingBase())
                    .suggestedSoldQty(snap.soldBase())
                    .costPerUnit(snap.costPerUnit())
                    .trialStatus(detail.getTrialStatus())
                    .estimatedPayableIfReturnRest(returnRest)
                    .estimatedPayableIfKeepAll(keepAll)
                    .build());
        }
        Supplier supplier = order.getSupplier();
        BigDecimal paid = supplierPaymentRepository.sumPaidAmountByImportOrder(order.getId());
        if (paid == null) {
            paid = BigDecimal.ZERO;
        }
        BigDecimal totalCost = order.getTotalCost() != null ? order.getTotalCost() : BigDecimal.ZERO;
        BigDecimal bookedOpenTrial = openLines.stream()
                .map(detail -> detail.getLineTotal() != null ? detail.getLineTotal() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return ImportTrialPreviewResponse.builder()
                .importOrderId(order.getId())
                .orderCode(order.getOrderCode())
                .receivedDate(order.getReceivedDate())
                .supplierId(supplier != null ? supplier.getId() : null)
                .supplierName(supplier != null ? supplier.getName() : null)
                .hasOpenTrial(!openLines.isEmpty())
                .remainingDebt(totalCost.subtract(paid).max(BigDecimal.ZERO))
                .bookedOpenTrialAmount(bookedOpenTrial)
                .paidAmount(paid)
                .estimatedPayableIfReturnRest(returnRestTotal)
                .estimatedPayableIfKeepAll(keepAllTotal)
                .lines(lines)
                .build();
    }

    private AppliedLine applyLine(
            ImportOrderDetail detail,
            SettleImportTrialRequest.Line reqLine,
            ImportTrialSettlement settlement) {

        if (ImportTrialConstants.TRIAL_SETTLED.equals(detail.getTrialStatus())) {
            throw new AppException(ErrorCode.TRIAL_ALREADY_SETTLED);
        }

        Snapshot snap = snapshot(detail);
        int countedBase = reqLine.getCountedRemainingQty() != null
                ? reqLine.getCountedRemainingQty()
                : snap.remainingBase();
        int unsellableBase = reqLine.getUnsellableQty() != null ? reqLine.getUnsellableQty() : 0;
        if (countedBase < 0 || countedBase > snap.remainingBase()
                || unsellableBase < 0 || unsellableBase > countedBase) {
            throw new AppException(ErrorCode.TRIAL_QTY_INVALID);
        }

        ImportTrialDecision decision = ImportTrialDecision.from(reqLine.getDecision());
        int returnedBase;
        int payableBase;
        if (decision == ImportTrialDecision.PAY_ALL_KEEP) {
            returnedBase = 0;
            payableBase = snap.receivedBase();
        } else {
            returnedBase = countedBase - unsellableBase;
            payableBase = snap.receivedBase() - returnedBase;
        }

        int missingBase = Math.max(snap.remainingBase() - countedBase, 0);
        int writeOffBase = unsellableBase + missingBase;

        StockBatch batch = stockBatchRepository
                .findFirstByImportOrderDetail_IdAndIsRemovedFalse(detail.getId())
                .orElse(null);

        if (batch != null) {
            if (returnedBase > 0) {
                deductFromBatch(batch, returnedBase, ImportTrialConstants.MOVEMENT_RETURN, settlement.getId());
            }
            if (writeOffBase > 0) {
                deductFromBatch(batch, writeOffBase, ImportTrialConstants.MOVEMENT_UNSELLABLE, settlement.getId());
            }
            if (decision == ImportTrialDecision.PAY_ALL_KEEP) {
                batch.setIsTrial(false);
                stockBatchRepository.save(batch);
            }
        }

        BigDecimal payableAmount = moneyFromBase(payableBase, snap.costPerUnit(), snap.unitBase());
        detail.setLineTotal(payableAmount);
        detail.setTrialStatus(ImportTrialConstants.TRIAL_SETTLED);
        importOrderDetailRepository.save(detail);

        ImportTrialSettlementLine savedLine = new ImportTrialSettlementLine();
        savedLine.setSettlement(settlement);
        savedLine.setImportOrderDetail(detail);
        savedLine.setStockBatch(batch);
        savedLine.setProduct(detail.getProduct());
        savedLine.setReceivedQty(snap.receivedBase());
        savedLine.setSystemRemainingQty(snap.remainingBase());
        savedLine.setCountedRemainingQty(countedBase);
        savedLine.setUnsellableQty(unsellableBase);
        savedLine.setReturnedQty(returnedBase);
        savedLine.setPayableQty(payableBase);
        savedLine.setDecision(decision.name());
        savedLine.setCostPerUnit(snap.costPerUnit());
        savedLine.setPayableAmount(payableAmount);
        savedLine.setIsRemoved(false);
        settlementLineRepository.save(savedLine);

        ProductName names = productName(detail, loadBaseUnitNames(List.of(
                detail.getProduct() != null ? detail.getProduct().getId() : null)));
        return new AppliedLine(payableAmount, ImportTrialSettleResponse.Line.builder()
                .importOrderDetailId(detail.getId())
                .productId(detail.getProduct() != null ? detail.getProduct().getId() : null)
                .productName(names.displayName())
                .decision(decision.name())
                .receivedQty(snap.receivedBase())
                .countedRemainingQty(countedBase)
                .unsellableQty(unsellableBase)
                .returnedQty(returnedBase)
                .payableQty(payableBase)
                .payableAmount(payableAmount)
                .unitName(names.baseUnitName())
                .baseUnitName(names.baseUnitName())
                .build());
    }

    @Transactional(readOnly = true)
    public List<ImportTrialSettleResponse> listByOrder(Integer orderId) {
        if (importOrderRepository.findDetailById(orderId).isEmpty()) {
            throw new AppException(ErrorCode.NOT_FOUND_IMPORT_ORDER);
        }
        return listHistory(orderId);
    }

    @Transactional(readOnly = true)
    public List<ImportTrialSettleResponse> listHistory(Integer orderId) {
        return settlementRepository.findByImportOrderIdWithLines(orderId).stream()
                .map(this::toHistoryResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ImportTrialSettleResponse> listBySupplier(Integer supplierId) {
        if (!supplierRepository.existsByIdAndIsRemovedFalse(supplierId)) {
            throw new AppException(ErrorCode.NOT_FOUND_SUPPLIER);
        }
        return settlementRepository.findBySupplierIdWithLines(supplierId).stream()
                .map(this::toHistoryResponse)
                .toList();
    }

    private ImportTrialSettleResponse toHistoryResponse(ImportTrialSettlement settlement) {
        List<ImportTrialSettlementLine> sourceLines = settlement.getLines() == null
                ? List.of()
                : settlement.getLines().stream()
                        .filter(line -> !Boolean.TRUE.equals(line.getIsRemoved()))
                        .sorted(Comparator.comparing(
                                ImportTrialSettlementLine::getId,
                                Comparator.nullsLast(Comparator.naturalOrder())))
                        .toList();
        Map<Integer, String> baseUnitNames = loadBaseUnitNames(sourceLines.stream()
                .map(this::productIdOf)
                .toList());
        List<ImportTrialSettleResponse.Line> lines = sourceLines.stream()
                .map(line -> toHistoryLine(line, baseUnitNames))
                .toList();
        ImportOrder order = settlement.getImportOrder();
        BigDecimal payable = settlement.getPayableAmount() != null ? settlement.getPayableAmount() : BigDecimal.ZERO;
        BigDecimal discount = settlement.getDiscountAmount() != null ? settlement.getDiscountAmount() : BigDecimal.ZERO;
        BigDecimal paid = settlement.getPaidAmount() != null ? settlement.getPaidAmount() : BigDecimal.ZERO;
        return ImportTrialSettleResponse.builder()
                .id(settlement.getId())
                .importOrderId(order != null ? order.getId() : null)
                .orderCode(order != null ? order.getOrderCode() : null)
                .payableAmount(payable)
                .discountAmount(discount)
                .paidAmount(paid)
                .remainingDebt(payable.subtract(discount).subtract(paid).max(BigDecimal.ZERO))
                .settledAt(settlement.getCreatedAt())
                .lines(lines)
                .build();
    }

    private ImportTrialSettleResponse.Line toHistoryLine(
            ImportTrialSettlementLine line,
            Map<Integer, String> baseUnitNames) {
        Integer productId = productIdOf(line);
        ProductName names = line.getImportOrderDetail() != null
                ? productName(line.getImportOrderDetail(), baseUnitNames)
                : new ProductName(
                        line.getProduct() != null ? line.getProduct().getName() : null,
                        null,
                        resolveBaseUnitName(productId, null, baseUnitNames));
        boolean storedInBase = quantitiesStoredInBase(line);
        String displayUnit = storedInBase ? names.baseUnitName() : names.unitName();
        if (displayUnit == null || displayUnit.isBlank()) {
            displayUnit = names.baseUnitName();
        }
        return ImportTrialSettleResponse.Line.builder()
                .importOrderDetailId(line.getImportOrderDetail() != null ? line.getImportOrderDetail().getId() : null)
                .productId(productId)
                .productName(names.displayName())
                .decision(line.getDecision())
                .receivedQty(line.getReceivedQty())
                .countedRemainingQty(line.getCountedRemainingQty())
                .unsellableQty(line.getUnsellableQty())
                .returnedQty(line.getReturnedQty())
                .payableQty(line.getPayableQty())
                .payableAmount(line.getPayableAmount())
                .unitName(displayUnit)
                .baseUnitName(names.baseUnitName())
                .build();
    }

    private Snapshot snapshot(ImportOrderDetail detail) {
        int receivedQty = detail.getQuantity() != null ? detail.getQuantity() : 0;
        BigDecimal cost = detail.getCostPerUnit() != null ? detail.getCostPerUnit() : BigDecimal.ZERO;
        BigDecimal unitBase = resolveUnitBase(detail.getProductUnit());
        int receivedBase = toBase(receivedQty, detail.getProductUnit());
        StockBatch batch = stockBatchRepository
                .findFirstByImportOrderDetail_IdAndIsRemovedFalse(detail.getId())
                .orElse(null);
        int remainingBase = 0;
        if (batch != null) {
            remainingBase = Math.max(0, stockMovementRepository.sumQuantityDeltaByBatchId(batch.getId()));
        }
        remainingBase = Math.min(remainingBase, receivedBase);
        int soldBase = Math.max(receivedBase - remainingBase, 0);
        return new Snapshot(receivedQty, receivedBase, remainingBase, soldBase, cost, unitBase);
    }

    private void deductFromBatch(StockBatch batch, int qtyBase, String movementType, Integer settlementId) {
        if (qtyBase <= 0) {
            return;
        }
        int remainingBefore = Math.max(0, stockMovementRepository.sumQuantityDeltaByBatchId(batch.getId()));
        int deduct = Math.min(qtyBase, remainingBefore);
        if (deduct <= 0) {
            return;
        }
        deductFromBatchLocations(batch, deduct);
        int remainingAfter = remainingBefore - deduct;
        batch.setQuantityIn(remainingAfter);
        stockBatchRepository.save(batch);

        StockMovement movement = StockMovement.builder()
                .stockBatch(batch)
                .quantityDelta(-deduct)
                .stockAfter(remainingAfter)
                .movementType(movementType)
                .referenceType(ImportTrialConstants.REFERENCE_TYPE)
                .referenceId(settlementId)
                .build();
        movement.setIsRemoved(false);
        stockMovementRepository.save(movement);
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

    private int toBase(int quantity, ProductUnit productUnit) {
        BigDecimal baseQty = BigDecimal.valueOf(quantity).multiply(resolveUnitBase(productUnit));
        return baseQty.setScale(0, RoundingMode.HALF_UP).intValue();
    }

    private BigDecimal resolveUnitBase(ProductUnit productUnit) {
        if (productUnit == null || productUnit.getUnitBase() == null
                || productUnit.getUnitBase().compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ONE;
        }
        return productUnit.getUnitBase();
    }

    private BigDecimal moneyFromBase(int qtyBase, BigDecimal costPerUnit, BigDecimal unitBase) {
        BigDecimal cost = costPerUnit != null ? costPerUnit : BigDecimal.ZERO;
        BigDecimal base = unitBase != null && unitBase.compareTo(BigDecimal.ZERO) > 0
                ? unitBase
                : BigDecimal.ONE;
        return cost.multiply(BigDecimal.valueOf(Math.max(qtyBase, 0)))
                .divide(base, 2, RoundingMode.HALF_UP);
    }

    private Map<Integer, String> loadBaseUnitNames(List<Integer> productIds) {
        List<Integer> ids = productIds == null
                ? List.of()
                : productIds.stream().filter(Objects::nonNull).distinct().toList();
        if (ids.isEmpty()) {
            return Map.of();
        }
        Map<Integer, String> result = new LinkedHashMap<>();
        for (ProductUnit unit : productUnitRepository.findByProduct_IdInAndIsRemovedFalse(ids)) {
            if (unit.getProduct() == null || unit.getProduct().getId() == null) {
                continue;
            }
            if (unit.getUnitBase() == null || unit.getUnitBase().compareTo(BigDecimal.ONE) != 0) {
                continue;
            }
            if (unit.getName() == null || unit.getName().isBlank()) {
                continue;
            }
            result.putIfAbsent(unit.getProduct().getId(), unit.getName().trim());
        }
        return result;
    }

    private ProductName productName(ImportOrderDetail detail, Map<Integer, String> baseUnitNames) {
        String productName = detail.getProduct() != null ? detail.getProduct().getName() : null;
        String unitName = detail.getProductUnit() != null ? detail.getProductUnit().getName() : null;
        Integer productId = detail.getProduct() != null ? detail.getProduct().getId() : null;
        return new ProductName(productName, unitName, resolveBaseUnitName(productId, unitName, baseUnitNames));
    }

    private String resolveBaseUnitName(Integer productId, String importUnitName, Map<Integer, String> baseUnitNames) {
        if (productId != null && baseUnitNames != null) {
            String mapped = baseUnitNames.get(productId);
            if (mapped != null && !mapped.isBlank()) {
                return mapped;
            }
        }
        if (importUnitName != null && !importUnitName.isBlank()) {
            return importUnitName;
        }
        return "ĐVT";
    }

    private Integer productIdOf(ImportTrialSettlementLine line) {
        if (line.getProduct() != null && line.getProduct().getId() != null) {
            return line.getProduct().getId();
        }
        if (line.getImportOrderDetail() != null
                && line.getImportOrderDetail().getProduct() != null) {
            return line.getImportOrderDetail().getProduct().getId();
        }
        return null;
    }

    /**
     * Bản ghi quyết toán mới lưu SL theo ĐVT cơ bản. Bản ghi cũ lưu SL theo ĐVT phiếu.
     */
    private boolean quantitiesStoredInBase(ImportTrialSettlementLine line) {
        ImportOrderDetail detail = line.getImportOrderDetail();
        if (detail == null || line.getReceivedQty() == null || detail.getQuantity() == null) {
            return false;
        }
        int importQty = detail.getQuantity();
        int baseQty = toBase(importQty, detail.getProductUnit());
        return line.getReceivedQty() == baseQty && importQty != baseQty;
    }

    private String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private record Snapshot(
            int receivedQty,
            int receivedBase,
            int remainingBase,
            int soldBase,
            BigDecimal costPerUnit,
            BigDecimal unitBase) {
    }

    private record ProductName(String displayName, String unitName, String baseUnitName) {}

    private record AppliedLine(BigDecimal payableAmount, ImportTrialSettleResponse.Line response) {}
}
