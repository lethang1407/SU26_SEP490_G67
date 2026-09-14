package project.be_sep490_g67.enums;

import project.be_sep490_g67.constants.ImportTrialConstants;
import project.be_sep490_g67.exception.AppException;
import project.be_sep490_g67.exception.ErrorCode;

public enum ImportTrialDecision {
    PAY_SOLD_RETURN_REST,
    PAY_ALL_KEEP;

    public static ImportTrialDecision from(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new AppException(ErrorCode.TRIAL_DECISION_INVALID);
        }
        String normalized = raw.trim().toUpperCase();
        if (ImportTrialConstants.DECISION_KEEP_ALL.equals(normalized)
                || "KEEP".equals(normalized)
                || "GIU_HET".equals(normalized)) {
            return PAY_ALL_KEEP;
        }
        if (ImportTrialConstants.DECISION_RETURN_REST.equals(normalized)
                || "RETURN".equals(normalized)
                || "TRA_PHAN_CON".equals(normalized)
                || "RETURN_ALL".equals(normalized)) {
            return PAY_SOLD_RETURN_REST;
        }
        throw new AppException(ErrorCode.TRIAL_DECISION_INVALID);
    }
}
