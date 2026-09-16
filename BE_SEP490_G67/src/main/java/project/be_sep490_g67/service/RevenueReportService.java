package project.be_sep490_g67.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.be_sep490_g67.dto.response.PageResponse;
import project.be_sep490_g67.dto.response.RevenueReportOverviewResponse;
import project.be_sep490_g67.dto.response.RevenueReportOverviewResponse.*;
import project.be_sep490_g67.dto.response.RevenueStaffOptionResponse;
import project.be_sep490_g67.dto.response.RevenueTransactionRowResponse;
import project.be_sep490_g67.entity.ReturnOrder;
import project.be_sep490_g67.entity.ReturnOrderDetail;
import project.be_sep490_g67.entity.SalesOrder;
import project.be_sep490_g67.entity.User;
import project.be_sep490_g67.exception.AppException;
import project.be_sep490_g67.exception.ErrorCode;
import project.be_sep490_g67.repository.*;
import project.be_sep490_g67.utils.DebtCalculator;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class RevenueReportService {

    SalesOrderDetailRepository salesOrderDetailRepository;
    SalesOrderRepository salesOrderRepository;
    StockMovementRepository stockMovementRepository;
    ReturnOrderRepository returnOrderRepository;
    ReturnOrderDetailRepository returnOrderDetailRepository;
    DebtPaymentRepository debtPaymentRepository;
    UserRepository userRepository;

    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    /**
     * Các mã PTTT cùng nghĩa "chuyển khoản" đang tồn tại trong dữ liệu.
     */
    private static final List<String> TRANSFER_ALIASES = List.of("TRANSFER", "BANK", "BANK_TRANSFER");

    /**
     * IN () rỗng không hợp lệ, nên khi không lọc PTTT vẫn truyền một giá trị giả.
     */
    private static final List<String> NO_METHOD_FILTER = List.of("__ALL__");

    // ══ Highlight thresholds ══════════════════════════════════════
    // Ngưỡng dựa trên benchmark ngành tạp hoá/bán lẻ VN:
    // - Tỷ lệ trả hàng trung bình ngành FMCG/tạp hoá: 1–3%
    //   (Capital One Shopping 2026: bán lẻ chung 8.72%, nhưng grocery thấp hơn)
    // - Biến động doanh thu tự nhiên giữa các tháng: +-5%
    // - Biên lợi nhuận gộp trung bình cửa hàng tạp hoá: 15–25%
    //   (COGS chiếm 70–75% doanh thu — FMI/VantaInsights 2026)
    // Nguyên tắc: ngưỡng = ~gấp đôi biến động bình thường

    /**
     * Doanh thu thuần tăng > X% so với kỳ trước -> positive
     */
    private static final double THRESHOLD_REVENUE_GROWTH_PCT = 10.0;

    /**
     * Doanh thu thuần giảm > X% so với kỳ trước -> warning
     */
    private static final double THRESHOLD_REVENUE_DECLINE_PCT = -10.0;

    /**
     * Tỷ lệ trả hàng > X% trên doanh thu gộp -> warning
     * (ngành tạp hoá bình thường 1–3%, ngưỡng 5% = gấp đôi)
     */
    private static final double THRESHOLD_RETURN_RATE_PCT = 5.0;

    /**
     * Biên lợi nhuận giảm > X điểm phần trăm so với kỳ trước -> warning
     * (biên LN gộp tạp hoá 15–25%, giảm 5pp = mất ~1/4 lợi nhuận)
     */
    private static final double THRESHOLD_MARGIN_DROP_PP = 5.0;

    /**
     * Biên lợi nhuận âm (lỗ gộp) -> warning
     */
    private static final double THRESHOLD_NEGATIVE_MARGIN = 0.0;

    /**
     * Giá vốn tăng > X% so với kỳ trước -> warning
     */
    private static final double THRESHOLD_COGS_SPIKE_PCT = 15.0;

    /**
     * Số tháng tối thiểu để phát highlight best/worst month
     */
    private static final int MIN_MONTHS_FOR_PEAK = 3;

    //  Overview endpoint
    @Transactional(readOnly = true)
    public RevenueReportOverviewResponse overview(
            LocalDate from, LocalDate to,
            String paymentMethod, Integer staffId
    ) {
        InstantRange range = resolveRange(from, to);
        ReportFilter filter = resolveFilter(paymentMethod, staffId);

        PeriodTotals current = computeTotals(range, filter);

        // Kỳ trước: khoảng liền trước, cùng số ngày.
        long days = Duration.between(range.from(), range.to()).toDays();
        InstantRange previousRange = new InstantRange(range.from().minus(Duration.ofDays(days)), range.from());
        PeriodTotals previous = computeTotals(previousRange, filter);

        List<MonthBucket> months = buildMonthBuckets(range, filter);
        List<PeriodPoint> series = months.stream().map(this::toPeriodPoint).toList();

        return RevenueReportOverviewResponse.builder()
                .summary(buildSummary(current, previous, series))
                .series(series)
                .paymentBreakdowns(buildPaymentBreakdowns(range, filter))
                .paymentSummary(buildPaymentSummary(range, filter, current))
                .paymentSeries(months.stream().map(this::toPaymentSeriesPoint).toList())
                .adjustments(buildAdjustments(range, filter, current, months))
                .highlights(buildHighlights(current, previous, series))
                .build();
    }

    //  Transactions endpoint (paginated)
    @Transactional(readOnly = true)
    public PageResponse<RevenueTransactionRowResponse> transactions(
            LocalDate from, LocalDate to,
            String paymentMethod, Integer staffId,
            String keyword, int page, int size
    ) {
        InstantRange range = resolveRange(from, to);
        ReportFilter filter = resolveFilter(paymentMethod, staffId);
        String kw = keyword == null || keyword.isBlank() ? null : keyword.trim();

        List<SalesOrder> orders = salesOrderRepository.findRevenueTransactions(
                range.from(), range.to(), filter.allMethods(), filter.methods(), filter.staffId(), kw);
        List<ReturnOrder> returns = returnOrderRepository.findRevenueReturns(
                range.from(), range.to(), filter.allMethods(), filter.methods(), filter.staffId(), kw);

        Map<Integer, String> staffNames = loadStaffNames(Stream.concat(
                orders.stream().map(SalesOrder::getCreatedBy),
                returns.stream().map(ReturnOrder::getCreatedBy)));

        // Trạng thái "đã trả một phần" của phiếu bán cần biết đơn đó đã có phiếu trả nào chưa,
        // kể cả phiếu trả lập ngoài kỳ đang xem.
        List<Integer> orderIds = orders.stream().map(SalesOrder::getId).toList();
        Map<Integer, List<ReturnOrder>> returnsByOrder = orderIds.isEmpty()
                ? Map.of()
                : returnOrderRepository.findAllBySalesOrderIds(orderIds).stream()
                .collect(Collectors.groupingBy(r -> r.getSalesOrder().getId()));

        Map<Integer, BigDecimal[]> lineTotalsByOrder = new HashMap<>();
        if (!orderIds.isEmpty()) {
            for (Object[] r : salesOrderDetailRepository.sumGrossAndDiscountByOrderIds(orderIds)) {
                lineTotalsByOrder.put(((Number) r[0]).intValue(), new BigDecimal[]{toBd(r[1]), toBd(r[2])});
            }
        }

        List<RevenueTransactionRowResponse> rows = new ArrayList<>(orders.size() + returns.size());
        orders.forEach(o -> rows.add(toSaleRow(o, staffNames, returnsByOrder, lineTotalsByOrder)));
        returns.forEach(r -> rows.add(toReturnRow(r, staffNames)));
        rows.sort(Comparator.comparing(
                RevenueTransactionRowResponse::getCreatedAt,
                Comparator.nullsLast(Comparator.reverseOrder())));

        return paginate(rows, page, size);
    }

    /**
     * Lựa chọn cho dropdown "Nhân viên bán hàng": chủ cửa hàng đứng đầu, sau đó nhân viên
     * xếp theo tên A→Z (không phân biệt hoa thường, theo quy tắc chữ tiếng Việt).
     */
    @Transactional(readOnly = true)
    public List<RevenueStaffOptionResponse> staffOptions() {
        java.text.Collator collator = java.text.Collator.getInstance(new Locale("vi", "VN"));
        collator.setStrength(java.text.Collator.PRIMARY);

        return userRepository.findAllActiveSellers().stream()
                .map(u -> RevenueStaffOptionResponse.builder()
                        .id(u.getId())
                        .name(u.getFullName() != null ? u.getFullName() : u.getUsername())
                        .owner(isOwner(u))
                        .build())
                .sorted(Comparator.comparing(RevenueStaffOptionResponse::isOwner).reversed()
                        .thenComparing(RevenueStaffOptionResponse::getName,
                                Comparator.nullsLast(collator::compare)))
                .toList();
    }

    /** Chủ cửa hàng = tài khoản chỉ mang role MANAGER (cùng quy ước StaffService). */
    private boolean isOwner(User user) {
        return user.getRoles() != null
                && !user.getRoles().isEmpty()
                && user.getRoles().stream().allMatch(r -> "MANAGER".equalsIgnoreCase(r.getName()));
    }

    //  Internal: compute totals for a period

    /**
     * Số liệu của một khoảng thời gian.
     * Tổng chiết khấu = CK dòng + CK hóa đơn.
     * Doanh thu thuần = Σ totalAmount − Σ refundAmount; totalAmount đã trừ cả hai loại CK.
     * Giá vốn = giá vốn hàng xuất bán − giá vốn hàng khách trả lại kho.
     * Lợi nhuận = Doanh thu thuần − Giá vốn.
     */
    private PeriodTotals computeTotals(InstantRange range, ReportFilter f) {
        Object[] grossRow = firstRow(salesOrderDetailRepository.sumGrossAndDetailDiscount(
                range.from(), range.to(), f.allMethods(), f.methods(), f.staffId()));
        BigDecimal gross = toBd(grossRow[0]);
        BigDecimal detailDiscount = toBd(grossRow[1]);

        Object[] orderRow = firstRow(salesOrderRepository.sumRevenueOrderTotals(
                range.from(), range.to(), f.allMethods(), f.methods(), f.staffId()));
        BigDecimal totalAmount = toBd(orderRow[0]);
        BigDecimal orderDiscount = toBd(orderRow[1]);
        long orderCount = orderRow[2] == null ? 0 : ((Number) orderRow[2]).longValue();
        BigDecimal maxOrderValue = toBd(orderRow[3]);
        BigDecimal minOrderValue = toBd(orderRow[4]);

        BigDecimal refund = toBd(returnOrderRepository.sumRevenueRefund(
                range.from(), range.to(), f.allMethods(), f.methods(), f.staffId()));

        BigDecimal saleCogs = toBd(stockMovementRepository.sumRevenueSaleCogs(
                range.from(), range.to(), f.allMethods(), f.methods(), f.staffId()));
        BigDecimal returnCogs = toBd(stockMovementRepository.sumRevenueReturnCogs(
                range.from(), range.to(), f.allMethods(), f.methods(), f.staffId()));

        BigDecimal netRevenue = totalAmount.subtract(refund);
        BigDecimal cogs = saleCogs.subtract(returnCogs);

        return new PeriodTotals(
                gross,
                detailDiscount.add(orderDiscount),
                refund,
                netRevenue,
                cogs,
                netRevenue.subtract(cogs),
                orderCount,
                maxOrderValue,
                minOrderValue);
    }

    //  Build KPI summary

    private Summary buildSummary(PeriodTotals current, PeriodTotals previous, List<PeriodPoint> series) {
        // Trung bình mỗi đơn = doanh thu thuần / số đơn có doanh thu thực.
        BigDecimal avgOrderValue = current.orderCount() == 0
                ? BigDecimal.ZERO
                : current.netRevenue().divide(BigDecimal.valueOf(current.orderCount()), 0, RoundingMode.HALF_UP);

        String bestPeriod = series.stream()
                .max(Comparator.comparing(PeriodPoint::getNetRevenue))
                .map(PeriodPoint::getLabel).orElse(null);
        String worstPeriod = series.stream()
                .min(Comparator.comparing(PeriodPoint::getNetRevenue))
                .map(PeriodPoint::getLabel).orElse(null);

        return Summary.builder()
                .grossRevenue(current.gross())
                .netRevenue(current.netRevenue())
                .netRevenueChangePct(deltaPercent(current.netRevenue(), previous.netRevenue()))
                .profit(current.profit())
                .profitChangePct(deltaPercent(current.profit(), previous.profit()))
                .profitMarginPct(marginPct(current.profit(), current.netRevenue()))
                .averageOrderValue(avgOrderValue)
                .orderCount(current.orderCount())
                .orderCountChangePct(deltaPercent(
                        BigDecimal.valueOf(current.orderCount()), BigDecimal.valueOf(previous.orderCount())))
                .invoiceCount(current.orderCount())
                .maxOrderValue(current.maxOrderValue())
                .minOrderValue(current.minOrderValue())
                .cogs(current.cogs())
                .returnAmount(current.refund())
                .returnRatePct(ratePct(current.refund(), current.gross()))
                .discountAmount(current.discount())
                .discountRatePct(ratePct(current.discount(), current.gross()))
                .bestPeriodLabel(bestPeriod)
                .worstPeriodLabel(worstPeriod)
                .build();
    }

    //  Monthly buckets (revenue series, return trend, payment trend)

    /**
     * Một bucket cho mỗi tháng của kỳ, kể cả tháng không có giao dịch.
     *
     * <p>Ranh giới tháng tính theo giờ Việt Nam ở phía Java rồi gọi lại computeTotals,
     * thay vì GROUP BY MONTH(createdAt) trong SQL: kết nối DB chạy UTC nên MONTH() sẽ đẩy
     * đơn lập từ 00:00 đến 06:59 ngày mùng 1 sang tháng trước.
     */
    private List<MonthBucket> buildMonthBuckets(InstantRange range, ReportFilter filter) {
        YearMonth start = YearMonth.from(range.from().atZone(ZONE));
        YearMonth end = YearMonth.from(range.to().minusNanos(1).atZone(ZONE));
        boolean multiYear = start.getYear() != end.getYear();

        List<MonthBucket> buckets = new ArrayList<>();
        for (YearMonth ym = start; !ym.isAfter(end); ym = ym.plusMonths(1)) {
            Instant monthFrom = ym.atDay(1).atStartOfDay(ZONE).toInstant();
            Instant monthTo = ym.plusMonths(1).atDay(1).atStartOfDay(ZONE).toInstant();
            InstantRange bucket = new InstantRange(
                    monthFrom.isBefore(range.from()) ? range.from() : monthFrom,
                    monthTo.isAfter(range.to()) ? range.to() : monthTo);

            String label = multiYear
                    ? "T" + ym.getMonthValue() + "/" + ym.getYear()
                    : "T" + ym.getMonthValue();

            buckets.add(new MonthBucket(label, computeTotals(bucket, filter), revenueByGroup(bucket, filter)));
        }
        return buckets;
    }

    private PeriodPoint toPeriodPoint(MonthBucket m) {
        Double margin = marginPct(m.totals().profit(), m.totals().netRevenue());
        return PeriodPoint.builder()
                .label(m.label())
                .netRevenue(m.totals().netRevenue())
                .cogs(m.totals().cogs())
                .profit(m.totals().profit())
                .profitMarginPct(margin == null ? 0.0 : margin)
                .build();
    }

    /**
     * Doanh thu hóa đơn (sau CK, trước trả hàng) theo nhóm PTTT của tháng.
     */
    private PaymentSeriesPoint toPaymentSeriesPoint(MonthBucket m) {
        return PaymentSeriesPoint.builder()
                .label(m.label())
                .transfer(m.revenueByGroup().getOrDefault("TRANSFER", BigDecimal.ZERO))
                .cash(m.revenueByGroup().getOrDefault("CASH", BigDecimal.ZERO))
                .debt(m.revenueByGroup().getOrDefault("DEBT", BigDecimal.ZERO))
                .build();
    }

    private Map<String, BigDecimal> revenueByGroup(InstantRange range, ReportFilter filter) {
        Map<String, BigDecimal> byGroup = new HashMap<>();
        for (Object[] row : salesOrderRepository.sumRevenueByPaymentMethod(
                range.from(), range.to(), filter.allMethods(), filter.methods(), filter.staffId())) {
            byGroup.merge(paymentGroup(row[0] == null ? null : row[0].toString()), toBd(row[1]), BigDecimal::add);
        }
        return byGroup;
    }

    //  Build payment method breakdown

    /**
     * Doanh thu theo PTTT. Đơn bán nợ là nhóm DEBT, các alias chuyển khoản gộp về TRANSFER;
     * doanh thu thuần của từng nhóm trừ refund của phiếu trả có đơn gốc cùng nhóm.
     */
    private List<PaymentBreakdown> buildPaymentBreakdowns(InstantRange range, ReportFilter filter) {
        Map<String, BigDecimal> grossByGroup = new LinkedHashMap<>();
        Map<String, Long> countByGroup = new LinkedHashMap<>();
        for (Object[] row : salesOrderRepository.sumRevenueByPaymentMethod(
                range.from(), range.to(), filter.allMethods(), filter.methods(), filter.staffId())) {
            String group = paymentGroup(row[0] == null ? null : row[0].toString());
            grossByGroup.merge(group, toBd(row[1]), BigDecimal::add);
            countByGroup.merge(group, row[2] == null ? 0L : ((Number) row[2]).longValue(), Long::sum);
        }

        Map<String, BigDecimal> netByGroup = new LinkedHashMap<>();
        for (Map.Entry<String, BigDecimal> e : grossByGroup.entrySet()) {
            BigDecimal refund = toBd(returnOrderRepository.sumRevenueRefund(
                    range.from(), range.to(), false, methodsOfGroup(e.getKey()), filter.staffId()));
            netByGroup.put(e.getKey(), e.getValue().subtract(refund));
        }

        BigDecimal totalNet = netByGroup.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);

        return grossByGroup.keySet().stream()
                .map(group -> PaymentBreakdown.builder()
                        .paymentMethod(group)
                        .invoiceCount(countByGroup.getOrDefault(group, 0L))
                        .grossRevenue(grossByGroup.get(group))
                        .netRevenue(netByGroup.get(group))
                        .ratioPct(ratePct(netByGroup.get(group), totalNet))
                        .build())
                .sorted(Comparator.comparing(PaymentBreakdown::getNetRevenue).reversed())
                .toList();
    }

    /**
     * Còn ghi nợ = nợ còn lại (theo {@link DebtCalculator#remaining}) của các đơn bán nợ lập
     * trong kỳ, tính cả các lần trả nợ đến thời điểm hiện tại. Đã thu thực = doanh thu thuần
     * trừ phần còn nợ đó.
     */
    private PaymentSummary buildPaymentSummary(InstantRange range, ReportFilter filter, PeriodTotals totals) {
        List<Object[]> debtOrders = salesOrderRepository.findRevenueDebtOrders(
                range.from(), range.to(), filter.allMethods(), filter.methods(), filter.staffId());

        Map<Integer, BigDecimal> debtPaidByOrder = new HashMap<>();
        if (!debtOrders.isEmpty()) {
            List<Integer> ids = debtOrders.stream().map(r -> ((Number) r[0]).intValue()).toList();
            for (Object[] row : debtPaymentRepository.sumPaidBySalesOrderIds(ids)) {
                debtPaidByOrder.put(((Number) row[0]).intValue(), toBd(row[1]));
            }
        }

        BigDecimal outstanding = BigDecimal.ZERO;
        long stillOwing = 0;
        for (Object[] row : debtOrders) {
            BigDecimal remaining = DebtCalculator.remaining(
                    toBd(row[1]), toBd(row[2]), debtPaidByOrder.get(((Number) row[0]).intValue()));
            if (remaining.signum() > 0) {
                outstanding = outstanding.add(remaining);
                stillOwing++;
            }
        }

        BigDecimal collected = totals.netRevenue().subtract(outstanding);
        return PaymentSummary.builder()
                .collectedAmount(collected.signum() < 0 ? BigDecimal.ZERO : collected)
                .outstandingDebt(outstanding)
                .debtOrderCount(stillOwing)
                .build();
    }

    //  Build adjustments tab data
    private AdjustmentSummary buildAdjustments(
            InstantRange range, ReportFilter filter, PeriodTotals totals, List<MonthBucket> months) {
        List<ReturnReasonRow> reasonRows = returnOrderRepository.topReturnReasons(
                        range.from(), range.to(), filter.allMethods(), filter.methods(), filter.staffId())
                .stream()
                .map(r -> {
                    BigDecimal amount = toBd(r[2]);
                    return ReturnReasonRow.builder()
                            .reason(r[0] != null ? r[0].toString() : "Không rõ lý do")
                            .count(((Number) r[1]).longValue())
                            .amount(amount)
                            .ratioPct(ratePct(amount, totals.refund()))
                            .build();
                })
                .toList();

        List<MonthlyReturnPoint> monthlyReturns = months.stream()
                .map(m -> {
                    Double rate = ratePct(m.totals().refund(), m.totals().gross());
                    return MonthlyReturnPoint.builder()
                            .label(m.label())
                            .refundAmount(m.totals().refund())
                            .returnRatePct(rate == null ? 0.0 : rate)
                            .build();
                })
                .toList();

        return AdjustmentSummary.builder()
                .returnAmount(totals.refund())
                .returnRatePct(ratePct(totals.refund(), totals.gross()))
                .discountAmount(totals.discount())
                .discountRatePct(ratePct(totals.discount(), totals.gross()))
                .topReturnReasons(reasonRows)
                .returnSlips(buildReturnSlips(range, filter))
                .monthlyReturns(monthlyReturns)
                .build();
    }

    /**
     * Phiếu trả trong kỳ kèm dòng hàng. Lý do lấy từ phiếu; phiếu không ghi thì lấy ghi chú
     * đầu tiên của dòng hàng.
     */
    private List<ReturnSlip> buildReturnSlips(InstantRange range, ReportFilter filter) {
        List<ReturnOrder> returns = returnOrderRepository.findRevenueReturns(
                range.from(), range.to(), filter.allMethods(), filter.methods(), filter.staffId(), null);
        if (returns.isEmpty()) return List.of();

        Map<Integer, List<ReturnOrderDetail>> detailsByReturn = returnOrderDetailRepository
                .findByReturnOrderIdsWithProduct(returns.stream().map(ReturnOrder::getId).toList())
                .stream()
                .collect(Collectors.groupingBy(d -> d.getReturnOrder().getId()));

        return returns.stream()
                .map(r -> {
                    List<ReturnOrderDetail> details = detailsByReturn.getOrDefault(r.getId(), List.of());
                    String reason = r.getReturnReason();
                    if (reason == null || reason.isBlank()) {
                        reason = details.stream()
                                .map(ReturnOrderDetail::getNote)
                                .filter(n -> n != null && !n.isBlank())
                                .findFirst()
                                .orElse(null);
                    }
                    return ReturnSlip.builder()
                            .returnId(r.getId())
                            .returnCode(r.getReturnCode())
                            .createdAt(r.getCreatedAt())
                            .customerName(customerName(r.getSalesOrder()))
                            .refundAmount(toBd(r.getRefundAmount()))
                            .reason(reason)
                            .items(details.stream()
                                    .map(d -> ReturnSlipItem.builder()
                                            .productName(d.getProduct().getName())
                                            .quantity(d.getQuantity())
                                            .unitName(d.getUnitName())
                                            .build())
                                    .toList())
                            .build();
                })
                .toList();
    }

    /**
     * Điểm đáng chú ý trên tab Tổng quan. Chỉ phát khi biến động vượt ngưỡng (xem các
     * hằng THRESHOLD_* ở đầu class). Thứ tự: tích cực trước, cảnh báo sau.
     */
    private List<Highlight> buildHighlights(PeriodTotals current, PeriodTotals previous, List<PeriodPoint> series) {
        List<Highlight> highlights = new ArrayList<>();

        Double revGrowth = deltaPercent(current.netRevenue(), previous.netRevenue());

        // Rule 1: Doanh thu thuần tăng mạnh
        if (revGrowth != null && revGrowth > THRESHOLD_REVENUE_GROWTH_PCT) {
            highlights.add(Highlight.builder()
                    .tone("positive")
                    .message(String.format("Doanh thu thuần tăng %.1f%% so với kỳ trước", revGrowth))
                    .build());
        }

        // Rule 2: Doanh thu thuần giảm mạnh
        if (revGrowth != null && revGrowth < THRESHOLD_REVENUE_DECLINE_PCT) {
            highlights.add(Highlight.builder()
                    .tone("warning")
                    .message(String.format("Doanh thu thuần giảm %.1f%% so với kỳ trước", Math.abs(revGrowth)))
                    .recommendation("Xem xét chiến lược bán hàng và khuyến mãi")
                    .build());
        }

        // Rule 3: Tỷ lệ trả hàng cao
        Double returnRate = ratePct(current.refund(), current.gross());
        if (returnRate != null && returnRate > THRESHOLD_RETURN_RATE_PCT) {
            highlights.add(Highlight.builder()
                    .tone("warning")
                    .message(String.format(
                            "Tỷ lệ trả hàng %.1f%% — cao hơn mức trung bình ngành (1–3%%)", returnRate))
                    .recommendation("Rà soát nhà cung cấp và điều kiện bảo quản")
                    .build());
        }

        // Rule 4: Biên lợi nhuận giảm sâu
        Double prevMargin = previous.netRevenue().signum() > 0
                ? marginPct(previous.profit(), previous.netRevenue()) : null;
        Double currMargin = current.netRevenue().signum() > 0
                ? marginPct(current.profit(), current.netRevenue()) : null;
        if (prevMargin != null && currMargin != null && currMargin < prevMargin - THRESHOLD_MARGIN_DROP_PP) {
            highlights.add(Highlight.builder()
                    .tone("warning")
                    .message(String.format(
                            "Biên lợi nhuận giảm từ %.1f%% xuống %.1f%% (giảm %.1f điểm %%)",
                            prevMargin, currMargin, prevMargin - currMargin))
                    .recommendation("Kiểm tra giá nhập hàng hoặc mức chiết khấu")
                    .build());
        }

        // Rule 5: Biên lợi nhuận âm — lỗ gộp cả kỳ
        if (currMargin != null && currMargin < THRESHOLD_NEGATIVE_MARGIN) {
            highlights.add(Highlight.builder()
                    .tone("warning")
                    .message(String.format(
                            "Biên lợi nhuận âm (%.1f%%) — giá vốn đang vượt doanh thu thuần", currMargin))
                    .recommendation("Kiểm tra ngay giá nhập và chính sách chiết khấu, tránh bán dưới giá vốn")
                    .build());
        }

        // Rule 6: Giá vốn tăng đột biến
        Double cogsGrowth = deltaPercent(current.cogs(), previous.cogs());
        if (cogsGrowth != null && cogsGrowth > THRESHOLD_COGS_SPIKE_PCT) {
            highlights.add(Highlight.builder()
                    .tone("warning")
                    .message(String.format("Giá vốn hàng bán tăng %.1f%% so với kỳ trước", cogsGrowth))
                    .recommendation("Kiểm tra giá nhập từ nhà cung cấp hoặc thay đổi cơ cấu sản phẩm")
                    .build());
        }
        // Rule 7: Tháng doanh thu cao nhất trong kỳ
        if (series.size() >= MIN_MONTHS_FOR_PEAK) {
            series.stream()
                    .max(Comparator.comparing(PeriodPoint::getNetRevenue))
                    .filter(best -> best.getNetRevenue().signum() > 0)
                    .ifPresent(best -> highlights.add(Highlight.builder()
                            .tone("positive")
                            .message(String.format("%s có doanh thu cao nhất trong kỳ", best.getLabel()))
                            .build()));
        }
        //Rule 8: Các tháng có biên lợi nhuận âm
        // Tháng không có doanh thu có margin = 0 nên không bị tính là lỗ.
        if (series.size() >= 2) {
            List<String> negativeMonths = series.stream()
                    .filter(p -> p.getProfitMarginPct() != null
                            && p.getProfitMarginPct() < THRESHOLD_NEGATIVE_MARGIN)
                    .map(PeriodPoint::getLabel)
                    .toList();
            if (!negativeMonths.isEmpty()) {
                highlights.add(Highlight.builder()
                        .tone("warning")
                        .message(String.format("Biên lợi nhuận âm tại: %s — cần rà soát chi phí",
                                String.join(", ", negativeMonths)))
                        .recommendation("Kiểm tra giá nhập và mức chiết khấu trong các tháng lỗ")
                        .build());
            }
        }

        return highlights;
    }

    //  Filters
    private ReportFilter resolveFilter(String paymentMethod, Integer staffId) {
        if (paymentMethod == null || paymentMethod.isBlank()) {
            return new ReportFilter(true, NO_METHOD_FILTER, staffId);
        }
        return new ReportFilter(false, methodsOfGroup(paymentGroup(paymentMethod)), staffId);
    }

    /**
     * Quy mọi alias PTTT về một nhóm hiển thị; chưa ghi PTTT coi là tiền mặt.
     * Query đã trả DEBT cho đơn bán nợ nên DEBT đi thẳng qua.
     */
    private String paymentGroup(String method) {
        if (method == null || method.isBlank()) return "CASH";
        String upper = method.trim().toUpperCase(Locale.ROOT);
        return TRANSFER_ALIASES.contains(upper) ? "TRANSFER" : upper;
    }

    private List<String> methodsOfGroup(String group) {
        return "TRANSFER".equals(group) ? TRANSFER_ALIASES : List.of(group);
    }

    //  Transaction rows

    /**
     * Dòng phiếu bán / phiếu đổi, cùng cách tính với các thẻ KPI:
     * Tổng tiền = tiền hàng trước CK, Giảm giá = CK dòng + CK hóa đơn, Thành tiền = totalAmount.
     * Hàng trả không trừ ở đây vì đã có dòng phiếu trả riêng — cộng cột Thành tiền của cả
     * bảng ra đúng doanh thu thuần.
     */
    private RevenueTransactionRowResponse toSaleRow(
            SalesOrder o,
            Map<Integer, String> staffNames,
            Map<Integer, List<ReturnOrder>> returnsByOrder,
            Map<Integer, BigDecimal[]> lineTotalsByOrder
    ) {
        List<ReturnOrder> returns = returnsByOrder.getOrDefault(o.getId(), List.of());
        String status = o.getOrderStatus();
        if (!returns.isEmpty() && !"RETURNED".equals(status)) {
            status = "PARTIALLY_RETURNED";
        }

        BigDecimal net = toBd(o.getTotalAmount());
        BigDecimal[] line = lineTotalsByOrder.get(o.getId());
        BigDecimal discount = toBd(o.getDiscountAmount()).add(line != null ? line[1] : BigDecimal.ZERO);
        BigDecimal gross = line != null ? line[0] : net.add(discount);

        return RevenueTransactionRowResponse.builder()
                .orderId(o.getId())
                .source(o.getOriginalSalesOrderId() != null ? "Phiếu đổi" : "Phiếu bán")
                .orderCode(o.getOrderCode())
                .orderStatus(status)
                .createdAt(o.getCreatedAt())
                .customerName(customerName(o))
                .staffName(staffName(o.getCreatedBy(), staffNames))
                .paymentMethod(rowPaymentGroup(o))
                .totalAmount(gross)
                .discountAmount(discount)
                .netAmount(net)
                .build();
    }

    /** PTTT hiển thị trên bảng, cùng nhóm với tab Theo PTTT: đơn bán nợ luôn là DEBT. */
    private String rowPaymentGroup(SalesOrder o) {
        return Boolean.TRUE.equals(o.getIsDebt()) ? "DEBT" : paymentGroup(o.getPaymentMethod());
    }

    /**
     * Phiếu trả mang số âm để cột Thành tiền cộng dồn ra đúng doanh thu thuần.
     */
    private RevenueTransactionRowResponse toReturnRow(ReturnOrder r, Map<Integer, String> staffNames) {
        SalesOrder original = r.getSalesOrder();
        BigDecimal refund = toBd(r.getRefundAmount()).negate();

        return RevenueTransactionRowResponse.builder()
                .orderId(original != null ? original.getId() : null)
                .source("Phiếu trả")
                .orderCode(r.getReturnCode())
                .orderStatus("RETURNED")
                .createdAt(r.getCreatedAt())
                .customerName(customerName(original))
                .staffName(staffName(r.getCreatedBy(), staffNames))
                .paymentMethod(original != null ? rowPaymentGroup(original) : null)
                .totalAmount(refund)
                .discountAmount(BigDecimal.ZERO)
                .netAmount(refund)
                .build();
    }

    private String customerName(SalesOrder o) {
        return o != null && o.getCustomer() != null && o.getCustomer().getFullName() != null
                ? o.getCustomer().getFullName()
                : "Khách lẻ";
    }

    private String staffName(Integer userId, Map<Integer, String> staffNames) {
        return userId == null ? "-" : staffNames.getOrDefault(userId, "-");
    }

    //  Shared helpers (reused from SalesHistoryService patterns)

    private InstantRange resolveRange(LocalDate from, LocalDate to) {
        LocalDate now = LocalDate.now(ZONE);
        LocalDate f = from != null ? from : now.withDayOfMonth(1);
        LocalDate t = to != null ? to : now.withDayOfMonth(now.lengthOfMonth());
        if (t.isBefore(f)) {
            throw new AppException(ErrorCode.INVALID_DATE_RANGE);
        }
        return new InstantRange(
                f.atStartOfDay(ZONE).toInstant(),
                t.plusDays(1).atStartOfDay(ZONE).toInstant()
        );
    }

    private Map<Integer, String> loadStaffNames(Stream<Integer> userIds) {
        Set<Integer> ids = userIds.filter(Objects::nonNull).collect(Collectors.toSet());
        if (ids.isEmpty()) return Map.of();

        Map<Integer, String> map = new HashMap<>();
        for (User u : userRepository.findAllById(ids)) {
            map.put(u.getId(), u.getFullName() != null ? u.getFullName() : u.getUsername());
        }
        return map;
    }

    private <T> PageResponse<T> paginate(List<T> all, int page, int size) {
        int safeSize = size <= 0 ? 15 : size;
        int safePage = Math.max(page, 0);
        int total = all.size();
        int totalPages = Math.max(1, (int) Math.ceil(total / (double) safeSize));
        if (safePage >= totalPages) safePage = totalPages - 1;
        int fromIdx = safePage * safeSize;
        int toIdx = Math.min(fromIdx + safeSize, total);
        List<T> content = fromIdx >= total ? List.of() : all.subList(fromIdx, toIdx);
        return PageResponse.<T>builder()
                .content(content)
                .page(safePage)
                .size(safeSize)
                .totalElements(total)
                .totalPages(totalPages)
                .build();
    }

    /**
     * Delta % = (current - previous) / previous × 100.
     * Returns null if previous = 0 (FE shows "Chưa có dữ liệu kỳ trước").
     */
    private Double deltaPercent(BigDecimal current, BigDecimal previous) {
        if (previous == null || previous.signum() == 0) return null;
        return current.subtract(previous)
                .multiply(BigDecimal.valueOf(100))
                .divide(previous.abs(), 2, RoundingMode.HALF_UP)
                .doubleValue();
    }

    /**
     * Biên lợi nhuận = (DTT − Giá vốn) / DTT × 100; null khi DTT = 0.
     */
    private Double marginPct(BigDecimal profit, BigDecimal netRevenue) {
        return ratePct(profit, netRevenue);
    }

    /**
     * part / whole × 100; null khi whole = 0.
     */
    private Double ratePct(BigDecimal part, BigDecimal whole) {
        if (whole == null || whole.signum() == 0) return null;
        return toBd(part).multiply(BigDecimal.valueOf(100))
                .divide(whole, 2, RoundingMode.HALF_UP)
                .doubleValue();
    }

    private Object[] firstRow(List<Object[]> rows) {
        return rows == null || rows.isEmpty() ? new Object[5] : rows.get(0);
    }

    private BigDecimal toBd(Object val) {
        if (val == null) return BigDecimal.ZERO;
        if (val instanceof BigDecimal bd) return bd;
        return new BigDecimal(val.toString());
    }

    private record InstantRange(Instant from, Instant to) {
    }

    private record ReportFilter(boolean allMethods, List<String> methods, Integer staffId) {
    }

    private record MonthBucket(String label, PeriodTotals totals, Map<String, BigDecimal> revenueByGroup) {
    }

    private record PeriodTotals(
            BigDecimal gross,
            BigDecimal discount,
            BigDecimal refund,
            BigDecimal netRevenue,
            BigDecimal cogs,
            BigDecimal profit,
            long orderCount,
            BigDecimal maxOrderValue,
            BigDecimal minOrderValue
    ) {
    }
}
