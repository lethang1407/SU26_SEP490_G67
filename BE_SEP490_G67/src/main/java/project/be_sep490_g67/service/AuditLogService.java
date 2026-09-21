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

    /** Mandatory audit: commits or rolls back together with the tax profile mutation. */
    @Transactional(propagation = Propagation.MANDATORY)
    public void logTaxProfile(Integer actorId, Integer profileId, String action, String before, String after) {
        logAccountingEntry(actorId, "business_tax_profiles", profileId, action, before, after);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void logAccountingPeriod(Integer actorId, Integer periodId, String action, String before, String after) {
        logAccountingEntry(actorId, "accounting_periods", periodId, action, before, after);
    }

    private void logAccountingEntry(Integer actorId, String entityName, Integer entityId,
            String action, String before, String after) {
        User actor = new User();
        actor.setId(actorId);
        AuditLog entry = new AuditLog();
        entry.setUser(actor);
        entry.setCreatedBy(actorId);
        entry.setActionType(action);
        entry.setEntityName(entityName);
        entry.setEntityId(entityId);
        entry.setOldValue(before);
        entry.setNewValue(after);
        auditLogRepository.save(entry);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void logRevenueLine(Integer actorId, Integer lineId, String before, String after) {
        logAccountingEntry(actorId, "accounting_revenue_lines", lineId, "ACCOUNTING_REVENUE_WRITE", before, after);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void logRevenueAdjustment(Integer actorId, Integer id, String action, String before, String after) {
        logAccountingEntry(actorId, "revenue_adjustments", id, action, before, after);
    }

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

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logFailedReturnLookup(Integer userId, String scope) {
        try {
            User actor = new User();
            actor.setId(userId);

            AuditLog entry = new AuditLog();
            entry.setUser(actor);
            entry.setActionType("RETURN_LOOKUP_NOT_FOUND");
            entry.setEntityName("sales_orders");
            entry.setNewValue(scope);
            entry.setCreatedBy(userId);
            entry.setCreatedAt(Instant.now());

            auditLogRepository.save(entry);
        } catch (Exception ex) {
            // Never block the cashier's answer to the customer.
            log.warn("Audit log write failed for RETURN_LOOKUP_NOT_FOUND: {}", ex.getMessage());
        }
    }
}
