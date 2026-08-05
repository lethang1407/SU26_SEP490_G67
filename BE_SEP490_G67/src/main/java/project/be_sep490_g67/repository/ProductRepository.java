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
            SELECT p.primarySaleLocation.id
            FROM Product p
            WHERE p.primarySaleLocation IS NOT NULL
              AND (p.isRemoved = false OR p.isRemoved IS NULL)
            """)
    List<Integer> findAllPrimarySaleLocationIds();

    @Query("""
            SELECT p FROM Product p
            WHERE p.primarySaleLocation.id = :locationId
              AND (p.isRemoved = false OR p.isRemoved IS NULL)
            """)
    Optional<Product> findByPrimarySaleLocationId(@Param("locationId") Integer locationId);
}
