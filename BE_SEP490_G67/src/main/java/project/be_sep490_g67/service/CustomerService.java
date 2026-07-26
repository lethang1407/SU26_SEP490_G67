package project.be_sep490_g67.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import project.be_sep490_g67.dto.request.CreateCustomerRequest;
import project.be_sep490_g67.dto.request.UpdateCustomerRequest;
import project.be_sep490_g67.dto.response.CustomerResponse;
import project.be_sep490_g67.dto.response.DebtOrderResponse;
import project.be_sep490_g67.dto.response.PageResponse;
import project.be_sep490_g67.entity.Customer;
import project.be_sep490_g67.entity.DebtPayment;
import project.be_sep490_g67.entity.User;
import project.be_sep490_g67.enums.DebtOrderStatus;
import project.be_sep490_g67.enums.DebtStatus;
import project.be_sep490_g67.entity.SalesOrder;
import project.be_sep490_g67.exception.AppException;
import project.be_sep490_g67.exception.ErrorCode;
import project.be_sep490_g67.repository.CustomerRepository;
import project.be_sep490_g67.repository.SalesOrderRepository;
import project.be_sep490_g67.repository.UserRepository;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class CustomerService {

    CustomerRepository customerRepository;
    SalesOrderRepository salesOrderRepository;
    UserRepository userRepository;

    /**
     * Find customer by phone number
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
        customer.setAddress(request.getAddress());
        customer.setNote(request.getNote());

        customer.setAllowDebt(true);

        customer.setTotalDebt(BigDecimal.ZERO);

        customer.setStatus(DebtStatus.NO_DEBT.name());

        customer = customerRepository.save(customer);
        log.info("Create new customer by id {}",customer.getId());

        return CustomerResponse.builder()
                .id(customer.getId())
                .fullName(customer.getFullName())
                .phoneNumber(customer.getPhoneNumber())
                .allowDebt(customer.getAllowDebt())
                .totalDebt(customer.getTotalDebt())
                .note(customer.getNote())
                .build();
    }

    // View customer list
    @Transactional(readOnly = true)
    public PageResponse<CustomerResponse> getCustomerDebts(
            String keyword, DebtStatus status, Boolean allowDebt,
            LocalDate fromDate, LocalDate toDate,
            Integer page, Integer size, Boolean isOverdue, String sortBy
    ) {

        Pageable pageable = PageRequest.of(page - 1, size);

        ZoneId zoneId = ZoneId.of("Asia/Ho_Chi_Minh");
        Instant from = fromDate != null ? fromDate.atStartOfDay(zoneId).toInstant() : null;
        Instant to = toDate != null ? toDate.plusDays(1).atStartOfDay(zoneId).toInstant() : null;
        Instant now = Instant.now();

        String statusQuery = null;
        if (Boolean.TRUE.equals(isOverdue)) {
            statusQuery = DebtStatus.OVERDUE.name();
        } else if (status != null) {
            statusQuery = status.name();
        }

        Page<Customer> customerPage;
        if ("priority".equalsIgnoreCase(sortBy)) {
            customerPage = customerRepository.searchCustomersAndSortByPriority(
                    keyword, statusQuery,
                    allowDebt, from, to, now, pageable
            );
        } else {
            pageable = PageRequest.of(page - 1, size, Sort.by(Sort.Direction.DESC, "createdAt"));
            customerPage = customerRepository.searchCustomers(
                    keyword, statusQuery,
                    allowDebt, from, to, now, pageable
            );
        }

        List<CustomerResponse> responses = customerPage.getContent().stream().map(customer -> {

            List<SalesOrder> debtOrders = customer.getSalesOrders().stream()
                    .filter(so -> Boolean.TRUE.equals(so.getIsDebt()))
                    .toList();

            long totalOrdersInDebt = debtOrders.stream()
                    .filter(so -> {
                        BigDecimal totalPaid = (so.getPaidAmount() != null ? so.getPaidAmount() : BigDecimal.ZERO)
                                .add(so.getDebtPayments().stream()
                                        .map(dp -> dp.getAmountPaid() != null ? dp.getAmountPaid() : BigDecimal.ZERO)
                                        .reduce(BigDecimal.ZERO, BigDecimal::add));
                        return (so.getTotalAmount() != null ? so.getTotalAmount() : BigDecimal.ZERO).compareTo(totalPaid) > 0;
                    })
                    .count();

            long totalOverdueOrders = debtOrders.stream()
                    .filter(so -> {
                        BigDecimal totalPaid = (so.getPaidAmount() != null ? so.getPaidAmount() : BigDecimal.ZERO)
                                .add(so.getDebtPayments().stream()
                                        .map(dp -> dp.getAmountPaid() != null ? dp.getAmountPaid() : BigDecimal.ZERO)
                                        .reduce(BigDecimal.ZERO, BigDecimal::add));
                        boolean isUnpaid = (so.getTotalAmount() != null ? so.getTotalAmount() : BigDecimal.ZERO).compareTo(totalPaid) > 0;
                        return isUnpaid && so.getDueDate() != null && so.getDueDate().isBefore(now);
                    })
                    .count();

            boolean hasOverdue = totalOverdueOrders > 0;

            String debtStatus;
            BigDecimal totalDebt = customer.getTotalDebt() != null ? customer.getTotalDebt() : BigDecimal.ZERO;
            if (hasOverdue) {
                debtStatus = DebtStatus.OVERDUE.name();
            } else if (totalDebt.compareTo(BigDecimal.ZERO) > 0) {
                debtStatus = DebtStatus.IN_DEBT.name();
            } else {
                debtStatus = DebtStatus.NO_DEBT.name();
            }

            Instant latestDebtDate = debtOrders.stream()
                    .map(SalesOrder::getCreatedAt)
                    .filter(Objects::nonNull)
                    .max(Instant::compareTo)
                    .orElse(null);

            return CustomerResponse.builder()
                    .id(customer.getId())
                    .fullName(customer.getFullName())
                    .phoneNumber(customer.getPhoneNumber())
                    .address(customer.getAddress())
                    .totalDebt(customer.getTotalDebt())
                    .allowDebt(customer.getAllowDebt())
                    .debtStatus(debtStatus)
                    .latestDebtDate(latestDebtDate)
                    .note(customer.getNote())
                    .isOverdue(hasOverdue)
                    .totalOrdersInDebt(totalOrdersInDebt)
                    .totalOverdueOrders(totalOverdueOrders)
                    .build();
        }).toList();

        return PageResponse.<CustomerResponse>builder()
                .content(responses)
                .page(page)
                .size(size)
                .totalElements(customerPage.getTotalElements())
                .totalPages(customerPage.getTotalPages())
                .build();
    }

    // View customer detail
    @Transactional(readOnly = true)
    public CustomerResponse getCustomerDetails(Integer id) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.CUSTOMER_NOT_FOUND));

        Instant now = Instant.now();

        boolean hasOverdue = customer.getSalesOrders().stream().anyMatch(so -> {
            if (!Boolean.TRUE.equals(so.getIsDebt())) return false;
            if (so.getDueDate() == null || !so.getDueDate().isBefore(now)) return false;

            BigDecimal paid = so.getPaidAmount() != null ? so.getPaidAmount() : BigDecimal.ZERO;
            BigDecimal subsequent = so.getDebtPayments().stream()
                    .map(dp -> dp.getAmountPaid() != null ? dp.getAmountPaid() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal totalPaid = paid.add(subsequent);

            BigDecimal total = so.getTotalAmount() != null ? so.getTotalAmount() : BigDecimal.ZERO;
            return total.compareTo(totalPaid) > 0;
        });

        String debtStatus;
        BigDecimal totalDebt = customer.getTotalDebt() != null ? customer.getTotalDebt() : BigDecimal.ZERO;
        if (hasOverdue) {
            debtStatus = DebtStatus.OVERDUE.name();
        } else if (totalDebt.compareTo(BigDecimal.ZERO) > 0) {
            debtStatus = DebtStatus.IN_DEBT.name();
        } else {
            debtStatus = DebtStatus.NO_DEBT.name();
        }

        Instant latestDebtDate = customer.getSalesOrders().stream()
                .filter(so -> Boolean.TRUE.equals(so.getIsDebt()))
                .map(SalesOrder::getCreatedAt)
                .filter(Objects::nonNull)
                .max(Instant::compareTo)
                .orElse(null);

        long totalOrdersInDebt = customer.getSalesOrders().stream()
                .filter(so -> Boolean.TRUE.equals(so.getIsDebt()) &&
                        (so.getTotalAmount().subtract(so.getPaidAmount()
                                .add(so.getDebtPayments().stream()
                                        .map(DebtPayment::getAmountPaid)
                                        .reduce(BigDecimal.ZERO, BigDecimal::add)))
                                .compareTo(BigDecimal.ZERO) > 0))
                .count();

        return CustomerResponse.builder()
                .id(customer.getId())
                .fullName(customer.getFullName())
                .phoneNumber(customer.getPhoneNumber())
                .address(customer.getAddress())
                .totalDebt(customer.getTotalDebt())
                .allowDebt(customer.getAllowDebt())
                .debtStatus(debtStatus)
                .latestDebtDate(latestDebtDate)
                .note(customer.getNote())
                .isOverdue(hasOverdue)
                .totalOrdersInDebt(totalOrdersInDebt)
                .build();
    }

    // View debt order list
    @Transactional(readOnly = true)
    public PageResponse<DebtOrderResponse> getDebtOrdersForCustomer(Integer customerId, String keyword, Integer page, Integer size) {
        customerRepository.findById(customerId)
                .orElseThrow(() -> new AppException(ErrorCode.CUSTOMER_NOT_FOUND));

        Instant now = Instant.now();
        Pageable pageable = PageRequest.of(page - 1, size);
        Page<SalesOrder> salesOrderPage = salesOrderRepository.findDebtOrdersByCustomerIdWithPriority(customerId, keyword, now, pageable);

        List<DebtOrderResponse> responses = salesOrderPage.getContent().stream().map(so -> {
            BigDecimal totalPaid = so.getDebtPayments().stream()
                    .map(dp -> dp.getAmountPaid() != null ? dp.getAmountPaid() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal totalAmount = so.getTotalAmount() != null ? so.getTotalAmount() : BigDecimal.ZERO;
            BigDecimal amountRemaining = totalAmount.subtract(totalPaid);

            DebtOrderStatus status;
            if (amountRemaining.compareTo(BigDecimal.ZERO) <= 0) {
                status = DebtOrderStatus.PAID;
            } else if (so.getDueDate() != null && so.getDueDate().isBefore(now)) {
                status = DebtOrderStatus.OVERDUE;
            } else {
                status = DebtOrderStatus.IN_DEBT;
            }

            String createdByName = "N/A";
             if (so.getCreatedBy() != null) {
                 createdByName = userRepository.findById(so.getCreatedBy())
                                                 .map(User::getFullName)
                                                 .orElse("Không rõ");
             }

            return DebtOrderResponse.builder()
                    .id(so.getId())
                    .orderCode(so.getOrderCode())
                    .orderDate(so.getCreatedAt())
                    .dueDate(so.getDueDate())
                    .totalAmount(totalAmount)
                    .amountPaid(totalPaid)
                    .amountRemaining(amountRemaining)
                    .status(status)
                    .createdBy(createdByName)
                    .build();
        }).collect(Collectors.toList());

        return PageResponse.<DebtOrderResponse>builder()
                .content(responses)
                .page(page)
                .size(size)
                .totalElements(salesOrderPage.getTotalElements())
                .totalPages(salesOrderPage.getTotalPages())
                .build();
    }

    // Update customer
    @Transactional
    public CustomerResponse updateCustomer(Integer id, UpdateCustomerRequest request) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.CUSTOMER_NOT_FOUND));

        // Check for phone number uniqueness if it's being changed
        if (StringUtils.hasText(request.getPhoneNumber()) && !request.getPhoneNumber().equals(customer.getPhoneNumber())) {
            if (customerRepository.existsByPhoneNumberAndIsRemovedFalse(request.getPhoneNumber())) {
                throw new AppException(ErrorCode.PHONE_NUMBER_EXISTED);
            }
        }

        customer.setFullName(request.getFullName());
        customer.setPhoneNumber(request.getPhoneNumber());
        customer.setAddress(request.getAddress());
        customer.setNote(request.getNote());
        customer.setAllowDebt(request.getAllowDebt());

        Customer updatedCustomer = customerRepository.save(customer);
        log.info("Update customer by id {}",customer.getId());

        return CustomerResponse.builder()
                .id(updatedCustomer.getId())
                .fullName(updatedCustomer.getFullName())
                .phoneNumber(updatedCustomer.getPhoneNumber())
                .address(updatedCustomer.getAddress())
                .note(updatedCustomer.getNote())
                .allowDebt(updatedCustomer.getAllowDebt())
                .totalDebt(updatedCustomer.getTotalDebt())
                .build();
    }
}