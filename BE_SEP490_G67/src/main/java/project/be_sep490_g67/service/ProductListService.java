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
import project.be_sep490_g67.repository.ProductRepository;
import project.be_sep490_g67.repository.SalesOrderDetailRepository;
import project.be_sep490_g67.repository.StoreConfigRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

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

        List<ProductListItemDTO> mapped = new ArrayList<>();
        for (Product p : all) {
            ProductListItemDTO dto = toListItem(p, from, to);
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

        return PageResponse.<ProductListItemDTO>builder()
                .content(content)
                .page(page)
                .size(size)
                .totalElements(total)
                .totalPages(size == 0 ? 0 : (int) Math.ceil((double) total / size))
                .build();
    }

    ProductListItemDTO toListItem(Product p, Instant from, Instant to) {
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

        return ProductListItemDTO.builder()
                .id(p.getId())
                .name(p.getName())
                .productImg(p.getProductImg())
                .categoryName(p.getCategory() != null ? p.getCategory().getName() : null)
                .unitName(unit)
                .avgDailyRate(avgDaily)
                .avgWeeklyRate(avgWeekly)
                .onHand(onHand)
                .coverDaysLeft(coverDaysLeft)
                .facetStatus(facetStatus)
                .build();
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

    int storeCoverDefault() {
        return storeConfigRepository.findById(1)
                .map(sc -> sc.getDefaultCoverDays() != null ? sc.getDefaultCoverDays() : STORE_COVER_DEFAULT)
                .orElse(STORE_COVER_DEFAULT);
    }
}
