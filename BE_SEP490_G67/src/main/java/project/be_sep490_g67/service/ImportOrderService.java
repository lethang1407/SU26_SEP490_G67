package project.be_sep490_g67.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.be_sep490_g67.constants.ImportOrderConstants;
import project.be_sep490_g67.dto.request.CreateDraftFromSuggestRequest;
import project.be_sep490_g67.dto.request.CreateImportOrderRequest;
import project.be_sep490_g67.dto.response.ImportOrderDetailResponse;
import project.be_sep490_g67.dto.response.ImportOrderResponseDTO;
import project.be_sep490_g67.dto.response.ImportOrderItemResponse;
import project.be_sep490_g67.dto.response.ImportOrderListItemResponse;
import project.be_sep490_g67.dto.response.ImportOrderReturnLineResponse;
import project.be_sep490_g67.dto.response.PageResponse;
import project.be_sep490_g67.dto.response.ProductAttributeResponse;
import project.be_sep490_g67.mapper.ProductMapper;
import project.be_sep490_g67.entity.ImportOrder;
import project.be_sep490_g67.entity.ImportOrderDetail;
import project.be_sep490_g67.entity.ImportReturnDetail;
import project.be_sep490_g67.entity.Product;
import project.be_sep490_g67.entity.ProductUnit;
import project.be_sep490_g67.entity.StockBatch;
import project.be_sep490_g67.entity.StockMovement;
import project.be_sep490_g67.entity.Supplier;
import project.be_sep490_g67.entity.SupplierPayment;
import project.be_sep490_g67.entity.User;
import project.be_sep490_g67.exception.AppException;
import project.be_sep490_g67.exception.ErrorCode;
import project.be_sep490_g67.repository.ImportOrderDetailRepository;
import project.be_sep490_g67.repository.ImportOrderRepository;
import project.be_sep490_g67.repository.ProductRepository;
import project.be_sep490_g67.repository.ProductUnitRepository;
import project.be_sep490_g67.repository.ProductAttributeRepository;
import project.be_sep490_g67.repository.StockBatchRepository;
import project.be_sep490_g67.repository.StockMovementRepository;
import project.be_sep490_g67.repository.SupplierPaymentRepository;
import project.be_sep490_g67.repository.SupplierRepository;
import project.be_sep490_g67.repository.UserRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
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
public class ImportOrderService {

    ImportOrderRepository importOrderRepository;
    ImportOrderDetailRepository importOrderDetailRepository;
    ProductRepository productRepository;
    SupplierRepository supplierRepository;
    SupplierPaymentRepository supplierPaymentRepository;
    ProductUnitRepository productUnitRepository;
    ProductAttributeRepository productAttributeRepository;
    ProductMapper productMapper;
    StockBatchRepository stockBatchRepository;
    StockMovementRepository stockMovementRepository;
    UserRepository userRepository;
    ImportReturnService importReturnService;

    @Transactional
    public ImportOrderListItemResponse createImportOrder(CreateImportOrderRequest request) {
        String orderStatus = normalizeCreateOrderStatus(request.getOrderStatus());
        boolean isImported = ImportOrderConstants.ORDER_STATUS_IMPORTED.equals(orderStatus);
        Supplier supplier = resolveSupplier(request.getSupplierId(), isImported);

        List<CreateImportOrderRequest.LineItem> requestLines =
                request.getLines() == null ? List.of() : request.getLines();
        Map<Integer, String> returnMethodOverrides = collectReturnMethodOverrides(request);
        List<Integer> returnLineIds = new ArrayList<>(returnMethodOverrides.keySet());
        if (requestLines.isEmpty() && returnLineIds.isEmpty()) {
            throw new AppException(ErrorCode.IMPORT_ITEMS_EMPTY);
        }

        BigDecimal goodsTotal = BigDecimal.ZERO;
        List<ImportOrderDetail> details = new ArrayList<>();

        for (CreateImportOrderRequest.LineItem line : requestLines) {
            ImportOrderDetail detail = buildDetailFromLine(line);
            details.add(detail);
            goodsTotal = goodsTotal.add(detail.getLineTotal() != null ? detail.getLineTotal() : BigDecimal.ZERO);
        }

        List<ImportReturnDetail> returnLines = importReturnService.requirePendingLinesForSupplier(
                supplier != null ? supplier.getId() : null,
                returnLineIds,
                null,
                returnMethodOverrides);

        BigDecimal discount = request.getDiscountAmount() != null
                ? request.getDiscountAmount()
                : BigDecimal.ZERO;
        if (discount.compareTo(BigDecimal.ZERO) < 0 || discount.compareTo(goodsTotal) > 0) {
            throw new AppException(ErrorCode.INVALID_IMPORT_DISCOUNT);
        }

        MoneySplit money = splitMoney(goodsTotal, discount, importReturnService.returnDeductionOf(returnLines));

        BigDecimal paidAmount = request.getPaidAmount() != null
                ? request.getPaidAmount()
                : BigDecimal.ZERO;
        if (paidAmount.compareTo(BigDecimal.ZERO) < 0 || paidAmount.compareTo(money.amountDue()) > 0) {
            throw new AppException(ErrorCode.INVALID_IMPORT_PAID_AMOUNT);
        }

        ImportOrder order = new ImportOrder();
        order.setSupplier(supplier);
        order.setOrderCode(generateOrderCode());
        order.setDiscountAmount(discount);
        order.setReturnDeductionAmount(money.returnDeduction());
        order.setSupplierRefundAmount(money.refund());
        order.setTotalCost(money.amountDue());
        order.setOrderStatus(orderStatus);
        order.setNote(blankToNull(request.getNote()));
        order.setInvoiceImage(blankToNull(request.getInvoiceImage()));
        order.setReceivedDate(isImported ? LocalDate.now() : null);
        order.setIsRemoved(false);

        ImportOrder saved = importOrderRepository.save(order);

        for (ImportOrderDetail detail : details) {
            detail.setImportOrder(saved);
        }
        if (!details.isEmpty()) {
            importOrderDetailRepository.saveAll(details);
        }

        importReturnService.syncSettledLines(saved, returnLines, isImported);

        BigDecimal recordedPaid = BigDecimal.ZERO;
        if (isImported) {
            createStocksForImportedDetails(saved, details);
            if (paidAmount.compareTo(BigDecimal.ZERO) > 0) {
                createInitialPayment(saved, supplier, paidAmount, request.getPaymentMethod());
                recordedPaid = paidAmount;
            }
        }

        log.info("Created import order {} status={} lines={} amountDue={} paid={}",
                saved.getOrderCode(), orderStatus, details.size(), money.amountDue(), recordedPaid);

        return toListItemResponse(saved, supplier, orderStatus, recordedPaid);
    }

