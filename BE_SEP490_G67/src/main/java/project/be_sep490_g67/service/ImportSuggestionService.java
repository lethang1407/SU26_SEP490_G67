package project.be_sep490_g67.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.be_sep490_g67.dto.request.ImportSuggestRequest;
import project.be_sep490_g67.dto.response.ImportSuggestionDTO;
import project.be_sep490_g67.dto.response.GroupedSuggestionDTO;
import project.be_sep490_g67.dto.response.PageResponse;
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
import java.util.Locale;
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
                .parentId(p.getParent() != null ? p.getParent().getId() : null)
                .parentName(p.getParent() != null ? p.getParent().getName() : null)
                .sku(p.getSku())
                .barcode(p.getBarcode())
                .productImg(resolveImg(p))
                .primaryAttrVal(resolvePrimaryAttrVal(p))
                .secondaryAttrVal(resolveSecondaryAttrVal(p))
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

    record CoverResolved(int days, String source, String label) {
    }

    CoverResolved resolveCover(Product p, Integer panelOverride) {
        if (panelOverride != null && panelOverride > 0) {
            return new CoverResolved(panelOverride, "PANEL", "Lần nhập này");
        }
        Category c = p.getCategory();
        if (c != null && c.getCoverDays() != null && c.getCoverDays() > 0) {
            return new CoverResolved(c.getCoverDays(), "CATEGORY", "Nhóm " + c.getName());
        }
        return new CoverResolved(STORE_COVER_DEFAULT, "STORE", "Mặc định cửa hàng");
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

    @Transactional(readOnly = true)
    public PageResponse<GroupedSuggestionDTO> getGroupedSuggestions(
            String facet, Integer categoryId, String keyword, int page, int size
    ) {
        List<Product> allActive = productRepository.findAllActive();

        Map<Integer, List<Product>> childrenMap = new HashMap<>();
        List<Product> rootProducts = new ArrayList<>();

        for (Product p : allActive) {
            if (p.getParent() != null) {
                childrenMap.computeIfAbsent(p.getParent().getId(), k -> new ArrayList<>()).add(p);
            } else {
                rootProducts.add(p);
            }
        }

        Instant to = Instant.now();
        Instant from = to.minus(SALES_WINDOW_DAYS, ChronoUnit.DAYS);

        List<Integer> allProductIds = allActive.stream().map(Product::getId).toList();
        Map<Integer, Map<Integer, BigDecimal>> lastCosts = loadLastCosts(allProductIds);

        List<Integer> categoryIds = allActive.stream()
                .map(Product::getCategory)
                .filter(Objects::nonNull)
                .map(Category::getId)
                .distinct()
                .toList();
        Map<Integer, List<Supplier>> suppliersByCategory = new HashMap<>();
        if (!categoryIds.isEmpty()) {
            for (Supplier s : supplierRepository.findActiveByCategoryIds(categoryIds)) {
                if (s.getCategories() == null) continue;
                for (Category c : s.getCategories()) {
                    if (c != null && categoryIds.contains(c.getId())) {
                        suppliersByCategory.computeIfAbsent(c.getId(), k -> new ArrayList<>()).add(s);
                    }
                }
            }
        }

        Map<Integer, ImportSuggestionDTO> suggestionMap = new HashMap<>();
        Map<Integer, Double> coverDaysLeftMap = new HashMap<>();
        Map<Integer, String> facetStatusMap = new HashMap<>();

        for (Product p : allActive) {
            if (p.getParent() != null || !childrenMap.containsKey(p.getId())) {
                ImportSuggestionDTO sug = buildSuggestion(p, from, to, null, suppliersByCategory, lastCosts);
                suggestionMap.put(p.getId(), sug);

                int onHand = sug.getOnHand() != null ? sug.getOnHand() : 0;
                BigDecimal avgDaily = sug.getAvgDailyRate() != null ? sug.getAvgDailyRate() : BigDecimal.ZERO;
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
                coverDaysLeftMap.put(p.getId(), coverDaysLeft);

                String facetStatus = resolveFacet(p, onHand, avgDaily.doubleValue(), coverDaysLeft);
                facetStatusMap.put(p.getId(), facetStatus);
            }
        }

        List<GroupedSuggestionDTO> resultList = new ArrayList<>();

        for (Product r : rootProducts) {
            List<Product> children = childrenMap.get(r.getId());
            if (children == null || children.isEmpty()) {
                ImportSuggestionDTO sug = suggestionMap.get(r.getId());
                if (sug == null) continue;

                GroupedSuggestionDTO dto = GroupedSuggestionDTO.builder()
                        .id(r.getId())
                        .name(r.getName())
                        .sku(r.getSku())
                        .barcode(r.getBarcode())
                        .productImg(resolveImg(r))
                        .categoryName(r.getCategory() != null ? r.getCategory().getName() : "")
                        .unitName(r.getProductUnits() != null && !r.getProductUnits().isEmpty() ? r.getProductUnits().iterator().next().getName() : "sp")
                        .supplierName(sug.getSupplierName())
                        .sellingPrice(r.getSellingPrice())
                        .costPrice(r.getCostPrice())
                        .onHand(sug.getOnHand())
                        .avgDailyRate(sug.getAvgDailyRate())
                        .avgWeeklyRate(sug.getAvgDailyRate().multiply(BigDecimal.valueOf(7)).setScale(1, RoundingMode.HALF_UP))
                        .coverDaysLeft(coverDaysLeftMap.get(r.getId()))
                        .facetStatus(facetStatusMap.get(r.getId()))
                        .isGroup(false)
                        .variantGroups(null)
                        .build();
                resultList.add(dto);
            } else {
                Map<String, List<Product>> groupedByPrimary = new LinkedHashMap<>();
                for (Product child : children) {
                    String primaryVal = resolvePrimaryAttrVal(child);
                    groupedByPrimary.computeIfAbsent(primaryVal, k -> new ArrayList<>()).add(child);
                }

                List<GroupedSuggestionDTO.VariantGroupDTO> variantGroups = new ArrayList<>();
                int totalOnHand = 0;
                BigDecimal totalAvgDaily = BigDecimal.ZERO;

                for (Map.Entry<String, List<Product>> entry : groupedByPrimary.entrySet()) {
                    String primaryVal = entry.getKey();
                    List<Product> colorGroup = entry.getValue();

                    List<GroupedSuggestionDTO.VariantItemDTO> sizes = new ArrayList<>();
                    int groupOnHand = 0;
                    BigDecimal groupAvgDaily = BigDecimal.ZERO;

                    for (Product c : colorGroup) {
                        ImportSuggestionDTO sug = suggestionMap.get(c.getId());
                        if (sug == null) continue;

                        groupOnHand += sug.getOnHand() != null ? sug.getOnHand() : 0;
                        groupAvgDaily = groupAvgDaily.add(sug.getAvgDailyRate() != null ? sug.getAvgDailyRate() : BigDecimal.ZERO);

                        BigDecimal childAvgDaily = sug.getAvgDailyRate() != null ? sug.getAvgDailyRate() : BigDecimal.ZERO;
                        String formattedChildName = formatChildName(r, c, primaryVal);
                        GroupedSuggestionDTO.VariantItemDTO sizeDto = GroupedSuggestionDTO.VariantItemDTO.builder()
                                .id(c.getId())
                                .name(formattedChildName)
                                .primaryAttrValue(primaryVal)
                                .sizeValue(resolveSecondaryAttrVal(c))
                                .sku(c.getSku())
                                .barcode(c.getBarcode())
                                .productImg(resolveImg(c) != null ? resolveImg(c) : resolveImg(r))
                                .onHand(sug.getOnHand())
                                .sellingPrice(c.getSellingPrice())
                                .costPrice(c.getCostPrice())
                                .avgDailyRate(childAvgDaily)
                                .avgWeeklyRate(childAvgDaily.multiply(BigDecimal.valueOf(7)).setScale(1, RoundingMode.HALF_UP))
                                .suggestedQty(sug.getSuggestedQty())
                                .orderToday(sug.getOrderToday())
                                .whyFacts(sug.getWhyFacts())
                                .whyResult(sug.getWhyResult())
                                .leadTimeDays(sug.getLeadTimeDays())
                                .coverDays(sug.getCoverDays())
                                .coverSource(sug.getCoverSource())
                                .coverSourceLabel(sug.getCoverSourceLabel())
                                .costPerUnit(sug.getCostPerUnit())
                                .supplierOptions(sug.getSupplierOptions())
                                .units(sug.getUnits())
                                .build();
                        sizes.add(sizeDto);
                    }

                    totalOnHand += groupOnHand;
                    totalAvgDaily = totalAvgDaily.add(groupAvgDaily);

                    Product representative = colorGroup.get(0);
                    GroupedSuggestionDTO.VariantGroupDTO varGroup = GroupedSuggestionDTO.VariantGroupDTO.builder()
                            .primaryAttrValue(primaryVal)
                            .name(r.getName() + " - " + primaryVal)
                            .sku(sizes.size() == 1 ? sizes.get(0).getSku() : "(" + sizes.size() + " mã)")
                            .productImg(resolveImg(representative) != null ? resolveImg(representative) : resolveImg(r))
                            .sellingPrice(representative.getSellingPrice())
                            .costPrice(representative.getCostPrice())
                            .onHand(groupOnHand)
                            .avgDailyRate(groupAvgDaily)
                            .sizes(sizes)
                            .build();
                    variantGroups.add(varGroup);
                }

                Double groupCoverDaysLeft = null;
                if (totalAvgDaily.compareTo(BigDecimal.ZERO) > 0) {
                    groupCoverDaysLeft = BigDecimal.valueOf(totalOnHand)
                            .divide(totalAvgDaily, 1, RoundingMode.HALF_UP)
                            .doubleValue();
                } else if (totalOnHand > 0) {
                    groupCoverDaysLeft = 999.0;
                } else {
                    groupCoverDaysLeft = 0.0;
                }

                String groupFacet = "ok";
                boolean hasHot = false;
                boolean hasSlow = false;
                boolean hasWarn = false;
                boolean hasSeason = false;
                boolean hasStop = false;
                for (Product c : children) {
                    String childFacet = facetStatusMap.get(c.getId());
                    if ("hot".equals(childFacet)) hasHot = true;
                    else if ("slow".equals(childFacet)) hasSlow = true;
                    else if ("warn".equals(childFacet)) hasWarn = true;
                    else if ("season".equals(childFacet)) hasSeason = true;
                    else if ("stop".equals(childFacet)) hasStop = true;
                }
                if (hasHot) groupFacet = "hot";
                else if (hasSlow) groupFacet = "slow";
                else if (hasWarn) groupFacet = "warn";
                else if (hasSeason) groupFacet = "season";
                else if (hasStop) groupFacet = "stop";

                GroupedSuggestionDTO dto = GroupedSuggestionDTO.builder()
                        .id(r.getId())
                        .name(r.getName())
                        .sku(r.getSku() != null ? r.getSku() : "(" + children.size() + " phân loại)")
                        .barcode(r.getBarcode())
                        .productImg(resolveImg(r) != null ? resolveImg(r) : resolveImg(children.get(0)))
                        .categoryName(r.getCategory() != null ? r.getCategory().getName() : "")
                        .unitName(children.get(0).getProductUnits() != null && !children.get(0).getProductUnits().isEmpty() ? children.get(0).getProductUnits().iterator().next().getName() : "sp")
                        .supplierName(variantGroups.isEmpty() ? null : variantGroups.get(0).getSizes().get(0).getCostPerUnit() != null ? children.get(0).getCategory() != null && children.get(0).getCategory().getDefaultSupplier() != null ? children.get(0).getCategory().getDefaultSupplier().getName() : null : null)
                        .sellingPrice(children.get(0).getSellingPrice())
                        .costPrice(children.get(0).getCostPrice())
                        .onHand(totalOnHand)
                        .avgDailyRate(totalAvgDaily)
                        .avgWeeklyRate(totalAvgDaily.multiply(BigDecimal.valueOf(7)).setScale(1, RoundingMode.HALF_UP))
                        .coverDaysLeft(groupCoverDaysLeft)
                        .facetStatus(groupFacet)
                        .isGroup(true)
                        .variantGroups(variantGroups)
                        .build();
                resultList.add(dto);
            }
        }

        List<GroupedSuggestionDTO> filteredList = resultList.stream()
                .filter(g -> {
                    if (categoryId == null) return true;
                    if (g.getIsGroup()) {
                        List<Product> children = childrenMap.get(g.getId());
                        return children.stream().anyMatch(c -> c.getCategory() != null && Objects.equals(c.getCategory().getId(), categoryId));
                    } else {
                        Product r = allActive.stream().filter(p -> p.getId().equals(g.getId())).findFirst().orElse(null);
                        return r != null && r.getCategory() != null && Objects.equals(r.getCategory().getId(), categoryId);
                    }
                })
                .filter(g -> {
                    if (keyword == null || keyword.isBlank()) return true;
                    String[] words = keyword.trim().toLowerCase(Locale.ROOT).split("\\s+");
                    for (String word : words) {
                        boolean wordMatched = false;
                        if (g.getName().toLowerCase(Locale.ROOT).contains(word)
                                || (g.getSku() != null && g.getSku().toLowerCase(Locale.ROOT).contains(word))
                                || (g.getBarcode() != null && g.getBarcode().toLowerCase(Locale.ROOT).contains(word))) {
                            wordMatched = true;
                        }
                        if (!wordMatched && g.getIsGroup()) {
                            List<Product> children = childrenMap.get(g.getId());
                            if (children != null) {
                                for (Product c : children) {
                                    if (c.getName().toLowerCase(Locale.ROOT).contains(word)
                                            || (c.getSku() != null && c.getSku().toLowerCase(Locale.ROOT).contains(word))
                                            || (c.getBarcode() != null && c.getBarcode().toLowerCase(Locale.ROOT).contains(word))) {
                                        wordMatched = true;
                                        break;
                                    }
                                    for (var attr : c.getProductAttributes()) {
                                        if (attr.getValue() != null && attr.getValue().toLowerCase(Locale.ROOT).contains(word)) {
                                            wordMatched = true;
                                            break;
                                        }
                                    }
                                    if (wordMatched) break;
                                }
                            }
                        }
                        if (!wordMatched) {
                            return false;
                        }
                    }
                    return true;
                })
                .filter(g -> {
                    if (facet == null || facet.isBlank() || "all".equalsIgnoreCase(facet)) return true;
                    if (g.getIsGroup()) {
                        List<Product> children = childrenMap.get(g.getId());
                        return children.stream().anyMatch(c -> facet.equalsIgnoreCase(facetStatusMap.get(c.getId())));
                    } else {
                        return facet.equalsIgnoreCase(g.getFacetStatus());
                    }
                })
                .toList();

        int total = filteredList.size();
        int fromIdx = Math.min(page * size, total);
        int toIdx = Math.min(fromIdx + size, total);
        List<GroupedSuggestionDTO> content = filteredList.subList(fromIdx, toIdx);

        return PageResponse.<GroupedSuggestionDTO>builder()
                .content(content)
                .page(page)
                .size(safeSize(size))
                .totalElements(total)
                .totalPages(size == 0 ? 0 : (int) Math.ceil((double) total / size))
                .build();
    }

    private int safeSize(int size) {
        return size <= 0 ? 10 : size;
    }

    List<String> resolveAllAttrVals(Product p) {
        List<String> result = new ArrayList<>();
        if (p != null && p.getProductAttributes() != null && !p.getProductAttributes().isEmpty()) {
            for (var pa : p.getProductAttributes()) {
                if (pa.getAttribute() != null && Boolean.TRUE.equals(pa.getAttribute().getIsPrimary())) {
                    if (pa.getValue() != null && !pa.getValue().isBlank()) {
                        result.add(pa.getValue().trim());
                    }
                }
            }
            for (var pa : p.getProductAttributes()) {
                if (pa.getAttribute() == null || !Boolean.TRUE.equals(pa.getAttribute().getIsPrimary())) {
                    if (pa.getValue() != null && !pa.getValue().isBlank()) {
                        String val = pa.getValue().trim();
                        if (!result.contains(val)) {
                            result.add(val);
                        }
                    }
                }
            }
        }
        return result;
    }

    String resolvePrimaryAttrVal(Product p) {
        List<String> vals = resolveAllAttrVals(p);
        return !vals.isEmpty() ? vals.get(0) : "";
    }

    String resolveSecondaryAttrVal(Product p) {
        List<String> vals = resolveAllAttrVals(p);
        return vals.size() > 1 ? vals.get(1) : "";
    }

    String resolveFacet(Product p, int onHand, double avgDaily, Double coverDaysLeft) {
        String status = p.getStatus() == null ? "active" : p.getStatus();
        if ("inactive".equalsIgnoreCase(status)) {
            return "stop";
        }
        if (onHand <= 0) {
            return avgDaily > slowThreshold() ? "hot" : "slow";
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

    double slowThreshold() {
        return slowThresholdValue();
    }

    private double slowThresholdValue() {
        return 0.1;
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

    String formatChildName(Product parent, Product child, String primaryVal) {
        String existingName = child.getName();
        if (existingName != null && !existingName.isBlank()
                && !existingName.contains("Nhom San Pham") && !existingName.contains("Sản Phẩm Cha")
                && existingName.contains("-")) {
            return existingName;
        }

        String rawParent = parent != null && parent.getName() != null ? parent.getName() : "";
        String cleanParent = rawParent.replaceAll("(?i)\\s*\\([^)]*\\)", "").trim();

        List<String> attrVals = resolveAllAttrVals(child);

        StringBuilder sb = new StringBuilder(cleanParent);
        for (String val : attrVals) {
            if (val != null && !val.isBlank() && !"—".equals(val)) {
                sb.append("-").append(val.trim());
            }
        }
        return sb.toString();
    }

    String resolveUnit(Product p) {
        if (p != null && p.getProductUnits() != null && !p.getProductUnits().isEmpty()) {
            for (var u : p.getProductUnits()) {
                if (u.getUnitBase() != null && u.getUnitBase().compareTo(BigDecimal.ONE) == 0) {
                    return u.getName();
                }
            }
            return p.getProductUnits().iterator().next().getName();
        }
        return "";
    }

    String resolveImg(Product p) {
        if (p != null && p.getProductImages() != null && !p.getProductImages().isEmpty()) {
            return p.getProductImages().iterator().next().getUrl();
        }
        return null;
    }
}
