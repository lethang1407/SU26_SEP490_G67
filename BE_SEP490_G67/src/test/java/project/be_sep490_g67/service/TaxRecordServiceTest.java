package project.be_sep490_g67.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;
import project.be_sep490_g67.dto.request.ConfirmTaxRecordRequest;
import project.be_sep490_g67.entity.AccountingRevenueLine;
import project.be_sep490_g67.entity.BusinessTaxProfile;
import project.be_sep490_g67.entity.TaxRecord;
import project.be_sep490_g67.enums.ProfileStatus;
import project.be_sep490_g67.enums.RevenueClassification;
import project.be_sep490_g67.enums.TaxPeriodType;
import project.be_sep490_g67.enums.TaxRecordStatus;
import project.be_sep490_g67.repository.AccountingRevenueLineRepository;
import project.be_sep490_g67.repository.BusinessTaxProfileRepository;
import project.be_sep490_g67.repository.TaxRecordRepository;
import project.be_sep490_g67.repository.AccountingPeriodRepository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TaxRecordServiceTest {
    @Mock BusinessTaxProfileRepository profileRepository;
    @Mock AccountingRevenueLineRepository revenueLineRepository;
    @Mock TaxRecordRepository taxRecordRepository;
    @Mock AccountingPeriodRepository accountingPeriodRepository;
    @Mock AccountingService accountingService;

    private final BusinessTaxProfile profile = confirmedProfile();

    @Test
    void revenueAtOrBelowOneBillionIsNoTaxPayable() {
        givenProfile();
        when(revenueLineRepository.findByPeriodProfileIdAndIsRemovedFalse(10))
                .thenReturn(List.of(line("1000000000.00", RevenueClassification.SALE)));
        when(taxRecordRepository.findByProfileIdAndPeriodTypeAndIsRemovedFalse(10, TaxPeriodType.YEAR))
                .thenReturn(Optional.empty());
        when(taxRecordRepository.save(any(TaxRecord.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TaxRecord result = service().calculateAnnual(2026);

        assertEquals(TaxRecordStatus.NO_TAX_PAYABLE, result.getStatus());
        assertEquals(new BigDecimal("0.00"), result.getTotalTaxAmount());
        assertEquals("2027-01-31", result.getDueDate().toString());
    }

    @Test
    void revenueAboveThresholdUsesRetailRatesOnFullRevenue() {
        givenProfile();
        when(revenueLineRepository.findByPeriodProfileIdAndIsRemovedFalse(10))
                .thenReturn(List.of(line("1200000000.00", RevenueClassification.SALE)));
        when(taxRecordRepository.findByProfileIdAndPeriodTypeAndIsRemovedFalse(10, TaxPeriodType.YEAR))
                .thenReturn(Optional.empty());
        when(taxRecordRepository.save(any(TaxRecord.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TaxRecord result = service().calculateAnnual(2026);

        assertEquals(TaxRecordStatus.CALCULATED, result.getStatus());
        assertEquals(new BigDecimal("6000000.00"), result.getVatAmount());
        assertEquals(new BigDecimal("12000000.00"), result.getPitAmount());
        assertEquals(new BigDecimal("18000000.00"), result.getTotalTaxAmount());
    }

    @Test
    void excludedLinesDoNotIncreaseTaxableRevenue() {
        givenProfile();
        when(revenueLineRepository.findByPeriodProfileIdAndIsRemovedFalse(10)).thenReturn(List.of(
                line("900000000.00", RevenueClassification.SALE),
                line("500000000.00", RevenueClassification.EXCLUDED)));
        when(taxRecordRepository.findByProfileIdAndPeriodTypeAndIsRemovedFalse(10, TaxPeriodType.YEAR))
                .thenReturn(Optional.empty());
        when(taxRecordRepository.save(any(TaxRecord.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TaxRecord result = service().calculateAnnual(2026);

        assertEquals(new BigDecimal("900000000.00"), result.getRevenueBase());
        assertEquals(TaxRecordStatus.NO_TAX_PAYABLE, result.getStatus());
    }

    @Test
    void cannotCalculateUnconfirmedProfile() {
        profile.setStatus(ProfileStatus.DRAFT);
        givenProfile();

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> service().calculateAnnual(2026));

        assertEquals(409, exception.getStatusCode().value());
        verifyNoInteractions(revenueLineRepository, taxRecordRepository);
    }

    @Test
    void confirmRequiresCurrentVersionAndCalculatedState() {
        givenProfile();
        TaxRecord record = new TaxRecord();
        record.setId(1);
        record.setProfile(profile);
        record.setPeriodType(TaxPeriodType.YEAR);
        record.setStatus(TaxRecordStatus.CALCULATED);
        record.setVersion(3L);
        when(taxRecordRepository.findByProfileIdAndPeriodTypeAndIsRemovedFalse(10, TaxPeriodType.YEAR))
                .thenReturn(Optional.of(record));
        when(taxRecordRepository.save(any(TaxRecord.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TaxRecord result = service().confirmAnnual(2026, new ConfirmTaxRecordRequest(3L));

        assertEquals(TaxRecordStatus.CONFIRMED, result.getStatus());
        assertNotNull(result.getConfirmedAt());
    }

    @Test
    void confirmRejectsStaleVersion() {
        givenProfile();
        TaxRecord record = new TaxRecord();
        record.setProfile(profile);
        record.setStatus(TaxRecordStatus.CALCULATED);
        record.setVersion(3L);
        when(taxRecordRepository.findByProfileIdAndPeriodTypeAndIsRemovedFalse(10, TaxPeriodType.YEAR))
                .thenReturn(Optional.of(record));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> service().confirmAnnual(2026, new ConfirmTaxRecordRequest(2L)));

        assertEquals(409, exception.getStatusCode().value());
        verify(taxRecordRepository, never()).save(any());
    }

    private TaxRecordService service() {
        return new TaxRecordService(profileRepository, revenueLineRepository, taxRecordRepository,
                accountingPeriodRepository, accountingService);
    }

    private void givenProfile() {
        when(profileRepository.findByStoreIdAndTaxYearAndIsRemovedFalse(1, 2026))
                .thenReturn(Optional.of(profile));
    }

    private static BusinessTaxProfile confirmedProfile() {
        BusinessTaxProfile p = new BusinessTaxProfile();
        p.setId(10);
        p.setTaxYear(2026);
        p.setStatus(ProfileStatus.CONFIRMED);
        return p;
    }

    private static AccountingRevenueLine line(String amount, RevenueClassification classification) {
        AccountingRevenueLine line = new AccountingRevenueLine();
        line.setSignedAmount(new BigDecimal(amount));
        line.setClassification(classification);
        return line;
    }
}
