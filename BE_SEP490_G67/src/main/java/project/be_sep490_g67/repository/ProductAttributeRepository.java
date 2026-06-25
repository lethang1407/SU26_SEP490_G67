package project.be_sep490_g67.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import project.be_sep490_g67.entity.ProductAttribute;

import java.util.List;

@Repository
public interface ProductAttributeRepository extends JpaRepository<ProductAttribute, Integer> {

    @Query("""
            SELECT pa FROM ProductAttribute pa
            JOIN FETCH pa.attribute
            WHERE pa.product.id = :productId
              AND pa.isRemoved = false
            """)
    List<ProductAttribute> findByProduct_IdAndIsRemovedFalse(@Param("productId") Integer productId);
}
