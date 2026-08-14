package project.be_sep490_g67.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import project.be_sep490_g67.entity.Attribute;

import java.util.Optional;

@Repository
public interface AttributeRepository extends JpaRepository<Attribute, Integer> {
    Optional<Attribute> findByNameIgnoreCaseAndIsRemovedFalse(String name);
}
