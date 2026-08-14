package project.be_sep490_g67.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import project.be_sep490_g67.entity.ProductAttribute;

import java.util.Collection;
import java.util.List;

@Repository
public interface ProductAttributeRepository extends JpaRepository<ProductAttribute, Integer> {
    List<ProductAttribute> findByProductIdAndIsRemovedFalse(Integer productId);

    void deleteByProductId(Integer productId);

    @Query("""
            SELECT pa FROM ProductAttribute pa
            JOIN FETCH pa.attribute
            WHERE pa.product.id = :productId
              AND pa.isRemoved = false
            """)
    List<ProductAttribute> findByProduct_IdAndIsRemovedFalse(@Param("productId") Integer productId);

    @Query("""
            SELECT pa FROM ProductAttribute pa
            JOIN FETCH pa.attribute
            JOIN FETCH pa.product
            WHERE pa.product.id IN :productIds
              AND pa.isRemoved = false
            """)
    List<ProductAttribute> findByProduct_IdInAndIsRemovedFalse(
            @Param("productIds") Collection<Integer> productIds);
}
