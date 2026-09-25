package project.be_sep490_g67.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.be_sep490_g67.dto.response.PageResponse;
import project.be_sep490_g67.dto.response.ProductListItemResponse;
import project.be_sep490_g67.entity.Category;
import project.be_sep490_g67.entity.Product;
import project.be_sep490_g67.entity.ProductUnit;
import project.be_sep490_g67.entity.Supplier;
import project.be_sep490_g67.repository.BatchLocationRepository;
import project.be_sep490_g67.repository.ImportOrderDetailRepository;
import project.be_sep490_g67.repository.ProductRepository;
import project.be_sep490_g67.repository.SalesOrderDetailRepository;
import project.be_sep490_g67.repository.StockBatchRepository;
import project.be_sep490_g67.repository.StoreConfigRepository;
import project.be_sep490_g67.repository.SupplierRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class ProductListService {

    static final int SALES_WINDOW_DAYS = 30;
    static final double SLOW_THRESHOLD = 0.1;
    static final int SAFETY_DAYS = 1;
    static final int DEFAULT_LEAD_DAYS = 3;
    static final int STORE_COVER_DEFAULT = 7;

    ProductRepository productRepository;
    SalesOrderDetailRepository salesOrderDetailRepository;
    BatchLocationRepository batchLocationRepository;
    StockBatchRepository stockBatchRepository;
    StoreConfigRepository storeConfigRepository;
    ImportOrderDetailRepository importOrderDetailRepository;
    SupplierRepository supplierRepository;

    @Transactional(readOnly = true)
    public PageResponse<ProductListItemResponse> getProductPage(
            String facet,
            Integer categoryId,
            String keyword,
            int page,
            int size
    ) {
        String facetKey = facet == null || facet.isBlank() ? "all" : facet.toLowerCase(Locale.ROOT);
        List<Product> all = productRepository.findAllForList(keyword, categoryId);

        Instant to = Instant.now();
        Instant from = to.minus(SALES_WINDOW_DAYS, ChronoUnit.DAYS);

        List<Integer> categoryIds = all.stream()
                .map(Product::getCategory)
                .filter(c -> c != null)
                .map(Category::getId)
                .distinct()
                .toList();
        Map<Integer, String> fallbackSupplierByCategory = new HashMap<>();
        if (!categoryIds.isEmpty()) {
            for (Supplier s : supplierRepository.findActiveByCategoryIds(categoryIds)) {
                if (s.getCategories() == null) continue;
                for (Category c : s.getCategories()) {
                    if (c != null && categoryIds.contains(c.getId())) {
                        fallbackSupplierByCategory.putIfAbsent(c.getId(), s.getName());
                    }
                }
            }
        }

        // Collect all parent and child product IDs to batch query imported products
        List<Integer> allProductIds = new ArrayList<>();
        Map<Integer, List<Product>> childrenByParentId = new HashMap<>();
        for (Product p : all) {
            allProductIds.add(p.getId());
            List<Product> children = productRepository.findByParent_IdAndIsRemovedFalse(p.getId());
            childrenByParentId.put(p.getId(), children);
            for (Product c : children) {
                allProductIds.add(c.getId());
            }
        }

        Set<Integer> importedProductIds = allProductIds.isEmpty()
                ? Collections.emptySet()
                : new HashSet<>(importOrderDetailRepository.findImportedProductIds(allProductIds));

        List<ProductListItemResponse> mapped = new ArrayList<>();
        for (Product p : all) {
            List<Product> children = childrenByParentId.getOrDefault(p.getId(), Collections.emptyList());
            ProductListItemResponse dto = toListItem(p, children, from, to, fallbackSupplierByCategory, importedProductIds);
            if (matchesFacet(dto, facetKey)) {
                mapped.add(dto);
            }
        }

        mapped.sort(buildComparator(facetKey));

        int total = mapped.size();
        int fromIdx = Math.min(page * size, total);
        int toIdx = Math.min(fromIdx + size, total);
        List<ProductListItemResponse> content = mapped.subList(fromIdx, toIdx);

        fillOpenPo(content);

        return PageResponse.<ProductListItemResponse>builder()
                .content(content)
                .page(page)
                .size(size)
                .totalElements(total)
                .totalPages(size == 0 ? 0 : (int) Math.ceil((double) total / size))
                .build();
    }

    /** Toàn bộ SP khớp facet/filter — dùng xuất Excel (không phân trang). */
    @Transactional(readOnly = true)
    public List<ProductListItemResponse> listAllForExport(String facet, Integer categoryId, String keyword) {
        PageResponse<ProductListItemResponse> page = getProductPage(facet, categoryId, keyword, 0, Integer.MAX_VALUE);
        return page.getContent() == null ? List.of() : page.getContent();
    }

    void fillOpenPo(List<ProductListItemResponse> content) {
        if (content == null || content.isEmpty()) {
            return;
        }
        List<Integer> ids = new ArrayList<>();
        for (ProductListItemResponse dto : content) {
            if (dto.getId() != null) ids.add(dto.getId());
            if (dto.getChildren() != null) {
                for (ProductListItemResponse c : dto.getChildren()) {
                    if (c.getId() != null) ids.add(c.getId());
                }
            }
        }
        List<Object[]> rows = importOrderDetailRepository.findDraftOpenPoRows(ids);
        Map<Integer, OpenPoInfo> byProduct = new HashMap<>();
        for (Object[] row : rows) {
            Integer productId = (Integer) row[0];
            if (byProduct.containsKey(productId)) {
                continue; // newest first
            }
            byProduct.put(productId, new OpenPoInfo(
                    (Integer) row[1],
                    (String) row[2],
                    row[3] == null ? 0 : ((Number) row[3]).intValue(),
                    (String) row[4]
            ));
        }
        for (ProductListItemResponse dto : content) {
            OpenPoInfo info = byProduct.get(dto.getId());
            if (info != null) {
                dto.setOpenPoId(info.orderId());
                dto.setOpenPoCode(info.orderCode());
                dto.setOpenPoQty(info.qty());
                dto.setOpenPoUnitName(info.unitName());
            }
            if (dto.getChildren() != null) {
                for (ProductListItemResponse c : dto.getChildren()) {
                    OpenPoInfo cInfo = byProduct.get(c.getId());
                    if (cInfo != null) {
                        c.setOpenPoId(cInfo.orderId());
                        c.setOpenPoCode(cInfo.orderCode());
                        c.setOpenPoQty(cInfo.qty());
                        c.setOpenPoUnitName(cInfo.unitName());
                    }
                }
                // If parent has no open PO of its own, check if any child has one
                if (dto.getOpenPoId() == null) {
                    for (ProductListItemResponse c : dto.getChildren()) {
                        if (c.getOpenPoId() != null) {
                            dto.setOpenPoId(c.getOpenPoId());
                            dto.setOpenPoCode(c.getOpenPoCode());
                            dto.setOpenPoQty(c.getOpenPoQty());
                            dto.setOpenPoUnitName(c.getOpenPoUnitName());
                            break;
                        }
                    }
                }
            }
        }
    }

    record OpenPoInfo(Integer orderId, String orderCode, int qty, String unitName) {}

    ProductListItemResponse toListItem(
            Product p,
            List<Product> children,
            Instant from,
            Instant to,
            Map<Integer, String> fallbackSupplierByCategory,
            Set<Integer> importedProductIds
    ) {
        boolean isGroup = children != null && !children.isEmpty();

        List<Integer> targetProductIds = new ArrayList<>();
        targetProductIds.add(p.getId());
        if (isGroup) {
            for (Product c : children) {
                targetProductIds.add(c.getId());
            }
        }

        long soldQty = 0L;
        for (Integer pid : targetProductIds) {
            Long s = salesOrderDetailRepository.sumQtyByProductAndDateRange(pid, from, to);
            if (s != null) soldQty += s;
        }
        BigDecimal avgDaily = BigDecimal.valueOf(soldQty)
                .divide(BigDecimal.valueOf(SALES_WINDOW_DAYS), 2, RoundingMode.HALF_UP);
        BigDecimal avgWeekly = avgDaily.multiply(BigDecimal.valueOf(7)).setScale(1, RoundingMode.HALF_UP);

        int onHand = 0;
        for (Integer pid : targetProductIds) {
            Long ledgerRaw = stockBatchRepository.sumStockByProductId(pid);
            if (ledgerRaw != null && ledgerRaw > 0) {
                onHand += ledgerRaw.intValue();
            } else {
                Long onHandRaw = batchLocationRepository.sumOnHandByProductId(pid);
                if (onHandRaw != null && onHandRaw > 0) {
                    onHand += onHandRaw.intValue();
                }
            }
        }

        Double coverDaysLeft = null;
        if (avgDaily.compareTo(BigDecimal.ZERO) > 0) {
            coverDaysLeft = BigDecimal.valueOf(onHand)
                    .divide(avgDaily, 1, RoundingMode.HALF_UP)
                    .doubleValue();
        } else if (onHand > 0) {
            coverDaysLeft = 999.0;
        } else {
            coverDaysLeft = 0.0;
        }

        boolean isInactive = "inactive".equalsIgnoreCase(p.getStatus());
        boolean hasEverImported = onHand > 0 || soldQty > 0 || targetProductIds.stream().anyMatch(importedProductIds::contains);
        boolean isNew = !isInactive && !hasEverImported;

        String unit = resolveUnit(p);
        String facetStatus;
        if (isInactive) {
            facetStatus = "stop";
        } else if (isNew) {
            facetStatus = "new";
        } else {
            facetStatus = resolveFacet(p, onHand, avgDaily.doubleValue(), coverDaysLeft);
        }

        String resolvedStatus = isInactive ? "inactive" : (isNew ? "new" : "active");

        Category category = p.getCategory();
        String supplierName = resolveSupplierName(category, fallbackSupplierByCategory);
        String mainImg = p.getProductImages() != null && !p.getProductImages().isEmpty()
                ? p.getProductImages().iterator().next().getUrl()
                : null;

        BigDecimal sellingPrice = p.getSellingPrice();
        BigDecimal costPrice = p.getCostPrice();
        if (isGroup) {
            if (sellingPrice == null || sellingPrice.compareTo(BigDecimal.ZERO) == 0) {
                for (Product c : children) {
                    if (c.getSellingPrice() != null && c.getSellingPrice().compareTo(BigDecimal.ZERO) > 0) {
                        sellingPrice = c.getSellingPrice();
                        break;
                    }
                }
            }
            if (costPrice == null || costPrice.compareTo(BigDecimal.ZERO) == 0) {
                for (Product c : children) {
                    if (c.getCostPrice() != null && c.getCostPrice().compareTo(BigDecimal.ZERO) > 0) {
                        costPrice = c.getCostPrice();
                        break;
                    }
                }
            }
        }

        List<ProductListItemResponse> childDtos = null;
        if (isGroup) {
            childDtos = new ArrayList<>();
            for (Product c : children) {
                childDtos.add(toChildListItem(c, from, to, fallbackSupplierByCategory, importedProductIds));
            }
        }

        Product parent = p.getParent();
        return ProductListItemResponse.builder()
                .id(p.getId())
                .parentId(parent != null ? parent.getId() : null)
                .parentName(parent != null ? parent.getName() : null)
                .name(p.getName())
                .sku(p.getSku())
                .barcode(p.getBarcode())
                .productImg(mainImg)
                .categoryId(category != null ? category.getId() : (parent != null && parent.getCategory() != null ? parent.getCategory().getId() : null))
                .categoryName(category != null ? category.getName() : (parent != null && parent.getCategory() != null ? parent.getCategory().getName() : null))
                .unitName(unit)
                .supplierName(supplierName)
                .description(p.getDescription())
                .sellingPrice(sellingPrice)
                .costPrice(costPrice)
                .categoryCoverDays(category != null && category.getCoverDays() != null
                        ? category.getCoverDays()
                        : STORE_COVER_DEFAULT)
                .avgDailyRate(avgDaily)
                .avgWeeklyRate(avgWeekly)
                .sold14Days((int) soldQty)
                .sold30Days((int) soldQty)
                .onHand(onHand)
                .minStock(p.getMinStock() != null ? p.getMinStock() : 0)
                .coverDaysLeft(coverDaysLeft)
                .facetStatus(facetStatus)
                .status(resolvedStatus)
                .createdAt(p.getCreatedAt())
                .isGroup(isGroup)
                .childCount(isGroup ? children.size() : null)
                .children(childDtos)
                .build();
    }

    ProductListItemResponse toChildListItem(
            Product c,
            Instant from,
            Instant to,
            Map<Integer, String> fallbackSupplierByCategory,
            Set<Integer> importedProductIds
    ) {
        Long sold = salesOrderDetailRepository.sumQtyByProductAndDateRange(c.getId(), from, to);
        long soldQty = sold == null ? 0L : sold;
        BigDecimal avgDaily = BigDecimal.valueOf(soldQty)
                .divide(BigDecimal.valueOf(SALES_WINDOW_DAYS), 2, RoundingMode.HALF_UP);
        BigDecimal avgWeekly = avgDaily.multiply(BigDecimal.valueOf(7)).setScale(1, RoundingMode.HALF_UP);

        Long ledgerRaw = stockBatchRepository.sumStockByProductId(c.getId());
        int onHand = 0;
        if (ledgerRaw != null && ledgerRaw > 0) {
            onHand = ledgerRaw.intValue();
        } else {
            Long onHandRaw = batchLocationRepository.sumOnHandByProductId(c.getId());
            if (onHandRaw != null && onHandRaw > 0) {
                onHand = onHandRaw.intValue();
            }
        }

        Double coverDaysLeft = null;
        if (avgDaily.compareTo(BigDecimal.ZERO) > 0) {
            coverDaysLeft = BigDecimal.valueOf(onHand)
                    .divide(avgDaily, 1, RoundingMode.HALF_UP)
                    .doubleValue();
        } else if (onHand > 0) {
            coverDaysLeft = 999.0;
        } else {
            coverDaysLeft = 0.0;
        }

        boolean isInactive = "inactive".equalsIgnoreCase(c.getStatus());
        boolean hasEverImported = onHand > 0 || soldQty > 0 || importedProductIds.contains(c.getId());
        boolean isNew = !isInactive && !hasEverImported;

        String unit = resolveUnit(c);
        String facetStatus;
        if (isInactive) {
            facetStatus = "stop";
        } else if (isNew) {
            facetStatus = "new";
        } else {
            facetStatus = resolveFacet(c, onHand, avgDaily.doubleValue(), coverDaysLeft);
        }

        String resolvedStatus = isInactive ? "inactive" : (isNew ? "new" : "active");

        Category category = c.getCategory();
        String supplierName = resolveSupplierName(category, fallbackSupplierByCategory);
        String mainImg = c.getProductImages() != null && !c.getProductImages().isEmpty()
                ? c.getProductImages().iterator().next().getUrl()
                : (c.getParent() != null && c.getParent().getProductImages() != null && !c.getParent().getProductImages().isEmpty()
                        ? c.getParent().getProductImages().iterator().next().getUrl()
                        : null);

        Product parent = c.getParent();
        return ProductListItemResponse.builder()
                .id(c.getId())
                .parentId(parent != null ? parent.getId() : null)
                .parentName(parent != null ? parent.getName() : null)
                .name(c.getName())
                .sku(c.getSku())
                .barcode(c.getBarcode())
                .productImg(mainImg)
                .categoryId(category != null ? category.getId() : (parent != null && parent.getCategory() != null ? parent.getCategory().getId() : null))
                .categoryName(category != null ? category.getName() : (parent != null && parent.getCategory() != null ? parent.getCategory().getName() : null))
                .unitName(unit)
                .supplierName(supplierName)
                .description(c.getDescription())
                .sellingPrice(c.getSellingPrice())
                .costPrice(c.getCostPrice())
                .categoryCoverDays(category != null && category.getCoverDays() != null
                        ? category.getCoverDays()
                        : STORE_COVER_DEFAULT)
                .avgDailyRate(avgDaily)
                .avgWeeklyRate(avgWeekly)
                .sold14Days((int) soldQty)
                .sold30Days((int) soldQty)
                .onHand(onHand)
                .minStock(c.getMinStock() != null ? c.getMinStock() : (parent != null && parent.getMinStock() != null ? parent.getMinStock() : 0))
                .coverDaysLeft(coverDaysLeft)
                .facetStatus(facetStatus)
                .status(resolvedStatus)
                .createdAt(c.getCreatedAt())
                .isGroup(false)
                .build();
    }

    String resolveSupplierName(Category category, Map<Integer, String> fallbackSupplierByCategory) {
        if (category == null) {
            return null;
        }
        if (category.getDefaultSupplier() != null && category.getDefaultSupplier().getName() != null) {
            return category.getDefaultSupplier().getName();
        }
        return fallbackSupplierByCategory.get(category.getId());
    }

    String resolveUnit(Product p) {
        if (p == null) return "sp";
        if (p.getProductUnits() != null && !p.getProductUnits().isEmpty()) {
            String base = p.getProductUnits().stream()
                    .filter(u -> !Boolean.TRUE.equals(u.getIsRemoved()))
                    .filter(u -> u.getUnitBase() != null && u.getUnitBase().compareTo(BigDecimal.ONE) == 0)
                    .map(ProductUnit::getName)
                    .findFirst()
                    .orElse(null);
            if (base != null && !base.isBlank()) {
                return base;
            }
            String minUnit = p.getProductUnits().stream()
                    .filter(u -> !Boolean.TRUE.equals(u.getIsRemoved()))
                    .min(Comparator.comparing(u -> u.getUnitBase() != null ? u.getUnitBase() : BigDecimal.valueOf(999999)))
                    .map(ProductUnit::getName)
                    .orElse(null);
            if (minUnit != null && !minUnit.isBlank()) {
                return minUnit;
            }
        }
        if (p.getParent() != null) {
            return resolveUnit(p.getParent());
        }
        return "sp";
    }

    String resolveFacet(Product p, int onHand, double avgDaily, Double coverDaysLeft) {
        String status = p.getStatus() == null ? "active" : p.getStatus();
        if ("inactive".equalsIgnoreCase(status)) {
            return "stop";
        }
        if (onHand <= 0) {
            return avgDaily > SLOW_THRESHOLD ? "hot" : "slow";
        }
        if (p.getSeasonTag() != null && !p.getSeasonTag().isBlank()) {
            return "season";
        }
        int lead = resolveLeadDays(p);
        int warnHorizon = lead + SAFETY_DAYS;
        if (coverDaysLeft != null && coverDaysLeft > 0 && coverDaysLeft <= warnHorizon) {
            return "warn";
        }
        return "ok";
    }

    int resolveLeadDays(Product p) {
        Category c = p.getCategory();
        if (c != null && c.getDefaultSupplier() != null
                && c.getDefaultSupplier().getLeadTimeDays() != null) {
            return c.getDefaultSupplier().getLeadTimeDays();
        }
        if (c != null && c.getSuppliers() != null && !c.getSuppliers().isEmpty()) {
            Supplier s = c.getSuppliers().iterator().next();
            if (s.getLeadTimeDays() != null) {
                return s.getLeadTimeDays();
            }
        }
        return DEFAULT_LEAD_DAYS;
    }

    boolean matchesFacet(ProductListItemResponse dto, String facet) {
        if ("all".equals(facet)) return true;
        return facet.equals(dto.getFacetStatus());
    }

    Comparator<ProductListItemResponse> buildComparator(String facet) {
        Comparator<ProductListItemResponse> newestFirst = Comparator.comparing(
                ProductListItemResponse::getCreatedAt,
                Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(ProductListItemResponse::getId, Comparator.nullsLast(Comparator.reverseOrder()));

        Comparator<ProductListItemResponse> secondary = Comparator.comparing(
                ProductListItemResponse::getName, Comparator.nullsLast(String::compareToIgnoreCase));

        // Ưu tiên các sản phẩm mới tạo (chưa từng nhập hàng) luôn được đưa lên trên cùng khi xem danh sách tất cả
        Comparator<ProductListItemResponse> newProductsFirst = Comparator.comparing(
                (ProductListItemResponse item) -> isNewlyCreated(item) ? 0 : 1
        ).thenComparing(newestFirst);

        return switch (facet) {
            case "all" -> newProductsFirst.thenComparing(secondary);
            case "new" -> newestFirst.thenComparing(secondary);
            case "hot" -> Comparator.comparing(
                    ProductListItemResponse::getAvgDailyRate,
                    Comparator.nullsLast(Comparator.reverseOrder()))
                    .thenComparing(newestFirst);
            case "warn" -> Comparator.comparing(
                    ProductListItemResponse::getCoverDaysLeft,
                    Comparator.nullsLast(Comparator.naturalOrder()))
                    .thenComparing(ProductListItemResponse::getAvgDailyRate, Comparator.nullsLast(Comparator.reverseOrder()))
                    .thenComparing(newestFirst);
            case "ok" -> newestFirst.thenComparing(secondary);
            case "slow" -> Comparator.comparing(
                    ProductListItemResponse::getAvgDailyRate,
                    Comparator.nullsLast(Comparator.naturalOrder()))
                    .thenComparing(newestFirst);
            case "stop" -> newestFirst.thenComparing(secondary);
            default -> newProductsFirst.thenComparing(secondary);
        };
    }

    private boolean isNewlyCreated(ProductListItemResponse item) {
        if (item == null) return false;
        if ("inactive".equalsIgnoreCase(item.getStatus()) || "stop".equalsIgnoreCase(item.getFacetStatus())) {
            return false;
        }
        return "new".equalsIgnoreCase(item.getFacetStatus());
    }
}

