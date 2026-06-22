package project.be_sep490_g67.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import project.be_sep490_g67.entity.Permission;

import java.util.Collection;
import java.util.List;

@Repository
public interface PermissionRepository extends JpaRepository<Permission, Integer> {

    List<Permission> findByCodeInIgnoreCaseAndIsRemovedFalse(Collection<String> codes);
}
