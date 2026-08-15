package project.be_sep490_g67.repository;

import org.springframework.data.jpa.repository.EntityGraph;
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

    @EntityGraph(attributePaths = {"roles", "roles.permissions", "customPermissions"})
    @Query("SELECT u FROM User u WHERE u.username = :username AND u.isRemoved = false")
    Optional<User> findActiveByUsernameWithRole(@Param("username") String username);

    @Query("SELECT u.id FROM User u WHERE u.username = :username AND u.isRemoved = false")
    Optional<Integer> findIdByUsername(@Param("username") String username);

    @EntityGraph(attributePaths = {"roles"})
    @Query("""
            SELECT u FROM User u
            WHERE u.isRemoved = false
            AND EXISTS (
                SELECT 1 FROM u.roles r
                WHERE UPPER(r.name) IN ('CASHIER', 'ACCOUNTANT', 'WAREHOUSE')
            )
            """)
    List<User> findAllActiveStaff();

    @EntityGraph(attributePaths = {"roles"})
    @Query("SELECT u FROM User u WHERE u.id = :id AND u.isRemoved = false")
    Optional<User> findActiveStaffByIdWithRoles(@Param("id") Integer id);

    /** Người nhận mặc định của các thông báo cần quản lý xử lý. */
    @Query("""
            SELECT u FROM User u
            WHERE u.isRemoved = false
            AND EXISTS (
                SELECT 1 FROM u.roles r
                WHERE UPPER(r.name) = 'ADMIN'
            )
            """)
    List<User> findAllActiveAdmins();

    @Query("SELECT u FROM User u WHERE u.id = :id AND u.isRemoved = false")
    Optional<User> findActiveById(@Param("id") Integer id);
}
