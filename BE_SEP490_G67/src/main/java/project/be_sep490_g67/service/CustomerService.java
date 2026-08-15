package project.be_sep490_g67.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import project.be_sep490_g67.dto.request.CustomerRequest;
import project.be_sep490_g67.dto.response.CustomerResponse;
import project.be_sep490_g67.dto.response.DebtOrderResponse;
import project.be_sep490_g67.dto.response.PageResponse;
import project.be_sep490_g67.dto.response.TodaysDebtSalesSummaryResponse;
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
import project.be_sep490_g67.utils.DebtCalculator;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
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
                        .isCheckDebtUnstable(isCheckDebtUnstable(c))
                        .build());
    }

    // Create Customer
    @Transactional
    public CustomerResponse createCustomer(
            CustomerRequest request
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

        // Tạo cờ check khách nợ mới, nếu role = admin thì cờ = false, nếu staff thì
        // cờ = true và trả notify cho admin
        customer.setIsCheckUnstableDebt(!isCurrentUserAdmin());

        customer = customerRepository.save(customer);
        log.info("Create new customer by id {}",customer.getId());

        return CustomerResponse.builder()
                .id(customer.getId())
                .fullName(customer.getFullName())
                .phoneNumber(customer.getPhoneNumber())
                .allowDebt(customer.getAllowDebt())
                .totalDebt(customer.getTotalDebt())
                .note(customer.getNote())
                .isCheckDebtUnstable(isCheckDebtUnstable(customer))
                .build();
    }

    /**
     * check user là admin hay không để không bị lọt khách hàng nợ chưa
     * duyệt thành đã duyệt.
     */
    private boolean isCurrentUserAdmin() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null) {
            return false;
        }
        return userRepository.findActiveByUsernameWithRole(authentication.getName())
                .map(user -> user.getRoles().stream()
                        .anyMatch(role -> "ADMIN".equalsIgnoreCase(role.getName())))
                .orElse(false);
    }

    // View customer list
    @Transactional(readOnly = true)
    public PageResponse<CustomerResponse> getCustomerDebts(
            String keyword, DebtStatus status, Boolean allowDebt,
            LocalDate fromDate, LocalDate toDate,
            Integer page, Integer size, Boolean isOverdue, String sortBy
    ) {

        ZoneId zoneId = ZoneId.of("Asia/Ho_Chi_Minh");
        Instant from = fromDate != null ? fromDate.atStartOfDay(zoneId).toInstant() : null;
        Instant to = toDate != null ? toDate.plusDays(1).atStartOfDay(zoneId).toInstant() : null;
        Instant now = Instant.now();

        String statusQuery = (status != null) ? status.name() : null;

        List<Customer> customers;
        Page<Customer> customerPage;

        // Priority sorting logic
        if ("priority".equalsIgnoreCase(sortBy)) {
            // Fetch all filtered customers without pagination from DB
            customers = customerRepository.findFilteredCustomers(keyword, statusQuery, allowDebt, from, to, now, isOverdue);

            // Map to DTO and calculate dynamic fields
            List<CustomerResponse> responses = customers.stream().map(customer -> {
                boolean hasOverdue = customer.getSalesOrders().stream().anyMatch(so ->
                        Boolean.TRUE.equals(so.getIsDebt()) &&
                        so.getDueDate() != null && so.getDueDate().isBefore(now) &&
                        isOrderUnpaid(so));
                return buildCustomerResponse(customer, hasOverdue, now);
            }).collect(Collectors.toList());

            // Sort in memory
            responses.sort(getPriorityComparator());

            // Manual pagination
            int start = (page - 1) * size;
            int end = Math.min(start + size, responses.size());
            List<CustomerResponse> paginatedResponses = responses.subList(start, end);

            return PageResponse.<CustomerResponse>builder()
                    .content(paginatedResponses)
                    .page(page)
                    .size(size)
                    .totalElements(responses.size())
                    .totalPages((int) Math.ceil((double) responses.size() / size))
                    .build();

        } else {
            // Default sorting logic
            Pageable pageable = PageRequest.of(page - 1, size, Sort.by(Sort.Direction.DESC, "createdAt"));
            customerPage = customerRepository.findFilteredCustomersWithPaging(
                    keyword, statusQuery, allowDebt, from, to, now, isOverdue, pageable
            );
            
            List<CustomerResponse> responses = customerPage.getContent().stream().map(customer -> {
                boolean hasOverdue = customer.getSalesOrders().stream().anyMatch(so ->
                        Boolean.TRUE.equals(so.getIsDebt()) &&
                        so.getDueDate() != null && so.getDueDate().isBefore(now) &&
                        isOrderUnpaid(so));
                return buildCustomerResponse(customer, hasOverdue, now);
            }).toList();

            return PageResponse.<CustomerResponse>builder()
                    .content(responses)
                    .page(page)
                    .size(size)
                    .totalElements(customerPage.getTotalElements())
                    .totalPages(customerPage.getTotalPages())
                    .build();
        }
    }

    private boolean isOrderUnpaid(SalesOrder so) {
        BigDecimal initialPaidAmount = so.getPaidAmount() != null ? so.getPaidAmount() : BigDecimal.ZERO;
        BigDecimal subsequentPayments = so.getDebtPayments().stream()
                .map(dp -> dp.getAmountPaid() != null ? dp.getAmountPaid() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalPaid = initialPaidAmount.add(subsequentPayments);
        return (so.getTotalAmount() != null ? so.getTotalAmount() : BigDecimal.ZERO).compareTo(totalPaid) > 0;
    }

    private CustomerResponse buildCustomerResponse(Customer customer, boolean hasOverdue, Instant now) {
        List<SalesOrder> debtOrders = customer.getSalesOrders().stream()
                .filter(so -> Boolean.TRUE.equals(so.getIsDebt()))
                .toList();

        long totalOrdersInDebt = debtOrders.stream().filter(this::isOrderUnpaid).count();
        long totalOverdueOrders = debtOrders.stream().filter(so -> isOrderUnpaid(so) && so.getDueDate() != null && so.getDueDate().isBefore(now)).count();

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
                .isCheckDebtUnstable(isCheckDebtUnstable(customer))
                .totalOrdersInDebt(totalOrdersInDebt)
                .totalOverdueOrders(totalOverdueOrders)
                .build();
    }
    
    private Comparator<CustomerResponse> getPriorityComparator() {
        // Primary sort: by priority score (descending)
        // Secondary sort: by total debt (descending)
        return Comparator.comparingInt(this::calculatePriorityScore).reversed()
                .thenComparing(CustomerResponse::getTotalDebt, Comparator.reverseOrder());
    }

    private int calculatePriorityScore(CustomerResponse c) {
        if (Boolean.TRUE.equals(c.getIsCheckDebtUnstable())) {
            return 7;
        }

        boolean isInDebt = c.getTotalDebt().compareTo(BigDecimal.ZERO) > 0;

        if (isInDebt) {
            // 1. Đang nợ, có đơn quá hạn, được phép nợ
            if (c.getIsOverdue() && c.getAllowDebt()) return 6;
            // 2. Đang nợ, chưa quá hạn, không được phép nợ
            if (!c.getIsOverdue() && !c.getAllowDebt()) return 5;
            // 3. Đang nợ, chưa quá hạn, được phép nợ
            if (!c.getIsOverdue() && c.getAllowDebt()) return 4;
            // 4. Đang nợ, có đơn quá hạn, không được phép nợ
            if (c.getIsOverdue() && !c.getAllowDebt()) return 3;
        } else {
            // 5. Không nợ, được phép nợ
            if (c.getAllowDebt()) return 2;
            // 6. Không nợ, không được phép nợ
            if (!c.getAllowDebt()) return 1;
        }
        // Default case
        return 0;
    }

    // View customer detail
    @Transactional(readOnly = true)
    public CustomerResponse getCustomerDetails(Integer id) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.CUSTOMER_NOT_FOUND));

        Instant now = Instant.now();
        boolean hasOverdue = customer.getSalesOrders().stream().anyMatch(so ->
                Boolean.TRUE.equals(so.getIsDebt()) &&
                so.getDueDate() != null && so.getDueDate().isBefore(now) &&
                isOrderUnpaid(so));

        return buildCustomerResponse(customer, hasOverdue, now);
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
            BigDecimal initialPaidAmount = so.getPaidAmount() != null ? so.getPaidAmount() : BigDecimal.ZERO;
            BigDecimal subsequentPayments = so.getDebtPayments().stream()
                    .map(dp -> dp.getAmountPaid() != null ? dp.getAmountPaid() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal totalPaid = initialPaidAmount.add(subsequentPayments);

            BigDecimal totalAmount = so.getTotalAmount() != null ? so.getTotalAmount() : BigDecimal.ZERO;
            BigDecimal amountRemaining = totalAmount.subtract(totalPaid);

            // Dùng chung ngưỡng PAID/OVERDUE/IN_DEBT với màn lịch sử hóa đơn.
            DebtOrderStatus status = DebtCalculator.deriveStatus(amountRemaining, so.getDueDate(), now);

            String createdByName = "N/A";
             if (so.getCreatedBy() != null) {
                 createdByName = userRepository.findById(so.getCreatedBy())
                                                 .map(User::getFullName)
                                                 .orElse("Không rõ");
             }

            return DebtOrderResponse.builder()
                    .id(so.getId())
                    .customerId(customerId)
                    .customerName(so.getCustomer().getFullName())
                    .orderId(so.getId())
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
    public CustomerResponse updateCustomer(Integer id, CustomerRequest request) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.CUSTOMER_NOT_FOUND));

        if (request.getAllowDebt() == null) {
            throw new AppException(ErrorCode.ALLOW_DEBT_REQUIRED);
        }

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
        log.info("Update customer by id {}", customer.getId());

        return CustomerResponse.builder()
                .id(updatedCustomer.getId())
                .fullName(updatedCustomer.getFullName())
                .phoneNumber(updatedCustomer.getPhoneNumber())
                .address(updatedCustomer.getAddress())
                .note(updatedCustomer.getNote())
                .allowDebt(updatedCustomer.getAllowDebt())
                .totalDebt(updatedCustomer.getTotalDebt())
                .isCheckDebtUnstable(isCheckDebtUnstable(updatedCustomer))
                .build();
    }

    @Transactional(readOnly = true)
    public List<TodaysDebtSalesSummaryResponse> getTodaysDebtSalesSummary() {
        ZoneId zoneId = ZoneId.of("Asia/Ho_Chi_Minh");
        LocalDate today = LocalDate.now(zoneId);
        Instant startOfDay = today.atStartOfDay(zoneId).toInstant();
        Instant endOfDay = today.plusDays(1).atStartOfDay(zoneId).toInstant();

        List<SalesOrder> todaysDebtSales = salesOrderRepository.findActiveDebtSalesCreatedBetween(startOfDay, endOfDay);

        Map<Integer, TodaysDebtSalesSummaryResponse> groupedByCustomer = new LinkedHashMap<>();

        todaysDebtSales.stream()
                .sorted(Comparator.comparing((SalesOrder so) -> isCheckDebtUnstable(so.getCustomer())).reversed())
                .forEach(so -> {
            BigDecimal initialPaidAmount = so.getPaidAmount() != null ? so.getPaidAmount() : BigDecimal.ZERO;
            BigDecimal subsequentPayments = so.getDebtPayments().stream()
                    .map(dp -> dp.getAmountPaid() != null ? dp.getAmountPaid() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal totalPaid = initialPaidAmount.add(subsequentPayments);
            BigDecimal totalAmount = so.getTotalAmount() != null ? so.getTotalAmount() : BigDecimal.ZERO;
            BigDecimal amountRemaining = totalAmount.subtract(totalPaid);

            String createdByName = "N/A";
            if (so.getCreatedBy() != null) {
                createdByName = userRepository.findById(so.getCreatedBy())
                        .map(User::getFullName)
                        .orElse("Không rõ");
            }

            Customer orderCustomer = so.getCustomer();

            Integer customerId = orderCustomer != null ? orderCustomer.getId() : null;
            TodaysDebtSalesSummaryResponse customerGroup = groupedByCustomer.computeIfAbsent(
                    customerId,
                    id -> TodaysDebtSalesSummaryResponse.builder()
                            .customerId(id)
                            .customerName(orderCustomer != null ? orderCustomer.getFullName() : null)
                            .isCheckDebtUnstable(isCheckDebtUnstable(orderCustomer))
                            .debtSalesDetails(new ArrayList<>())
                            .build()
            );

            customerGroup.getDebtSalesDetails().add(DebtOrderResponse.builder()
                    .id(so.getId())
                    .orderId(so.getId())
                    .orderCode(so.getOrderCode())
                    .orderDate(so.getCreatedAt())
                    .dueDate(so.getDueDate())
                    .totalAmount(totalAmount)
                    .amountPaid(totalPaid)
                    .amountRemaining(amountRemaining)
                    .isCheckDebtUnstable(isCheckDebtUnstable(orderCustomer))
                    .status(amountRemaining.compareTo(BigDecimal.ZERO) <= 0 ? DebtOrderStatus.PAID : DebtOrderStatus.IN_DEBT)
                    .createdBy(createdByName)
                    .build());
        });

        return new ArrayList<>(groupedByCustomer.values());
    }

    private boolean isCheckDebtUnstable(Customer customer) {
        return customer != null && Boolean.TRUE.equals(customer.getIsCheckUnstableDebt());
    }
}
