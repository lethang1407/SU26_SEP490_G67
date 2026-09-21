package project.be_sep490_g67.service;

import lombok.RequiredArgsConstructor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFRun;
import org.apache.poi.xwpf.usermodel.XWPFTable;
import org.apache.poi.xwpf.usermodel.XWPFTableCell;
import org.apache.poi.xwpf.usermodel.XWPFTableRow;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import project.be_sep490_g67.dto.response.AccountingSummaryResponse;
import project.be_sep490_g67.entity.BusinessTaxProfile;
import project.be_sep490_g67.enums.TaxPeriodType;
import project.be_sep490_g67.repository.BusinessTaxProfileRepository;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.text.DecimalFormat;
import java.util.Map;
import java.util.List;
import java.util.stream.Collectors;

/** Tạo hồ sơ Word từ template pháp lý; không lưu bản chụp vào database. */
@Service
@RequiredArgsConstructor
@PreAuthorize("hasRole('MANAGER')")
public class TaxTemplateService {
    private final AccountingService accountingService;
    private final BusinessTaxProfileRepository profileRepository;

    @Transactional(readOnly = true)
    public byte[] exportAnnualRevenueNotice(Integer year, TaxPeriodType periodType) {
        if (periodType == null) periodType = TaxPeriodType.YEAR;
        if (periodType != TaxPeriodType.YEAR) {
            throw conflict("01/TKN-CNKD hiện chỉ hỗ trợ thông báo theo năm");
        }
        BusinessTaxProfile profile = profileRepository.findByStoreIdAndTaxYearAndIsRemovedFalse(
                        StoreService.STORE_ID, year)
                .orElseThrow(() -> notFound("Không tìm thấy hồ sơ thuế năm"));
        AccountingSummaryResponse summary = accountingService.getYearSummary(year);
        if (!summary.sourceCompletenessVerified()) {
            throw conflict("Chưa thể lập 01/TKN-CNKD: dữ liệu năm chưa được đối chiếu đầy đủ");
        }
        if (summary.partialTracking()) {
            throw conflict("Chưa thể lập 01/TKN-CNKD: mốc theo dõi bắt đầu giữa năm, cần bổ sung doanh thu trước mốc sử dụng hệ thống");
        }
        BigDecimal revenue = summary.recordedRevenue();
        if (revenue.compareTo(new BigDecimal("1000000000.00")) > 0) {
            throw conflict("Doanh thu vượt ngưỡng của mẫu 01/TKN-CNKD; cần dùng mẫu 01/CNKD");
        }
        Map<String, String> values = Map.of(
                "{{CHECK_BUSINESS}}", "☒",
                "{{CHECK_FIRST_FILING}}", "☒",
                "{{TAX_PERIOD_OPTION}}", "[01a] Năm " + year,
                "{{TAX_SUPPLEMENT_NUMBER}}", "",
                "{{TAX_USERNAME}}", safe(profile.getTaxpayerName()),
                "{{TAX_CODE}}", safe(profile.getTaxpayerIdentity()),
                "{{TAX_YEAR}}", String.valueOf(year),
                "{{TAX_REVENUE}}", money(revenue),
                "{{TAX_TOTAL_REVENUE}}", money(revenue));
        return render("/templates_tax/01-TKN-CNKD.docx", values);
    }

    private byte[] render(String resource, Map<String, String> values) {
        try (InputStream input = TaxTemplateService.class.getResourceAsStream(resource)) {
            if (input == null) throw serverError("Thiếu template 01-TKN-CNKD.docx");
            try (XWPFDocument document = new XWPFDocument(input); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
                document.getParagraphs().forEach(p -> replace(p, values));
                for (XWPFTable table : document.getTables()) replace(table, values);
                document.write(output);
                return output.toByteArray();
            }
        } catch (IOException ex) {
            throw serverError("Không thể tạo file 01/TKN-CNKD");
        }
    }

    private void replace(XWPFTable table, Map<String, String> values) {
        for (XWPFTableRow row : table.getRows()) {
            for (XWPFTableCell cell : row.getTableCells()) {
                cell.getParagraphs().forEach(p -> replace(p, values));
                for (XWPFTable nested : cell.getTables()) replace(nested, values);
            }
        }
    }

    private void replace(XWPFParagraph paragraph, Map<String, String> values) {
        List<XWPFRun> runs = paragraph.getRuns();
        if (runs.isEmpty()) return;

        // Word often splits a placeholder across several runs when the template
        // applies formatting to part of the placeholder (for example TAX_ / USERNAME).
        // Replace on the complete paragraph text so the mapping does not depend on
        // how Word happened to split the runs.
        String original = runs.stream()
                .map(XWPFRun::text)
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.joining());
        String result = original;
        for (Map.Entry<String, String> entry : values.entrySet()) {
            result = result.replace(entry.getKey(), entry.getValue());
        }
        if (result.equals(original)) return;

        runs.get(0).setText(result, 0);
        for (int i = 1; i < runs.size(); i++) {
            runs.get(i).setText("", 0);
        }
    }

    private String money(BigDecimal value) {
        return new DecimalFormat("#,##0.##").format(value);
    }

    private String safe(String value) { return value == null ? "" : value; }

    private ResponseStatusException conflict(String message) {
        return new ResponseStatusException(HttpStatus.CONFLICT, message);
    }

    private ResponseStatusException notFound(String message) {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, message);
    }

    private ResponseStatusException serverError(String message) {
        return new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, message);
    }
}
