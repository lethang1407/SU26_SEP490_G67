package project.be_sep490_g67.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class AuditAnomalyDTO {
    private String id;
    private String type; // e.g., CANCELLED_WITH_CASH
    private String description;
    private String severity; // HIGH, MEDIUM, LOW
    private LocalDateTime detectedAt;
    private String targetId;
    private String status; // PENDING, RESOLVED
}
