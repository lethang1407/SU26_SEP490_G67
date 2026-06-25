package project.be_sep490_g67.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "app.upload")
public class FileStorageProperties {

    private String dir = "uploads";
}
