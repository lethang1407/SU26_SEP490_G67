package project.be_sep490_g67.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import project.be_sep490_g67.entity.StockMovement;

@Repository
public interface StockMovementRepository extends JpaRepository<StockMovement, Integer> {
}
