package project.be_sep490_g67.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.ColumnDefault;

import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.Set;

@Getter
@Setter
@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Integer id;

    @ManyToMany(fetch = FetchType.LAZY)
    private Set<Role> roles;

    @Column(name = "full_name", length = 100)
    private String fullName;

    @Column(name = "username", length = 50, unique = true)
    private String username;

    @Column(name = "password_hash")
    private String passwordHash;

    @Column(name = "phone_number", length = 15, unique = true)
    private String phoneNumber;

    @ColumnDefault("'ACTIVE'")
    @Lob
    @Column(name = "status")
    private String status;

    @ColumnDefault("0")
    @Column(name = "is_removed")
    private Boolean isRemoved;

    @ColumnDefault("CURRENT_TIMESTAMP")
    @Column(name = "created_at")
    private Instant createdAt;

    @ColumnDefault("CURRENT_TIMESTAMP")
    @Column(name = "updated_at")
    private Instant updatedAt;

    @Column(name = "created_by")
    private Integer createdBy;

    @Column(name = "updated_by")
    private Integer updatedBy;

    @OneToMany(mappedBy = "user")
    private Set<AuditLog> auditLogs = new LinkedHashSet<>();

    @OneToMany(mappedBy = "user")
    private Set<NotificationRecipient> notificationRecipients = new LinkedHashSet<>();


}