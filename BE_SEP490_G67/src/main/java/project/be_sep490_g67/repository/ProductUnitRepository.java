package project.be_sep490_g67.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import project.be_sep490_g67.entity.ProductUnit;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductUnitRepository extends JpaRepository<ProductUnit, Integer> {
    List<ProductUnit> findByProductIdAndIsRemovedFalse(Integer productId);

    void deleteByProductId(Integer productId);

    List<ProductUnit> findByProduct_IdAndIsRemovedFalseOrderByUnitBaseAsc(Integer productId);

    Optional<ProductUnit> findByIdAndProduct_IdAndIsRemovedFalse(Integer id, Integer productId);

    /** Đơn vị của nhiều SP cùng lúc — tránh N+1 khi dựng danh sách widget. */
    List<ProductUnit> findByProduct_IdInAndIsRemovedFalse(List<Integer> productIds);
}
