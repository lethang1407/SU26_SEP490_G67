package project.be_sep490_g67.service;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import project.be_sep490_g67.entity.AccountingRevenueLine;
import project.be_sep490_g67.entity.BusinessTaxProfile;
import project.be_sep490_g67.entity.TaxRecord;
import project.be_sep490_g67.enums.ProfileStatus;
import project.be_sep490_g67.enums.RevenueClassification;
import project.be_sep490_g67.enums.TaxPeriodType;
import project.be_sep490_g67.enums.TaxRecordStatus;
import project.be_sep490_g67.enums.TaxDeclarationStatus;
import project.be_sep490_g67.repository.AccountingRevenueLineRepository;
import project.be_sep490_g67.repository.BusinessTaxProfileRepository;
import project.be_sep490_g67.repository.TaxRecordRepository;
import project.be_sep490_g67.dto.request.ConfirmTaxRecordRequest;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.Instant;

/** Tính và lưu nghĩa vụ thuế năm từ các dòng sổ đã ghi nhận. */
@Service
@RequiredArgsConstructor
@PreAuthorize("hasRole('MANAGER')")
public class TaxRecordService {
    private static final BigDecimal REVENUE_THRESHOLD = new BigDecimal("1000000000.00");
    private static final BigDecimal VAT_RATE = new BigDecimal("0.0050");
    private static final BigDecimal PIT_RATE = new BigDecimal("0.0100");
    private static final BigDecimal ZERO = BigDecimal.ZERO.setScale(2, RoundingMode.UNNECESSARY);
    private static final String LEGAL_VERSION = "NĐ68/2026-TT89/2026";
    private static final String TEMPLATE_VERSION = "01-TKN-CNKD-2026";

    private final BusinessTaxProfileRepository profileRepository;
    private final AccountingRevenueLineRepository revenueLineRepository;
    private final TaxRecordRepository taxRecordRepository;

    /** Tính lại bản ghi YEAR và trả về bản ghi mới nhất. */
    @Transactional
    public TaxRecord calculateAnnual(Integer year) {
        BusinessTaxProfile profile = profileRepository
                .findByStoreIdAndTaxYearAndIsRemovedFalse(StoreService.STORE_ID, year)
                .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Không tìm thấy hồ sơ năm"));
        if (profile.getStatus() != ProfileStatus.CONFIRMED) {
            throw error(HttpStatus.CONFLICT, "Hồ sơ năm chưa được xác nhận");
        }
        TaxRecord existing = taxRecordRepository
                .findByProfileIdAndPeriodTypeAndIsRemovedFalse(profile.getId(), TaxPeriodType.YEAR)
                .orElse(null);
        if (existing != null && existing.getDeclarationStatus() == TaxDeclarationStatus.DECLARED) {
            throw error(HttpStatus.CONFLICT, "Hồ sơ đã kê khai; không được cập nhật nghĩa vụ thuế");
        }

        BigDecimal revenue = revenueLineRepository.findByPeriodProfileIdAndIsRemovedFalse(profile.getId())
                .stream()
                .filter(line -> line.getClassification() != RevenueClassification.EXCLUDED)
                .map(AccountingRevenueLine::getSignedAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .max(BigDecimal.ZERO)
                .setScale(2, RoundingMode.HALF_UP);

        TaxRecord record = existing != null ? existing : taxRecordRepository
                .findByProfileIdAndPeriodTypeAndIsRemovedFalse(profile.getId(), TaxPeriodType.YEAR)
                .orElseGet(() -> {
                    TaxRecord created = new TaxRecord();
                    created.setProfile(profile);
                    created.setPeriodType(TaxPeriodType.YEAR);
                    return created;
                });
        record.setRevenueBase(revenue);
        record.setRevenueThreshold(REVENUE_THRESHOLD);
        record.setDueDate(LocalDate.of(year + 1, 1, 31));
        record.setLegalVersion(LEGAL_VERSION);
        record.setTemplateVersion(TEMPLATE_VERSION);
        record.setCalculatedAt(java.time.Instant.now());

        if (revenue.compareTo(REVENUE_THRESHOLD) <= 0) {
            record.setVatRate(ZERO);
            record.setPitRate(ZERO);
            record.setVatAmount(ZERO);
            record.setPitAmount(ZERO);
            record.setTotalTaxAmount(ZERO);
            record.setStatus(TaxRecordStatus.NO_TAX_PAYABLE);
        } else {
            BigDecimal vat = revenue.multiply(VAT_RATE).setScale(2, RoundingMode.HALF_UP);
            BigDecimal pit = revenue.multiply(PIT_RATE).setScale(2, RoundingMode.HALF_UP);
            record.setVatRate(VAT_RATE);
            record.setPitRate(PIT_RATE);
            record.setVatAmount(vat);
            record.setPitAmount(pit);
            record.setTotalTaxAmount(vat.add(pit).setScale(2, RoundingMode.HALF_UP));
            record.setStatus(TaxRecordStatus.CALCULATED);
        }
        record.setConfirmedAt(null);
        return taxRecordRepository.save(record);
    }

    @Transactional(readOnly = true)
    public TaxRecord getAnnual(Integer year) {
        BusinessTaxProfile profile = profileRepository
                .findByStoreIdAndTaxYearAndIsRemovedFalse(StoreService.STORE_ID, year)
                .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Không tìm thấy hồ sơ năm"));
        return taxRecordRepository
                .findByProfileIdAndPeriodTypeAndIsRemovedFalse(profile.getId(), TaxPeriodType.YEAR)
                .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Chưa có bản tính nghĩa vụ thuế năm"));
    }

    @Transactional
    public TaxRecord confirmAnnual(Integer year, ConfirmTaxRecordRequest request) {
        TaxRecord record = getAnnual(year);
        if (!record.getVersion().equals(request.version())) {
            throw error(HttpStatus.CONFLICT, "Bản tính thuế đã thay đổi, vui lòng tải lại dữ liệu");
        }
        if (record.getStatus() != TaxRecordStatus.CALCULATED
                && record.getStatus() != TaxRecordStatus.NO_TAX_PAYABLE) {
            throw error(HttpStatus.CONFLICT, "Bản tính thuế chưa sẵn sàng để xác nhận");
        }
        record.setStatus(TaxRecordStatus.CONFIRMED);
        record.setConfirmedAt(Instant.now());
        return taxRecordRepository.save(record);
    }

    @Transactional
    public TaxRecord declareAnnual(Integer year) {
        TaxRecord record = getAnnual(year);
        if (record.getStatus() != TaxRecordStatus.CALCULATED
                && record.getStatus() != TaxRecordStatus.NO_TAX_PAYABLE) {
            throw error(HttpStatus.CONFLICT, "Chưa có kết quả tính thuế hợp lệ để kê khai");
        }
        record.setDeclarationStatus(TaxDeclarationStatus.DECLARED);
        record.setConfirmedAt(Instant.now());
        return taxRecordRepository.save(record);
    }

    private static ResponseStatusException error(HttpStatus status, String message) {
        return new ResponseStatusException(status, message);
    }
}
