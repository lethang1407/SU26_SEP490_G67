package project.be_sep490_g67.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import project.be_sep490_g67.entity.ImportOrder;

@Repository
public interface ImportOrderRepository extends JpaRepository<ImportOrder, Integer> {
}
