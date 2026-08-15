package project.be_sep490_g67.service;

import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.AccessLevel;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.be_sep490_g67.dto.response.HourlyRevenueDTO;
import project.be_sep490_g67.dto.response.PageResponse;
import project.be_sep490_g67.dto.response.SalesHistoryRowDTO;
import project.be_sep490_g67.dto.response.SalesHistorySummaryDTO;
import project.be_sep490_g67.entity.ProductUnit;
import project.be_sep490_g67.entity.SalesOrderDetail;
import project.be_sep490_g67.entity.User;
import project.be_sep490_g67.exception.AppException;
import project.be_sep490_g67.exception.ErrorCode;
import project.be_sep490_g67.repository.BatchLocationRepository;
import project.be_sep490_g67.repository.ProductRepository;
import project.be_sep490_g67.repository.ProductUnitRepository;
import project.be_sep490_g67.repository.SalesOrderDetailRepository;
import project.be_sep490_g67.repository.UserRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class SalesHistoryService {

    SalesOrderDetailRepository salesOrderDetailRepository;
    ProductRepository productRepository;
    ProductUnitRepository productUnitRepository;
    BatchLocationRepository batchLocationRepository;
    UserRepository userRepository;

    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    @Transactional(readOnly = true)
    public PageResponse<SalesHistoryRowDTO> list(
            LocalDate from,
            LocalDate to,
            String keyword,
            Integer productId,
            String status,
            int page,
            int size
    ) {
        InstantRange range = resolveRange(from, to);
        String beStatus = mapFeStatusToBe(status);

        List<SalesOrderDetail> rows = salesOrderDetailRepository.findHistoryRows(
                range.from(), range.to(), productId, beStatus, keyword);

        Map<Integer, String> staffNames = loadStaffNames(rows);
        Map<Integer, String> unitNames = loadUnitNames(rows);

        List<SalesHistoryRowDTO> mapped = rows.stream()
                .map(d -> toRow(d, staffNames, unitNames))
                .toList();

        return paginate(mapped, page, size);
    }

    /**
     * Doanh thu bán hàng của một ngày, chia theo 24 khung giờ.
     *
     * <p>Trả về đủ 24 khung kể cả khung không bán được gì, để biểu đồ đường không
     * bị đứt đoạn và trục hoành luôn cố định.
     *
     * <p>Tính doanh thu tại thời điểm bán — cộng {@code lineTotal} của mọi đơn chưa
     * huỷ, không phân biệt hình thức thanh toán, nên đơn nợ vào ngay lúc lập đơn.
     */
    @Transactional(readOnly = true)
    public List<HourlyRevenueDTO> hourlyRevenue(LocalDate date) {
        LocalDate target = date != null ? date : LocalDate.now(ZONE);
        Instant from = target.atStartOfDay(ZONE).toInstant();
        Instant to = target.plusDays(1).atStartOfDay(ZONE).toInstant();

        List<SalesOrderDetail> rows = salesOrderDetailRepository.findHistoryRows(from, to, null, null, null)
                .stream()
                .filter(d -> !isCancelled(d.getSalesOrder().getOrderStatus()))
                .toList();

        Map<Integer, BigDecimal> revenueByHour = new HashMap<>();
        Map<Integer, Set<Integer>> orderIdsByHour = new HashMap<>();

        for (SalesOrderDetail d : rows) {
            Instant createdAt = d.getSalesOrder().getCreatedAt();
            if (createdAt == null) {
                continue;
            }
            int hour = createdAt.atZone(ZONE).getHour();
            BigDecimal lineTotal = d.getLineTotal() == null ? BigDecimal.ZERO : d.getLineTotal();
            revenueByHour.merge(hour, lineTotal, BigDecimal::add);
            orderIdsByHour.computeIfAbsent(hour, k -> new HashSet<>()).add(d.getSalesOrder().getId());
        }

        List<HourlyRevenueDTO> result = new ArrayList<>(24);
        for (int hour = 0; hour < 24; hour++) {
            result.add(HourlyRevenueDTO.builder()
                    .hour(hour)
                    .label(String.format("%02dh", hour))
                    .revenue(revenueByHour.getOrDefault(hour, BigDecimal.ZERO))
                    .orderCount(orderIdsByHour.getOrDefault(hour, Set.of()).size())
                    .build());
        }
        return result;
    }

    @Transactional(readOnly = true)
    public SalesHistorySummaryDTO summary(LocalDate from, LocalDate to, Integer productId) {
        InstantRange range = resolveRange(from, to);
        List<SalesOrderDetail> rows = salesOrderDetailRepository.findHistoryRows(
                range.from(), range.to(), productId, null, null);

        List<SalesOrderDetail> active = rows.stream()
                .filter(d -> !isCancelled(d.getSalesOrder().getOrderStatus()))
                .toList();

        long totalQty = active.stream().mapToLong(d -> d.getQuantity() == null ? 0 : d.getQuantity()).sum();
        long totalOrders = active.stream()
                .map(d -> d.getSalesOrder().getId())
                .distinct()
                .count();
        BigDecimal totalRevenue = active.stream()
                .map(d -> d.getLineTotal() == null ? BigDecimal.ZERO : d.getLineTotal())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalProfit = calcProfit(active);

        YearMonth ym = YearMonth.from(LocalDate.now(ZONE));
        List<SalesHistorySummaryDTO.WeekDTO> weeks = buildWeeks(active, ym);

        SalesHistorySummaryDTO.SalesHistorySummaryDTOBuilder builder = SalesHistorySummaryDTO.builder()
                .monthLabel("tháng " + ym.getMonthValue())
                .todayLabel("Hôm nay: " + LocalDate.now(ZONE).format(DateTimeFormatter.ofPattern("dd/MM/yyyy")))
                .totalQty(totalQty)
                .totalOrders(totalOrders)
                .totalRevenue(totalRevenue)
                .totalProfit(totalProfit)
                .weeks(weeks);

        if (productId != null) {
            var product = productRepository.findByIdAndIsRemovedFalse(productId)
                    .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_NOT_FOUND));
            String unit = productUnitRepository.findByProductIdAndIsRemovedFalse(productId).stream()
                    .filter(u -> u.getUnitBase() != null && u.getUnitBase().compareTo(BigDecimal.ONE) == 0)
                    .map(ProductUnit::getName)
                    .findFirst()
                    .orElse("sp");

            Instant from30 = LocalDate.now(ZONE).minusDays(30).atStartOfDay(ZONE).toInstant();
            Instant toNow = Instant.now();
            List<SalesOrderDetail> last30 = salesOrderDetailRepository.findHistoryRows(
                            from30, toNow, productId, null, null)
                    .stream()
                    .filter(d -> !isCancelled(d.getSalesOrder().getOrderStatus()))
                    .toList();

            long sold30 = last30.stream().mapToLong(d -> d.getQuantity() == null ? 0 : d.getQuantity()).sum();
            BigDecimal rev30 = last30.stream()
                    .map(d -> d.getLineTotal() == null ? BigDecimal.ZERO : d.getLineTotal())
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal profit30 = calcProfit(last30);
            Long onHand = batchLocationRepository.sumOnHandByProductId(productId);

            builder.productId(productId)
                    .productName(product.getName())
                    .shortName(product.getName())
                    .sku(product.getSku())
                    .unitName(unit)
                    .image(product.getProductImages() != null && !product.getProductImages().isEmpty() ? product.getProductImages().iterator().next().getUrl() : null)
                    .onHand(onHand == null ? 0 : onHand)
                    .sold30d(sold30)
                    .revenue30d(rev30)
                    .profit30d(profit30);
        }

        return builder.build();
    }

    private BigDecimal calcProfit(List<SalesOrderDetail> rows) {
        BigDecimal profit = BigDecimal.ZERO;
        for (SalesOrderDetail d : rows) {
            BigDecimal line = d.getLineTotal() == null ? BigDecimal.ZERO : d.getLineTotal();
            BigDecimal cost = d.getProduct().getCostPrice() == null ? BigDecimal.ZERO : d.getProduct().getCostPrice();
            int qty = d.getQuantity() == null ? 0 : d.getQuantity();
            profit = profit.add(line.subtract(cost.multiply(BigDecimal.valueOf(qty))));
        }
        return profit.setScale(2, RoundingMode.HALF_UP);
    }

    private SalesHistoryRowDTO toRow(
            SalesOrderDetail d,
            Map<Integer, String> staffNames,
            Map<Integer, String> unitNames
    ) {
        var order = d.getSalesOrder();
        var product = d.getProduct();
        Integer createdBy = order.getCreatedBy();
        String customer = order.getCustomer() != null && order.getCustomer().getFullName() != null
                ? order.getCustomer().getFullName()
                : "Khách lẻ";

        return SalesHistoryRowDTO.builder()
                .id(d.getId())
                .invoiceCode(order.getOrderCode())
                .soldAt(order.getCreatedAt())
                .productId(product.getId())
                .productName(product.getName())
                .sku(product.getSku())
                .customerName(customer)
                .qty(d.getQuantity())
                .unitName(unitNames.getOrDefault(product.getId(), "sp"))
                .unitPrice(d.getUnitPrice())
                .totalAmount(d.getLineTotal())
                .staffName(createdBy == null ? "—" : staffNames.getOrDefault(createdBy, "—"))
                .status(mapBeStatusToFe(order.getOrderStatus()))
                .build();
    }

    private Map<Integer, String> loadStaffNames(List<SalesOrderDetail> rows) {
        Set<Integer> ids = rows.stream()
                .map(d -> d.getSalesOrder().getCreatedBy())
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        if (ids.isEmpty()) {
            return Map.of();
        }
        Map<Integer, String> map = new HashMap<>();
        for (User u : userRepository.findAllById(ids)) {
            map.put(u.getId(), u.getFullName() != null ? u.getFullName() : u.getUsername());
        }
        return map;
    }

    private Map<Integer, String> loadUnitNames(List<SalesOrderDetail> rows) {
        Set<Integer> productIds = rows.stream().map(d -> d.getProduct().getId()).collect(Collectors.toSet());
        Map<Integer, String> map = new HashMap<>();
        for (Integer pid : productIds) {
            String name = productUnitRepository.findByProductIdAndIsRemovedFalse(pid).stream()
                    .filter(u -> u.getUnitBase() != null && u.getUnitBase().compareTo(BigDecimal.ONE) == 0)
                    .map(ProductUnit::getName)
                    .findFirst()
                    .orElse("sp");
            map.put(pid, name);
        }
        return map;
    }

    private List<SalesHistorySummaryDTO.WeekDTO> buildWeeks(List<SalesOrderDetail> rows, YearMonth ym) {
        LocalDate monthStart = ym.atDay(1);
        LocalDate monthEnd = ym.atEndOfMonth();
        List<SalesHistorySummaryDTO.WeekDTO> weeks = new ArrayList<>();
        LocalDate cursor = monthStart;
        int weekIdx = 1;
        LocalDate today = LocalDate.now(ZONE);

        while (!cursor.isAfter(monthEnd)) {
            LocalDate weekEnd = cursor.plusDays(6);
            if (weekEnd.isAfter(monthEnd)) {
                weekEnd = monthEnd;
            }
            LocalDate wStart = cursor;
            LocalDate wEnd = weekEnd;
            Instant from = wStart.atStartOfDay(ZONE).toInstant();
            Instant to = wEnd.plusDays(1).atStartOfDay(ZONE).toInstant();

            List<SalesOrderDetail> inWeek = rows.stream()
                    .filter(d -> {
                        Instant t = d.getSalesOrder().getCreatedAt();
                        return t != null && !t.isBefore(from) && t.isBefore(to);
                    })
                    .toList();

            long orderCount = inWeek.stream().map(d -> d.getSalesOrder().getId()).distinct().count();
            BigDecimal amount = inWeek.stream()
                    .map(d -> d.getLineTotal() == null ? BigDecimal.ZERO : d.getLineTotal())
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            weeks.add(SalesHistorySummaryDTO.WeekDTO.builder()
                    .id("w" + weekIdx)
                    .weekLabel("Tuần " + weekIdx)
                    .dateRange(wStart.format(DateTimeFormatter.ofPattern("dd/MM"))
                            + " - " + wEnd.format(DateTimeFormatter.ofPattern("dd/MM")))
                    .orderCount(orderCount)
                    .amount(amount)
                    .isCurrent(!today.isBefore(wStart) && !today.isAfter(wEnd))
                    .build());

            cursor = weekEnd.plusDays(1);
            weekIdx++;
        }
        return weeks;
    }

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

    private boolean isCancelled(String status) {
        return status != null && "CANCELLED".equalsIgnoreCase(status);
    }

    private String mapFeStatusToBe(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }
        return switch (status.toLowerCase(Locale.ROOT)) {
            case "completed" -> "COMPLETED";
            case "cancelled" -> "CANCELLED";
            default -> status.toUpperCase(Locale.ROOT);
        };
    }

    private String mapBeStatusToFe(String status) {
        if (status == null) {
            return "completed";
        }
        return switch (status.toUpperCase(Locale.ROOT)) {
            case "CANCELLED" -> "cancelled";
            default -> "completed";
        };
    }

    private <T> PageResponse<T> paginate(List<T> all, int page, int size) {
        int safeSize = size <= 0 ? 10 : size;
        int safePage = Math.max(page, 0);
        int total = all.size();
        int totalPages = Math.max(1, (int) Math.ceil(total / (double) safeSize));
        if (safePage >= totalPages) {
            safePage = totalPages - 1;
        }
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

    private record InstantRange(Instant from, Instant to) {}
}
