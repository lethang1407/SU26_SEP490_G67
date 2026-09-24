package project.be_sep490_g67.dto.request;

import jakarta.validation.constraints.Size;
import project.be_sep490_g67.enums.DeclaredMethod;
import project.be_sep490_g67.enums.InvoiceRegistrationStatus;

/** UNKNOWN and empty identity fields are allowed in drafts; confirmation validates completeness. */
public record TaxProfileInformation(
        @Size(max = 30) String taxpayerIdentity,
        @Size(max = 200) String taxpayerName,
        @Size(max = 500) String taxpayerAddress,
        @Size(max = 255) String taxAuthority,
        DeclaredMethod declaredMethod,
        InvoiceRegistrationStatus invoiceRegistrationStatus) {
}

