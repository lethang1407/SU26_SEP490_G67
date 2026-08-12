package project.be_sep490_g67.enums;

public enum SalesOrderStatus {

    COMPLETED,
    CANCELLED,
    PARTIALLY_RETURNED,
    RETURNED;

    public boolean isReturned() {
        return this == PARTIALLY_RETURNED || this == RETURNED;
    }
}
