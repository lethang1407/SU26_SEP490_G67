package project.be_sep490_g67.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import project.be_sep490_g67.entity.SalesOrderAdjustment;

@Repository
public interface SalesOrderAdjustmentRepository extends JpaRepository<SalesOrderAdjustment, Integer> {
}
