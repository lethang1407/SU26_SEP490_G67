package project.be_sep490_g67.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;

@Getter
@Setter
@Entity
@Table(name = "audit_resolutions")
public class AuditResolution extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "anomaly_type", length = 50, nullable = false)
    private String anomalyType;

    @Column(name = "target_id", length = 50, nullable = false)
    private String targetId;

    @ColumnDefault("'RESOLVED'")
    @Column(name = "resolution_status", length = 20)
    private String resolutionStatus;

    @Lob
    @Column(name = "note")
    private String note;

    @Column(name = "resolved_by")
    private Integer resolvedBy;
}
