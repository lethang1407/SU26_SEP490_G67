package project.be_sep490_g67.utils;

public final class PhoneNumberUtil {

    private PhoneNumberUtil() {}

    public static String normalize(String phone) {
        if (phone == null || phone.isBlank()) {
            return "";
        }

        String digits = phone.replaceAll("\\D", "");

        if (digits.startsWith("84")) {
            digits = "0" + digits.substring(2);
        } else if (!digits.startsWith("0")) {
            digits = "0" + digits;
        }

        return digits;
    }
    public static String standardize(String phone) {
        if (phone == null || phone.isBlank()) {
            return "";
        }

        String digits = phone.replaceAll("\\D", "");

        if (digits.startsWith("0")) {
            digits = "84" + digits.substring(1);
        }
        return digits;
    }

    public static boolean isValid(String phone) {
        String digits = normalize(phone);

        if (digits.isEmpty()) {
            return false;
        }

        if (digits.length() == 10 && digits.matches("^0[35789].*")) {
            return true;
        }

        return digits.length() == 11 && digits.startsWith("02");
    }

    public static String formatDisplay(String phone) {
        String digits = normalize(phone);

        if (digits.length() == 10) {
            return digits.substring(0, 4) + " " + digits.substring(4, 7) + " " + digits.substring(7);
        }

        if (digits.length() == 11) {
            return digits.substring(0, 3) + " " + digits.substring(3, 7) + " " + digits.substring(7);
        }

        return phone;
    }
}
