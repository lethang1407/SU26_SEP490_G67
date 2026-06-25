package project.be_sep490_g67;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.cache.annotation.EnableCaching;
import project.be_sep490_g67.config.FileStorageProperties;

@EnableCaching
@SpringBootApplication
@EnableConfigurationProperties(FileStorageProperties.class)
public class BeSep490G67Application {

    public static void main(String[] args) {
        SpringApplication.run(BeSep490G67Application.class, args);
    }

}
