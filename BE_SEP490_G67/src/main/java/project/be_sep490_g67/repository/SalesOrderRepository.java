package project.be_sep490_g67.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import project.be_sep490_g67.entity.SalesOrder;

public interface SalesOrderRepository extends JpaRepository<SalesOrder, Integer> {
}
