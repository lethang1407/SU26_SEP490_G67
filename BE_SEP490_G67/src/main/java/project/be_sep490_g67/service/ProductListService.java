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
import project.be_sep490_g67.repository.StoreConfigRepository;
import project.be_sep490_g67.repository.SupplierRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class ProductListService {

    static final int SALES_WINDOW_DAYS = 14;
    static final double SLOW_THRESHOLD = 0.1;
    static final int SAFETY_DAYS = 1;
    static final int DEFAULT_LEAD_DAYS = 3;
    static final int STORE_COVER_DEFAULT = 7;
    static final int NEW_PRODUCT_DAYS = 30;

    ProductRepository productRepository;
    SalesOrderDetailRepository salesOrderDetailRepository;
    BatchLocationRepository batchLocationRepository;
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
        Instant newThreshold = to.minus(NEW_PRODUCT_DAYS, ChronoUnit.DAYS);

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

        List<ProductListItemResponse> mapped = new ArrayList<>();
        for (Product p : all) {
            ProductListItemResponse dto = toListItem(p, from, to, newThreshold, fallbackSupplierByCategory);
            if (matchesFacet(dto, facetKey, newThreshold)) {
                mapped.add(dto);
            }
        }

        mapped.sort(Comparator
                .comparing(ProductListItemResponse::getAvgDailyRate, Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(ProductListItemResponse::getName, Comparator.nullsLast(String::compareToIgnoreCase)));

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
                    row[3] == null ? 0 : ((Number) row[3]).intValue()
            ));
        }
        for (ProductListItemResponse dto : content) {
            OpenPoInfo info = byProduct.get(dto.getId());
            if (info != null) {
                dto.setOpenPoId(info.orderId());
                dto.setOpenPoCode(info.orderCode());
                dto.setOpenPoQty(info.qty());
            }
            if (dto.getChildren() != null) {
                for (ProductListItemResponse c : dto.getChildren()) {
                    OpenPoInfo cInfo = byProduct.get(c.getId());
                    if (cInfo != null) {
                        c.setOpenPoId(cInfo.orderId());
                        c.setOpenPoCode(cInfo.orderCode());
                        c.setOpenPoQty(cInfo.qty());
                    }
                }
                // If parent has no open PO of its own, check if any child has one
                if (dto.getOpenPoId() == null) {
                    for (ProductListItemResponse c : dto.getChildren()) {
                        if (c.getOpenPoId() != null) {
                            dto.setOpenPoId(c.getOpenPoId());
                            dto.setOpenPoCode(c.getOpenPoCode());
                            dto.setOpenPoQty(c.getOpenPoQty());
                            break;
                        }
                    }
                }
            }
        }
    }

    record OpenPoInfo(Integer orderId, String orderCode, int qty) {}

    ProductListItemResponse toListItem(
            Product p,
            Instant from,
            Instant to,
            Instant newThreshold,
            Map<Integer, String> fallbackSupplierByCategory
    ) {

        // Determine if product is a group (has children)
        List<Product> children = productRepository.findByParent_IdAndIsRemovedFalse(p.getId());
        boolean isGroup = !children.isEmpty();

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
            Long onHandRaw = batchLocationRepository.sumOnHandByProductId(pid);
            if (onHandRaw != null) onHand += onHandRaw.intValue();
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

        String unit = resolveUnit(p);
        String facetStatus = resolveFacet(p, onHand, avgDaily.doubleValue(), coverDaysLeft);
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
                childDtos.add(toChildListItem(c, from, to, newThreshold, fallbackSupplierByCategory));
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
                .categoryName(category != null ? category.getName() : null)
                .unitName(unit)
                .supplierName(supplierName)
                .description(p.getDescription())
                .sellingPrice(p.getSellingPrice())
                .costPrice(p.getCostPrice())
                .categoryCoverDays(category != null && category.getCoverDays() != null
                        ? category.getCoverDays()
                        : STORE_COVER_DEFAULT)
                .avgDailyRate(avgDaily)
                .avgWeeklyRate(avgWeekly)
                .onHand(onHand)
                .coverDaysLeft(coverDaysLeft)
                .facetStatus(facetStatus)
                .status(p.getStatus() == null ? "active" : p.getStatus())
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
            Instant newThreshold,
            Map<Integer, String> fallbackSupplierByCategory
    ) {
        Long sold = salesOrderDetailRepository.sumQtyByProductAndDateRange(c.getId(), from, to);
        long soldQty = sold == null ? 0L : sold;
        BigDecimal avgDaily = BigDecimal.valueOf(soldQty)
                .divide(BigDecimal.valueOf(SALES_WINDOW_DAYS), 2, RoundingMode.HALF_UP);
        BigDecimal avgWeekly = avgDaily.multiply(BigDecimal.valueOf(7)).setScale(1, RoundingMode.HALF_UP);

        Long onHandRaw = batchLocationRepository.sumOnHandByProductId(c.getId());
        int onHand = onHandRaw == null ? 0 : onHandRaw.intValue();

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
        boolean isNew = "new".equalsIgnoreCase(c.getStatus())
                || (!isInactive && c.getCreatedAt() != null && c.getCreatedAt().isAfter(newThreshold));

        String unit = resolveUnit(c);
        String facetStatus;
        if (isInactive) {
            facetStatus = "stop";
        } else if (isNew && onHand <= 0 && avgDaily.doubleValue() <= SLOW_THRESHOLD) {
            facetStatus = "new";
        } else {
            facetStatus = resolveFacet(c, onHand, avgDaily.doubleValue(), coverDaysLeft);
        }

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
                .categoryName(category != null ? category.getName() : null)
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
                .onHand(onHand)
                .coverDaysLeft(coverDaysLeft)
                .facetStatus(facetStatus)
                .status(c.getStatus() == null ? "active" : c.getStatus())
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
        if (p.getProductUnits() == null || p.getProductUnits().isEmpty()) {
            return "sp";
        }
        return p.getProductUnits().stream()
                .findFirst()
                .map(ProductUnit::getName)
                .orElse("sp");
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

    boolean matchesFacet(ProductListItemResponse dto, String facet, Instant newThreshold) {
        if ("all".equals(facet)) return true;
        if ("new".equals(facet)) {
            return dto.getCreatedAt() != null && dto.getCreatedAt().isAfter(newThreshold)
                    && !"inactive".equalsIgnoreCase(dto.getStatus());
        }
        return facet.equals(dto.getFacetStatus());
    }

    Comparator<ProductListItemResponse> buildComparator(String facet) {
        Comparator<ProductListItemResponse> secondary = Comparator.comparing(
                ProductListItemResponse::getName, Comparator.nullsLast(String::compareToIgnoreCase));
        return switch (facet) {
            case "new" -> Comparator.comparing(
                    ProductListItemResponse::getCreatedAt,
                    Comparator.nullsLast(Comparator.reverseOrder())).thenComparing(secondary);
            case "hot" -> Comparator.comparing(
                    ProductListItemResponse::getAvgDailyRate,
                    Comparator.nullsLast(Comparator.reverseOrder())).thenComparing(secondary);
            case "warn" -> Comparator.comparing(
                    ProductListItemResponse::getCoverDaysLeft,
                    Comparator.nullsLast(Comparator.naturalOrder())).thenComparing(secondary);
            case "slow" -> Comparator.comparing(
                    ProductListItemResponse::getAvgDailyRate,
                    Comparator.nullsLast(Comparator.naturalOrder())).thenComparing(secondary);
            case "stop" -> secondary;
            case "all" -> {
                // Group by facet priority: new -> hot -> warn -> ok -> season -> slow -> stop
                List<String> order = List.of("new", "hot", "warn", "ok", "season", "slow", "stop");
                yield Comparator.comparingInt((ProductListItemResponse dto) -> {
                    int idx = order.indexOf(dto.getFacetStatus());
                    return idx < 0 ? order.size() : idx;
                }).thenComparing((dto1, dto2) -> {
                    String status1 = dto1.getFacetStatus();
                    String status2 = dto2.getFacetStatus();
                    if (status1 != null && status1.equals(status2)) {
                        if ("new".equals(status1)) {
                            if (dto1.getCreatedAt() != null && dto2.getCreatedAt() != null) {
                                return dto2.getCreatedAt().compareTo(dto1.getCreatedAt());
                            }
                        } else if ("warn".equals(status1)) {
                            if (dto1.getCoverDaysLeft() != null && dto2.getCoverDaysLeft() != null) {
                                return Double.compare(dto1.getCoverDaysLeft(), dto2.getCoverDaysLeft());
                            }
                        }
                    }
                    BigDecimal rate1 = dto1.getAvgDailyRate() == null ? BigDecimal.ZERO : dto1.getAvgDailyRate();
                    BigDecimal rate2 = dto2.getAvgDailyRate() == null ? BigDecimal.ZERO : dto2.getAvgDailyRate();
                    int rateCompare = rate2.compareTo(rate1);
                    if (rateCompare != 0) return rateCompare;
                    return (dto1.getName() == null ? "" : dto1.getName())
                            .compareToIgnoreCase(dto2.getName() == null ? "" : dto2.getName());
                });
            }
            default -> Comparator.comparing(
                    ProductListItemResponse::getAvgDailyRate,
                    Comparator.nullsLast(Comparator.reverseOrder())).thenComparing(secondary);
        };
    }
}
