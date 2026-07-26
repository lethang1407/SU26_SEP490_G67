package project.be_sep490_g67.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.ColumnDefault;

import java.util.LinkedHashSet;
import java.util.Set;

@Getter
@Setter
@Entity
@Table(name = "users")
public class User extends BaseEntity {
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
    @Column(name = "status", length = 20)
    private String status;

    @OneToMany(mappedBy = "user")
    private Set<AuditLog> auditLogs = new LinkedHashSet<>();

    @OneToMany(mappedBy = "user")
    private Set<NotificationRecipient> notificationRecipients = new LinkedHashSet<>();


}