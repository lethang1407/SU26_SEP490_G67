package project.be_sep490_g67.dto.response;

import java.time.Instant;
import project.be_sep490_g67.entity.BusinessTaxProfile;
import project.be_sep490_g67.enums.*;

public record TaxProfileResponse(
        Integer id, Integer storeId, Integer taxYear, Instant trackingStartedAt,
        String taxpayerIdentity, String taxpayerName, String taxpayerAddress, String taxAuthority,
        DeclaredMethod declaredMethod, InvoiceRegistrationStatus invoiceRegistrationStatus,
        ProfileStatus status, Integer confirmedBy, Instant confirmedAt, Long version) {
    public static TaxProfileResponse from(BusinessTaxProfile p) {
        return new TaxProfileResponse(p.getId(), p.getStore().getId(), p.getTaxYear(),
                p.getTrackingStartedAt(), p.getTaxpayerIdentity(), p.getTaxpayerName(),
                p.getTaxpayerAddress(), p.getTaxAuthority(), p.getDeclaredMethod(),
                p.getInvoiceRegistrationStatus(), p.getStatus(), p.getConfirmedBy(),
                p.getConfirmedAt(), p.getVersion());
    }
}

