package project.be_sep490_g67.dto;

import lombok.Data;

@Data
public class ResolveAnomalyDTO {
    private String anomalyType;
    private String targetId;
    private String note;
}
