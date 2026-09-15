package project.be_sep490_g67.enums;

import project.be_sep490_g67.constants.ImportTrialConstants;

public enum ImportTrialStatus {
    OPEN,
    SETTLED;

    public static ImportTrialStatus from(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String normalized = raw.trim().toUpperCase();
        if (ImportTrialConstants.TRIAL_SETTLED.equals(normalized)) {
            return SETTLED;
        }
        if (ImportTrialConstants.TRIAL_OPEN.equals(normalized)) {
            return OPEN;
        }
        return null;
    }
}
