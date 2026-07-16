package project.be_sep490_g67.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import project.be_sep490_g67.entity.ImportOrderDetail;

@Repository
public interface ImportOrderDetailRepository extends JpaRepository<ImportOrderDetail, Integer> {
}
