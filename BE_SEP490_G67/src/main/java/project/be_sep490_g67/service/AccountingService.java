package project.be_sep490_g67.service;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import project.be_sep490_g67.dto.request.CreateAccountingPeriodRequest;
import project.be_sep490_g67.dto.response.AccountingPeriodResponse;
import project.be_sep490_g67.entity.AccountingPeriod;
import project.be_sep490_g67.entity.BusinessTaxProfile;
import project.be_sep490_g67.enums.ProfileStatus;
import project.be_sep490_g67.exception.AppException;
import project.be_sep490_g67.exception.ErrorCode;
import project.be_sep490_g67.repository.*;

import java.time.Instant;
import java.time.YearMonth;
import java.util.List;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Page;
import project.be_sep490_g67.dto.response.PageResponse;
import java.util.Objects;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.HashSet;
import java.util.Map;
import project.be_sep490_g67.dto.request.*;
import project.be_sep490_g67.dto.response.RevenueAdjustmentResponse;
import project.be_sep490_g67.dto.response.AccountingReconciliationResponse;
import project.be_sep490_g67.dto.response.AccountingReconciliationResponse.Issue;
import org.springframework.transaction.annotation.Propagation;
import project.be_sep490_g67.entity.*;
import project.be_sep490_g67.enums.*;
import project.be_sep490_g67.dto.response.AccountingRevenueLineResponse;
import project.be_sep490_g67.dto.response.AccountingRevenueResponse;
import project.be_sep490_g67.dto.response.AccountingSummaryResponse;
import project.be_sep490_g67.dto.response.S1aRevenueBookResponse;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;

/** Coordinates accounting periods. Future revenue writers must follow the same store -> profile -> period lock order. */
@Service
@RequiredArgsConstructor
@PreAuthorize("hasRole('MANAGER')")
public class AccountingService {
    private final StoreConfigRepository storeRepository;
    private final BusinessTaxProfileRepository profileRepository;
    private final AccountingPeriodRepository periodRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;
    private final AccountingRevenueLineRepository revenueLineRepository;
    private final SalesOrderRepository salesOrderRepository;
    private final ReturnOrderRepository returnOrderRepository;
    private final RevenueAdjustmentRepository adjustmentRepository;
    private final TaxRecordRepository taxRecordRepository;

