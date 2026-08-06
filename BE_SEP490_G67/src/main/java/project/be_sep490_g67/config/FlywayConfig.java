package project.be_sep490_g67.config;

import org.flywaydb.core.Flyway;
import org.springframework.beans.factory.config.BeanFactoryPostProcessor;
import org.springframework.beans.factory.support.BeanDefinitionRegistry;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import javax.sql.DataSource;
import java.util.Arrays;

@Configuration
public class FlywayConfig {

    /**
     * Đảm bảo Flyway migrate xong trước khi Hibernate EntityManagerFactory
     * chạy ddl-auto (tránh Hibernate tạo cột/FK nửa chừng trước V15).
     */
    @Bean
    public static BeanFactoryPostProcessor entityManagerFactoryDependsOnFlyway() {
        return beanFactory -> {
            if (!(beanFactory instanceof BeanDefinitionRegistry registry)) {
                return;
            }
            if (!registry.containsBeanDefinition("flyway")) {
                return;
            }
            for (String emfName : new String[]{"entityManagerFactory", "entityManagerFactoryBuilder"}) {
                if (!registry.containsBeanDefinition(emfName)) {
                    continue;
                }
                var definition = registry.getBeanDefinition(emfName);
                String[] dependsOn = definition.getDependsOn();
                if (dependsOn == null) {
                    definition.setDependsOn("flyway");
                } else if (Arrays.stream(dependsOn).noneMatch("flyway"::equals)) {
                    String[] next = Arrays.copyOf(dependsOn, dependsOn.length + 1);
                    next[dependsOn.length] = "flyway";
                    definition.setDependsOn(next);
                }
            }
        };
    }

    @Bean(initMethod = "migrate")
    public Flyway flyway(DataSource dataSource) {
        Flyway flyway = Flyway.configure()
                .dataSource(dataSource)
                .locations("classpath:db/migration")
                .baselineOnMigrate(true)
                .load();
        flyway.repair();
        return flyway;
    }
}
