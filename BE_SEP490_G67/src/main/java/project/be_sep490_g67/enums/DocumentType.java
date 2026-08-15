package project.be_sep490_g67.enums;

public enum DocumentType {

    SALE_INVOICE("HD"),
    CREDIT_NOTE("HDT"),
    EXCHANGE_INVOICE("HDD"),
        RECONSTRUCTED_INVOICE("HDR");

    private final String prefix;

    DocumentType(String prefix) {
        this.prefix = prefix;
    }

    public String getPrefix() {
        return prefix;
    }
}
