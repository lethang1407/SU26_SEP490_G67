package project.be_sep490_g67.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.be_sep490_g67.constants.WarehouseReportConstants;
import project.be_sep490_g67.dto.response.WarehouseIoLineDTO;
import project.be_sep490_g67.dto.response.WarehouseIoProductDTO;
import project.be_sep490_g67.dto.response.WarehouseIoReportDTO;
import project.be_sep490_g67.entity.*;
import project.be_sep490_g67.repository.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class WarehouseReportService {

    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter DT_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    StockMovementRepository stockMovementRepository;
    ImportOrderRepository importOrderRepository;
    SalesOrderRepository salesOrderRepository;
    ReturnOrderRepository returnOrderRepository;
    ImportReturnRepository importReturnRepository;
    StockBatchRepository stockBatchRepository;
    ProductUnitRepository productUnitRepository;
    ProductRepository productRepository;

    @Transactional(readOnly = true)
    public WarehouseIoReportDTO getInventoryIo(
            LocalDate from,
            LocalDate to,
            List<Integer> productIds,
            List<String> types,
            int page,
            int size
    ) {
        List<String> movementTypes = WarehouseReportConstants.resolveMovementTypes(types);
        InstantRange range = resolveRange(from, to);
        boolean productIdsEmpty = productIds == null || productIds.isEmpty();
        Collection<Integer> productIdFilter = productIdsEmpty ? List.of(-1) : productIds;

        Map<Integer, OpeningState> openings = buildOpenings(range.from(), productIdFilter, productIdsEmpty);

        List<StockMovement> periodMovements = stockMovementRepository.findReportMovements(
                range.from(),
                range.toExclusive(),
                movementTypes,
                productIdFilter,
                productIdsEmpty
        );

        DocumentLookup docs = loadDocumentCodes(periodMovements);

        LinkedHashSet<Integer> productOrder = new LinkedHashSet<>();
        if (!productIdsEmpty) {
            productOrder.addAll(productIds);
        }
        openings.keySet().forEach(productOrder::add);
        for (StockMovement sm : periodMovements) {
            productOrder.add(sm.getStockBatch().getProduct().getId());
        }

        Map<Integer, Product> productMeta = loadProducts(productOrder);
        Map<Integer, String> unitNames = loadUnitNames(productOrder);

        LinkedHashMap<Integer, ProductAgg> byProduct = new LinkedHashMap<>();
        for (Integer productId : productOrder) {
            Product product = productMeta.get(productId);
            if (product == null) {
                continue;
            }
            OpeningState opening = openings.getOrDefault(productId, OpeningState.zero());
            byProduct.put(productId, ProductAgg.start(product, opening, unitNames.getOrDefault(productId, "sp")));
        }

        for (StockMovement sm : periodMovements) {
            Integer productId = sm.getStockBatch().getProduct().getId();
            ProductAgg agg = byProduct.get(productId);
            if (agg == null) {
                Product product = sm.getStockBatch().getProduct();
                agg = ProductAgg.start(product, openings.getOrDefault(productId, OpeningState.zero()),
                        unitNames.getOrDefault(productId, "sp"));
                byProduct.put(productId, agg);
            }
            agg.addLine(sm, docs);
        }

        List<WarehouseIoProductDTO> allProducts = byProduct.values().stream()
                .filter(agg -> agg.hasActivity() || !productIdsEmpty)
                .map(ProductAgg::toDto)
                .toList();

        int safeSize = Math.max(1, size);
        int safePage = Math.max(0, page);
        int totalProducts = allProducts.size();
        int totalPages = Math.max(1, (int) Math.ceil(totalProducts / (double) safeSize));
        if (safePage >= totalPages) {
            safePage = Math.max(0, totalPages - 1);
        }
        int fromIdx = Math.min(safePage * safeSize, totalProducts);
        int toIdx = Math.min(fromIdx + safeSize, totalProducts);
        List<WarehouseIoProductDTO> pageItems = fromIdx >= totalProducts
                ? List.of()
                : allProducts.subList(fromIdx, toIdx);

        Totals totals = Totals.from(allProducts);

        return WarehouseIoReportDTO.builder()
                .from(from)
                .to(to)
                .periodLabel(buildPeriodLabel(from, to))
                .openingQty(totals.openingQty)
                .openingAmount(totals.openingAmount)
                .importQty(totals.importQty)
                .importAmount(totals.importAmount)
                .exportQty(totals.exportQty)
                .exportAmount(totals.exportAmount)
                .closingQty(totals.closingQty)
                .closingAmount(totals.closingAmount)
                .totalProducts(totalProducts)
                .page(safePage)
                .size(safeSize)
                .totalPages(totalPages)
                .products(pageItems)
                .build();
    }

    @Transactional(readOnly = true)
    public byte[] exportInventoryIoCsv(
            LocalDate from,
            LocalDate to,
            List<Integer> productIds,
            List<String> types
    ) {
        WarehouseIoReportDTO report = getInventoryIo(from, to, productIds, types, 0, Integer.MAX_VALUE);
        StringBuilder sb = new StringBuilder();
        sb.append('\uFEFF');
        sb.append("SKU,Ten hang hoa,DVT,Ngay gio,Chung tu,Loai,Dien giai,")
                .append("Ton dau SL,Ton dau Tien,Nhap SL,Nhap Tien,Xuat SL,Xuat Tien,Ton cuoi SL,Ton cuoi Tien\n");

        for (WarehouseIoProductDTO product : report.getProducts()) {
            if (product.getLines() == null || product.getLines().isEmpty()) {
                appendCsvRow(sb, product, null);
                continue;
            }
            for (WarehouseIoLineDTO line : product.getLines()) {
                appendCsvRow(sb, product, line);
            }
        }
        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    private void appendCsvRow(StringBuilder sb, WarehouseIoProductDTO product, WarehouseIoLineDTO line) {
        sb.append(csv(product.getSku())).append(',')
                .append(csv(product.getProductName())).append(',')
                .append(csv(product.getUnitName())).append(',');
        if (line == null) {
            sb.append(",,,,")
                    .append(nullToZero(product.getOpeningQty())).append(',')
                    .append(money(product.getOpeningAmount())).append(',')
                    .append(nullToZero(product.getImportQty())).append(',')
                    .append(money(product.getImportAmount())).append(',')
                    .append(nullToZero(product.getExportQty())).append(',')
                    .append(money(product.getExportAmount())).append(',')
                    .append(nullToZero(product.getClosingQty())).append(',')
                    .append(money(product.getClosingAmount())).append('\n');
            return;
        }
        sb.append(csv(formatInstant(line.getOccurredAt()))).append(',')
                .append(csv(line.getDocumentCode())).append(',')
                .append(csv(line.getDirection())).append(',')
                .append(csv(line.getDescription())).append(',')
                .append(nullToZero(line.getOpeningQty())).append(',')
                .append(money(line.getOpeningAmount())).append(',')
                .append(nullToZero(line.getImportQty())).append(',')
                .append(money(line.getImportAmount())).append(',')
                .append(nullToZero(line.getExportQty())).append(',')
                .append(money(line.getExportAmount())).append(',')
                .append(nullToZero(line.getClosingQty())).append(',')
                .append(money(line.getClosingAmount())).append('\n');
    }

    private Map<Integer, OpeningState> buildOpenings(
            Instant fromInstant,
            Collection<Integer> productIds,
            boolean productIdsEmpty
    ) {
        Map<Integer, OpeningState> map = new HashMap<>();
        if (fromInstant == null) {
            return map;
        }
        List<StockMovement> before = stockMovementRepository.findMovementsBefore(
                fromInstant,
                WarehouseReportConstants.ALL_REPORT_TYPES,
                productIds,
                productIdsEmpty
        );
        for (StockMovement sm : before) {
            Integer productId = sm.getStockBatch().getProduct().getId();
            OpeningState state = map.computeIfAbsent(productId, id -> OpeningState.zero());
            int delta = sm.getQuantityDelta() == null ? 0 : sm.getQuantityDelta();
            BigDecimal cost = costOf(sm);
            state.qty += delta;
            state.amount = state.amount.add(cost.multiply(BigDecimal.valueOf(delta)));
        }
        return map;
    }

    private Map<Integer, Product> loadProducts(Collection<Integer> productIds) {
        if (productIds == null || productIds.isEmpty()) {
            return Map.of();
        }
        Map<Integer, Product> map = new HashMap<>();
        productRepository.findAllById(productIds).forEach(p -> {
            if (p.getIsRemoved() == null || !p.getIsRemoved()) {
                map.put(p.getId(), p);
            }
        });
        return map;
    }

    private DocumentLookup loadDocumentCodes(List<StockMovement> movements) {
        Map<String, Set<Integer>> byType = new HashMap<>();
        for (StockMovement sm : movements) {
            if (sm.getReferenceType() == null || sm.getReferenceId() == null) {
                continue;
            }
            byType.computeIfAbsent(sm.getReferenceType(), k -> new HashSet<>()).add(sm.getReferenceId());
        }

        Map<String, String> codes = new HashMap<>();
        Map<String, DocLink> links = new HashMap<>();

        Set<Integer> importIds = byType.getOrDefault("IMPORT_ORDER", Set.of());
        if (!importIds.isEmpty()) {
            importOrderRepository.findAllById(importIds).forEach(o -> {
                codes.put(key("IMPORT_ORDER", o.getId()), o.getOrderCode());
                links.put(key("IMPORT_ORDER", o.getId()), new DocLink("IMPORT", o.getId()));
            });
        }

        Set<Integer> salesIds = byType.getOrDefault("SALES_ORDER", Set.of());
        if (!salesIds.isEmpty()) {
            salesOrderRepository.findAllById(salesIds).forEach(o -> {
                codes.put(key("SALES_ORDER", o.getId()), o.getOrderCode());
                links.put(key("SALES_ORDER", o.getId()), new DocLink("SALE", o.getId()));
            });
        }

        Set<Integer> returnIds = new HashSet<>();
        returnIds.addAll(byType.getOrDefault("EXCHANGE_ORDER", Set.of()));
        returnIds.addAll(byType.getOrDefault("RETURN_ORDER", Set.of()));
        if (!returnIds.isEmpty()) {
            returnOrderRepository.findAllById(returnIds).forEach(o -> {
                codes.put(key("EXCHANGE_ORDER", o.getId()), o.getReturnCode());
                codes.put(key("RETURN_ORDER", o.getId()), o.getReturnCode());
                Integer salesOrderId = o.getSalesOrder() != null ? o.getSalesOrder().getId() : null;
                if (salesOrderId != null) {
                    DocLink link = new DocLink("SALE", salesOrderId);
                    links.put(key("EXCHANGE_ORDER", o.getId()), link);
                    links.put(key("RETURN_ORDER", o.getId()), link);
                }
            });
        }

        Set<Integer> importReturnIds = byType.getOrDefault("IMPORT_RETURN", Set.of());
        if (!importReturnIds.isEmpty()) {
            importReturnRepository.findAllById(importReturnIds).forEach(o -> {
                codes.put(key("IMPORT_RETURN", o.getId()), o.getReturnCode());
                links.put(key("IMPORT_RETURN", o.getId()), new DocLink("IMPORT_RETURN", o.getId()));
            });
        }

        Set<Integer> batchIds = byType.getOrDefault("STOCK_BATCH", Set.of());
        if (!batchIds.isEmpty()) {
            stockBatchRepository.findAllById(batchIds).forEach(b ->
                    codes.put(key("STOCK_BATCH", b.getId()), b.getBatchCode()));
        }

        return new DocumentLookup(codes, links);
    }

    private Map<Integer, String> loadUnitNames(Collection<Integer> productIds) {
        Map<Integer, String> result = new HashMap<>();
        for (Integer productId : productIds) {
            String unit = productUnitRepository.findByProductIdAndIsRemovedFalse(productId).stream()
                    .filter(u -> u.getUnitBase() != null && u.getUnitBase().compareTo(BigDecimal.ONE) == 0)
                    .map(ProductUnit::getName)
                    .findFirst()
                    .orElse("sp");
            result.put(productId, unit);
        }
        return result;
    }

    private InstantRange resolveRange(LocalDate from, LocalDate to) {
        Instant fromInstant = from == null ? null : from.atStartOfDay(ZONE).toInstant();
        Instant toExclusive = to == null ? null : to.plusDays(1).atStartOfDay(ZONE).toInstant();
        return new InstantRange(fromInstant, toExclusive);
    }

    private String buildPeriodLabel(LocalDate from, LocalDate to) {
        if (from == null && to == null) {
            return "Tất cả thời gian đến " + LocalDate.now(ZONE);
        }
        if (from != null && to != null) {
            return from.format(DATE_FMT) + " – " + to.format(DATE_FMT);
        }
        if (from != null) {
            return "Từ " + from.format(DATE_FMT);
        }
        return "Đến " + to.format(DATE_FMT);
    }

    private static BigDecimal costOf(StockMovement sm) {
        BigDecimal cost = sm.getStockBatch() != null ? sm.getStockBatch().getCostPerUnit() : null;
        return cost == null ? BigDecimal.ZERO : cost;
    }

    private static String key(String type, Integer id) {
        return type + "#" + id;
    }

    private static int nullToZero(Integer v) {
        return v == null ? 0 : v;
    }

    private static BigDecimal nullToZero(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v;
    }

    private static String money(BigDecimal v) {
        return nullToZero(v).setScale(0, RoundingMode.HALF_UP).toPlainString();
    }

    private static String csv(String value) {
        if (value == null) {
            return "";
        }
        String escaped = value.replace("\"", "\"\"");
        if (escaped.contains(",") || escaped.contains("\"") || escaped.contains("\n")) {
            return "\"" + escaped + "\"";
        }
        return escaped;
    }

    private static String formatInstant(Instant instant) {
        if (instant == null) {
            return "";
        }
        return DT_FMT.format(instant.atZone(ZONE));
    }

    private record InstantRange(Instant from, Instant toExclusive) {
    }

    private static final class OpeningState {
        int qty;
        BigDecimal amount = BigDecimal.ZERO;

        static OpeningState zero() {
            return new OpeningState();
        }
    }

    private record DocumentLookup(Map<String, String> codes, Map<String, DocLink> links) {
        String code(String type, Integer id) {
            if (type == null || id == null) {
                return null;
            }
            return codes.get(key(type, id));
        }

        DocLink link(String type, Integer id) {
            if (type == null || id == null) {
                return null;
            }
            return links.get(key(type, id));
        }
    }

    private record DocLink(String kind, Integer documentId) {
    }

    private static final class Totals {
        int openingQty;
        BigDecimal openingAmount = BigDecimal.ZERO;
        int importQty;
        BigDecimal importAmount = BigDecimal.ZERO;
        int exportQty;
        BigDecimal exportAmount = BigDecimal.ZERO;
        int closingQty;
        BigDecimal closingAmount = BigDecimal.ZERO;

        static Totals from(List<WarehouseIoProductDTO> products) {
            Totals t = new Totals();
            for (WarehouseIoProductDTO p : products) {
                t.openingQty += nullToZero(p.getOpeningQty());
                t.openingAmount = t.openingAmount.add(nullToZero(p.getOpeningAmount()));
                t.importQty += nullToZero(p.getImportQty());
                t.importAmount = t.importAmount.add(nullToZero(p.getImportAmount()));
                t.exportQty += nullToZero(p.getExportQty());
                t.exportAmount = t.exportAmount.add(nullToZero(p.getExportAmount()));
                t.closingQty += nullToZero(p.getClosingQty());
                t.closingAmount = t.closingAmount.add(nullToZero(p.getClosingAmount()));
            }
            return t;
        }
    }

    private static final class ProductAgg {
        final Product product;
        final String unitName;
        int openingQty;
        BigDecimal openingAmount;
        int runningQty;
        BigDecimal runningAmount;
        int importQty;
        BigDecimal importAmount = BigDecimal.ZERO;
        int exportQty;
        BigDecimal exportAmount = BigDecimal.ZERO;
        final List<WarehouseIoLineDTO> lines = new ArrayList<>();

        static ProductAgg start(Product product, OpeningState opening, String unitName) {
            ProductAgg agg = new ProductAgg(product, unitName);
            agg.openingQty = opening.qty;
            agg.openingAmount = opening.amount == null ? BigDecimal.ZERO : opening.amount;
            agg.runningQty = agg.openingQty;
            agg.runningAmount = agg.openingAmount;
            return agg;
        }

        private ProductAgg(Product product, String unitName) {
            this.product = product;
            this.unitName = unitName == null ? "" : unitName;
            this.openingAmount = BigDecimal.ZERO;
            this.runningAmount = BigDecimal.ZERO;
        }

        boolean hasActivity() {
            return !lines.isEmpty() || openingQty != 0 || runningQty != 0;
        }

        void addLine(StockMovement sm, DocumentLookup docs) {
            int delta = sm.getQuantityDelta() == null ? 0 : sm.getQuantityDelta();
            BigDecimal unitCost = costOf(sm);
            BigDecimal lineAmount = unitCost.multiply(BigDecimal.valueOf(Math.abs(delta)));
            boolean inbound = WarehouseReportConstants.isInbound(sm.getMovementType(), delta);

            int lineOpeningQty = runningQty;
            BigDecimal lineOpeningAmt = runningAmount;

            int lineImportQty = 0;
            BigDecimal lineImportAmt = BigDecimal.ZERO;
            int lineExportQty = 0;
            BigDecimal lineExportAmt = BigDecimal.ZERO;

            if (inbound) {
                lineImportQty = Math.abs(delta);
                lineImportAmt = lineAmount;
                importQty += lineImportQty;
                importAmount = importAmount.add(lineImportAmt);
                runningQty += lineImportQty;
                runningAmount = runningAmount.add(lineImportAmt);
            } else {
                lineExportQty = Math.abs(delta);
                lineExportAmt = lineAmount;
                exportQty += lineExportQty;
                exportAmount = exportAmount.add(lineExportAmt);
                runningQty -= lineExportQty;
                runningAmount = runningAmount.subtract(lineExportAmt);
            }

            DocLink link = docs.link(sm.getReferenceType(), sm.getReferenceId());

            lines.add(WarehouseIoLineDTO.builder()
                    .occurredAt(sm.getCreatedAt())
                    .documentCode(docs.code(sm.getReferenceType(), sm.getReferenceId()))
                    .originalDocumentCode(null)
                    .referenceType(sm.getReferenceType())
                    .referenceId(sm.getReferenceId())
                    .documentId(link != null ? link.documentId() : null)
                    .documentKind(link != null ? link.kind() : null)
                    .movementType(sm.getMovementType())
                    .direction(inbound ? "Nhập" : "Xuất")
                    .description(WarehouseReportConstants.descriptionFor(sm.getMovementType()))
                    .openingQty(lineOpeningQty)
                    .openingAmount(lineOpeningAmt)
                    .importQty(lineImportQty)
                    .importAmount(lineImportAmt)
                    .exportQty(lineExportQty)
                    .exportAmount(lineExportAmt)
                    .closingQty(runningQty)
                    .closingAmount(runningAmount)
                    .build());
        }

        WarehouseIoProductDTO toDto() {
            return WarehouseIoProductDTO.builder()
                    .productId(product.getId())
                    .sku(product.getSku())
                    .productName(product.getName())
                    .unitName(unitName)
                    .movementCount(lines.size())
                    .openingQty(openingQty)
                    .openingAmount(openingAmount)
                    .importQty(importQty)
                    .importAmount(importAmount)
                    .exportQty(exportQty)
                    .exportAmount(exportAmount)
                    .closingQty(runningQty)
                    .closingAmount(runningAmount)
                    .lines(lines)
                    .build();
        }
    }
}
