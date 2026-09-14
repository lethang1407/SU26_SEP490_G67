package project.be_sep490_g67.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import project.be_sep490_g67.entity.Notification;

import java.time.Instant;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Integer> {
    @Query("""
            SELECT COUNT(n) > 0 FROM Notification n
            WHERE n.notificationType = :notificationType
              AND n.isRemoved = false
              AND n.createdAt >= :since
            """)
    boolean existsByTypeSince(@Param("notificationType") String notificationType,
                              @Param("since") Instant since);
}
