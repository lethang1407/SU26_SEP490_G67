package project.be_sep490_g67.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import project.be_sep490_g67.dto.AuditAnomalyDTO;
import project.be_sep490_g67.dto.ResolveAnomalyDTO;
import project.be_sep490_g67.entity.AuditResolution;
import project.be_sep490_g67.repository.AuditResolutionRepository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AuditAnomalyService {

    private final AuditResolutionRepository auditResolutionRepository;

    public List<AuditAnomalyDTO> getAnomalies(LocalDate startDate, LocalDate endDate) {
        // TODO: Implement actual SQL scans. 
        // Returning mock anomalies for frontend integration as per plan.
        List<AuditAnomalyDTO> list = new ArrayList<>();
        
        AuditAnomalyDTO a1 = new AuditAnomalyDTO();
        a1.setId("anomaly-1");
        a1.setType("BANK_TRANSFER_PENDING");
        a1.setDescription("Có 1 giao dịch chuyển khoản 50k chưa nổ tiền, nhân viên vẫn bấm hoàn thành đơn.");
        a1.setSeverity("HIGH");
        a1.setDetectedAt(LocalDateTime.now().minusHours(1));
        a1.setTargetId("ORDER-035");
        a1.setStatus("PENDING");
        
        AuditAnomalyDTO a2 = new AuditAnomalyDTO();
        a2.setId("anomaly-2");
        a2.setType("CANCELLED_WITH_CASH");
        a2.setDescription("Đơn #DH043 bị hủy nhưng trước đó ghi nhận đã nhận tiền mặt chưa hoàn trả hệ thống.");
        a2.setSeverity("HIGH");
        a2.setDetectedAt(LocalDateTime.now().minusHours(2));
        a2.setTargetId("ORDER-043");
        a2.setStatus("PENDING");
        
        // Filter out resolved ones in real scenario...
        list.add(a1);
        list.add(a2);
        
        return list;
    }

    public AuditResolution resolveAnomaly(ResolveAnomalyDTO dto) {
        AuditResolution resolution = auditResolutionRepository
            .findByAnomalyTypeAndTargetId(dto.getAnomalyType(), dto.getTargetId())
            .orElse(new AuditResolution());
            
        resolution.setAnomalyType(dto.getAnomalyType());
        resolution.setTargetId(dto.getTargetId());
        resolution.setResolutionStatus("RESOLVED");
        resolution.setNote(dto.getNote());
        // resolution.setResolvedBy(userId);
        
        return auditResolutionRepository.save(resolution);
    }
}
