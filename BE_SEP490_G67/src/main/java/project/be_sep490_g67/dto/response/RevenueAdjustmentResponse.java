package project.be_sep490_g67.dto.response;

import java.time.Instant;
import project.be_sep490_g67.dto.request.RevenueAdjustmentInformation;
import project.be_sep490_g67.entity.RevenueAdjustment;
import project.be_sep490_g67.enums.AdjustmentStatus;

public record RevenueAdjustmentResponse(Integer id, Integer profileId, Integer taxYear,
        String idempotencyKey, RevenueAdjustmentInformation information, AdjustmentStatus status,
        Integer approvedBy, Instant approvedAt, Long version) {
    public static RevenueAdjustmentResponse from(RevenueAdjustment a) {
        return new RevenueAdjustmentResponse(a.getId(), a.getProfile().getId(), a.getProfile().getTaxYear(),
                a.getIdempotencyKey(), informationOf(a), a.getStatus(), a.getApprovedBy(), a.getApprovedAt(), a.getVersion());
    }
    public static RevenueAdjustmentInformation informationOf(RevenueAdjustment a) {
        return new RevenueAdjustmentInformation(a.getSourceType(), a.getSourceId(),
                a.getRelatedPeriod() == null ? null : a.getRelatedPeriod().getId(),
                a.getOriginalAdjustment() == null ? null : a.getOriginalAdjustment().getId(),
                a.getPostingDate(), a.getSignedAmount(), a.getClassification(),
                a.getInclusionReason(), a.getEvidence());
    }
}