    /** Called BEFORE order/stock/code writes. It participates in the caller's transaction. */
    @Transactional(propagation = Propagation.MANDATORY)
    @PreAuthorize("isAuthenticated()")
    public void lockForSourceWrite() {
        storeRepository.findByIdForUpdate(StoreService.STORE_ID)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND_STORE));
    }

    @Transactional(propagation = Propagation.MANDATORY)
    @PreAuthorize("isAuthenticated()")
    public void recordSale(SalesOrder order) {
        lockForSourceWrite();
        AccountingPeriod period = sourcePeriod(order.getCreatedAt());
        if (period != null) writeSource(period, saleSource(order), actor());
    }

    @Transactional(propagation = Propagation.MANDATORY)
    @PreAuthorize("isAuthenticated()")
    public void recordReturn(ReturnOrder order) {
        lockForSourceWrite();
        AccountingPeriod period = sourcePeriod(order.getCreatedAt());
        if (period != null) writeSource(period, returnSource(order, period.getProfile().getTrackingStartedAt()), actor());
    }

    @Transactional(readOnly = true)
    public AccountingRevenueResponse getRevenue(Integer year, Integer month) {
        BusinessTaxProfile profile = readableProfile(year);
        validateMonth(month);
        AccountingPeriod period = periodRepository
                .findByProfileIdAndAccountingMonthAndIsRemovedFalse(profile.getId(), month)
                .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Không tìm thấy kỳ kế toán"));
        return revenueResponse(period);
    }

    @Transactional(readOnly = true)
    public PageResponse<AccountingRevenueLineResponse> getRevenuePage(Integer year, Integer month, int page, int size) {
        page = Math.max(page, 0);
        size = Math.max(1, Math.min(size, 100));
        BusinessTaxProfile profile = readableProfile(year);
        AccountingPeriod period = periodRepository
                .findByProfileIdAndAccountingMonthAndIsRemovedFalse(profile.getId(), month)
                .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Không tìm thấy kỳ kế toán"));
        Page<AccountingRevenueLine> result = revenueLineRepository
                .findByPeriodIdAndIsRemovedFalse(period.getId(), PageRequest.of(page, size));
        return PageResponse.<AccountingRevenueLineResponse>builder()
                .content(result.getContent().stream().map(AccountingRevenueLineResponse::from).toList())
                .page(result.getNumber()).size(result.getSize())
                .totalElements(result.getTotalElements()).totalPages(result.getTotalPages()).build();
    }

    /** Chuẩn bị dữ liệu S1a-HKD từ một kỳ đã đối chiếu; không tự sinh tờ khai hoặc xác định thuế phải nộp. */
    @Transactional(readOnly = true)
    public S1aRevenueBookResponse getS1aRevenueBook(Integer year, Integer month) {
        return getS1aRevenueBook(year, month, TaxExportMode.FINAL);
    }

    @Transactional(readOnly = true)
    public S1aRevenueBookResponse getS1aRevenueBook(Integer year, Integer month, TaxExportMode mode) {
        validateYear(year);
        validateMonth(month);
        BusinessTaxProfile profile = readableProfile(year);
        AccountingPeriod period = periodRepository
                .findByProfileIdAndAccountingMonthAndIsRemovedFalse(profile.getId(), month)
                .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Không tìm thấy kỳ kế toán"));
        AccountingReconciliationResponse reconciliation = inspectPeriod(period);
        if (mode == TaxExportMode.FINAL && !reconciliation.sourceCompletenessVerified()) {
            throw error(HttpStatus.CONFLICT, "Kỳ chưa đủ điều kiện lập dữ liệu S1a: "
                    + reconciliation.issues().getFirst().message());
        }
        if (mode == TaxExportMode.FINAL) requireFinalTaxRecord(profile.getId());
        List<S1aRevenueBookResponse.Row> rows = revenueLineRepository
                .findByPeriodIdAndIsRemovedFalseOrderByPostingDateAscIdAsc(period.getId()).stream()
                .filter(line -> line.getClassification() != RevenueClassification.EXCLUDED)
                .map(S1aRevenueBookResponse.Row::from).toList();
        BigDecimal total = rows.stream().map(S1aRevenueBookResponse.Row::amount)
                .reduce(new BigDecimal("0.00"), BigDecimal::add);
        boolean verified = reconciliation.sourceCompletenessVerified();
        return new S1aRevenueBookResponse(year, month, profile.getTaxpayerIdentity(),
                profile.getTaxpayerName(), profile.getTaxpayerAddress(),
                period.getStartAt().atZone(StoreService.TAX_ZONE).toLocalDate(),
                period.getEndExclusive().minus(1, ChronoUnit.DAYS).atZone(StoreService.TAX_ZONE).toLocalDate(), verified,
                mode == TaxExportMode.PREVIEW ? "PREVIEW" : "FINAL", total, rows);
    }

    /** Điền template S1a-HKD được đóng gói trong resources; chỉ xuất kỳ đã đối chiếu đầy đủ. */
    @Transactional(readOnly = true)
    public byte[] exportS1aRevenueBook(Integer year, Integer month) {
        return exportS1aRevenueBook(year, month, TaxExportMode.FINAL);
    }

    @Transactional(readOnly = true)
    public byte[] exportS1aRevenueBook(Integer year, Integer month, TaxExportMode mode) {
        S1aRevenueBookResponse book = getS1aRevenueBook(year, month, mode);
        try (InputStream input = AccountingService.class.getResourceAsStream("/templates_tax/S1a-HKD.xlsx")) {
            if (input == null) throw error(HttpStatus.INTERNAL_SERVER_ERROR, "Thiếu template S1a-HKD.xlsx");
            try (Workbook workbook = new XSSFWorkbook(input); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
                Sheet sheet = workbook.getSheetAt(0);
                writeHeader(sheet, book);
                writeRows(sheet, book.rows(), book.totalAmount());
                workbook.write(output);
                return output.toByteArray();
            }
        } catch (IOException ex) {
            throw error(HttpStatus.INTERNAL_SERVER_ERROR, "Không thể tạo file S1a-HKD");
        }
    }

    /** Xuất một workbook S1a xem trước với một sheet cho mỗi tháng trong phạm vi. */
    @Transactional(readOnly = true)
    public byte[] exportS1aRevenueBook(Integer year, S1aPeriodType periodType, Integer periodNumber) {
        List<Integer> months = switch (periodType) {
            case MONTH -> List.of(periodNumber);
            case QUARTER -> {
                if (periodNumber == null || periodNumber < 1 || periodNumber > 4) {
                    throw error(HttpStatus.BAD_REQUEST, "Quý phải nằm trong khoảng 1 đến 4");
                }
                int first = (periodNumber - 1) * 3 + 1;
                yield List.of(first, first + 1, first + 2);
            }
            case YEAR -> java.util.stream.IntStream.rangeClosed(1, 12).boxed().toList();
        };
        if (periodType == S1aPeriodType.MONTH) validateMonth(periodNumber);
        try (InputStream input = AccountingService.class.getResourceAsStream("/templates_tax/S1a-HKD.xlsx")) {
            if (input == null) throw error(HttpStatus.INTERNAL_SERVER_ERROR, "Thiếu template S1a-HKD.xlsx");
            try (Workbook workbook = new XSSFWorkbook(input); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
                Sheet original = workbook.getSheetAt(0);
                for (Integer month : months) {
                    Sheet sheet = workbook.cloneSheet(0);
                    workbook.setSheetName(workbook.getSheetIndex(sheet), String.format("T%02d-%d", month, year));
                    try {
                        S1aRevenueBookResponse book = getS1aRevenueBook(year, month, TaxExportMode.PREVIEW);
                        writeHeader(sheet, book);
                        writeRows(sheet, book.rows(), book.totalAmount());
                    } catch (ResponseStatusException ex) {
                        if (ex.getStatusCode() != HttpStatus.NOT_FOUND) throw ex;
                        cell(sheet.getRow(0) == null ? sheet.createRow(0) : sheet.getRow(0), 0)
                                .setCellValue("Chưa tạo kỳ kế toán tháng " + month + "/" + year);
                    }
                }
                workbook.removeSheetAt(workbook.getSheetIndex(original));
                if (workbook.getNumberOfSheets() == 0) workbook.createSheet(String.format("%d", year));
                workbook.write(output);
                return output.toByteArray();
            }
        } catch (IOException ex) {
            throw error(HttpStatus.INTERNAL_SERVER_ERROR, "Không thể tạo file S1a-HKD");
        }
    }

    private void requireFinalTaxRecord(Integer profileId) {
        taxRecordRepository.findByProfileIdAndPeriodTypeAndIsRemovedFalse(profileId, TaxPeriodType.YEAR)
                .filter(record -> record.getStatus() == TaxRecordStatus.CONFIRMED)
                .orElseThrow(() -> error(HttpStatus.CONFLICT,
                        "Chưa có TaxRecord năm được xác nhận để xuất bản chính thức"));
    }

    private void writeHeader(Sheet sheet, S1aRevenueBookResponse book) {
        sheet.getRow(0).getCell(0).setCellValue("HỘ, CÁ NHÂN KINH DOANH: " + text(book.taxpayerName()));
        sheet.getRow(1).getCell(0).setCellValue("Địa chỉ: " + text(book.taxpayerAddress()));
        sheet.getRow(2).getCell(0).setCellValue("Mã số thuế: " + text(book.taxpayerIdentity()));
        sheet.getRow(6).getCell(0).setCellValue("Địa điểm kinh doanh: " + text(book.taxpayerAddress()));
        DateTimeFormatter date = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        sheet.getRow(7).getCell(0).setCellValue("Kỳ kê khai: Từ " + date.format(book.fromDate())
                + " đến " + date.format(book.toDate()));
    }

    private void writeRows(Sheet sheet, List<S1aRevenueBookResponse.Row> rows, BigDecimal total) {
        final int firstDataRow = 12;
        int totalRow = findTotalRow(sheet, firstDataRow);
        int capacity = Math.max(0, totalRow - firstDataRow - 1);
        if (rows.size() > capacity) {
            sheet.shiftRows(totalRow, sheet.getLastRowNum(), rows.size() - capacity);
            totalRow += rows.size() - capacity;
        }
        Row template = sheet.getRow(firstDataRow);
        for (int i = 0; i < rows.size(); i++) {
            Row target = sheet.getRow(firstDataRow + i);
            if (target == null) target = sheet.createRow(firstDataRow + i);
            copyRowStyle(template, target);
            S1aRevenueBookResponse.Row source = rows.get(i);
            cell(target, 0).setCellValue(source.postingDate().toString());
            cell(target, 1).setCellValue(source.transaction());
            cell(target, 2).setCellValue(source.amount().doubleValue());
            // S1a nội bộ chỉ hiển thị ba cột nghiệp vụ; sourceType/sourceId vẫn nằm trong sổ DB để truy vết.
            for (int column = 3; column <= 6; column++) cell(target, column).setCellValue("");
        }
        Row totalLine = sheet.getRow(totalRow);
        if (totalLine == null) totalLine = sheet.createRow(totalRow);
        cell(totalLine, 1).setCellValue("Tổng cộng");
        cell(totalLine, 2).setCellValue(total.doubleValue());
    }

    private int findTotalRow(Sheet sheet, int from) {
        DataFormatter formatter = new DataFormatter();
        for (int r = from; r <= sheet.getLastRowNum(); r++) {
            Row row = sheet.getRow(r);
            if (row != null) for (Cell cell : row) {
                if ("Tổng cộng".equals(formatter.formatCellValue(cell))) return r;
            }
        }
        throw error(HttpStatus.INTERNAL_SERVER_ERROR, "Template S1a thiếu dòng Tổng cộng");
    }

    private void copyRowStyle(Row source, Row target) {
        // Một số bản template chỉ có dòng Tổng cộng mà không có dòng mẫu rỗng.
        // Khi đó vẫn phải tạo dòng dữ liệu, chỉ bỏ qua việc sao chép style.
        if (source == null) return;
        target.setHeight(source.getHeight());
        for (int c = 0; c < source.getLastCellNum(); c++) {
            Cell from = source.getCell(c);
            if (from != null) cell(target, c).setCellStyle(from.getCellStyle());
        }
    }

    private Cell cell(Row row, int index) {
        return row.getCell(index, Row.MissingCellPolicy.CREATE_NULL_AS_BLANK);
    }

    private String text(String value) { return value == null ? "" : value; }

    /** Tổng hợp các kỳ tháng hiện có; quý/năm không tạo bảng hay kỳ mới. */
    @Transactional(readOnly = true)
    public AccountingSummaryResponse getMonthlySummary(Integer year, Integer month) {
        validateYear(year);
        validateMonth(month);
        return summary(year, "MONTH", month, List.of(month));
    }

    @Transactional(readOnly = true)
    public AccountingSummaryResponse getQuarterSummary(Integer year, Integer quarter) {
        validateYear(year);
        if (quarter == null || quarter < 1 || quarter > 4) {
            throw error(HttpStatus.BAD_REQUEST, "Quý phải nằm trong khoảng 1 đến 4");
        }
        int first = (quarter - 1) * 3 + 1;
        return summary(year, "QUARTER", quarter,
                List.of(first, first + 1, first + 2));
    }

    @Transactional(readOnly = true)
    public AccountingSummaryResponse getYearSummary(Integer year) {
        validateYear(year);
        return summary(year, "YEAR", year, java.util.stream.IntStream.rangeClosed(1, 12).boxed().toList());
    }

    private AccountingSummaryResponse summary(Integer year, String type, Integer number, List<Integer> months) {
        BusinessTaxProfile profile = readableProfile(year);
        Instant trackingStart = profile.getTrackingStartedAt();
        List<AccountingSummaryResponse.MonthSummary> result = new ArrayList<>();
        BigDecimal total = new BigDecimal("0.00");
        boolean verified = true;
        boolean hasScopedMonth = false;
        boolean partial = false;

        for (Integer month : months) {
            YearMonth target = YearMonth.of(year, month);
            Instant monthEnd = target.plusMonths(1).atDay(1).atStartOfDay(StoreService.TAX_ZONE).toInstant();
            if (trackingStart != null && !monthEnd.isAfter(trackingStart)) {
                result.add(new AccountingSummaryResponse.MonthSummary(month, null, new BigDecimal("0.00"),
                        true, "OUT_OF_SCOPE", trackingStart, List.of()));
                continue;
            }
            hasScopedMonth = true;
            if (trackingStart != null && trackingStart.atZone(StoreService.TAX_ZONE).getYear() == year
                    && trackingStart.atZone(StoreService.TAX_ZONE).getMonthValue() == month
                    && trackingStart.atZone(StoreService.TAX_ZONE).getDayOfMonth() > 1) {
                partial = true;
            }
            AccountingPeriod period = periodRepository
                    .findByProfileIdAndAccountingMonthAndIsRemovedFalse(profile.getId(), month).orElse(null);
            if (period == null) {
                verified = false;
                result.add(new AccountingSummaryResponse.MonthSummary(month, null, new BigDecimal("0.00"),
                        false, "MISSING", trackingStart,
                        List.of(new Issue("MISSING_PERIOD", null, null, "Chưa tạo kỳ kế toán tháng"))));
                continue;
            }
            AccountingReconciliationResponse reconciliation = inspectPeriod(period);
            BigDecimal monthTotal = revenueLineRepository
                    .findByPeriodIdAndIsRemovedFalseOrderByPostingDateAscIdAsc(period.getId()).stream()
                    .filter(line -> line.getClassification() != RevenueClassification.EXCLUDED)
                    .map(AccountingRevenueLine::getSignedAmount)
                    .reduce(new BigDecimal("0.00"), BigDecimal::add);
            total = total.add(monthTotal);
            verified &= reconciliation.sourceCompletenessVerified();
            result.add(new AccountingSummaryResponse.MonthSummary(month, AccountingPeriodResponse.from(period),
                    monthTotal, reconciliation.sourceCompletenessVerified(), period.getStatus().name(),
                    trackingStart, reconciliation.issues()));
        }
        return new AccountingSummaryResponse(year, type, number, total,
                hasScopedMonth && verified, partial, List.copyOf(result));
    }

    /** Rebuilds sources already in this system, never imports history before trackingStartedAt. */
    @Transactional
    public AccountingRevenueResponse synchronizeRevenue(Integer year, Integer month) {
        validateYear(year);
        validateMonth(month);
        lockForSourceWrite();
        List<BusinessTaxProfile> profiles = profileRepository.findAllForUpdate(StoreService.STORE_ID);
        BusinessTaxProfile profile = profiles.stream()
                .filter(p -> p.getTaxYear().equals(year) && !Boolean.TRUE.equals(p.getIsRemoved()))
                .findFirst().orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Không tìm thấy hồ sơ năm"));
//        requireReadyProfile(profile, profiles);
        AccountingPeriod period = requiredOpenPeriod(profile, month);
        Integer actor = actor();
        // Do not silently strand an existing line if someone changed/deleted a source outside this workflow.
        for (AccountingRevenueLine line : revenueLineRepository.findByPeriodIdAndIsRemovedFalseOrderByPostingDateAscIdAsc(period.getId())) {
            Instant occurred = switch (line.getSourceType()) {
                case SALES_ORDER -> salesOrderRepository.findById(line.getSourceId())
                        .orElseThrow(() -> error(HttpStatus.CONFLICT, "Chứng từ bán của dòng sổ không còn tồn tại")).getCreatedAt();
                case RETURN_ORDER -> returnOrderRepository.findById(line.getSourceId())
                        .orElseThrow(() -> error(HttpStatus.CONFLICT, "Phiếu trả của dòng sổ không còn tồn tại")).getCreatedAt();
                case REVENUE_ADJUSTMENT -> line.getOccurredAt();
            };
            if (line.getSourceType() != SourceType.REVENUE_ADJUSTMENT) assertInPeriod(period, occurred);
        }
        for (SalesOrder order : salesOrderRepository
                .findByCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByIdAsc(period.getStartAt(), period.getEndExclusive())) {
            writeSource(period, saleSource(order), actor);
        }
        for (ReturnOrder order : returnOrderRepository
                .findByCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByIdAsc(period.getStartAt(), period.getEndExclusive())) {
            writeSource(period, returnSource(order, profile.getTrackingStartedAt()), actor);
        }
        for (RevenueAdjustment adjustment : adjustmentsInPeriod(period)) {
            if (adjustment.getStatus() == AdjustmentStatus.APPROVED) {
                validateAdjustmentReference(adjustment, period, true);
                writeSource(period, adjustmentSource(adjustment), actor);
            }
        }
        revenueLineRepository.flush();
        return revenueResponse(period);
    }

    private AccountingPeriod sourcePeriod(Instant occurred) {
        if (occurred == null) throw error(HttpStatus.CONFLICT, "Chứng từ thiếu thời điểm phát sinh");
        List<BusinessTaxProfile> profiles = profileRepository.findAllForUpdate(StoreService.STORE_ID);
        int year = occurred.atZone(StoreService.TAX_ZONE).getYear();
        int month = occurred.atZone(StoreService.TAX_ZONE).getMonthValue();
        BusinessTaxProfile profile = profiles.stream()
                .filter(p -> p.getTaxYear().equals(year) && !Boolean.TRUE.equals(p.getIsRemoved()))
                .findFirst().orElse(null);
//        if (profile == null || !isReadyProfile(profile)) return null;
//        if (occurred.isBefore(profile.getTrackingStartedAt())) return null;
//        boolean periodExists = periodRepository.findAllForUpdate(profile.getId()).stream()
//                .anyMatch(p -> p.getAccountingMonth().equals(month) && !Boolean.TRUE.equals(p.getIsRemoved()));
//        if (!periodExists) return null;
        return requiredOpenPeriod(profile, month);
    }

