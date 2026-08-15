package project.be_sep490_g67.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "api_endpoint_permissions")
public class ApiEndpointPermission extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Integer id;

    @Column(name = "http_method", length = 10, nullable = false)
    private String httpMethod;

    @Column(name = "url_pattern", length = 255, nullable = false)
    private String urlPattern;

    @Column(name = "permission_code", length = 100, nullable = false)
    private String permissionCode;

    @Column(name = "description", length = 255)
    private String description;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;
}
