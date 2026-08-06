package project.be_sep490_g67.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.be_sep490_g67.dto.request.ImportSuggestRequest;
import project.be_sep490_g67.dto.response.ImportSuggestionDTO;
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
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class ImportSuggestionService {

    static final int SALES_WINDOW_DAYS = 14;
    static final int SAFETY_DAYS = 1;
    static final int DEFAULT_LEAD_DAYS = 3;
    static final int STORE_COVER_DEFAULT = 7;
    static final int HSD_BUFFER_DAYS = 1;

    ProductRepository productRepository;
    SalesOrderDetailRepository salesOrderDetailRepository;
    BatchLocationRepository batchLocationRepository;
    StockBatchRepository stockBatchRepository;
    StoreConfigRepository storeConfigRepository;
    ImportOrderDetailRepository importOrderDetailRepository;
    SupplierRepository supplierRepository;

    @Transactional(readOnly = true)
    public List<ImportSuggestionDTO> getSuggestions(ImportSuggestRequest request) {
        if (request == null || request.getProductIds() == null || request.getProductIds().isEmpty()) {
            return Collections.emptyList();
        }
        Map<Integer, Integer> overrides = request.getCoverOverrides() == null
                ? Collections.emptyMap()
                : request.getCoverOverrides();

        List<Product> products = productRepository.findAllByIdWithCategory(request.getProductIds());
        Instant to = Instant.now();
        Instant from = to.minus(SALES_WINDOW_DAYS, ChronoUnit.DAYS);

        List<Integer> categoryIds = products.stream()
                .map(Product::getCategory)
                .filter(Objects::nonNull)
                .map(Category::getId)
                .distinct()
                .toList();

        Map<Integer, List<Supplier>> suppliersByCategory = new HashMap<>();
        if (!categoryIds.isEmpty()) {
            for (Supplier s : supplierRepository.findActiveByCategoryIds(categoryIds)) {
                if (s.getCategories() == null) {
                    continue;
                }
                for (Category c : s.getCategories()) {
                    if (c != null && categoryIds.contains(c.getId())) {
                        suppliersByCategory
                                .computeIfAbsent(c.getId(), k -> new ArrayList<>())
                                .add(s);
                    }
                }
            }
            // Fallback: search theo từng category nếu join bảng trung gian trống
            for (Integer catId : categoryIds) {
                if (suppliersByCategory.containsKey(catId)
                        && !suppliersByCategory.get(catId).isEmpty()) {
                    continue;
                }
                List<Supplier> found = supplierRepository.searchSuppliers(null, catId);
                if (!found.isEmpty()) {
                    suppliersByCategory.put(catId, new ArrayList<>(found));
                }
            }
        }

        // productId -> supplierId -> last cost
        Map<Integer, Map<Integer, BigDecimal>> lastCosts = loadLastCosts(request.getProductIds());

        List<ImportSuggestionDTO> result = new ArrayList<>();
        for (Product p : products) {
            result.add(buildSuggestion(
                    p, from, to, overrides.get(p.getId()), suppliersByCategory, lastCosts));
        }
        return result;
    }

    Map<Integer, Map<Integer, BigDecimal>> loadLastCosts(List<Integer> productIds) {
        Map<Integer, Map<Integer, BigDecimal>> map = new HashMap<>();
        if (productIds == null || productIds.isEmpty()) {
            return map;
        }
        for (Object[] row : importOrderDetailRepository.findRecentCostsByProductIds(productIds)) {
            Integer productId = (Integer) row[0];
            Integer supplierId = (Integer) row[1];
            BigDecimal cost = (BigDecimal) row[2];
            map.computeIfAbsent(productId, k -> new LinkedHashMap<>());
            if (!map.get(productId).containsKey(supplierId)) {
                map.get(productId).put(supplierId, cost);
            }
        }
        return map;
    }

    ImportSuggestionDTO buildSuggestion(
            Product p,
            Instant from,
            Instant to,
            Integer panelCoverOverride,
            Map<Integer, List<Supplier>> suppliersByCategory,
            Map<Integer, Map<Integer, BigDecimal>> lastCosts
    ) {
        Long sold = salesOrderDetailRepository.sumQtyByProductAndDateRange(p.getId(), from, to);
        long soldQty = sold == null ? 0L : sold;
        BigDecimal avgDaily = BigDecimal.valueOf(soldQty)
                .divide(BigDecimal.valueOf(SALES_WINDOW_DAYS), 2, RoundingMode.HALF_UP);

        Long onHandRaw = batchLocationRepository.sumOnHandByProductId(p.getId());
        int onHand = onHandRaw == null ? 0 : onHandRaw.intValue();

        BigDecimal fallbackCost = p.getCostPrice() != null ? p.getCostPrice() : BigDecimal.ZERO;
        List<ImportSuggestionDTO.SupplierOption> options = buildSupplierOptions(
                p, suppliersByCategory, lastCosts.getOrDefault(p.getId(), Map.of()), fallbackCost);

        ImportSuggestionDTO.SupplierOption selected = pickDefaultOption(p, options);
        int leadDays = selected != null && selected.getLeadTimeDays() != null
                ? selected.getLeadTimeDays()
                : DEFAULT_LEAD_DAYS;
        BigDecimal costPerUnit = selected != null && selected.getCostPerUnit() != null
                ? selected.getCostPerUnit()
                : fallbackCost;

        CoverResolved cover = resolveCover(p, panelCoverOverride);

        int usableSellDays = resolveUsableSellDays(p.getId(), leadDays);
        double avg = avgDaily.doubleValue();
        double horizon = leadDays + cover.days + SAFETY_DAYS;
        double soqRaw = Math.max(0, avg * horizon - onHand);
        double soqCapped = usableSellDays < Integer.MAX_VALUE / 8
                ? Math.min(soqRaw, avg * usableSellDays)
                : soqRaw;
        int suggestedQty = (int) Math.ceil(soqCapped);
        if (suggestedQty == 0 && onHand <= 0 && avg > 0) {
            suggestedQty = (int) Math.ceil(avg * Math.max(cover.days, 1));
        }

        boolean orderToday = onHand <= 0 || (avg > 0 && onHand / avg <= leadDays + SAFETY_DAYS);

        String whyFacts = String.format(
                "%s · ~%s/%s · NCC giao ~%d ngày%s",
                onHand <= 0 ? "Hết" : "Còn " + onHand,
                avgDaily.stripTrailingZeros().toPlainString(),
                "ngày",
                leadDays,
                usableSellDays < 30 ? " · HSD ngắn → còn bán ~" + usableSellDays + " ngày sau khi về" : ""
        );
        String whyResult = String.format(
                "→ %s, gợi ý nhập %d",
                orderToday ? "Đặt hôm nay" : "Có thể lên lịch",
                suggestedQty
        );

        return ImportSuggestionDTO.builder()
                .productId(p.getId())
                .productName(p.getName())
                .whyFacts(whyFacts)
                .whyResult(whyResult)
                .suggestedQty(suggestedQty)
                .orderToday(orderToday)
                .supplierId(selected != null ? selected.getId() : null)
                .supplierName(selected != null ? selected.getName() : null)
                .leadTimeDays(leadDays)
                .coverDays(cover.days)
                .coverSource(cover.source)
                .coverSourceLabel(cover.label)
                .costPerUnit(costPerUnit)
                .onHand(onHand)
                .avgDailyRate(avgDaily)
                .supplierOptions(options)
                .units(buildUnitOptions(p))
                .build();
    }

    List<ImportSuggestionDTO.UnitOption> buildUnitOptions(Product p) {
        if (p.getProductUnits() == null || p.getProductUnits().isEmpty()) {
            return List.of(ImportSuggestionDTO.UnitOption.builder()
                    .id(null)
                    .name("sp")
                    .unitBase(BigDecimal.ONE)
                    .isBase(true)
                    .build());
        }
        return p.getProductUnits().stream()
                .filter(u -> !Boolean.TRUE.equals(u.getIsRemoved()))
                .sorted(Comparator
                        .comparing((ProductUnit u) ->
                                u.getUnitBase() == null ? BigDecimal.ONE : u.getUnitBase())
                        .thenComparing(u -> u.getName() == null ? "" : u.getName()))
                .map(u -> {
                    BigDecimal base = u.getUnitBase() == null ? BigDecimal.ONE : u.getUnitBase();
                    boolean isBase = base.compareTo(BigDecimal.ONE) == 0;
                    return ImportSuggestionDTO.UnitOption.builder()
                            .id(u.getId())
                            .name(u.getName() != null ? u.getName() : "sp")
                            .unitBase(base)
                            .isBase(isBase)
                            .build();
                })
                .toList();
    }

    List<ImportSuggestionDTO.SupplierOption> buildSupplierOptions(
            Product p,
            Map<Integer, List<Supplier>> suppliersByCategory,
            Map<Integer, BigDecimal> costsBySupplier,
            BigDecimal fallbackCost
    ) {
        Map<Integer, Supplier> unique = new LinkedHashMap<>();
        Category c = p.getCategory();
        if (c != null && c.getDefaultSupplier() != null
                && !Boolean.TRUE.equals(c.getDefaultSupplier().getIsRemoved())) {
            unique.put(c.getDefaultSupplier().getId(), c.getDefaultSupplier());
        }
        if (c != null) {
            for (Supplier s : suppliersByCategory.getOrDefault(c.getId(), List.of())) {
                unique.putIfAbsent(s.getId(), s);
            }
        }
        for (Integer supplierId : costsBySupplier.keySet()) {
            if (!unique.containsKey(supplierId)) {
                supplierRepository.findByIdAndIsRemovedFalse(supplierId)
                        .ifPresent(s -> unique.put(s.getId(), s));
            }
        }

        if (unique.isEmpty()) {
            return List.of();
        }

        List<ImportSuggestionDTO.SupplierOption> options = new ArrayList<>();
        for (Supplier s : unique.values()) {
            BigDecimal cost = costsBySupplier.getOrDefault(s.getId(), fallbackCost);
            options.add(ImportSuggestionDTO.SupplierOption.builder()
                    .id(s.getId())
                    .name(s.getName())
                    .leadTimeDays(s.getLeadTimeDays() != null ? s.getLeadTimeDays() : DEFAULT_LEAD_DAYS)
                    .costPerUnit(cost)
                    .cheapest(false)
                    .build());
        }

        options.stream()
                .min(Comparator.comparing(o -> o.getCostPerUnit() == null
                        ? BigDecimal.valueOf(Long.MAX_VALUE)
                        : o.getCostPerUnit()))
                .ifPresent(cheapest -> {
                    BigDecimal price = cheapest.getCostPerUnit();
                    for (ImportSuggestionDTO.SupplierOption o : options) {
                        if (o.getCostPerUnit() != null && o.getCostPerUnit().compareTo(price) == 0) {
                            o.setCheapest(true);
                        }
                    }
                });

        options.sort(Comparator
                .comparing(ImportSuggestionDTO.SupplierOption::getCheapest, Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(ImportSuggestionDTO.SupplierOption::getName, Comparator.nullsLast(String::compareToIgnoreCase)));

        return options;
    }

    ImportSuggestionDTO.SupplierOption pickDefaultOption(
            Product p, List<ImportSuggestionDTO.SupplierOption> options) {
        if (options == null || options.isEmpty()) {
            return null;
        }
        Category c = p.getCategory();
        if (c != null && c.getDefaultSupplier() != null) {
            Integer defId = c.getDefaultSupplier().getId();
            for (ImportSuggestionDTO.SupplierOption o : options) {
                if (Objects.equals(o.getId(), defId)) {
                    return o;
                }
            }
        }
        return options.stream()
                .filter(o -> Boolean.TRUE.equals(o.getCheapest()))
                .findFirst()
                .orElse(options.get(0));
    }

    record CoverResolved(int days, String source, String label) {}

    CoverResolved resolveCover(Product p, Integer panelOverride) {
        if (panelOverride != null && panelOverride > 0) {
            return new CoverResolved(panelOverride, "PANEL", "Lần nhập này");
        }
        if (p.getCoverDaysOverride() != null && p.getCoverDaysOverride() > 0) {
            return new CoverResolved(p.getCoverDaysOverride(), "PRODUCT", "Cài riêng SP");
        }
        Category c = p.getCategory();
        if (c != null && c.getCoverDays() != null && c.getCoverDays() > 0) {
            return new CoverResolved(c.getCoverDays(), "CATEGORY", "Nhóm " + c.getName());
        }
        int store = storeConfigRepository.findById(1)
                .map(sc -> sc.getDefaultCoverDays() != null ? sc.getDefaultCoverDays() : STORE_COVER_DEFAULT)
                .orElse(STORE_COVER_DEFAULT);
        return new CoverResolved(store, "STORE", "Mặc định cửa hàng");
    }

    int resolveUsableSellDays(Integer productId, int leadDays) {
        return stockBatchRepository.findNearestExpiry(productId, LocalDate.now())
                .map(expiry -> {
                    long daysLeft = ChronoUnit.DAYS.between(LocalDate.now(), expiry);
                    int usable = (int) daysLeft - leadDays - HSD_BUFFER_DAYS;
                    return Math.max(usable, 1);
                })
                .orElse(Integer.MAX_VALUE / 4);
    }
}
