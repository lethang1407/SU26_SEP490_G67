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
import project.be_sep490_g67.entity.Supplier;
import project.be_sep490_g67.repository.BatchLocationRepository;
import project.be_sep490_g67.repository.ProductRepository;
import project.be_sep490_g67.repository.SalesOrderDetailRepository;
import project.be_sep490_g67.repository.StockBatchRepository;
import project.be_sep490_g67.repository.StoreConfigRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

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

        List<ImportSuggestionDTO> result = new ArrayList<>();
        for (Product p : products) {
            result.add(buildSuggestion(p, from, to, overrides.get(p.getId())));
        }
        return result;
    }

    ImportSuggestionDTO buildSuggestion(Product p, Instant from, Instant to, Integer panelCoverOverride) {
        Long sold = salesOrderDetailRepository.sumQtyByProductAndDateRange(p.getId(), from, to);
        long soldQty = sold == null ? 0L : sold;
        BigDecimal avgDaily = BigDecimal.valueOf(soldQty)
                .divide(BigDecimal.valueOf(SALES_WINDOW_DAYS), 2, RoundingMode.HALF_UP);

        Long onHandRaw = batchLocationRepository.sumOnHandByProductId(p.getId());
        int onHand = onHandRaw == null ? 0 : onHandRaw.intValue();

        Supplier supplier = resolveSupplier(p);
        int leadDays = supplier != null && supplier.getLeadTimeDays() != null
                ? supplier.getLeadTimeDays()
                : DEFAULT_LEAD_DAYS;

        CoverResolved cover = resolveCover(p, panelCoverOverride);

        int usableSellDays = resolveUsableSellDays(p.getId(), leadDays);
        double avg = avgDaily.doubleValue();
        double horizon = leadDays + cover.days + SAFETY_DAYS;
        double soqRaw = Math.max(0, avg * horizon - onHand);
        double soqCapped = usableSellDays < Integer.MAX_VALUE
                ? Math.min(soqRaw, avg * usableSellDays)
                : soqRaw;
        int suggestedQty = (int) Math.ceil(soqCapped);
        if (suggestedQty == 0 && onHand <= 0 && avg > 0) {
            suggestedQty = (int) Math.ceil(avg * Math.max(cover.days, 1));
        }

        boolean orderToday = onHand <= 0 || (avg > 0 && onHand / avg <= leadDays + SAFETY_DAYS);

        String unitHint = "";
        String whyFacts = String.format(
                "%s · ~%s/%s · NCC giao ~%d ngày%s",
                onHand <= 0 ? "Hết" : "Còn " + onHand,
                avgDaily.stripTrailingZeros().toPlainString(),
                "ngày",
                leadDays,
                usableSellDays < 30 ? " · HSD ngắn → còn bán ~" + usableSellDays + " ngày sau khi về" : ""
        );
        String whyResult = String.format(
                "→ %s, gợi ý nhập %d%s",
                orderToday ? "Đặt hôm nay" : "Có thể lên lịch",
                suggestedQty,
                unitHint
        );

        return ImportSuggestionDTO.builder()
                .productId(p.getId())
                .productName(p.getName())
                .whyFacts(whyFacts)
                .whyResult(whyResult)
                .suggestedQty(suggestedQty)
                .orderToday(orderToday)
                .supplierId(supplier != null ? supplier.getId() : null)
                .supplierName(supplier != null ? supplier.getName() : null)
                .leadTimeDays(leadDays)
                .coverDays(cover.days)
                .coverSource(cover.source)
                .coverSourceLabel(cover.label)
                .costPerUnit(p.getCostPrice() != null ? p.getCostPrice() : BigDecimal.ZERO)
                .onHand(onHand)
                .avgDailyRate(avgDaily)
                .build();
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

    Supplier resolveSupplier(Product p) {
        Category c = p.getCategory();
        if (c != null && c.getDefaultSupplier() != null) {
            return c.getDefaultSupplier();
        }
        if (c != null && c.getSuppliers() != null && !c.getSuppliers().isEmpty()) {
            return c.getSuppliers().iterator().next();
        }
        return null;
    }

    /** usableSellDays after arrival; large number = HSD không chặn */
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
