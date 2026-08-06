package project.be_sep490_g67.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import project.be_sep490_g67.entity.Product;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, Integer> {

    /**
     * Find an active product by its barcode.
     */
    @Query("SELECT p FROM Product p WHERE p.barcode = :barcode AND (p.isRemoved = false OR p.isRemoved IS NULL)")
    Optional<Product> findByBarcode(@Param("barcode") String barcode);

    /**
     * Find active products by keyword (partial name match, case-insensitive).
     */
    @Query("""
            SELECT p
            FROM Product p
            WHERE p.isRemoved = false
              AND (
                    lower(p.name) LIKE lower(concat('%', :query, '%'))
                    OR lower(p.barcode) LIKE lower(concat('%', :query, '%'))
                  )
            """)
    List<Product> searchByNameAndBarcode(@Param("query") String query);
    @Query("""
        SELECT p FROM Product p
        LEFT JOIN FETCH p.category c
        LEFT JOIN FETCH c.defaultSupplier
        WHERE (p.isRemoved = false OR p.isRemoved IS NULL)
          AND (:keyword IS NULL OR :keyword = ''
               OR LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
               OR LOWER(p.barcode) LIKE LOWER(CONCAT('%', :keyword, '%')))
          AND (:categoryId IS NULL OR c.id = :categoryId)
        ORDER BY p.name ASC
        """)
    List<Product> findAllForList(
            @Param("keyword") String keyword,
            @Param("categoryId") Integer categoryId);

    @Query("""
        SELECT p FROM Product p
        LEFT JOIN FETCH p.category c
        LEFT JOIN FETCH c.defaultSupplier
        WHERE p.id IN :ids
          AND (p.isRemoved = false OR p.isRemoved IS NULL)
        """)
    List<Product> findAllByIdWithCategory(@Param("ids") List<Integer> ids);

    @Query("""
        SELECT p FROM Product p
        LEFT JOIN FETCH p.category c
        LEFT JOIN FETCH c.defaultSupplier
        WHERE p.id = :id
          AND (p.isRemoved = false OR p.isRemoved IS NULL)
        """)
    Optional<Product> findDetailById(@Param("id") Integer id);

    Optional<Product> findByIdAndIsRemovedFalse(Integer id);

    @Query("""
        SELECT p FROM Product p
        LEFT JOIN FETCH p.category c
        LEFT JOIN FETCH c.defaultSupplier
        WHERE LOWER(p.sku) = LOWER(:sku)
          AND (p.isRemoved = false OR p.isRemoved IS NULL)
        """)
    Optional<Product> findBySkuIgnoreCase(@Param("sku") String sku);

    boolean existsBySkuIgnoreCaseAndIsRemovedFalse(String sku);

    boolean existsBySkuIgnoreCaseAndIdNotAndIsRemovedFalse(String sku, Integer id);

    boolean existsByBarcodeAndIsRemovedFalse(String barcode);

    boolean existsByBarcodeAndIdNotAndIsRemovedFalse(String barcode, Integer id);

}
