package project.be_sep490_g67.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import project.be_sep490_g67.dto.ReconciliationSubmitDTO;
import project.be_sep490_g67.dto.ReconciliationSummaryDTO;
import project.be_sep490_g67.repository.DebtPaymentRepository;
import project.be_sep490_g67.repository.SalesOrderRepository;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

@Service
@RequiredArgsConstructor
public class ReconciliationService {

    private final SalesOrderRepository salesOrderRepository;
    private final DebtPaymentRepository debtPaymentRepository;

    public ReconciliationSummaryDTO getSummary(LocalDate date) {
        LocalDate targetDate = date != null ? date : LocalDate.now();
        Instant startOfDay = targetDate.atStartOfDay(ZoneId.systemDefault()).toInstant();
        Instant endOfDay = targetDate.plusDays(1).atStartOfDay(ZoneId.systemDefault()).toInstant();

        BigDecimal cashSales = salesOrderRepository.sumCashSalesBetween(startOfDay, endOfDay);
        BigDecimal bankSales = salesOrderRepository.sumBankSalesBetween(startOfDay, endOfDay);
        BigDecimal debtCollected = debtPaymentRepository.getTodayCollectedAmount(startOfDay, endOfDay);

        if (cashSales == null) cashSales = BigDecimal.ZERO;
        if (bankSales == null) bankSales = BigDecimal.ZERO;
        if (debtCollected == null) debtCollected = BigDecimal.ZERO;

        BigDecimal openingCash = new BigDecimal("300000.00");
        BigDecimal cashRefunded = BigDecimal.ZERO;

        BigDecimal theoreticalCash = openingCash.add(cashSales).add(debtCollected).subtract(cashRefunded);

        ReconciliationSummaryDTO dto = new ReconciliationSummaryDTO();
        dto.setDate(targetDate);
        dto.setOpeningCash(openingCash);
        dto.setCashSales(cashSales);
        dto.setCashDebtCollected(debtCollected);
        dto.setCashRefunded(cashRefunded);
        dto.setTheoreticalCash(theoreticalCash);

        dto.setBankTransferConfirmed(bankSales);
        dto.setBankTransferPending(BigDecimal.ZERO);

        return dto;
    }

    public ReconciliationSummaryDTO submitReconciliation(ReconciliationSubmitDTO dto) {
        return getSummary(dto.getDate());
    }
}
