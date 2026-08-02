package project.be_sep490_g67.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.LinkedHashSet;
import java.util.Set;

@Getter
@Setter
@Entity
@Table(name = "notifications")
public class Notification extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Integer id;

    @Column(name = "notification_type", length = 100)
    private String notificationType;

    @Column(name = "title", length = 200)
    private String title;

    @Lob
    @Column(name = "message")
    private String message;

    @Column(name = "reference_type", length = 40)
    private String referenceType;

    @Column(name = "reference_id")
    private Integer referenceId;

    @OneToMany(mappedBy = "notification")
    private Set<NotificationRecipient> notificationRecipients = new LinkedHashSet<>();

}
