package project.be_sep490_g67.utils;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

public class passcode {
    public static void main(String[] args) {
        PasswordEncoder passwordEncoder = new BCryptPasswordEncoder(10);

        String rawPassword = "Test@123";
        String encodedPassword = passwordEncoder.encode(rawPassword);

        System.out.println("Mật khẩu gốc: " + rawPassword);
        System.out.println("Mật khẩu sau khi mã hóa (BCrypt): " + encodedPassword);
        boolean authenticated = passwordEncoder.matches(rawPassword,encodedPassword);
        System.out.println("Authenticate :"+ authenticated);
    }

}
