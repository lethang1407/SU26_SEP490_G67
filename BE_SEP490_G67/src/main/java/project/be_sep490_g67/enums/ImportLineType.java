package project.be_sep490_g67.enums;

import project.be_sep490_g67.constants.ImportTrialConstants;

public enum ImportLineType {
    REGULAR,
    PROMOTION,
    TRIAL;

    public static ImportLineType from(String raw, Boolean isPromotion, Boolean isTrial) {
        if (isTrial != null && isTrial) {
            return TRIAL;
        }
        if (raw != null && !raw.isBlank()) {
            String normalized = raw.trim().toUpperCase();
            if (ImportTrialConstants.LINE_TRIAL.equals(normalized) || "BAN_THU".equals(normalized)) {
                return TRIAL;
            }
            if (ImportTrialConstants.LINE_PROMOTION.equals(normalized) || "KM".equals(normalized)) {
                return PROMOTION;
            }
            return REGULAR;
        }
        if (isPromotion != null && isPromotion) {
            return PROMOTION;
        }
        return REGULAR;
    }

    public boolean isPayableAtImport() {
        return this == REGULAR || this == TRIAL;
    }
}
