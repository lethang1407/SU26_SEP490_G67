package project.be_sep490_g67.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.be_sep490_g67.dto.response.PageResponse;
import project.be_sep490_g67.dto.response.ProductListItemDTO;
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

    ProductRepository productRepository;
    SalesOrderDetailRepository salesOrderDetailRepository;
    BatchLocationRepository batchLocationRepository;
    StoreConfigRepository storeConfigRepository;
    ImportOrderDetailRepository importOrderDetailRepository;
    SupplierRepository supplierRepository;

    @Transactional(readOnly = true)
    public PageResponse<ProductListItemDTO> getProductPage(
            String facet,
            Integer categoryId,
            String keyword,
            int page,
            int size
    ) {
        String facetKey = facet == null || facet.isBlank() ? "hot" : facet.toLowerCase(Locale.ROOT);
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

        List<ProductListItemDTO> mapped = new ArrayList<>();
        for (Product p : all) {
            ProductListItemDTO dto = toListItem(p, from, to, fallbackSupplierByCategory);
            if (matchesFacet(dto, facetKey)) {
                mapped.add(dto);
            }
        }

        mapped.sort(Comparator
                .comparing(ProductListItemDTO::getAvgDailyRate, Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(ProductListItemDTO::getName, Comparator.nullsLast(String::compareToIgnoreCase)));

        int total = mapped.size();
        int fromIdx = Math.min(page * size, total);
        int toIdx = Math.min(fromIdx + size, total);
        List<ProductListItemDTO> content = mapped.subList(fromIdx, toIdx);

        fillOpenPo(content);

        return PageResponse.<ProductListItemDTO>builder()
                .content(content)
                .page(page)
                .size(size)
                .totalElements(total)
                .totalPages(size == 0 ? 0 : (int) Math.ceil((double) total / size))
                .build();
    }

    /** Toàn bộ SP khớp facet/filter — dùng xuất Excel (không phân trang). */
    @Transactional(readOnly = true)
    public List<ProductListItemDTO> listAllForExport(String facet, Integer categoryId, String keyword) {
        PageResponse<ProductListItemDTO> page = getProductPage(facet, categoryId, keyword, 0, Integer.MAX_VALUE);
        return page.getContent() == null ? List.of() : page.getContent();
    }

    void fillOpenPo(List<ProductListItemDTO> content) {
        if (content == null || content.isEmpty()) {
            return;
        }
        List<Integer> ids = content.stream().map(ProductListItemDTO::getId).toList();
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
        for (ProductListItemDTO dto : content) {
            OpenPoInfo info = byProduct.get(dto.getId());
            if (info != null) {
                dto.setOpenPoId(info.orderId());
                dto.setOpenPoCode(info.orderCode());
                dto.setOpenPoQty(info.qty());
            }
        }
    }

    record OpenPoInfo(Integer orderId, String orderCode, int qty) {}

    ProductListItemDTO toListItem(
            Product p,
            Instant from,
            Instant to,
            Map<Integer, String> fallbackSupplierByCategory
    ) {
        Long sold = salesOrderDetailRepository.sumQtyByProductAndDateRange(p.getId(), from, to);
        long soldQty = sold == null ? 0L : sold;
        BigDecimal avgDaily = BigDecimal.valueOf(soldQty)
                .divide(BigDecimal.valueOf(SALES_WINDOW_DAYS), 2, RoundingMode.HALF_UP);
        BigDecimal avgWeekly = avgDaily.multiply(BigDecimal.valueOf(7)).setScale(1, RoundingMode.HALF_UP);

        Long onHandRaw = batchLocationRepository.sumOnHandByProductId(p.getId());
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

        String unit = resolveUnit(p);
        String facetStatus = resolveFacet(p, onHand, avgDaily.doubleValue(), coverDaysLeft);
        Category category = p.getCategory();
        String supplierName = resolveSupplierName(category, fallbackSupplierByCategory);
        String mainImg = p.getProductImages() != null && !p.getProductImages().isEmpty()
                ? p.getProductImages().iterator().next().getUrl()
                : null;

        Product parent = p.getParent();
        return ProductListItemDTO.builder()
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

    boolean matchesFacet(ProductListItemDTO dto, String facet) {
        return facet.equals(dto.getFacetStatus());
    }

}
