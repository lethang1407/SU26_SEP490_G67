package project.be_sep490_g67.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.be_sep490_g67.dto.response.DebtPaymentHistoryResponse;
import project.be_sep490_g67.dto.response.PageResponse;
import project.be_sep490_g67.entity.DebtPayment;
import project.be_sep490_g67.entity.User;
import project.be_sep490_g67.repository.DebtPaymentRepository;
import project.be_sep490_g67.repository.UserRepository;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DebtPaymentService {

    private final DebtPaymentRepository debtPaymentRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public PageResponse<DebtPaymentHistoryResponse> getDebtPaymentHistory(
            LocalDate startDate, LocalDate endDate, Integer customerId,
            Integer staffId, String keyword, Integer page, Integer size
    ) {
        Pageable pageable = PageRequest.of(page - 1, size, Sort.by(Sort.Direction.DESC, "createdAt"));

        ZoneId zoneId = ZoneId.of("Asia/Ho_Chi_Minh");
        Instant startInstant = startDate != null ? startDate.atStartOfDay(zoneId).toInstant() : null;
        Instant endInstant = endDate != null ? endDate.plusDays(1).atStartOfDay(zoneId).toInstant() : null;

        Page<DebtPayment> debtPaymentPage = debtPaymentRepository.searchDebtPayments(
                startInstant, endInstant, customerId, staffId, keyword, pageable
        );

        List<DebtPaymentHistoryResponse> responses = debtPaymentPage.getContent().stream().map(dp -> {
            String staffName = "N/A";
            if (dp.getCreatedBy() != null) {
                staffName = userRepository.findById(dp.getCreatedBy())
                        .map(User::getFullName)
                        .orElse("Không rõ");
            }

            return DebtPaymentHistoryResponse.builder()
                    .id(dp.getId())
                    .paymentDate(dp.getCreatedAt())
                    .amountPaid(dp.getAmountPaid())
                    .note(dp.getNotes())
                    .customerName(dp.getSalesOrder().getCustomer().getFullName())
                    .customerId(dp.getSalesOrder().getCustomer().getId())
                    .orderCode(dp.getSalesOrder().getOrderCode())
                    .paymentMethod(dp.getPaymentMethod())
                    .orderId(dp.getSalesOrder().getId())
                    .staffName(staffName)
                    .build();
        }).collect(Collectors.toList());

        return PageResponse.<DebtPaymentHistoryResponse>builder()
                .content(responses)
                .page(page)
                .size(size)
                .totalElements(debtPaymentPage.getTotalElements())
                .totalPages(debtPaymentPage.getTotalPages())
                .build();
    }
}