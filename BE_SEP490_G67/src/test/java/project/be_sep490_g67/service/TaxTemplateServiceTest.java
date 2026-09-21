package project.be_sep490_g67.service;

import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import project.be_sep490_g67.dto.response.AccountingSummaryResponse;
import project.be_sep490_g67.entity.BusinessTaxProfile;
import project.be_sep490_g67.enums.TaxPeriodType;
import project.be_sep490_g67.repository.BusinessTaxProfileRepository;

import java.io.ByteArrayInputStream;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TaxTemplateServiceTest {
    @Mock AccountingService accountingService;
    @Mock BusinessTaxProfileRepository profileRepository;

    @Test
    void annualNoticeReplacesAllTemplatePlaceholders() throws Exception {
        BusinessTaxProfile profile = new BusinessTaxProfile();
        profile.setTaxpayerName("Minh Anh");
        profile.setTaxpayerIdentity("0123456789");
        when(profileRepository.findByStoreIdAndTaxYearAndIsRemovedFalse(1, 2026))
                .thenReturn(Optional.of(profile));
        when(accountingService.getYearSummary(2026)).thenReturn(new AccountingSummaryResponse(
                2026, "YEAR", 2026, new BigDecimal("125000000.00"), true, false, List.of()));

        byte[] bytes = new TaxTemplateService(accountingService, profileRepository)
                .exportAnnualRevenueNotice(2026, TaxPeriodType.YEAR);

        assertTrue(bytes.length > 0);
        try (XWPFDocument document = new XWPFDocument(new ByteArrayInputStream(bytes))) {
            String text = document.getParagraphs().stream()
                    .flatMap(paragraph -> paragraph.getRuns().stream())
                    .map(run -> run.getText(0))
                    .filter(java.util.Objects::nonNull)
                    .reduce("", String::concat)
                    + document.getTables().stream()
                    .flatMap(table -> table.getRows().stream())
                    .flatMap(row -> row.getTableCells().stream())
                    .flatMap(cell -> cell.getParagraphs().stream())
                    .flatMap(paragraph -> paragraph.getRuns().stream())
                    .map(run -> run.getText(0))
                    .filter(java.util.Objects::nonNull)
                    .reduce("", String::concat);
            assertTrue(text.contains("Minh Anh"));
            assertTrue(text.contains("0123456789"));
            assertTrue(text.contains("2026"));
            assertTrue(text.contains("125"));
            assertFalse(text.contains("{{"));
        }
    }
}