//    private boolean isReadyProfile(BusinessTaxProfile profile) {
//        Instant start = profile.getTrackingStartedAt();
//        return profile.getStatus() == ProfileStatus.CONFIRMED && start != null
//                && profile.getConfirmedBy() != null && profile.getConfirmedAt() != null
//                && !start.isAfter(Instant.now());
//    }

//    private void requireReadyProfile(BusinessTaxProfile profile, List<BusinessTaxProfile> profiles) {
//        if (!isReadyProfile(profile)) {
//            throw error(HttpStatus.CONFLICT, "Cần hồ sơ đã xác nhận và mốc theo dõi nhất quán");
//        }
//    }

    private AccountingPeriod requiredOpenPeriod(BusinessTaxProfile profile, int month) {
        return requiredPeriod(profile, month, true);
    }

    private AccountingPeriod requiredPeriod(BusinessTaxProfile profile, int month, boolean openOnly) {
        AccountingPeriod period = periodRepository.findAllForUpdate(profile.getId()).stream()
                .filter(p -> p.getAccountingMonth().equals(month) && !Boolean.TRUE.equals(p.getIsRemoved()))
                .findFirst().orElseThrow(() -> error(HttpStatus.CONFLICT, "Cần tạo kỳ kế toán tháng phát sinh trước khi ghi doanh thu"));
        if (openOnly && period.getStatus() != PeriodStatus.OPEN) throw error(HttpStatus.CONFLICT, "Kỳ đã đóng; không được ghi lại doanh thu");
        YearMonth target = YearMonth.of(profile.getTaxYear(), month);
        Instant beginning = target.atDay(1).atStartOfDay(StoreService.TAX_ZONE).toInstant();
        Instant expectedStart = profile.getTrackingStartedAt().isAfter(beginning) ? profile.getTrackingStartedAt() : beginning;
        Instant expectedEnd = target.plusMonths(1).atDay(1).atStartOfDay(StoreService.TAX_ZONE).toInstant();
        if (!expectedStart.isBefore(expectedEnd) || !expectedStart.equals(period.getStartAt())
                || !expectedEnd.equals(period.getEndExclusive())) {
            throw error(HttpStatus.CONFLICT, "Phạm vi kỳ không khớp mốc theo dõi");
        }
        return period;
    }

    private RevenueSource saleSource(SalesOrder order) {
        SalesOrderStatus status;
        try { status = SalesOrderStatus.valueOf(order.getOrderStatus()); }
        catch (RuntimeException ex) { throw error(HttpStatus.CONFLICT, "Trạng thái đơn bán không hợp lệ"); }
        boolean excluded = Boolean.TRUE.equals(order.getIsRemoved()) || status == SalesOrderStatus.CANCELLED;
        return new RevenueSource(SourceType.SALES_ORDER, order.getId(), order.getOrderCode(),
                eventTime(order.getCreatedAt()), money(order.getTotalAmount()),
                excluded ? RevenueClassification.EXCLUDED : RevenueClassification.SALE,
                excluded ? "Đơn bán bị hủy hoặc xóa; không cộng doanh thu" : "Giá trị bán sau giảm giá; không phụ thuộc thu tiền",
                "Bán hàng: " + displayDocumentCode(order.getOrderCode(), order.getId()));
    }

    private RevenueSource returnSource(ReturnOrder order, Instant trackingStart) {
        SalesOrder original = order.getSalesOrder();
        if (original == null || original.getCreatedAt() == null) {
            throw error(HttpStatus.CONFLICT, "Phiếu trả thiếu chứng từ gốc hoặc thời điểm bán");
        }
        RevenueSource originalSource = saleSource(original);
        boolean oldSale = original.getCreatedAt().isBefore(trackingStart);
        boolean excluded = oldSale || Boolean.TRUE.equals(order.getIsRemoved())
                || originalSource.classification() == RevenueClassification.EXCLUDED;
        return new RevenueSource(SourceType.RETURN_ORDER, order.getId(), order.getReturnCode(),
                eventTime(order.getCreatedAt()), money(order.getRefundAmount()).negate(),
                excluded ? RevenueClassification.EXCLUDED : RevenueClassification.RETURN,
                oldSale ? "Đơn gốc trước mốc theo dõi; loại khỏi tổng phạm vi hệ thống, cần đối chiếu riêng"
                        : excluded ? "Phiếu trả hoặc đơn gốc bị hủy/xóa; không cộng doanh thu"
                        : "Giảm doanh thu theo giá trị phiếu trả, gồm cả cấn trừ nợ/đổi hàng",
                "Trả hàng cho hóa đơn: " + displayDocumentCode(original.getOrderCode(), original.getId()));
    }

    private void writeSource(AccountingPeriod period, RevenueSource source, Integer actor) {
        if (source.id() == null) throw error(HttpStatus.CONFLICT, "Chứng từ chưa được lưu");
        if (source.type() == SourceType.REVENUE_ADJUSTMENT) {
            if (!postingInPeriod(period, source.postingDate())
                    || source.occurredAt().isBefore(period.getProfile().getTrackingStartedAt())) {
                throw error(HttpStatus.CONFLICT, "Điều chỉnh ngoài phạm vi theo dõi hoặc ngày ghi sổ ngoài kỳ");
            }
        } else assertInPeriod(period, source.occurredAt());
        AccountingRevenueLine line = revenueLineRepository.findSourceForUpdate(source.type(), source.id()).orElse(null);
        if (line != null && !line.getPeriod().getId().equals(period.getId())) {
            throw error(HttpStatus.CONFLICT, "Chứng từ đã thuộc kỳ khác; không tự chuyển kỳ");
        }
        String digest = fingerprint(source);
        if (line != null && matchesSource(line, source)) return;
        if (line != null && !digest.equals(line.getSourceVersion())
                && (source.type() == SourceType.REVENUE_ADJUSTMENT
                || adjustmentRepository.existsBySourceTypeAndSourceIdAndStatusAndIsRemovedFalse(
                        source.type(), source.id(), AdjustmentStatus.APPROVED))) {
            throw error(HttpStatus.CONFLICT, "Nguồn đã có điều chỉnh được duyệt; không tự sửa nguồn và cộng điều chỉnh hai lần");
        }
        String before = line == null ? null : AccountingRevenueLineResponse.from(line).toString();
        if (line == null) {
            line = new AccountingRevenueLine();
            line.setPeriod(period);
            line.setSourceType(source.type());
            line.setSourceId(source.id());
            line.setCreatedBy(actor);
        }
        line.setIsRemoved(false);
        line.setSourceVersion(digest);
        line.setSourceCode(source.code());
        line.setOccurredAt(source.occurredAt());
        line.setPostingDate(source.postingDate());
        line.setSignedAmount(source.amount());
        line.setClassification(source.classification());
        line.setInclusionReason(source.reason());
        line.setDescription(source.description());
        line.setBookGroupKey(null);
        line.setUpdatedBy(actor);
        line = revenueLineRepository.saveAndFlush(line);
        auditLogService.logRevenueLine(actor, line.getId(), before, AccountingRevenueLineResponse.from(line).toString());
    }

    private AccountingRevenueResponse revenueResponse(AccountingPeriod period) {
        List<AccountingRevenueLineResponse> lines = revenueLineRepository
                .findByPeriodIdAndIsRemovedFalseOrderByPostingDateAscIdAsc(period.getId())
                .stream().map(AccountingRevenueLineResponse::from).toList();
        BigDecimal total = lines.stream().filter(l -> l.classification() != RevenueClassification.EXCLUDED)
                .map(AccountingRevenueLineResponse::signedAmount).reduce(new BigDecimal("0.00"), BigDecimal::add);
        return new AccountingRevenueResponse(AccountingPeriodResponse.from(period), lines, total,
                inspectPeriod(period).sourceCompletenessVerified());
    }

    private Integer actor() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) throw error(HttpStatus.UNAUTHORIZED, "Cần đăng nhập");
        return userRepository.findByUsernameAndIsRemovedFalse(auth.getName())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED)).getId();
    }

    private void assertInPeriod(AccountingPeriod period, Instant occurred) {
        if (occurred == null || occurred.isBefore(period.getStartAt()) || !occurred.isBefore(period.getEndExclusive())) {
            throw error(HttpStatus.CONFLICT, "Thời điểm chứng từ nằm ngoài phạm vi kỳ; cần đối chiếu");
        }
    }

    private Instant eventTime(Instant value) {
        if (value == null || value.isAfter(Instant.now())) throw error(HttpStatus.CONFLICT, "Thời điểm chứng từ không hợp lệ");
        return value.truncatedTo(ChronoUnit.MICROS);
    }

    private BigDecimal money(BigDecimal value) {
        if (value == null || value.signum() < 0) throw error(HttpStatus.CONFLICT, "Số tiền chứng từ thiếu hoặc âm");
        try { return value.setScale(2, RoundingMode.UNNECESSARY); }
        catch (ArithmeticException ex) { throw error(HttpStatus.CONFLICT, "Số tiền chứng từ vượt độ chính xác hai chữ số"); }
    }

    private RevenueSource sourceFromLine(AccountingRevenueLine l) {
        return new RevenueSource(l.getSourceType(), l.getSourceId(), l.getSourceCode(), l.getOccurredAt(),
                l.getSignedAmount(), l.getClassification(), l.getInclusionReason(), l.getDescription(), l.getPostingDate());
    }

    private String fingerprint(RevenueSource source) {
        StringBuilder canonical = new StringBuilder("accounting-source-v1:");
        for (Object value : new Object[]{source.type(), source.id(), source.code(), source.occurredAt(),
                source.amount(), source.classification(), source.reason(), source.description()}) {
            String part = Objects.toString(value, "");
            canonical.append(part.length()).append(':').append(part);
        }
        // Keep existing POS digests stable; adjustment occurrence and posting date can belong to different periods.
        if (source.type() == SourceType.REVENUE_ADJUSTMENT) {
            canonical.append("posting:").append(source.postingDate());
        }
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(canonical.toString().getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException ex) { throw new IllegalStateException(ex); }
    }

    private record RevenueSource(SourceType type, Integer id, String code, Instant occurredAt,
            BigDecimal amount, RevenueClassification classification, String reason, String description, LocalDate postingDate) {
        RevenueSource(SourceType type, Integer id, String code, Instant occurredAt, BigDecimal amount,
                RevenueClassification classification, String reason, String description) {
            this(type, id, code, occurredAt, amount, classification, reason, description,
                    occurredAt.atZone(StoreService.TAX_ZONE).toLocalDate());
        }
    }

    private boolean matchesSource(AccountingRevenueLine line, RevenueSource source) {
        return !Boolean.TRUE.equals(line.getIsRemoved()) && fingerprint(source).equals(line.getSourceVersion())
                && source.equals(sourceFromLine(line)) && line.getBookGroupKey() == null;
    }

    private boolean postingInPeriod(AccountingPeriod period, LocalDate posting) {
        return posting != null && posting.getYear() == period.getProfile().getTaxYear()
                && posting.getMonthValue() == period.getAccountingMonth()
                && !posting.isBefore(period.getStartAt().atZone(StoreService.TAX_ZONE).toLocalDate());
    }

    @Transactional(readOnly = true)
    public List<AccountingPeriodResponse> getPeriods(Integer year) {
        BusinessTaxProfile profile = readableProfile(year);
        return periodRepository.findByProfileIdAndIsRemovedFalseOrderByAccountingMonthAsc(profile.getId())
                .stream().map(AccountingPeriodResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public AccountingPeriodResponse getPeriod(Integer year, Integer month) {
        validateMonth(month);
        BusinessTaxProfile profile = readableProfile(year);
        return AccountingPeriodResponse.from(periodRepository
                .findByProfileIdAndAccountingMonthAndIsRemovedFalse(profile.getId(), month)
                .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Không tìm thấy kỳ kế toán")));
    }

    @Transactional
    public AccountingPeriodResponse createPeriod(Integer year, CreateAccountingPeriodRequest request) {
        validateYear(year);
        validateMonth(request.accountingMonth());
        // This also serializes period creation with profile editing and tracking-date changes.
        storeRepository.findByIdForUpdate(StoreService.STORE_ID)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND_STORE));
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw error(HttpStatus.UNAUTHORIZED, "Cần đăng nhập");
        }
        Integer actor = userRepository.findByUsernameAndIsRemovedFalse(authentication.getName())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED)).getId();
        List<BusinessTaxProfile> profiles = profileRepository.findAllForUpdate(StoreService.STORE_ID);
        BusinessTaxProfile profile = profiles.stream()
                .filter(p -> p.getTaxYear().equals(year) && !Boolean.TRUE.equals(p.getIsRemoved()))
                .findFirst().orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Không tìm thấy hồ sơ năm"));
        if (request.profileVersion() == null || !request.profileVersion().equals(profile.getVersion())) {
            throw error(HttpStatus.CONFLICT, "Hồ sơ đã thay đổi; hãy tải lại trước khi tạo kỳ");
        }
        if (profile.getStatus() != ProfileStatus.CONFIRMED || profile.getConfirmedBy() == null
                || profile.getConfirmedAt() == null || profile.getTrackingStartedAt() == null) {
            throw error(HttpStatus.CONFLICT, "Cần xác nhận hồ sơ thuế trước khi tạo kỳ");
        }
        Instant tracking = profile.getTrackingStartedAt();
        if (tracking.isAfter(Instant.now()) || tracking.atZone(StoreService.TAX_ZONE).getYear() > year) {
            throw error(HttpStatus.CONFLICT, "Mốc theo dõi không hợp lệ với hồ sơ năm");
        }
        YearMonth target = YearMonth.of(year, request.accountingMonth());
        Instant monthStart = target.atDay(1).atStartOfDay(StoreService.TAX_ZONE).toInstant();
        Instant end = target.plusMonths(1).atDay(1).atStartOfDay(StoreService.TAX_ZONE).toInstant();
        Instant start = tracking.isAfter(monthStart) ? tracking : monthStart;
        if (!start.isBefore(end)) {
            throw error(HttpStatus.BAD_REQUEST, "Tháng nằm hoàn toàn trước mốc theo dõi");
        }
        // A locking/current read avoids stale MySQL REPEATABLE_READ snapshots after waiting for another writer.
        List<AccountingPeriod> existing = periodRepository.findAllForUpdate(profile.getId());
        if (existing.stream().anyMatch(p -> p.getAccountingMonth().equals(request.accountingMonth()))) {
            throw error(HttpStatus.CONFLICT, "Kỳ tháng đã tồn tại, kể cả kỳ đã xóa mềm");
        }
        if (existing.stream().anyMatch(p -> p.getStartAt().isBefore(end) && p.getEndExclusive().isAfter(start))) {
            throw error(HttpStatus.CONFLICT, "Khoảng kỳ chồng lấn kỳ hiện có; cần đối chiếu dữ liệu");
        }
        AccountingPeriod period = new AccountingPeriod();
        period.setProfile(profile);
        period.setAccountingMonth(request.accountingMonth());
        period.setStartAt(start);
        period.setEndExclusive(end);
        period.setCreatedBy(actor);
        period.setUpdatedBy(actor);
        period = periodRepository.saveAndFlush(period);
        AccountingPeriodResponse result = AccountingPeriodResponse.from(period);
        auditLogService.logAccountingPeriod(actor, period.getId(), "ACCOUNTING_PERIOD_CREATE", null, result.toString());
        return result;
    }

    private BusinessTaxProfile readableProfile(Integer year) {
        validateYear(year);
        return profileRepository.findByStoreIdAndTaxYearAndIsRemovedFalse(StoreService.STORE_ID, year)
                .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Không tìm thấy hồ sơ năm"));
    }

    @Transactional(readOnly = true)
    public List<RevenueAdjustmentResponse> getAdjustments(Integer year) {
        return adjustmentRepository.findByProfileIdAndIsRemovedFalseOrderByIdAsc(readableProfile(year).getId())
                .stream().map(RevenueAdjustmentResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public RevenueAdjustmentResponse getAdjustment(Integer year, Integer id) {
        return RevenueAdjustmentResponse.from(requireAdjustment(readableProfile(year), id));
    }

    @Transactional
    public RevenueAdjustmentResponse createAdjustment(Integer year, CreateRevenueAdjustmentRequest request) {
        BusinessTaxProfile profile = lockedProfile(year);
        String key = requiredText(request.idempotencyKey(), 100);
        RevenueAdjustmentInformation info = normalizedInformation(request.information(), profile);
        var existing = adjustmentRepository.findByProfileIdAndIdempotencyKey(profile.getId(), key);
        if (existing.isPresent()) {
            RevenueAdjustment prior = existing.get();
            if (Boolean.TRUE.equals(prior.getIsRemoved())
                    || !info.equals(RevenueAdjustmentResponse.informationOf(prior))) {
                throw error(HttpStatus.CONFLICT, "Idempotency key đã được dùng cho nội dung khác");
            }
            return RevenueAdjustmentResponse.from(prior);
        }
        AccountingPeriod period = requiredOpenPeriod(profile, info.date().getMonthValue());
        RevenueAdjustment adjustment = new RevenueAdjustment();
        adjustment.setProfile(profile);
        adjustment.setIdempotencyKey(key);
        applyAdjustment(adjustment, info);
        validateAdjustmentReference(adjustment, period, false);
        Integer actor = actor();
        adjustment.setCreatedBy(actor);
        adjustment.setUpdatedBy(actor);
        adjustment = adjustmentRepository.saveAndFlush(adjustment);
        auditLogService.logRevenueAdjustment(actor, adjustment.getId(), "REVENUE_ADJUSTMENT_CREATE",
                null, RevenueAdjustmentResponse.from(adjustment).toString());
        return RevenueAdjustmentResponse.from(adjustment);
    }

    @Transactional
    public RevenueAdjustmentResponse updateAdjustment(Integer year, Integer id, UpdateRevenueAdjustmentRequest request) {
        BusinessTaxProfile profile = lockedProfile(year);
        RevenueAdjustment adjustment = requireAdjustment(profile, id);
        requiredOpenPeriod(profile, adjustment.getPostingDate().getMonthValue());
        checkDraft(adjustment, request.version());
        RevenueAdjustmentInformation info = normalizedInformation(request.information(), profile);
        AccountingPeriod period = requiredOpenPeriod(profile, info.date().getMonthValue());
        String before = RevenueAdjustmentResponse.from(adjustment).toString();
        applyAdjustment(adjustment, info);
        validateAdjustmentReference(adjustment, period, false);
        Integer actor = actor();
        adjustment.setUpdatedBy(actor);
        adjustment.setUpdatedAt(Instant.now());
        adjustmentRepository.flush();
        auditLogService.logRevenueAdjustment(actor, id, "REVENUE_ADJUSTMENT_UPDATE",
                before, RevenueAdjustmentResponse.from(adjustment).toString());
        return RevenueAdjustmentResponse.from(adjustment);
    }

    @Transactional
    public RevenueAdjustmentResponse approveAdjustment(Integer year, Integer id, ApproveRevenueAdjustmentRequest request) {
        BusinessTaxProfile profile = lockedProfile(year);
        RevenueAdjustment adjustment = requireAdjustment(profile, id);
        AccountingPeriod period = requiredOpenPeriod(profile, adjustment.getPostingDate().getMonthValue());
        checkDraft(adjustment, request.version());
        String reason = requiredText(request.reason(), 1000);
        normalizedInformation(RevenueAdjustmentResponse.informationOf(adjustment), profile);
        AccountingRevenueLine reference = validateAdjustmentReference(adjustment, period, true);
        boolean crossPeriod = !postingInPeriod(period, adjustment.getOccurredAt().atZone(StoreService.TAX_ZONE).toLocalDate())
                || (adjustment.getRelatedPeriod() != null && !adjustment.getRelatedPeriod().getId().equals(period.getId()))
                || (reference != null && !reference.getPeriod().getId().equals(period.getId()));
        if (crossPeriod && !request.acceptCrossPeriodPosting()) {
            throw error(HttpStatus.CONFLICT, "Cần xác nhận rõ việc ghi điều chỉnh khác kỳ và giải trình căn cứ");
        }
        String before = RevenueAdjustmentResponse.from(adjustment).toString();
        Integer actor = actor();
        adjustment.setStatus(AdjustmentStatus.APPROVED);
        adjustment.setApprovedBy(actor);
        adjustment.setApprovedAt(Instant.now().truncatedTo(ChronoUnit.MICROS));
        adjustment.setUpdatedBy(actor);
        adjustmentRepository.flush();
        writeSource(period, adjustmentSource(adjustment), actor);
        auditLogService.logRevenueAdjustment(actor, id, "REVENUE_ADJUSTMENT_APPROVE", before,
                RevenueAdjustmentResponse.from(adjustment) + "\nreason=" + reason
                        + "\nacceptCrossPeriodPosting=" + request.acceptCrossPeriodPosting());
        return RevenueAdjustmentResponse.from(adjustment);
    }

    @Transactional
    public RevenueAdjustmentResponse rejectAdjustment(Integer year, Integer id, AccountingDecisionRequest request) {
        BusinessTaxProfile profile = lockedProfile(year);
        RevenueAdjustment adjustment = requireAdjustment(profile, id);
        requiredOpenPeriod(profile, adjustment.getPostingDate().getMonthValue());
        checkDraft(adjustment, request.version());
        String reason = requiredText(request.reason(), 1000);
        String before = RevenueAdjustmentResponse.from(adjustment).toString();
        Integer actor = actor();
        adjustment.setStatus(AdjustmentStatus.REJECTED);
        adjustment.setUpdatedBy(actor);
        adjustmentRepository.flush();
        auditLogService.logRevenueAdjustment(actor, id, "REVENUE_ADJUSTMENT_REJECT", before,
                RevenueAdjustmentResponse.from(adjustment) + "\nreason=" + reason);
        return RevenueAdjustmentResponse.from(adjustment);
    }

    private BusinessTaxProfile lockedProfile(Integer year) {
        validateYear(year);
        lockForSourceWrite();
        List<BusinessTaxProfile> profiles = profileRepository.findAllForUpdate(StoreService.STORE_ID);
        BusinessTaxProfile profile = profiles.stream()
                .filter(p -> p.getTaxYear().equals(year) && !Boolean.TRUE.equals(p.getIsRemoved())).findFirst()
                .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Không tìm thấy hồ sơ năm"));
//        requireReadyProfile(profile, profiles);
        return profile;
    }

    /** Preview only: no synchronization, no adjustment approval, no mutation of amounts. */
    @Transactional
    public AccountingReconciliationResponse reconcilePeriod(Integer year, Integer month) {
        validateMonth(month);
        BusinessTaxProfile profile = lockedProfile(year);
        return inspectPeriod(requiredPeriod(profile, month, false));
    }

    @Transactional
    public AccountingPeriodResponse closePeriod(Integer year, Integer month, AccountingDecisionRequest request) {
        validateMonth(month);
        BusinessTaxProfile profile = lockedProfile(year);
        ensureNotDeclared(profile);
        AccountingPeriod period = requiredOpenPeriod(profile, month);
        if (!Objects.equals(period.getVersion(), request.version())) {
            throw error(HttpStatus.CONFLICT, "Kỳ đã thay đổi; hãy tải lại version");
        }
        String reason = requiredText(request.reason(), 1000);
        if (period.getEndExclusive().isAfter(Instant.now())) {
            throw error(HttpStatus.CONFLICT, "Chỉ đóng kỳ sau khi kỳ đã kết thúc");
        }
        AccountingReconciliationResponse report = inspectPeriod(period);
        if (!report.sourceCompletenessVerified()) {
            throw error(HttpStatus.CONFLICT, "Chưa thể đóng kỳ: " + report.issues().getFirst().message()
                    + " (xem API đối chiếu để biết toàn bộ sai lệch)");
        }
        String before = AccountingPeriodResponse.from(period).toString();
        Integer actor = actor();
        period.setStatus(PeriodStatus.CLOSED);
        period.setClosedBy(actor);
        period.setClosedAt(Instant.now().truncatedTo(ChronoUnit.MICROS));
        period.setUpdatedBy(actor);
        periodRepository.flush();
        AccountingPeriodResponse result = AccountingPeriodResponse.from(period);
        auditLogService.logAccountingPeriod(actor, period.getId(), "ACCOUNTING_PERIOD_CLOSE", before,
                result + "\nreason=" + reason + "\nreconciliation=" + report);
        return result;
    }

    private record SourceKey(SourceType type, Integer id) { }

    private AccountingReconciliationResponse inspectPeriod(AccountingPeriod period) {
        List<Issue> issues = new ArrayList<>();
        List<AccountingRevenueLine> recorded = revenueLineRepository
                .findByPeriodIdAndIsRemovedFalseOrderByPostingDateAscIdAsc(period.getId());
        BigDecimal recordedTotal = recorded.stream().filter(l -> l.getClassification() != RevenueClassification.EXCLUDED)
                .map(AccountingRevenueLine::getSignedAmount).reduce(new BigDecimal("0.00"), BigDecimal::add);
        BusinessTaxProfile profile = period.getProfile();
        if (profile.getStatus() != ProfileStatus.CONFIRMED || profile.getTrackingStartedAt() == null) {
            issues.add(new Issue("PROFILE_NOT_READY", null, null, "Hồ sơ chưa xác nhận hoặc thiếu mốc"));
        }
        if (profile.getTrackingStartedAt() == null) {
            return new AccountingReconciliationResponse(AccountingPeriodResponse.from(period), Instant.now(),
                    0, recorded.size(), null, recordedTotal, false, false, List.copyOf(issues));
        }
        YearMonth month = YearMonth.of(profile.getTaxYear(), period.getAccountingMonth());
        Instant monthStart = month.atDay(1).atStartOfDay(StoreService.TAX_ZONE).toInstant();
        Instant expectedStart = profile.getTrackingStartedAt().isAfter(monthStart) ? profile.getTrackingStartedAt() : monthStart;
        Instant expectedEnd = month.plusMonths(1).atDay(1).atStartOfDay(StoreService.TAX_ZONE).toInstant();
        if (!expectedStart.equals(period.getStartAt()) || !expectedEnd.equals(period.getEndExclusive())) {
            issues.add(new Issue("PERIOD_RANGE_MISMATCH", null, null, "Phạm vi kỳ không khớp tháng và mốc"));
        }
        if (salesOrderRepository.countByCreatedAtIsNull() > 0 || returnOrderRepository.countByCreatedAtIsNull() > 0) {
            issues.add(new Issue("UNDATED_SOURCE", null, null, "Có chứng từ thiếu ngày, chưa xác định được kỳ"));
        }
        Map<SourceKey, RevenueSource> expected = new LinkedHashMap<>();
        List<SalesOrder> sales = salesOrderRepository
                .findByCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByIdAsc(period.getStartAt(), period.getEndExclusive());
        for (SalesOrder order : sales) collectExpected(expected, issues, SourceType.SALES_ORDER, order.getId(),
                () -> saleSource(order));
        List<ReturnOrder> returns = returnOrderRepository
                .findByCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByIdAsc(period.getStartAt(), period.getEndExclusive());
        for (ReturnOrder order : returns) collectExpected(expected, issues, SourceType.RETURN_ORDER, order.getId(),
                () -> returnSource(order, profile.getTrackingStartedAt()));
        int approvedCount = 0;
        var pending = new HashSet<Integer>();
        for (RevenueAdjustment adjustment : adjustmentsInPeriod(period)) {
            if (adjustment.getStatus() == AdjustmentStatus.APPROVED) {
                approvedCount++;
                collectExpected(expected, issues, SourceType.REVENUE_ADJUSTMENT, adjustment.getId(), () -> {
                    validateAdjustmentReference(adjustment, period, true);
                    return adjustmentSource(adjustment);
                });
            } else if (adjustment.getStatus() == AdjustmentStatus.DRAFT) pending.add(adjustment.getId());
        }
        for (RevenueAdjustment related : adjustmentRepository.findByRelatedPeriodIdAndIsRemovedFalse(period.getId())) {
            if (related.getStatus() == AdjustmentStatus.DRAFT) pending.add(related.getId());
        }
        for (Integer id : pending) {
            issues.add(new Issue("PENDING_ADJUSTMENT", SourceType.REVENUE_ADJUSTMENT, id,
                    "Còn điều chỉnh nháp ghi vào hoặc liên quan kỳ này"));
        }
        var seen = new HashSet<SourceKey>();
        for (AccountingRevenueLine line : recorded) {
            SourceKey key = new SourceKey(line.getSourceType(), line.getSourceId());
            RevenueSource source = expected.get(key);
            if (!seen.add(key)) issues.add(new Issue("DUPLICATE_LINE", key.type(), key.id(), "Nguồn có nhiều dòng"));
            if (source == null) {
                issues.add(new Issue("UNEXPECTED_LINE", key.type(), key.id(), "Dòng không có nguồn hợp lệ thuộc kỳ"));
            } else if (!matchesSource(line, source)) {
                issues.add(new Issue("SOURCE_MISMATCH", key.type(), key.id(), "Ngày, số tiền, phân loại hoặc fingerprint không khớp nguồn"));
            }
        }
        for (SourceKey key : expected.keySet()) {
            if (!seen.contains(key)) {
                var elsewhere = revenueLineRepository.findBySourceTypeAndSourceIdAndIsRemovedFalse(key.type(), key.id());
                issues.add(new Issue(elsewhere.isPresent() ? "SOURCE_IN_OTHER_PERIOD" : "MISSING_LINE", key.type(), key.id(),
                        elsewhere.isPresent() ? "Nguồn đang ghi ở kỳ khác" : "Nguồn chưa có dòng trong kỳ"));
            }
        }
        BigDecimal expectedTotal = expected.values().stream()
                .filter(s -> s.classification() != RevenueClassification.EXCLUDED)
                .map(RevenueSource::amount).reduce(new BigDecimal("0.00"), BigDecimal::add);
        boolean verified = issues.isEmpty();
        return new AccountingReconciliationResponse(AccountingPeriodResponse.from(period), Instant.now(),
                sales.size() + returns.size() + approvedCount, recorded.size(), expectedTotal, recordedTotal,
                verified, verified && period.getStatus() == PeriodStatus.OPEN && !period.getEndExclusive().isAfter(Instant.now()),
                List.copyOf(issues));
    }

    private void collectExpected(Map<SourceKey, RevenueSource> expected, List<Issue> issues,
            SourceType type, Integer id, java.util.function.Supplier<RevenueSource> normalizer) {
        try { expected.put(new SourceKey(type, id), normalizer.get()); }
        catch (ResponseStatusException ex) {
            issues.add(new Issue("INVALID_SOURCE", type, id, ex.getReason()));
        }
    }

    private RevenueAdjustment requireAdjustment(BusinessTaxProfile profile, Integer id) {
        return adjustmentRepository.findById(id)
                .filter(a -> !Boolean.TRUE.equals(a.getIsRemoved()) && a.getProfile().getId().equals(profile.getId()))
                .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Không tìm thấy khoản điều chỉnh trong hồ sơ"));
    }

    private void checkDraft(RevenueAdjustment adjustment, Long version) {
        if (!Objects.equals(version, adjustment.getVersion()) || adjustment.getStatus() != AdjustmentStatus.DRAFT) {
            throw error(HttpStatus.CONFLICT, "Version cũ hoặc điều chỉnh không còn là nháp");
        }
    }

    private String requiredText(String value, int maxLength) {
        if (value == null || value.isBlank() || value.length() > maxLength) {
            throw error(HttpStatus.BAD_REQUEST, "Cần giải trình/chứng từ hợp lệ và không vượt độ dài cho phép");
        }
        return value.trim();
    }

    private RevenueAdjustmentInformation normalizedInformation(RevenueAdjustmentInformation info, BusinessTaxProfile profile) {
        if (info == null || info.sourceType() == null || info.date() == null
                || info.signedAmount() == null || info.classification() == null) {
            throw error(HttpStatus.BAD_REQUEST, "Thiếu thông tin điều chỉnh");
        }
        Instant occurred = info.occurredAt();
        LocalDate trackingDate = profile.getTrackingStartedAt().atZone(StoreService.TAX_ZONE).toLocalDate();
        LocalDate today = LocalDate.now(StoreService.TAX_ZONE);
        if (info.date().isBefore(trackingDate) || info.date().getYear() != profile.getTaxYear()
                || info.date().isAfter(today)) {
            throw error(HttpStatus.BAD_REQUEST, "Ngày điều chỉnh nằm ngoài phạm vi hoặc không hợp lệ");
        }
        BigDecimal amount;
        try { amount = info.signedAmount().setScale(2, RoundingMode.UNNECESSARY); }
        catch (ArithmeticException ex) { throw error(HttpStatus.BAD_REQUEST, "Số tiền tối đa hai chữ số thập phân"); }
        if (amount.signum() == 0 || amount.precision() > 19) {
            throw error(HttpStatus.BAD_REQUEST, "Số tiền điều chỉnh phải khác 0 và trong giới hạn lưu trữ");
        }
        if (info.classification() != RevenueClassification.OTHER_REVENUE
                && info.classification() != RevenueClassification.CORRECTION
                && info.classification() != RevenueClassification.EXCLUDED) {
            throw error(HttpStatus.BAD_REQUEST, "Điều chỉnh chỉ dùng OTHER_REVENUE, CORRECTION hoặc EXCLUDED");
        }
        if (info.classification() == RevenueClassification.OTHER_REVENUE && amount.signum() < 0) {
            throw error(HttpStatus.BAD_REQUEST, "Khoản doanh thu bổ sung phải dương");
        }
        if (info.sourceType() != SourceType.REVENUE_ADJUSTMENT && info.sourceId() == null) {
            throw error(HttpStatus.BAD_REQUEST, "Nguồn bán/trả phải có ID chứng từ");
        }
        if (info.originalAdjustmentId() != null && (info.sourceType() != SourceType.REVENUE_ADJUSTMENT
                || !info.originalAdjustmentId().equals(info.sourceId()))) {
            throw error(HttpStatus.BAD_REQUEST, "Khoản gốc phải trùng nguồn REVENUE_ADJUSTMENT được tham chiếu");
        }
        return new RevenueAdjustmentInformation(info.sourceType(), info.sourceId(), info.relatedPeriodId(),
                info.originalAdjustmentId(), info.date(), amount, info.classification(),
                requiredText(info.inclusionReason(), 1000), requiredText(info.evidence(), 10000));
    }

    private void applyAdjustment(RevenueAdjustment a, RevenueAdjustmentInformation info) {
        a.setSourceType(info.sourceType());
        a.setSourceId(info.sourceId());
        a.setOccurredAt(info.occurredAt());
        a.setPostingDate(info.date());
        a.setSignedAmount(info.signedAmount());
        a.setClassification(info.classification());
        a.setInclusionReason(info.inclusionReason());
        a.setEvidence(info.evidence());
        a.setRelatedPeriod(info.relatedPeriodId() == null ? null : periodRepository.findById(info.relatedPeriodId())
                .filter(p -> !Boolean.TRUE.equals(p.getIsRemoved())
                        && p.getProfile().getStore().getId().equals(StoreService.STORE_ID))
                .orElseThrow(() -> error(HttpStatus.BAD_REQUEST, "Kỳ liên quan không tồn tại hoặc khác cửa hàng")));
        a.setOriginalAdjustment(info.originalAdjustmentId() == null ? null : approvedReference(info.originalAdjustmentId(), a.getId()));
    }

    private RevenueAdjustment approvedReference(Integer id, Integer self) {
        if (Objects.equals(id, self)) throw error(HttpStatus.BAD_REQUEST, "Không được tự tham chiếu");
        return adjustmentRepository.findById(id)
                .filter(a -> !Boolean.TRUE.equals(a.getIsRemoved()) && a.getStatus() == AdjustmentStatus.APPROVED
                        && a.getProfile().getStore().getId().equals(StoreService.STORE_ID))
                .orElseThrow(() -> error(HttpStatus.BAD_REQUEST, "Khoản tham chiếu phải đã duyệt và cùng cửa hàng"));
    }

    private AccountingRevenueLine validateAdjustmentReference(RevenueAdjustment a, AccountingPeriod period, boolean approving) {
        normalizedInformation(RevenueAdjustmentResponse.informationOf(a), a.getProfile());
        if (!postingInPeriod(period, a.getPostingDate())) throw error(HttpStatus.CONFLICT, "Ngày ghi sổ không thuộc kỳ");
        if (a.getRelatedPeriod() != null && (Boolean.TRUE.equals(a.getRelatedPeriod().getIsRemoved())
                || !a.getRelatedPeriod().getProfile().getStore().getId().equals(StoreService.STORE_ID)
                || a.getRelatedPeriod().getEndExclusive().isAfter(period.getEndExclusive()))) {
            throw error(HttpStatus.CONFLICT, "Kỳ liên quan không hợp lệ hoặc nằm sau kỳ ghi sổ");
        }
        if (a.getSourceId() == null) return null; // Outside-POS evidence is mandatory in normalizedInformation.
        RevenueSource reference = switch (a.getSourceType()) {
            case SALES_ORDER -> saleSource(salesOrderRepository.findById(a.getSourceId())
                    .orElseThrow(() -> error(HttpStatus.BAD_REQUEST, "Không tìm thấy đơn bán tham chiếu")));
            case RETURN_ORDER -> returnSource(returnOrderRepository.findById(a.getSourceId())
                    .orElseThrow(() -> error(HttpStatus.BAD_REQUEST, "Không tìm thấy phiếu trả tham chiếu")),
                    a.getProfile().getTrackingStartedAt());
            case REVENUE_ADJUSTMENT -> adjustmentSource(approvedReference(a.getSourceId(), a.getId()));
        };
        if (reference.occurredAt().isBefore(a.getProfile().getTrackingStartedAt())
                || reference.occurredAt().isAfter(a.getOccurredAt())
                || reference.postingDate().isAfter(a.getPostingDate())
                || reference.classification() == RevenueClassification.EXCLUDED) {
            throw error(HttpStatus.CONFLICT, "Nguồn tham chiếu ngoài phạm vi, bị loại hoặc sau ngày điều chỉnh");
        }
        AccountingRevenueLine line = revenueLineRepository
                .findBySourceTypeAndSourceIdAndIsRemovedFalse(a.getSourceType(), a.getSourceId()).orElse(null);
        if (approving && (line == null || !matchesSource(line, reference))) {
            throw error(HttpStatus.CONFLICT, "Nguồn tham chiếu chưa khớp dòng sổ; cần đối chiếu nguồn trước khi duyệt");
        }
        if (line != null && (a.getRelatedPeriod() != null
                && !line.getPeriod().getId().equals(a.getRelatedPeriod().getId()))) {
            throw error(HttpStatus.CONFLICT, "Kỳ liên quan không khớp kỳ của nguồn tham chiếu");
        }
        if (approving && line != null && !line.getPeriod().getId().equals(period.getId()) && a.getRelatedPeriod() == null) {
            throw error(HttpStatus.CONFLICT, "Điều chỉnh nguồn khác kỳ phải chỉ rõ relatedPeriodId");
        }
        return line;
    }

    private RevenueSource adjustmentSource(RevenueAdjustment a) {
        if (a.getStatus() != AdjustmentStatus.APPROVED || a.getApprovedAt() == null || a.getApprovedBy() == null
                || Boolean.TRUE.equals(a.getIsRemoved())) {
            throw error(HttpStatus.CONFLICT, "Điều chỉnh chưa được duyệt hợp lệ");
        }
        RevenueAdjustmentInformation info = normalizedInformation(RevenueAdjustmentResponse.informationOf(a), a.getProfile());
        return new RevenueSource(SourceType.REVENUE_ADJUSTMENT, a.getId(), null, info.occurredAt(),
                info.signedAmount(), info.classification(), info.inclusionReason(),
                "Điều chỉnh doanh thu: " + occurredDateLabel(info.occurredAt()), info.date());
    }

    private void ensureNotDeclared(BusinessTaxProfile profile) {
        taxRecordRepository.findByProfileIdAndPeriodTypeAndIsRemovedFalse(profile.getId(), TaxPeriodType.YEAR)
                .map(TaxRecord::getDeclarationStatus)
                .filter(TaxDeclarationStatus.DECLARED::equals)
                .ifPresent(status -> { throw error(HttpStatus.CONFLICT, "Năm đã kê khai; không được cập nhật sổ kế toán"); });
    }

    private String displayDocumentCode(String code, Integer id) {
        return code == null || code.isBlank() ? "#" + id : code;
    }

    private String occurredDateLabel(Instant occurredAt) {
        return DateTimeFormatter.ofPattern("dd/MM/yyyy")
                .format(occurredAt.atZone(StoreService.TAX_ZONE).toLocalDate());
    }

    private List<RevenueAdjustment> adjustmentsInPeriod(AccountingPeriod period) {
        YearMonth month = YearMonth.of(period.getProfile().getTaxYear(), period.getAccountingMonth());
        return adjustmentRepository.findByProfileIdAndPostingDateBetweenAndIsRemovedFalse(
                period.getProfile().getId(), month.atDay(1), month.atEndOfMonth());
    }

    private void validateYear(Integer year) {
        if (year == null || year < 2000 || year > 2100) {
            throw error(HttpStatus.BAD_REQUEST, "Năm hồ sơ phải từ 2000 đến 2100");
        }
    }

    private void validateMonth(Integer month) {
        if (month == null || month < 1 || month > 12) {
            throw error(HttpStatus.BAD_REQUEST, "Tháng phải từ 1 đến 12");
        }
    }

    private static ResponseStatusException error(HttpStatus status, String message) {
        return new ResponseStatusException(status, message);
    }
}

