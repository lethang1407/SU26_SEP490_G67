package project.be_sep490_g67.repository;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.lang.reflect.Method;

import static org.assertj.core.api.Assertions.assertThat;

class ProductRepositoryQueryTest {

    @Test
    @DisplayName("searchByNameAndBarcode should bind the same named parameter used in JPQL")
    void searchByNameAndBarcode_usesMatchingNamedParameter() throws Exception {
        Method method = ProductRepository.class.getMethod("searchByNameAndBarcode", String.class);

        Query query = method.getAnnotation(Query.class);
        Param param = method.getParameters()[0].getAnnotation(Param.class);

        assertThat(query).isNotNull();
        assertThat(query.value()).contains(":query");

        assertThat(param).isNotNull();
        assertThat(param.value()).isEqualTo("query");
    }
}
