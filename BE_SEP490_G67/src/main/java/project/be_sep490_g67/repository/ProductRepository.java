package project.be_sep490_g67.repository;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import project.be_sep490_g67.entity.Product;

import java.util.List;
import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, Integer> {

    /**
     * Find an active product by its barcode.
     */
    @Query("SELECT p FROM Product p WHERE p.barcode = :barcode AND (p.isRemoved = false OR p.isRemoved IS NULL)")
    Optional<Product> findByBarcode(@Param("barcode") String barcode);

    @EntityGraph(attributePaths = {"category"})
    @Query("""
            SELECT p FROM Product p
            WHERE (p.isRemoved = false OR p.isRemoved IS NULL)
            ORDER BY p.name ASC
            """)
    List<Product> findAllActive();

    @EntityGraph(attributePaths = {"category"})
    @Query("""
            SELECT p FROM Product p
            WHERE p.id = :id AND (p.isRemoved = false OR p.isRemoved IS NULL)
            """)
    Optional<Product> findActiveById(@Param("id") Integer id);

    boolean existsByBarcodeAndIsRemovedFalse(String barcode);

    boolean existsByBarcodeAndIdNotAndIsRemovedFalse(String barcode, Integer id);

    boolean existsByParent_IdAndIsRemovedFalse(Integer parentId);

    /**
     * Hàng bán được / nhập được: SP thường hoặc SP con.
     * Loại nhóm hàng (có ít nhất một con active).
     */
    @EntityGraph(attributePaths = {"category", "parent"})
    @Query("""
            SELECT DISTINCT p
            FROM Product p
            LEFT JOIN p.parent parent
            WHERE (p.isRemoved = false OR p.isRemoved IS NULL)
              AND NOT EXISTS (
                    SELECT 1 FROM Product child
                    WHERE child.parent.id = p.id
                      AND (child.isRemoved = false OR child.isRemoved IS NULL)
              )
              AND (
                    lower(p.name) LIKE lower(concat('%', :query, '%'))
                    OR (p.barcode IS NOT NULL AND lower(p.barcode) LIKE lower(concat('%', :query, '%')))
                    OR (p.sku IS NOT NULL AND lower(p.sku) LIKE lower(concat('%', :query, '%')))
                    OR (parent IS NOT NULL AND lower(parent.name) LIKE lower(concat('%', :query, '%')))
                    OR (parent IS NOT NULL AND parent.barcode IS NOT NULL
                        AND lower(parent.barcode) LIKE lower(concat('%', :query, '%')))
                    OR (parent IS NOT NULL AND parent.sku IS NOT NULL
                        AND lower(parent.sku) LIKE lower(concat('%', :query, '%')))
                  )
            """)
    List<Product> searchSellableByNameAndBarcode(@Param("query") String query);
}
