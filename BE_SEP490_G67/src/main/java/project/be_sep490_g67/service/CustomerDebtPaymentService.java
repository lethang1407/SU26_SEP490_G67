package project.be_sep490_g67.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.be_sep490_g67.dto.response.CustomerDebtOverviewResponse;
import project.be_sep490_g67.dto.response.CustomerDebtSummaryResponse;
import project.be_sep490_g67.repository.CustomerRepository;
import project.be_sep490_g67.repository.DebtPaymentRepository;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class CustomerDebtPaymentService {
    CustomerRepository customerRepository;
    DebtPaymentRepository debtPaymentRepository;

    @Transactional(readOnly = true)
    public CustomerDebtOverviewResponse getDebtOverview() {

        ZoneId zoneId = ZoneId.of("Asia/Ho_Chi_Minh");

        LocalDate today = LocalDate.now(zoneId);

        Instant startOfDay = today
                .atStartOfDay(zoneId)
                .toInstant();

        Instant endOfDay = today
                .plusDays(1)
                .atStartOfDay(zoneId)
                .toInstant();

        return CustomerDebtOverviewResponse.builder()
                .totalDebt(customerRepository.getTotalDebt())
                .debtCustomerCount(customerRepository.countInDebtCustomers())
                .todayCollectedAmount(
                        debtPaymentRepository.getTodayCollectedAmount(
                                startOfDay,
                                endOfDay
                        )
                )
                .build();
    }

    @Transactional(readOnly = true)
    public CustomerDebtSummaryResponse getDebtSummary() {
        long inDebtCount = customerRepository.countInDebtCustomers();
        long debtFreeCount = customerRepository.countDebtFreeCustomers();
        return new CustomerDebtSummaryResponse(inDebtCount, debtFreeCount);
    }
}