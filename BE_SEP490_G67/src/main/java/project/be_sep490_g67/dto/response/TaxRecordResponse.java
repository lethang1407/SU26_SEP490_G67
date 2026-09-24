package project.be_sep490_g67.dto.response;

import project.be_sep490_g67.entity.TaxRecord;
import project.be_sep490_g67.enums.TaxPeriodType;
import project.be_sep490_g67.enums.TaxRecordStatus;
import project.be_sep490_g67.enums.TaxDeclarationStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

/** Dữ liệu nghĩa vụ thuế năm dành cho giao diện và tài liệu kê khai. */
public record TaxRecordResponse(
        Integer id,
        Integer profileId,
        Integer taxYear,
        TaxPeriodType periodType,
        BigDecimal revenueBase,
        BigDecimal revenueThreshold,
        BigDecimal vatRate,
        BigDecimal pitRate,
        BigDecimal vatAmount,
        BigDecimal pitAmount,
        BigDecimal totalTaxAmount,
        TaxRecordStatus status,
        TaxDeclarationStatus declarationStatus,
        LocalDate dueDate,
        Instant calculatedAt,
        Instant confirmedAt,
        String legalVersion,
        String templateVersion,
        Long version) {

    public static TaxRecordResponse from(TaxRecord record) {
        return new TaxRecordResponse(
                record.getId(),
                record.getProfile().getId(),
                record.getProfile().getTaxYear(),
                record.getPeriodType(),
                record.getRevenueBase(),
                record.getRevenueThreshold(),
                record.getVatRate(),
                record.getPitRate(),
                record.getVatAmount(),
                record.getPitAmount(),
                record.getTotalTaxAmount(),
                record.getStatus(),
                record.getDeclarationStatus(),
                record.getDueDate(),
                record.getCalculatedAt(),
                record.getConfirmedAt(),
                record.getLegalVersion(),
                record.getTemplateVersion(),
                record.getVersion());
    }
}
