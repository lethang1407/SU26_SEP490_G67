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

        BigDecimal previousDue = order.getTotalCost() != null ? order.getTotalCost() : BigDecimal.ZERO;
        BigDecimal newTotalCost = previousDue.subtract(bookedTrial).add(totalPayable).max(BigDecimal.ZERO);
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

        log.info("Settled trial import order {} payable={} booked={} paid={} remainingDebt={}",
                order.getOrderCode(), totalPayable, bookedTrial, paidAmount, remainingDebt);

        return ImportTrialSettleResponse.builder()
                .id(settlement.getId())
                .importOrderId(order.getId())
                .orderCode(order.getOrderCode())
                .payableAmount(totalPayable)
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
        List<ImportTrialPreviewResponse.Line> lines = new ArrayList<>();
        BigDecimal returnRestTotal = BigDecimal.ZERO;
        BigDecimal keepAllTotal = BigDecimal.ZERO;
        for (ImportOrderDetail detail : openLines) {
            Snapshot snap = snapshot(detail);
            BigDecimal returnRest = money(snap.payableIfReturnRest(), snap.costPerUnit());
            BigDecimal keepAll = money(snap.receivedQty(), snap.costPerUnit());
            returnRestTotal = returnRestTotal.add(returnRest);
            keepAllTotal = keepAllTotal.add(keepAll);
            ProductName names = productName(detail);
            lines.add(ImportTrialPreviewResponse.Line.builder()
                    .importOrderDetailId(detail.getId())
                    .productId(detail.getProduct() != null ? detail.getProduct().getId() : null)
                    .productName(names.displayName())
                    .unitName(names.unitName())
                    .receivedQty(snap.receivedQty())
                    .systemRemainingQty(snap.remainingQty())
                    .suggestedSoldQty(snap.soldQty())
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
        int counted = reqLine.getCountedRemainingQty() != null
                ? reqLine.getCountedRemainingQty()
                : snap.remainingQty();
        int unsellable = reqLine.getUnsellableQty() != null ? reqLine.getUnsellableQty() : 0;
        if (counted < 0 || counted > snap.remainingQty() || unsellable < 0 || unsellable > counted) {
            throw new AppException(ErrorCode.TRIAL_QTY_INVALID);
        }

        ImportTrialDecision decision = ImportTrialDecision.from(reqLine.getDecision());
        int returnable = counted - unsellable;
        int returnedQty;
        int payableQty;
        if (decision == ImportTrialDecision.PAY_ALL_KEEP) {
            returnedQty = 0;
            payableQty = snap.receivedQty();
        } else {
            returnedQty = returnable;
            payableQty = snap.receivedQty() - returnedQty;
        }

        int countedBase = Math.min(toBase(counted, detail.getProductUnit()), snap.remainingBase());
        int unsellableBase = Math.min(toBase(unsellable, detail.getProductUnit()), countedBase);
        int missingBase = Math.max(snap.remainingBase() - countedBase, 0);
        int returnedBase = decision == ImportTrialDecision.PAY_ALL_KEEP
                ? 0
                : Math.max(countedBase - unsellableBase, 0);
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

        BigDecimal payableAmount = money(payableQty, snap.costPerUnit());
        detail.setLineTotal(payableAmount);
        detail.setTrialStatus(ImportTrialConstants.TRIAL_SETTLED);
        importOrderDetailRepository.save(detail);

        ImportTrialSettlementLine savedLine = new ImportTrialSettlementLine();
        savedLine.setSettlement(settlement);
        savedLine.setImportOrderDetail(detail);
        savedLine.setStockBatch(batch);
        savedLine.setProduct(detail.getProduct());
        savedLine.setReceivedQty(snap.receivedQty());
        savedLine.setSystemRemainingQty(snap.remainingQty());
        savedLine.setCountedRemainingQty(counted);
        savedLine.setUnsellableQty(unsellable);
        savedLine.setReturnedQty(returnedQty);
        savedLine.setPayableQty(payableQty);
        savedLine.setDecision(decision.name());
        savedLine.setCostPerUnit(snap.costPerUnit());
        savedLine.setPayableAmount(payableAmount);
        savedLine.setIsRemoved(false);
        settlementLineRepository.save(savedLine);

        ProductName names = productName(detail);
        return new AppliedLine(payableAmount, ImportTrialSettleResponse.Line.builder()
                .importOrderDetailId(detail.getId())
                .productId(detail.getProduct() != null ? detail.getProduct().getId() : null)
                .productName(names.displayName())
                .decision(decision.name())
                .receivedQty(snap.receivedQty())
                .countedRemainingQty(counted)
                .unsellableQty(unsellable)
                .returnedQty(returnedQty)
                .payableQty(payableQty)
                .payableAmount(payableAmount)
                .unitName(names.unitName())
                .build());
    }

    @Transactional(readOnly = true)
    public List<ImportTrialSettleResponse> listByOrder(Integer orderId) {
        if (importOrderRepository.findActiveByIdForUpdate(orderId).isEmpty()) {
            throw new AppException(ErrorCode.NOT_FOUND_IMPORT_ORDER);
        }
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
        List<ImportTrialSettleResponse.Line> lines;
        if (settlement.getLines() == null) {
            lines = List.of();
        } else {
            lines = settlement.getLines().stream()
                    .filter(line -> !Boolean.TRUE.equals(line.getIsRemoved()))
                    .sorted(Comparator.comparing(
                            ImportTrialSettlementLine::getId,
                            Comparator.nullsLast(Comparator.naturalOrder())))
                    .map(this::toHistoryLine)
                    .toList();
        }
        ImportOrder order = settlement.getImportOrder();
        BigDecimal payable = settlement.getPayableAmount() != null ? settlement.getPayableAmount() : BigDecimal.ZERO;
        BigDecimal paid = settlement.getPaidAmount() != null ? settlement.getPaidAmount() : BigDecimal.ZERO;
        return ImportTrialSettleResponse.builder()
                .id(settlement.getId())
                .importOrderId(order != null ? order.getId() : null)
                .orderCode(order != null ? order.getOrderCode() : null)
                .payableAmount(payable)
                .paidAmount(paid)
                .remainingDebt(payable.subtract(paid).max(BigDecimal.ZERO))
                .settledAt(settlement.getCreatedAt())
                .lines(lines)
                .build();
    }

    private ImportTrialSettleResponse.Line toHistoryLine(ImportTrialSettlementLine line) {
        ProductName names = line.getImportOrderDetail() != null
                ? productName(line.getImportOrderDetail())
                : new ProductName(
                        line.getProduct() != null ? line.getProduct().getName() : null,
                        null);
        return ImportTrialSettleResponse.Line.builder()
                .importOrderDetailId(line.getImportOrderDetail() != null ? line.getImportOrderDetail().getId() : null)
                .productId(line.getProduct() != null ? line.getProduct().getId() : null)
                .productName(names.displayName())
                .decision(line.getDecision())
                .receivedQty(line.getReceivedQty())
                .countedRemainingQty(line.getCountedRemainingQty())
                .unsellableQty(line.getUnsellableQty())
                .returnedQty(line.getReturnedQty())
                .payableQty(line.getPayableQty())
                .payableAmount(line.getPayableAmount())
                .unitName(names.unitName())
                .build();
    }

    private Snapshot snapshot(ImportOrderDetail detail) {
        int receivedQty = detail.getQuantity() != null ? detail.getQuantity() : 0;
        BigDecimal cost = detail.getCostPerUnit() != null ? detail.getCostPerUnit() : BigDecimal.ZERO;
        StockBatch batch = stockBatchRepository
                .findFirstByImportOrderDetail_IdAndIsRemovedFalse(detail.getId())
                .orElse(null);
        int remainingBase = 0;
        if (batch != null) {
            remainingBase = Math.max(0, stockMovementRepository.sumQuantityDeltaByBatchId(batch.getId()));
        }
        remainingBase = Math.min(remainingBase, toBase(receivedQty, detail.getProductUnit()));
        int remainingQty = fromBase(remainingBase, detail.getProductUnit());
        remainingQty = Math.min(remainingQty, receivedQty);
        int soldQty = Math.max(receivedQty - remainingQty, 0);
        return new Snapshot(receivedQty, remainingQty, remainingBase, soldQty, cost);
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

    private int fromBase(int baseQty, ProductUnit productUnit) {
        BigDecimal unitBase = resolveUnitBase(productUnit);
        if (unitBase.compareTo(BigDecimal.ZERO) <= 0) {
            return baseQty;
        }
        return BigDecimal.valueOf(baseQty).divide(unitBase, 0, RoundingMode.DOWN).intValue();
    }

    private BigDecimal resolveUnitBase(ProductUnit productUnit) {
        if (productUnit == null || productUnit.getUnitBase() == null
                || productUnit.getUnitBase().compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ONE;
        }
        return productUnit.getUnitBase();
    }

    private BigDecimal money(int qty, BigDecimal costPerUnit) {
        BigDecimal cost = costPerUnit != null ? costPerUnit : BigDecimal.ZERO;
        return cost.multiply(BigDecimal.valueOf(Math.max(qty, 0))).setScale(2, RoundingMode.HALF_UP);
    }

    private ProductName productName(ImportOrderDetail detail) {
        String productName = detail.getProduct() != null ? detail.getProduct().getName() : null;
        String unitName = detail.getProductUnit() != null ? detail.getProductUnit().getName() : null;
        return new ProductName(productName, unitName);
    }

    private String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private record Snapshot(
            int receivedQty,
            int remainingQty,
            int remainingBase,
            int soldQty,
            BigDecimal costPerUnit) {
        int payableIfReturnRest() {
            return Math.max(receivedQty - remainingQty, 0);
        }
    }

    private record ProductName(String displayName, String unitName) {}

    private record AppliedLine(BigDecimal payableAmount, ImportTrialSettleResponse.Line response) {}
}