    /**
     * Cập nhật phiếu tạm: lưu tạm tiếp hoặc hoàn thành (IMPORTED).
     * Giữ nguyên orderCode. Chỉ cho phép khi orderStatus hiện tại = DRAFT.
     */
    @Transactional
    public ImportOrderListItemResponse updateImportOrder(Integer orderId, CreateImportOrderRequest request) {
        // Không JOIN FETCH detail — bulk delete sẽ xung đột nếu collection đang được manage
        ImportOrder order = importOrderRepository.findActiveByIdForUpdate(orderId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND_IMPORT_ORDER));

        if (!ImportOrderConstants.ORDER_STATUS_DRAFT.equals(order.getOrderStatus())) {
            throw new AppException(ErrorCode.IMPORT_ORDER_NOT_EDITABLE);
        }

        String orderStatus = normalizeCreateOrderStatus(request.getOrderStatus());
        boolean isImported = ImportOrderConstants.ORDER_STATUS_IMPORTED.equals(orderStatus);
        Supplier supplier = resolveSupplier(request.getSupplierId(), isImported);

        List<CreateImportOrderRequest.LineItem> requestLines =
                request.getLines() == null ? List.of() : request.getLines();
        Map<Integer, String> returnMethodOverrides = collectReturnMethodOverrides(request);
        List<Integer> returnLineIds = new ArrayList<>(returnMethodOverrides.keySet());
        if (requestLines.isEmpty() && returnLineIds.isEmpty()) {
            throw new AppException(ErrorCode.IMPORT_ITEMS_EMPTY);
        }

        BigDecimal goodsTotal = BigDecimal.ZERO;
        List<ImportOrderDetail> details = new ArrayList<>();

        for (CreateImportOrderRequest.LineItem line : requestLines) {
            ImportOrderDetail detail = buildDetailFromLine(line);
            details.add(detail);
            goodsTotal = goodsTotal.add(detail.getLineTotal() != null ? detail.getLineTotal() : BigDecimal.ZERO);
        }

        List<ImportReturnDetail> returnLines = importReturnService.requirePendingLinesForSupplier(
                supplier != null ? supplier.getId() : null,
                returnLineIds,
                order.getId(),
                returnMethodOverrides);

        BigDecimal discount = request.getDiscountAmount() != null
                ? request.getDiscountAmount()
                : BigDecimal.ZERO;
        if (discount.compareTo(BigDecimal.ZERO) < 0 || discount.compareTo(goodsTotal) > 0) {
            throw new AppException(ErrorCode.INVALID_IMPORT_DISCOUNT);
        }

        MoneySplit money = splitMoney(goodsTotal, discount, importReturnService.returnDeductionOf(returnLines));

        BigDecimal paidAmount = request.getPaidAmount() != null
                ? request.getPaidAmount()
                : BigDecimal.ZERO;
        if (paidAmount.compareTo(BigDecimal.ZERO) < 0 || paidAmount.compareTo(money.amountDue()) > 0) {
            throw new AppException(ErrorCode.INVALID_IMPORT_PAID_AMOUNT);
        }

        // Xóa dòng cũ trên DB rồi flush; không đụng collection manage của order
        importOrderDetailRepository.deleteByImportOrderId(order.getId());

        order.setSupplier(supplier);
        order.setDiscountAmount(discount);
        order.setReturnDeductionAmount(money.returnDeduction());
        order.setSupplierRefundAmount(money.refund());
        order.setTotalCost(money.amountDue());
        order.setOrderStatus(orderStatus);
        order.setNote(blankToNull(request.getNote()));
        order.setInvoiceImage(blankToNull(request.getInvoiceImage()));
        order.setReceivedDate(isImported ? LocalDate.now() : null);

        ImportOrder saved = importOrderRepository.save(order);

        for (ImportOrderDetail detail : details) {
            detail.setImportOrder(saved);
        }
        if (!details.isEmpty()) {
            importOrderDetailRepository.saveAll(details);
        }

        importReturnService.syncSettledLines(saved, returnLines, isImported);

