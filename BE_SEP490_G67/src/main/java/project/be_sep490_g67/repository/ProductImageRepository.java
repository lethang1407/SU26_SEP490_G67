package project.be_sep490_g67.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import project.be_sep490_g67.entity.ProductImage;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductImageRepository extends JpaRepository<ProductImage, Integer> {
    List<ProductImage> findByProductIdAndIsRemovedFalseOrderBySortOrderAscIdAsc(Integer productId);

    Optional<ProductImage> findByIdAndProductIdAndIsRemovedFalse(Integer id, Integer productId);

    long countByProductIdAndIsRemovedFalse(Integer productId);
}
