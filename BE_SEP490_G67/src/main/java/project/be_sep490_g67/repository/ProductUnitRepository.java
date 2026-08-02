package project.be_sep490_g67.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import project.be_sep490_g67.entity.ProductUnit;

import java.util.List;

@Repository
public interface ProductUnitRepository extends JpaRepository<ProductUnit, Integer> {
    List<ProductUnit> findByProductIdAndIsRemovedFalse(Integer productId);

    void deleteByProductId(Integer productId);
}
