package project.be_sep490_g67.enums;

public enum ResolutionType {

    REFUND(false),

    EXCHANGE_EVEN(true),

    EXCHANGE_DIFF(true);

    private final boolean requiresPairing;

    ResolutionType(boolean requiresPairing) {
        this.requiresPairing = requiresPairing;
    }

    public boolean requiresPairing() {
        return requiresPairing;
    }
}
