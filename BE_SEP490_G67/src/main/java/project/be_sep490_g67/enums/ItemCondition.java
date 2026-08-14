package project.be_sep490_g67.enums;

public enum ItemCondition {

    RESELLABLE(true),
    DAMAGED(false),
    EXPIRED(false),
    OPENED(false);

    private final boolean sellable;

    ItemCondition(boolean sellable) {
        this.sellable = sellable;
    }

    public boolean isSellable() {
        return sellable;
    }
}
