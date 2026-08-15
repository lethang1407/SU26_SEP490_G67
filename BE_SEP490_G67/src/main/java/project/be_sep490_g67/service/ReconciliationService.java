package project.be_sep490_g67.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import project.be_sep490_g67.dto.ReconciliationSubmitDTO;
import project.be_sep490_g67.dto.ReconciliationSummaryDTO;
import project.be_sep490_g67.entity.DailyReconciliation;
import project.be_sep490_g67.repository.DailyReconciliationRepository;
import java.math.BigDecimal;
import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class ReconciliationService {

    private final DailyReconciliationRepository reconciliationRepository;

    public ReconciliationSummaryDTO getSummary(LocalDate date) {
        // TODO: In a real implementation, this would aggregate data from SalesOrder and DebtPayment repositories.
        // For now, we return a mock summary to satisfy the new API endpoint structure.
        ReconciliationSummaryDTO dto = new ReconciliationSummaryDTO();
        dto.setDate(date);
        dto.setOpeningCash(new BigDecimal("300000.00"));
        dto.setCashSales(new BigDecimal("1580000.00"));
        dto.setCashDebtCollected(new BigDecimal("0.00"));
        dto.setCashRefunded(new BigDecimal("45000.00"));
        
        // (300k + 1580k + 0 - 45k) = 1835000
        dto.setTheoreticalCash(new BigDecimal("1835000.00"));
        
        dto.setBankTransferConfirmed(new BigDecimal("650000.00"));
        dto.setBankTransferPending(new BigDecimal("50000.00"));
        
        return dto;
    }

    public DailyReconciliation submitReconciliation(ReconciliationSubmitDTO dto) {
        ReconciliationSummaryDTO summary = getSummary(dto.getDate());
        
        DailyReconciliation reconciliation = reconciliationRepository.findByReconciliationDate(dto.getDate())
                .orElse(new DailyReconciliation());
                
        reconciliation.setReconciliationDate(dto.getDate());
        reconciliation.setOpeningCash(summary.getOpeningCash());
        reconciliation.setCashSales(summary.getCashSales());
        reconciliation.setCashDebtCollected(summary.getCashDebtCollected());
        reconciliation.setCashRefunded(summary.getCashRefunded());
        reconciliation.setTheoreticalCash(summary.getTheoreticalCash());
        
        reconciliation.setActualCash(dto.getActualCash());
        BigDecimal cashDiff = dto.getActualCash().subtract(summary.getTheoreticalCash());
        reconciliation.setCashDiscrepancy(cashDiff);
        
        reconciliation.setBankTransferConfirmed(summary.getBankTransferConfirmed());
        reconciliation.setBankTransferPending(summary.getBankTransferPending());
        
        BigDecimal theoreticalBank = summary.getBankTransferConfirmed().add(summary.getBankTransferPending());
        reconciliation.setBankActual(dto.getBankActual());
        reconciliation.setBankDiscrepancy(dto.getBankActual().subtract(theoreticalBank));
        
        reconciliation.setNote(dto.getNote());
        reconciliation.setStatus("COMPLETED");
        
        return reconciliationRepository.save(reconciliation);
    }
}
