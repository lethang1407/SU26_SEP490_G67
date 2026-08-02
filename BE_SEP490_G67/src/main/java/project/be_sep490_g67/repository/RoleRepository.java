package project.be_sep490_g67.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import project.be_sep490_g67.entity.Role;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface RoleRepository extends JpaRepository<Role, Integer> {

    @Query("""
            SELECT r FROM Role r
            LEFT JOIN FETCH r.permissions
            WHERE LOWER(r.name) = LOWER(:name) AND r.isRemoved = false
            """)
    Optional<Role> findByNameIgnoreCaseAndIsRemovedFalse(@Param("name") String name);

    List<Role> findByNameInIgnoreCaseAndIsRemovedFalse(Collection<String> names);
}
