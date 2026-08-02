package project.be_sep490_g67.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import project.be_sep490_g67.entity.AuditLog;
import project.be_sep490_g67.entity.User;
import project.be_sep490_g67.repository.AuditLogRepository;

import java.time.Instant;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AuditLogService {
    AuditLogRepository auditLogRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logInvoicePrint(Integer userId, Integer orderId) {
        try {
            User actor = new User();
            actor.setId(userId);

            AuditLog entry = new AuditLog();
            entry.setUser(actor);
            entry.setActionType("INVOICE_PRINT");
            entry.setEntityName("sales_orders");
            entry.setEntityId(orderId);
            entry.setCreatedBy(userId);
            entry.setCreatedAt(Instant.now());

            auditLogRepository.save(entry);
        } catch (Exception ex) {
            // Audit failure must NEVER block invoice delivery
            log.warn("Audit log write failed for INVOICE_PRINT orderId={}: {}", orderId, ex.getMessage());
        }
    }
}
