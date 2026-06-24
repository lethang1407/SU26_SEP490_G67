package project.be_sep490_g67.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import project.be_sep490_g67.entity.Category;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Integer> {
    @Query("""
        SELECT c
        FROM Category c
        WHERE c.isRemoved = false
          AND (
                :search IS NULL
                OR :search = ''
                OR LOWER(c.name) LIKE LOWER(CONCAT('%', :search, '%'))
                OR LOWER(c.description) LIKE LOWER(CONCAT('%', :search, '%'))
              )
        """)
    Page<Category> findAllCategory(
            @Param("search") String search,
            Pageable pageable);

    boolean existsByNameIgnoreCaseAndIdNot(String name, Integer id);
}
