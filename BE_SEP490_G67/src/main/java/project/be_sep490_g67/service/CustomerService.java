package project.be_sep490_g67.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import project.be_sep490_g67.dto.request.CreateCustomerRequest;
import project.be_sep490_g67.dto.response.CustomerResponse;
import project.be_sep490_g67.dto.response.PageResponse;
import project.be_sep490_g67.entity.Customer;
import project.be_sep490_g67.enums.DebtStatus;
import project.be_sep490_g67.exception.AppException;
import project.be_sep490_g67.exception.ErrorCode;
import project.be_sep490_g67.repository.CustomerRepository;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class CustomerService {

    CustomerRepository customerRepository;

    /**
     * Look up a customer by phone number.
     * Returns empty Optional if not found (caller decides invoice type).
     */
    public Optional<CustomerResponse> findByPhone(String phone) {
        return customerRepository.findByPhoneNumber(phone)
                .map(c -> CustomerResponse.builder()
                        .id(c.getId())
                        .fullName(c.getFullName())
                        .phoneNumber(c.getPhoneNumber())
                        .totalDebt(c.getTotalDebt())
                        .build());
    }

    // Create Customer
    @Transactional
    public CustomerResponse createCustomer(
            CreateCustomerRequest request
    ) {

        if (StringUtils.hasText(request.getPhoneNumber())
                && customerRepository
                .existsByPhoneNumberAndIsRemovedFalse(
                        request.getPhoneNumber()
                )) {

            throw new AppException(ErrorCode.PHONE_NUMBER_EXISTED);
        }

        Customer customer = new Customer();

        customer.setFullName(request.getFullName());
        customer.setPhoneNumber(request.getPhoneNumber());
        customer.setNote(request.getNote());

        customer.setIsDebt(true);

        customer.setTotalDebt(BigDecimal.ZERO);

        customer = customerRepository.save(customer);

        customer.setCustomerCode(
                String.format("KH%06d", customer.getId())
        );

        customer = customerRepository.save(customer);

        return CustomerResponse.builder()
                .id(customer.getId())
                .customerCode(customer.getCustomerCode())
                .fullName(customer.getFullName())
                .phoneNumber(customer.getPhoneNumber())
                .isDebt(customer.getIsDebt())
                .totalDebt(customer.getTotalDebt())
                .note(customer.getNote())
                .build();
    }

    // View customer list
    public PageResponse<CustomerResponse> getCustomerDebts(
            String keyword,
            DebtStatus status,
            LocalDate fromDate,
            LocalDate toDate,
            Integer page,
            Integer size
    ) {

        Pageable pageable = PageRequest.of(
                page - 1,
                size,
                Sort.by(Sort.Direction.DESC, "createdAt")
        );

        Instant from = null;
        Instant to = null;

        ZoneId zoneId = ZoneId.of("Asia/Ho_Chi_Minh");

        if (fromDate != null) {
            from = fromDate
                    .atStartOfDay(zoneId)
                    .toInstant();
        }

        if (toDate != null) {
            to = toDate
                    .plusDays(1)
                    .atStartOfDay(zoneId)
                    .toInstant();
        }

        Page<Customer> customerPage =
                customerRepository.searchCustomers(
                        keyword,
                        status == null ? null : status.name(),
                        from,
                        to,
                        pageable
                );

        List<CustomerResponse> responses =
                customerPage.getContent()
                        .stream()
                        .map(customer -> CustomerResponse.builder()
                                .id(customer.getId())
                                .customerCode(customer.getCustomerCode())
                                .fullName(customer.getFullName())
                                .phoneNumber(customer.getPhoneNumber())
                                .address(customer.getAddress())
                                .totalDebt(customer.getTotalDebt())
                                .isDebt(customer.getIsDebt())
                                .debtStatus(
                                        customer.getTotalDebt()
                                                .compareTo(BigDecimal.ZERO) > 0
                                                ? DebtStatus.IN_DEBT.name()
                                                : DebtStatus.NO_DEBT.name()
                                )
                                .build())
                        .toList();

        return PageResponse.<CustomerResponse>builder()
                .content(responses)
                .page(page)
                .size(size)
                .totalElements(customerPage.getTotalElements())
                .totalPages(customerPage.getTotalPages())
                .build();
    }
}
