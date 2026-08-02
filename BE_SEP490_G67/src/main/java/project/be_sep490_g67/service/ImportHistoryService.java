package project.be_sep490_g67.service;

import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.AccessLevel;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.be_sep490_g67.dto.response.ImportHistoryRowDTO;
import project.be_sep490_g67.dto.response.ImportHistorySummaryDTO;
import project.be_sep490_g67.dto.response.PageResponse;
import project.be_sep490_g67.entity.ImportOrderDetail;
import project.be_sep490_g67.entity.ProductUnit;
import project.be_sep490_g67.entity.User;
import project.be_sep490_g67.exception.AppException;
import project.be_sep490_g67.exception.ErrorCode;
import project.be_sep490_g67.repository.ImportOrderDetailRepository;
import project.be_sep490_g67.repository.ProductRepository;
import project.be_sep490_g67.repository.ProductUnitRepository;
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
public class ImportHistoryService {

    ImportOrderDetailRepository importOrderDetailRepository;
    ProductRepository productRepository;
    ProductUnitRepository productUnitRepository;
    UserRepository userRepository;

    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    @Transactional(readOnly = true)
    public PageResponse<ImportHistoryRowDTO> list(
            LocalDate from,
            LocalDate to,
            String supplierKeyword,
            Integer productId,
            String status,
            int page,
            int size
    ) {
        InstantRange range = resolveRange(from, to);
        String beStatus = mapFeStatusToBe(status);

        List<ImportOrderDetail> rows = importOrderDetailRepository.findHistoryRows(
                range.from(), range.to(), productId, beStatus, supplierKeyword);

        Map<Integer, String> staffNames = loadStaffNames(rows);
        Map<Integer, String> unitNames = loadUnitNames(rows);

        List<ImportHistoryRowDTO> mapped = rows.stream()
                .map(d -> toRow(d, staffNames, unitNames))
                .toList();

        return paginate(mapped, page, size);
    }

    @Transactional(readOnly = true)
    public ImportHistorySummaryDTO summary(LocalDate from, LocalDate to, Integer productId) {
        InstantRange range = resolveRange(from, to);
        List<ImportOrderDetail> rows = importOrderDetailRepository.findHistoryRows(
                range.from(), range.to(), productId, null, null);

        long totalQty = rows.stream().mapToLong(d -> d.getQuantity() == null ? 0 : d.getQuantity()).sum();
        long totalOrders = rows.stream()
                .map(d -> d.getImportOrder().getId())
                .filter(Objects::nonNull)
                .distinct()
                .count();
        BigDecimal totalCost = rows.stream()
                .map(d -> d.getLineTotal() == null ? BigDecimal.ZERO : d.getLineTotal())
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        YearMonth ym = YearMonth.from(LocalDate.now(ZONE));
        List<ImportHistorySummaryDTO.WeekDTO> weeks = buildWeeks(rows, ym);

        ImportHistorySummaryDTO.ImportHistorySummaryDTOBuilder builder = ImportHistorySummaryDTO.builder()
                .monthLabel("tháng " + ym.getMonthValue())
                .todayLabel("Hôm nay: " + LocalDate.now(ZONE).format(DateTimeFormatter.ofPattern("dd/MM/yyyy")))
                .totalQty(totalQty)
                .totalOrders(totalOrders)
                .totalCost(totalCost)
                .weeks(weeks);

        if (productId != null) {
            var product = productRepository.findByIdAndIsRemovedFalse(productId)
                    .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_NOT_FOUND));
            String unit = productUnitRepository.findByProductIdAndIsRemovedFalse(productId).stream()
                    .filter(u -> u.getUnitBase() != null && u.getUnitBase().compareTo(BigDecimal.ONE) == 0)
                    .map(ProductUnit::getName)
                    .findFirst()
                    .orElse("sp");
            Instant last = rows.stream()
                    .map(d -> importedAt(d))
                    .filter(Objects::nonNull)
                    .max(Instant::compareTo)
                    .orElse(null);
            BigDecimal avg = rows.isEmpty() ? BigDecimal.ZERO : rows.stream()
                    .map(d -> d.getCostPerUnit() == null ? BigDecimal.ZERO : d.getCostPerUnit())
                    .reduce(BigDecimal.ZERO, BigDecimal::add)
                    .divide(BigDecimal.valueOf(rows.size()), 2, RoundingMode.HALF_UP);