        BigDecimal recordedPaid = BigDecimal.ZERO;
        if (isImported) {
            createStocksForImportedDetails(saved, details);
            if (paidAmount.compareTo(BigDecimal.ZERO) > 0) {
                createInitialPayment(saved, supplier, paidAmount, request.getPaymentMethod());
                recordedPaid = paidAmount;
            }
        }

        log.info("Updated import order {} -> status={} lines={} amountDue={} paid={}",
                saved.getOrderCode(), orderStatus, details.size(), money.amountDue(), recordedPaid);

        return toListItemResponse(saved, supplier, orderStatus, recordedPaid);
    }

    /**
     * Hủy phiếu tạm: soft-delete (isRemoved=true). Chỉ cho phép khi orderStatus = DRAFT.
     * Phiếu đã nhập không hủy được vì đã ảnh hưởng tồn kho / công nợ.
     */
    @Transactional
    public void cancelDraftImportOrder(Integer orderId) {
        ImportOrder order = importOrderRepository.findActiveByIdForUpdate(orderId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND_IMPORT_ORDER));

        if (!ImportOrderConstants.ORDER_STATUS_DRAFT.equals(order.getOrderStatus())) {
            throw new AppException(ErrorCode.IMPORT_ORDER_NOT_DELETABLE);
        }

        importReturnService.releaseSettledLines(order.getId());
        order.setIsRemoved(true);
        importOrderRepository.save(order);
        log.info("Cancelled draft import order id={} code={}", orderId, order.getOrderCode());
    }

    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    @Transactional(readOnly = true)
    public PageResponse<ImportOrderListItemResponse> getImportOrderList(
            String search,
            String orderStatusFilter,
            LocalDate fromDate,
            LocalDate toDate,
            int page,
            int size) {

        String safeSearch = (search == null || search.isBlank()) ? "" : search.trim();
        String safeOrderStatus = normalizeOrderStatusFilter(orderStatusFilter);

        List<ImportOrder> orders = importOrderRepository.searchAll(safeSearch, safeOrderStatus);
        if (fromDate != null || toDate != null) {
            LocalDate from = fromDate;
            LocalDate to = toDate;
            if (from != null && to != null && from.isAfter(to)) {
                LocalDate tmp = from;
                from = to;
                to = tmp;
            }
            LocalDate safeFrom = from;
            LocalDate safeTo = to;
            orders = orders.stream()
                    .filter(order -> matchesDateRange(order, safeFrom, safeTo))
                    .toList();
        }
        return toPagedResponse(orders, page, size, null);
    }

    @Transactional(readOnly = true)
    public List<ImportOrderReturnLineResponse> getPendingSupplierReturns(Integer supplierId, Integer importOrderId) {
        return importReturnService.listPendingForSupplier(supplierId, importOrderId);
    }

    /**
     * Lọc ngày: phiếu đã nhập theo receivedDate; phiếu tạm theo ngày tạo (VN).
     */
    private boolean matchesDateRange(ImportOrder order, LocalDate fromDate, LocalDate toDate) {
        LocalDate filterDate = resolveFilterDate(order);
        if (filterDate == null) {
            return false;
        }
        if (fromDate != null && filterDate.isBefore(fromDate)) {
            return false;
        }
        if (toDate != null && filterDate.isAfter(toDate)) {
            return false;
        }
        return true;
    }

    private LocalDate resolveFilterDate(ImportOrder order) {
        if (order.getReceivedDate() != null) {
            return order.getReceivedDate();
        }
        if (order.getCreatedAt() == null) {
            return null;
        }
        return order.getCreatedAt().atZone(VN_ZONE).toLocalDate();
    }

    @Transactional(readOnly = true)
    public PageResponse<ImportOrderListItemResponse> getImportHistory(
            Integer supplierId, String search, String statusFilter, int page, int size) {


        if (!supplierRepository.existsByIdAndIsRemovedFalse(supplierId)) {
            throw new AppException(ErrorCode.NOT_FOUND_SUPPLIER);
        }
        String safeSearch = (search == null || search.isBlank()) ? "" : search.trim();
        String safePaymentStatus = (statusFilter == null || statusFilter.isBlank())
                ? "ALL"
                : statusFilter.toUpperCase();

        List<ImportOrder> orders = importOrderRepository.searchBySupplier(supplierId, safeSearch);
        return toPagedResponse(orders, page, size, safePaymentStatus);
    }

    @Transactional(readOnly = true)
    public ImportOrderDetailResponse getImportOrderDetail(Integer orderId) {
        ImportOrder order = importOrderRepository.findDetailById(orderId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND_IMPORT_ORDER));

        BigDecimal paid = supplierPaymentRepository.sumPaidAmountByImportOrder(orderId);
        boolean isImported = ImportOrderConstants.ORDER_STATUS_IMPORTED.equals(order.getOrderStatus());
        BigDecimal totalCost = order.getTotalCost() != null ? order.getTotalCost() : BigDecimal.ZERO;
        BigDecimal safePaid = isImported ? paid : BigDecimal.ZERO;
        String paymentStatus = isImported
                ? resolvePaymentStatus(totalCost, safePaid)
                : ImportOrderConstants.PAYMENT_STATUS_DONE;

        List<ImportOrderDetail> details = order.getImportOrderDetails().stream()
                .sorted(Comparator.comparing(ImportOrderDetail::getId, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();
        Map<Integer, List<ProductAttributeResponse>> attributesByProduct = loadAttributesByProductIds(
                details.stream()
                        .map(detail -> detail.getProduct() != null ? detail.getProduct().getId() : null)
                        .filter(Objects::nonNull)
                        .distinct()
                        .toList());

        List<ImportOrderItemResponse> items = details.stream()
                .map(detail -> {
                    Product product = detail.getProduct();
                    Integer productId = product != null ? product.getId() : null;
                    List<ImportOrderItemResponse.ProductUnitOption> unitOptions =
                            productId != null ? loadProductUnitOptions(productId) : List.of();
                    BigDecimal costPrice = product != null && product.getCostPrice() != null
                            ? product.getCostPrice()
                            : BigDecimal.ZERO;
                    BigDecimal lastCostPerBase = productId != null
                            ? stockBatchRepository
                                .findFirstByProduct_IdAndIsRemovedFalseOrderByReceivedDateDescIdDesc(productId)
                                .map(StockBatch::getCostPerUnit)
                                .filter(cost -> cost != null)
                                .orElse(costPrice)
                            : costPrice;
                    Product parent = product != null ? product.getParent() : null;
                    return ImportOrderItemResponse.builder()
                            .id(detail.getId())
                            .productId(productId)
                            .productCode(product != null ? product.getBarcode() : null)
                            .productName(product != null ? product.getName() : null)
                            .parentId(parent != null ? parent.getId() : null)
                            .parentName(parent != null ? parent.getName() : null)
                            .attributes(productId != null
                                    ? attributesByProduct.getOrDefault(productId, List.of())
                                    : List.of())
                            .productUnitId(detail.getProductUnit() != null
                                    ? detail.getProductUnit().getId()
                                    : null)
                            .unitName(detail.getProductUnit() != null
                                    ? detail.getProductUnit().getName()
                                    : null)
                            .productUnits(unitOptions)
                            .quantity(detail.getQuantity())
                            .costPerUnit(detail.getCostPerUnit())
                            .lastCostPerBase(lastCostPerBase)
                            .sellingPrice(product != null ? product.getSellingPrice() : null)
                            .lineTotal(detail.getLineTotal())
                            .expiryDate(detail.getExpiryDate())
                            .note(detail.getNote())
                            .isPromotion(Boolean.TRUE.equals(detail.getIsPromotion()))
                            .build();
                })
                .toList();

        BigDecimal goodsTotal = items.stream()
                .map(item -> item.getLineTotal() != null ? item.getLineTotal() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Supplier supplier = order.getSupplier();

        return ImportOrderDetailResponse.builder()
                .id(order.getId())
                .orderCode(order.getOrderCode())
                .receivedDate(order.getReceivedDate())
                .receivedAt(order.getCreatedAt())
                .createdByName(resolveCreatedByName(order.getCreatedBy()))
                .supplierId(supplier != null ? supplier.getId() : null)
                .supplierCode(supplier != null ? supplier.getSupplierCode() : null)
                .supplierName(supplier != null ? supplier.getName() : null)
                .orderStatus(order.getOrderStatus())
                .status(paymentStatus)
                .goodsTotal(goodsTotal)
                .discountAmount(order.getDiscountAmount() != null ? order.getDiscountAmount() : BigDecimal.ZERO)
                .returnDeductionAmount(order.getReturnDeductionAmount() != null
                        ? order.getReturnDeductionAmount()
                        : BigDecimal.ZERO)
                .supplierRefundAmount(order.getSupplierRefundAmount() != null
                        ? order.getSupplierRefundAmount()
                        : BigDecimal.ZERO)
                .totalCost(totalCost)
                .paidAmount(safePaid)
                .remainingDebt(isImported ? totalCost.subtract(safePaid).max(BigDecimal.ZERO) : BigDecimal.ZERO)
                .note(order.getNote())
                .invoiceImage(order.getInvoiceImage())
                .items(items)
                .returnLines(importReturnService.listSettledForImportOrder(order.getId()))
                .build();
    }
    /**
     * Tạo nhiều phiếu DRAFT từ màn Gợi ý nhập hàng. Gom theo supplierId trên từng dòng.
     * Không tạo StockBatch / không tăng tồn.
     */
    @Transactional
    public List<ImportOrderResponseDTO> createOrdersFromSuggest(CreateDraftFromSuggestRequest request) {
        if (request == null || request.getLines() == null || request.getLines().isEmpty()) {
            throw new AppException(ErrorCode.IMPORT_ORDER_LINES_REQUIRED);
        }

        Map<Integer, List<CreateDraftFromSuggestRequest.OrderLine>> bySupplier = new LinkedHashMap<>();
        for (CreateDraftFromSuggestRequest.OrderLine line : request.getLines()) {
            if (line.getSupplierId() == null || line.getProductId() == null || line.getQuantity() == null
                    || line.getQuantity() <= 0) {
                throw new AppException(ErrorCode.IMPORT_ORDER_LINE_INVALID);
            }
            bySupplier.computeIfAbsent(line.getSupplierId(), k -> new ArrayList<>()).add(line);
        }

        if (bySupplier.isEmpty()) {
            throw new AppException(ErrorCode.IMPORT_ORDER_LINES_REQUIRED);
        }

        List<ImportOrderResponseDTO> created = new ArrayList<>();
        LocalDate today = LocalDate.now();
        int nextOrderSeq = nextOrderSequence(today);

        for (Map.Entry<Integer, List<CreateDraftFromSuggestRequest.OrderLine>> entry : bySupplier.entrySet()) {
            Supplier supplier = supplierRepository.findByIdAndIsRemovedFalse(entry.getKey())
                    .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND_SUPPLIER));

            ImportOrder order = new ImportOrder();
            order.setSupplier(supplier);
            order.setOrderCode(ImportOrderConstants.formatOrderCode(today, nextOrderSeq++));
            order.setReceivedDate(null);
            order.setOrderStatus(ImportOrderConstants.ORDER_STATUS_DRAFT);
            order.setNote("Tạo từ màn gợi ý nhập hàng");
            order.setDiscountAmount(BigDecimal.ZERO);
            order.setTotalCost(BigDecimal.ZERO);
            order.setIsRemoved(false);
            order = importOrderRepository.save(order);

            BigDecimal total = BigDecimal.ZERO;
            List<ImportOrderResponseDTO.Line> responseLines = new ArrayList<>();
            boolean urgent = false;

            for (CreateDraftFromSuggestRequest.OrderLine lineReq : entry.getValue()) {
                Product product = productRepository.findByIdAndIsRemovedFalse(lineReq.getProductId())
                        .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_NOT_FOUND));

                BigDecimal cost = lineReq.getCostPerUnit() != null
                        ? lineReq.getCostPerUnit()
                        : (product.getCostPrice() != null ? product.getCostPrice() : BigDecimal.ZERO);
                BigDecimal lineTotal = cost.multiply(BigDecimal.valueOf(lineReq.getQuantity()))
                        .setScale(2, RoundingMode.HALF_UP);

                ImportOrderDetail detail = new ImportOrderDetail();
                detail.setImportOrder(order);
                detail.setProduct(product);
                detail.setQuantity(lineReq.getQuantity());
                detail.setCostPerUnit(cost);
                detail.setLineTotal(lineTotal);
                detail.setIsRemoved(false);
                importOrderDetailRepository.save(detail);

                total = total.add(lineTotal);
                if (lineReq.getOrderDate() == null
                        || !lineReq.getOrderDate().isAfter(LocalDate.now())) {
                    urgent = true;
                }

                responseLines.add(ImportOrderResponseDTO.Line.builder()
                        .productId(product.getId())
                        .productName(product.getName())
                        .quantity(lineReq.getQuantity())
                        .costPerUnit(cost)
                        .lineTotal(lineTotal)
                        .build());
            }

            order.setTotalCost(total);
            importOrderRepository.save(order);

            created.add(ImportOrderResponseDTO.builder()
                    .id(order.getId())
                    .orderCode(order.getOrderCode())
                    .supplierId(supplier.getId())
                    .supplierName(supplier.getName())
                    .totalCost(total)
                    .urgent(urgent)
                    .lines(responseLines)
                    .build());
        }

        log.info("Created {} DRAFT import order(s) from suggest", created.size());
        return created;
    }

    private PageResponse<ImportOrderListItemResponse> toPagedResponse(
            List<ImportOrder> orders, int page, int size, String paymentStatusFilter) {

        Map<Integer, BigDecimal> paidPerOrder = supplierPaymentRepository.sumPaidAmountGroupByImportOrder()
                .stream()
                .collect(Collectors.toMap(row -> (Integer) row[0], row -> (BigDecimal) row[1]));

        Map<Integer, String> nameByUserId = resolveCreatedByNames(orders);

        List<ImportOrderListItemResponse> allItems = orders.stream()
                .map(order -> toListItem(order, paidPerOrder, nameByUserId))
                .toList();

        List<ImportOrderListItemResponse> filtered = filterByPaymentStatus(allItems, paymentStatusFilter);

        int totalElements = filtered.size();
        int totalPages = Math.max(1, (int) Math.ceil((double) totalElements / size));
        int safePage = Math.min(Math.max(page, 0), totalPages - 1);
        int from = safePage * size;
        int to = Math.min(from + size, totalElements);
        List<ImportOrderListItemResponse> pageContent = totalElements == 0 ? List.of() : filtered.subList(from, to);

        return PageResponse.<ImportOrderListItemResponse>builder()
                .content(pageContent)
                .page(safePage)
                .size(size)
                .totalElements(totalElements)
                .totalPages(totalPages)
                .build();
    }

    private List<ImportOrderListItemResponse> filterByPaymentStatus(
            List<ImportOrderListItemResponse> items, String paymentStatusFilter) {
        if (paymentStatusFilter == null || paymentStatusFilter.isBlank() || "ALL".equals(paymentStatusFilter)) {
            return items;
        }
        return switch (paymentStatusFilter) {
            case ImportOrderConstants.PAYMENT_STATUS_DEBT -> items.stream()
                    .filter(item -> ImportOrderConstants.PAYMENT_STATUS_DEBT.equals(item.getStatus()))
                    .toList();
            case ImportOrderConstants.PAYMENT_STATUS_DONE -> items.stream()
                    .filter(item -> ImportOrderConstants.PAYMENT_STATUS_DONE.equals(item.getStatus()))
                    .toList();
            default -> items;
        };
    }

    private ImportOrderListItemResponse toListItem(
            ImportOrder order, Map<Integer, BigDecimal> paidPerOrder, Map<Integer, String> nameByUserId) {

        BigDecimal paid = paidPerOrder.getOrDefault(order.getId(), BigDecimal.ZERO);
        BigDecimal totalCost = order.getTotalCost() != null ? order.getTotalCost() : BigDecimal.ZERO;

        Supplier supplier = order.getSupplier();
        String orderStatus = order.getOrderStatus();
        boolean isImported = ImportOrderConstants.ORDER_STATUS_IMPORTED.equals(orderStatus);

        // Chỉ đơn đã nhập mới tính nợ; DRAFT / chưa gán status → 0đ
        BigDecimal remainingDebt = isImported
                ? totalCost.subtract(paid).max(BigDecimal.ZERO)
                : BigDecimal.ZERO;
        String paymentStatus = isImported
                ? resolvePaymentStatus(order.getTotalCost(), paid)
                : ImportOrderConstants.PAYMENT_STATUS_DONE;

        return ImportOrderListItemResponse.builder()
                .id(order.getId())
                .orderCode(order.getOrderCode())
                .receivedDate(order.getReceivedDate())
                .receivedAt(order.getCreatedAt())
                .createdByName(nameByUserId.get(order.getCreatedBy()))
                .totalCost(order.getTotalCost())
                .supplierId(supplier != null ? supplier.getId() : null)
                .supplierCode(supplier != null ? supplier.getSupplierCode() : null)
                .supplierName(supplier != null ? supplier.getName() : null)
                .orderStatus(orderStatus)
                .status(paymentStatus)
                .paidAmount(isImported ? paid : BigDecimal.ZERO)
                .remainingDebt(remainingDebt)
                .build();
    }

    private String normalizeOrderStatusFilter(String orderStatusFilter) {
        if (orderStatusFilter == null || orderStatusFilter.isBlank()) {
            return "ALL";
        }
        String normalized = orderStatusFilter.trim().toUpperCase();
        if ("ALL".equals(normalized)
                || ImportOrderConstants.ORDER_STATUS_DRAFT.equals(normalized)
                || ImportOrderConstants.ORDER_STATUS_IMPORTED.equals(normalized)) {
            return normalized;
        }
        return "ALL";
    }

    private String resolvePaymentStatus(BigDecimal totalCost, BigDecimal paid) {
        BigDecimal safeTotalCost = totalCost != null ? totalCost : BigDecimal.ZERO;
        BigDecimal safePaid = paid != null ? paid : BigDecimal.ZERO;
        return safeTotalCost.subtract(safePaid).compareTo(BigDecimal.ZERO) > 0
                ? ImportOrderConstants.PAYMENT_STATUS_DEBT
                : ImportOrderConstants.PAYMENT_STATUS_DONE;
    }

    private Map<Integer, String> resolveCreatedByNames(List<ImportOrder> orders) {
        List<Integer> userIds = orders.stream()
                .map(ImportOrder::getCreatedBy)
                .filter(Objects::nonNull)
                .distinct()
                .toList();

        if (userIds.isEmpty()) {
            return Map.of();
        }

        return userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, User::getFullName));
    }

    private String resolveCreatedByName(Integer userId) {
        if (userId == null) {
            return null;
        }
        return userRepository.findById(userId).map(User::getFullName).orElse(null);
    }

    private ImportOrderListItemResponse toListItemResponse(
            ImportOrder order, Supplier supplier, String orderStatus, BigDecimal recordedPaid) {
        boolean isImported = ImportOrderConstants.ORDER_STATUS_IMPORTED.equals(orderStatus);
        BigDecimal amountDue = order.getTotalCost() != null ? order.getTotalCost() : BigDecimal.ZERO;
        BigDecimal paid = recordedPaid != null ? recordedPaid : BigDecimal.ZERO;
        BigDecimal remainingDebt = isImported
                ? amountDue.subtract(paid).max(BigDecimal.ZERO)
                : BigDecimal.ZERO;
        String paymentStatus = isImported
                ? resolvePaymentStatus(amountDue, paid)
                : ImportOrderConstants.PAYMENT_STATUS_DONE;

        return ImportOrderListItemResponse.builder()
                .id(order.getId())
                .orderCode(order.getOrderCode())
                .receivedDate(order.getReceivedDate())
                .receivedAt(order.getCreatedAt())
                .createdByName(resolveCreatedByName(order.getCreatedBy()))
                .totalCost(order.getTotalCost())
                .supplierId(supplier != null ? supplier.getId() : null)
                .supplierCode(supplier != null ? supplier.getSupplierCode() : null)
                .supplierName(supplier != null ? supplier.getName() : null)
                .orderStatus(orderStatus)
                .status(paymentStatus)
                .paidAmount(isImported ? paid : BigDecimal.ZERO)
                .remainingDebt(remainingDebt)
                .build();
    }

    private Supplier resolveSupplier(Integer supplierId, boolean required) {
        if (supplierId == null || supplierId <= 0) {
            if (required) {
                throw new AppException(ErrorCode.SUPPLIER_REQUIRED_FOR_IMPORT);
            }
            return null;
        }
        return supplierRepository.findByIdAndIsRemovedFalse(supplierId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND_SUPPLIER));
    }

    private String normalizeCreateOrderStatus(String orderStatus) {
        if (orderStatus == null || orderStatus.isBlank()) {
            throw new AppException(ErrorCode.INVALID_IMPORT_ORDER_STATUS);
        }
        String normalized = orderStatus.trim().toUpperCase();
        if (!ImportOrderConstants.ORDER_STATUS_DRAFT.equals(normalized)
                && !ImportOrderConstants.ORDER_STATUS_IMPORTED.equals(normalized)) {
            throw new AppException(ErrorCode.INVALID_IMPORT_ORDER_STATUS);
        }
        return normalized;
    }

    private record MoneySplit(BigDecimal returnDeduction, BigDecimal amountDue, BigDecimal refund) {
    }

    private MoneySplit splitMoney(BigDecimal goodsTotal, BigDecimal discount, BigDecimal returnDeduction) {
        BigDecimal safeGoods = goodsTotal != null ? goodsTotal : BigDecimal.ZERO;
        BigDecimal safeDiscount = discount != null ? discount : BigDecimal.ZERO;
        BigDecimal safeReturn = returnDeduction != null ? returnDeduction : BigDecimal.ZERO;
        BigDecimal net = safeGoods.subtract(safeDiscount).subtract(safeReturn);
        if (net.compareTo(BigDecimal.ZERO) >= 0) {
            return new MoneySplit(safeReturn, net, BigDecimal.ZERO);
        }
        return new MoneySplit(safeReturn, BigDecimal.ZERO, net.negate());
    }

    /**
     * Map dòng request → detail.
     * Hàng KM (isPromotion): lineTotal = 0 (không tính nợ lúc nhập), vẫn giữ costPerUnit, vẫn nhập kho.
     */
    private ImportOrderDetail buildDetailFromLine(CreateImportOrderRequest.LineItem line) {
        Product product = productRepository.findById(line.getProductId())
                .filter(p -> !Boolean.TRUE.equals(p.getIsRemoved()))
                .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_NOT_FOUND));
        assertSellableProduct(product);

        ProductUnit productUnit = resolveProductUnit(product, line.getProductUnitId());

        boolean isPromotion = Boolean.TRUE.equals(line.getIsPromotion());
        BigDecimal cost = line.getCostPerUnit() != null ? line.getCostPerUnit() : BigDecimal.ZERO;
        BigDecimal lineTotal = isPromotion
                ? BigDecimal.ZERO
                : cost.multiply(BigDecimal.valueOf(line.getQuantity()));

        ImportOrderDetail detail = new ImportOrderDetail();
        detail.setProduct(product);
        detail.setProductUnit(productUnit);
        detail.setQuantity(line.getQuantity());
        detail.setCostPerUnit(cost);
        detail.setLineTotal(lineTotal);
        detail.setExpiryDate(line.getExpiryDate());
        detail.setNote(blankToNull(line.getNote()));
        detail.setIsPromotion(isPromotion);
        detail.setIsRemoved(false);
        return detail;
    }

    private void assertSellableProduct(Product product) {
        if (product.getId() != null
                && productRepository.existsByParent_IdAndIsRemovedFalse(product.getId())) {
            throw new AppException(ErrorCode.PARENT_PRODUCT_NOT_SELLABLE);
        }
    }

    private Map<Integer, List<ProductAttributeResponse>> loadAttributesByProductIds(List<Integer> productIds) {
        if (productIds == null || productIds.isEmpty()) {
            return Map.of();
        }
        return productAttributeRepository.findByProduct_IdInAndIsRemovedFalse(productIds).stream()
                .collect(Collectors.groupingBy(
                        item -> item.getProduct().getId(),
                        Collectors.mapping(productMapper::toAttributeResponse, Collectors.toList())));
    }

    private ProductUnit resolveProductUnit(Product product, Integer productUnitId) {
        if (productUnitId != null) {
            return productUnitRepository.findByIdAndProduct_IdAndIsRemovedFalse(productUnitId, product.getId())
                    .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_UNIT_NOT_FOUND));
        }
        return productUnitRepository.findByProduct_IdAndIsRemovedFalseOrderByUnitBaseAsc(product.getId())
                .stream()
                .filter(unit -> unit.getUnitBase() != null
                        && unit.getUnitBase().compareTo(BigDecimal.ONE) == 0)
                .findFirst()
                .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_UNIT_NOT_FOUND));
    }

    private List<ImportOrderItemResponse.ProductUnitOption> loadProductUnitOptions(Integer productId) {
        return productUnitRepository.findByProduct_IdAndIsRemovedFalseOrderByUnitBaseAsc(productId)
                .stream()
                .map(unit -> ImportOrderItemResponse.ProductUnitOption.builder()
                        .id(unit.getId())
                        .name(unit.getName())
                        .unitBase(unit.getUnitBase())
                        .build())
                .toList();
    }

    private BigDecimal resolveUnitBase(ProductUnit productUnit) {
        if (productUnit == null || productUnit.getUnitBase() == null) {
            return BigDecimal.ONE;
        }
        return productUnit.getUnitBase().compareTo(BigDecimal.ZERO) > 0
                ? productUnit.getUnitBase()
                : BigDecimal.ONE;
    }

    /** Quy số lượng + giá về đơn vị cơ bản trước khi ghi StockBatch. */
    private int toBaseQuantity(int quantity, ProductUnit productUnit) {
        BigDecimal baseQty = BigDecimal.valueOf(quantity).multiply(resolveUnitBase(productUnit));
        return baseQty.setScale(0, RoundingMode.HALF_UP).intValue();
    }

    private BigDecimal toBaseCostPerUnit(BigDecimal costPerUnit, ProductUnit productUnit) {
        BigDecimal safeCost = costPerUnit != null ? costPerUnit : BigDecimal.ZERO;
        return safeCost.divide(resolveUnitBase(productUnit), 2, RoundingMode.HALF_UP);
    }

    /**
     * Mỗi dòng hàng = 1 lô: L + ddMMyy + "-" + STT trong ngày (vd L210826-01).
     */
    private void createStocksForImportedDetails(ImportOrder order, List<ImportOrderDetail> details) {
        LocalDate date = order.getReceivedDate() != null ? order.getReceivedDate() : LocalDate.now();
        int nextSeq = nextBatchSequence(date);
        for (ImportOrderDetail detail : details) {
            createStockForDetail(order, detail, ImportOrderConstants.formatBatchCode(date, nextSeq++));
        }
    }

    private int nextBatchSequence(LocalDate date) {
        Integer max = stockBatchRepository.findMaxBatchSequenceByDayPrefix(
                ImportOrderConstants.batchDayPrefix(date));
        return (max != null ? max : 0) + 1;
    }

    private void createStockForDetail(ImportOrder order, ImportOrderDetail detail, String batchCode) {
        ProductUnit productUnit = detail.getProductUnit();
        int quantityIn = toBaseQuantity(detail.getQuantity(), productUnit);
        BigDecimal costPerUnit = toBaseCostPerUnit(detail.getCostPerUnit(), productUnit);

        StockBatch batch = new StockBatch();
        batch.setProduct(detail.getProduct());
        batch.setImportOrder(order);
        batch.setBatchCode(batchCode);
        batch.setCostPerUnit(costPerUnit);
        batch.setQuantityIn(quantityIn);
        batch.setReceivedDate(order.getReceivedDate() != null ? order.getReceivedDate() : LocalDate.now());
        batch.setExpiryDate(detail.getExpiryDate());
        batch.setBatchNote(detail.getNote());
        batch.setIsRemoved(false);
        StockBatch savedBatch = stockBatchRepository.save(batch);

        StockMovement movement = StockMovement.builder()
                .stockBatch(savedBatch)
                .batchLocation(null)
                .quantityDelta(quantityIn)
                .stockAfter(quantityIn)
                .movementType("IMPORT")
                .referenceType("IMPORT_ORDER")
                .referenceId(order.getId())
                .build();
        movement.setIsRemoved(false);
        stockMovementRepository.save(movement);

        // Cập nhật giá vốn master theo giá base vừa nhập (lần sau search gợi ý đúng hơn)
        Product product = detail.getProduct();
        if (product != null && costPerUnit != null) {
            product.setCostPrice(costPerUnit);
            productRepository.save(product);
        }
    }

    private void createInitialPayment(
            ImportOrder order, Supplier supplier, BigDecimal amount, String paymentMethod) {
        createInitialPayment(order, supplier, amount, paymentMethod, null);
    }

    private void createInitialPayment(
            ImportOrder order, Supplier supplier, BigDecimal amount, String paymentMethod, String note) {
        SupplierPayment payment = new SupplierPayment();
        payment.setPaymentCode(generatePaymentCode());
        payment.setSupplier(supplier);
        payment.setImportOrder(order);
        payment.setAmount(amount);
        payment.setPaymentMethod(paymentMethod == null || paymentMethod.isBlank() ? "CASH" : paymentMethod.trim());
        payment.setPaymentDate(LocalDateTime.now());
        payment.setNote(blankToNull(note));
        payment.setIsRemoved(false);
        supplierPaymentRepository.save(payment);
    }

    /** Mã phiếu: NH + ddMMyy + "-" + STT trong ngày (vd NH210826-01). */
    private String generateOrderCode() {
        LocalDate date = LocalDate.now();
        return ImportOrderConstants.formatOrderCode(date, nextOrderSequence(date));
    }

    private int nextOrderSequence(LocalDate date) {
        importOrderRepository.flush();
        Integer max = importOrderRepository.findMaxOrderSequenceByDayPrefix(
                ImportOrderConstants.orderDayPrefix(date));
        return (max != null ? max : 0) + 1;
    }

    private String generatePaymentCode() {
        String prefix = ImportOrderConstants.PAYMENT_CODE_PREFIX;
        int seqLength = ImportOrderConstants.PAYMENT_CODE_SEQ_LENGTH;

        int nextSeq = supplierPaymentRepository.findLatestTtnPaymentCode()
                .map(code -> Integer.parseInt(code.substring(prefix.length())) + 1)
                .orElse(0);

        if (nextSeq > 999_999) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }

        return prefix + String.format("%0" + seqLength + "d", nextSeq);
    }

    private Map<Integer, String> collectReturnMethodOverrides(CreateImportOrderRequest request) {
        Map<Integer, String> methods = new LinkedHashMap<>();
        if (request.getReturnLines() != null) {
            for (CreateImportOrderRequest.ReturnLineItem item : request.getReturnLines()) {
                if (item != null && item.getDetailId() != null && item.getDetailId() > 0) {
                    methods.put(item.getDetailId(), item.getMethod());
                }
            }
        }
        if (request.getReturnLineIds() != null) {
            for (Integer id : request.getReturnLineIds()) {
                if (id != null && id > 0) {
                    methods.putIfAbsent(id, null);
                }
            }
        }
        return methods;
    }

    private String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
