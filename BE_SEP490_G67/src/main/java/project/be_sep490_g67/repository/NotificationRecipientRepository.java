package project.be_sep490_g67.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import project.be_sep490_g67.entity.NotificationRecipient;

import java.util.Optional;

@Repository
public interface NotificationRecipientRepository extends JpaRepository<NotificationRecipient, Integer> {

    @Query("""
            SELECT nr FROM NotificationRecipient nr
            JOIN FETCH nr.notification n
            WHERE nr.user.id = :userId AND nr.isRemoved = false AND n.isRemoved = false
            ORDER BY n.createdAt DESC
            """)
    Page<NotificationRecipient> findInboxByUserId(@Param("userId") Integer userId, Pageable pageable);

    @Query("""
            SELECT COUNT(nr) FROM NotificationRecipient nr
            WHERE nr.user.id = :userId AND nr.isRemoved = false
              AND nr.notification.isRemoved = false
              AND (nr.isRead IS NULL OR nr.isRead = false)
            """)
    long countUnreadByUserId(@Param("userId") Integer userId);

    @Query("""
            SELECT nr FROM NotificationRecipient nr
            JOIN FETCH nr.notification
            WHERE nr.id = :id AND nr.user.id = :userId AND nr.isRemoved = false
            """)
    Optional<NotificationRecipient> findByIdAndUserId(@Param("id") Integer id, @Param("userId") Integer userId);

    @Modifying(clearAutomatically = true)
    @Query("""
            UPDATE NotificationRecipient nr SET nr.isRead = true
            WHERE nr.user.id = :userId AND nr.isRemoved = false
              AND (nr.isRead IS NULL OR nr.isRead = false)
            """)
    int markAllReadByUserId(@Param("userId") Integer userId);
}
