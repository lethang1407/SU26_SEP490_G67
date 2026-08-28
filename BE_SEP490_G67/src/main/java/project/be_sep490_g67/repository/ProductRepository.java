package project.be_sep490_g67.repository;

import org.springframework.data.jpa.repository.EntityGraph;
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

    List<Product> findByParent_IdAndIsRemovedFalse(Integer parentId);

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
    List<Product> searchByNameAndBarcode(@Param("query") String query);

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

    boolean existsBySkuIgnoreCaseAndIsRemovedFalse(String sku);

    boolean existsBySkuIgnoreCaseAndIdNotAndIsRemovedFalse(String sku, Integer id);

    @Query("""
            SELECT p, COALESCE(SUM(CASE WHEN sz.zoneType <> 'RETURN_HOLD'
                                        THEN bl.quantity ELSE 0 END), 0)
            FROM Product p
            LEFT JOIN StockBatch sb ON sb.product = p AND sb.isRemoved = false
            LEFT JOIN BatchLocation bl ON bl.batch = sb AND bl.isRemoved = false
            LEFT JOIN bl.location loc
            LEFT JOIN loc.storageZone sz
            WHERE p.isRemoved = false
              AND p.status = 'active'
            GROUP BY p
            HAVING COALESCE(SUM(CASE WHEN sz.zoneType <> 'RETURN_HOLD'
                                     THEN bl.quantity ELSE 0 END), 0) <= COALESCE(p.minStock, 0)
            ORDER BY COALESCE(SUM(CASE WHEN sz.zoneType <> 'RETURN_HOLD'
                                       THEN bl.quantity ELSE 0 END), 0) ASC, p.id ASC
            """)
    List<Object[]> findOutOfStockOrBelowMinimum();

}
