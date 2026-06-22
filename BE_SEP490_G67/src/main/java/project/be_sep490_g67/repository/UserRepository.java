package project.be_sep490_g67.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import project.be_sep490_g67.entity.User;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Integer> {

    Optional<User> findByUsername(String username);

    Optional<User> findByPhoneNumber(String phoneNumber);

    Optional<User> findByUsernameAndIsRemovedFalse(String username);

    boolean existsByPhoneNumberAndIdNot(String phoneNumber, Integer id);

    boolean existsByUsernameAndIsRemovedFalse(String username);

    boolean existsByUsernameAndIdNotAndIsRemovedFalse(String username, Integer id);

    @Query("SELECT u FROM User u JOIN FETCH u.role WHERE u.username = :username AND u.isRemoved = false")
    Optional<User> findActiveByUsernameWithRole(@Param("username") String username);

    @Query("SELECT u.id FROM User u WHERE u.username = :username AND u.isRemoved = false")
    Optional<Integer> findIdByUsername(@Param("username") String username);

    @Query("""
            SELECT u FROM User u
            JOIN FETCH u.role r
            WHERE u.isRemoved = false
            AND UPPER(r.name) = 'STAFF'
            """)
    List<User> findAllActiveStaff();

    @Query("""
            SELECT u FROM User u
            JOIN FETCH u.role r
            LEFT JOIN FETCH r.permissions
            WHERE u.id = :id AND u.isRemoved = false
            """)
    Optional<User> findActiveStaffByIdWithRole(@Param("id") Integer id);
}