            builder.productId(productId)
                    .productName(product.getName())
                    .sku(product.getSku())
                    .unitName(unit)
                    .lastImportedAt(last)
                    .avgUnitPrice(avg);
        }

        return builder.build();
    }

    private ImportHistoryRowDTO toRow(
            ImportOrderDetail d,
            Map<Integer, String> staffNames,
            Map<Integer, String> unitNames
    ) {
        var order = d.getImportOrder();
        var product = d.getProduct();
        Integer createdBy = order.getCreatedBy();
        return ImportHistoryRowDTO.builder()
                .id(d.getId())
                .orderCode(order.getOrderCode())
                .importedAt(importedAt(d))
                .productId(product.getId())
                .productName(product.getName())
                .sku(product.getSku())
                .supplierName(order.getSupplier() != null ? order.getSupplier().getName() : "—")
                .qty(d.getQuantity())
                .unitName(unitNames.getOrDefault(product.getId(), "sp"))
                .unitPrice(d.getCostPerUnit())
                .totalAmount(d.getLineTotal())
                .staffName(createdBy == null ? "—" : staffNames.getOrDefault(createdBy, "—"))
                .status(mapBeStatusToFe(order.getStatus()))
                .build();
    }

    private Instant importedAt(ImportOrderDetail d) {
        var order = d.getImportOrder();
        if (order.getReceivedDate() != null) {
            return order.getReceivedDate().atStartOfDay(ZONE).toInstant();
        }
        return order.getCreatedAt();
    }

    private Map<Integer, String> loadStaffNames(List<ImportOrderDetail> rows) {
        Set<Integer> ids = rows.stream()
                .map(d -> d.getImportOrder().getCreatedBy())
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

    private Map<Integer, String> loadUnitNames(List<ImportOrderDetail> rows) {
        Set<Integer> productIds = rows.stream()
                .map(d -> d.getProduct().getId())
                .collect(Collectors.toSet());
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

    private List<ImportHistorySummaryDTO.WeekDTO> buildWeeks(List<ImportOrderDetail> rows, YearMonth ym) {
        LocalDate monthStart = ym.atDay(1);
        LocalDate monthEnd = ym.atEndOfMonth();
        List<ImportHistorySummaryDTO.WeekDTO> weeks = new ArrayList<>();
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

            List<ImportOrderDetail> inWeek = rows.stream()
                    .filter(d -> {
                        Instant t = importedAt(d);
                        return t != null && !t.isBefore(from) && t.isBefore(to);
                    })
                    .toList();

            long orderCount = inWeek.stream()
                    .map(d -> d.getImportOrder().getId())
                    .distinct()
                    .count();
            BigDecimal amount = inWeek.stream()
                    .map(d -> d.getLineTotal() == null ? BigDecimal.ZERO : d.getLineTotal())
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            boolean isCurrent = !today.isBefore(wStart) && !today.isAfter(wEnd);

            weeks.add(ImportHistorySummaryDTO.WeekDTO.builder()
                    .id("w" + weekIdx)
                    .weekLabel("Tuần " + weekIdx)
                    .dateRange(wStart.format(DateTimeFormatter.ofPattern("dd/MM"))
                            + " - " + wEnd.format(DateTimeFormatter.ofPattern("dd/MM")))
                    .orderCount(orderCount)
                    .amount(amount)
                    .isCurrent(isCurrent)
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
        Instant fromInst = f.atStartOfDay(ZONE).toInstant();
        Instant toInst = t.plusDays(1).atStartOfDay(ZONE).toInstant();
        return new InstantRange(fromInst, toInst);
    }

    private String mapFeStatusToBe(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }
        return switch (status.toLowerCase(Locale.ROOT)) {
            case "pending" -> "PENDING_CHECK";
            case "matched" -> "MATCHED";
            case "mismatch" -> "MISMATCH";
            default -> status.toUpperCase(Locale.ROOT);
        };
    }

    private String mapBeStatusToFe(String status) {
        if (status == null) {
            return "pending";
        }
        return switch (status.toUpperCase(Locale.ROOT)) {
            case "MATCHED" -> "matched";
            case "MISMATCH" -> "mismatch";
            case "DRAFT", "PENDING_CHECK" -> "pending";
            default -> status.toLowerCase(Locale.ROOT);
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
